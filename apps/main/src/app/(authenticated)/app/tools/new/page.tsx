import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WidgetBuilderWorkspace } from "@/components/widget-builder/workspace";

export const dynamic = "force-dynamic";

export default function NewWidgetPage() {
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
          title="Nowy widget"
          description="Opisz scenariusz klienta w czacie z lewej strony. Widget pojawia się natychmiast w podglądzie telefonu po prawej — tak go zobaczy klient na tauron.pl."
        />
      </div>

      <WidgetBuilderWorkspace mode="create" />
    </div>
  );
}
