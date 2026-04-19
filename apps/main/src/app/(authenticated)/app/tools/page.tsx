import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { listWidgetDefinitions } from "@/lib/server/widget-definitions.server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/separator";
import { formatRelative } from "@/lib/utils";
import { ArrowRight, LayoutDashboard, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ToolsListPage() {
  const widgets = await listWidgetDefinitions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Widgety agenta"
        description="Kompozycje wizualne, które agent klienta może pokazać w chacie na tauron.pl. Opisujesz scenariusz w czacie z buildem, a widget generuje się automatycznie."
        actions={
          <Button asChild>
            <Link href="/app/tools/new">
              <Plus className="h-4 w-4" />
              Nowy widget
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <LayoutDashboard className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Wszystkich
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                {widgets.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista widgetów</CardTitle>
          <CardDescription>
            Każdy widget to zapisana definicja (kompozycja klocków), którą agent
            klienta może wyrenderować w odpowiedzi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {widgets.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Brak widgetów"
                description="Stwórz pierwszy widget — opisz scenariusz klienta, a builder wygeneruje gotową kompozycję (wykres, tabela, przyciski…)."
                icon={<LayoutDashboard className="h-8 w-8" />}
                action={
                  <Button asChild>
                    <Link href="/app/tools/new">
                      <Plus className="h-4 w-4" />
                      Nowy widget
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {widgets.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/app/tools/${w.id}`}
                    className="group flex items-start gap-4 px-4 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{w.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          zaktualizowany {formatRelative(w.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/85 line-clamp-2">
                        {w.description}
                      </p>
                      {w.createdByUserEmail ? (
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          autor: {w.createdByUserEmail}
                        </div>
                      ) : null}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
