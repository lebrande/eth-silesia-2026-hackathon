# Zakres projektu + user stories

**Data:** 2026-04-18
**Źródło:** podsumowanie rozmowy zespołu po briefie Tauron (doc 02).

---

## 1. Filozofia i zasady

- **Sprzedajemy doświadczenie (UX), nie implementację.** Demo = dobrze zgrany flow, wszystko pod spodem może być zamokowane.
- **Zamknięty cykl MVP first.** Najpierw jeden scenariusz end-to-end działający, potem kolejne funkcje.
- **Nice to have na końcu.** Ostatnia godzina = nice-to-have, które są OK do pominięcia.
- **Dwa narracje dla jury:**
  - **Frontend** → przyszłość *klienta* Tauron (AI asystent operujący na jego danych).
  - **Backoffice** → przyszłość *pracownika domenowego* Tauron (AI wzmacnia eksperta, nie zastępuje).

---

## 2. Podział pracy między 3 osoby

| Osoba | Rola | Zakres |
|---|---|---|
| **Rafal** | AI agent | LangGraph, RAG (jeśli czas), tool calling, struktura JSON zwracana do frontendu definiująca jaki komponent wyrenderować |
| **Cezary** | Backoffice (dashboard) | Panel pracownika Tauron — historia rozmów, edytor FAQ, knowledge base, "zgłoś problem" |
| **Kuba** | Frontend (klient) | Rendering komponentów wizualnych z JSON agenta, chat UI, flow podpisu umowy |

**Kontrakt między rolami:** agent zwraca JSON typu `{ type: "TariffComparator", data: {...} }` → frontend renderuje odpowiedni komponent. To jest punkt styku, który trzeba ustalić **pierwszego dnia** — inaczej każdy pracuje w próżni.

---

## 3. Frontend — flow klienta (3 scenariusze jeden za drugim)

### Scenariusz 1: "Dlaczego mam takie wysokie rachunki?" (P0)

**User story:** Jako zalogowany klient Tauron piszę do chata "dlaczego ostatnio mam takie wysokie rachunki?", autoryzuję się SMS-em i asystent pokazuje mi moje dane z wykrytą anomalią.

**Flow:**
1. User wpisuje pytanie.
2. Agent: "Żebym mógł pokazać Twoje dane rozliczeniowe, potrzebuję potwierdzić tożsamość. Wysłałem kod SMS na numer ***123." → renderuje widget `SmsAuthChallenge` (input na kod).
3. User wpisuje kod (mock — dowolny 6-cyfrowy przechodzi, albo hardcoded `000000`).
4. Po autoryzacji agent sięga po historię faktur + godzinowe zużycie z mock backendu.
5. Renderuje widget `ConsumptionTimeline` z highlightem anomalii.
6. Informuje o aktualnej taryfie.
7. Kończy pytaniem: "Żebym lepiej doradził, powiedz mi, jakie sprzęty używasz w domu i w jakich godzinach?"

**Dlaczego SMS auth w demo:** system autoryzacji SMS już istnieje w projekcie (dziedzictwo z wcześniejszej pracy). Pokazujemy, że agent operuje na wrażliwych danych klienta dopiero *po* weryfikacji — to wprost łączy się z narracją AKMF (security by design) i daje jury konkretny sygnał, że myślimy o danych energetycznych jako wrażliwych.

**Definition of done:** challenge SMS renderuje się jako widget, po "przejściu" agent dostaje dostęp do danych usera, widget `ConsumptionTimeline` się renderuje, agent kończy follow-upem. Autoryzacja raz per sesja (nie powtarza się w Scenariuszu 2 i 3).

---

### Scenariusz 2: "Kiedy włączać sprzęty" (P0)

**User story:** Jako klient opisuję swoje sprzęty w chacie, a asystent **bez dodatkowego komponentu wyboru** sugeruje konkretne oszczędności w PLN.

**Decyzja zespołu:** NIE robimy designerskiego komponentu do klikania sprzętów — to wygląda sztucznie. Agent odruchowo proponuje znane sprzęty i godziny.

**Flow:**
1. User: "mam pralkę, suszarkę, lodówkę, TV 65 cali".
2. Agent: "Pralkę fajnie uruchamiać 22-6, bo jest taniej o X%. Przy twoim zużyciu, jeśli przesuniesz pralkę i suszarkę, oszczędzisz ~300 PLN rocznie."
3. Liczby konkretne, oparte o mockowaną historię + publiczne ceny taryf.
4. Narracja wspólna ze strategią Tauron: przesuwanie piku zużycia pomaga sieci (OZE w nocy się nie marnuje) — ale to tylko wzmianka.

**Definition of done:** agent zna godziny off-peak, cennik taryf i potrafi policzyć oszczędność dla podanych sprzętów.

---

### Scenariusz 3: "Zmień taryfę" + podpis mObywatelem (P0)

**User story:** Asystent proponuje zmianę taryfy, porównuje 3 opcje, a ja podpisuję nową umowę przez mObywatela bez wychodzenia z chata.

**Flow:**
1. Agent: "Przy twoim zużyciu jesteś na G11. Sensowne opcje to G12 lub G13 (jeśli masz pompę ciepła). Porównanie:"
2. Renderuje widget `TariffComparator` — 3 kolumny z rocznym kosztem.
3. User: "dobra, daj G12".
4. Agent: "Przygotowałem draft umowy" → renderuje widget `PdfAttachment` (załącznik w chacie jak w Messengerze, otwieralny — pokaże prawdziwy PDF mock).
5. Pod załącznikiem przycisk **"Podpisz mObywatelem"** + QR code.
6. Flow mobilny (mock): skan QR → push do mObywatela → akceptacja → umowa podpisana.
7. Koniec: "Umowa zawarta. Od następnego okresu rozliczeniowego jesteś na G12."

**Definition of done:** 3 widgety renderują się poprawnie, przycisk i QR są klikalne (mock, bez realnej integracji).

---

## 4. Backoffice — dashboard pracownika Tauron

**Główna narracja:** AI nie zastępuje konsultanta domenowego — daje mu narzędzia. Programista dostarcza narzędzia, pracownik zatwierdza prawdę.

### Feature B1: Historia rozmów (P0)

**User story:** Jako pracownik Tauron widzę wszystkie rozmowy klientów z AI, mogę je filtrować i przeglądać.

**MVP:** lista rozmów + podgląd konwersacji. Proste, bez filtrów.

---

### Feature B2: Edytor FAQ ("The FAQ") (P0)

**User story:** Jako pracownik dodaję/edytuję wpisy FAQ, a AI proponuje treść na podstawie rozmów klientów.

**MVP:** CRUD FAQ + przycisk "zaproponuj odpowiedź AI" (który woła LLM).

**Kluczowy punkt dla jury:** to pracownik zatwierdza prawdę, AI tylko sugeruje. Framing "human-in-the-loop".

---

### Feature B3: Knowledge base w czacie (P1)

**User story:** Jako pracownik pytam czat o rzeczy z wewnętrznej bazy wiedzy (regulaminy, procedury, taryfy) i dostaję odpowiedź z cytatami.

**Realistycznie:** to wymaga RAG. Jeśli Kuba nie ma czasu, ten feature wypada do P1/P2.

---

### Feature B4: Custom tools builder (P1)

**User story:** Jako pracownik tworzę prosty tool (np. kalkulator zapotrzebowania energii) bez programowania — definiuję formularz i wzór.

**MVP demo:** jeden gotowy tool pokazany jako przykład + UI "stwórz nowy tool" zamokowany (formularz istnieje, zapis nie działa).

**Dlaczego to jest wow:** pracownik domenowy tworzy narzędzia, których używa agent rozmawiający z klientem. Zamyka pętlę narracyjną.

---

### Feature B5: "Zgłoś problem do programistów" (P2)

**User story:** Jako pracownik klikam guzik "brakuje mi czegoś" i tworzę ticket dla zespołu IT, a AI pośredniczy w komunikacji.

**MVP:** sam przycisk + modal z formularzem. Bez backendu, bez realnego ticketu. Pokazuje wizję, nie działa.

---

## 5. Priorytety — zamknięty cykl

### P0 — MVP (musi działać na demo)

1. **Frontend Scenariusz 1** (dane + wykres + anomalia).
2. **Frontend Scenariusz 2** (pytanie o sprzęty → konkretna oszczędność).
3. **Frontend Scenariusz 3** (porównanie taryf + podpis mObywatelem mock).
4. **Backoffice B1** (historia rozmów).
5. **Backoffice B2** (edytor FAQ z AI-assist).
6. **Kontrakt JSON** agent ↔ frontend ustalony dnia 1.
7. **3 mockowane persony** klientów (bez PV / pompa ciepła / prosument).

### P1 — jeśli starczy czasu

1. **Backoffice B3** (knowledge base RAG w czacie pracownika).
2. **Backoffice B4** (custom tools builder — demo, nie edycja).
3. **Gwara śląska** jako toggle (wystarczy prompt do LLM).
4. **Landing scroll-driven** z wow-animacjami.

### P2 — męsko-chłopi (ostatnia godzina)

1. **Backoffice B5** (zgłoś problem do IT — sam guzik).
2. **Cross-sponsor layer** (AKMF security framing, ETHLegal compliance).
3. **Autonomiczny agent** (proaktywne alerty co wczoraj się stało).

---

## 6. Zależności i pierwsze kroki

**Mamy kilka godzin, nie kilka dni** — cały scope musi być doskonalony inkrementalnie, każda faza domknięta przed następną.

**Faza 0 — kick-off (wszyscy razem, ~30 min):**
1. Ustalamy kontrakt JSON agent ↔ frontend (`{ type, data }`).
2. Ustalamy listę mockowanych person klientów (JSON w repo).

**Faza 1 — szkielety równolegle:**
- **Rafal:** LangGraph z jednym nodem zwracającym fake JSON zgodny z kontraktem.
- **Cezary:** szkielet backoffice (Next.js + auth już jest) — routing, lista rozmów (B1).
- **Kuba:** szkielet chata + renderer komponentów z 1 placeholder widgetem.

**Faza 2 — Scenariusz 1 end-to-end:** SMS challenge + `ConsumptionTimeline` + follow-up. To jest pierwszy grający demo.

**Faza 3 — Scenariusze 2 i 3:** sugestie sprzętów + `TariffComparator` + `PdfAttachment` + podpis mObywatelem (mock).

**Faza 4 — Backoffice B2 (edytor FAQ z AI-assist) + polish + próba demo.**

---

## 7. Rozstrzygnięte decyzje

1. **Mock dane klienta:** hardcoded **JSON w repo**. Bez DB, bez seedów — nie ma znaczenia gdzie leży, prościej = lepiej.
2. **RAG:** **NIE robimy.** Za mało czasu. Wiedza domenowa wbita w prompty / statyczne dane. Jeśli jury zapyta — mówimy że to kolejny krok.
3. **PDF umowy:** **statyczny** plik w repo. Bez generowania.
4. **Landing page:** **P1**. Bez landingu da się obejść, więc nie blokuje demo — jeśli zostanie czas, dokładamy.
5. **Persony:** nie rozstrzygamy osobno — trzymamy się user stories z sekcji 3, persony wynikają ze scenariuszy (user bez PV na G11 → po stronie Scenariusza 3 widać też pompę ciepła → G13).
