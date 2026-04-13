import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for authentication
 * - Checks for auth_token in cookies/headers
 * - Redirects to login if accessing protected routes without token
 * - Allows public routes
 */

const publicRoutes = ["/", "/login", "/auth/callback", "/quests", "/editor", "/dashboard"];
const protectedRoutes: string[] = [];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for authentication token
  const token =
    request.cookies.get("auth_token")?.value ||
    request.headers.get("authorization")?.split("Bearer ")[1];

  // If no token and trying to access protected route, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
