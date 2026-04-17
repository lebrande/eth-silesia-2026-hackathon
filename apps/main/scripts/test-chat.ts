/// <reference types="node" />
import "dotenv/config";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { invokeChatGraph } from "../src/graphs/chat/chat.graph";

const message = process.argv[2] || "Jakie są koszty wysyłki?";
const threadId = process.argv[3] || `test-${Date.now()}`;

async function main() {
  console.log(`Thread: ${threadId}`);
  console.log(`User: ${message}\n`);

  const result = await invokeChatGraph({ message, threadId });
  console.log(`Assistant: ${result.message}`);

  await awaitAllCallbacks();
}

main().then(() => process.exit(0));
