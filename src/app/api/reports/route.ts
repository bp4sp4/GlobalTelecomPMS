import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity, REPORT_TYPE_LABEL } from "@/lib/activityLog";
import type { ReportType, ReportStatus } from "@prisma/client";

const TYPES = ["CONSULTING", "EQUIPMENT", "SPEAKERLINE", "IMPROVEMENT", "PHOTOS"];

// GET /api/reports?school=&type=&round=&status=
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const school = searchParams.get("school");
  const type = searchParams.get("type") as ReportType | null;
  const roundRaw = searchParams.get("round");
  const status = searchParams.get("status") as ReportStatus | null;

  const where: Record<string, unknown> = {};
  if (school) {
    const s = await prisma.school.findUnique({ where: { name: school } });
    if (!s) return NextResponse.json([]);
    where.schoolId = s.id;
  }
  if (type && TYPES.includes(type)) where.type = type;
  if (roundRaw) where.round = Number(roundRaw);
  if (status) where.status = status;

  const reports = await prisma.report.findMany({
    where,
    include: { school: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(reports);
}

// POST /api/reports  { school, type, round?, payload, status }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "잘못된 요청" }, { status: 400 });

  const { school, type, round, payload, status } = body as {
    school: string;
    type: ReportType;
    round?: number | null;
    payload: unknown;
    status?: ReportStatus;
  };

  if (!school || !TYPES.includes(type)) {
    return NextResponse.json({ message: "school/type 필요" }, { status: 400 });
  }
  const s = await prisma.school.findUnique({ where: { name: school } });
  if (!s) return NextResponse.json({ message: "학교 없음" }, { status: 404 });

  const nextStatus: ReportStatus = status === "DONE" ? "DONE" : "DRAFT";
  const roundVal = type === "CONSULTING" ? round ?? 1 : null;

  // 기존 보고서(같은 학교+종류+회차) 찾아 upsert
  const existing = await prisma.report.findFirst({
    where: { schoolId: s.id, type, round: roundVal },
  });

  const data = {
    payload: payload as object,
    status: nextStatus,
    createdById: session.sub,
    completedAt: nextStatus === "DONE" ? new Date() : null,
  };

  const report = existing
    ? await prisma.report.update({ where: { id: existing.id }, data })
    : await prisma.report.create({
        data: { schoolId: s.id, type, round: roundVal, ...data },
      });

  logActivity({
    session,
    req,
    action: nextStatus === "DONE" ? "COMPLETE" : existing ? "UPDATE" : "CREATE",
    entity: "REPORT",
    entityId: report.id,
    target: `${school} · ${REPORT_TYPE_LABEL[type] ?? type}${roundVal ? ` ${roundVal}차` : ""}`,
    detail: nextStatus === "DONE" ? "완료 처리" : existing ? "저장(초안) 수정" : "새로 작성",
  });

  return NextResponse.json({ ok: true, report });
}
