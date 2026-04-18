import { LoginForm } from "@/components/auth/login-form";
import { Bot } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Bot className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold">Backoffice AI</span>
              <span className="text-xs text-muted-foreground">
                ETH Silesia 2026 · live data
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Zaloguj się do panelu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Użyj konta z tabeli <code className="font-mono text-xs">users</code>
            . Nowe konto założysz komendą{" "}
            <code className="font-mono text-xs">pnpm db:seed-user</code> w
            apps/main.
          </p>

          <LoginForm className="mt-8" />

          <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground/80 uppercase tracking-wider text-[10px]">
              Konto seedowane domyślnie
            </div>
            <div className="flex justify-between gap-4 font-mono">
              <span>admin@eth-silesia.local</span>
              <span>admin123</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-[oklch(0.4_0.2_280)] text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.15] [background:radial-gradient(circle_at_30%_20%,white,transparent_45%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="text-sm/6 font-medium opacity-80">
            ETH Silesia 2026 · Hackathon
          </div>
          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight leading-tight">
              Zamknij pętlę obsługi klienta.
            </h2>
            <p className="text-sm/6 opacity-85">
              AI rozmawia z klientami, my widzimy gdzie się gubi, a człowiek
              uzupełnia wiedzę. Backoffice AI daje zespołowi operacyjnemu
              dashboard, listę problematycznych pytań i bazę FAQ w jednym
              panelu — wszystko z jednej bazy Postgres współdzielonej z
              agentem LangGraph.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <Stat label="chat_sessions" value="live" />
            <Stat label="langgraph checkpoint" value="live" />
            <Stat label="FAQ / flags" value="live" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2.5">
      <div className="text-lg font-semibold">{value}</div>
      <div className="opacity-75">{label}</div>
    </div>
  );
}
