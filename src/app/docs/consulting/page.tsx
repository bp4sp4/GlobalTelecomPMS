export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { docsNav } from "@/lib/nav";
import { loadReportContext } from "@/lib/reportServer";
import { NoSchool } from "@/components/report/NoSchool";
import { prisma } from "@/lib/prisma";
import s from "@/components/report/report.module.css";

export default async function ConsultingEntry({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school: schoolName } = await searchParams;
  const { school } = await loadReportContext(schoolName, "CONSULTING", 1);

  let r1 = null, r2 = null;
  if (school) {
    const s0 = await prisma.school.findUnique({ where: { name: school.name } });
    if (s0) {
      r1 = await prisma.report.findFirst({ where: { schoolId: s0.id, type: "CONSULTING", round: 1 } });
      r2 = await prisma.report.findFirst({ where: { schoolId: s0.id, type: "CONSULTING", round: 2 } });
    }
  }

  const badge = (r: { status: string } | null) =>
    !r ? <span className={`${s.badge} ${s.badgeDraft}`}>미작성</span>
      : <span className={`${s.badge} ${r.status === "DONE" ? s.badgeDone : s.badgeDraft}`}>{r.status === "DONE" ? "완료" : "저장(초안)"}</span>;

  return (
    <AppShell brand={{ title: "문서관리", subtitle: "보고서/목록 관리" }} sections={docsNav()}>
      {!school ? (
        <NoSchool />
      ) : (
        <>
          <div className={s.head}>
            <div><h1 className={s.title}>방송장비 컨설팅 보고서</h1><p className={s.subtitle}>{school.name} · 1차/2차 회차별 작성</p></div>
            <Link href="/docs" className={s.btn}>문서관리 홈</Link>
          </div>
          <div className={s.panel}>
            <h2 className={s.panelTitle}>1차 컨설팅 {badge(r1)}</h2>
            <Link href={`/pms/consulting/new?school=${encodeURIComponent(school.name)}&round=1`} className={`${s.btn} ${s.btnPrimary}`}>
              1차 작성/수정
            </Link>
          </div>
          <div className={s.panel}>
            <h2 className={s.panelTitle}>2차 컨설팅 {badge(r2)}</h2>
            <Link href={`/pms/consulting/new?school=${encodeURIComponent(school.name)}&round=2`} className={`${s.btn} ${s.btnPrimary}`}>
              2차 작성/수정
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}