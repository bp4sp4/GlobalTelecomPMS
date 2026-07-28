import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * 로그아웃은 POST 전용.
 *
 * GET으로 두면 <Link href="/api/auth/logout"> 프리페치나 브라우저의 링크
 * 미리 가져오기가 이를 호출해 사용자가 클릭하지 않아도 세션이 삭제된다.
 * (실제로 대시보드 진입만 해도 로그아웃되는 버그가 있었다.)
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

// GET은 세션을 건드리지 않고 로그인 화면으로만 보낸다(안전).
export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/login", req.url));
}
