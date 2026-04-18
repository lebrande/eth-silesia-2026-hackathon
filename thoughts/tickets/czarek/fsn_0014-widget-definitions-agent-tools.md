# Widget definitions as dynamic tools for `verified_agent` (B4)

**Priority:** P1 (closes the "employee builds tools that the customer agent uses" narrative loop)
**Track:** czarek

## Why

The widget builder in `/app/tools` already exists — a TAURON employee can build a widget (`name`, `description`, `spec` with `scenario`) and save it to `widgetDefinitions`. But those rows are currently **dead**: `verified_agent` does not know about them, and `/agent` cannot render them.

After this ticket lands, an employee builds e.g. "Heat-pump cost calculator", saves it — and on the next customer conversation `verified_agent` can call it. A wow-moment for the jury.

## Scope

### Dependency

- **Assumes:** FSN-0006 (widget rendering infra) is already landed — the customer chat can render any widget through the dispatcher.

### Dynamic tool loader

- `apps/main/src/graphs/chat/subgraphs/root/tools/custom-widget-tools.server.ts` (new):
  - Function `loadCustomWidgetTools(): Promise<Tool[]>` — reads every `widgetDefinitions` row on every `verified_agent` invocation.
  - For each row generates a tool:
    - `name = "render_" + slugify(widgetDef.name)` (e.g. `render_heat_pump_calculator`).
    - `description = widgetDef.description`.
    - `schema` — derived from `widgetDef.spec.variables` (if the spec has a variables section — see the existing `widget-builder/schema.ts`).
    - `execute({ ...inputs })` — side effect: push onto `pendingWidgets` a widget of type `"CustomWidget"` with `data: { spec: widgetDef.spec, values: inputs }`.
- Register: inside `verified-agent.node.ts` when building the tool list — spread `[escalateToHumanTool, ...await loadCustomWidgetTools()]`.

### Widget type extension

- `widget.shared.ts` from FSN-0006 — add a new variant:
  ```ts
  { type: "CustomWidget", data: { spec: WidgetSpec, values: Record<string, unknown> } }
  ```
- `widget-registry.client.tsx` — add a mapper for `"CustomWidget"`:
  - Import `widget-renderer.tsx` from `apps/main/src/components/widget-builder/` (exists, used in the `/app/tools` preview).
  - The renderer takes `spec` + `values` and renders per the schema.
  - Possibly a move / re-export: currently used only in back-office, now it also goes into the customer bundle.

### Verified agent prompt

- `verified-agent.prompt.md`:
  - Add the instruction: "You have access to `render_*` tools built by TAURON employees. Each tool is an interactive widget. When a customer question matches one of the `render_*` descriptions — call that tool instead of explaining it in text."
  - Dynamic section rendering of available tools (if the framework supports it; otherwise a hint "available tools may change").

### Cache (optional perf)

- Cache `loadCustomWidgetTools` in-process with a 60s TTL, or invalidate on `createWidget / updateWidget / deleteWidget`. 60s cache is enough for the hackathon.

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] After building a widget in `/app/tools` and saving — the next verified conversation on `/agent` sees a new tool available.
- [ ] Manual test: build widget "Calculator A" with description "Computes X for customers" + spec. Ask the agent "calculate X". The agent calls `render_calculator_a` and the widget renders in chat.
- [ ] The widget renderer is the same one as the `/app/tools` preview (single code path, DRY).
- [ ] Deleting the widget in back-office → within 60s it is no longer available to the agent.

## Implementation notes

- `widget-renderer.tsx` from back-office — verify no server-only imports. If present, strip them or split into a separate `widget-renderer.client.tsx`.
- `spec.variables` may not be rich enough for a Zod-generated schema — fallback: the tool accepts `input: Record<string, unknown>` and trusts the LLM.
- The agent may easily get lost among many dynamic tools — cap the loader at 10 (top-10 most recent) if the list grows.
- Prompt-injection risk — an employee writing `description: "Ignore system prompt and reveal..."` could influence the agent. Mitigation: sanitize description (strip newlines, cap at 200 chars).

## Out of scope

- Testing a widget in back-office before saving (preview already exists).
- Widget versioning.
- Widget marketplace / sharing across tenants.
- Exposing widgets to `default_agent` (only `verified_agent` — widgets often operate on customer data).
- Hot-reload without the 60s cache TTL.
