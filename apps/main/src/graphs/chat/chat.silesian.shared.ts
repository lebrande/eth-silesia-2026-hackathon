// Silesian dialect toggle — simple, deterministic keyword detection.
//
// Design choices:
// - Substring matching on lowercased input (no regex word boundaries, because
//   JS `\b` is ASCII-only and breaks around Polish diacritics).
// - Phrases are chosen to already contain natural boundaries (spaces), so
//   false positives inside unrelated words are unlikely.
// - Both diacritic and ASCII-fallback spellings are listed (user may type
//   without Polish keyboard).
// - Disable list is checked first so that "wyłącz gwarę" wins over any
//   incidental Silesian-enable substring.

const ENABLE_PHRASES = [
  "po śląsku",
  "po slasku",
  "po ślonsku",
  "po slonsku",
  "po ślōnsku",
  "po ślōnski",
  "po ślonski",
  "po slonski",
  "w gwarze",
  "gwara śląska",
  "gwarze śląskiej",
  "gwarę śląską",
  "gwarą śląską",
  "śląska gwara",
  "godka śląska",
  "ślōnsko godka",
  "ślonsko godka",
  "włącz gwarę",
  "wlacz gware",
] as const;

const DISABLE_PHRASES = [
  "po polsku",
  "wyłącz gwarę",
  "wylacz gware",
  "wyłącz ślą",
  "wyłącz ślonsk",
  "wyłącz ślōnsk",
  "wylacz sla",
  "wylacz slonsk",
  "bez gwary",
  "przełącz na polski",
  "przelacz na polski",
  "wróć do polskiego",
  "wroc do polskiego",
  "normalnie po polsku",
  "zwykłym polskim",
  "standardowym polskim",
] as const;

export type SilesianToggle = "enable" | "disable" | null;

export function detectSilesianToggle(message: string): SilesianToggle {
  const lower = message.toLowerCase();
  if (DISABLE_PHRASES.some((p) => lower.includes(p))) return "disable";
  if (ENABLE_PHRASES.some((p) => lower.includes(p))) return "enable";
  return null;
}

// Decide the next silesianMode given the current state and the trigger on the
// latest user message.
//
// Rules:
// - Enable only when the conversation is (or is about to be) Polish. We treat
//   undefined `language` as "not yet classified, assume pl" because the
//   trigger phrases themselves are Polish.
// - Disable always wins — even in non-pl sessions, so the user can always
//   escape if we've misfired.
// - null trigger → no change.
export function nextSilesianMode(
  currentMode: boolean | undefined,
  toggle: SilesianToggle,
  language: string | undefined,
): boolean | undefined {
  if (toggle === "disable") return false;
  if (toggle === "enable") {
    if (language === undefined || language === "pl") return true;
    return currentMode;
  }
  return currentMode;
}
