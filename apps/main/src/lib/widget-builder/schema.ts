/**
 * Schema widgetu generowanego przez agenta buildera.
 *
 * Kontrakt z docs/03_scope_and_user_stories.md sekcja 2:
 *   agent klienta zwraca JSON `{ type, data }` → frontend renderuje
 *   odpowiedni komponent. Tutaj definiujemy generyczny, freeform `WidgetSpec`,
 *   który agent może złożyć z "klocków" (primitives). To pozwala pracownikowi
 *   backoffice zdefiniować dowolną odpowiedź wizualną bez pisania nowego
 *   komponentu.
 *
 * Schema jest też używany przez LangChain `.withStructuredOutput()` jako
 * response_format (strict JSON) dla LLM.
 */

import { z } from "zod";

const headerNode = z.object({
  kind: z.literal("header"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  text: z.string(),
});

const paragraphNode = z.object({
  kind: z.literal("paragraph"),
  text: z.string(),
  tone: z
    .enum(["default", "muted", "warning", "success", "danger"])
    .optional(),
});

const listNode = z.object({
  kind: z.literal("list"),
  ordered: z.boolean().optional(),
  items: z.array(z.string()),
});

const keyValueNode = z.object({
  kind: z.literal("keyValue"),
  items: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      hint: z.string().optional(),
    }),
  ),
});

const badgeNode = z.object({
  kind: z.literal("badge"),
  label: z.string(),
  variant: z
    .enum(["default", "success", "warning", "danger", "info"])
    .optional(),
});

const tableNode = z.object({
  kind: z.literal("table"),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number()]))),
  highlightRow: z.number().optional(),
});

const chartNode = z.object({
  kind: z.literal("chart"),
  type: z.enum(["line", "bar"]),
  xKey: z.string(),
  yKeys: z.array(z.string()),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  caption: z.string().optional(),
});

const actionsNode = z.object({
  kind: z.literal("actions"),
  buttons: z.array(
    z.object({
      label: z.string(),
      variant: z.enum(["primary", "secondary", "ghost"]).optional(),
      icon: z.string().optional(),
    }),
  ),
});

const attachmentNode = z.object({
  kind: z.literal("attachment"),
  filename: z.string(),
  icon: z.enum(["pdf", "image", "file"]).optional(),
  sizeLabel: z.string().optional(),
});

const imageNode = z.object({
  kind: z.literal("image"),
  src: z.string(),
  alt: z.string().optional(),
  ratio: z.enum(["square", "video", "wide"]).optional(),
});

const progressNode = z.object({
  kind: z.literal("progress"),
  value: z.number(),
  max: z.number().optional(),
  label: z.string().optional(),
  tone: z.enum(["default", "success", "warning", "danger"]).optional(),
});

const timelineNode = z.object({
  kind: z.literal("timeline"),
  items: z.array(
    z.object({
      time: z.string(),
      label: z.string(),
      highlight: z.boolean().optional(),
    }),
  ),
});

const alertNode = z.object({
  kind: z.literal("alert"),
  tone: z.enum(["info", "warning", "danger", "success"]),
  title: z.string().optional(),
  text: z.string(),
});

const formFieldNode = z.object({
  kind: z.literal("formField"),
  type: z.enum(["input", "select", "checkbox"]),
  label: z.string(),
  name: z.string(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  hint: z.string().optional(),
});

/**
 * Leaf node — wszystkie primitives, które mogą pojawić się też WEWNĄTRZ
 * `columns`. Wydzielone osobno, żeby zachować jedno-poziomową zagnieżdżalność
 * (columns.children to tablice leaf nodes, nie kolejne columns).
 */
export const widgetLeafNodeSchema = z.discriminatedUnion("kind", [
  headerNode,
  paragraphNode,
  listNode,
  keyValueNode,
  badgeNode,
  tableNode,
  chartNode,
  actionsNode,
  attachmentNode,
  imageNode,
  progressNode,
  timelineNode,
  alertNode,
  formFieldNode,
]);

const columnsNode = z.object({
  kind: z.literal("columns"),
  count: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  children: z.array(z.array(widgetLeafNodeSchema)),
});

/**
 * Pełny zbiór klocków = leaf + columns. Dzięki rozbiciu unikamy rekurencji,
 * która psuje się ze strict JSON mode OpenAI.
 */
export const widgetNodeSchema = z.discriminatedUnion("kind", [
  headerNode,
  paragraphNode,
  listNode,
  keyValueNode,
  badgeNode,
  tableNode,
  chartNode,
  actionsNode,
  attachmentNode,
  imageNode,
  progressNode,
  timelineNode,
  alertNode,
  formFieldNode,
  columnsNode,
]);

export const widgetSpecSchema = z.object({
  title: z.string().optional(),
  intro: z.string().optional(),
  nodes: z.array(widgetNodeSchema),
  footer: z.string().optional(),
});

/**
 * Odpowiedź LLM: zawsze zawiera tekst, który agent mówi pracownikowi.
 * `updatedSpec` jest `null`, kiedy agent tylko pyta o detale i nie zmienia
 * jeszcze widgetu.
 */
export const builderResponseSchema = z.object({
  reply: z
    .string()
    .describe(
      "Co agent mówi pracownikowi backoffice (pytania, wyjaśnienia, podsumowania).",
    ),
  updatedSpec: widgetSpecSchema
    .nullable()
    .describe(
      "Pełny nowy WidgetSpec, albo null kiedy agent tylko pyta o detale.",
    ),
});

export type WidgetLeafNode = z.infer<typeof widgetLeafNodeSchema>;
export type WidgetNode = z.infer<typeof widgetNodeSchema>;
export type WidgetSpec = z.infer<typeof widgetSpecSchema>;
export type BuilderResponse = z.infer<typeof builderResponseSchema>;
export type WidgetNodeKind = WidgetNode["kind"];
