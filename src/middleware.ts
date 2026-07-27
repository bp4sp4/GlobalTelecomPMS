import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me"
);

// 로그인 필요 경로
const PROTECTED = ["/dashboard", "/docs", "/pms", "/system"];
// ADMIN 전용 경로
const ADMIN_ONLY = ["/system"];

async function getPayload(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { sub: string; role: "ADMIN" | "GUEST" };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const payload = await getPayload(req);
  if (!payload) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  const adminOnly = ADMIN_ONLY.some((p) => pathname.startsWith(p));
  if (adminOnly && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/docs/:path*", "/pms/:path*", "/system/:path*"],
};
