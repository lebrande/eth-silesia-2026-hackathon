export const MODELS = {
  SONNET: "claude-sonnet",
  HAIKU: "claude-haiku",
} as const;

export type Model = (typeof MODELS)[keyof typeof MODELS];
