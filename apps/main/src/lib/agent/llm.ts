import "server-only";
import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_MODEL = "claude-sonnet";

/**
 * LLM dla backoffice-agenta. Używamy LiteLLM proxy, tak samo jak apps/main,
 * żeby współdzielić klucze i dostępne modele.
 */
export function createAssistantLLM(model: string = DEFAULT_MODEL) {
  return new ChatOpenAI({
    model,
    configuration: {
      baseURL: process.env.LITELLM_BASE_URL,
    },
    apiKey: process.env.LITELLM_API_KEY,
  });
}
