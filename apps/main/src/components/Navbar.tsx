import Link from "next/link";

export function Navbar() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <Link href="/" className="text-lg font-semibold">
        Eth Silesia
      </Link>
      <Link
        href="/login"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Zaloguj
      </Link>
    </header>
  );
}
