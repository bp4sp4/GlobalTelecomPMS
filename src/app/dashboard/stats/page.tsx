import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { dashboardNav } from "@/lib/nav";
import st from "./stats.module.css";

const OFFICES = [
  "동부", "서부", "남부", "북부", "중부", "강동송파",
  "강서양천", "강남서초", "동작관악", "성동광진", "성북강북",
];
const CONSULTING_TARGET = 300;

type OfficeStat = {
  office: string; total: number; e: number; m: number; h: number; etc: number;
  consultingDone: number; improvement: number;
};

export default async function StatsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [schoolAgg, totalSchools, reports, totalReports] = await Promise.all([
    prisma.school.groupBy({ by: ["educationOffice", "schoolLevel"], _count: true }),
    prisma.school.count(),
    prisma.report.findMany({
      select: { type: true, status: true, school: { select: { educationOffice: true } } },
    }),
    prisma.report.count(),
  ]);

  const stats: Record<string, OfficeStat> = {};
  for (const o of OFFICES) stats[o] = { office: o, total: 0, e: 0, m: 0, h: 0, etc: 0, consultingDone: 0, improvement: 0 };

  for (const row of schoolAgg) {
    const o = row.educationOffice;
    if (!o || !stats[o]) continue;
    const n = row._count;
    stats[o].total += n;
    if (row.schoolLevel === "ELEMENTARY") stats[o].e += n;
    else if (row.schoolLevel === "MIDDLE") stats[o].m += n;
    else if (row.schoolLevel === "HIGH") stats[o].h += n;
    else stats[o].etc += n;
  }
  for (const r of reports) {
    const o = r.school.educationOffice;
    if (!o || !stats[o]) continue;
    if (r.type === "CONSULTING" && r.status === "DONE") stats[o].consultingDone++;
    if (r.type === "IMPROVEMENT") stats[o].improvement++;
  }

  const consultingDone = reports.filter((r) => r.type === "CONSULTING" && r.status === "DONE").length;
  const maxSchools = Math.max(...OFFICES.map((o) => stats[o].total), 1);

  return (
    <AppShell brand={{ title: "진척관리(관제)", subtitle: "전체 통계" }} sections={dashboardNav(session.role === "ADMIN")}>
      <div className={st.head}>
        <h1 className={st.title}>전체 통계</h1>
        <p className={st.desc}>서울 전체 학교 기준 진척/이슈 집계</p>
      </div>

      <div className={st.kpiRow}>
        <div className={st.kpi}><p className={st.kpiLabel}>전체학교</p><p className={st.kpiValue}>{totalSchools}</p><p className={st.kpiSub}>학교 마스터</p></div>
        <div className={st.kpi}><p className={st.kpiLabel}>컨설팅진단(사전신청)</p><p className={st.kpiValue}>{CONSULTING_TARGET}</p><p className={st.kpiSub}>목표</p></div>
        <div className={st.kpi}><p className={st.kpiLabel}>컨설팅진단완료</p><p className={st.kpiValue}>{consultingDone}</p><p className={st.kpiSub}>DONE</p></div>
        <div className={st.kpi}><p className={st.kpiLabel}>컨설팅잔여</p><p className={st.kpiValue}>{CONSULTING_TARGET - consultingDone}</p><p className={st.kpiSub}>사전신청-완료</p></div>
        <div className={st.kpi}><p className={st.kpiLabel}>문서합계</p><p className={st.kpiValue}>{totalReports}</p><p className={st.kpiSub}>reports</p></div>
      </div>

      <div className={st.panel}>
        <h2 className={st.panelTitle}>지청별 학교수</h2>
        <div className={st.bars}>
          {OFFICES.map((o) => (
            <div key={o} className={st.barCol}>
              <span className={st.barVal}>{stats[o].total}</span>
              <div className={st.bar} style={{ height: `${(stats[o].total / maxSchools) * 160}px` }} />
              <span className={st.barLabel}>{o}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={st.panel}>
        <h2 className={st.panelTitle}>지청별 요약</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={st.table}>
            <thead>
              <tr><th>교육지원청</th><th>학교수</th><th>초</th><th>중</th><th>고</th><th>기타</th><th>컨설팅(DONE)</th><th>개선(건)</th></tr>
            </thead>
            <tbody>
              {OFFICES.map((o) => {
                const x = stats[o];
                return (
                  <tr key={o}>
                    <td>{o}교육지원청</td><td>{x.total}</td><td>{x.e}</td><td>{x.m}</td><td>{x.h}</td><td>{x.etc}</td>
                    <td>{x.consultingDone}</td><td>{x.improvement}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
