import Link from "next/link";
import { BRAND } from "@/branding/config";

export function Navbar() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <Link href="/" className="text-lg font-semibold">
        {BRAND.name}
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
