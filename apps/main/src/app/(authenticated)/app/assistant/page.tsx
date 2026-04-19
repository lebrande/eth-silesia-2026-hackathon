import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AssistantChatPanel } from "@/components/assistant/chat-panel";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col gap-4">
      <div className="shrink-0">
        <PageHeader title="Asystent AI" />
      </div>

      <details className="group shrink-0 rounded-lg border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium hover:bg-muted/40">
          <span>Co potrafi agent?</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
                "list_recent_conversations — filtr po przekazaniach do operatora, flagach, wyszukiwaniu",
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
          </div>
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Agent zawsze prosi o potwierdzenie przed zapisem w FAQ i sprawdza
            czy nie tworzy duplikatu.
          </div>
        </div>
      </details>

      <div className="min-h-0 flex-1">
        <AssistantChatPanel initialThreadId={null} />
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
