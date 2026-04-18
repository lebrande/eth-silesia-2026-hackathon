/**
 * Typy domenowe backoffice. Odwzorowują dane w bazie (apps/main schema).
 */

export type BackofficeUser = {
  id: string;
  email: string;
  name: string | null;
};

export type ConversationRow = {
  threadId: string;
  uid: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  escalated: boolean;
  blocked: boolean;
  verifiedPhone: string | null;
  language: string | null;
};

export type ChatMessageRole = "user" | "ai" | "tool" | "system";

export type ChatMessage = {
  /** LangChain message id (stabilny — nadawany przez LangGraph) */
  id: string;
  role: ChatMessageRole;
  content: string;
  /**
   * Per-message timestamp nie jest zapisywany przez LangGraph, więc
   * dla prostoty zwracamy null. Dashboard agreguje po chat_sessions.
   */
  createdAt: Date | null;
  /** response_metadata.total_ms z LangChain, jeśli dostępne */
  responseMs: number | null;
  /** czy ta konkretna wiadomość AI ma oznaczenie od agenta */
  flaggedByAgent: boolean;
};

export type ConversationDetail = ConversationRow & {
  messages: ChatMessage[];
  aiMessageCount: number;
  userMessageCount: number;
  flaggedCount: number;
  avgResponseMs: number;
};

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  category: string;
  language: string;
  source: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProblematicReason = "escalation" | "agent_flag";

export type ProblematicQuestion = {
  key: string;
  question: string;
  occurrences: number;
  lastSeenAt: Date;
  firstSeenAt: Date;
  threadIds: string[];
  sampleThreadId: string;
  sampleMessageId: string | null;
  reasons: ProblematicReason[];
  hasFaq: boolean;
};

export type KpiTimeseriesPoint = {
  date: string;
  conversations: number;
  escalationRate: number;
  messages: number;
};

export type CustomToolParamType = "number" | "string";

export type CustomToolParam = {
  name: string;
  type: CustomToolParamType;
  description?: string;
  required?: boolean;
  default?: number | string | null;
};

export type CustomToolRow = {
  id: string;
  name: string;
  description: string;
  parameters: CustomToolParam[];
  formula: string;
  responseTemplate: string | null;
  enabled: boolean;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomToolRunOutput = {
  result: number | string;
  rendered: string;
};
