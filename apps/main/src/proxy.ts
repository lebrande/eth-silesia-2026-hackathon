import { auth } from "@/auth";

const PUBLIC_PATHS = ["/", "/login"];

export const proxy = auth((req) => {
  if (!req.auth && !PUBLIC_PATHS.includes(req.nextUrl.pathname)) {
    const newUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
