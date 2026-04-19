# Playwright E2E backoffice spec implementation plan

## Overview

Add a second Playwright spec at `apps/main/e2e/backoffice.spec.ts` that exercises the two flagship backoffice features — dynamic FAQ management (with AI-suggest) and AI-assisted widget building. The spec drives the real Next.js app in headed Chromium against the live LLM proxy and produces a `.webm` recording that doubles as documentation for the lector script of the demo video.

All Playwright infrastructure is already in place from FSN-0020 (`apps/main/playwright.config.ts`, `apps/main/e2e/`, `pnpm -F main test:e2e`, `@playwright/test` devDependency, Chromium binary). This ticket is purely additive: one new spec file plus one new npm script for filtered runs.

## Current state analysis

- **Playwright already installed**: `apps/main/playwright.config.ts:1-32` defines Chromium-only, headed, `video: "on"`, single worker, auto-starts `pnpm dev` with `SMS_MOCK=true` / `MOCK_AUTH_CODE=000000`, reuses an already-running dev server outside CI.
- **Existing spec**: `apps/main/e2e/demo.spec.ts:1-62` covers the customer-facing `/agent` flow. Conventions to mirror: top-of-file selector constants, `page.getByRole("button", { name: "..." })` for actions, `expect(locator).toBeVisible({ timeout })` for waits, `test.setTimeout(5 * 60_000)` to absorb LLM latency, `test.describe("...")` per feature.
- **No backoffice tests exist** — `apps/main/e2e/` contains only `demo.spec.ts`.
- **Login** — `/login` (`apps/main/src/app/(auth)/login/page.tsx`) is a server component that renders the `<LoginForm />` client component (`apps/main/src/components/auth/login-form.tsx`). Fields: `input#email`, `input#password`. Submit button text: **"Zaloguj się"** (becomes `"Logowanie..."` while pending). Both fields are prefilled via `defaultValue` (email = `BRAND.auth.defaultLoginEmail`, password = `"admin"`). Submit dispatches `loginAction` (`apps/main/src/lib/actions/auth.action.ts`) which calls `signIn("credentials", { redirectTo: "/app/dashboard" })`. Errors surface inline inside the form via `useActionState`, not via URL `?error=` params.
- **Auth fallback** — `apps/main/src/auth.ts:10-11,64-67` accepts the hardcoded admin credentials `BRAND.auth.adminEmail` (= `"admin@tauron.pl"`, see `apps/main/src/branding/config.ts:23`) / `"admin"` if the DB row is missing. The E2E spec uses these credentials so it works without running `db:seed-user` first.

  Note: the staged FSN-0021 ticket (`thoughts/plans/2026-04-18-FSN-0021-ui-tweaks.md` Phase 3) is the change that swapped the inline form for `LoginForm`. This plan assumes those staged changes are landed by the time the E2E spec runs (they are already on master in your working tree, just not pushed). If for any reason FSN-0021 is reverted before this ticket lands, swap the submit selector back to `"Sign in"` and confirm credentials default to `admin@ethsilesia.pl`.

- **Sidebar nav** (`apps/main/src/components/layout/sidebar.tsx:17-24`) has links labelled `"Baza wiedzy (FAQ)"` (`/app/faq`) and `"Widgety agenta"` (`/app/tools`). Active route highlighted with `bg-primary/10 text-primary`.
- **FAQ list** (`apps/main/src/app/(authenticated)/app/faq/page.tsx`):
  - Header title: `"Baza wiedzy (FAQ)"`.
  - Header action: `<Link href="/app/faq/new">` with text **"Nowe FAQ"**.
  - Search input: `input[name="q"]` with placeholder `"Szukaj w pytaniach i odpowiedziach..."`.
  - Submit button: **"Filtruj"**.
  - Each row is `<a href="/app/faq/{id}">` rendering question text in `<h3>` (line 171).
- **FAQ form** (`apps/main/src/components/faq/faq-form.tsx`):
  - Inputs by id: `#question`, `#answer` (textarea), `#category`, `#tags`, `#language` (select), `#source`.
  - AI-suggest button: text `"Zaproponuj odpowiedź AI"` (becomes `"Generowanie..."` while pending). `disabled` until `question.trim().length >= 10`. On success it overwrites `answerRef.current.value` with the suggestion (line 86).
  - Submit button: `"Zapisz wpis"` (create) / `"Zapisz zmiany"` (edit) / `"Zapisywanie..."` (pending).
  - On successful create the action redirects to `/app/faq/{id}` (`apps/main/src/lib/actions/faq.action.ts:31-46`).
- **Widget list** (`apps/main/src/app/(authenticated)/app/tools/page.tsx`):
  - Header title: `"Widgety agenta"`. Header action link: **"Nowy widget"** → `/app/tools/new`.
  - Each row is `<a href="/app/tools/{id}">` with `<span class="text-sm font-semibold">{w.name}</span>` (line 89).
  - Always includes the three builtin widgets (`builtin-tariff-comparator`, `builtin-consumption-timeline`, `builtin-contract-signing`) plus any DB rows.
- **Widget builder workspace** (`apps/main/src/components/widget-builder/workspace.tsx` + `builder-chat.tsx` + `save-bar.tsx`):
  - Builder chat header text: `"Builder widgetów"`.
  - Welcome bubble: `"Cześć! Opisz scenariusz, w którym klient rozmawia z AI na tauron.pl..."`.
  - 6 suggestion chips (deterministic text — see `builder-chat.tsx:20-27`). Clicking a chip dispatches it as a user message immediately.
  - Builder textarea: `placeholder="Opisz scenariusz klienta (Enter wysyła, Shift+Enter nowa linia)…"`. Send via Enter or **"Wyślij"** button.
  - `SaveBar` inputs: `input[name="name"]`, `input[name="description"]`. Submit: **"Zapisz widget"** (create) — `disabled={!spec || pending}` (`save-bar.tsx:35,95`). The `disabled→enabled` transition is the deterministic "LLM finished, spec produced" signal.
  - Status text below inputs: `"Najpierw opisz scenariusz w czacie — builder wygeneruje widget."` (no spec) / `"Widget gotowy do zapisu."` (spec ready).
  - On save the action redirects to `/app/tools/{uuid}` (`apps/main/src/lib/actions/widget-builder.action.ts:73-95`).

### Key discoveries

- The `SaveBar` button's `disabled` attribute is the cleanest determinism hook — wait for `await expect(saveBtn).toBeEnabled({ timeout: 60_000 })` instead of asserting on LLM-variable spec contents.
- The hardcoded admin fallback removes the need for a `db:seed-user` precondition. The spec is runnable on any DB.
- `dynamic = "force-dynamic"` is set on FAQ and tools list pages, so a fresh `page.goto("/app/faq")` after redirect always reflects the new row — no need to bust caches.
- The 6 suggestion chips in `BuilderChat` are static strings — picking one as the demo prompt keeps the recording clean (no typing latency on stage) and isolates non-determinism to the LLM response itself.
- `pnpm -F main test:e2e` already runs every spec under `apps/main/e2e/`. Adding `backoffice.spec.ts` automatically makes it part of the default run; a dedicated script lets you record one feature at a time.

## Desired end state

- A new spec file `apps/main/e2e/backoffice.spec.ts` containing one `test.describe("Backoffice — FAQ + Widget builder")` block with two independent `test()` blocks: `"creates a new FAQ entry with AI-suggested answer"` and `"builds and saves a new widget via the AI builder"`.
- Each test logs in via the hardcoded admin credentials at the top of the test (no shared fixture — keeps the spec readable as a demo script).
- Each test completes end-to-end against the live app + LLM proxy and produces its own `.webm` recording under `apps/main/test-results/`.
- A new npm script `test:e2e:backoffice` runs only the backoffice spec (`playwright test backoffice`), so you can record either feature independently for the lector script. The existing `test:e2e` continues to run every spec.

### Verification

- `pnpm -F main test:e2e:backoffice` exits 0 and produces two `.webm` files under `apps/main/test-results/`.
- `pnpm -F main test:e2e` exits 0 (existing `demo.spec.ts` still passes alongside the new spec).
- `pnpm -F main typecheck` passes.
- `pnpm -F main lint` passes.

## What we're NOT doing

- Not verifying that newly created FAQ rows reach the customer-facing `/agent` chat. The `default_agent` does not inject DB FAQs into its system prompt; that integration is a separate piece of work.
- Not verifying that newly created widget definitions render in the customer chat. Customer chat renders only the four hardcoded payload types from `WidgetRenderer`; `widget_definitions` rows are backoffice-only artefacts today.
- Not asserting on builder LLM output structure (node types, spec field values). Only asserting that the spec was produced, by waiting on the "Zapisz widget" button enabling.
- Not asserting on AI-suggest output text content. Only asserting that the answer textarea value goes from empty to non-empty after the suggestion completes.
- Not adding fixtures, page-object abstractions, helpers package, or shared login state. One spec, two tests, both inline-readable. Mirrors the style of `demo.spec.ts`.
- Not seeding a DB user. The hardcoded `admin@ethsilesia.pl` / `admin` fallback in `auth.ts` is sufficient.
- Not cleaning up created rows. Each run uses a unique timestamp suffix in titles (`"E2E FAQ — {ts}"`, `"E2E Widget — {ts}"`), so accumulation is harmless and rows stay in the DB as visible artefacts.
- Not testing edit / delete flows. Demo focus is the create flow only; edit/delete can be a follow-up if needed for the video.
- Not changing any app code, config, or schema. Spec + npm script only.
- Not adding CI integration. Local dev / demo recording tool.

## Implementation approach

Two phases. Phase 1 writes the spec and adds the filtered npm script. Phase 2 runs the spec headed end-to-end and confirms the video recordings. No app-code changes in either phase.

---

## Phase 1: Backoffice spec + filtered npm script

### Overview

Author `apps/main/e2e/backoffice.spec.ts` with two independent tests, and add a `test:e2e:backoffice` script to `apps/main/package.json` that runs only this spec.

### Changes required

#### 1. `apps/main/e2e/backoffice.spec.ts`

**File**: `apps/main/e2e/backoffice.spec.ts` (new)

**Changes**: One `describe` block with two `test()` blocks. Shared `loginAsAdmin(page)` helper at the top of the file (a 3-line wrapper around the form fill) keeps the test bodies focused on the demo narrative. Selector constants live above the helper for grep-ability.

```ts
import { test, expect, Page } from "@playwright/test";

// Mirrors BRAND.auth.adminEmail in apps/main/src/branding/config.ts and the
// hardcoded fallback in apps/main/src/auth.ts. The login form prefills both
// fields, but we .fill() explicitly so the spec doesn't depend on prefill
// behaviour.
const ADMIN_EMAIL = "admin@tauron.pl";
const ADMIN_PASSWORD = "admin";

const LLM_TIMEOUT = 60_000;
const NAV_TIMEOUT = 10_000;

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: NAV_TIMEOUT });
}

test.describe("Backoffice — FAQ + Widget builder", () => {
  test.setTimeout(5 * 60_000);

  test("creates a new FAQ entry with AI-suggested answer", async ({ page }) => {
    const ts = Date.now();
    const question = `E2E FAQ — jak zmienić taryfę z G11 na G13? (${ts})`;

    await loginAsAdmin(page);

    // Sidebar → FAQ list
    await page.getByRole("link", { name: "Baza wiedzy (FAQ)" }).click();
    await expect(page).toHaveURL(/\/app\/faq$/);
    await expect(
      page.getByRole("heading", { name: "Baza wiedzy (FAQ)" }),
    ).toBeVisible();

    // List → "Nowe FAQ"
    await page.getByRole("link", { name: "Nowe FAQ" }).first().click();
    await expect(page).toHaveURL(/\/app\/faq\/new$/);

    // Fill question, then trigger AI-suggest for the answer
    await page.locator("#question").fill(question);

    const answer = page.locator("#answer");
    await expect(answer).toHaveValue("");

    const suggestBtn = page.getByRole("button", {
      name: "Zaproponuj odpowiedź AI",
    });
    await expect(suggestBtn).toBeEnabled();
    await suggestBtn.click();

    // While generating, the button text becomes "Generowanie...".
    // Wait for it to flip back, then assert the textarea got populated.
    await expect(
      page.getByRole("button", { name: "Generowanie..." }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(suggestBtn).toBeVisible({ timeout: LLM_TIMEOUT });
    await expect(answer).not.toHaveValue("", { timeout: LLM_TIMEOUT });

    // Optional metadata to make the row easy to spot in the list later
    await page.locator("#category").fill("E2E");
    await page.locator("#tags").fill("e2e, playwright");

    // Save → redirects to /app/faq/{uuid}
    await page.getByRole("button", { name: "Zapisz wpis" }).click();
    await expect(page).toHaveURL(/\/app\/faq\/[0-9a-f-]{36}$/, {
      timeout: NAV_TIMEOUT,
    });

    // Back to list, confirm row is visible
    await page.getByRole("link", { name: "Baza wiedzy (FAQ)" }).click();
    await expect(page).toHaveURL(/\/app\/faq$/);
    await expect(page.getByText(question)).toBeVisible();
  });

  test("builds and saves a new widget via the AI builder", async ({ page }) => {
    const ts = Date.now();
    const widgetName = `E2E Widget — porównanie taryf (${ts})`;
    const widgetDescription =
      "Pokazuje 3 taryfy z rocznym kosztem, gdy klient pyta o porównanie cen.";
    const scenarioPrompt = "Porównanie 3 taryf (G11/G12/G13) z rocznym kosztem";

    await loginAsAdmin(page);

    // Sidebar → Widgets
    await page.getByRole("link", { name: "Widgety agenta" }).click();
    await expect(page).toHaveURL(/\/app\/tools$/);
    await expect(
      page.getByRole("heading", { name: "Widgety agenta" }),
    ).toBeVisible();

    // List → "Nowy widget"
    await page.getByRole("link", { name: "Nowy widget" }).first().click();
    await expect(page).toHaveURL(/\/app\/tools\/new$/);
    await expect(page.getByText("Builder widgetów")).toBeVisible();

    // Save button starts disabled with "no spec yet" status
    const saveBtn = page.getByRole("button", { name: "Zapisz widget" });
    await expect(saveBtn).toBeDisabled();
    await expect(
      page.getByText(
        "Najpierw opisz scenariusz w czacie — builder wygeneruje widget.",
      ),
    ).toBeVisible();

    // Click one of the 6 deterministic suggestion chips → dispatches it as
    // a user message immediately, no typing into the textarea.
    await page.getByRole("button", { name: scenarioPrompt }).click();

    // Wait for the LLM to finish: the SaveBar's submit button has
    // disabled={!spec || pending} — it enabling means a spec was produced.
    await expect(saveBtn).toBeEnabled({ timeout: LLM_TIMEOUT });
    await expect(page.getByText("Widget gotowy do zapisu.")).toBeVisible();

    // Fill the SaveBar metadata and save
    await page.locator('input[name="name"]').fill(widgetName);
    await page.locator('input[name="description"]').fill(widgetDescription);
    await saveBtn.click();

    // Successful save redirects to /app/tools/{uuid}
    await expect(page).toHaveURL(/\/app\/tools\/[0-9a-f-]{36}$/, {
      timeout: NAV_TIMEOUT,
    });

    // Back to list, confirm row is visible
    await page.getByRole("link", { name: "Widgety agenta" }).click();
    await expect(page).toHaveURL(/\/app\/tools$/);
    await expect(page.getByText(widgetName)).toBeVisible();
  });
});
```

#### 2. `apps/main/package.json`

**File**: `apps/main/package.json`

**Changes**: Add one line inside `scripts`, immediately after the existing `test:e2e` line:

```json
"test:e2e:backoffice": "playwright test backoffice"
```

The positional `backoffice` argument is matched against test file paths by Playwright, so it picks up `e2e/backoffice.spec.ts` only.

### Success criteria

#### Automated verification

- [ ] Spec is discovered by Playwright: `pnpm -F main exec playwright test --list` shows three tests across two files (one in `demo.spec.ts`, two in `backoffice.spec.ts`).
- [ ] Filtered run lists only the backoffice tests: `pnpm -F main exec playwright test backoffice --list` shows two tests in one file.
- [ ] Typecheck passes: `pnpm -F main typecheck`.
- [ ] Lint passes: `pnpm -F main lint`.

#### Manual verification

- [ ] `apps/main/e2e/backoffice.spec.ts` exists and reads top-to-bottom as a coherent demo script (no helper indirection beyond `loginAsAdmin`).
- [ ] Each test's narrative maps cleanly to one of the two ticket bullets ("dynamiczny FAQ", "generowanie widgetów do czatu z poziomu backoffice").

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Run headed and verify recordings

### Overview

Run the new spec end-to-end in headed Chromium, watch the two flows complete on screen, and confirm the resulting `.webm` recordings under `apps/main/test-results/` are watchable for the lector script. Fix any LLM-variability flakes inside `backoffice.spec.ts` only — no app-code changes.

### Changes required

No code changes unless the run surfaces flakes. Likely flake locations and fixes:

- **AI-suggest takes longer than 60s**: bump `LLM_TIMEOUT` to 90_000 or 120_000.
- **`"Generowanie..."` text never appears** (LLM responds before Playwright observes the loading state): drop that intermediate `expect(...)` line; keep only the final `not.toHaveValue("")` wait.
- **Suggestion chip text drift**: if the chip strings in `builder-chat.tsx:20-27` are edited, update `scenarioPrompt` to match.
- **Sidebar link not visible at small viewport**: the sidebar is `hidden md:flex`. Default Playwright viewport is `1280x720`, so this is fine. If anyone narrows it, switch to `page.goto("/app/faq")` direct navigation.

### Run

```bash
pnpm -F main test:e2e:backoffice
```

For the demo recording, the user can also run a single test by name:

```bash
pnpm -F main exec playwright test backoffice -g "creates a new FAQ"
pnpm -F main exec playwright test backoffice -g "builds and saves a new widget"
```

### Success criteria

#### Automated verification

- [ ] `pnpm -F main test:e2e:backoffice` exits 0.
- [ ] Two `.webm` files appear under `apps/main/test-results/` (one per test).
- [ ] `apps/main/playwright-report/index.html` is generated.
- [ ] `pnpm -F main test:e2e` exits 0 (no regression in `demo.spec.ts`).

#### Manual verification

- [ ] Headed Chromium visibly walks through:
  - **FAQ test**: login form → dashboard → sidebar "Baza wiedzy (FAQ)" → "Nowe FAQ" → typed question → "Zaproponuj odpowiedź AI" populates the textarea → "Zapisz wpis" → row visible in list.
  - **Widget test**: login form → dashboard → sidebar "Widgety agenta" → "Nowy widget" → suggestion chip clicked → preview panel renders the generated widget on the right → "Zapisz widget" → row visible in list.
- [ ] Both `.webm` recordings are watchable end-to-end and could be narrated for the demo video.
- [ ] After the run, `/app/faq` and `/app/tools` show the new rows in a real browser session (sanity-check that the data persisted).

---

## Testing strategy

### Unit tests

None. No production code is modified.

### Integration tests

The two spec tests are themselves the integration tests. Each drives the real backoffice UI against the real Drizzle/Postgres DB and the real LiteLLM proxy.

### Manual testing steps

1. From repo root: `pnpm -F main test:e2e:backoffice`.
2. Watch the headed browser walk through both tests in sequence.
3. When it exits, play `apps/main/test-results/<test-name>/video.webm` for each test.
4. In a separate browser, open `/app/faq` and `/app/tools` and confirm the timestamped rows are present.
5. Run `pnpm -F main test:e2e` to confirm the existing customer-flow spec still passes alongside.

## Performance considerations

- `LLM_TIMEOUT = 60_000` per LLM-dependent wait. Two LLM calls per run (one per test): suggest-FAQ-answer and builder-propose-spec. Total budget: ~5 minutes for the describe block (`test.setTimeout(5 * 60_000)`).
- `workers: 1` and `fullyParallel: false` (already set in `playwright.config.ts`) — tests run serially, keeping the recordings clean.
- `reuseExistingServer: !process.env.CI` — running `pnpm -F main dev` in a side terminal saves ~20s per iteration while authoring.

## Migration notes

N/A — additive only. No schema, config, or app-code changes.

## References

- Original ticket: `thoughts/tickets/fsn_0025-playwright-automated-e2e-tests-backoffice.md`
- Sibling ticket / plan: `thoughts/tickets/fsn_0020-playwright-automated-e2e-tests.md`, `thoughts/plans/2026-04-18-FSN-0020-playwright-e2e-demo.md`
- Existing customer-flow spec: `apps/main/e2e/demo.spec.ts`
- Playwright config: `apps/main/playwright.config.ts`
- Login page: `apps/main/src/app/(auth)/login/page.tsx`
- Login form component: `apps/main/src/components/auth/login-form.tsx`
- Auth fallback credentials: `apps/main/src/auth.ts:10-11,64-67`
- Brand admin email source: `apps/main/src/branding/config.ts:22-25`
- In-flight login redesign: `thoughts/plans/2026-04-18-FSN-0021-ui-tweaks.md` (Phase 3)
- Sidebar nav: `apps/main/src/components/layout/sidebar.tsx:17-24`
- FAQ list page: `apps/main/src/app/(authenticated)/app/faq/page.tsx`
- FAQ form component: `apps/main/src/components/faq/faq-form.tsx`
- FAQ server actions: `apps/main/src/lib/actions/faq.action.ts`
- AI-suggest action: `apps/main/src/lib/actions/faq-suggest.action.ts`
- Widget list page: `apps/main/src/app/(authenticated)/app/tools/page.tsx`
- Widget builder workspace: `apps/main/src/components/widget-builder/workspace.tsx`
- Widget builder chat (suggestion chips): `apps/main/src/components/widget-builder/builder-chat.tsx:20-27`
- Widget save bar: `apps/main/src/components/widget-builder/save-bar.tsx`
- Widget builder server actions: `apps/main/src/lib/actions/widget-builder.action.ts`
- Playwright skill: `.claude/skills/playwright-cli/SKILL.md`
