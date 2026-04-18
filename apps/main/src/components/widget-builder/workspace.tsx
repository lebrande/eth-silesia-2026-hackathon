"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { BuilderChat, type BuilderChatMessage } from "./builder-chat";
import { PreviewPanel } from "./preview-panel";
import { SaveBar } from "./save-bar";
import { sendBuilderMessageAction, deleteWidgetDefinitionAction } from "@/lib/actions/widget-builder.action";
import type { WidgetSpec } from "@/lib/widget-builder/schema";
import type { BuilderMessage } from "@/lib/widget-builder/llm";

const WELCOME: BuilderChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Cześć! Opisz scenariusz, w którym klient rozmawia z AI na tauron.pl, a ja stworzę widget, który pokażemy w jego chacie. Przykłady: porównanie taryf, wykres zużycia, załącznik PDF z umową, autoryzacja SMS.",
};

type WorkspaceProps =
  | { mode: "create" }
  | {
      mode: "edit";
      id: string;
      initialName: string;
      initialDescription: string;
      initialScenario: string;
      initialSpec: WidgetSpec;
    };

export function WidgetBuilderWorkspace(props: WorkspaceProps) {
  const isEdit = props.mode === "edit";

  const [messages, setMessages] = useState<BuilderChatMessage[]>(() =>
    isEdit
      ? [
          WELCOME,
          {
            id: "prev-scenario",
            role: "user",
            content: props.initialScenario,
          },
          {
            id: "prev-spec",
            role: "assistant",
            content:
              "Załadowałem zapisany widget. Opisz co chcesz zmienić, a przygotuję nową wersję.",
          },
        ]
      : [WELCOME],
  );
  const [currentSpec, setCurrentSpec] = useState<WidgetSpec | null>(
    isEdit ? props.initialSpec : null,
  );
  const [scenarioSummary, setScenarioSummary] = useState<string>(
    isEdit ? props.initialScenario : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const msgCounter = useRef(0);

  const makeId = useCallback((prefix: string) => {
    msgCounter.current += 1;
    return `${prefix}-${msgCounter.current}-${Date.now()}`;
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      const userMsg: BuilderChatMessage = {
        id: makeId("u"),
        role: "user",
        content: text,
      };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setError(null);
      if (!scenarioSummary) setScenarioSummary(text);

      startTransition(async () => {
        const history: BuilderMessage[] = nextMessages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await sendBuilderMessageAction({
          history,
          currentSpec,
        });

        if (!res.ok) {
          setError(res.error);
          setMessages((prev) => [
            ...prev,
            {
              id: makeId("b-err"),
              role: "assistant",
              content: `Błąd: ${res.error}`,
            },
          ]);
          return;
        }

        const { reply, updatedSpec } = res.response;
        setMessages((prev) => [
          ...prev,
          { id: makeId("b"), role: "assistant", content: reply },
        ]);
        if (updatedSpec) {
          setCurrentSpec(updatedSpec);
        }
      });
    },
    [messages, currentSpec, makeId, scenarioSummary],
  );

  const handleDelete = useCallback(() => {
    if (!isEdit) return;
    if (!confirm("Na pewno usunąć ten widget?")) return;
    const fd = new FormData();
    fd.append("id", props.id);
    startTransition(async () => {
      await deleteWidgetDefinitionAction(fd);
    });
  }, [isEdit, props]);

  const initialName = isEdit ? props.initialName : "";
  const initialDescription = isEdit ? props.initialDescription : "";

  const scenarioPreview = useMemo(
    () => scenarioSummary || "Dzień dobry, mam pytanie o…",
    [scenarioSummary],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex h-[calc(100dvh-14rem)] min-h-[560px] flex-col gap-4">
        <BuilderChat
          messages={messages}
          onSend={handleSend}
          pending={pending}
          error={error}
        />
      </div>
      <div className="space-y-4">
        <div className="h-[calc(100dvh-14rem)] min-h-[560px] overflow-y-auto scrollbar-thin rounded-xl border border-border bg-muted/30 p-4">
          <PreviewPanel
            spec={currentSpec}
            scenarioPreview={scenarioPreview}
            builtinId={isEdit ? props.id : null}
          />
        </div>
      </div>
      <div className="lg:col-span-2">
        <SaveBar
          {...(isEdit
            ? {
                mode: "edit" as const,
                id: props.id,
                onDelete: handleDelete,
              }
            : { mode: "create" as const })}
          spec={currentSpec}
          scenario={scenarioSummary}
          initialName={initialName}
          initialDescription={initialDescription}
        />
      </div>
    </div>
  );
}
