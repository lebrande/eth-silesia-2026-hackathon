"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  createFaqAction,
  updateFaqAction,
  type FaqFormState,
} from "@/lib/actions/faq.action";
import { suggestFaqAnswerAction } from "@/lib/actions/faq-suggest.action";
import { fetchConversationHistoryAction } from "@/lib/actions/chat.action";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { AlertCircle, Save, Sparkles } from "lucide-react";

type Initial = {
  question: string;
  answer: string;
  tags: string[];
  category: string;
  language: string;
  source: string;
};

export function FaqForm(
  props:
    | {
        mode: "create";
        categories: string[];
        initial: Initial;
        threadId?: string;
      }
    | {
        mode: "edit";
        id: string;
        categories: string[];
        initial: Initial;
        threadId?: string;
      },
) {
  const boundUpdate =
    props.mode === "edit" ? updateFaqAction.bind(null, props.id) : null;

  const [state, action, pending] = useActionState<FaqFormState, FormData>(
    props.mode === "create" ? createFaqAction : boundUpdate!,
    undefined,
  );

  const [question, setQuestion] = useState(props.initial.question);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const [suggestPending, startSuggest] = useTransition();
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const suggestDisabled = suggestPending || question.trim().length < 10;

  const handleSuggest = () => {
    if (suggestDisabled) return;
    setSuggestError(null);

    startSuggest(async () => {
      let threadContext: string | undefined;
      if (props.threadId) {
        try {
          const history = await fetchConversationHistoryAction(props.threadId);
          const lastUser = [...history]
            .reverse()
            .find((m) => m.role === "user");
          threadContext = lastUser?.content;
        } catch {
          // brak kontekstu to nie jest fatalne — sugestia leci bez niego
        }
      }

      const res = await suggestFaqAnswerAction({
        question: question.trim(),
        threadContext,
      });

      if (!res.ok) {
        setSuggestError(res.error);
        return;
      }

      if (answerRef.current) {
        answerRef.current.value = res.suggestion;
        answerRef.current.focus();
      }
    });
  };

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="question">Pytanie</Label>
        <Input
          id="question"
          name="question"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Np. Jak zablokować kartę?"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="answer">Odpowiedź</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={suggestDisabled}
            onClick={handleSuggest}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {suggestPending ? "Generowanie..." : "Zaproponuj odpowiedź AI"}
          </Button>
        </div>
        <Textarea
          ref={answerRef}
          id="answer"
          name="answer"
          required
          rows={7}
          defaultValue={props.initial.answer}
          placeholder="Wpisz odpowiedź, której AI ma używać w rozmowach z klientami..."
        />
        <p className="text-[11px] text-muted-foreground">
          Pisz w drugiej osobie, bez żargonu. Krótkie, konkretne odpowiedzi
          działają najlepiej.
        </p>
        {suggestError ? (
          <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs p-2.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{suggestError}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="category">Kategoria</Label>
          <Input
            id="category"
            name="category"
            list="faq-categories"
            defaultValue={props.initial.category}
            placeholder="Np. Karty"
          />
          <datalist id="faq-categories">
            {props.categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tagi</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={props.initial.tags.join(", ")}
            placeholder="karty, bezpieczeństwo, pin"
          />
          <p className="text-[11px] text-muted-foreground">
            Rozdziel przecinkami.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="language">Język</Label>
          <Select
            id="language"
            name="language"
            defaultValue={props.initial.language || "pl"}
          >
            <option value="pl">Polski</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="source">Źródło (opcjonalne)</Label>
          <Input
            id="source"
            name="source"
            defaultValue={props.initial.source}
            placeholder="Np. dokument ABC, playbook v2"
          />
        </div>
      </div>

      {state?.error ? (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs p-2.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" asChild type="button">
          <Link href="/app/faq">Anuluj</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending
            ? "Zapisywanie..."
            : props.mode === "create"
              ? "Zapisz wpis"
              : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
  );
}
