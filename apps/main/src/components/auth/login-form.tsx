"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { loginAction, type LoginState } from "@/lib/actions/auth.action";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export function LoginForm({ className }: { className?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue="admin@eth-silesia.local"
          placeholder="ty@firma.pl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue="admin123"
        />
      </div>

      {state?.error ? (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs p-2.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
