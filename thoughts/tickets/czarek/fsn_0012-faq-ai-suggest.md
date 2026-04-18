# Inline "Suggest AI answer" on FAQ form (B2)

**Priority:** P0 (polish — closes a B2 gap)
**Track:** czarek

## Why

FAQ CRUD already exists (`/app/faq`, `/app/faq/new`, `/app/faq/[id]`). AI-assist works in `/app/assistant` — but it requires copy-paste between two windows. A TAURON employee who clicked "add to FAQ" from `/app/problems` loses their rhythm when they have to switch contexts.

## Scope

### UI changes

- `apps/main/src/app/(authenticated)/app/faq/new/page.tsx` and `[id]/page.tsx`:
  - Add a "Suggest AI answer" button next to the `answer` textarea.
  - When the URL contains `?threadId=xxx` the button pulls the last user message of that thread for context (reuse `fetchConversationHistoryAction`).
  - Without `threadId` — relies solely on the form's `question` field.
  - Click → loading state → response populated into the `answer` textarea.
  - Employee can still edit before saving.

### Server action

- New `apps/main/src/lib/actions/faq-suggest.action.ts`:
  - Signature: `suggestFaqAnswerAction({ question: string, threadContext?: string }): Promise<{ suggestion: string }>`.
  - Calls the LLM (`llm.server.ts`) with a prompt along the lines of "You are a TAURON expert. Write a FAQ-style answer (~120 words, neutral tone, Polish). Use the context if provided."
  - Returns plain text (no markdown).

### Link from `/app/problems`

- In `/app/(authenticated)/app/problems/page.tsx` — the existing "add to FAQ" button:
  - Updated link: `/app/faq/new?question=...&threadId=<thread>` (currently only `question`).
  - Auto-prefill question (already present) + the AI-suggest button now has context.

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] `pnpm -F main lint` passes.
- [ ] Manual: open `/app/problems`, click "add to FAQ" on an escalated question → `/app/faq/new?question=...&threadId=...` shows the pre-filled question.
- [ ] Click "Suggest AI answer" → loading → `answer` textarea populated (~100 words, Polish).
- [ ] Employee can edit and save — the existing save flow still works.

## Implementation notes

- No new DB tables.
- `threadId` is optional — the feature works without it, just with thinner context.
- The prompt must explicitly instruct "do not hallucinate — if the question is out of scope, answer with 'Please escalate to a consultant'". The employee reviews before saving anyway.
- Keep `requireUser()` in the server action — only authenticated users can call it.
- The button is disabled while `question.length < 10`.

## Out of scope

- Auto-deriving the question from the thread (nice, but not P0).
- Streaming the response (a single full response is fine).
- Using other FAQ entries as context (that is FSN-0013's job).
- Answer-length validation (it is a suggestion, the employee decides).
