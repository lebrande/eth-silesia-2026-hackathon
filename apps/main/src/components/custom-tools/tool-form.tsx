"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  createCustomToolAction,
  runCustomToolAction,
  updateCustomToolAction,
  type CustomToolFormState,
} from "@/lib/actions/custom-tools.action";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type {
  CustomToolParam,
  CustomToolParamType,
  CustomToolRow,
} from "@/lib/types";

type Initial = {
  name: string;
  description: string;
  parameters: CustomToolParam[];
  formula: string;
  responseTemplate: string;
  enabled: boolean;
};

export function CustomToolForm(
  props:
    | { mode: "create"; initial?: Partial<Initial> }
    | { mode: "edit"; tool: CustomToolRow },
) {
  const initial: Initial =
    props.mode === "create"
      ? {
          name: props.initial?.name ?? "",
          description: props.initial?.description ?? "",
          parameters:
            props.initial?.parameters ?? [
              { name: "kwh", type: "number", description: "Zużycie w kWh", required: true },
            ],
          formula: props.initial?.formula ?? "",
          responseTemplate: props.initial?.responseTemplate ?? "",
          enabled: props.initial?.enabled ?? true,
        }
      : {
          name: props.tool.name,
          description: props.tool.description,
          parameters: props.tool.parameters,
          formula: props.tool.formula,
          responseTemplate: props.tool.responseTemplate ?? "",
          enabled: props.tool.enabled,
        };

  const [params, setParams] = useState<CustomToolParam[]>(initial.parameters);
  const boundUpdate =
    props.mode === "edit"
      ? updateCustomToolAction.bind(null, props.tool.id)
      : null;

  const [state, action, pending] = useActionState<CustomToolFormState, FormData>(
    props.mode === "create" ? createCustomToolAction : boundUpdate!,
    undefined,
  );

  return (
    <form action={action} className="space-y-6">
      <input
        type="hidden"
        name="parameters"
        value={JSON.stringify(params)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nazwa narzędzia (snake_case)</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial.name}
            pattern="^[a-z][a-z0-9_]{2,49}$"
            placeholder="calculate_power_consumption"
          />
          <p className="text-[11px] text-muted-foreground">
            Tylko małe litery, cyfry i podkreślenia. 3–50 znaków.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="enabled">Status</Label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm">
            <input
              type="checkbox"
              id="enabled"
              name="enabled"
              defaultChecked={initial.enabled}
              className="h-4 w-4"
            />
            Aktywne (dostępne dla agenta)
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Opis dla agenta</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={2}
          defaultValue={initial.description}
          placeholder="Oblicza miesięczny koszt zużycia prądu dla klienta na podstawie kWh i taryfy."
        />
        <p className="text-[11px] text-muted-foreground">
          Opis trafia do LLM — pomaga mu zdecydować kiedy wywołać to narzędzie.
        </p>
      </div>

      <ParametersEditor params={params} onChange={setParams} />

      <div className="space-y-1.5">
        <Label htmlFor="formula">Formuła (mathjs)</Label>
        <Textarea
          id="formula"
          name="formula"
          required
          rows={3}
          defaultValue={initial.formula}
          className="font-mono text-[13px]"
          placeholder="kwh * tariff + fixed_fee"
        />
        <p className="text-[11px] text-muted-foreground">
          Dostępne: nazwy parametrów i funkcje mathjs (round, floor, ceil, min,
          max, abs, sqrt, pow, log…). Zabronione: import, eval, parse, simplify.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="responseTemplate">Szablon odpowiedzi (opcjonalny)</Label>
        <Textarea
          id="responseTemplate"
          name="responseTemplate"
          rows={2}
          defaultValue={initial.responseTemplate}
          placeholder="Zużycie {{kwh}} kWh przy taryfie {{tariff}} zł/kWh = {{result}} zł"
        />
        <p className="text-[11px] text-muted-foreground">
          Placeholdery: <code>{"{{nazwa_parametru}}"}</code> i{" "}
          <code>{"{{result}}"}</code>. Jeśli puste, zwrócimy sam wynik liczbowy.
        </p>
      </div>

      {state?.error ? (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs p-2.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" asChild type="button">
          <Link href="/app/tools">Anuluj</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending
            ? "Zapisywanie..."
            : props.mode === "create"
              ? "Utwórz narzędzie"
              : "Zapisz zmiany"}
        </Button>
      </div>

      {props.mode === "edit" ? (
        <TestRunSection tool={props.tool} params={params} />
      ) : null}
    </form>
  );
}

function ParametersEditor({
  params,
  onChange,
}: {
  params: CustomToolParam[];
  onChange: (next: CustomToolParam[]) => void;
}) {
  function update(i: number, patch: Partial<CustomToolParam>) {
    onChange(params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    onChange(params.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([
      ...params,
      {
        name: `param${params.length + 1}`,
        type: "number",
        description: "",
        required: true,
      },
    ]);
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Parametry wejściowe</div>
          <div className="text-[11px] text-muted-foreground">
            Każdy parametr staje się argumentem narzędzia dla agenta.
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Dodaj parametr
        </Button>
      </div>
      {params.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">
          Brak parametrów. Formuła może zwracać stałą (np. <code>42</code>),
          ale zwykle będziesz chciał(a) przyjąć dane wejściowe.
        </p>
      ) : (
        <ul className="space-y-2">
          {params.map((p, i) => (
            <li
              key={i}
              className="grid grid-cols-12 items-start gap-2 rounded-md border border-border bg-card p-2.5"
            >
              <div className="col-span-3">
                <Label className="mb-1">Nazwa</Label>
                <Input
                  value={p.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="kwh"
                />
              </div>
              <div className="col-span-2">
                <Label className="mb-1">Typ</Label>
                <Select
                  value={p.type}
                  onChange={(e) =>
                    update(i, { type: e.target.value as CustomToolParamType })
                  }
                >
                  <option value="number">number</option>
                  <option value="string">string</option>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="mb-1">Opis</Label>
                <Input
                  value={p.description ?? ""}
                  onChange={(e) =>
                    update(i, { description: e.target.value })
                  }
                  placeholder="Zużycie w kWh za miesiąc"
                />
              </div>
              <div className="col-span-2">
                <Label className="mb-1">Default</Label>
                <Input
                  value={p.default == null ? "" : String(p.default)}
                  onChange={(e) => {
                    const v = e.target.value;
                    update(i, {
                      default:
                        v === ""
                          ? null
                          : p.type === "number"
                            ? Number(v)
                            : v,
                      required: v === "",
                    });
                  }}
                  placeholder="(brak)"
                />
              </div>
              <div className="col-span-1 flex justify-end pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  aria-label="Usuń parametr"
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TestRunSection({
  tool,
  params,
}: {
  tool: CustomToolRow;
  params: CustomToolParam[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of params) {
      init[p.name] = p.default == null ? "" : String(p.default);
    }
    return init;
  });
  const [output, setOutput] = useState<
    | { ok: true; result: number | string; rendered: string }
    | { ok: false; error: string }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const visibleParams = useMemo(() => params, [params]);

  function run() {
    const args: Record<string, unknown> = {};
    for (const p of visibleParams) {
      const raw = values[p.name] ?? "";
      if (raw === "") continue;
      args[p.name] = p.type === "number" ? Number(raw) : raw;
    }
    startTransition(async () => {
      const res = await runCustomToolAction({ id: tool.id, args });
      if (res.ok) {
        setOutput({
          ok: true,
          result: res.output.result,
          rendered: res.output.rendered,
        });
      } else {
        setOutput({ ok: false, error: res.error });
      }
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-3">
      <div>
        <div className="text-sm font-medium">Test run</div>
        <div className="text-[11px] text-muted-foreground">
          Uruchamia aktualnie zapisaną wersję narzędzia (nie niezapisane zmiany
          z formularza powyżej).
        </div>
      </div>
      {visibleParams.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak parametrów.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleParams.map((p) => (
            <div key={p.name} className="space-y-1">
              <Label>
                {p.name}{" "}
                <span className="text-muted-foreground/70">({p.type})</span>
              </Label>
              <Input
                value={values[p.name] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [p.name]: e.target.value }))
                }
                placeholder={
                  p.default != null ? `domyślnie ${p.default}` : "wartość"
                }
                type={p.type === "number" ? "number" : "text"}
              />
              {p.description ? (
                <p className="text-[11px] text-muted-foreground">
                  {p.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={run}
          disabled={isPending}
        >
          <Play className="h-3.5 w-3.5" />
          {isPending ? "Liczę..." : "Uruchom"}
        </Button>
        {output ? (
          output.ok ? (
            <div className="flex-1 rounded-md bg-success/10 border border-success/25 p-2.5 text-xs">
              <div className="font-semibold text-success mb-1">
                Wynik: {String(output.result)}
              </div>
              <div className="text-foreground/80 whitespace-pre-wrap">
                {output.rendered}
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-md bg-danger/10 border border-danger/25 p-2.5 text-xs text-danger">
              {output.error}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
