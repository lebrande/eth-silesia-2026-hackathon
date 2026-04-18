import { test, expect, Page } from "@playwright/test";

const CHAT_INPUT = 'input[placeholder="Napisz wiadomość..."]';
const TURN_TIMEOUT = 60_000;

async function sendMessage(page: Page, text: string) {
  const input = page.locator(CHAT_INPUT);
  await expect(input).toBeEnabled({ timeout: TURN_TIMEOUT });
  await input.fill(text);
  await input.press("Enter");
  // `disabled={sending}` flips true on submit and false when the Server
  // Action resolves — re-enabled means the bot replied.
  await expect(input).toBeDisabled({ timeout: 5_000 });
  await expect(input).toBeEnabled({ timeout: TURN_TIMEOUT });
}

test.describe("Anna Kowalska demo", () => {
  test.setTimeout(5 * 60_000);

  test("walks through all three widgets and signs the contract", async ({
    page,
  }) => {
    await page.goto("/agent");
    await expect(page.locator(CHAT_INPUT)).toBeVisible();
    await expect(page.getByText("Cześć! W czym mogę pomóc?")).toBeVisible();

    // Part 1 — general knowledge, no widget, no auth
    await sendMessage(page, "Czym różni się taryfa G11 od G12?");
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
