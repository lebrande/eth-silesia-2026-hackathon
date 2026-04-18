import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BRAND } from "@/branding/config";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center bg-primary/10 px-4 py-10">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[url('/login-bg.jpg')] bg-cover bg-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-black/55 to-black/25"
      />
      <div className="w-full max-w-sm rounded-xl bg-card/95 p-8 shadow-xl backdrop-blur-sm card-shadow">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo size="lg" />
          <h1 className="text-xl font-semibold">{BRAND.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            Zaloguj się, aby kontynuować
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
