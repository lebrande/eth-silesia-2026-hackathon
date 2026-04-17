# Backoffice AI – opis projektu biznesowego

> Kontekst: MVP budowane na hackathon **ETH Silesia 2026**. Zakres dobrany pod demo – priorytet: działający happy path + wizualny dashboard.

## 1. Czym jest produkt

**Backoffice AI** to SaaS-owy panel administracyjny dla firm, które używają naszego AI czata do obsługi klienta. Pracownicy firmy klienta (nie końcowy użytkownik czata) korzystają z panelu, żeby:

- monitorować rozmowy klientów z AI,
- wyłapywać pytania, na które AI nie odpowiedział lub odpowiedział słabo,
- aktualizować bazę wiedzy (FAQ / RAG), z której AI korzysta,
- obserwować kluczowe metryki jakości czata w czasie rzeczywistym.

Produkt zamyka pętlę: **AI rozmawia → widzimy gdzie się myli → człowiek uzupełnia wiedzę → AI odpowiada lepiej**.

## 2. Model biznesowy

- **Typ produktu:** SaaS, multi-tenant.
- **Produkt własny:** czat AI + backoffice są częścią jednego ekosystemu (nie integrujemy się z zewnętrznymi czatami typu Intercom/Tidio).
- **Izolacja danych:** każda firma-klient widzi wyłącznie własne rozmowy, FAQ i statystyki.
- **Workspace:** jedno konto użytkownika = jedna firma. Bez switchera workspace'ów na MVP.

## 3. Użytkownicy i role

Na MVP dwie role w obrębie workspace'u firmy:

| Rola      | Uprawnienia                                                                          |
| --------- | ------------------------------------------------------------------------------------ |
| **Admin** | Pełny dostęp: zarządzanie użytkownikami firmy, FAQ, przeglądanie rozmów, dashboard.  |
| **Agent** | Przeglądanie rozmów i listy problematycznych pytań, dodawanie/edycja FAQ, dashboard. |

Bez SSO na MVP – klasyczne logowanie przez NextAuth.

## 4. Zakres funkcjonalny MVP

### 4.1. Connector do bazy rozmów

- Backoffice łączy się z bazą, w której czat AI zapisuje rozmowy z klientami.
- Rozmowa = wątek wiadomości user ↔ AI wraz z metadanymi (czas, długość, czy AI użył „nie wiem”, czas odpowiedzi).

### 4.2. Wykrywanie „problematycznych pytań”

Pytanie trafia na listę problematycznych, gdy:

- **AI sam sygnalizuje niepewność** – odpowiedź zawiera flagę/frazę typu „nie wiem”, „nie mam tej informacji”, niski confidence.
- **Agent ręcznie oznaczy rozmowę/odpowiedź** jako wymagającą poprawy podczas przeglądu.

Agent pracuje głównie na **liście zagregowanych problematycznych pytań** (nie surowej liście rozmów). Brak funkcji przejmowania rozmowy (takeover) – tylko praca post-factum na bazie wiedzy.

### 4.3. Zarządzanie bazą wiedzy (FAQ / RAG)

Pod spodem baza RAG (na MVP **zmockowana** – interfejs + CRUD, bez realnego re-indexingu / embeddingów).

**Wpis FAQ zawiera pola:**

- `pytanie`
- `odpowiedź`
- `tagi` (multi)
- `kategoria`
- `język` (placeholder pod przyszłą wielojęzyczność – MVP tylko PL)
- `źródło` (opcjonalne – skąd pochodzi wiedza)

**Operacje na MVP:**

- Dodawanie nowego wpisu FAQ.
- Edycja istniejącego wpisu.
- Wyszukiwanie / filtrowanie po tagach i kategoriach.
- Skrót **„Dodaj to jako FAQ”** z poziomu problematycznego pytania – otwiera formularz z prefilowanym `pytanie` (z rozmowy) i pustą `odpowiedź` do uzupełnienia.

**Poza MVP (roadmap):** wersjonowanie wpisów (historia zmian), workflow review/approve, wielojęzyczność, automatyczny re-index RAG po zmianie.

### 4.4. Przegląd rozmów

- Agent może wyszukać i otworzyć konkretną rozmowę.
- W widoku rozmowy – pełna historia wiadomości, oznaczenia gdzie AI odpowiedział „nie wiem”.
- Możliwość ręcznego oznaczenia konkretnej odpowiedzi AI jako słabej → przenosi pytanie do listy problematycznych.

### 4.5. Dashboard (real-time + dummy dla demo)

Dashboard ładuje się z danych live, a dodatkowo dostarczamy zestaw dummy danych pod demo, żeby zawsze wyglądał „bogato”.

**KPI wyświetlane na MVP:**

- **Liczba rozmów** – widgety: dziś / ostatnie 7 dni / ostatnie 30 dni.
- **% pytań bez odpowiedzi** – udział pytań, na które AI powiedział „nie wiem”.
- **Deflection rate** – odsetek rozmów zakończonych bez eskalacji. Definicja na MVP: **rozmowa zeskalowana = AI powiedział „nie wiem” przynajmniej raz w trakcie rozmowy**.
- **Top 10 pytań bez odpowiedzi** – najczęściej zadawane pytania, na które AI nie umiał odpowiedzieć (klikalne → przejście do dodania FAQ).
- **Średni czas odpowiedzi AI**.
- **Wykresy w czasie** – trendy powyższych metryk (liniowe / słupkowe).

## 5. Typowy flow agenta

1. Logowanie do workspace'u firmy.
2. Rzut oka na dashboard – sprawdzenie KPI i trendów dnia.
3. Wejście w **Top 10 pytań bez odpowiedzi** lub w listę problematycznych pytań.
4. Wybór pytania → podgląd kontekstu rozmowy.
5. Kliknięcie **„Dodaj to jako FAQ”** → uzupełnienie odpowiedzi, tagów, kategorii → zapis.
6. (Opcjonalnie) Edycja istniejącego wpisu FAQ, jeśli temat już jest, ale odpowiedź była słaba.
7. Kontynuacja przeglądu kolejnych pytań.

## 6. Stack techniczny

- **Frontend / framework:** Next.js (App Router)
- **Auth:** NextAuth
- **Baza / backend:** Supabase (Postgres + RLS do izolacji tenantów)
- **UI:** shadcn/ui + Tailwind
- **Hosting demo:** Vercel
- **RAG:** mock na MVP (realna integracja poza scope hackathonu)

## 7. Założenia i ograniczenia MVP

- Wersja pokazowa – priorytet: happy path, ładne UI, płynne demo.
- Baza RAG mockowana – CRUD na FAQ działa, ale nie przebudowuje realnie indeksu wektorowego.
- Dashboard: logika live + fallback/uzupełnienie dummy danymi, żeby wykresy wyglądały reprezentatywnie.
- Brak takeover rozmów, brak multi-workspace per user, brak SSO, brak wersjonowania FAQ, brak wielojęzyczności – wszystko świadomie odłożone na post-MVP.
- Jeden język interfejsu i treści (PL) na demo.
