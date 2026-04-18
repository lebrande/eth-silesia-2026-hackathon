import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getFaq, listFaqs } from "@/lib/server/faq";
import { deleteFaqAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaqForm } from "@/components/faq/faq-form";
import { ArrowLeft, Trash2, Clock, UserRound } from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FaqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const faq = await getFaq(id);
  if (!faq) notFound();

  let createdBy: { name: string | null; email: string } | null = null;
  if (faq.createdByUserId) {
    const [row] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, faq.createdByUserId))
      .limit(1);
    createdBy = row ?? null;
  }

  const categories = Array.from(
    new Set((await listFaqs()).map((f) => f.category)),
  ).sort();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/faq"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Wróć do FAQ
        </Link>
        <PageHeader
          title="Edycja FAQ"
          description={faq.question}
          actions={
            <form action={deleteFaqAction}>
              <input type="hidden" name="id" value={faq.id} />
              <Button variant="danger" type="submit" size="sm">
                <Trash2 className="h-4 w-4" />
                Usuń
              </Button>
            </form>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Treść wpisu</CardTitle>
            <CardDescription>
              Zmiany trafiają do tabeli{" "}
              <code className="font-mono text-[11px]">faq_entries</code> i są
              natychmiast widoczne dla agenta LangGraph.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FaqForm
              mode="edit"
              id={faq.id}
              categories={categories}
              initial={{
                question: faq.question,
                answer: faq.answer,
                tags: faq.tags,
                category: faq.category,
                language: faq.language,
                source: faq.source ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Metadane</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Kategoria
              </div>
              <Badge variant="default">{faq.category}</Badge>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Tagi
              </div>
              <div className="flex flex-wrap gap-1">
                {faq.tags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  faq.tags.map((t) => (
                    <Badge key={t} variant="muted">
                      #{t}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Język
              </div>
              <Badge variant="outline">{faq.language.toUpperCase()}</Badge>
            </div>
            {faq.source ? (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  Źródło
                </div>
                <div className="text-sm">{faq.source}</div>
              </div>
            ) : null}
            <div className="border-t border-border pt-3 space-y-2 text-xs text-muted-foreground">
              {createdBy ? (
                <div className="flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5" />
                  Autor: {createdBy.name ?? createdBy.email}
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Utworzono: {formatDateTime(faq.createdAt)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Zmiana: {formatRelative(faq.updatedAt)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
