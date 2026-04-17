import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

let _checkpointer: PostgresSaver | null = null;

export async function getCheckpointSaver() {
  if (!_checkpointer) {
    _checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
    await _checkpointer.setup();
  }
  return _checkpointer;
}
