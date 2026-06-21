import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/jwt";

const protectedRoutes = ["/dashboard", "/tables", "/sessions", "/history", "/customers"];
const authRoutes = ["/login", "/register"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);

  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
  const isAuthRoute = authRoutes.includes(path);

  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tables/:path*",
    "/sessions/:path*",
    "/history/:path*",
    "/customers/:path*",
    "/login",
    "/register",
  ],
};
