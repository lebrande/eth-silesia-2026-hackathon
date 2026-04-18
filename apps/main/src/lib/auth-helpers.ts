import "server-only";
import { auth } from "@/auth";

/**
 * Zwraca aktualnego zalogowanego usera albo rzuca błąd.
 * Używane w server actions zamiast ręcznego sprawdzania w każdym miejscu.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}
