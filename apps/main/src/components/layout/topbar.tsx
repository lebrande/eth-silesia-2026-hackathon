import { logoutAction } from "@/lib/actions/auth.action";
import { LogOut } from "lucide-react";
import type { BackofficeUser } from "@/lib/types";

export function Topbar({ user, title }: { user: BackofficeUser; title?: string }) {
  const label = user.name || user.email || "user";
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card/60 backdrop-blur-sm flex items-center px-4 md:px-6 gap-4">
      <div className="flex-1 min-w-0">
        {title ? (
          <h1 className="text-base font-semibold tracking-tight truncate">
            {title}
          </h1>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
            {initials}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{user.name ?? user.email}</span>
            {user.name ? (
              <span className="text-[11px] text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title="Wyloguj"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Wyloguj</span>
          </button>
        </form>
      </div>
    </header>
  );
}
