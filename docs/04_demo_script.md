# Skrypt rozmowy demo

**Data:** 2026-04-18
**Cel:** jeden ciągły dialog klienta z Mój Tauron AI, który w ~5 turach przechodzi przez wszystkie 3 widgety i kończy się podpisaną umową. Bez eskalacji do człowieka — happy path.

**Persona:** Anna Kowalska, klientka Tauron na taryfie G11, bez fotowoltaiki, mieszka w domu jednorodzinnym. W październiku 2025 rachunek skoczył — zaczęła grzać pompą ciepła i jeszcze tego nie odczuła w fakturach bo mrożenie cen działało do końca roku. Od stycznia 2026 mrożenie zniesione → szok.

---

## Część 1 — pytanie ogólne (bez autoryzacji)

> **Anna:** Czym różni się taryfa G11 od G12?

> **Asystent:** G11 to taryfa jednostrefowa — ten sam koszt kWh przez całą dobę (0,6485 zł/kWh w 2026). G12 jest dwustrefowa: taniej w nocy 22:00–6:00 i popołudniu 13:00–15:00 (0,3500 zł/kWh), drożej w szczycie (0,6950 zł/kWh). G12 opłaca się, gdy co najmniej ~30% zużycia przypada na godziny nocne.

**Co tu się dzieje:** `default_agent` odpowiada bez sięgania po dane klienta. Brak SMS challenge, brak widgetu — czysta wiedza domenowa z promptu. Pokazujemy, że asystent umie gadać o Tauronie nawet bez logowania.

---

## Część 2 — pytanie osobiste → SMS challenge → `ConsumptionTimeline`

> **Anna:** OK, a dlaczego moje rachunki ostatnio tak wzrosły?

> **Asystent:** Żebym mógł sięgnąć po Twoje dane rozliczeniowe, potrzebuję potwierdzić tożsamość. Podaj numer telefonu, na który wyślę jednorazowy kod SMS.

> **Anna:** +48 600 123 456

> **Asystent:** Wysłałem kod SMS na numer \*\*\*456. Wpisz 6-cyfrowy kod.
>
> *[renderuje SmsAuthChallenge]*

> **Anna:** 000000

> **Asystent:** *[renderuje widget `ConsumptionTimeline` — 36 miesięcy, anomalia w październiku 2025 podświetlona]*
>
> Spójrz na wykres — do września 2025 Twoje miesięczne zużycie mieściło się w ~350 kWh. Od października skoczyło do ~620 kWh i utrzymuje się. Największy przyrost widać w godzinach 17–22. Do stycznia 2026 faktury tego nie pokazywały bo obowiązywało mrożenie cen — od tego miesiąca płacisz pełną stawkę, stąd szok.
>
> Żebym mógł zasugerować konkretne oszczędności: jakie sprzęty włączyłaś jesienią i w jakich godzinach ich używasz?

**Co tu się dzieje:** `default_agent` klasyfikuje jako `needs_auth` → `request_phone` → `verify_phone` → `verify_code` → `verified_agent`. Verified agent woła `getConsumptionTimeline` (mock: 36 miesięcy + oznaczona anomalia + godzinowy breakdown ostatnich 12 miesięcy). Agent wplata informację o końcu mrożenia cen (01/2026) — to prawdziwy pain point z researchu.

---

## Część 3 — opisanie sprzętów → automatyczne porównanie taryf

> **Anna:** Włączyłam pompę ciepła we wrześniu, a grzeję głównie wieczorami. Dodatkowo mam pralkę, suszarkę, lodówkę i TV 65".

> **Asystent:** Aha, pompa ciepła wszystko wyjaśnia — to sprzęt, który najbardziej zyskuje na taryfie wielostrefowej. Zobacz obok porównanie dla Twojego profilu:
>
> *[renderuje widget `TariffComparator` — 3 kolumny: G11 (obecna), G12, G13 z roczną prognozą kosztu, procentowymi różnicami vs G11 i oznaczoną G13 jako recommended]*
>
> G13 daje ~30% oszczędności rocznie (~1 400 zł), ale wymaga zaprogramowania pompy pod 3 strefy. G12 to prostszy kompromis — ~19% mniej. Którą opcję wybierasz?

**Co tu się dzieje:** `verified_agent` **nie pyta**, czy pokazać porównanie — od razu woła `compareTariffs` (mock: 3 taryfy × roczny koszt + delta procentowa + recommended flag). Tekstowa część odpowiedzi jest minimalna: ciężar decyzji przenosimy na widget. To świadomy zabieg UX — osoba starsza/niezaznajomiona z taryfami łatwiej zrozumie obraz niż tabelę w tekście. Pytanie końcowe jest konkretne (G13 vs G12), nie otwarte.

---

## Część 4 — podpis umowy → `ContractSigning`

> **Anna:** Dobra, przechodzę na G13.

> **Asystent:** *[renderuje widget `ContractSigning` — sekcje treści umowy do przeczytania w widgecie (strony, warunki, taryfa G13, data wejścia, dane klienta) + przycisk „Akceptuję warunki"]*
>
> Przygotowałem draft. Przeczytaj i jeśli się zgadzasz, zaakceptuj — wtedy zaproponuję podpis przez mObywatela.

> **Anna:** *[czyta w widgecie → klik „Akceptuję warunki"]*

> **Widget:** *[przełącza się w stan „podpisz mObywatelem" — przycisk + QR code w tym samym widgecie]*

> **Anna:** *[klika „Podpisz mObywatelem" → frontend symuluje push → akceptacja]*

> **Asystent:** Umowa podpisana. Od 01.05.2026 jesteś na taryfie G13 — pierwsze efekty zobaczysz na fakturze za maj. Mogę Ci jeszcze w czymś pomóc?

**Co tu się dzieje:** `verified_agent` woła `prepareContractDraft` (mock: sekcje treści umowy + metadane + status podpisu). Cały cykl read → accept → sign obsługuje **jeden widget** po stronie frontendu — zmienia stany wewnętrznie, graf ma jeden wpis (`prepareContractDraft`) i nie potrzebuje osobnego node'a na podpis.

**Alternatywa (do decyzji FE):** przycisk „Podpisz mObywatelem" może siedzieć poza czatem — np. jako sticky CTA na stronie po zaakceptowaniu treści. Mechanika tego nie zmienia — graf po prostu emituje widget i oddaje kontrolę frontendowi.

---

## Mapa turów → toole → widgety

| Tura | Trigger użytkownika | Ścieżka grafu | Tool | Widget |
| --- | --- | --- | --- | --- |
| 1 | Pytanie o G11 vs G12 | `gate → default_agent` | — | — |
| 2 | Pytanie o własne rachunki | `default_agent → request_phone → verify_phone → verify_code → verified_agent` | `getConsumptionTimeline` | `SmsAuthChallenge`, `ConsumptionTimeline` |
| 3 | Opisanie sprzętów | `gate → verified_agent` | `compareTariffs` | `TariffComparator` |
| 4 | "Przechodzę na G13" | `gate → verified_agent` | `prepareContractDraft` | `ContractSigning` (read → accept → sign) |

---

## Notatki reżyserskie dla prowadzącego demo

- **Tura 1 istnieje po to**, żeby pokazać że asystent nie wymaga logowania na każde pytanie — SMS challenge pojawia się *w środku* rozmowy, dokładnie gdy wchodzimy w dane osobowe. To wprost sygnalizuje security-by-design (cross-sponsor AKMF).
- **Anomalię podświetloną w `ConsumptionTimeline`** warto kliknąć w czasie demo — otworzyłaby tooltip "październik 2025: +78% vs średnia", co wzmacnia narrację "AI operuje na twoich danych".
- **`TariffComparator` jest interaktywny** — jury powinno móc kliknąć G12 i zobaczyć alternatywny koszt, nie tylko rekomendowaną G13.
- **Podpis mObywatelem = czysty mock**: klik → spinner 1–2 sek → "podpisano". Nie próbujemy pokazywać realnej integracji — hook narracyjny wystarczy.
- **Fallback gdy demo tnie:** każda tura jest osobnym stanem grafu (checkpointed), więc jeśli coś padnie, wracamy do ostatniej zadziałanej tury bez restartowania rozmowy.
