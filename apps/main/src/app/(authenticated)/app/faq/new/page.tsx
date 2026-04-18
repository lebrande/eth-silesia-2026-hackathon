import Link from "next/link";
import { listFaqs } from "@/lib/server/faq.server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqForm } from "@/components/faq/faq-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewFaqPage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string }>;
}) {
  const params = await searchParams;
  const existingFaqs = await listFaqs();
  const categories = Array.from(
    new Set(existingFaqs.map((f) => f.category)),
  ).sort();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/app/faq"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Wróć do FAQ
        </Link>
        <PageHeader
          title="Nowy wpis FAQ"
          description="Dodaj pytanie i odpowiedź, z której będzie korzystał AI. Pola Kategoria i Tagi pomagają w wyszukiwaniu i segmentacji."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treść wpisu</CardTitle>
        </CardHeader>
        <CardContent>
          <FaqForm
            mode="create"
            categories={categories}
            initial={{
              question: params.question ?? "",
              answer: "",
              tags: [],
              category: "",
              language: "pl",
              source: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
