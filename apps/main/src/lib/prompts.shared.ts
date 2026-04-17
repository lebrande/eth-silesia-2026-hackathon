import { readFileSync } from "fs";
import { join } from "path";

type Variables = Record<string, string>;

const GRAPHS_DIR = join(process.cwd(), "src/graphs");

export function loadPrompt(path: string): string {
  return readFileSync(join(GRAPHS_DIR, path), "utf-8");
}

export function injectVariables(
  template: string,
  variables: Variables,
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

export function getDateTimeVariables(locale = "pl-PL") {
  const now = new Date();
  return {
    currentDate: now.toLocaleDateString(locale),
    currentTime: now.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    dayOfWeek: now.toLocaleDateString(locale, { weekday: "long" }),
  };
}

const rawAgentShared = loadPrompt(
  "chat/subgraphs/root/prompts/agent-shared.prompt.md",
);

export function getAgentPrompt(promptPath: string): () => string {
  const rawPrompt = loadPrompt(promptPath);

  return () => {
    const agentShared = injectVariables(rawAgentShared, getDateTimeVariables());
    return injectVariables(rawPrompt, { agentShared });
  };
}
