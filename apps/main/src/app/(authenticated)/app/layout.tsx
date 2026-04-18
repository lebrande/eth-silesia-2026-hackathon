import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { BackofficeUser } from "@/lib/types";
import { BRAND } from "@/branding/config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let user: BackofficeUser;

  if (session.user.id === "admin") {
    user = {
      id: "admin",
      email: session.user.email ?? "admin@ethsilesia.pl",
      name: session.user.name ?? "Admin",
    };
  } else {
    const [row] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!row) redirect("/login");

    user = {
      id: row.id,
      email: row.email,
      name: row.name,
    };
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
