import { ChatOpenAI } from "@langchain/openai";
import { MODELS } from "@/lib/models.shared";

export function createLLM(model: string = MODELS.SONNET) {
  return new ChatOpenAI({
    model,
    configuration: {
      baseURL: process.env.LITELLM_BASE_URL,
    },
    apiKey: process.env.LITELLM_API_KEY,
  });
}

export async function llmTranslate(
  message: string,
  language: string,
): Promise<string> {
  const llm = createLLM(MODELS.HAIKU);
  const response = await llm.invoke([
    {
      role: "system",
      content: `Translate the following message to language code "${language}". Return ONLY the translated text, nothing else. If the message is already in the target language, return it as-is.`,
    },
    { role: "user", content: message },
  ]);
  return String(response.content);
}
