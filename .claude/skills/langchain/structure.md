# Graph Folder Structure

## Contents

- [Main structure](#main-structure)
- [Subgraphs organization](#subgraphs-organization)
- [File naming conventions](#file-naming-conventions)
- [Import patterns](#import-patterns)

## Main structure

```
src/
  graphs/
    [graph-name]/
      [graph-name].graph.ts       ← main graph definition + invoke fn
      [graph-name].graph.md       ← Mermaid diagram (generated)
      [graph-name].state.ts       ← shared state schema
      tools/                      ← tool factories (shared across agents)
        [tool-name].tool.ts
        index.ts                  ← barrel export + createXTools factory
      subgraphs/
        root/                     ← main flow nodes
          nodes/
          prompts/
        [subgraph-name]/          ← additional flows
          [subgraph-name].subgraph.ts
          nodes/
          prompts/
```

## Subgraphs organization

All nodes live inside `subgraphs/` folder. The `root/` folder contains main flow nodes.

**Why this structure:**

- Consistent organization across all flows
- Clear visibility of all graph paths
- Easy to add new flows
- Shared nodes naturally live in `root/nodes/`

**Example:**

```
graphs/
  mail-processor/
    mail-processor.graph.ts
    mail-processor.state.ts
    subgraphs/
      root/
        nodes/
          start-processing.node.ts
          classify-email.node.ts
          complete-processing.node.ts
          request-hitl.node.ts      ← shared, used by other subgraphs
        prompts/
          classify-email.prompt.md
      tax-office-notification/
        tax-office-notification.subgraph.ts
        nodes/
          extract-data.node.ts
          find-match.node.ts
        prompts/
          extract-data.prompt.md
```

## File naming conventions

| Suffix         | Purpose               |
| -------------- | --------------------- |
| `.graph.ts`    | Main graph definition |
| `.subgraph.ts` | Subgraph definition   |
| `.node.ts`     | Node function         |
| `.state.ts`    | State schema          |
| `.prompt.md`   | Prompt template       |
| `.graph.md`    | Mermaid diagram       |

**Subgraph suffix:** Use `.subgraph.ts` (not `.graph.ts`) to distinguish from main graph.

## Prompt files

System prompts live in `prompts/` folder as Markdown files. Benefits:

- Better readability than inline strings
- Syntax highlighting in editor
- Easy to review and iterate

**File:** `prompts/classify.prompt.md`

```markdown
You are classifying user requests.

Classify as one of:

- "support" - needs human assistance
- "automation" - can be handled automatically

Respond with ONLY the classification.
```

**Usage in node:**

```typescript
import { loadPrompt } from "@/lib/prompts.shared";

// Path relative to src/graphs/
const systemPrompt = loadPrompt(
  "my-graph/subgraphs/root/prompts/classify.prompt.md",
);

const response = await llm.invoke([
  { role: "system", content: systemPrompt },
  { role: "user", content: state.input },
]);
```

**With variable injection:**

Prompt file can contain `${varName}` placeholders:

```markdown
Today is ${currentDate}. Classify the request...
```

```typescript
import {
  loadPrompt,
  injectVariables,
  getDateTimeVariables,
} from "@/lib/prompts.shared";

const template = loadPrompt(
  "my-graph/subgraphs/root/prompts/classify.prompt.md",
);
const systemPrompt = injectVariables(template, {
  ...getDateTimeVariables(),
  customVar: "value",
});
```

**When to use prompt files:**

- System prompts with instructions/guidelines
- Long prompts (>3 lines)

**When inline is OK:**

- Short, simple user messages
- Dynamic content formatted from state

## Import patterns

**Main graph imports from subgraphs:**

```typescript
// [graph-name].graph.ts
import { startProcessing } from "./subgraphs/root/nodes/start-processing.node";
import { classifyEmail } from "./subgraphs/root/nodes/classify-email.node";
import { taxOfficeSubgraph } from "./subgraphs/tax-office-notification/tax-office-notification.subgraph";
```

**Subgraph imports shared nodes from root:**

```typescript
// subgraphs/tax-office-notification/nodes/find-match.node.ts
import { requestHITL } from "../../root/nodes/request-hitl.node";
```
