import Link from "next/link";
import { listFaqs } from "@/lib/server/faq";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/separator";
import { formatRelative } from "@/lib/utils";
import { Search, Plus, BookOpen, ArrowRight, Tags } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FaqListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const category = params.category ?? "";
  const tag = params.tag ?? "";

  const all = await listFaqs();
  const categories = Array.from(new Set(all.map((f) => f.category))).sort();
  const tags = Array.from(new Set(all.flatMap((f) => f.tags))).sort();

  const filtered = all.filter((f) => {
    if (category && f.category !== category) return false;
    if (tag && !f.tags.includes(tag)) return false;
    if (!q) return true;
    const hay = [f.question, f.answer, f.category, ...f.tags]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Baza wiedzy (FAQ)"
        description="Wpisy, z których AI korzysta jako baza RAG. Dodawaj nowe pytania, edytuj odpowiedzi, zamykaj luki wykryte w rozmowach."
        actions={
          <Button asChild>
            <Link href="/faq/new">
              <Plus className="h-4 w-4" />
              Nowe FAQ
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Aktywnych wpisów
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                {all.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-info/15 text-info flex items-center justify-center">
              <Tags className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Kategorii
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                {categories.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
              <Tags className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Unikalnych tagów
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                {tags.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <form className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Szukaj w pytaniach i odpowiedziach..."
                className="pl-8"
              />
            </div>
            <select
              name="category"
              defaultValue={category}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="">Wszystkie kategorie</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              name="tag"
              defaultValue={tag}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="">Wszystkie tagi</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Button variant="outline" type="submit">
              Filtruj
            </Button>
          </form>

          {filtered.length === 0 ? (
            <EmptyState
              title="Brak wpisów"
              description="Dodaj pierwszy wpis FAQ lub zmień filtry wyszukiwania."
              icon={<BookOpen className="h-8 w-8" />}
              action={
                <Button asChild>
                  <Link href="/faq/new">
                    <Plus className="h-4 w-4" />
                    Nowe FAQ
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border -m-4 mt-0">
              {filtered.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/faq/${f.id}`}
                    className="group flex items-start gap-4 px-4 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default">{f.category}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          zaktualizowane {formatRelative(f.updatedAt)}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm leading-snug">
                        {f.question}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {f.answer}
                      </p>
                      {f.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {f.tags.map((t) => (
                            <Badge key={t} variant="muted">
                              #{t}
                            </Badge>
                          ))}
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
