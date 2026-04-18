import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto flex justify-between items-center px-6 h-14">
          <span className="text-[15px] font-semibold tracking-tight">
            Eth Silesia
          </span>
          <div className="flex items-center gap-8">
            <span className="text-[13px] leading-none text-gray-400">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
              className="flex"
            >
              <button
                type="submit"
                className="text-[13px] leading-none text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
