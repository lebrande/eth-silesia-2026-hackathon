---
name: langchain
description: "Assists with LangGraph/LangChain development. Helps design graphs (StateGraph), create nodes, tools, API routes, and subgraphs. Use when working with LangGraph, designing agent architecture, or scaffolding new files."
---

# LangGraph Development

## Reference

Official best practices: https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph

When something in this skill is unclear or outdated, consult the official documentation and suggest updates.

## Contents

- **[structure.md](structure.md)** - Folder architecture with `subgraphs/root/` organization
- **[graph-design.md](graph-design.md)** - 5-step methodology, node categories, when to create subgraphs
- **[nodes.md](nodes.md)** - Node patterns, Command routing, code style
- **[state.md](state.md)** - State schema design with Zod
- **[prompt-design.md](prompt-design.md)** - Writing prompts for agents (XML structure, decision rules, examples)
- **[hitl.md](hitl.md)** - Human-in-the-Loop patterns (basic and structured)
- **[tools.md](tools.md)** - Tool patterns: factory functions, context injection, execution nodes
- **[patterns.md](patterns.md)** - Code templates for common scenarios
- **[visualization.md](visualization.md)** - Mermaid diagram generation

## Quick reference

### Project structure

```
src/graphs/[name]/
  [name].graph.ts           ← main definition + invoke fn
  [name].state.ts           ← shared state schema
  subgraphs/
    root/nodes/             ← main flow nodes
    [subgraph]/             ← additional flows
```

See [structure.md](structure.md) for details.

### Node with Command routing

```typescript
import { Command, END } from "@langchain/langgraph";

export async function processNode(state): Promise<Command> {
  return new Command({
    update: { result: "done" },
    goto: state.needsReview ? "review" : END,
  });
}
```

See [nodes.md](nodes.md) for more patterns.

### Structured Output (LLM calls)

Always use `withStructuredOutput()` when calling LLM. Always add `.describe()` to every schema field — it becomes the tool parameter description the LLM sees:

```typescript
import { z } from "zod";

const Schema = z.object({
  classification: z
    .enum(["a", "b"])
    .describe("The category that best matches the input"),
});

const llm = createLLM(MODELS.HAIKU).withStructuredOutput(Schema);

const result = await llm.invoke(messages);
// result.classification is "a" | "b" - type-safe, guaranteed
```

See [nodes.md](nodes.md#structured-output) for details — includes schema design rules and prompt adjustment guide.

### LLM config

```typescript
import { createLLM } from "@/lib/server/llm.server";
import { MODELS } from "@/lib/models.shared";

// MODELS.SONNET = "sonnet" (LiteLLM model name)
// MODELS.HAIKU  = "haiku"  (LiteLLM model name)

const llm = createLLM(MODELS.HAIKU); // or MODELS.SONNET
```

LLM calls go through LiteLLM proxy (configured via LITELLM_BASE_URL + LITELLM_API_KEY env vars). Model names map to actual models in LiteLLM config.

## Scaffolding

When creating a new graph:

1. Design architecture (nodes, edges, state) - Mermaid diagram
2. Create folder structure per [structure.md](structure.md)
3. Add `console.warn("TODO: implement [node-name]")` as placeholder in nodes
4. Graph should compile and be invokable immediately
