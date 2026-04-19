"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BRAND } from "@/branding/config";
import { BrandLogo } from "@/components/brand-logo";
import { NAV_ITEMS } from "@/components/layout/nav-items";

export function SidebarNavLinks({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {NAV_ITEMS.map((it) => {
        const active =
          pathname === it.href || pathname.startsWith(`${it.href}/`);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
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
  );
}

export function SidebarBrand() {
  return (
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
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <SidebarBrand />
      <SidebarNavLinks />
    </aside>
  );
}
