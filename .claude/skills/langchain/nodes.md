# Node Patterns

## Contents

- [Basic node with Command routing](#basic-node-with-command-routing)
- [Structured Output](#structured-output)
- [Code style](#code-style)
- [Context in nodes](#context-in-nodes)
- [Template responses](#template-responses)
- [Error handling](#error-handling)
- [Invoke function pattern](#invoke-function-pattern)

## Basic node with Command routing

Nodes are plain functions. Use `Command` for routing instead of `addConditionalEdges`:

```typescript
import { Command, END } from "@langchain/langgraph";

export async function processNode(state): Promise<Command> {
  if (needsReview) {
    return new Command({
      update: { status: "review" },
      goto: "review",
    });
  }
  return new Command({
    update: { status: "done" },
    goto: END,
  });
}
```

**Prefer Command pattern** over `addConditionalEdges` - routing is visible in the node, easier to debug.

## Structured Output

When calling LLM in a node, always use `withStructuredOutput()` to guarantee response format.

### Why

- **Type-safe** - TypeScript knows exact return type
- **Guaranteed structure** - model cannot return invalid format
- **No parsing** - LangChain handles extraction automatically
- **Extensible** - add fields (metadata, confidence) without changing prompts

### How it works

`withStructuredOutput()` uses tool calling under the hood:

1. LangChain converts Zod schema to tool definition
2. API forces model to "call" the tool (`tool_choice: required`)
3. Model outputs structured JSON as tool parameters
4. LangChain extracts and returns typed object

**One API call** - no additional requests.

### Pattern

```typescript
import { z } from "zod";
import { createLLM } from "@/lib/server/llm.server";

// 1. Define schema with Zod — ALWAYS add .describe() to every field
const ResponseSchema = z.object({
  classification: z
    .enum(["category_a", "category_b"])
    .describe("The category that best matches the input"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("How confident the classification is"),
});

// 2. Chain withStructuredOutput
const llm = createLLM(MODELS.HAIKU).withStructuredOutput(ResponseSchema);

// 3. Invoke - result is typed
const result = await llm.invoke([
  { role: "system", content: systemPrompt },
  { role: "user", content: userInput },
]);

// result.classification is "category_a" | "category_b" - guaranteed
```

### Schema field descriptions (`.describe()`)

**Always add `.describe()` to every field in schemas used with `withStructuredOutput()`.**

Why: LangChain converts Zod schema to a tool definition. `.describe()` becomes the tool parameter description — it's the primary way the LLM knows what each field should contain. Without it, the model only sees field names.

```typescript
// BAD — LLM only sees field name "company", guesses what to put there
z.object({
  company: z.string(),
  periodStart: z.string(),
});

// GOOD — LLM knows exactly what format and content is expected
z.object({
  company: z
    .string()
    .describe(
      "Full company name including legal form, e.g. 'Acme Transport Sp. z o.o'",
    ),
  periodStart: z
    .string()
    .describe("Period start date in raw format from source, e.g. '01.04.2025'"),
});
```

**Separation of concerns:**

| What                              | Where                      | Why                                                |
| --------------------------------- | -------------------------- | -------------------------------------------------- |
| Field meaning, format, examples   | `.describe()` on Zod field | Becomes tool parameter description in API          |
| Decision rules, context, behavior | Prompt (`.prompt.md`)      | Guides the model's reasoning                       |
| Output structure                  | Zod schema shape           | Enforced by tool calling (`tool_choice: required`) |

### Prompt adjustment for structured output

API enforces output structure via tool calling — prompts should NOT describe output format.

**Remove from prompt:**

- Output format instructions ("respond with JSON", "return exactly one word")
- OUTPUT sections in examples that mirror the schema shape

**Keep in prompt:**

- Role and task description
- Decision rules (when to choose what)
- Input examples showing what patterns to look for
- Business rules and edge cases

```markdown
<!-- BAD — duplicates what .describe() and schema already enforce -->
<examples>
INPUT: "some text"
OUTPUT:
- company: "ACME"
- country: "Germany"
</examples>

<!-- GOOD — shows input patterns, output is handled by schema -->
<examples>
INPUT: "Application submitted by: Acme Transport GmbH to country: GERMANY for period 01.01.2025 to 31.03.2025"
company="Acme Transport GmbH" country="DE" periodStart="01.01.2025" periodEnd="31.03.2025"
</examples>
```

### When to use

| Scenario                | Use structured output?                 |
| ----------------------- | -------------------------------------- |
| Classification (enum)   | ✅ Yes                                 |
| Data extraction         | ✅ Yes                                 |
| Yes/No decisions        | ✅ Yes                                 |
| Free-form text response | ✅ Yes - wrap in `{ message: string }` |
| Streaming response      | ❌ No - use regular invoke             |

**Default to structured output** - even for simple text responses. Wrapping in `{ message: string }` allows adding metadata later without changing consumers.

## Code style

### Comments

Only add comments when explaining non-obvious decisions. Code should be self-documenting.

**Don't comment:**

- Obvious operations (`// Update DB` before `payload.update()`)
- Standard patterns (`// Determine final status`)
- What the code does (readable from code itself)

**Do comment:**

- Why something is NOT done (`// Don't throw - email was processed, just not moved`)
- Non-obvious business logic
- Workarounds or edge cases

**Bad:**

```typescript
// Update status in DB
await payload.update({ ... });

// Too many attempts → failed
if (newCount > MAX_ATTEMPTS) { ... }
```

**Good:**

```typescript
await payload.update({ ... });

if (newCount > MAX_ATTEMPTS) { ... }

// Don't throw - graph completed successfully, move is best-effort
```

### Formatting

For inline strings with newlines, prefer `\n` in single line over template literals with awkward indentation:

**Bad:**

```typescript
content: `Subject: ${state.subject}

Body:
${state.body}`,
```

**Good:**

```typescript
content: `Subject: ${state.subject}\n\nBody:\n${state.body}`,
```

## Context in nodes

- **Static context** - categories, guidelines, templates → in prompt (or `.prompt.md`)
- **Dynamic context** - data from state → format on-demand inside node
- **Never save formatted prompts in state**

## Template responses

For simple write operations, use templates instead of LLM:

```typescript
export async function generateResponseNode(state): Promise<Command> {
  // Template instead of LLM = token savings + speed
  const response = `Task ${state.taskIdentifier} created successfully.`;
  return new Command({
    update: { finalResponse: response },
    goto: END,
  });
}
```

Use template responses when result is predictable. LLM only when interpretation is needed.

## Error handling

| Category            | Handling  | How                                     |
| ------------------- | --------- | --------------------------------------- |
| **Transient**       | Retry     | `retryPolicy` on node                   |
| **LLM-recoverable** | Loop back | Save error in state, return to LLM node |
| **User-fixable**    | Interrupt | `interrupt()` - pause for user input    |
| **Unexpected**      | Bubble up | Don't catch - let it reach logs         |

**Retry policy per node:**

```typescript
const graph = new StateGraph(MyState)
  .addNode("callExternalAPI", callAPINode, {
    retryPolicy: { maxAttempts: 3, initialInterval: 1.0 },
  })
  .addNode("classify", classifyNode); // LLM node - no retry
```

## Invoke function pattern

Export invoke function from graph file - definition + invocation in one place:

```typescript
// In [name].graph.ts, after graph definition:
export async function invokeMyGraph(input: MyInput) {
  const checkpointer = await getCheckpointSaver();
  const app = myGraph.compile({ checkpointer });

  return app.invoke(input, {
    configurable: { thread_id: `prefix-${input.id}` },
  });
}
```

API route imports only this function - doesn't need to know about graph or checkpointer.
