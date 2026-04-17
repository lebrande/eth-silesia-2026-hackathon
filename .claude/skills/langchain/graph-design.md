# Graph Design Methodology

## Contents

- [5-step process](#5-step-process)
- [Node categories](#node-categories)
- [When to create subgraphs](#when-to-create-subgraphs)
- [Classify → Route pattern](#classify--route-pattern)

## 5-step process

1. **Map the process** - draw steps as Mermaid diagram
2. **Identify operation types** - categorize each step (see node categories)
3. **Design state** - what must persist between steps
4. **Build nodes** - one responsibility per node
5. **Connect graph** - minimal edges, routing via Command

## Node categories

| Type            | Purpose                             | Example                   |
| --------------- | ----------------------------------- | ------------------------- |
| **LLM step**    | Understanding, analysis, generation | Classification, drafting  |
| **Data step**   | Fetching external data              | Search, DB query          |
| **Action step** | External operation                  | Send email, create ticket |
| **User input**  | Human intervention                  | Approval, clarification   |

**Granularity:** Smaller nodes = more frequent checkpoints = less repeated work on failure. Separate nodes for external services enable isolated retry and easier debugging.

## When to create subgraphs

Create a subgraph when:

- Flow has 3+ dedicated nodes
- Logic is reusable in other contexts
- You want to isolate tests/debugging

Keep in main graph when:

- Simple linear flow
- Few nodes (1-2)
- Tightly coupled with main logic

## Classify → Route pattern

For graphs handling multiple request types, start with a classification node:

```typescript
export async function classifyNode(state): Promise<Command> {
  const classification = await llm.invoke(/* classify intent */);
  return new Command({
    update: { classification },
    goto: classification, // node name matches classification value
  });
}
```

**Export ends for graph definition:**

```typescript
const classifyRoutes: Record<Classification, string> = {
  type_a: "handleTypeA",
  type_b: "handleTypeB",
  skip: "completeProcessing",
};

export const classifyEnds = [...new Set(Object.values(classifyRoutes))];

export async function classifyNode(state): Promise<Command> {
  // ...
  return new Command({
    update: { classification },
    goto: classifyRoutes[classification],
  });
}
```

Then in graph definition:

```typescript
graph.addNode("classify", classifyNode, { ends: classifyEnds });
```
