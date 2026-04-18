"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  AlertCircle,
  BookOpen,
  Bot,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/branding/config";

const items = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/assistant", label: "Asystent AI", icon: Sparkles },
  { href: "/app/conversations", label: "Rozmowy", icon: MessagesSquare },
  { href: "/app/problems", label: "Problematyczne pytania", icon: AlertCircle },
  { href: "/app/faq", label: "Baza wiedzy (FAQ)", icon: BookOpen },
  { href: "/app/tools", label: "Custom tools", icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
          <Bot className="h-4.5 w-4.5" strokeWidth={2.25} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">
            {BRAND.backoffice.productLabel}
          </span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
            {BRAND.backoffice.tenantLabel}
          </span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(`${it.href}/`);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/75 hover:text-foreground hover:bg-muted/70",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="rounded-lg bg-muted/60 p-3 text-[11px] text-muted-foreground leading-snug">
          <div className="font-medium text-foreground/80 mb-0.5">Live data</div>
          Dane pobierane wprost z czatowego Postgresa (LangGraph checkpoints +
          chat_sessions + FAQ).
        </div>
      </div>
    </aside>
  );
}
