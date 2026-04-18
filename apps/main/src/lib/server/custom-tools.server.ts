import "server-only";
import { create, all, type MathJsInstance } from "mathjs";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { customTools } from "@/db/schema";
import { ensureBackofficeTables } from "@/db/ensure-tables";
import type {
  CustomToolParam,
  CustomToolRow,
  CustomToolRunOutput,
} from "@/lib/types";

const TOOL_NAME_RE = /^[a-z][a-z0-9_]{2,49}$/;
const PARAM_NAME_RE = /^[a-z][a-zA-Z0-9_]{0,39}$/;
const MAX_PARAMS = 8;
const EVAL_TIMEOUT_MS = 1000;

/**
 * Dozwolone zmienne w formule = nazwy parametrów. Dodatkowo math.* funkcje
 * (round, floor, ceil, max, min, abs, sqrt, pow) są dostępne automatycznie.
 */
const BANNED_FUNCTIONS = [
  "import",
  "createUnit",
  "evaluate",
  "parse",
  "simplify",
  "derivative",
  "rationalize",
];

let _math: MathJsInstance | null = null;
function getMath(): MathJsInstance {
  if (_math) return _math;
  const m = create(all, {});
  const overrides: Record<string, () => never> = {};
  for (const n of BANNED_FUNCTIONS) {
    overrides[n] = () => {
      throw new Error(`Funkcja ${n} jest wyłączona.`);
    };
  }
  m.import(overrides, { override: true });
  _math = m;
  return m;
}

export type CustomToolInput = {
  name: string;
  description: string;
  parameters: CustomToolParam[];
  formula: string;
  responseTemplate: string | null;
  enabled: boolean;
};

function rowToTool(row: typeof customTools.$inferSelect): CustomToolRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    parameters: (row.parameters ?? []) as CustomToolParam[],
    formula: row.formula,
    responseTemplate: row.responseTemplate,
    enabled: row.enabled,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class CustomToolValidationError extends Error {}

function validateParams(params: CustomToolParam[]): CustomToolParam[] {
  if (!Array.isArray(params)) {
    throw new CustomToolValidationError("parameters musi być tablicą");
  }
  if (params.length > MAX_PARAMS) {
    throw new CustomToolValidationError(
      `Maksymalnie ${MAX_PARAMS} parametrów`,
    );
  }
  const seen = new Set<string>();
  return params.map((p, i) => {
    if (!p || typeof p !== "object") {
      throw new CustomToolValidationError(`param[${i}] nie jest obiektem`);
    }
    const name = String(p.name ?? "").trim();
    if (!PARAM_NAME_RE.test(name)) {
      throw new CustomToolValidationError(
        `param[${i}]: nazwa "${name}" musi pasować do ${PARAM_NAME_RE}`,
      );
    }
    if (seen.has(name)) {
      throw new CustomToolValidationError(`Zduplikowany parametr: ${name}`);
    }
    seen.add(name);
    const type = p.type === "string" ? "string" : "number";
    return {
      name,
      type,
      description: p.description ? String(p.description).trim() : undefined,
      required: p.required !== false,
      default:
        p.default === undefined || p.default === null
          ? null
          : type === "number"
            ? Number(p.default)
            : String(p.default),
    };
  });
}

function normalize(input: CustomToolInput): CustomToolInput {
  const name = input.name.trim().toLowerCase();
  if (!TOOL_NAME_RE.test(name)) {
    throw new CustomToolValidationError(
      `Nazwa musi pasować do wzorca ${TOOL_NAME_RE} (snake_case, 3-50 znaków)`,
    );
  }
  const description = input.description.trim();
  if (!description) {
    throw new CustomToolValidationError("Opis nie może być pusty");
  }
  const formula = input.formula.trim();
  if (!formula) {
    throw new CustomToolValidationError("Formuła nie może być pusta");
  }
  const parameters = validateParams(input.parameters);
  return {
    name,
    description,
    parameters,
    formula,
    responseTemplate: input.responseTemplate?.trim() || null,
    enabled: input.enabled !== false,
  };
}

// Built-in tool names których użytkownik nie może nadpisać (lista luźna, dla
// wygody; w razie kolizji LLM dostanie 2 tools o tej samej nazwie i to zrobi problem).
const RESERVED_TOOL_NAMES = new Set([
  "search_faq",
  "get_faq",
  "create_faq",
  "update_faq",
  "delete_faq",
  "list_recent_conversations",
  "get_conversation",
  "flag_message",
  "get_dashboard_stats",
  "get_problematic_questions",
  "list_custom_tools",
  "create_custom_tool",
  "update_custom_tool",
  "delete_custom_tool",
  "toggle_custom_tool",
]);

function assertNameAllowed(name: string) {
  if (RESERVED_TOOL_NAMES.has(name)) {
    throw new CustomToolValidationError(
      `Nazwa "${name}" jest zarezerwowana dla wbudowanego narzędzia`,
    );
  }
}

// ============================================================
// CRUD
// ============================================================

export async function listCustomTools(opts?: {
  enabledOnly?: boolean;
}): Promise<CustomToolRow[]> {
  await ensureBackofficeTables();
  const query = db.select().from(customTools).$dynamic();
  const filtered = opts?.enabledOnly
    ? query.where(eq(customTools.enabled, true))
    : query;
  const rows = await filtered.orderBy(desc(customTools.updatedAt));
  return rows.map(rowToTool);
}

export async function getCustomTool(
  idOrName: string,
): Promise<CustomToolRow | null> {
  await ensureBackofficeTables();
  const [row] = await db
    .select()
    .from(customTools)
    .where(
      // lookup po id albo po name — prościej dla agenta
      idOrName.length > 20
        ? eq(customTools.id, idOrName)
        : eq(customTools.name, idOrName),
    )
    .limit(1);
  return row ? rowToTool(row) : null;
}

export async function createCustomTool(
  createdByUserId: string,
  input: CustomToolInput,
): Promise<CustomToolRow> {
  await ensureBackofficeTables();
  const norm = normalize(input);
  assertNameAllowed(norm.name);
  validateFormula(norm.formula, norm.parameters);
  const [existing] = await db
    .select({ id: customTools.id })
    .from(customTools)
    .where(eq(customTools.name, norm.name))
    .limit(1);
  if (existing) {
    throw new CustomToolValidationError(
      `Tool o nazwie "${norm.name}" już istnieje (id=${existing.id})`,
    );
  }
  const [row] = await db
    .insert(customTools)
    .values({
      name: norm.name,
      description: norm.description,
      parameters: norm.parameters,
      formula: norm.formula,
      responseTemplate: norm.responseTemplate,
      enabled: norm.enabled,
      createdByUserId,
    })
    .returning();
  return rowToTool(row);
}

export async function updateCustomTool(
  id: string,
  input: CustomToolInput,
): Promise<CustomToolRow | null> {
  await ensureBackofficeTables();
  const norm = normalize(input);
  assertNameAllowed(norm.name);
  validateFormula(norm.formula, norm.parameters);
  const [dup] = await db
    .select({ id: customTools.id })
    .from(customTools)
    .where(and(eq(customTools.name, norm.name), ne(customTools.id, id)))
    .limit(1);
  if (dup) {
    throw new CustomToolValidationError(
      `Inny tool już używa nazwy "${norm.name}"`,
    );
  }
  const [row] = await db
    .update(customTools)
    .set({
      name: norm.name,
      description: norm.description,
      parameters: norm.parameters,
      formula: norm.formula,
      responseTemplate: norm.responseTemplate,
      enabled: norm.enabled,
      updatedAt: new Date(),
    })
    .where(eq(customTools.id, id))
    .returning();
  return row ? rowToTool(row) : null;
}

export async function deleteCustomTool(id: string): Promise<boolean> {
  await ensureBackofficeTables();
  const res = await db
    .delete(customTools)
    .where(eq(customTools.id, id))
    .returning({ id: customTools.id });
  return res.length > 0;
}

export async function setCustomToolEnabled(
  id: string,
  enabled: boolean,
): Promise<CustomToolRow | null> {
  await ensureBackofficeTables();
  const [row] = await db
    .update(customTools)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(customTools.id, id))
    .returning();
  return row ? rowToTool(row) : null;
}

// ============================================================
// Runtime
// ============================================================

function validateFormula(formula: string, parameters: CustomToolParam[]) {
  // Szybka heurystyka: symbol musi być w parameters lub być liczbą/op. mathjs
  // zweryfikuje to dokładniej przy uruchomieniu, ale chcemy szybki feedback
  // podczas zapisu.
  const allowedIdentifiers = new Set(parameters.map((p) => p.name));
  const identifiers = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
  const math = getMath();
  for (const id of identifiers) {
    if (allowedIdentifiers.has(id)) continue;
    if (BANNED_FUNCTIONS.includes(id)) {
      throw new CustomToolValidationError(
        `Formuła nie może używać funkcji "${id}"`,
      );
    }
    // sprawdź czy to znana funkcja/constant mathjs
    try {
      // @ts-expect-error dynamic lookup
      const v = math[id];
      if (v === undefined) {
        throw new CustomToolValidationError(
          `Nieznany symbol w formule: "${id}". Zdefiniuj go jako parametr.`,
        );
      }
    } catch {
      throw new CustomToolValidationError(
        `Nieznany symbol w formule: "${id}". Zdefiniuj go jako parametr.`,
      );
    }
  }
}

function renderTemplate(
  template: string | null,
  scope: Record<string, unknown>,
  result: number | string,
): string {
  if (!template) return String(result);
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, k) => {
    if (k === "result") return String(result);
    const v = scope[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

function coerceArgs(
  parameters: CustomToolParam[],
  args: Record<string, unknown>,
): Record<string, number | string> {
  const scope: Record<string, number | string> = {};
  for (const p of parameters) {
    let v: unknown = args[p.name];
    if (v === undefined || v === null || v === "") {
      if (p.required !== false && (p.default === null || p.default === undefined)) {
        throw new CustomToolValidationError(
          `Brak wymaganego parametru "${p.name}"`,
        );
      }
      v = p.default;
    }
    if (p.type === "number") {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) {
        throw new CustomToolValidationError(
          `Parametr "${p.name}" musi być liczbą (otrzymano: ${JSON.stringify(v)})`,
        );
      }
      scope[p.name] = n;
    } else {
      scope[p.name] = String(v ?? "");
    }
  }
  return scope;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} przekroczyło ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function runCustomTool(
  tool: CustomToolRow,
  rawArgs: Record<string, unknown>,
): Promise<CustomToolRunOutput> {
  const scope = coerceArgs(tool.parameters, rawArgs);
  const math = getMath();
  const result = await withTimeout(
    Promise.resolve().then(() => math.evaluate(tool.formula, scope)),
    EVAL_TIMEOUT_MS,
    "Ewaluacja formuły",
  );

  let final: number | string;
  if (typeof result === "number") {
    if (!Number.isFinite(result)) {
      throw new Error(`Wynik nie jest liczbą skończoną: ${result}`);
    }
    final = result;
  } else if (typeof result === "string") {
    final = result;
  } else if (typeof result === "boolean") {
    final = result ? 1 : 0;
  } else {
    // mathjs może zwracać np. BigNumber — rzutujemy
    final = String(result);
  }
  return {
    result: final,
    rendered: renderTemplate(tool.responseTemplate, scope, final),
  };
}
