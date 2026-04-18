# Playwright E2E demo test implementation plan

## Overview

Add a single-command, headed, video-recorded Playwright E2E test that drives the real `/agent` chat UI through the Anna Kowalska demo happy path from `docs/04_demo_script.md` (the same narrative that `apps/main/scripts/test-demo.ts` exercises programmatically via `invokeChatGraph`). The test hits the actual Next.js app, the actual verified-agent graph, and the three mock-data widget tools (`getConsumptionTimeline`, `compareTariffs`, `prepareContractDraft`).

## Current state analysis

- Chat UI lives at `/agent`, public route (`apps/main/src/proxy.ts:3`). No login needed.
- Chat input: `<input placeholder="Napisz wiadomość..." />`; submit button text `"Wyślij"` (`apps/main/src/app/agent/chat.client.tsx:155-170`).
- Messages transport via Next.js Server Action `sendChatMessageAction`, not `/api/chat` (`apps/main/src/lib/actions/chat.action.ts:27`). Browser never sees `authCode` — the action strips it from the response (`chat.action.ts:49-54`).
- `SMS_MOCK=true` short-circuits real SMS and only logs the generated random 6-digit code to server stdout (`apps/main/src/lib/server/sms.server.ts:28-31`, `apps/main/src/graphs/chat/subgraphs/root/nodes/verify-phone.node.ts:49,52`). Because the code is random and invisible to the browser, Playwright has no way to learn it today.
- All three widget tools are fully implemented with static mock data and no external calls:
  - `getConsumptionTimeline` → 12-month mock with anomaly (`apps/main/src/graphs/chat/tools/get-consumption-timeline/get-consumption-timeline.tool.ts:7-30`, `.mock.ts:8-28`)
  - `compareTariffs` → exactly 3 tariffs, G13 recommended (`apps/main/src/graphs/chat/tools/compare-tariffs/compare-tariffs.tool.ts:7-28`, `.mock.ts:6-12`)
  - `prepareContractDraft` → sections + tariffCode + `status:"pending"` (`apps/main/src/graphs/chat/tools/prepare-contract-draft/prepare-contract-draft.tool.ts:7-37`)
- Verified-agent subgraph is wired: on successful code entry, `verify-code.node.ts:24-37` routes to `verified_agent`; the prompt (`verified-agent.prompt.md:22-28`) instructs the LLM to call each tool for the corresponding user intent.
- No existing Playwright installation in the repo. `apps/main/package.json` has `tsx`, `next`, `eslint` as the only dev-tooling deps; the `test:*` scripts all run programmatic server-side graph tests.
- Dev server: `pnpm -F main dev` → `next dev` on port 3000. Health endpoint at `/api/health`.
- Required env (already in `.env`): `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `API_SECRET_KEY`. LLM calls go through the Railway-hosted LiteLLM proxy.

### Key discoveries

- Widget DOM hooks available without code changes:
  - `ConsumptionTimeline` → `CardTitle` text `"Twoje zużycie"` (`apps/main/src/app/agent/widgets/consumption-timeline.client.tsx`)
  - `TariffComparator` → per-tariff button `"Wybierz G11"`/`"Wybierz G12"`/`"Wybierz G13"` (`apps/main/src/app/agent/widgets/tariff-comparator.client.tsx`)
  - `ContractSigning` → CardTitle `"Umowa — taryfa G13"`, buttons `"Akceptuję warunki"` then `"Podpisz mObywatelem"`, final heading `"Umowa podpisana"` (`apps/main/src/app/agent/widgets/contract-signing.client.tsx`)
- Bot text bubbles: `div.bg-muted.text-foreground`. User bubbles: `div.bg-primary.text-primary-foreground`. The chat input is `disabled` while `sending` is true, which gives Playwright a reliable "LLM responded" signal — wait for the input to be re-enabled between turns.
- `test-demo.ts:15` sets `process.env.SMS_MOCK = "true"` programmatically. Cases 10–15 of that file are the same narrative we are reproducing in the browser and are expected to pass against today's codebase (though no recorded run exists in `apps/main/scripts/results/`).

## Desired end state

- Running `pnpm -F main test:e2e` from the repo root (or `apps/main/`):
  1. Boots `next dev` with `SMS_MOCK=true` if the server is not already running.
  2. Launches a headed Chromium window.
  3. Navigates to `http://localhost:3000/agent` and runs the 4-step Anna Kowalska narrative end-to-end, typing messages into the real chat input.
  4. Asserts each widget appears (ConsumptionTimeline, TariffComparator, ContractSigning) and the contract reaches the signed state.
  5. Records a `.webm` video of the entire run under `apps/main/test-results/`.
  6. Exits 0 on success; exits non-zero with an HTML report under `apps/main/playwright-report/` on failure.
- `SMS_MOCK=true` now produces a deterministic, env-overridable code (`MOCK_AUTH_CODE`, default `"000000"`), so Playwright can type the code directly without out-of-band lookups. Programmatic `test-demo.ts` continues to pass because it reads `r.authCode` from the graph result either way.

### Verification:
- `pnpm -F main test:e2e` exits 0 and leaves a video file under `apps/main/test-results/*.webm`.
- `pnpm -F main test:demo` still exits 0 (no regression in programmatic tests).
- `pnpm -F main typecheck` passes.
- `pnpm -F main lint` passes.

## What we're NOT doing

- Not adding a CI integration (GitHub Actions, Railway hook, etc.) — this is a local dev/demo tool.
- Not parameterizing multiple browsers — Chromium only.
- Not replicating all 15 cases from `test-demo.ts` — only the Anna happy path.
- Not adding Page Object Model abstractions, fixtures, or helper files beyond what one spec needs. One spec file, no helpers package.
- Not adding `data-testid` attributes across the app. We target by the existing visible text and `aria-label` hooks that already exist.
- Not handling login / credentials / NextAuth flows — the `/agent` route is public.
- Not mocking the LiteLLM proxy, the DB, or any widget data. Flow runs against live LLM and the in-code widget mocks exactly as Part 4 of the ticket requested.
- Not adding a separate SMS widget (`SmsAuthChallenge`). The SMS code is typed into the normal chat input, matching current graph behaviour.
- Not changing the widget components, chat UI, or graph wiring. Only `verify-phone.node.ts` sees a minimal change behind `SMS_MOCK=true`.

## Implementation approach

Four small phases, each independently verifiable. Phase 1 is a 1-file app change to make auth deterministic under mock mode. Phase 2 installs Playwright. Phase 3 writes the spec. Phase 4 runs and confirms. Nothing in Phases 2–4 edits app code.

## Phase 1: Deterministic auth code under `SMS_MOCK`

### Overview

When `SMS_MOCK=true`, `generateCode()` in `verify-phone.node.ts` currently returns a random 6-digit string. We replace the call site with a mock-aware wrapper: if `SMS_MOCK=true`, use `process.env.MOCK_AUTH_CODE ?? "000000"`; otherwise keep the random generator. Behaviour outside mock mode is unchanged.

### Changes required:

#### 1. `verify-phone.node.ts`

**File**: `apps/main/src/graphs/chat/subgraphs/root/nodes/verify-phone.node.ts`
**Changes**: Replace the body of `generateCode()` so it honours `SMS_MOCK` + `MOCK_AUTH_CODE`. No other lines change. The existing `console.log(...)` stays so the server log still shows the code in use.

```ts
function generateCode(): string {
  if (process.env.SMS_MOCK === "true") {
    return process.env.MOCK_AUTH_CODE ?? "000000";
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}
```

### Success criteria:

#### Automated verification:

- [ ] Typecheck passes: `pnpm -F main typecheck`
- [ ] Lint passes: `pnpm -F main lint`
- [ ] Programmatic demo still passes: `pnpm -F main test:demo` (cases 10–15 should green — they use `r.authCode` from the graph result, which now equals `"000000"`)
- [ ] Batch auth tests still pass: `pnpm -F main test:batch`

#### Manual verification:

- [ ] With `SMS_MOCK=true`, starting the dev server and completing an auth flow with phone `600123456` + code `"000000"` reaches `verified` state (see `[auth] Verification code for ...` line in server stdout confirming the code).
- [ ] With `SMS_MOCK` unset, the code in the log is random again (sanity check).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Playwright scaffolding

### Overview

Install `@playwright/test` + Chromium, add a `playwright.config.ts` at `apps/main/`, create the `apps/main/e2e/` directory, add a `test:e2e` npm script, and ignore Playwright output dirs from git.

### Changes required:

#### 1. Install dependencies

**Command**: `pnpm add -D @playwright/test -F main && pnpm -F main exec playwright install chromium`

This adds `@playwright/test` to `apps/main/package.json` devDependencies and downloads the Chromium browser binary into Playwright's cache.

#### 2. `playwright.config.ts`

**File**: `apps/main/playwright.config.ts` (new)
**Changes**: Minimal config — Chromium only, headed, video always on, auto-start the dev server with `SMS_MOCK=true`. Reuse an already-running dev server if present (so the user can run `pnpm -F main dev` in a side terminal and iterate faster).

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    video: "on",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    cwd: ".",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SMS_MOCK: "true",
      MOCK_AUTH_CODE: "000000",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
```

#### 3. npm script

**File**: `apps/main/package.json`
**Changes**: Add one line inside `scripts`:

```json
"test:e2e": "playwright test"
```

#### 4. `.gitignore`

**File**: `apps/main/.gitignore` (append if exists, create entries if missing)
**Changes**: Ensure these entries are present:

```
test-results/
playwright-report/
playwright/.cache/
```

#### 5. Seed directory

**File**: `apps/main/e2e/.gitkeep` (new, empty)
Keeps the directory in git before the spec lands in Phase 3.

### Success criteria:

#### Automated verification:

- [ ] Playwright CLI is installed: `pnpm -F main exec playwright --version`
- [ ] Config is valid: `pnpm -F main exec playwright test --list` prints `0 tests found in 0 files` (no specs yet) without config errors.
- [ ] Typecheck still passes: `pnpm -F main typecheck` (the config file itself is TS).
- [ ] Lint still passes: `pnpm -F main lint`.

#### Manual verification:

- [ ] `apps/main/playwright.config.ts` exists and is TypeScript.
- [ ] `apps/main/e2e/` directory exists.
- [ ] `pnpm -F main test:e2e` is a valid script (running it with no specs should exit cleanly).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Anna happy-path demo spec

### Overview

Write a single Playwright spec under `apps/main/e2e/demo.spec.ts` that drives the 4-part Anna Kowalska narrative verbatim from `docs/04_demo_script.md`. The spec uses one shared `page` per run (single thread), types into the real chat input, and asserts each widget by its visible text / button labels — not by bot wording, which is LLM-variable.

### Changes required:

#### 1. `apps/main/e2e/demo.spec.ts`

**File**: `apps/main/e2e/demo.spec.ts` (new)
**Changes**: One spec with one `test()` walking the 4 turns in sequence. Uses a small helper `sendMessage(page, text)` that types into the chat input, presses Enter, and waits for the input to become re-enabled (the "LLM finished" signal, since `chat.client.tsx:160` sets `disabled={sending}`). Assertions target the widget-specific text hooks identified in the research.

```ts
import { test, expect, Page } from "@playwright/test";

const CHAT_INPUT = 'input[placeholder="Napisz wiadomość..."]';
const TURN_TIMEOUT = 60_000;

async function sendMessage(page: Page, text: string) {
  const input = page.locator(CHAT_INPUT);
  await expect(input).toBeEnabled({ timeout: TURN_TIMEOUT });
  await input.fill(text);
  await input.press("Enter");
  // `disabled={sending}` flips true on submit and false when the Server
  // Action resolves. Waiting for re-enabled means the bot replied.
  await expect(input).toBeDisabled({ timeout: 5_000 });
  await expect(input).toBeEnabled({ timeout: TURN_TIMEOUT });
}

test.describe("Anna Kowalska demo", () => {
  test("walks through all three widgets and signs the contract", async ({
    page,
  }) => {
    await page.goto("/agent");
    await expect(page.locator(CHAT_INPUT)).toBeVisible();
    await expect(page.getByText("Cześć! W czym mogę pomóc?")).toBeVisible();

    // Part 1 — general knowledge, no widget, no auth
    await sendMessage(page, "Czym różni się taryfa G11 od G12?");
    // No widget should have rendered yet.
    await expect(page.getByText("Twoje zużycie")).toHaveCount(0);

    // Part 2 — bills question → phone → code → ConsumptionTimeline
    await sendMessage(page, "Dlaczego moje rachunki ostatnio tak wzrosły?");
    await sendMessage(page, "600123456");
    await sendMessage(page, "000000");
    await expect(page.getByText("Twoje zużycie")).toBeVisible({
      timeout: TURN_TIMEOUT,
    });

    // Part 3 — devices → TariffComparator
    await sendMessage(
      page,
      "Włączyłam pompę ciepła we wrześniu, mam też pralkę, suszarkę, lodówkę i TV 65 cali.",
    );
    await expect(
      page.getByRole("button", { name: "Wybierz G13" }),
    ).toBeVisible({ timeout: TURN_TIMEOUT });

    // Part 4 — pick tariff → ContractSigning read → accept → sign
    await sendMessage(page, "Dobra, przechodzę na G13.");
    const accept = page.getByRole("button", { name: "Akceptuję warunki" });
    await expect(accept).toBeVisible({ timeout: TURN_TIMEOUT });
    await accept.click();

    const sign = page.getByRole("button", { name: "Podpisz mObywatelem" });
    await expect(sign).toBeVisible();
    await sign.click();

    await expect(page.getByText("Umowa podpisana")).toBeVisible({
      timeout: 10_000,
    });
  });
});
```

### Success criteria:

#### Automated verification:

- [ ] Spec is discovered: `pnpm -F main exec playwright test --list` shows `1 test in 1 file`.
- [ ] Typecheck passes: `pnpm -F main typecheck`.
- [ ] Lint passes: `pnpm -F main lint`.

#### Manual verification:

- [ ] Spec file is readable and the four parts are easy to map to `docs/04_demo_script.md`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 4.

---

## Phase 4: Execute the test and verify the recording

### Overview

Run the spec end-to-end headed, watch it complete the four turns, and confirm the resulting video under `apps/main/test-results/` plays back the narrative. Fix any LLM-variability flakes here (e.g., bump `TURN_TIMEOUT`, switch a text match to a regex).

### Changes required:

No code changes unless the run surfaces flakes. If it does, the fix lives inside `apps/main/e2e/demo.spec.ts` only.

### Run:

```bash
pnpm -F main test:e2e
```

### Success criteria:

#### Automated verification:

- [ ] `pnpm -F main test:e2e` exits 0.
- [ ] A `.webm` video file is produced under `apps/main/test-results/` for the test run.
- [ ] `playwright-report/index.html` is generated.

#### Manual verification:

- [ ] The headed Chromium window visibly walks the four turns.
- [ ] Playing back the `.webm` shows the Anna narrative: G11/G12 answer → phone prompt → SMS code prompt → ConsumptionTimeline chart → TariffComparator with G13 highlighted → ContractSigning read → accepted → signed.
- [ ] `pnpm -F main test:demo` still passes (Phase 1 regression check).

---

## Testing strategy

### Unit tests:

None. No new units are introduced beyond a two-line branch in `generateCode()` (Phase 1), covered by the existing programmatic `test:demo` and `test:batch` suites.

### Integration tests:

The spec itself is the integration test. It drives the real UI against the real graph and the real LiteLLM proxy.

### Manual testing steps:

1. From repo root: `pnpm -F main test:e2e`.
2. Watch the headed browser walk through `/agent`.
3. When it exits, play `apps/main/test-results/<...>/video.webm`.
4. Run `pnpm -F main test:demo` to confirm the deterministic-code change didn't regress programmatic tests.
5. Unset `SMS_MOCK` locally and send a message via `pnpm -F main test:chat` (or the UI) to confirm the random-code path still fires in non-mock mode.

## Performance considerations

- Each `sendMessage` waits up to 60s for the bot to reply, to absorb LLM latency variance. Total test budget is ~5 minutes including the four tool-calling turns.
- `workers: 1` and `fullyParallel: false` — one test, serial, to keep the demo recording clean.
- `reuseExistingServer: !process.env.CI` — a dev server already running on port 3000 is reused, shaving ~20s off each iteration while authoring the spec.

## Migration notes

N/A — additive only. The single app-code change (Phase 1) is guarded by `process.env.SMS_MOCK === "true"`, so production behaviour is unchanged.

## References

- Original ticket: `thoughts/tickets/fsn_0020-playwright-automated-e2e-tests.md`
- Demo narrative: `docs/04_demo_script.md`
- Programmatic counterpart: `apps/main/scripts/test-demo.ts`
- Playwright skill: `.claude/skills/playwright-cli/SKILL.md`
- Chat client: `apps/main/src/app/agent/chat.client.tsx:155-170`
- Server Action: `apps/main/src/lib/actions/chat.action.ts:27-55`
- SMS code generation: `apps/main/src/graphs/chat/subgraphs/root/nodes/verify-phone.node.ts:15-17,49-52`
- SMS mock short-circuit: `apps/main/src/lib/server/sms.server.ts:28-31`
- Widget tools: `apps/main/src/graphs/chat/tools/{get-consumption-timeline,compare-tariffs,prepare-contract-draft}/`
- Widget components: `apps/main/src/app/agent/widgets/{consumption-timeline,tariff-comparator,contract-signing}.client.tsx`
