# Code Templates

## Contents

- [Graph template](#graph-template)
- [Graph with checkpointer](#graph-with-checkpointer)
- [Node templates](#node-templates)
- [Tool patterns](#tool-patterns)
- [API route template](#api-route-template)
- [Cron trigger pattern](#cron-trigger-pattern)

## Graph template

```typescript
// src/graphs/[name]/[name].graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";
import { processNode } from "./subgraphs/root/nodes/process.node";

const MyGraphState = z.object({
  input: z.string(),
  result: z.string().optional(),
});

const graph = new StateGraph(MyGraphState)
  .addNode("process", processNode)
  .addEdge(START, "process")
  .addEdge("process", END);

export const compiledGraph = graph.compile();
```

## Graph with checkpointer

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";
import { getCheckpointSaver } from "@/lib/server/checkpoint.server";

const MyGraphState = z.object({
  input: z.string(),
});

const graph = new StateGraph(MyGraphState)
  .addNode("process", processNode)
  .addEdge(START, "process")
  .addEdge("process", END);

// Invoke function pattern
export async function invokeMyGraph(input: { input: string }) {
  const checkpointer = await getCheckpointSaver();
  const app = graph.compile({ checkpointer });

  return app.invoke(input, {
    configurable: { thread_id: `my-graph-${Date.now()}` },
  });
}
```

## Node templates

### Basic node

```typescript
import { Command, END } from "@langchain/langgraph";

export async function processNode(state): Promise<Command> {
  // Process logic
  return new Command({
    update: { result: "done" },
    goto: END,
  });
}
```

### LLM node

```typescript
import { Command, END } from "@langchain/langgraph";
import { createLLM } from "@/lib/server/llm.server";
import { MODELS } from "@/lib/models.shared";

const llm = createLLM(MODELS.HAIKU);

export async function classifyNode(state): Promise<Command> {
  const response = await llm.invoke([
    {
      role: "system",
      content: "Classify the intent. Return: type_a, type_b, or skip",
    },
    { role: "user", content: state.input },
  ]);

  const classification = response.content.toString().trim();
  return new Command({
    update: { classification },
    goto: classification,
  });
}
```

### Node with tool calling

Use `runToolCallingLoop` — handles the LLM ↔ tools loop + Command propagation. See [tools.md](tools.md) for full patterns.

```typescript
import { runToolCallingLoop } from "@/lib/tool-calling.shared";
import { getAgentPrompt } from "@/lib/prompts.shared";
import { myTool } from "../../tools";
import type { StructuredToolInterface } from "@langchain/core/tools";

const getSystemPrompt = getAgentPrompt(
  "chat/subgraphs/root/prompts/my-agent.prompt.md",
);
const tools: StructuredToolInterface[] = [myTool];
const llm = createLLM().bindTools(tools);

export async function agentNode(state): Promise<Command> {
  return runToolCallingLoop(llm, tools, [
    { role: "system", content: getSystemPrompt() },
    ...state.messages.slice(-MAX_HISTORY_MESSAGES),
  ]);
}
```

## API route template

```typescript
// src/app/api/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/server/auth.server";
import { invokeMyGraph } from "@/graphs/my-graph/my-graph.graph";

export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const result = await invokeMyGraph(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[my-endpoint] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

## Cron trigger pattern

```typescript
// apps/cron-[name]/src/index.ts
async function main() {
  const res = await fetch(`${process.env.MAIN_URL}/api/my-action`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.API_SECRET_KEY!,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.error(`Failed: ${res.status}`);
    process.exit(1);
  }

  console.log("Result:", await res.json());
  process.exit(0);
}

main();
```
