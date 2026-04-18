import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { listCustomTools } from "@/lib/server/custom-tools";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/separator";
import { formatRelative } from "@/lib/utils";
import { ArrowRight, Plus, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ToolsListPage() {
  const tools = await listCustomTools();
  const active = tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom tools"
        description="Twórz własne funkcje (np. wyliczanie kosztu zużycia prądu), których będzie używał agent asystenta. Formuły wykonują się przez mathjs, parametry są walidowane per wywołanie."
        actions={
          <Button asChild>
            <Link href="/tools/new">
              <Plus className="h-4 w-4" />
              Nowe narzędzie
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Wrench className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Wszystkich
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                {tools.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Aktywne
            </div>
            <div className="text-2xl font-semibold tabular-nums mt-0.5">
              {active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Wyłączone
            </div>
            <div className="text-2xl font-semibold tabular-nums mt-0.5">
              {tools.length - active}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista narzędzi</CardTitle>
          <CardDescription>
            Agent widzi tylko aktywne narzędzia i może je wywoływać w każdej
            rozmowie na stronie Asystent AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tools.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Brak custom tools"
                description="Zdefiniuj pierwszą własną funkcję — np. wyliczanie miesięcznego kosztu prądu (kwh * tariff + fixed_fee)."
                icon={<Wrench className="h-8 w-8" />}
                action={
                  <Button asChild>
                    <Link href="/tools/new">
                      <Plus className="h-4 w-4" />
                      Nowe narzędzie
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tools.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tools/${t.id}`}
                    className="group flex items-start gap-4 px-4 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <code className="font-mono text-sm font-semibold">
                          {t.name}
                        </code>
                        {t.enabled ? (
                          <Badge variant="success">aktywne</Badge>
                        ) : (
                          <Badge variant="muted">wyłączone</Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          zaktualizowane {formatRelative(t.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/85 line-clamp-2">
                        {t.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-mono">
                          ({t.parameters.map((p) => `${p.name}:${p.type}`).join(", ") || "no params"})
                        </span>
                        <code className="font-mono">= {t.formula}</code>
                      </div>
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
