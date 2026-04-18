import { PageHeader } from "@/components/layout/page-header";
import { AssistantChatPanel } from "@/components/assistant/chat-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Asystent AI"
        description={
          <>
            Rozmawiaj z agentem, który ma dostęp do FAQ, rozmów klientów i
            metryk. Pomaga dopisywać brakujące FAQ, znajduje wątki po
            filtrach i potrafi flagować problematyczne odpowiedzi AI.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <AssistantChatPanel initialThreadId={null} />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Co potrafi agent?</CardTitle>
            <CardDescription>
              Agent jest podpięty do tej samej bazy co reszta backoffice.
              Wszystkie akcje zapisują się natychmiast w Postgresie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Section
              title="FAQ"
              items={[
                "search_faq — wyszukaj po pytaniu, treści, tagach, kategorii",
                "get_faq — pełna treść po id",
                "create_faq / update_faq / delete_faq — modyfikacja bazy",
              ]}
            />
            <Section
              title="Rozmowy"
              items={[
                "list_recent_conversations — filtr po eskalacji, flagach, wyszukiwaniu",
                "get_conversation — pełna historia wiadomości z LangGraph",
                "flag_message — oznaczenie wiadomości AI jako problematycznej",
              ]}
            />
            <Section
              title="Analityka"
              items={[
                "get_dashboard_stats — KPI 30 dni",
                "get_problematic_questions — ranking braków w FAQ",
              ]}
            />
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Agent zawsze prosi o potwierdzenie przed zapisem w FAQ i
              sprawdza czy nie tworzy duplikatu.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-0.5 text-[13px] leading-relaxed text-foreground/85">
        {items.map((i) => (
          <li key={i} className="before:mr-1.5 before:content-['•']">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
