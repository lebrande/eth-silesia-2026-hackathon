# Human-in-the-Loop (HITL)

## Contents

- [Basic pattern](#basic-pattern)
- [Structured HITL pattern](#structured-hitl-pattern)
- [Universal requestHITL node](#universal-requesthitl-node)
- [Persistence with Interrupts collection](#persistence-with-interrupts-collection)

## Basic pattern

```typescript
import { interrupt } from "@langchain/langgraph";

export async function reviewNode(state) {
  // IMPORTANT: interrupt() must be FIRST call in node
  // Code before interrupt() will re-execute after resume!
  const feedback = interrupt("Review the draft");

  return new Command({
    update: { approved: feedback.approved },
    goto: feedback.approved ? "send" : "redraft",
  });
}
```

Requires `checkpointer` when compiling graph.

## Structured HITL pattern

For complex interactions, use typed requests. Base types in `lib/shared/hitl.types.ts`:

```typescript
interface HITLRequest<TContext = Record<string, unknown>> {
  type: string;
  title: string;
  description: string;
  context: TContext;
  options?: HITLOption[];
  fields?: HITLField[];
}

interface HITLOption {
  id: string;
  label: string;
  variant: "primary" | "secondary" | "danger";
}

interface HITLField {
  name: string;
  type: "text" | "textarea" | "select" | "checkbox";
  label: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
}

interface HITLResponse {
  selectedOption: string;
  fieldValues: Record<string, string>;
}
```

## Builder colocation pattern

Each node exports its own request builder function:

```typescript
// nodes/find-data.node.ts
export function buildDataReviewHITLRequest(
  extractedData: ExtractedData,
  matchResult: MatchResult,
): HITLRequest<{ extractedData: ExtractedData; matchResult: MatchResult }> {
  return {
    type: "data_review",
    title: "Data verification",
    description: matchResult.found
      ? `Found: row ${matchResult.rowIndex}`
      : `Not found for ${extractedData.company}`,
    context: { extractedData, matchResult },
    options: [
      { id: "confirm", label: "Confirm", variant: "primary" },
      { id: "skip", label: "Skip", variant: "secondary" },
    ],
  };
}

export async function findDataNode(state): Promise<Command> {
  const match = await searchData(state.extractedData);
  const hitlRequest = buildDataReviewHITLRequest(state.extractedData, match);

  return new Command({
    update: { matchResult: match, pendingHITL: hitlRequest },
    goto: "requestHITL",
  });
}
```

**Benefits:**

- All logic (what to show, which fields) in one place
- TypeScript ensures consistency from definition to UI
- Adding a field = change in one file

## Universal requestHITL node

One node handles all interrupt types:

```typescript
// nodes/request-hitl.node.ts
import { interrupt } from "@langchain/langgraph";

export async function requestHITL(
  state,
): Promise<{ hitlResponse: HITLResponse }> {
  const request: HITLRequest = state.pendingHITL;
  if (!request) throw new Error("No pendingHITL in state");

  // Optional: save to DB for dashboard
  await saveInterruptToDB({
    threadId: state.threadId,
    request,
    status: "pending",
  });

  const response: HITLResponse = interrupt(request);

  return { hitlResponse: response, pendingHITL: null };
}
```

## Persistence with Interrupts collection

For dashboard visibility and resume capability, store interrupts in database:

```typescript
// collections/Interrupts.ts (Payload CMS example)
{
  slug: 'interrupts',
  fields: [
    { name: 'email', type: 'relationship', relationTo: 'emails' },
    { name: 'threadId', type: 'text', required: true },
    { name: 'type', type: 'text', required: true },
    { name: 'request', type: 'json', required: true },
    { name: 'response', type: 'json' },
    {
      name: 'status',
      type: 'select',
      options: ['pending', 'completed'],
      defaultValue: 'pending',
    },
    { name: 'completedAt', type: 'date' },
  ]
}
```

**Server Action to respond:**

```typescript
export async function respondToInterrupt(
  interruptId: string,
  response: HITLResponse,
) {
  const interrupt = await payload.findByID({
    collection: "interrupts",
    id: interruptId,
  });

  const checkpointer = await getCheckpointSaver();
  const app = graph.compile({ checkpointer });

  await app.invoke(response, {
    configurable: { thread_id: interrupt.threadId },
  });
}
```
