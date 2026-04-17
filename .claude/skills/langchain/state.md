# State Design

## Contents

- [State schema with Zod](#state-schema-with-zod)
- [Design principles](#design-principles)
- [Checkpointer and persistence](#checkpointer-and-persistence)

## State schema with Zod

Define state using Zod schema in a separate `[name].state.ts` file:

```typescript
// [name].state.ts
import { z } from "zod";

// Enums as Zod schemas (also export as types)
export const TaskStatus = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

// State schema
export const MyGraphState = z.object({
  input: z.string(),
  status: TaskStatus.default("pending"),
  result: z.string().nullable().optional(),
});

// Export type
export type MyGraphStateType = z.infer<typeof MyGraphState>;
```

**With messages (chat graphs):**

```typescript
import { z } from "zod";
import type { BaseMessage } from "@langchain/core/messages";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";

export const ChatState = z.object({
  messages: z
    .custom<BaseMessage[]>()
    .default(() => [])
    .register(registry, MessagesZodMeta),
  // custom fields — use .optional(), NOT .default()
  escalated: z.boolean().optional(),
  spamCounter: z.number().optional(),
});

export type ChatStateType = z.infer<typeof ChatState>;
```

`.register(registry, MessagesZodMeta)` tells LangGraph to use messages reducer (append instead of overwrite).

### Default values and checkpointer persistence

**Use `.optional()` instead of `.default()` for non-message state fields.**

`.default()` causes Zod to fill in default values when parsing the invoke input. Since non-message fields use "last write wins" (no reducer), these defaults overwrite checkpointed values on every invocation. This breaks counters, flags, and any state that should persist between messages.

```typescript
// BAD — spamCounter resets to 0 on every invoke
spamCounter: z.number().default(0),

// GOOD — spamCounter persists from checkpoint
spamCounter: z.number().optional(),
```

Handle defaults in nodes: `const count = state.spamCounter ?? 0;`

**Exception:** `messages` field with `MessagesZodMeta` is safe with `.default(() => [])` because the messages reducer handles merging (append, not overwrite).

**Usage in graph:**

```typescript
// [name].graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { MyGraphState } from "./my-graph.state";

export const myGraph = new StateGraph(MyGraphState)
  .addNode("process", processNode)
  .addEdge(START, "process")
  .addEdge("process", END);
```

**Usage in nodes:**

```typescript
// nodes/process.node.ts
import type { MyGraphStateType } from "../../../my-graph.state";

export async function processNode(state: MyGraphStateType): Promise<Command> {
  // state is fully typed
}
```

### Zod 4 notes

- `z.record()` requires 2 arguments: `z.record(z.string(), z.string())`
- `z.enum()` works normally: `z.enum(["a", "b"])`

## Design principles

**Save raw data, not formatted text.** Format prompts inside nodes.

**Save:**

- Data expensive to recreate (API calls, LLM responses, classifications)
- External identifiers (IDs, thread IDs)
- Processing state (status, counts)

**Don't save:**

- Things easy to compute from existing state
- Formatted prompts
- Temporary variables

## Checkpointer and persistence

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver(); // dev
// Production: PostgresSaver
const compiled = graph.compile({ checkpointer });

// Invoke with thread_id
await compiled.invoke(input, {
  configurable: { thread_id: "customer_123" },
});
```

Thread ID groups related conversations/states. Required for:

- HITL (interrupt/resume)
- Multi-turn conversations
- State persistence across invocations
