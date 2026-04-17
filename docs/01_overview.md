# ETHSilesia Hackathon — Brief dla Zespołu

**Data:** 2026-04-17
**Źródła:** Notion (`ethwarsaw.notion.site/ETHSilesia-Hackathon-Bounties`) + rozmowa z PKO.

---

## TL;DR

- **Główny target: PKO BP — bounty „PKO XP: Gaming”.** 3 wyzwania, wszystkie o gamifikacji.
- **60% oceny = pomysł + oryginalność**, tylko 10% = kompletność. Stawiamy na **silny koncept i prezentację**, nie na production-ready build.
- **Brak API/assetów** od PKO — budujemy szkielet, treści podłączą sami później.
- **Drugorzędni do rozważenia:** Tauron (AI + energia) i AKMF (cybersec dla e-mobywatela).

---

## 1. PKO BP — „PKO XP: Gaming” (priorytet #1)

3 sugerowane kierunki (mile widziane wyjście poza scope):

| # | Wyzwanie | O co chodzi |
|---|---|---|
| **1** | **Wiedza w krótkiej rundzie** | Edukacja w stylu TikToka — krótkie sesje, mocny progres, treści dosypywane przez ekspertów. |
| **2** | **Decyzje finansowe jako rozgrywka** | Symulator finansów: decyzja = ruch w grze, ryzyko/nagroda, długi horyzont. Target: dzieci (SKO), licealiści, dorośli. |
| **3** | **Onboarding stażysty jako kampania** | Pierwsze dni w korpo jak start RPG. Levele po działach, kultura, struktura, procedury. |

### Co usłyszeliśmy w rozmowie z PKO

- **Wybierz JEDNO z dwóch:** klient zewnętrzny (SKO/dzieci, licealiści, klienci dorośli — cyberbezpieczeństwo/fraudy) **lub** pracownik wewnętrzny (onboarding).
- **Onboarding był ich konkretnym przykładem** — gracz wchodzi do gry „naszpikowanej info o banku”, level po levelu poznaje strukturę.
- **Cyberbezpieczeństwo i fraudy** wymienione jako trzeci wartościowy obszar.
- **Brak API/FAQ/assetów** — *„dajcie pomysł, my go potem nakarmymy treścią”*.
- **Cel sponsora:** wybrać projekt, który zabiorą do dalszego rozwoju.
- **Komunikacja:** WhatsApp do Rafała (+48 889 930 616). PKO dośle dodatkowe info.

### Wymagania formalne (wszystkie 3 wyzwania)

- **Deliverable:** opis rozwiązania + materiał prezentacyjny (demo / makieta / wideo).
- **Tech stack:** brak ograniczeń.
- **Walidacja:** prezentacja przed jury.
- **Mentorzy:** Jakub Kaszuba, Michał Łopaciński, Kuba Kuśmierz.

### Kryteria oceny (identyczne dla wszystkich 3)

| Kryterium | Waga |
|---|---|
| Pomysł | 30% |
| Oryginalność | 30% |
| Związek z wyzwaniem | 20% |
| Kompletność projektu | 10% |
| Potencjał rozwoju | 10% |

### Nasza rekomendacja

1. **Flagowo: Challenge 3 (Onboarding)** — sponsor sam go najmocniej promował w rozmowie, jasny target, łatwy do uzasadnienia ROI.
2. **Plan B: Challenge 1 (krótka runda)** — najniższa bariera prototypowania.
3. **W prezentacji pokazać, że silnik mini-rund nadaje się też pod 2 pozostałe scenariusze** → wbija punkt „Potencjał rozwoju”.

---

## 2. Tauron — „AI Challenge” (drugi priorytet do rozważenia)

**Status w Notion:** „TBA”. Treść powyżej to nasze założenia robocze do potwierdzenia z organizatorem.

### Co wiemy / czego się spodziewamy
- Tauron to **dostawca energii** — oczekuje rozwiązań związanych z **energią + AI innovation**.
- **Kierunek do dalszego researchu:** dane o profilach zużycia energii. Możliwe są publiczne dane / API dotyczące taryf, godzin szczytu, miksu źródeł.

### Otwarty pomysł roboczy
- **AI + gamifikacja przesuwania zużycia energii** poza godziny szczytu. Aplikacja mobilna, która:
  - uczy się profilu zużycia gospodarstwa domowego,
  - sugeruje (i nagradza punktami / niższym rachunkiem) przesunięcie pralki/zmywarki/ładowania EV w okna o niższym obciążeniu sieci,
  - element społecznościowy: rankingi sąsiedzkie, „eco-streaki”.
- To jeden z otwartych pomysłów — wymaga researchu na temat realnych pain pointów Taurona, taryf, oraz tego co już mają wdrożone.

### TODO przed decyzją
- Research: oferta Taurona (taryfy dynamiczne? eLicznik?), publiczne API/dane, case studies energetycznej gamifikacji (Octopus, OhmConnect).
- Potwierdzić aktualny brief w Notion (czy „TBA” doprecyzowano) i kryteria oceny.

---

## 3. AKMF — „Secure infrastructure for web and mobile applications”

AKMF to firma stojąca m.in. za **aplikacją mObywatel** — **państwowy dostawca aplikacji krytycznych** dla obywateli. To zawęża profil oczekiwań, mimo że oficjalny brief jest krótki.

### Co wiemy z briefu
Ocena pod kątem **Security by Design**:
- poprawność autoryzacji (IAM),
- bezpieczne zarządzanie sekretami,
- odporność infrastruktury (serwery, kontenery, API) na **OWASP Top 10**,
- szyfrowanie danych,
- monitoring (szybka detekcja i blokowanie wycieków).

### Co dopowiadamy z kontekstu
- Ich domena to **aplikacje krytyczne dla państwa** → realne ryzyka: phishing pod państwowe usługi, podszywanie się pod aplikacje rządowe, kradzież tożsamości, fraudy na klientach mObywatela.
- **Mocne kąty pod ten bounty:**
  - PoC odpornej architektury logowania / wydania dokumentów elektronicznych z naciskiem na zero-trust;
  - mechanizm wykrywania fałszywych aplikacji udających mObywatela (sklepy, instalatory);
  - prototyp monitoringu / alertingu pod nietypowe wzorce dostępu;
  - bezpieczne sharing dokumentów (np. weryfikacja tożsamości peer-to-peer).
- **Brak twardych danych** od sponsora — założenia powyżej trzeba traktować jako naszą interpretację, nie jego ofertę.

### TODO przed decyzją
- Potwierdzić u organizatora / sponsora, czy oczekiwany jest produkt konsumencki, czy infrastrukturalny PoC.
- Sprawdzić publiczne dokumenty bezpieczeństwa mObywatela / API gov.

---

## 4. Pozostali sponsorzy (kontekst, niski priorytet)

| Sponsor | Track | Kluczowe |
|---|---|---|
| **ETHWarsaw × Kolektyw3** | Blockchain Challenge | Onchain coworking. Nagrody: 2000 / 1000 PLN + Kolektyw3 memberships. Wymaga **realnego sensu blockchainu** (odrzucają „just mint NFT”). |
| **Katowicki.hub** | Innovation | Otwarta kategoria — bold thinking, dowolny tech. |
| **ETHLegal & LegalTech** | Legal from Day One | Compliance/regulacje wbudowane od pierwszego commita; produkty Web3/AI. |

> **Możliwy double-dip:** projekt edukacyjny pod PKO + element onchain (np. SBT za ukończony moduł, on-chain attestation wiedzy) → kwalifikacja na PKO **i** Kolektyw3. Tylko jeśli blockchain ma realny sens.

---

## 5. Nasz stack i kompetencje zespołu

To, co realnie umiemy dowieźć w trakcie hackathonu — punkt wyjścia do łączenia w jeden pomysł.

### Role i specjalizacje

| Osoba | Specjalizacja | Co dowiezie |
|---|---|---|
| **Jakub** | Blockchain + AI agents | Smart kontrakty, integracja przez wallet, agenci AI |
| **Cezary** | Godot | Gra w Godocie, próba eksportu na **Canvas / HTML5** żeby wpiąć w webapp |
| **Rafał** | Web + AI | Landing page z efektem „wow”, agenci AI w **LangChainie**, sklejanie całości |

### Architektura docelowa (high-level)

- **Aplikacja webowa** jako jedno miejsce wejścia — wszystko dostępne z poziomu strony.
- **Wallet → blockchain** jako warstwa interakcji (smart kontrakty z realną funkcją, nie tylko ozdobnik).
- **Gra z Godota** osadzona w webie przez canvas/HTML5 export.
- **Agenci AI** (LangChain) jako warstwa łącząca: orkiestracja, decyzje, content generation.

### Wow-effecty do wykorzystania

- **Landing page z scroll-driven video** zrobionym modelami video-AI (np. **Seedance 2**) + **animacje 3D** sterowane scrollem. Cel: pierwsze wrażenie „nowoczesne, premium”.
- **Autonomiczny agent w stylu Open Claw / Nano Claw** (technologia agentowa) — cron uruchamiający dwie akcje:
  1. **Discovery** — agent zbiera dane z otoczenia / sieci,
  2. **Action** — agent działa na zebranych danych bez udziału człowieka.
  Demo autonomicznej pętli „dane → decyzja → akcja” dobrze gra na jury — pokazuje realne zastosowanie AI, nie tylko chatbota.

### Jak to spinać pod konkretne bounty

- **PKO Gaming** → gra Godot (Cezary) + smart kontrakt PKO XP (Jakub: SBT/punkty/leaderboard) + landing + AI agent generujący/dostarczający treści edukacyjne (Rafał).
- **Tauron AI** → autonomiczny agent (Open Claw-style) jako „energy advisor”: discovery danych zużycia → action: rekomendacja/automatyczne przesuwanie zużycia. Wpina się też w gamifikację z gry.
- **AKMF security** → trudne do połączenia z resztą, ale agent AI do detekcji fake-aplikacji / phishingu wpisuje się w nasz stack.
- **Kolektyw3 / Blockchain** → automatycznie zahaczamy, jeśli smart kontrakty mają realny sens (np. SBT za naukę, treasury w grze).

### Cel końcowy
**Połączyć powyższe komponenty w jeden spójny pomysł**, który punktuje pod 2–3 bounty naraz (PKO + Kolektyw3 + opcjonalnie Tauron lub Katowicki.hub Innovation).

---

## 6. Otwarte pytania do dopytania

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
