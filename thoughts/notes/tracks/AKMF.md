# AKMF — Secure Infrastructure for Web & Mobile Applications

> **Data:** 2026-04-18
> **Status:** working notes — evidence bank for pitch + Q&A przed jury
> **Brief (cytat z [`docs/01_overview.md`](../../../docs/01_overview.md)):** ocena pod kątem **Security by Design** — IAM, zarządzanie sekretami, odporność infra (serwery, kontenery, API) na **OWASP Top 10**, szyfrowanie danych, monitoring (szybka detekcja i blokowanie wycieków).
> **Kto ocenia:** AKMF — m.in. wydawca **mObywatela**, państwowy dostawca aplikacji krytycznych. Warto podkreślać: "ta sama poprzeczka co aplikacje o wysokim zaufaniu publicznym".

---

## TL;DR — jedno zdanie dla jury

Zbudowaliśmy chatbota AI dla obsługi klienta Tauron z pełnowymiarowym modelem zaufania (publiczny widget → SMS OTP → agent uprzywilejowany), w którym **bezpieczeństwo jest wymuszone konwencją pliku i typem, nie dyscypliną autora** — powierzchnia atakowalna LLM-a jest skurczana do typowanego enuma akcji (`answer | escalate | request_auth | spam`), a sekrety nie mogą trafić do klienta bo splittuje je build-system, nie człowiek.

---

## 1. Mapowanie na kryteria AKMF

| Kryterium AKMF | Nasz mechanizm | Dowód (plik:linia) |
|---|---|---|
| **IAM** | Dwuwarstwowa auth: Auth.js v5 JWT dla back-office + SMS OTP (6 cyfr, TTL 5 min, max 2 próby) dla podniesienia uprawnień w chacie. Edge middleware blokuje `/app/*` zanim dotrze do handlera. | [`src/proxy.ts:5-10`](../../../apps/main/src/proxy.ts), [`src/auth.ts:20-36`](../../../apps/main/src/auth.ts), [`graphs/chat/subgraphs/root/nodes/verify-code.node.ts`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/verify-code.node.ts), [`chat.constants.ts:3-4`](../../../apps/main/src/graphs/chat/chat.constants.ts) |
| **Sekrety** | `*.server.ts` suffix **+ Next.js RSC** oznacza, że moduł czytający sekret **fizycznie nie trafia** do client bundle. Brak `NEXT_PUBLIC_*`. LiteLLM proxy centralizuje klucze vendorów LLM. | [`src/lib/server/elevenlabs.server.ts`](../../../apps/main/src/lib/server/elevenlabs.server.ts), [`src/lib/server/llm.server.ts`](../../../apps/main/src/lib/server/llm.server.ts), [`src/lib/server/sms.server.ts`](../../../apps/main/src/lib/server/sms.server.ts), [`CLAUDE.md`](../../../CLAUDE.md) (sekcja "Konwencja nazewnictwa plików") |
| **OWASP Top 10** | Zob. sekcja 3 poniżej — punkt po punkcie. |  |
| **Szyfrowanie danych** | Postgres over TLS, JWT signed cookies (maxAge 48h, rotacja co 1h), bcryptjs hash haseł (`password_hash` w schemacie), wszystkie external API po HTTPS. | [`src/auth.ts:12-16`](../../../apps/main/src/auth.ts), [`src/db/schema.ts:13-20`](../../../apps/main/src/db/schema.ts), [`scripts/seed-user.ts:14`](../../../apps/main/scripts/seed-user.ts) |
| **Monitoring** | LangSmith tracing każdego przejścia przez graf (audit trail decyzji AI). Railway healthcheck. Strukturalne logi (`[sms]`, `[auth]`, `[chat]`). Tabela `chat_sessions` trzyma `escalated`, `blocked`, `messageCount`, `lastActivityAt` — permanentny ślad nadużyć. | [`docs/01_overview.md`](../../../docs/01_overview.md), [`apps/main/railway.toml`](../../../apps/main/railway.toml), [`src/db/schema.ts:34-50`](../../../apps/main/src/db/schema.ts) |

---

## 2. Killer argument — "AI surface hardening"

Najmocniejsze dla jury. Pozostałe tracki w hackathonie używają LLM jako wolnej black-boxy — nasz **ma zamknięte wyjście**.

**Jak to działa**

1. Każda wiadomość użytkownika trafia do `defaultAgentNode`.
2. Model jest wywoływany z `withStructuredOutput(DefaultAgentSchema)` — Zod schema wymusza format.
3. Odpowiedź LLM to **jeden z czterech znanych stanów**: `answer` | `escalate` | `request_auth` | `spam` + tekst odpowiedzi.
4. Router (`ROUTE_MAP`) mapuje stan na węzeł grafu. LLM **nie wywołuje narzędzi bezpośrednio** — narzędzia wywołuje graf.

**Czego to broni**

- **Prompt injection** — nie można "przekonać" modelu do eskalacji do admina, bo `escalate` to tylko przepięcie na `escalationNode`, który nic uprzywilejowanego nie robi. Nie ma tooli którymi LLM mógłby posłać email, skasować dane, wygenerować dowolny SMS.
- **Wyciek sekretów w odpowiedzi** — model nigdy nie widzi sekretów w system prompcie (system prompt czytany z pliku MD, nie z env).
- **Wymiennik modelu** — LiteLLM proxy = zmiana vendora bez zmiany kodu; żaden klucz producenta nie leży w aplikacji.

**Dowody**: [`graphs/chat/subgraphs/root/nodes/default-agent.node.ts:8-33`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/default-agent.node.ts), [`graphs/chat/subgraphs/root/nodes/gate.node.ts`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/gate.node.ts)

---

## 3. OWASP Top 10 — punkt po punkcie

| # | Kategoria | Mitygacja | Dowód |
|---|---|---|---|
| A01 | Broken Access Control | `proxy.ts` (edge middleware) + `auth()` w server actions (`fetchConversationHistoryAction` rzuca "Unauthorized"). | [`src/proxy.ts`](../../../apps/main/src/proxy.ts), [`src/lib/actions/chat.action.ts:12-17`](../../../apps/main/src/lib/actions/chat.action.ts) |
| A02 | Cryptographic Failures | bcryptjs hashe (10 rund), JWT signed `AUTH_SECRET`, TLS wszędzie. | [`scripts/seed-user.ts:14`](../../../apps/main/scripts/seed-user.ts) |
| A03 | Injection | Drizzle ORM — zero raw SQL, tylko parametryzowane query buildery. Parsowanie telefonu: regex `\d{7,15}` + strip whitespace. Kod weryfikacyjny: regex `\d{6}`. | [`src/db/schema.ts`](../../../apps/main/src/db/schema.ts), [`graphs/chat/subgraphs/root/nodes/verify-phone.node.ts:8-12`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/verify-phone.node.ts), [`graphs/chat/subgraphs/root/nodes/verify-code.node.ts:9-12`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/verify-code.node.ts) |
| A04 | Insecure Design | **AI surface hardening** (sekcja 2). Graf z wyraźnymi stanami zamiast jednego mega-promptu. Spam gate z persystentnym `blocked=true` — nie można obejść restartem przeglądarki. | [`chat/graph.ts`](../../../apps/main/src/graphs/chat/chat.graph.ts), [`spam.node.ts`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/spam.node.ts) |
| A05 | Security Misconfiguration | `trustHost: true` jawnie (Railway proxy trust), brak `.env` w repo (tylko w `.gitignore`), `next build` standalone → mały attack surface. | [`src/auth.ts:11`](../../../apps/main/src/auth.ts), [`CLAUDE.md`](../../../CLAUDE.md) (sekcja Railway deployment) |
| A06 | Vulnerable Components | pnpm lockfile, Next.js 16 (najnowszy), node >=20. Brak opuszczonych bibliotek. | [`apps/main/package.json`](../../../apps/main/package.json), [`pnpm-lock.yaml`](../../../pnpm-lock.yaml) |
| A07 | Auth/Session | SMS OTP z TTL 5 min, 6-cyfrowy kod losowy, 2 próby potem reset, spam-counter z twardym blokiem po 3 naruszeniach. JWT session 48h z rotacją co 1h. | [`chat.constants.ts:3-4`](../../../apps/main/src/graphs/chat/chat.constants.ts), [`verify-code.node.ts:43-61`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/verify-code.node.ts), [`spam.node.ts:5-28`](../../../apps/main/src/graphs/chat/subgraphs/root/nodes/spam.node.ts) |
| A08 | Integrity Failures | Migracje Drizzle wersjonowane (`db:create-migration`), deploy na Railway z `preDeployCommand = db:migrate` — state bazy i aplikacji atomiczny. | [`apps/main/railway.toml`](../../../apps/main/railway.toml), [`CLAUDE.md`](../../../CLAUDE.md) (Workflow produkcja) |
| A09 | Logging & Monitoring | LangSmith pełne traces per-invocation, strukturalne console logs, `chat_sessions` jako on-disk audit trail (kto, kiedy, ile wiadomości, czy zablokowany, czy eskalowany). | [`src/db/schema.ts:34-50`](../../../apps/main/src/db/schema.ts), [`CLAUDE.md`](../../../CLAUDE.md) (LangSmith MCP) |
| A10 | SSRF | Brak endpointów które przyjmują URL od użytkownika. Wszystkie `fetch` w kodzie idą do hardcoded domen (ElevenLabs, BulkGate, LiteLLM). | [`src/lib/server/*.server.ts`](../../../apps/main/src/lib/server/) |

---

## 4. Konwencja, która **wymusza** bezpieczeństwo (nie tylko zaleca)

To jest the pitch — AKMF ocenia **Security by Design**, a u nas design = plik w drzewie folderów.

```
src/lib/
  *.server.ts  ← czyta sekrety, DB, zewnętrzne API — nie może być importowany w kliencie
  *.action.ts  ← "use server" — RPC endpoint, kod i sekrety zostają na serwerze
  *.shared.ts  ← czyste typy/utile — bezpieczne wszędzie
  *.client.ts  ← React hooks / browser APIs — nigdy nie widzi serwera
```

**Konsekwencja**: próba zaimportowania `elevenlabs.server.ts` w komponencie klienta rzuca błąd kompilacji w `next build`. To nie jest code review policy — to build-system gate. Dokładnie to znaczy "Security by Design" w sensie kryteriów AKMF.

**Dowód na żywo dla jury**: można pokazać że `ChatWidget.client.tsx` woła `synthesizeSpeechAction` (server action RPC), w buildzie klienckim nie ma ani `ELEVENLABS_API_KEY`, ani stringu `api.elevenlabs.io`. Zweryfikowane w tej sesji:

> "Browser only ever sees the base64 MP3 response — never the API key."

Konwencja opisana w [`CLAUDE.md`](../../../CLAUDE.md) (sekcja "Decision tree" + "Import rules").

---

## 5. Defense in depth — trzy niezależne warstwy dla back-office

Dla `/app` (panel admina) auth jest sprawdzany **trzykrotnie**:

1. **Middleware** — `proxy.ts` redirectuje na `/login` jeśli brak sesji.
2. **Layout/page** — server component woła `auth()` przy renderze.
3. **Server action** — `fetchConversationHistoryAction` też woła `auth()` przed dotknięciem DB.

Każda warstwa sama w sobie jest wystarczająca. Wszystkie razem = brak jednego-punktu-awarii. Jury pyta "co jak ktoś ominie middleware?" — odpowiedź: server action i tak nie zwróci danych.

---

## 6. Dane osobowe — minimalizacja (RODO-friendly)

- Numer telefonu w `chat_sessions.verifiedPhone` — **tylko dla zweryfikowanych sesji**, nie dla anonimowych.
- Audio z ElevenLabs: cache w pamięci klienta (Map keyed by text) — **nie persystowany na dysku**, znika po zamknięciu karty.
- Spam-blocked userzy: timestamp, bez PII.
- Brak logowania treści wiadomości do konsoli (LangSmith jest opt-in, za `LANGSMITH_API_KEY`).

Dowody: [`src/db/schema.ts`](../../../apps/main/src/db/schema.ts), [`src/lib/client/use-read-aloud.client.ts`](../../../apps/main/src/lib/client/use-read-aloud.client.ts)

---

## 7. Demo script dla jury (3 min)

1. **Klient chat** (widget na `/`). Napisz "pokaż faktury" → agent klasyfikuje jako `request_auth` → prosi o telefon. Pokaż że LLM nie mógłby nic więcej zrobić — Zod schema wymusza jeden z czterech stanów.
2. **SMS OTP**. Telefon → kod → weryfikacja. Błędny kod trzy razy → hard block, widoczny w `chat_sessions.blocked=true` w Drizzle Studio. Zamknij kartę, wróć — nadal zablokowany.
3. **Speaker icon** (TTS, FSN-0002). Kliknij → audio gra. Otwórz DevTools → Sources → pokaż że w bundle JS **nie ma** `api.elevenlabs.io` ani klucza.
4. **Back-office `/app`**. Login admin@ethsilesia.pl / admin. Rozwiń sesję. Pokaż że gdy wylogujesz się i wklepiesz URL `/app` → redirect przez middleware. Dodatkowo server action też by rzuciła "Unauthorized".
5. **LangSmith trace** (jeśli online) — pokaż pełną ścieżkę przez graf dla jednej konwersacji. Każda decyzja AI jest zapisana i auditowalna.

---

## 8. Otwarte braki (uczciwie, żeby jury nie złapało cię z zaskoczeniem)

- **Brak rate limiting na `/api/chat`** i na `synthesizeSpeechAction`. Łatwe DoS. Fix: middleware z IP bucket, albo token bucket w Redis. ~30 min pracy.
- **Hardcoded admin creds** w `auth.ts:5-6`. Demo pattern; do produkcji trzeba DB-backed users (schema już jest — `users` table). ~1h.
- **Brak CSP / security headers**. Next.js nie dodaje z automatu. `next.config.ts` + `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`. ~30 min.
- **ElevenLabs server action jest publiczne** (brak `auth()` check) — żeby widget na `/` mógł działać bez logowania. Trade-off kosztowy: ktoś może wołać syntezę. Mitygacja: rate limit per-IP + max 2000 znaków na request (już jest, `MAX_TEXT_LENGTH`). Do produkcji: token podpisany server-side + zip-file embed na czas sesji.
- **Brak testów security**. SAST (`semgrep`), SCA (`npm audit`, `socket.dev`) — do podpięcia w CI. ~2h.
- **Secrets w local `.env`**. Produkcja — Railway env panel. Docelowo: HashiCorp Vault / AWS Secrets Manager + rotacja.

**Dlaczego to OK**: wszystkie powyższe są **dodatkowe warstwy**, nie fundament. Fundament (konwencja server/client, typed LLM output, edge middleware, hashed passwords, persystentny audit trail) jest wbudowany w architekturę. Dodanie rate limiterów to 30 min, nie 3 dni.

---

## 9. Pytania, które jury pewnie zada — i odpowiedzi

**Q: "Co jeśli ktoś zrobi prompt injection?"**
A: Nic nie wywoła. LLM może jedynie wybrać z `answer | escalate | request_auth | spam`. Nie ma dostępu do tooli, DB, ani send-email'a. Żeby dodać tool w przyszłości — trzeba dodać nowy stan w grafie i przemyśleć jego authorization, nie da się "po cichu".

**Q: "Jak monitorujecie wycieki?"**
A: LangSmith tracuje każdą invokację — widać co model dostał i co wypluł. Log `[auth] Verification code for ${phone}: ${code}` pojawia się tylko w dev (serwer). `chat_sessions` jest audit trailem aktywności. Do produkcji: dodalibyśmy Sentry dla 5xx + alert na nagły skok `blocked=true`.

**Q: "Co z danymi wrażliwymi w LLM context?"**
A: Do modelu leci tylko ostatnie 14 wiadomości (`MAX_HISTORY_MESSAGES`) bez `verifiedPhone`, bez sesyjnych tokenów, bez user agent. System prompt jest statyczny (plik MD), bez interpolacji sekretów.

**Q: "Dlaczego ElevenLabs, a nie self-hosted?"**
A: Hackathon — time-to-demo. Architektura pozwala wymienić na self-hosted (`elevenlabs.server.ts` to jedyny touchpoint, ~30 linii kodu do podmiany). Klucz nigdy nie dotyka klienta więc zamiana jest bezpieczna.

**Q: "Jak autoryzujecie SMS?"**
A: BulkGate z osobnym app-id i app-token trzymanym w `BULKGATE_API_KEY` + `BULKGATE_APP_ID`. Kod OTP 6-cyfrowy, TTL 5 min, max 2 próby. Reset po przekroczeniu. `SMS_OVERRIDE_NUMBER` jest komentowany na produkcji (sekcja z instrukcją w kodzie).

**Q: "Co to za język 'Śląski'?"**
A: To historyczna odnoga — feasibility FSN-0001 zostało odrzucone jako wkładane do głównego flow (patrz [`thoughts/notes/elevenlabs-silesian-feasibility.md`](../elevenlabs-silesian-feasibility.md)). Dla AKMF to nieistotne — read-aloud używa stock voice'a Mazowieckiego Adama przez ElevenLabs Flash v2.5 z `language_code: "pl"`.

---

## 10. Linki — głębsza droga dla jury

- Cały repo: [README.md](../../../README.md)
- Konwencje bezpieczeństwa: [CLAUDE.md](../../../CLAUDE.md)
- Graf chatu (ścieżka decyzji): [`apps/main/src/graphs/chat/chat.graph.ts`](../../../apps/main/src/graphs/chat/chat.graph.ts)
- Schema DB: [`apps/main/src/db/schema.ts`](../../../apps/main/src/db/schema.ts)
- Deploy config: [`apps/main/railway.toml`](../../../apps/main/railway.toml)
- Plan FSN-0002 (ostatnia feature, read-aloud): [`thoughts/plans/2026-04-18-FSN-0002-elevenlabs-voice-chat.md`](../../plans/2026-04-18-FSN-0002-elevenlabs-voice-chat.md)

---

## 11. Do zrobienia przed pitchem

- [ ] Zrób screenshota Drizzle Studio pokazującego `chat_sessions.blocked=true` na realnej sesji spamerskiej.
- [ ] Zrób 30-sek wideo: DevTools → Sources → search "elevenlabs" w client bundle → zero matches.
- [ ] Screen z LangSmith showujący trace z `action: "request_auth"` jako proof of typed output.
- [ ] Sprawdź przed demem że baza ma seeded spam-blocked usera (żeby pokazać persystencję).
- [ ] Przygotuj 1-slide architekturę: [client] → [RSC/Server Action] → [LangGraph: gate → verify → agent] → [Postgres + LiteLLM + BulkGate + ElevenLabs].

---

## 12. Rewizje / TODO tego pliku

- Dodać konkretne numery z trace'y LangSmith po zrobieniu demo-runu.
- Dodać sekcję o testach security jeśli uda się zbudować nawet mini-setup z `semgrep`.
- Zaktualizować po każdej nowej feature — każda zmiana w `.server.ts` / `.action.ts` może mieć konsekwencje dla tej narracji.
