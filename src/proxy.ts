import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic redirect based on the session cookie only — real enforcement
// happens in requireUser() (pages) and getSessionUser() (API routes).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const hasCookie = !!getSessionCookie(request);

  if (!hasCookie && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|ico|svg)$).*)"],
};
