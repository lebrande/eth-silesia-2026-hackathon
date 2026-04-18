import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";
import { BRAND } from "@/branding/config";

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");

  const searchParams = await props.searchParams;
  const error = searchParams.error;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        className="w-full max-w-sm space-y-4 rounded-lg border p-8"
        action={async (formData) => {
          "use server";
          try {
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/app/dashboard",
            });
          } catch (error) {
            if (error instanceof AuthError) {
              return redirect(`/login?error=${error.type}`);
            }
            throw error;
          }
        }}
      >
        <h1 className="text-2xl font-semibold">{BRAND.fullName}</h1>

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-600">
            Invalid email or password
          </p>
        )}

        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full cursor-pointer rounded bg-black py-2 text-white hover:bg-gray-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
