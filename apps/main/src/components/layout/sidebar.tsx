"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  AlertCircle,
  BookOpen,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/branding/config";
import { BrandLogo } from "@/components/brand-logo";

const items = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/assistant", label: "Asystent AI", icon: Sparkles },
  { href: "/app/conversations", label: "Rozmowy", icon: MessagesSquare },
  { href: "/app/problems", label: "Problematyczne pytania", icon: AlertCircle },
  { href: "/app/faq", label: "Baza wiedzy (FAQ)", icon: BookOpen },
  { href: "/app/tools", label: "Widgety agenta", icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border">
        <BrandLogo size="sm" />
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
    </aside>
  );
}
