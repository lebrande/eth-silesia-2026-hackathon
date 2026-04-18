/**
 * CRUD dla definicji widgetów (zastępuje dawny custom_tools moduł).
 *
 * Widget to jednostka wizualna, którą agent klienta wyrenderuje w czacie
 * tauron.pl (docs/03_scope_and_user_stories.md sekcja 2). Pracownik
 * backoffice tworzy ją rozmawiając z buildem, a potem klika "Zapisz".
 */

import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, widgetDefinitions } from "@/db/schema";
import { ensureBackofficeTables } from "@/db/ensure-tables";
import type { WidgetDefinitionRow } from "@/lib/types";
import {
  widgetSpecSchema,
  type WidgetSpec,
} from "@/lib/widget-builder/schema";

export class WidgetDefinitionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WidgetDefinitionValidationError";
  }
}

type RawRow = typeof widgetDefinitions.$inferSelect;
type RowWithAuthor = RawRow & { createdByUserEmail: string | null };

function rowToDefinition(row: RowWithAuthor): WidgetDefinitionRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    scenario: row.scenario,
    spec: row.spec,
    createdByUserId: row.createdByUserId,
    createdByUserEmail: row.createdByUserEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type WidgetDefinitionInput = {
  name: string;
  description: string;
  scenario: string;
  spec: WidgetSpec;
};

function normalize(input: WidgetDefinitionInput): WidgetDefinitionInput {
  const name = input.name.trim();
  const description = input.description.trim();
  const scenario = input.scenario.trim();
  if (!name) throw new WidgetDefinitionValidationError("Nazwa jest wymagana.");
  if (name.length > 80)
    throw new WidgetDefinitionValidationError(
      "Nazwa nie może być dłuższa niż 80 znaków.",
    );
  if (!description)
    throw new WidgetDefinitionValidationError("Opis jest wymagany.");
  if (description.length > 500)
    throw new WidgetDefinitionValidationError(
      "Opis nie może być dłuższy niż 500 znaków.",
    );
  if (!scenario)
    throw new WidgetDefinitionValidationError(
      "Scenariusz (opis użycia) jest wymagany.",
    );
  const parsed = widgetSpecSchema.safeParse(input.spec);
  if (!parsed.success) {
    throw new WidgetDefinitionValidationError(
      `Widget nie przeszedł walidacji: ${parsed.error.message}`,
    );
  }
  return {
    name,
    description,
    scenario,
    spec: parsed.data,
  };
}

export async function listWidgetDefinitions(): Promise<WidgetDefinitionRow[]> {
  await ensureBackofficeTables();
  const rows = await db
    .select({
      id: widgetDefinitions.id,
      name: widgetDefinitions.name,
      description: widgetDefinitions.description,
      scenario: widgetDefinitions.scenario,
      spec: widgetDefinitions.spec,
      createdByUserId: widgetDefinitions.createdByUserId,
      createdAt: widgetDefinitions.createdAt,
      updatedAt: widgetDefinitions.updatedAt,
      createdByUserEmail: users.email,
    })
    .from(widgetDefinitions)
    .leftJoin(users, eq(users.id, widgetDefinitions.createdByUserId))
    .orderBy(desc(widgetDefinitions.updatedAt));
  return rows.map((r) =>
    rowToDefinition({ ...r, createdByUserEmail: r.createdByUserEmail }),
  );
}

export async function getWidgetDefinition(
  id: string,
): Promise<WidgetDefinitionRow | null> {
  await ensureBackofficeTables();
  const [row] = await db
    .select({
      id: widgetDefinitions.id,
      name: widgetDefinitions.name,
      description: widgetDefinitions.description,
      scenario: widgetDefinitions.scenario,
      spec: widgetDefinitions.spec,
      createdByUserId: widgetDefinitions.createdByUserId,
      createdAt: widgetDefinitions.createdAt,
      updatedAt: widgetDefinitions.updatedAt,
      createdByUserEmail: users.email,
    })
    .from(widgetDefinitions)
    .leftJoin(users, eq(users.id, widgetDefinitions.createdByUserId))
    .where(eq(widgetDefinitions.id, id))
    .limit(1);
  return row
    ? rowToDefinition({ ...row, createdByUserEmail: row.createdByUserEmail })
    : null;
}

export async function createWidgetDefinition(
  createdByUserId: string,
  input: WidgetDefinitionInput,
): Promise<WidgetDefinitionRow> {
  await ensureBackofficeTables();
  const norm = normalize(input);
  const [row] = await db
    .insert(widgetDefinitions)
    .values({
      name: norm.name,
      description: norm.description,
      scenario: norm.scenario,
      spec: norm.spec,
      createdByUserId,
    })
    .returning();
  return rowToDefinition({ ...row, createdByUserEmail: null });
}

export async function updateWidgetDefinition(
  id: string,
  input: WidgetDefinitionInput,
): Promise<WidgetDefinitionRow | null> {
  await ensureBackofficeTables();
  const norm = normalize(input);
  const [row] = await db
    .update(widgetDefinitions)
    .set({
      name: norm.name,
      description: norm.description,
      scenario: norm.scenario,
      spec: norm.spec,
      updatedAt: new Date(),
    })
    .where(eq(widgetDefinitions.id, id))
    .returning();
  if (!row) return null;
  return getWidgetDefinition(row.id);
}

export async function deleteWidgetDefinition(id: string): Promise<boolean> {
  await ensureBackofficeTables();
  const res = await db
    .delete(widgetDefinitions)
    .where(eq(widgetDefinitions.id, id))
    .returning({ id: widgetDefinitions.id });
  return res.length > 0;
}
