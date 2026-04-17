import { StateGraph, START } from "@langchain/langgraph";
import { getCheckpointSaver } from "@/lib/server/checkpoint.server";
import { mapMessages } from "./chat.constants";
import { ChatState } from "./chat.state";
import { gateNode, gateEnds } from "./subgraphs/root/nodes/gate.node";
import {
  defaultAgentNode,
  defaultAgentEnds,
} from "./subgraphs/root/nodes/default-agent.node";
import { escalationNode } from "./subgraphs/root/nodes/escalation.node";
import { spamNode } from "./subgraphs/root/nodes/spam.node";
import { requestPhoneNode } from "./subgraphs/root/nodes/request-phone.node";
import { verifyPhoneNode } from "./subgraphs/root/nodes/verify-phone.node";
import {
  verifyCodeNode,
  verifyCodeEnds,
} from "./subgraphs/root/nodes/verify-code.node";
import {
  verifiedAgentNode,
  verifiedAgentEnds,
} from "./subgraphs/root/nodes/verified-agent.node";

export const graph = new StateGraph(ChatState)
  .addNode("gate", gateNode, { ends: gateEnds })
  .addNode("default_agent", defaultAgentNode, { ends: defaultAgentEnds })
  .addNode("escalation", escalationNode)
  .addNode("spam", spamNode)
  .addNode("request_phone", requestPhoneNode)
  .addNode("verify_phone", verifyPhoneNode)
  .addNode("verify_code", verifyCodeNode, { ends: verifyCodeEnds })
  .addNode("verified_agent", verifiedAgentNode, { ends: verifiedAgentEnds })
  .addEdge(START, "gate");

export async function invokeChatGraph(input: {
  message: string;
  threadId: string;
}) {
  const checkpointer = await getCheckpointSaver();
  const app = graph.compile({ checkpointer });

  const result = await app.invoke(
    { messages: [{ role: "user", content: input.message }] },
    { configurable: { thread_id: input.threadId } },
  );

  const messages = result.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  const history = mapMessages(messages);

  return {
    message: String(lastMessage.content),
    escalated: result.escalated ?? false,
    blocked: result.blocked ?? false,
    authStep: result.authStep ?? null,
    authCode: result.authCode ?? null,
    verifiedPhone: result.verifiedPhone ?? null,
    language: result.language ?? null,
    history,
  };
}
