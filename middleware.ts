import { NextRequest, NextResponse } from "next/server";
import { verifyRequestSession, hasRequiredRole, type UserRole } from "./src/lib/auth-server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateStore = new Map<string, { count: number; ts: number }>();

function rateLimitIp(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const entry = rateStore.get(ip);
  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    rateStore.set(ip, { count: 1, ts: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/client") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/manager") ||
    pathname.startsWith("/trainer") ||
    pathname.startsWith("/api")
  );
}

function requiredRolesForPath(pathname: string): UserRole[] | null {
  if (pathname.startsWith("/admin")) return ["admin"];
  if (pathname.startsWith("/manager")) return ["manager"];
  if (pathname.startsWith("/trainer")) return ["trainer", "admin"];
  if (pathname.startsWith("/client")) return ["user", "trainer", "admin", "manager"];
  return null;
}

function homeForRole(role: UserRole): string {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "manager": return "/manager/dashboard";
    case "trainer": return "/trainer/dashboard";
    default: return "/client/dashboard";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const ip = req.ip ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (rateLimitIp(ip)) return new NextResponse("Too Many Requests", { status: 429 });

  // CSRF — исключаем /api/auth/session (создание/удаление сессии и CSRF-токена)
  const csrfExempt = pathname === "/api/auth/session";
  if (!csrfExempt && req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS" && pathname.startsWith("/api")) {
    const csrfHeader = req.headers.get("x-csrf-token");
    const csrfCookie = req.cookies.get("hsc_csrf")?.value;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return new NextResponse("CSRF validation failed", { status: 403 });
    }
  }

  if (!isProtectedPath(pathname)) return NextResponse.next();

  const session = await verifyRequestSession(req);

  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRoles = requiredRolesForPath(pathname);
  if (requiredRoles && !hasRequiredRole(session, requiredRoles)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = homeForRole(session.role);
    return NextResponse.redirect(redirectUrl);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-hsc-user-id", session.uid);
  if (session.email) requestHeaders.set("x-hsc-user-email", session.email);
  requestHeaders.set("x-hsc-user-role", session.role);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://firebasestorage.googleapis.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com wss://*.firebaseio.com",
    "frame-ancestors 'none'"
  ].join("; "));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"]
};
