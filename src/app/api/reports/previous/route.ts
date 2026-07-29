import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ReportType } from "@prisma/client";

/**
 * GET /api/reports/previous?school=&type=&round=
 * 불러올 수 있는 이전 문서 1건을 찾아 payload 와 함께 돌려준다.
 * - 컨설팅: 같은 학교의 직전 회차(2차면 1차)
 * - 그 외: 같은 학교·같은 종류의 가장 최근 문서 (재작성 시 지난 내용 재사용)
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const schoolName = searchParams.get("school");
  const type = searchParams.get("type") as ReportType | null;
  const round = Number(searchParams.get("round") ?? "0");

  if (!schoolName || !type) {
    return NextResponse.json({ message: "school/type 필요" }, { status: 400 });
  }

  const school = await prisma.school.findUnique({
    where: { name: schoolName },
    select: { id: true },
  });
  if (!school) return NextResponse.json({ found: false });

  const where =
    type === "CONSULTING"
      ? { schoolId: school.id, type, round: { lt: round > 0 ? round : 1 } }
      : { schoolId: school.id, type };

  const prev = await prisma.report.findFirst({
    where,
    orderBy: type === "CONSULTING" ? { round: "desc" } : { updatedAt: "desc" },
    select: { id: true, round: true, status: true, payload: true, updatedAt: true, completedAt: true },
  });

  if (!prev) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    round: prev.round,
    status: prev.status,
    at: (prev.completedAt ?? prev.updatedAt).toISOString().slice(0, 10),
    payload: prev.payload,
  });
}
