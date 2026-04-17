# Prompt Design

Best practices for writing prompts for AI agents with tool calling.

## Contents

- [Structure](#structure)
- [Decision rules](#decision-rules)
- [Error handling](#error-handling)
- [Examples (few-shot)](#examples-few-shot)
- [Context variables](#context-variables)
- [Response templates](#response-templates)
- [Writing style](#writing-style)

## Structure

Use XML tags for organization. Claude was trained with XML in training data.

```xml
<role>
Short description of agent's role
</role>

<context>
Today: **${currentDate}** (${dayOfWeek}), ${currentTime}
</context>

<decision_rules>
When to use which tool
</decision_rules>

<error_handling>
How to handle errors
</error_handling>

<examples>
INPUT → OUTPUT examples
</examples>

<rules>
General behavior rules
</rules>
```

**Recommended sections:**

1. **Role** - who is the agent
2. **Context** - dynamic variables (time, user)
3. **Decision rules** - decision tree for tools
4. **Error handling** - what to do when tool returns error
5. **Examples** - specific INPUT → OUTPUT scenarios
6. **Response templates** - response formats
7. **Rules** - general rules

## Decision rules

### Specific rules over general instructions

**Bad:**

```
Before assigning to cycle → call list_cycles
```

**Good:**

```
### create_task
- If user provides cycle ID (UUID) → use it directly
- If user says "current cycle", "next sprint" → first list_cycles

### list_cycles
- User asks about cycles
- User says "current", "next"
- DON'T call when user provides specific cycle ID
```

## Error handling

Agent must know what to do with errors:

```xml
<error_handling>
When tool returns error:
1. Read error message
2. Tell user the REAL reason
3. Suggest solution

Common errors:
- "Invalid cycle ID" → cycle doesn't exist, suggest "show cycles"
- "Issue not found" → task doesn't exist
</error_handling>
```

**Rule: don't pretend success.** Agent must honestly report errors.

## Examples (few-shot)

Show INPUT → OUTPUT for edge cases:

```xml
<examples>
### Creating with invalid cycle ID
INPUT: "Create task 'Test' in cycle xyz-fake-123"
ACTION: create_task(title="Test", cycleId="xyz-fake-123")
ON ERROR: Report error
OUTPUT: ❌ Invalid cycle ID "xyz-fake-123"

### Creating in "current cycle"
INPUT: "Add task to current sprint"
ACTION:
1. list_cycles() → find active
2. create_task(cycleId="<uuid>")
OUTPUT: ✅ Added: TASK-456 | Cycle: Cycle 19
</examples>
```

**Priority:**

1. Edge cases (invalid data, missing resources)
2. Multi-step scenarios
3. Common use cases

## Context variables

Include date/time context when relevant for decision making:

```xml
<context>
Today: **${currentDate}** (${dayOfWeek}), ${currentTime}
</context>
```

Use `injectVariables` with `getDateTimeVariables()`:

```typescript
import {
  loadPrompt,
  injectVariables,
  getDateTimeVariables,
} from "@/lib/prompts.shared";

const template = loadPrompt("my-graph/prompts/agent.prompt.md");
const systemPrompt = injectVariables(template, getDateTimeVariables());
```

## Response templates

Standardize response formats:

```
### ✅ Success
✅ Added: TASK-123 "Title"
Project: X | Priority: high

### ❌ Error
❌ TASK-999 not found

### ❓ Need clarification
❓ Create task or show list?
```

## Writing style

### Be explicit

Claude executes instructions precisely. If you don't say it, it won't do it.

**Bad:** "You can create a task"
**Good:** "Create task by calling create_task"

### Add context/motivation

Explain WHY behavior is important.

**Bad:** "Don't use list_cycles when UUID provided"
**Good:** "Don't use list_cycles when user provides UUID - create_task will validate and return error if invalid"

### Tell what to do, not what not to do

**Bad:** "Don't make up data"
**Good:** "Use only data from tool responses"

### Avoid aggressive language

Instead of "CRITICAL: You MUST..." use normal language "Use this tool when...".

## Checklist

- [ ] XML tags for structure
- [ ] Decision rules with decision tree
- [ ] Error handling section
- [ ] Edge case examples (INPUT → OUTPUT)
- [ ] Instructions are explicit
- [ ] Explained WHY (context/motivation)
- [ ] Says what to do, not what not to do
- [ ] Response templates defined
- [ ] Date/time context if relevant
