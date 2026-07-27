import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReportType } from "@prisma/client";

export type SchoolInfo = {
  name: string;
  educationOffice: string | null;
  district: string | null;
  officeFull: string | null;
};

/** 보고서 페이지 공통: 세션 확인 + 학교 정보 + 기존 보고서(payload) 로드 */
export async function loadReportContext(
  schoolName: string | undefined,
  type: ReportType,
  round?: number
) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!schoolName) {
    return { session, school: null as SchoolInfo | null, existing: null };
  }

  const s = await prisma.school.findUnique({ where: { name: schoolName } });
  if (!s) return { session, school: null as SchoolInfo | null, existing: null };

  const school: SchoolInfo = {
    name: s.name,
    educationOffice: s.educationOffice,
    district: s.district,
    officeFull: s.educationOffice ? `서울특별시${s.educationOffice}교육지원청` : null,
  };

  const existing = await prisma.report.findFirst({
    where: { schoolId: s.id, type, round: round ?? null },
    orderBy: { updatedAt: "desc" },
  });

  return { session, school, existing };
}
