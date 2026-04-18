import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WidgetBuilderWorkspace } from "@/components/widget-builder/workspace";
import { getWidgetDefinition } from "@/lib/server/widget-definitions.server";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditWidgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const widget = await getWidgetDefinition(id);
  if (!widget) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/app/tools"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Wróć do listy
        </Link>
        <PageHeader
          title={widget.name}
          description={
            <span className="text-xs">
              autor: {widget.createdByUserEmail ?? "—"} · utworzony{" "}
              {formatDateTime(widget.createdAt)} · zaktualizowany{" "}
              {formatDateTime(widget.updatedAt)}
            </span>
          }
        />
      </div>

      <WidgetBuilderWorkspace
        mode="edit"
        id={widget.id}
        initialName={widget.name}
        initialDescription={widget.description}
        initialScenario={widget.scenario}
        initialSpec={widget.spec}
      />
    </div>
  );
}
