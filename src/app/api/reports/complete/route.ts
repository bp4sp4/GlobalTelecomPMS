import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity, REPORT_TYPE_LABEL } from "@/lib/activityLog";
import type { ReportType } from "@prisma/client";

/** POST /api/reports/complete { school, type } — 해당 학교·유형 보고서를 완료 처리 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.school || !body?.type) {
    return NextResponse.json({ message: "school/type 필요" }, { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { name: body.school } });
  if (!school) return NextResponse.json({ message: "학교 없음" }, { status: 404 });

  const result = await prisma.report.updateMany({
    where: { schoolId: school.id, type: body.type as ReportType },
    data: { status: "DONE", completedAt: new Date() },
  });

  if (result.count > 0) {
    logActivity({
      session,
      req,
      action: "COMPLETE",
      entity: "REPORT",
      target: `${school.name} · ${REPORT_TYPE_LABEL[body.type] ?? body.type}`,
      detail: `${result.count}건 완료 처리`,
    });
  }

  return NextResponse.json({ ok: true, updated: result.count });
}
