export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImprovementForm } from "./ImprovementForm";
import { NoSchool } from "@/components/report/NoSchool";
import { ReportShell } from "@/components/report/ReportShell";

type Row = { fault?: string; urgency?: string };
type ConsultingPayload = { sections?: Record<string, Row[]> };

/** 저장되는 PDF 파일명·브라우저 탭에 쓰인다 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school } = await searchParams;
  return { title: school ? `개선보고서 - ${school}` : "개선보고서" };
}

export default async function ImprovementPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { school: schoolName } = await searchParams;

  const record = schoolName
    ? await prisma.school.findUnique({
        where: { name: schoolName },
        include: {
          reports: {
            where: { type: { in: ["IMPROVEMENT", "CONSULTING"] } },
            orderBy: { updatedAt: "desc" },
          },
        },
      })
    : null;

  if (!record) {
    return (
      <ReportShell session={session}>
        <div style={{ padding: 32 }}>
          <NoSchool />
        </div>
      </ReportShell>
    );
  }

  const existing = record.reports.find((r) => r.type === "IMPROVEMENT") ?? null;

  // 1차 컨설팅 지적사항 → 개선 항목으로 바로 불러오기
  const r1 = record.reports.find((r) => r.type === "CONSULTING" && (r.round ?? 1) === 1);
  const sections = (r1?.payload as ConsultingPayload)?.sections ?? {};
  const faults: { fault: string; facility: string; urgency?: string }[] = [];
  for (const [facility, rows] of Object.entries(sections)) {
    for (const row of rows ?? []) {
      if (row.fault) faults.push({ fault: row.fault, facility, urgency: row.urgency });
    }
  }
  const codeRows = faults.length
    ? await prisma.code.findMany({ where: { code: { in: [...new Set(faults.map((f) => f.fault))] } } })
    : [];
  const codeName = new Map(codeRows.map((c) => [c.code, c.name]));

  const issues = [
    ...new Set(faults.map((f) => `${codeName.get(f.fault) ?? f.fault} — ${f.facility}`)),
  ].slice(0, 8);

  return (
    <ReportShell session={session}>
      <ImprovementForm
        school={record.name}
        office={record.educationOffice ? `서울특별시${record.educationOffice}교육지원청` : null}
        district={record.district}
        initial={(existing?.payload as never) ?? null}
        initialStatus={existing?.status ?? null}
        issues={issues}
      />
    </ReportShell>
  );
}
