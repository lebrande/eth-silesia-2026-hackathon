# ETHSilesia Hackathon — Podsumowanie

**Data:** 2026-04-17
**Źródła:** Notion (`ethwarsaw.notion.site/ETHSilesia-Hackathon-Bounties`) + rozmowa z PKO.

---

## 1. PKO BP — „PKO XP: Gaming”

### Ustalenia z rozmowy z PKO (fakty)

- Wybór **JEDNEGO** kierunku: klient zewnętrzny **albo** pracownik wewnętrzny.
- Klient zewnętrzny = trzy potencjalne grupy: **SKO/dzieci**, **licealiści**, **klienci dorośli** (kontekst: cyberbezpieczeństwo / fraudy).
- Pracownik wewnętrzny = **onboarding stażysty** — konkretny przykład podany przez PKO: gracz wchodzi do gry „naszpikowanej info o banku”, level po levelu poznaje strukturę/kulturę/procedury.
- **Cyberbezpieczeństwo i fraudy** wskazane jako trzeci wartościowy obszar.
- **PKO nie daje API / FAQ / assetów.** Zacytowane: *„dajcie pomysł, my go potem nakarmymy treścią”*.
- **Cel sponsora:** wybrać projekt, który zabiorą do dalszego rozwoju u siebie.
- PKO dośle dodatkowe info kanałem WhatsApp.

### 3 oficjalne kierunki wyzwania

| # | Wyzwanie | O co chodzi |
|---|---|---|
| 1 | **Wiedza w krótkiej rundzie** | Edukacja w stylu TikToka — krótkie sesje, progres, treści dosypywane przez ekspertów. |
| 2 | **Decyzje finansowe jako rozgrywka** | Symulator finansów: decyzja = ruch w grze, ryzyko/nagroda, długi horyzont. Target: dzieci (SKO), licealiści, dorośli. |
| 3 | **Onboarding stażysty jako kampania** | Pierwsze dni w korpo jak start RPG. Levele po działach, kultura, struktura, procedury. |

Mile widziane wyjście poza scope.

### Wymagania formalne

- **Deliverable:** opis rozwiązania + materiał prezentacyjny (demo / makieta / wideo).
- **Tech stack:** brak ograniczeń.
- **Walidacja:** prezentacja przed jury.
- **Mentorzy:** Jakub Kaszuba, Michał Łopaciński, Kuba Kuśmierz.

### Kryteria oceny (identyczne dla wszystkich 3 kierunków)

| Kryterium | Waga |
|---|---|
| Pomysł | 30% |
| Oryginalność | 30% |
| Związek z wyzwaniem | 20% |
| Kompletność projektu | 10% |
| Potencjał rozwoju | 10% |

---

## 2. Tauron — „AI Challenge”

**Status briefu w Notion:** „TBA”. Poniższe to robocze założenia do potwierdzenia z organizatorem.

- Tauron = dostawca energii → oczekiwane rozwiązania w obszarze **energia + AI**.
- Potencjalne źródła danych do researchu: profile zużycia energii, taryfy dynamiczne, godziny szczytu, miks źródeł, eLicznik.
- Kryteria oceny, mentorzy, deliverables: **brak potwierdzenia**.

**Do potwierdzenia przed decyzją:** aktualny brief w Notion, kryteria, dostępne API/dane, co Tauron już ma wdrożone.

---

## 3. AKMF — „Secure infrastructure for web and mobile applications”

AKMF stoi m.in. za aplikacją **mObywatel** (państwowy dostawca aplikacji krytycznych).

### Co wiemy z briefu

Ocena pod kątem **Security by Design**:
- poprawność autoryzacji (IAM),
- bezpieczne zarządzanie sekretami,
- odporność infrastruktury (serwery, kontenery, API) na **OWASP Top 10**,
- szyfrowanie danych,
- monitoring (szybka detekcja i blokowanie wycieków).

**Do potwierdzenia u organizatora:** czy oczekiwany jest produkt konsumencki, czy infrastrukturalny PoC; preferowane scenariusze ataku; dostępne publiczne dokumenty/API.

---

## 4. Pozostali sponsorzy

| Sponsor | Track | Kluczowe |
|---|---|---|
| **ETHWarsaw × Kolektyw3** | Blockchain Challenge | Onchain coworking. Nagrody: 2000 / 1000 PLN + Kolektyw3 memberships. Wymaga realnego sensu blockchainu (odrzucają „just mint NFT”). |
| **Katowicki.hub** | Innovation | Otwarta kategoria — bold thinking, dowolny tech. |
| **ETHLegal & LegalTech** | Legal from Day One | Compliance/regulacje wbudowane od pierwszego commita; produkty Web3/AI. |

Uwaga: kwalifikacja pod wiele bounty jednocześnie jest dozwolona, o ile każdy element ma realny sens (np. blockchain nie jako ozdobnik).

---

## 5. Zespół i stack

| Osoba | Specjalizacja | Co dowiezie |
|---|---|---|
| **Jakub** | Blockchain + AI agents | Smart kontrakty, integracja przez wallet, agenci AI |
| **Cezary** | Godot | Gra w Godocie, eksport na **Canvas / HTML5** do osadzenia w webapp |
| **Rafał** | Web + AI | Landing page, agenci AI w **LangChainie**, sklejanie całości |

### Architektura (high-level)

- **Webapp** jako jedno miejsce wejścia.
- **Wallet → blockchain** jako warstwa interakcji (smart kontrakty z realną funkcją).
- **Gra z Godota** osadzona w webie przez canvas/HTML5 export.
- **Agenci AI (LangChain)** jako warstwa orkiestracji, decyzji, generowania treści.

### Dostępne wow-effecty

- **Landing z scroll-driven video** (np. Seedance 2) + animacje 3D sterowane scrollem.
- **Autonomiczny agent (Open Claw / Nano Claw style)** — cron z dwoma fazami:
  1. **Discovery** — agent zbiera dane z otoczenia / sieci,
  2. **Action** — agent działa na zebranych danych bez udziału człowieka.

---

## 6. Otwarte pytania

**Do PKO (WhatsApp):**
- Preferowany target: B2C (klient), B2B (pracownik), czy SKO (dzieci)?
- Czy rozwiązanie ma docelowo żyć w IKO / portalu pracownika, czy może być standalone?
- Czy mogą udostępnić sample treści (zakres onboardingu, lista produktów do edukacji)?

**Do Taurona / organizatora:**
- Czy „TBA” w Notion już doprecyzowano? Brief, kryteria oceny, mentorzy?
- Czy są publiczne dane / API, do których można się podpiąć?

**Do AKMF / organizatora:**
- Oczekiwany format: PoC infrastrukturalny czy produkt konsumencki?
- Czy mają preferowane scenariusze ataku, pod które warto budować obronę?
