# Tool Patterns

Official docs: https://langchain-ai.github.io/langgraphjs/how-tos/update-state-from-tools

## Contents

- [File structure](#file-structure)
- [Tool definition](#tool-definition)
- [State access](#state-access)
- [Tool with routing (Command)](#tool-with-routing-command)
- [Tool-calling loop](#tool-calling-loop)
- [Adding a new tool](#adding-a-new-tool)

## File structure

```
src/graphs/[name]/
  tools/
    [tool-name].tool.ts     ← one file per tool (static instance)
    index.ts                ← barrel re-exports

src/lib/
  tool-calling.shared.ts    ← runToolCallingLoop (reusable)
```

## Tool definition

Static instance using `tool()` from `@langchain/core/tools`:

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const myTool = tool(
  async ({ param }) => {
    return JSON.stringify(result);
  },
  {
    name: "myTool",
    description: "What this tool does — LLM reads this via bindTools",
    schema: z.object({
      param: z.string().describe("What this parameter means"),
    }),
  },
);
```

Rules:

- Name: **camelCase** (`getMyOrders`, `escalateToHuman`)
- `.describe()` on every schema field
- Description = what the tool does (behavioral guidance goes in prompt)
- Return `string` (JSON for data, plain text for messages)
- Static instances, not factories — use `getCurrentTaskInput<T>()` for state

## State access

`getCurrentTaskInput<T>()` from `@langchain/langgraph` — reads graph state at runtime. No closures needed:

```typescript
import { getCurrentTaskInput } from "@langchain/langgraph";
import type { MyStateType } from "../my.state";

export const myTool = tool(
  async () => {
    const state = getCurrentTaskInput<MyStateType>();
    return JSON.stringify(await fetchData(state.verifiedPhone!));
  },
  { name: "myTool", description: "...", schema: z.object({}) },
);
```

Security: sensitive context (user identity) from state, never from LLM arguments.

## Tool with routing (Command)

Tools can return `Command` for graph routing (official LangGraph pattern):

```typescript
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import type { ToolRunnableConfig } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { z } from "zod";

export const escalateToHumanTool = tool(
  async ({ question }: { question: string }, config: ToolRunnableConfig) => {
    return new Command({
      update: {
        escalationQuestion: question,
        messages: [
          new ToolMessage({
            content: "Escalating to human agent.",
            tool_call_id: config.toolCall?.id ?? "",
          }),
        ],
      },
      goto: "escalation",
    });
  },
  {
    name: "escalateToHuman",
    description: "Transfer to human agent via WhatsApp.",
    schema: z.object({
      question: z.string().describe("Customer's question for the human agent"),
    }),
  },
);
```

Key: `config.toolCall?.id` for ToolMessage ID, `goto` for routing, include ToolMessage in Command's `update.messages`.

## Tool-calling loop

`runToolCallingLoop` from `lib/tool-calling.shared.ts` — LLM ↔ tools loop inside one node:

```typescript
import { runToolCallingLoop } from "@/lib/tool-calling.shared";
import type { StructuredToolInterface } from "@langchain/core/tools";

const tools: StructuredToolInterface[] = [myTool, escalateToHumanTool];
const llm = createLLM().bindTools(tools);

export async function myAgentNode(state): Promise<Command> {
  return runToolCallingLoop(llm, tools, [
    { role: "system", content: getSystemPrompt() },
    ...state.messages.slice(-MAX_HISTORY_MESSAGES),
  ]);
}
```

What `runToolCallingLoop` does:

- `for` loop (max 10 iterations) — LLM → tools → LLM until text response
- `isCommand(result)` — propagates Command from tool (e.g. escalation routing)
- Error handling per tool call → ToolMessage with error
- No separate tools node — follows official LangGraph `entrypoint` pattern

Type tools array as `StructuredToolInterface[]` to avoid union type issues with `invoke`.

## Adding a new tool

1. Create `tools/[name].tool.ts` with static `tool()` instance
2. Export from `tools/index.ts`
3. Import in agent node, add to `tools` array
4. Done — automatically bound to LLM and executable in the loop
