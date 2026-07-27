import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  let body: { username?: string; password?: string; remember?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json(
      { message: "아이디와 비밀번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
  try {
    user = await prisma.user.findUnique({ where: { username } });
  } catch (e) {
    console.error("login DB error:", e);
    return NextResponse.json(
      { message: "서버 오류: 데이터베이스에 연결할 수 없습니다. (DATABASE_URL 확인)" },
      { status: 500 }
    );
  }
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json(
      { message: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const maxAge = body.remember ? 60 * 60 * 24 * 7 : 60 * 60 * 8; // 7일 or 8시간
  const token = await createSessionToken(
    { sub: user.id, username: user.username, role: user.role, name: user.name },
    maxAge
  );

  // 접속 로그 (원격 접속 목록용)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  await prisma.accessLog.create({ data: { userId: user.id, ip } }).catch(() => null);

  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, role: user.role, name: user.name },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return res;
}
