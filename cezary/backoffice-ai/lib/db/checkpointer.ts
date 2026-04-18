import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

declare global {
  // eslint-disable-next-line no-var
  var __backofficeCheckpointer: Promise<PostgresSaver> | undefined;
}

export function getCheckpointer(): Promise<PostgresSaver> {
  if (!globalThis.__backofficeCheckpointer) {
    globalThis.__backofficeCheckpointer = (async () => {
      const saver = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
      // setup() jest idempotentne — apps/main już go wywołuje, ale gdyby
      // backoffice uruchomił się przed głównym API, stworzymy tabele sami.
      await saver.setup();
      return saver;
    })();
  }
  return globalThis.__backofficeCheckpointer;
}
