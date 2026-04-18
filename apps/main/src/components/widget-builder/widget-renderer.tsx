import type {
  WidgetLeafNode,
  WidgetNode,
  WidgetSpec,
} from "@/lib/widget-builder/schema";
import { cn } from "@/lib/utils";
import { WidgetChart } from "./nodes/chart-node.client";

const toneText: Record<string, string> = {
  default: "text-slate-800",
  muted: "text-slate-500",
  warning: "text-amber-700",
  success: "text-emerald-700",
  danger: "text-rose-700",
};

const badgeVariant: Record<string, string> = {
  default: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

const alertVariant: Record<string, string> = {
  info: "bg-sky-50 text-sky-900 border-sky-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-900 border-rose-200",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
};

const buttonVariant: Record<string, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  secondary:
    "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
};

const progressTone: Record<string, string> = {
  default: "bg-slate-800",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

function Header({ node }: { node: Extract<WidgetLeafNode, { kind: "header" }> }) {
  const level = node.level ?? 2;
  const classes = cn(
    "font-semibold text-slate-900",
    level === 1 && "text-lg",
    level === 2 && "text-base",
    level === 3 && "text-sm uppercase tracking-wide text-slate-500",
  );
  if (level === 1) return <h3 className={classes}>{node.text}</h3>;
  if (level === 2) return <h4 className={classes}>{node.text}</h4>;
  return <h5 className={classes}>{node.text}</h5>;
}

function Paragraph({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "paragraph" }>;
}) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed",
        toneText[node.tone ?? "default"],
      )}
    >
      {node.text}
    </p>
  );
}

function ListNode({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "list" }>;
}) {
  const cls = "ml-4 space-y-1 text-sm text-slate-700";
  return node.ordered ? (
    <ol className={cn(cls, "list-decimal")}>
      {node.items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  ) : (
    <ul className={cn(cls, "list-disc")}>
      {node.items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function KeyValue({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "keyValue" }>;
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
      {node.items.map((it, i) => (
        <div key={i} className="contents">
          <dt className="text-slate-500">{it.label}</dt>
          <dd className="text-right font-medium text-slate-900">
            <div>{it.value}</div>
            {it.hint ? (
              <div className="text-xs font-normal text-slate-400">
                {it.hint}
              </div>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Badge({ node }: { node: Extract<WidgetLeafNode, { kind: "badge" }> }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        badgeVariant[node.variant ?? "default"],
      )}
    >
      {node.label}
    </span>
  );
}

function TableNode({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "table" }>;
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin rounded-lg border border-slate-200">
      <table className="w-full min-w-max text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {node.columns.map((c, i) => (
              <th key={i} className="px-2 py-1.5 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {node.rows.map((row, ri) => (
            <tr
              key={ri}
              className={cn(
                ri === node.highlightRow &&
                  "bg-amber-50 font-medium text-amber-900",
              )}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1.5 text-slate-700">
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chart({ node }: { node: Extract<WidgetLeafNode, { kind: "chart" }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <WidgetChart
        type={node.type}
        xKey={node.xKey}
        yKeys={node.yKeys}
        data={node.data}
      />
      {node.caption ? (
        <div className="mt-1 text-center text-xs text-slate-500">
          {node.caption}
        </div>
      ) : null}
    </div>
  );
}

function Actions({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "actions" }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {node.buttons.map((b, i) => (
        <button
          key={i}
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            buttonVariant[b.variant ?? "primary"],
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

function Attachment({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "attachment" }>;
}) {
  const iconChar =
    node.icon === "pdf" ? "PDF" : node.icon === "image" ? "IMG" : "FILE";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded bg-rose-50 text-[10px] font-bold text-rose-700">
        {iconChar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">
          {node.filename}
        </div>
        {node.sizeLabel ? (
          <div className="text-xs text-slate-500">{node.sizeLabel}</div>
        ) : null}
      </div>
    </div>
  );
}

function Image({ node }: { node: Extract<WidgetLeafNode, { kind: "image" }> }) {
  const ratio =
    node.ratio === "square"
      ? "aspect-square"
      : node.ratio === "wide"
        ? "aspect-[21/9]"
        : "aspect-video";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-slate-100",
        ratio,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={node.src}
        alt={node.alt ?? ""}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function Progress({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "progress" }>;
}) {
  const max = node.max ?? 100;
  const pct = Math.max(0, Math.min(100, (node.value / max) * 100));
  return (
    <div>
      {node.label ? (
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>{node.label}</span>
          <span className="font-medium text-slate-800">
            {Math.round(pct)}%
          </span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            progressTone[node.tone ?? "default"],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Timeline({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "timeline" }>;
}) {
  return (
    <ol className="space-y-2.5">
      {node.items.map((it, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <div
            className={cn(
              "mt-1 h-2 w-2 flex-none rounded-full",
              it.highlight ? "bg-amber-500" : "bg-slate-300",
            )}
          />
          <div className="flex-1">
            <div
              className={cn(
                it.highlight ? "font-medium text-slate-900" : "text-slate-700",
              )}
            >
              {it.label}
            </div>
            <div className="text-xs text-slate-400">{it.time}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Alert({ node }: { node: Extract<WidgetLeafNode, { kind: "alert" }> }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 text-sm",
        alertVariant[node.tone],
      )}
    >
      {node.title ? <div className="font-semibold">{node.title}</div> : null}
      <div className={cn(node.title && "mt-0.5")}>{node.text}</div>
    </div>
  );
}

function FormField({
  node,
}: {
  node: Extract<WidgetLeafNode, { kind: "formField" }>;
}) {
  const id = `field-${node.name}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-slate-700"
      >
        {node.label}
      </label>
      {node.type === "select" ? (
        <select
          id={id}
          name={node.name}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
          defaultValue=""
        >
          <option value="" disabled>
            {node.placeholder ?? "Wybierz…"}
          </option>
          {(node.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : node.type === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name={node.name} className="rounded" />
          {node.placeholder ?? node.label}
        </label>
      ) : (
        <input
          id={id}
          type="text"
          name={node.name}
          placeholder={node.placeholder}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
        />
      )}
      {node.hint ? (
        <div className="mt-1 text-xs text-slate-400">{node.hint}</div>
      ) : null}
    </div>
  );
}

function renderLeaf(node: WidgetLeafNode, key: number) {
  switch (node.kind) {
    case "header":
      return <Header key={key} node={node} />;
    case "paragraph":
      return <Paragraph key={key} node={node} />;
    case "list":
      return <ListNode key={key} node={node} />;
    case "keyValue":
      return <KeyValue key={key} node={node} />;
    case "badge":
      return <Badge key={key} node={node} />;
    case "table":
      return <TableNode key={key} node={node} />;
    case "chart":
      return <Chart key={key} node={node} />;
    case "actions":
      return <Actions key={key} node={node} />;
    case "attachment":
      return <Attachment key={key} node={node} />;
    case "image":
      return <Image key={key} node={node} />;
    case "progress":
      return <Progress key={key} node={node} />;
    case "timeline":
      return <Timeline key={key} node={node} />;
    case "alert":
      return <Alert key={key} node={node} />;
    case "formField":
      return <FormField key={key} node={node} />;
  }
}

function renderNode(node: WidgetNode, key: number) {
  if (node.kind === "columns") {
    return (
      <div key={key} className="overflow-x-auto scrollbar-thin -mx-1 px-1">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${node.count}, minmax(140px, 1fr))`,
            minWidth: `${node.count * 140}px`,
          }}
        >
          {node.children.map((col, ci) => (
            <div key={ci} className="space-y-2 min-w-0">
              {col.map((leaf, li) => renderLeaf(leaf, li))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return renderLeaf(node, key);
}

export function WidgetRenderer({ spec }: { spec: WidgetSpec }) {
  return (
    <div className="space-y-3">
      {spec.title ? (
        <div className="text-base font-semibold text-slate-900">
          {spec.title}
        </div>
      ) : null}
      {spec.intro ? (
        <p className="text-sm text-slate-600">{spec.intro}</p>
      ) : null}
      {spec.nodes.map((n, i) => renderNode(n, i))}
      {spec.footer ? (
        <p className="text-xs text-slate-400">{spec.footer}</p>
      ) : null}
    </div>
  );
}
