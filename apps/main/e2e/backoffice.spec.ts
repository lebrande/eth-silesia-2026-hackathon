import { test, expect, Page } from "@playwright/test";
import { holdForClip, recordClipForTeardown } from "./clips.shared";

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

// The builder LLM sometimes asks for clarification before producing a spec
// (rule #1 of BUILDER_SYSTEM_PROMPT: "Pytaj o detale zanim zgadniesz").
// If that happens, the SaveBar button stays disabled after the LLM finishes.
// This helper waits for the spec, and if the LLM came back without one,
// sends a short nudge and waits again. Bounded to avoid infinite loops.
async function waitForSpec(
  page: Page,
  saveBtn: ReturnType<Page["getByRole"]>,
  maxNudges = 2,
) {
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

  test.afterEach(async ({}, testInfo) => {
    await recordClipForTeardown(testInfo);
  });

  test("backoffice-01-opening-why-a-backoffice", async ({ page }) => {
    const startedAt = Date.now();
    await loginAsAdmin(page);
    await holdForClip(page, startedAt, "backoffice-01-opening-why-a-backoffice");
  });

  test("backoffice-02-feature-1-dynamic-faq", async ({ page }) => {
    const startedAt = Date.now();
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

    await holdForClip(page, startedAt, "backoffice-02-feature-1-dynamic-faq");
  });

  test("backoffice-03-feature-2-widget-builder", async ({ page }) => {
    const startedAt = Date.now();
    const ts = Date.now();
    const widgetName = `E2E Widget — porównanie taryf (${ts})`;
    const widgetDescription =
      "Pokazuje 3 taryfy z rocznym kosztem, gdy klient pyta o porównanie cen.";

    // Prescriptive prompt: the builder system prompt has rule #1
    // "Pytaj o detale zanim zgadniesz", which makes short scenarios like
    // a suggestion chip bounce back as a clarifying question instead of a
    // spec. We pre-answer every clarification and explicitly instruct it
    // to produce the spec now with mock data.
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

    await holdForClip(page, startedAt, "backoffice-03-feature-2-widget-builder");
  });

  test("backoffice-04-close", async ({ page }) => {
    const startedAt = Date.now();
    await loginAsAdmin(page);
    await holdForClip(page, startedAt, "backoffice-04-close");
  });
});
