# FSN-0026 — Demo video clips (Playwright per-clip) Implementation Plan

## Overview

Produce 11 `.webm` screen-recordings, one per voiceover MP3 in `kuba/elevenlabs-test/out/`, by splitting the existing Playwright specs into 11 one-per-clip `test()` blocks and adding a `globalTeardown` that copies/renames each test's `video.webm` into a flat `test-results/demo-clips/{script}-{NN}-{slug}.webm` set that pairs 1:1 with the MP3s. Each test pads its trailing state with `page.waitForTimeout()` so the `.webm` runtime is ≥ its paired MP3 duration. Post-production (merging, muxing, transitions) is explicitly out of scope — this plan delivers the raw clips.

## Current state analysis

- `apps/main/playwright.config.ts:13-17` — `video: "on"`, `headless: false`, `workers: 1`. Video is already recorded per test into `test-results/<desc>-<title>-<hash>-chromium/video.webm`. The webServer is launched with `SMS_MOCK=true` and `MOCK_AUTH_CODE=000000` at `playwright.config.ts:25-28`.
- `apps/main/e2e/demo.spec.ts:20-61` — a single `test()` named "walks through all three widgets and signs the contract" covers the full customer happy path (G11/G12 → bills + SMS auth → timeline → devices → comparator → G13 pick → contract accept → mObywatel sign). Uses `sendMessage()` helper that fills `input[placeholder="Napisz wiadomość..."]`, presses Enter, and waits for `disabled → enabled` round-trip.
- `apps/main/e2e/backoffice.spec.ts:52-167` — two `test()` blocks (FAQ entry + AI-suggested answer, widget builder via LLM). `loginAsAdmin()` helper is scoped inside the describe block. `waitForSpec()` handles the case where the builder LLM asks a clarifying question instead of producing a spec (up to 2 nudges).
- `apps/main/src/app/page.tsx:5-42` — public landing page at `/` with hero CTA "Porozmawiaj z asystentem" linking to `/agent`. Usable as the customer-01/02 pre-roll target.
- `apps/main/src/proxy.ts:3` — `/`, `/agent`, `/login` are public. `/app/*` requires auth (handled via `loginAsAdmin`).
- `apps/main/src/app/agent/chat.client.tsx:25-29` — `ChatPage` initializes fresh `uid`/`threadId` refs on every mount. **There is no persistence across page loads.** Each `test()` starts a brand-new conversation, which means later customer clips (04–07) have to re-execute every prior turn silently as pre-roll.
- `kuba/elevenlabs-test/out/` — all 11 MP3s present (verified via `ls`). Do not touch.
- `apps/main/test-results/` — contains 2 existing per-test folders from a prior backoffice run; filename pattern confirmed as `<desc>-<title>-<hash>-chromium/video.webm`.
- `apps/main/package.json:18-19` — `test:e2e` and `test:e2e:backoffice` scripts already exist.

### Key discoveries

- **No checkpoint seeding path.** The `/api/chat` route accepts `uid`/`thread_id` but the only mechanism for "verified phone" is running the 3-turn SMS dance (verify-phone node → verify-code node). Decision on the open question: acceptable — customer-06's `.webm` will run ~80–100 s for a 33 s MP3, and the editor aligns the end of the audio with the end of the interaction.
- **Playwright folder naming is deterministic up to a 5-char hash.** Folder names include a sanitized concatenation of spec file + describe title + test title. If test titles contain a stable clip slug (e.g. `customer-04-turn-2-sms-challenge-and-consumption-timeline`), we can glob-match that slug in folder names to locate each video.
- **Video is finalized before `globalTeardown` runs.** Playwright closes the per-test `BrowserContext` at end-of-test (flushing `video.webm`), then after all tests run, `globalTeardown` fires. A `globalTeardown` glob-and-copy is the cleanest collector.
- **`workers: 1` is already set.** No need for per-worker coordination. Tests run sequentially in a single browser context-per-test setup, so late-turn customer tests that re-execute prior LLM turns run predictably.

## Desired end state

After this plan is complete:
1. Running `pnpm -F main test:e2e:clips` (new combined script) produces exactly 11 files under `apps/main/test-results/demo-clips/`, with stems matching the 11 MP3s.
2. For each of the 11 clips, `ffprobe -v quiet -show_entries format=duration` on the `.webm` ≥ the corresponding MP3 duration (from the table in the ticket).
3. Spot-checking any three clips in a media player shows the narrated beat on-screen during the matching second when the paired MP3 is layered over the clip (manual verification).

## What we're NOT doing

- Merging clips into a single video per demo.
- Muxing MP3 audio into the `.webm`.
- Transitions, overlays, cuts, titles, background music.
- Panning or scrolling during lingered holds (decision: static holds; editor can add Ken-Burns in post if a clip feels dead).
- A dev-only `/api/test/seed-session` route to skip prior turns (decision: out of scope — we accept longer late-turn videos).
- Re-rendering or trimming the MP3 clips (owned by FSN-0024).
- Updating the in-app TTS voice (owned by `CLAUDE.md`).

## Implementation approach

Four phases, each independently verifiable:

1. Introduce a shared `clips` metadata module + a small `holdForClip(testInfo)` helper so the 11 durations and slugs live in exactly one place. This keeps the specs declarative and the teardown data-driven.
2. Rewrite `demo.spec.ts` into 7 `test()` blocks named after the clip slugs; each does minimum pre-roll, plays the narrated beat, then calls `holdForClip`.
3. Rewrite `backoffice.spec.ts` into 4 `test()` blocks — keep the two existing meaningful tests (FAQ, builder) with renamed titles + trailing holds, and add two brand-hold tests for opening/close.
4. Wire up `globalTeardown` in `playwright.config.ts` to glob `test-results/**/video.webm`, match each folder name against the clip slugs from the shared metadata, and copy into `test-results/demo-clips/{slug}.webm`. Add the combined npm script and `.gitignore` entry.

---

## Phase 1: Shared clip metadata + hold helper

### Overview

Create a single source of truth for the 11 clips (slug, MP3 duration) and one helper that tests call at the end to pad their runtime to ≥ MP3 duration.

### Changes required

#### 1. New file: `apps/main/e2e/clips.shared.ts`

**File**: `apps/main/e2e/clips.shared.ts`
**Changes**: Export the 11 clips as a readonly array with `slug` + `mp3Seconds`, plus `holdForClip()` which computes the remaining time to reach `MP3_DURATION + 3s` total video length and calls `page.waitForTimeout()`.

```typescript
import type { Page, TestInfo } from "@playwright/test";

// Paired 1:1 with apps/../kuba/elevenlabs-test/out/{slug}.mp3.
// Durations are taken from FSN-0026 (rounded to 1 decimal second).
export const DEMO_CLIPS = [
  { slug: "customer-01-opening", mp3Seconds: 28.4 },
  { slug: "customer-02-landing-and-persona", mp3Seconds: 22.8 },
  { slug: "customer-03-turn-1-public-knowledge-no-login", mp3Seconds: 25.4 },
  {
    slug: "customer-04-turn-2-sms-challenge-and-consumption-timeline",
    mp3Seconds: 29.8,
  },
  { slug: "customer-05-turn-3-tariff-comparison", mp3Seconds: 23.0 },
  { slug: "customer-06-turn-4-contract-and-mobywatel", mp3Seconds: 33.0 },
  { slug: "customer-07-close", mp3Seconds: 14.6 },
  { slug: "backoffice-01-opening-why-a-backoffice", mp3Seconds: 18.8 },
  { slug: "backoffice-02-feature-1-dynamic-faq", mp3Seconds: 34.0 },
  { slug: "backoffice-03-feature-2-widget-builder", mp3Seconds: 41.2 },
  { slug: "backoffice-04-close", mp3Seconds: 15.8 },
] as const;

export type DemoClipSlug = (typeof DEMO_CLIPS)[number]["slug"];

export function clipFor(slug: DemoClipSlug) {
  const found = DEMO_CLIPS.find((c) => c.slug === slug);
  if (!found) throw new Error(`Unknown clip slug: ${slug}`);
  return found;
}

// Pads the test so the recorded video is ≥ MP3_DURATION + 3s.
// Call at the very end of a test, after the narrated beat is on-screen.
// The start/end delta between test start and this call is read from testInfo.
export async function holdForClip(
  page: Page,
  testInfo: TestInfo,
  slug: DemoClipSlug,
) {
  const { mp3Seconds } = clipFor(slug);
  const targetMs = Math.ceil(mp3Seconds * 1000) + 3_000;
  const elapsedMs = Date.now() - testInfo.startTime.getTime();
  const remainingMs = Math.max(1_000, targetMs - elapsedMs);
  await page.waitForTimeout(remainingMs);
}
```

**Why elapsed-time-based (not fixed 3 s tail)?** The ticket's rule of thumb ("last interaction ends at MP3_DURATION - 3s; 3 s hold; cap MP3_DURATION + 4s") is only achievable for clips whose interaction naturally fits inside the MP3. Customer-06 cannot — its pre-roll alone is longer than its MP3. For those, `remainingMs` bottoms out at the 1 s floor and the video ends up MP3_DURATION + (pre-roll overrun) seconds long, which is acceptable per the ticket's ≥-not-= requirement.

### Success criteria

#### Automated verification

- [ ] Typecheck passes: `pnpm -F main typecheck`
- [ ] Lint passes: `pnpm -F main lint`
- [ ] File imports cleanly from both specs when Phase 2/3 land (verified by Phase 2/3 typecheck)

#### Manual verification

- [ ] `DEMO_CLIPS` slugs match the MP3 filenames 1:1 — spot-check `ls kuba/elevenlabs-test/out/*.mp3` matches the 11 slugs.

---

## Phase 2: Split `demo.spec.ts` into 7 customer tests

### Overview

Replace the single customer happy-path test with 7 tests, one per MP3. Each test's `test()` title is its clip slug verbatim (for `globalTeardown` folder matching). Each test does the minimum pre-roll (re-executing only the prior turns needed to reach its narrated beat), plays the beat, then calls `holdForClip()`. All existing prompts (verbatim Polish strings from the current spec) are reused; Anna Kowalska persona is preserved.

### Changes required

#### 1. Rewrite `apps/main/e2e/demo.spec.ts`

**File**: `apps/main/e2e/demo.spec.ts`
**Changes**: Replace the single `test()` with 7 tests. Keep `sendMessage()` and `CHAT_INPUT`/`TURN_TIMEOUT` constants. Extract a `doTurn1`..`doTurn3` sequence of helpers that multiple late tests reuse as pre-roll.

```typescript
import { test, expect, Page } from "@playwright/test";
import { holdForClip } from "./clips.shared";

const CHAT_INPUT = 'input[placeholder="Napisz wiadomość..."]';
const TURN_TIMEOUT = 60_000;

async function sendMessage(page: Page, text: string) {
  const input = page.locator(CHAT_INPUT);
  await expect(input).toBeEnabled({ timeout: TURN_TIMEOUT });
  await input.fill(text);
  await input.press("Enter");
  await expect(input).toBeDisabled({ timeout: 5_000 });
  await expect(input).toBeEnabled({ timeout: TURN_TIMEOUT });
}

// Pre-roll helpers. Each advances the conversation by one narrative turn,
// reaching the state that the matching customer-NN clip holds at the end.

async function openAgent(page: Page) {
  await page.goto("/agent");
  await expect(page.locator(CHAT_INPUT)).toBeVisible();
  await expect(page.getByText("Cześć! W czym mogę pomóc?")).toBeVisible();
}

async function doTurn1(page: Page) {
  await sendMessage(page, "Czym różni się taryfa G11 od G12?");
}

async function doTurn2(page: Page) {
  await sendMessage(page, "Dlaczego moje rachunki ostatnio tak wzrosły?");
  await sendMessage(page, "600123456");
  await sendMessage(page, "000000");
  await expect(page.getByText("Twoje zużycie")).toBeVisible({
    timeout: TURN_TIMEOUT,
  });
}

async function doTurn3(page: Page) {
  await sendMessage(
    page,
    "Włączyłam pompę ciepła we wrześniu, mam też pralkę, suszarkę, lodówkę i TV 65 cali.",
  );
  await expect(
    page.getByRole("button", { name: "Wybierz G13" }),
  ).toBeVisible({ timeout: TURN_TIMEOUT });
}

test.describe("customer demo clips", () => {
  test.setTimeout(5 * 60_000);

  test("customer-01-opening", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Porozmawiaj z asystentem" }),
    ).toBeVisible();
    await holdForClip(page, testInfo, "customer-01-opening");
  });

  test("customer-02-landing-and-persona", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Porozmawiaj z asystentem" }),
    ).toBeVisible();
    // Dwell briefly on the landing so the CTA click lands mid-clip.
    await page.waitForTimeout(5_000);
    await page.getByRole("link", { name: "Porozmawiaj z asystentem" }).click();
    await expect(page.locator(CHAT_INPUT)).toBeVisible();
    await expect(page.getByText("Cześć! W czym mogę pomóc?")).toBeVisible();
    await holdForClip(page, testInfo, "customer-02-landing-and-persona");
  });

  test("customer-03-turn-1-public-knowledge-no-login", async (
    { page },
    testInfo,
  ) => {
    await openAgent(page);
    await doTurn1(page);
    // Assert no personal widget appeared — proves "no login required" beat.
    await expect(page.getByText("Twoje zużycie")).toHaveCount(0);
    await holdForClip(
      page,
      testInfo,
      "customer-03-turn-1-public-knowledge-no-login",
    );
  });

  test("customer-04-turn-2-sms-challenge-and-consumption-timeline", async (
    { page },
    testInfo,
  ) => {
    await openAgent(page);
    await doTurn2(page);
    await holdForClip(
      page,
      testInfo,
      "customer-04-turn-2-sms-challenge-and-consumption-timeline",
    );
  });

  test("customer-05-turn-3-tariff-comparison", async ({ page }, testInfo) => {
    await openAgent(page);
    await doTurn2(page);
    await doTurn3(page);
    await holdForClip(page, testInfo, "customer-05-turn-3-tariff-comparison");
  });

  test("customer-06-turn-4-contract-and-mobywatel", async (
    { page },
    testInfo,
  ) => {
    await openAgent(page);
    await doTurn2(page);
    await doTurn3(page);

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
    await holdForClip(page, testInfo, "customer-06-turn-4-contract-and-mobywatel");
  });

  test("customer-07-close", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Porozmawiaj z asystentem" }),
    ).toBeVisible();
    await holdForClip(page, testInfo, "customer-07-close");
  });
});
```

**Why no test skips the pre-roll via `storageState` reuse?** Playwright's per-test video-per-context model means even if we share state, each test still starts a fresh context (and therefore a fresh `uid`/`threadId` per `chat.client.tsx:25-29`) — no win. Each late test simply does the silent pre-roll.

### Success criteria

#### Automated verification

- [ ] Typecheck passes: `pnpm -F main typecheck`
- [ ] Lint passes: `pnpm -F main lint`
- [ ] Customer suite produces 7 `video.webm` files: `pnpm -F main test:e2e demo` → `ls apps/main/test-results/*customer-0*/video.webm | wc -l` = 7
- [ ] Each customer `.webm` runtime ≥ paired MP3: `for f in apps/main/test-results/*customer-0*/video.webm; do ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f"; done` — each value ≥ the corresponding row from the clip table.

#### Manual verification

- [ ] Watching customer-04's `.webm` shows the consumption-timeline widget with the October bar on-screen during the final ~10 s.
- [ ] Watching customer-06's `.webm` ends on the "Umowa podpisana" confirmation screen.
- [ ] No test flakes on a cold `pnpm install && pnpm -F main test:e2e` run (the LLM path is real for turns 1–3; SMS is mocked).

**Implementation note**: After this phase's automated verification passes, pause for manual confirmation that spot-checked clips show the right beats before proceeding to Phase 3.

---

## Phase 3: Re-split `backoffice.spec.ts` into 4 tests

### Overview

Keep the two existing meaningful tests (FAQ, widget builder) almost as-is — only rename their `test()` titles to the clip slugs and add a trailing `holdForClip()`. Add two new brand-hold tests (`backoffice-01-opening-why-a-backoffice`, `backoffice-04-close`) that log in, navigate to the dashboard, and hold. Hoist `loginAsAdmin` and `waitForSpec` to module scope so all 4 tests can call them.

### Changes required

#### 1. Rewrite `apps/main/e2e/backoffice.spec.ts`

**File**: `apps/main/e2e/backoffice.spec.ts`
**Changes**: Hoist `loginAsAdmin`/`waitForSpec` out of the describe block (they already are module-scoped — confirmed by reading the file). Rename the two existing `test()` titles from the prose names to the clip slugs. Wrap each existing body's final assertion in a `holdForClip()`. Add `backoffice-01-opening-why-a-backoffice` and `backoffice-04-close`.

```typescript
import { test, expect, Page } from "@playwright/test";
import { holdForClip } from "./clips.shared";

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

async function waitForSpec(
  page: Page,
  saveBtn: ReturnType<Page["getByRole"]>,
  maxNudges = 2,
) {
  // (body unchanged from current backoffice.spec.ts:26-50)
  const builderInput = page.locator(
    'textarea[placeholder*="Opisz scenariusz klienta"]',
  );
  const sendBtn = page.getByRole("button", { name: "Wyślij" });

  for (let attempt = 0; attempt <= maxNudges; attempt++) {
    await expect(builderInput).toBeEnabled({ timeout: LLM_TIMEOUT });
    if (await saveBtn.isEnabled()) return;
    if (attempt === maxNudges) break;
    await builderInput.fill(
      "Zbuduj spec teraz, użyj przykładowych wartości, nie pytaj o detale.",
    );
    await sendBtn.click();
  }

  await expect(saveBtn).toBeEnabled({ timeout: LLM_TIMEOUT });
}

test.describe("backoffice demo clips", () => {
  test.setTimeout(5 * 60_000);

  test("backoffice-01-opening-why-a-backoffice", async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    // Land on the dashboard; hold on the operator's landing screen.
    await holdForClip(page, testInfo, "backoffice-01-opening-why-a-backoffice");
  });

  test("backoffice-02-feature-1-dynamic-faq", async ({ page }, testInfo) => {
    // (body copied from current "creates a new FAQ entry" test;
    //  minor change: trailing expectation wrapped with holdForClip)
    const ts = Date.now();
    const question = `E2E FAQ — jak zmienić taryfę z G11 na G13? (${ts})`;

    await loginAsAdmin(page);

    await page.getByRole("link", { name: "Baza wiedzy (FAQ)" }).click();
    await expect(page).toHaveURL(/\/app\/faq$/);
    await expect(
      page.getByRole("heading", { name: "Baza wiedzy (FAQ)" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Nowe FAQ" }).first().click();
    await expect(page).toHaveURL(/\/app\/faq\/new$/);

    await page.locator("#question").fill(question);

    const answer = page.locator("#answer");
    await expect(answer).toHaveValue("");

    const suggestBtn = page.getByRole("button", {
      name: "Zaproponuj odpowiedź AI",
    });
    await expect(suggestBtn).toBeEnabled();
    await suggestBtn.click();

    await expect(suggestBtn).toBeVisible({ timeout: LLM_TIMEOUT });
    await expect(answer).not.toHaveValue("", { timeout: LLM_TIMEOUT });

    await page.locator("#category").fill("E2E");
    await page.locator("#tags").fill("e2e, playwright");

    await page.getByRole("button", { name: "Zapisz wpis" }).click();
    await expect(page).toHaveURL(/\/app\/faq\/[0-9a-f-]{36}$/, {
      timeout: NAV_TIMEOUT,
    });

    await page.getByRole("link", { name: "Baza wiedzy (FAQ)" }).click();
    await expect(page).toHaveURL(/\/app\/faq$/);
    await expect(page.getByText(question)).toBeVisible();

    await holdForClip(page, testInfo, "backoffice-02-feature-1-dynamic-faq");
  });

  test("backoffice-03-feature-2-widget-builder", async ({ page }, testInfo) => {
    // (body copied from current "builds and saves a new widget" test,
    //  with holdForClip appended)
    const ts = Date.now();
    const widgetName = `E2E Widget — porównanie taryf (${ts})`;
    const widgetDescription =
      "Pokazuje 3 taryfy z rocznym kosztem, gdy klient pyta o porównanie cen.";

    const builderPrompt = [
      "Zbuduj widget: tabela porównująca 3 taryfy — G11, G12, G13.",
      "Kolumny: Taryfa, Cena kWh, Opłata stała, Roczny koszt.",
      "Wartości: G11 — 0,70 zł, 30 zł, 2400 zł;",
      "G12 — 0,85 / 0,45 zł, 35 zł, 2100 zł;",
      "G13 — 0,90 / 0,40 zł, 40 zł, 1800 zł.",
      "Podświetl wiersz G13 jako polecany.",
      "Pod tabelą dodaj przyciski: 'Wybierz G11', 'Wybierz G12', 'Wybierz G13'.",
      "Użyj przykładowych wartości — nie pytaj o detale, zbuduj spec teraz.",
    ].join(" ");

    await loginAsAdmin(page);

    await page.getByRole("link", { name: "Widgety agenta" }).click();
    await expect(page).toHaveURL(/\/app\/tools$/);
    await expect(
      page.getByRole("heading", { name: "Widgety agenta" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Nowy widget" }).first().click();
    await expect(page).toHaveURL(/\/app\/tools\/new$/);
    await expect(page.getByText("Builder widgetów")).toBeVisible();

    const saveBtn = page.getByRole("button", { name: "Zapisz widget" });
    await expect(saveBtn).toBeDisabled();
    await expect(
      page.getByText(
        "Najpierw opisz scenariusz w czacie — builder wygeneruje widget.",
      ),
    ).toBeVisible();

    const builderInput = page.locator(
      'textarea[placeholder*="Opisz scenariusz klienta"]',
    );
    await builderInput.fill(builderPrompt);
    await page.getByRole("button", { name: "Wyślij" }).click();

    await waitForSpec(page, saveBtn);

    await expect(page.getByText("Widget gotowy do zapisu.")).toBeVisible();

    await page.locator('input[name="name"]').fill(widgetName);
    await page.locator('input[name="description"]').fill(widgetDescription);
    await saveBtn.click();

    await expect(page).toHaveURL(/\/app\/tools\/[0-9a-f-]{36}$/, {
      timeout: NAV_TIMEOUT,
    });

    await page.getByRole("link", { name: "Widgety agenta" }).click();
    await expect(page).toHaveURL(/\/app\/tools$/);
    await expect(page.getByText(widgetName)).toBeVisible();

    await holdForClip(page, testInfo, "backoffice-03-feature-2-widget-builder");
  });

  test("backoffice-04-close", async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    // Hold on dashboard — editor can overlay brand mark if needed.
    await holdForClip(page, testInfo, "backoffice-04-close");
  });
});
```

### Success criteria

#### Automated verification

- [ ] Typecheck passes: `pnpm -F main typecheck`
- [ ] Lint passes: `pnpm -F main lint`
- [ ] Backoffice suite produces 4 `video.webm` files: `pnpm -F main test:e2e:backoffice` → `ls apps/main/test-results/*backoffice-0*/video.webm | wc -l` = 4
- [ ] Each backoffice `.webm` runtime ≥ paired MP3 (ffprobe table check).

#### Manual verification

- [ ] `backoffice-03`'s recorded clip ends with the widget list showing the saved `E2E Widget — porównanie taryf` entry (the narrated "the widget joins the library" beat).
- [ ] `backoffice-02`'s recorded clip ends on the FAQ list showing the new entry.

**Implementation note**: pause for manual confirmation after backoffice clips are recorded, before proceeding to Phase 4.

---

## Phase 4: `globalTeardown` to collect + rename clips

### Overview

Add a Playwright `globalTeardown` that walks `test-results/`, matches each of the 11 clip slugs against folder names (Playwright includes the test title in the folder name), and copies `video.webm` → `test-results/demo-clips/{slug}.webm`. Idempotent: runs after each `playwright test` invocation and only copies what that invocation produced. Also add the combined `test:e2e:clips` script and `.gitignore` the collected dir.

### Changes required

#### 1. New file: `apps/main/e2e/global-teardown.ts`

**File**: `apps/main/e2e/global-teardown.ts`
**Changes**: Implements the collector. Uses `node:fs/promises` and `node:path` only — no new deps.

```typescript
import { readdir, stat, mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { DEMO_CLIPS } from "./clips.shared";

// Playwright writes each test's video to:
//   test-results/<desc-slug>-<test-slug>-<hash>-chromium/video.webm
// The test-slug portion contains the clip slug verbatim (we name tests
// with the slug exactly), so we glob-match each slug against folder names.

async function findClipFolder(
  testResultsDir: string,
  clipSlug: string,
): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(testResultsDir);
  } catch {
    return null;
  }
  const match = entries.find((name) => name.includes(clipSlug));
  if (!match) return null;
  const videoPath = join(testResultsDir, match, "video.webm");
  try {
    await stat(videoPath);
    return videoPath;
  } catch {
    return null;
  }
}

export default async function globalTeardown() {
  const testResultsDir = "test-results";
  const outDir = join(testResultsDir, "demo-clips");
  await mkdir(outDir, { recursive: true });

  let copied = 0;
  for (const { slug } of DEMO_CLIPS) {
    const src = await findClipFolder(testResultsDir, slug);
    if (!src) continue; // clip wasn't produced by this invocation; skip
    const dst = join(outDir, `${slug}.webm`);
    await copyFile(src, dst);
    copied += 1;
    console.log(`[demo-clips] ${slug}.webm`);
  }
  console.log(`[demo-clips] collected ${copied} / ${DEMO_CLIPS.length}`);
}
```

#### 2. Update `apps/main/playwright.config.ts`

**File**: `apps/main/playwright.config.ts`
**Changes**: Add `globalTeardown: "./e2e/global-teardown.ts"` to the config.

```typescript
export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  // ...rest unchanged
});
```

#### 3. Update `apps/main/package.json`

**File**: `apps/main/package.json`
**Changes**: Add `test:e2e:clips` script that runs both specs in sequence. Both invocations trigger the teardown, which is idempotent.

```json
{
  "scripts": {
    "test:e2e:clips": "playwright test demo && playwright test backoffice"
  }
}
```

**Why two invocations, not one?** `playwright test` without args runs all `e2e/*.spec.ts`. Running them as a single invocation is fine and slightly faster, but the ticket references the existing `test:e2e` / `test:e2e:backoffice` split; keeping both invocations means partial reruns (when you only want to re-record one video type) still work without the combined script. A single-invocation alternative is `"test:e2e:clips": "playwright test"` if simpler is preferred — I chose the two-invocation form to match the ticket phrasing.

#### 4. Update `apps/main/.gitignore`

**File**: `apps/main/.gitignore`
**Changes**: Add `test-results/demo-clips/` (or ensure `test-results/` is already ignored — verify before editing).

```
test-results/
```

### Success criteria

#### Automated verification

- [ ] Typecheck passes: `pnpm -F main typecheck`
- [ ] Lint passes: `pnpm -F main lint`
- [ ] After `pnpm -F main test:e2e:clips`, `ls apps/main/test-results/demo-clips/*.webm | wc -l` = 11
- [ ] Filenames match MP3 stems: `diff <(ls kuba/elevenlabs-test/out/*.mp3 | xargs -n1 basename | sed 's/\.mp3$//' | sort) <(ls apps/main/test-results/demo-clips/*.webm | xargs -n1 basename | sed 's/\.webm$//' | sort | grep -v smoke)` returns no output.
- [ ] Every collected clip meets its duration requirement:
  ```bash
  for f in apps/main/test-results/demo-clips/*.webm; do
    dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")
    echo "$(basename $f): ${dur}s"
  done
  ```
  and each value ≥ the corresponding row from the ticket's clip table.

#### Manual verification

- [ ] Spot-check 3 clips (e.g. customer-04, customer-06, backoffice-03) by overlaying the paired MP3 in any editor — the narrated beat lands on the right visible state.
- [ ] `apps/main/test-results/demo-clips/` survives a rerun of `pnpm -F main test:e2e:clips` (idempotent — old files are overwritten by `copyFile`).

---

## Testing strategy

### Unit tests

None — the changes are exclusively Playwright specs and a teardown script. The teardown's logic is trivial (readdir + includes-match + copyFile).

### Integration tests

The Playwright runs themselves are the integration test. `pnpm -F main test:e2e:clips` is the acceptance harness.

### Manual testing steps

1. Run `pnpm -F main test:e2e:clips` from a clean state (empty `test-results/`).
2. Confirm 11 `.webm` files appear in `test-results/demo-clips/`.
3. Open any 3 clips in QuickTime / VLC alongside their paired MP3; confirm the narrated beat is on-screen when the matching audio second plays.
4. Delete one source test-results folder and rerun just that spec — confirm the collector regenerates that clip only, leaving the others untouched.

## Performance considerations

- `workers: 1` remains — video recording and LLM determinism both require serial execution.
- Full run time: customer suite ≈ 5–6 min (7 tests, 3 of which include real LLM turns), backoffice suite ≈ 2–3 min (2 LLM-heavy tests + 2 fast brand holds). Total ≈ 8 min, dominated by customer-06's 4-turn pre-roll.
- Disk: each `.webm` is ~500 KB – 2 MB; 11 clips ≈ 15 MB peak under `test-results/`.

## Migration notes

None. `test-results/` is already regenerated per run; no existing artifacts depend on it.

## References

- Ticket: `thoughts/tickets/fsn_0026-generate-video-for-demo.md`
- Upstream voiceover ticket + notes: `thoughts/tickets/fsn_0024-hackathon-demo-video-script.md`, `thoughts/notes/generating-voiceover.md`
- Scripts (screen-sync cues per clip live in the production-notes footers): `thoughts/notes/demo-video/customer-script.md`, `thoughts/notes/demo-video/backoffice-script.md`
- Existing specs: `apps/main/e2e/demo.spec.ts:20-61`, `apps/main/e2e/backoffice.spec.ts:52-167`
- Playwright config: `apps/main/playwright.config.ts:13-28`
- Chat session ephemerality (why late tests must re-execute prior turns): `apps/main/src/app/agent/chat.client.tsx:25-29`, `apps/main/src/app/agent/chat.server.ts:19-43`
- SMS mock wiring: `apps/main/src/graphs/customer/nodes/verify-phone.node.ts:15-19`, `apps/main/src/lib/server/sms.server.ts:28-30`
