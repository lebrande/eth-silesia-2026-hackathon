import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function Navbar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
      <Link href="/" aria-label="TAURON — strona główna">
        <BrandLogo />
      </Link>
      <Link
        href="/login"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Zaloguj
      </Link>
    </header>
  );
}
