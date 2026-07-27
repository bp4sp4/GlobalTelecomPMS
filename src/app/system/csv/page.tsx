import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { dashboardNav } from "@/lib/nav";
import s from "@/components/report/report.module.css";

export default async function CsvPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const [schoolCount, byOffice] = await Promise.all([
    prisma.school.count(),
    prisma.school.groupBy({ by: ["educationOffice"], _count: true }),
  ]);

  return (
    <AppShell brand={{ title: "시스템", subtitle: "학교 데이터 관리" }} sections={dashboardNav(true)}>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>학교 데이터 업로드</h1>
          <p className={s.subtitle}>관리자 전용 · 학교 마스터 현황</p>
        </div>
      </div>
      <div className={`${s.statusMsg} ${s.statusInfo}`}>
        현재 <b>{schoolCount.toLocaleString()}</b>개 학교가 등록되어 있습니다 (NEIS 기반 시드).
      </div>
      <div className={s.panel}>
        <h2 className={s.panelTitle}>지청별 학교 수</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>교육지원청</th><th>학교수</th></tr></thead>
            <tbody>
              {byOffice
                .filter((o) => o.educationOffice)
                .sort((a, b) => b._count - a._count)
                .map((o) => (
                  <tr key={o.educationOffice}><td>{o.educationOffice}</td><td>{o._count}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
