import "server-only";
import { tool } from "@langchain/core/tools";
import { z, type ZodTypeAny } from "zod";
import {
  createCustomTool,
  CustomToolValidationError,
  deleteCustomTool,
  getCustomTool,
  listCustomTools,
  runCustomTool,
  setCustomToolEnabled,
  updateCustomTool,
} from "@/lib/server/custom-tools";
import type { CustomToolParam, CustomToolRow } from "@/lib/types";
import type { BackofficeAgentContext } from "./faq.tool";

function describeRow(r: CustomToolRow): string {
  const params = r.parameters
    .map(
      (p) =>
        `${p.name}:${p.type}${p.required === false ? "?" : ""}${p.default !== null && p.default !== undefined ? `=${p.default}` : ""}`,
    )
    .join(", ");
  return `name=${r.name} id=${r.id} enabled=${r.enabled} params=(${params})\n  desc: ${r.description}\n  formula: ${r.formula}\n  template: ${r.responseTemplate ?? "(—)"}`;
}

function paramsToZod(params: CustomToolParam[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const p of params) {
    let s: ZodTypeAny =
      p.type === "number"
        ? z.number().describe(p.description ?? p.name)
        : z.string().describe(p.description ?? p.name);
    if (p.required === false || p.default !== null) {
      s = s.optional();
    }
    shape[p.name] = s;
  }
  return z.object(shape);
}

/**
 * Dla każdego aktywnego wpisu w custom_tools buduje jeden LangChain tool,
 * który wywołuje runCustomTool (mathjs + template).
 */
export async function buildDynamicCustomTools() {
  const rows = await listCustomTools({ enabledOnly: true });
  return rows.map((row) =>
    tool(
      async (args) => {
        try {
          const out = await runCustomTool(row, args as Record<string, unknown>);
          return out.rendered;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          return `Błąd wywołania ${row.name}: ${msg}`;
        }
      },
      {
        name: row.name,
        description: `[custom] ${row.description}`,
        schema: paramsToZod(row.parameters),
      },
    ),
  );
}

/**
 * Meta-tools: pozwalają agentowi przeglądać i modyfikować rejestr custom tools.
 * Dla UX pracownika: głównie powinien edytować w UI, ale agent wspomaga.
 */
export function createCustomToolMetaTools(ctx: BackofficeAgentContext) {
  const list = tool(
    async ({ includeDisabled }) => {
      const rows = await listCustomTools({
        enabledOnly: !includeDisabled,
      });
      if (rows.length === 0) return "Brak zdefiniowanych custom tools.";
      return `${rows.length} custom tool(s):\n${rows.map(describeRow).join("\n---\n")}`;
    },
    {
      name: "list_custom_tools",
      description:
        "Listuje wszystkie custom tools zdefiniowane przez operatorów (mathjs formulas).",
      schema: z.object({
        includeDisabled: z
          .boolean()
          .optional()
          .describe("Uwzględnij też wyłączone"),
      }),
    },
  );

  const paramSchema = z.object({
    name: z.string().min(1).describe("Nazwa parametru (snake_case)"),
    type: z.enum(["number", "string"]).describe("Typ parametru"),
    description: z.string().optional(),
    required: z.boolean().optional(),
    default: z.union([z.number(), z.string()]).nullable().optional(),
  });

  const create = tool(
    async (args) => {
      try {
        const row = await createCustomTool(ctx.user.id, {
          name: args.name,
          description: args.description,
          parameters: args.parameters ?? [],
          formula: args.formula,
          responseTemplate: args.responseTemplate ?? null,
          enabled: args.enabled !== false,
        });
        return `Utworzono custom tool "${row.name}" (id=${row.id}).\n${describeRow(row)}`;
      } catch (err) {
        if (err instanceof CustomToolValidationError) {
          return `Walidacja nie powiodła się: ${err.message}`;
        }
        throw err;
      }
    },
    {
      name: "create_custom_tool",
      description:
        "Utwórz nowy custom tool. Nazwa w snake_case (a-z, 0-9, _). Formuła to wyrażenie mathjs używające nazw parametrów. Response template może zawierać {{param}} i {{result}}.",
      schema: z.object({
        name: z.string().min(3).max(50),
        description: z.string().min(1),
        parameters: z.array(paramSchema).max(8).optional(),
        formula: z
          .string()
          .min(1)
          .describe(
            "Wyrażenie mathjs, np. 'kwh * tariff + fixed_fee'. Operuje na parametrach.",
          ),
        responseTemplate: z
          .string()
          .nullable()
          .optional()
          .describe(
            "Opcjonalny szablon odpowiedzi, np. 'Zużycie {{kwh}} kWh kosztuje {{result}} zł'",
          ),
        enabled: z.boolean().optional(),
      }),
    },
  );

  const update = tool(
    async (args) => {
      const existing = await getCustomTool(args.id);
      if (!existing) return `Nie znaleziono custom tool o id=${args.id}.`;
      try {
        const row = await updateCustomTool(args.id, {
          name: args.name ?? existing.name,
          description: args.description ?? existing.description,
          parameters: args.parameters ?? existing.parameters,
          formula: args.formula ?? existing.formula,
          responseTemplate:
            args.responseTemplate === undefined
              ? existing.responseTemplate
              : args.responseTemplate,
          enabled: args.enabled === undefined ? existing.enabled : args.enabled,
        });
        if (!row) return `Update nie powiódł się.`;
        return `Zaktualizowano custom tool "${row.name}".\n${describeRow(row)}`;
      } catch (err) {
        if (err instanceof CustomToolValidationError) {
          return `Walidacja nie powiodła się: ${err.message}`;
        }
        throw err;
      }
    },
    {
      name: "update_custom_tool",
      description:
        "Aktualizuj istniejący custom tool. Pola niepodane pozostają bez zmian.",
      schema: z.object({
        id: z.string().min(1),
        name: z.string().optional(),
        description: z.string().optional(),
        parameters: z.array(paramSchema).max(8).optional(),
        formula: z.string().optional(),
        responseTemplate: z.string().nullable().optional(),
        enabled: z.boolean().optional(),
      }),
    },
  );

  const del = tool(
    async ({ id }) => {
      const ok = await deleteCustomTool(id);
      return ok
        ? `Usunięto custom tool id=${id}.`
        : `Nie znaleziono custom tool o id=${id}.`;
    },
    {
      name: "delete_custom_tool",
      description:
        "Usuń custom tool po id. Używaj tylko po wyraźnym potwierdzeniu.",
      schema: z.object({ id: z.string().min(1) }),
    },
  );

  const toggle = tool(
    async ({ id, enabled }) => {
      const row = await setCustomToolEnabled(id, enabled);
      if (!row) return `Nie znaleziono custom tool o id=${id}.`;
      return `Tool "${row.name}" jest teraz ${row.enabled ? "WŁĄCZONY" : "WYŁĄCZONY"}.`;
    },
    {
      name: "toggle_custom_tool",
      description: "Włącz/wyłącz custom tool bez jego usuwania.",
      schema: z.object({
        id: z.string().min(1),
        enabled: z.boolean(),
      }),
    },
  );

  return [list, create, update, del, toggle];
}
