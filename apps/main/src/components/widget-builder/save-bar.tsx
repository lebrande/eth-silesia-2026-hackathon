"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { WidgetSpec } from "@/lib/widget-builder/schema";
import {
  saveWidgetDefinitionAction,
  updateWidgetDefinitionAction,
  type SaveWidgetFormState,
} from "@/lib/actions/widget-builder.action";

type BaseProps = {
  spec: WidgetSpec | null;
  scenario: string;
  initialName: string;
  initialDescription: string;
};

export function SaveBar(
  props: BaseProps &
    ({ mode: "create" } | { mode: "edit"; id: string; onDelete?: () => void }),
) {
  const { spec, scenario, initialName, initialDescription } = props;
  const action =
    props.mode === "create"
      ? saveWidgetDefinitionAction
      : updateWidgetDefinitionAction.bind(null, props.id);

  const [state, formAction, pending] = useActionState<
    SaveWidgetFormState,
    FormData
  >(action, undefined);

  const specJson = spec ? JSON.stringify(spec) : "";
  const canSubmit = !!spec && !pending;

  return (
    <form
      action={formAction}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      <input type="hidden" name="spec" value={specJson} />
      <input type="hidden" name="scenario" value={scenario} />

      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-foreground/70">
            Nazwa
          </span>
          <input
            name="name"
            required
            defaultValue={initialName}
            placeholder="np. Porównanie taryf G11/G12"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-foreground/70">
            Opis (do czego służy)
          </span>
          <input
            name="description"
            required
            defaultValue={initialDescription}
            placeholder="Krótkie streszczenie — kiedy agent ma użyć tego widgetu"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      {state?.error ? (
        <div className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
          {state.error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {spec
            ? "Widget gotowy do zapisu."
            : "Najpierw opisz scenariusz w czacie — builder wygeneruje widget."}
        </div>
        <div className="flex items-center gap-2">
          {props.mode === "edit" && props.onDelete ? (
            <Button
              type="button"
              variant="outline"
              onClick={props.onDelete}
              disabled={pending}
            >
              Usuń
            </Button>
          ) : null}
          <Button type="submit" disabled={!canSubmit}>
            {props.mode === "create" ? "Zapisz widget" : "Zapisz zmiany"}
          </Button>
        </div>
      </div>
    </form>
  );
}
