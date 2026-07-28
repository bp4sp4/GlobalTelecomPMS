import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const messages = await prisma.message.findMany({
    include: { author: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const content = (body?.content ?? "").trim();
  if (!content) return NextResponse.json({ message: "내용을 입력하세요." }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ message: "최대 1000자" }, { status: 400 });

  const msg = await prisma.message.create({
    data: { authorId: session.sub, content },
    include: { author: { select: { username: true } } },
  });
  logActivity({
    session,
    req,
    action: "CREATE",
    entity: "MESSAGE",
    entityId: msg.id,
    target: "공지/메모",
    detail: content.length > 60 ? `${content.slice(0, 60)}…` : content,
  });

  return NextResponse.json({ ok: true, message: msg });
}
