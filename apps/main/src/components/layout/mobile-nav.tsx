"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarBrand,
  SidebarNavLinks,
} from "@/components/layout/sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const drawer = (
    <div
      className={cn(
        "md:hidden fixed inset-0 z-100 transition-opacity",
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Zamknij menu"
        tabIndex={open ? 0 : -1}
        onClick={close}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />

      <aside
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu aplikacji"
        className={cn(
          "absolute inset-y-0 left-0 w-72 max-w-[85%] flex flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative shrink-0">
          <SidebarBrand />
          <button
            type="button"
            onClick={close}
            aria-label="Zamknij menu"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/75 hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <SidebarNavLinks onNavigate={close} />
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Otwórz menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/75 hover:text-foreground hover:bg-muted/70 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
