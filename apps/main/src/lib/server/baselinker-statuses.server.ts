/**
 * BaseLinker order status mapping.
 *
 * Maps ~60 internal BaseLinker status IDs to 6 customer-friendly categories.
 * Updated manually when needed (statuses rarely change).
 *
 * Last sync: 2026-04-13 (from getOrderStatusList API response)
 */

export type OrderStatusCategory =
  | "new"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "problem";

const STATUS_MAP: Record<number, OrderStatusCategory> = {
  // --- New (awaiting payment / verification) ---
  125868: "new", // Przyjęto nowe zamówienie
  283690: "new", // Oczekuje na wpłatę
  298074: "new", // PRESTASHOP - ZAMÓWIENIA NIE OPŁACONE DO WER.
  319100: "new", // Weryfikacja BANK

  // --- Processing (paid, picking, packing, documents) ---
  283692: "processing", // Opłacone
  145960: "processing", // DO PAKOWANIA
  316877: "processing", // Zbieranie1
  316878: "processing", // Zbieranie2
  316879: "processing", // Zbieranie3
  316880: "processing", // Zbieranie4
  316881: "processing", // Pakowanie1
  316882: "processing", // Pakowanie2
  316883: "processing", // Pakowanie3
  316884: "processing", // Pakowanie4
  316885: "processing", // Wygeneruj WZ
  316888: "processing", // Wygenerowano WZ
  145793: "processing", // Dodaj RO
  145794: "processing", // Dodano RO
  287773: "processing", // Towar do zamówienia
  287775: "processing", // Towar Zamówiony
  287776: "processing", // Faktura Wprowadzona
  148752: "processing", // Optima Rezerwacje
  339008: "processing", // Do BL Paczki
  341807: "processing", // Sprawdzanie VIES
  350730: "processing", // Generuj Pro formę
  350731: "processing", // Wygenerowano Pro Formę

  // --- Shipped (handed to courier) ---
  125869: "shipped", // Do odbioru przez kuriera
  127488: "shipped", // Odebrane przez kuriera- Wysłane
  145736: "shipped", // Wysłane Allegro DPD/UPS
  316866: "shipped", // DHL
  316867: "shipped", // INPOST
  316868: "shipped", // GLS
  316869: "shipped", // UPS
  316874: "shipped", // POCZTA POLSKA
  318623: "shipped", // DPD
  339109: "shipped", // Orlen paczka
  349279: "shipped", // Dostarczono bez FV

  // --- Delivered ---
  135603: "delivered", // Odebrane przez klienta
  287987: "delivered", // Dropshipping zakończone

  // --- Cancelled ---
  125871: "cancelled", // Zamówienie zostało anulowane
  193915: "cancelled", // Klient anulował
  330158: "cancelled", // Zamówienia Nieopłacone bez RO

  // --- Problem (needs human contact) ---
  141477: "problem", // Nie odebrane/ powrót
  145979: "problem", // BRAK TOWARU
  205529: "problem", // Zamówienia do wyjaśnienia
  252995: "problem", // Dokonany zwrot pieniędzy
  141475: "problem", // Nie opłacone zagraniczne
};

const DEFAULT_CATEGORY: OrderStatusCategory = "processing";

export function mapOrderStatus(statusId: number): OrderStatusCategory {
  return STATUS_MAP[statusId] ?? DEFAULT_CATEGORY;
}

/** Customer-friendly label per category (used by AI to describe the status) */
export const STATUS_LABELS: Record<OrderStatusCategory, string> = {
  new: "Order received, awaiting payment",
  processing: "Order is being prepared",
  shipped: "Package shipped",
  delivered: "Package delivered",
  cancelled: "Order cancelled",
  problem: "Order requires attention — please contact support",
};
