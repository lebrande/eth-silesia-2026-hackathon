import { test, expect, Page } from "@playwright/test";
import { holdForClip, recordClipForTeardown } from "./clips.shared";

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
  await expect(
    page.getByText("Twoje zużycie", { exact: true }),
  ).toBeVisible({ timeout: TURN_TIMEOUT });
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

  test.afterEach(async ({}, testInfo) => {
    await recordClipForTeardown(testInfo);
  });

  test("customer-01-opening", async ({ page }) => {
    const startedAt = Date.now();
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Porozmawiaj z asystentem" }),
    ).toBeVisible();
    await holdForClip(page, startedAt, "customer-01-opening");
  });

  test("customer-02-landing-and-persona", async ({ page }) => {
    const startedAt = Date.now();
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Porozmawiaj z asystentem" });
    await expect(cta).toBeVisible();
    await page.waitForTimeout(5_000);
    await cta.click();
    await expect(page.locator(CHAT_INPUT)).toBeVisible();
    await expect(page.getByText("Cześć! W czym mogę pomóc?")).toBeVisible();
    await holdForClip(page, startedAt, "customer-02-landing-and-persona");
  });

  test("customer-03-turn-1-public-knowledge-no-login", async ({ page }) => {
    const startedAt = Date.now();
    await openAgent(page);
    await doTurn1(page);
    await expect(
      page.getByText("Twoje zużycie", { exact: true }),
    ).toHaveCount(0);
    await holdForClip(
      page,
      startedAt,
      "customer-03-turn-1-public-knowledge-no-login",
    );
  });

  test("customer-04-turn-2-sms-challenge-and-consumption-timeline", async ({
    page,
  }) => {
    const startedAt = Date.now();
    await openAgent(page);
    await doTurn2(page);
    await holdForClip(
      page,
      startedAt,
      "customer-04-turn-2-sms-challenge-and-consumption-timeline",
    );
  });

  test("customer-05-turn-3-tariff-comparison", async ({ page }) => {
    const startedAt = Date.now();
    await openAgent(page);
    await doTurn2(page);
    await doTurn3(page);
    await holdForClip(page, startedAt, "customer-05-turn-3-tariff-comparison");
  });

  test("customer-06-turn-4-contract-and-mobywatel", async ({ page }) => {
    const startedAt = Date.now();
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
    await holdForClip(
      page,
      startedAt,
      "customer-06-turn-4-contract-and-mobywatel",
    );
  });

  test("customer-07-close", async ({ page }) => {
    const startedAt = Date.now();
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Porozmawiaj z asystentem" }),
    ).toBeVisible();
    await holdForClip(page, startedAt, "customer-07-close");
  });
});
