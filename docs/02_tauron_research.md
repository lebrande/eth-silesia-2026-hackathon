# Tauron — deep research + rekomendacja

**Data:** 2026-04-18
**Źródła:** oficjalny brief Tauron (Notion), strona Tauron + Tauron Dystrybucja, prasa branżowa, GitHub eLicznik scraper.

---

## 1. Oficjalny brief (wklejony przez PKO — w Notion ten blok nie renderował się przez WebFetch)

### Nagrody
- **1st:** 5000 PLN
- **2nd:** 3000 PLN
- **3rd:** 2000 PLN

### Overview
Broad AI challenge. Wszystko AI-powered jest mile widziane, ale **mocno faworyzowane** są rozwiązania dopięte do biznesu Tauron, potrzeb klientów i strategii długoterminowej. Link do strategii wskazany przez sponsora:
https://raport.tauron.pl/strategia-i-perspektywy/strategia-grupy-tauron-do-2030-r-cele-i-priorytety/

### 5 sugerowanych kierunków

| # | Kierunek | Konkrety z briefu |
|---|---|---|
| 1 | **Data Analysis** | zużycie energii, wzorce użycia, customer behavior, operational efficiency, forecasting/optimization |
| 2 | **Customer Service Innovation** | smart support tools, chatboty, personalizacja, automatyzacja rutyn, lepszy digital assist |
| 3 | **Energy Consumption Tools** | kalkulatory zużycia, smart estimates, **dynamic tariff guidance**, energy-saving recs, usage profiling |
| 4 | **Mobile App Enhancements** | personalized insights, proactive alerts, consumption prediction, intelligent assistant, lepsza nawigacja |
| 5 | **Advanced Chatbot** | context-aware, głębsze rozumienie intencji, multilingual, **chatbot w gwarze śląskiej** (explicit wow-effect!) |

### Kryteria jury (co cenią)
- practical business value
- clear use of AI
- relevance to TAURON's ecosystem
- user impact and usability
- originality and creativity
- feasibility of implementation

---

## 2. Kluczowe insighty ze strategii Tauron 2030

- **100% klientów z smart meterami do 2030.**
- **24/7 virtual contact center z cyfrowymi asystentami AI** — to dokładnie to, co budujemy → framing "prototyp ich wizji 2030".
- Kluczowe obszary strategii: **Dystrybucja, OZE, Ciepłownictwo, Klient**.
- Neutralność klimatyczna 2040. 25 mld zł inwestycji w regionie 2025-2035.
- Tauron już ma: **Wirtualny Asystent** (prosty chatbot na stronie), **Cyfrowy Asystent Finansowy** dla SMB.

---

## 3. Pain pointy klientów Tauron (realne, z researchu)

### Taryfy — nietrywialna decyzja
Pięć grup dla gospodarstw: G11, G12, G12w, G13, **G14 dynamic**.
- **G11** — flat, cała doba ta sama cena.
- **G12** — tańsza 22:00-6:00 + 13:00-15:00. Opłaca się przy ~30% zużycia nocnego.
- **G12w** — jak G12 + cały weekend tanio. Breakeven 30-50% pozaszczytu.
- **G13** — trzystrefowa. **Do 40% oszczędności dla pomp ciepła** (rekomendacja Polskiej Organizacji Rozwoju Technologii Pomp Ciepła).
- **G14 dynamic** — ceny z RDN giełdy, dzień wcześniej po 11:00.

Ceny 2026: G11 = 0,6485 zł/kWh; G12 dzień 0,6950 / noc 0,3500 zł/kWh.

### Prosumer chaos (2026)
- Od **2026-01-01** nowi prosumenci = obowiązkowe miesięczne rozliczenie.
- Od **2026-09-01** wszyscy prosumenci przechodzą na miesięczne.
- Net-billing: depozyt = **RCE × 1.23**. Korekty depozytów do końca marca 2026.
- **Vector method** na fazach → rozbieżność między liczbami na liczniku a fakturą (realna, masowa skarga).

### Koniec mrożenia cen
Od 2026-01-01 mrożenie cen zniesione → część klientów ma szok cenowy. "Dlaczego nagle więcej płacę?" → target pod AI wyjaśniający.

### eLicznik — dane dostępne
- **Rozdzielczość godzinowa**: zużycie + (dla prosumenta) generacja.
- Oficjalnie: tylko eksport do Excela. **Brak oficjalnego API.**
- Istnieje nieoficjalny scraper (GitHub: PiotrMachowski/Home-Assistant-custom-components-Tauron-AMIplus) — potwierdza, że community robi workaroundy → realna luka.

### Top skargi klientów (FAQ + opinie)
- Awarie i przerwy w dostawie.
- Błędne/wysokie faktury.
- Niedopłaty i nadpłaty.
- Pomyłki w blankietach wpłat.
- Problemy z logowaniem do eBOK.
- Prosument — rozbieżność licznik vs faktura.

---

## 4. Rekomendacja: "Mój Tauron AI"

**Idea:** wirtualny doradca energetyczny po zalogowaniu — nie generyczny chatbot, tylko asystent operujący na *Twoich* danych (mockowany backend).

### Trzy wyróżniki
1. **Kontekstowość z realnych (mockowanych) danych** — "patrzę na Twoje 12 ostatnich faktur i widzę…"
2. **Renderowanie komponentów zamiast ścian tekstu** — chat zwraca strukturyzowany JSON, frontend renderuje interaktywny widget.
3. **Gwara śląska jako toggle** — darmowy wow prosto z briefu.

### Zasada: wąsko i głęboko
3 scenariusze zrobione perfekcyjnie > szeroka powierzchowna demka. Jury widzi dziesiątki demek — zapamięta to, które *działa* i *rozumie branżę*.

---

## 5. Baza wiedzy (RAG) — 5 twardych tematów

Każdy to realny pain point z researchu, nie wymyślony.

| # | Temat | Dlaczego boli klienta |
|---|---|---|
| 1 | **Wybór taryfy G11/G12/G12w/G13/G14dynamic** | Nietrywialna decyzja, G13 daje do 40% oszczędności dla pomp ciepła, nikt tego nie tłumaczy |
| 2 | **Rozliczenia prosumenta (net-billing)** | RCE × 1.23, vector method, od 09/2026 miesięczne — chaos |
| 3 | **Anatomia faktury** | Klienci nie rozumieją składników (energia / dystrybucja / OZE / akcyza) |
| 4 | **Koniec mrożenia cen (01/2026)** | Realny szok cenowy, "dlaczego nagle więcej płacę" |
| 5 | **Kiedy zużywać prąd (TOU + dynamic)** | Przesunięcie pralki na 22-6 = 300+ PLN/rok realnej oszczędności |

Opcjonalnie: FAQ Tauron (scrape kategorii), strategia 2030, regulaminy.

---

## 6. Trzy widgety renderowane przez chat

Każdy osadzony w rozmowie, renderowany z tool-call response.

### `TariffSimulator`
Slider godzinami zużycia (dzień / noc / weekend) → natychmiast porównuje G11 vs G12 vs G12w vs G13 vs G14dynamic dla *profilu użytkownika*. Pokazuje breakeven i roczną różnicę w PLN. Klik → "przełącz taryfę" (mock).

### `ConsumptionTimeline`
12 miesięcy stacked bar (dzień/noc/weekend), highlight anomalii, forecast na kolejny miesiąc. Klik w kafelek → "co się wtedy stało?" (LLM wyjaśnia z kontekstu).

### `InvoiceBreakdown` / `PVSimulator`
Rozbicie faktury na 4 składniki + symulacja "co gdybym miał 6 kWp fotowoltaiki → oszczędność X PLN, zwrot Y lat" na bazie realnej historii zużycia.

Wszystkie trzy można zbudować w tydzień — dane mockowane, logika kalkulacji publiczna (URE, Tauron).

---

## 7. Cross-sponsor — co ma sens

| Sponsor | Ocena | Hook |
|---|---|---|
| **AKMF (Security)** | ✅ mocny | Profil godzinowy zużycia = dane wrażliwe (widać kiedy nikogo nie ma w domu → ryzyko włamania). Security by Design dla AI + API (auth, szyfrowanie, audit log, rate limit, OWASP API Top 10). Framing: "dane energetyczne to nowe dane lokalizacyjne". |
| **ETHLegal** | ✅ tani hak | GDPR dla danych energetycznych + EU AI Act (energy = high-risk sector). Compliance layer: consent flow, data retention, explainability LLM decisions. |
| **Kolektyw3 (Blockchain)** | ⚠️ tylko z uzasadnieniem | Sens ma: rozliczenie prosumenta on-chain (smart contract zamiast RCE×1.23 w Excelu) albo certyfikaty pochodzenia zielonej energii. Kolektyw3 odrzuca ozdobniki — jeśli nie uzasadnimy *dlaczego to musi być onchain*, odpuszczamy. |
| **Katowicki.hub** | ✅ otwarte | Zawsze łapie przy dobrym wykonaniu. |

---

## 8. Otwarte decyzje

1. **Zakres bounty:** tylko Tauron (maksymalna głębia) czy Tauron + AKMF + Legal (security i legal jako warstwy nad tą samą aplikacją)?
2. **Blockchain:** wejść z prosumer-settlement on-chain, czy odpuścić Kolektyw3?
3. **Gwara śląska:** LLM z promptem, czy lekki fine-tune/LoRA? (prompt wystarczy do demo)
4. **Mockowany backend:** ile userów przygotować? Co najmniej 3 persony: (a) klient bez PV na G11, (b) klient z pompą ciepła na G13, (c) prosument z fotowoltaiką.

---

## 9. Źródła

- [Strategia Grupy TAURON do 2030](https://raport.tauron.pl/strategia-i-perspektywy/strategia-grupy-tauron-do-2030-r-cele-i-priorytety/)
- [eLicznik TAURON](https://www.tauron-dystrybucja.pl/liczniki-zdalnego-odczytu/elicznik)
- [Unofficial eLicznik API (GitHub)](https://github.com/PiotrMachowski/Home-Assistant-custom-components-Tauron-AMIplus)
- [Taryfy G11/G12/G12w 2026](http://cena-pradu.pl/taryfy.html)
- [Taryfy dynamiczne Tauron](https://opalzgory.pl/taryfy-dynamiczne-pradu-w-tauron-przewodnik-energetyczny/)
- [Net-billing prosumentów 2026](https://globenergia.pl/juz-niedlugo-rozliczenie-tylko-miesieczne-co-to-oznacza-dla-prosumentow-w-net-meteringu/)
- [G13 dla pomp ciepła](https://globenergia.pl/specjalna-taryfa-energetyczna-dla-pomp-ciepla-dlaczego-jest-potrzebna/)
- [Koniec mrożenia cen 01/2026](https://www.tauron.pl/koniec-mrozenia-cen)
- [Cyfrowy Asystent Finansowy Tauron](https://media.tauron.pl/pr/538193/cyfrowy-asystent-finansowy-od-taurona-pomoze-przedsiebiorcom)
- [Wirtualny Asystent Tauron](https://www.tauron.pl/dla-domu/obsluga-klienta)
- [FAQ Tauron](https://www.tauron.pl/dla-domu/obsluga-i-pomoc/najczesciej-zadawane-pytania)
