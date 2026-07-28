export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { mainNav } from "@/lib/nav";
import { StatsView, type OfficeStat, type Kpi } from "./StatsView";
import { InsightsView, type Insights, type InsightSection } from "./InsightsView";
import st from "./stats.module.css";

const VIEWS = [
  { key: "overview", label: "전체 통계", sub: "서울 전체 학교 기준 진척 · 이슈 집계" },
  { key: "issues", label: "이슈 분석", sub: "장애 · 시급성 · 선로 불량 집계" },
  { key: "progress", label: "진행 추이", sub: "월별 완료 추이 · 문서 작성 현황" },
  { key: "actions", label: "조치 관리", sub: "미조치 학교 · 개선금액 · 수능시험장" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

const OFFICES = [
  "동부", "서부", "남부", "북부", "중부", "강동송파",
  "강서양천", "강남서초", "동작관악", "성동광진", "성북강북",
];
const CONSULTING_TARGET = 300;
const KST = 9 * 60 * 60 * 1000;

/* eslint-disable @typescript-eslint/no-explicit-any */
type ConsultingRow = { fault?: string; urgency?: string };

function kstYm(d: Date) {
  return new Date(d.getTime() + KST).toISOString().slice(0, 7); // YYYY-MM
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const view: ViewKey = VIEWS.some((v) => v.key === sp.view) ? (sp.view as ViewKey) : "overview";
  const viewInfo = VIEWS.find((v) => v.key === view)!;

  const [schoolAgg, reports, faultCodes] = await Promise.all([
    prisma.school.groupBy({ by: ["educationOffice", "schoolLevel"], _count: true }),
    prisma.report.findMany({
      select: {
        type: true,
        status: true,
        round: true,
        payload: true,
        updatedAt: true,
        completedAt: true,
        school: { select: { name: true, educationOffice: true, isSuneungVenue: true } },
      },
    }),
    prisma.code.findMany({
      where: { kind: "FAULT" },
      select: { code: true, name: true, category: true },
    }),
  ]);

  const faultInfo = new Map(faultCodes.map((c) => [c.code, c]));
  /** 장애코드 중 '노후' 계열 → 노후화 지표 */
  const agedCodes = new Set(faultCodes.filter((c) => c.name.includes("노후")).map((c) => c.code));

  const base = (name: string): OfficeStat => ({
    name,
    full: `${name}교육지원청`,
    schools: 0, el: 0, mid: 0, high: 0, etc: 0,
    done: 0, improve: 0, focus: 0, old: 0, fault: 0, urgent: 0,
  });
  const stats: Record<string, OfficeStat> = Object.fromEntries(OFFICES.map((o) => [o, base(o)]));

  for (const row of schoolAgg) {
    const o = row.educationOffice;
    if (!o || !stats[o]) continue;
    const n = row._count;
    stats[o].schools += n;
    if (row.schoolLevel === "ELEMENTARY") stats[o].el += n;
    else if (row.schoolLevel === "MIDDLE") stats[o].mid += n;
    else if (row.schoolLevel === "HIGH") stats[o].high += n;
    else stats[o].etc += n;
  }

  // ---- 인사이트 집계 버킷 ----
  let consultingDone = 0;
  const faultCount = new Map<string, number>();
  const urgency = { 상: 0, 중: 0, 하: 0 };
  const monthly = new Map<string, number>(); // YYYY-MM → 완료 건수
  const impByOffice = new Map<string, number>();
  const impByContent = new Map<string, number>();
  let impTotal = 0;
  let impItems = 0;
  const impSchools = new Set<string>();
  const spkByOffice = new Map<string, { good: number; bad: number }>();
  const funnel: Record<string, { draft: number; done: number }> = {
    "컨설팅 1차": { draft: 0, done: 0 },
    "컨설팅 2차": { draft: 0, done: 0 },
    "장비목록": { draft: 0, done: 0 },
    "스피커선로": { draft: 0, done: 0 },
    "개선보고서": { draft: 0, done: 0 },
    "방송사진": { draft: 0, done: 0 },
  };
  const pendingMap = new Map<
    string,
    { office: string; faults: number; urgent: number; at: Date }
  >();
  const improvedSchools = new Set<string>();
  const r1DoneSchools = new Set<string>();
  const r2Schools = new Set<string>();
  const suneungMap = new Map<string, { office: string; done: boolean }>();

  for (const r of reports) {
    const schoolName = r.school.name;
    const o = r.school.educationOffice ?? "";
    const s = stats[o];
    const payload = r.payload as any;
    const bump = (key: string) => {
      if (funnel[key]) funnel[key][r.status === "DONE" ? "done" : "draft"]++;
    };

    if (r.type === "CONSULTING") {
      const round = r.round ?? 1;
      bump(round === 2 ? "컨설팅 2차" : "컨설팅 1차");
      if (round === 2) r2Schools.add(schoolName);

      if (r.status === "DONE") {
        consultingDone++;
        if (round === 1) r1DoneSchools.add(schoolName);
        const ym = kstYm(r.completedAt ?? r.updatedAt);
        monthly.set(ym, (monthly.get(ym) ?? 0) + 1);
        if (s) s.done++;
      }

      // 수능시험장: 학교 마스터 플래그 또는 컨설팅 기본정보(예)
      if (r.school.isSuneungVenue || payload?.base?.suneung === "예") {
        const prev = suneungMap.get(schoolName);
        suneungMap.set(schoolName, {
          office: o,
          done: (prev?.done ?? false) || r.status === "DONE",
        });
      }

      // 점검 행: 장애/노후/시급성
      const rows = Object.values(payload?.sections ?? {}).flat() as ConsultingRow[];
      let rowFaults = 0;
      let rowUrgent = 0;
      for (const row of rows) {
        if (row?.urgency && row.urgency in urgency) {
          urgency[row.urgency as keyof typeof urgency]++;
          if (row.urgency === "상") {
            rowUrgent++;
            if (s) s.urgent++;
          }
        }
        if (!row?.fault) continue;
        rowFaults++;
        faultCount.set(row.fault, (faultCount.get(row.fault) ?? 0) + 1);
        if (s) {
          s.fault++;
          if (agedCodes.has(row.fault)) s.old++;
        }
      }
      if (round === 1 && rowFaults > 0) {
        pendingMap.set(schoolName, {
          office: o,
          faults: rowFaults,
          urgent: rowUrgent,
          at: r.updatedAt,
        });
      }
    } else if (r.type === "IMPROVEMENT") {
      bump("개선보고서");
      improvedSchools.add(schoolName);
      const items = (payload?.items ?? []) as any[];
      impItems += items.length;
      impSchools.add(schoolName);
      let amount = Number(payload?.total ?? 0);
      if (!amount) {
        amount = items.reduce(
          (n, it) => n + (Number(String(it?.amount ?? "").replace(/[^0-9]/g, "")) || 0),
          0
        );
      }
      impTotal += amount;
      if (o) impByOffice.set(o, (impByOffice.get(o) ?? 0) + amount);
      for (const it of items) {
        const c = String(it?.content || "").trim();
        if (c) impByContent.set(c, (impByContent.get(c) ?? 0) + 1);
      }
      if (s) s.improve += items.length;
    } else if (r.type === "SPEAKERLINE") {
      bump("스피커선로");
      const rows = [
        ...((payload?.section1 ?? []) as any[]),
        ...((payload?.section2 ?? []) as any[]),
        ...((payload?.section3 ?? []) as any[]),
      ];
      if (o && rows.length) {
        const cur = spkByOffice.get(o) ?? { good: 0, bad: 0 };
        for (const row of rows) {
          if (row?.verdict === "양호") cur.good++;
          else if (row?.verdict === "불량") cur.bad++;
        }
        spkByOffice.set(o, cur);
      }
    } else if (r.type === "EQUIPMENT") {
      bump("장비목록");
    } else if (r.type === "PHOTOS") {
      bump("방송사진");
      const rooms = (payload?.photos?.["집중진단"] ?? {}) as Record<string, unknown[]>;
      const has = Object.values(rooms).some((files) => Array.isArray(files) && files.length > 0);
      if (has && s) s.focus++;
    }
  }

  const data = OFFICES.map((o) => stats[o]);
  const totalSchools = data.reduce((n, d) => n + d.schools, 0);

  const kpis: Kpi[] = [
    { label: "전체 학교", value: totalSchools.toLocaleString(), note: "NEIS 학교 마스터" },
    { label: "컨설팅 대상", value: CONSULTING_TARGET.toLocaleString(), note: "사전 신청 기준" },
    { label: "컨설팅 완료", value: consultingDone.toLocaleString(), note: "완료 처리된 보고서" },
    {
      label: "컨설팅 잔여",
      value: Math.max(0, CONSULTING_TARGET - consultingDone).toLocaleString(),
      note: "대상 − 완료",
    },
    { label: "문서 합계", value: reports.length.toLocaleString(), note: "전체 보고서" },
  ];

  // ---- 월별 추이 (최근 8개월) + 목표 페이스 ----
  const nowYm = kstYm(new Date());
  const [ny, nm] = nowYm.split("-").map(Number);
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.UTC(ny, nm - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    months.push({ key, label: `${d.getUTCMonth() + 1}월`, count: monthly.get(key) ?? 0 });
  }
  const firstYm = [...monthly.keys()].sort()[0];
  let paceText = "완료 데이터가 쌓이면 예상 완료 시점을 계산합니다";
  if (firstYm && consultingDone > 0) {
    const [fy, fm] = firstYm.split("-").map(Number);
    const elapsed = Math.max(1, (ny - fy) * 12 + (nm - fm) + 1);
    const avg = consultingDone / elapsed;
    const remain = Math.max(0, CONSULTING_TARGET - consultingDone);
    if (remain === 0) {
      paceText = "목표를 달성했습니다 🎉";
    } else if (avg > 0) {
      const etaMonths = Math.ceil(remain / avg);
      const eta = new Date(Date.UTC(ny, nm - 1 + etaMonths, 1));
      paceText = `월평균 ${avg.toFixed(1)}건 · 이 속도면 ${eta.getUTCFullYear()}년 ${
        eta.getUTCMonth() + 1
      }월 완료 예상`;
    }
  }

  // ---- 장애 TOP 10 ----
  const faultTop = [...faultCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({
      code,
      name: faultInfo.get(code)?.name ?? code,
      category: faultInfo.get(code)?.category ?? "",
      count,
    }));

  // ---- 미조치 학교 (1차 지적 있음 + 개선보고서 없음) ----
  const now = Date.now();
  const pendingAll = [...pendingMap.entries()]
    .filter(([school]) => !improvedSchools.has(school))
    .map(([school, v]) => ({
      school,
      office: v.office,
      faults: v.faults,
      urgent: v.urgent,
      days: Math.max(0, Math.floor((now - v.at.getTime()) / 86400000)),
    }))
    .sort((a, b) => b.urgent - a.urgent || b.faults - a.faults);

  // ---- 수능시험장 ----
  const suneungRows = [...suneungMap.entries()]
    .map(([school, v]) => ({ school, office: v.office, done: v.done }))
    .sort((a, b) => Number(a.done) - Number(b.done));

  // ---- 스피커선로 불량률 ----
  const spkOffices = [...spkByOffice.entries()]
    .map(([name, v]) => ({
      name,
      total: v.good + v.bad,
      bad: v.bad,
      rate: v.good + v.bad ? (v.bad / (v.good + v.bad)) * 100 : 0,
    }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.rate - a.rate);
  const spkGood = [...spkByOffice.values()].reduce((n, v) => n + v.good, 0);
  const spkBad = [...spkByOffice.values()].reduce((n, v) => n + v.bad, 0);

  const insights: Insights = {
    monthly: months,
    target: CONSULTING_TARGET,
    done: consultingDone,
    paceText,
    faultTop,
    urgency,
    imp: {
      total: impTotal,
      schools: impSchools.size,
      items: impItems,
      avg: impSchools.size ? Math.round(impTotal / impSchools.size) : 0,
      byContent: [...impByContent.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, count]) => ({ label, count })),
      byOffice: [...impByOffice.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount })),
    },
    speaker: { good: spkGood, bad: spkBad, byOffice: spkOffices.slice(0, 6) },
    funnel: Object.entries(funnel).map(([label, v]) => ({ label, ...v })),
    r1NoR2: [...r1DoneSchools].filter((sc) => !r2Schools.has(sc)).length,
    pending: pendingAll.slice(0, 8),
    pendingTotal: pendingAll.length,
    suneung: {
      total: suneungRows.length,
      done: suneungRows.filter((x) => x.done).length,
      rows: suneungRows.slice(0, 8),
    },
  };

  return (
    <AppShell
      brand={{ title: "GlobalTelecom", subtitle: "BROADCAST CONSOLE" }}
      sections={mainNav(session.role === "ADMIN")}
      user={{ name: session.username, org: "서울특별시교육청" }}
    >
      <header className={st.header}>
        <div>
          <div className={st.crumb}>관제 / 통계</div>
          <h1 className={st.h1}>{viewInfo.label}</h1>
          <p className={st.sub}>{viewInfo.sub}</p>
        </div>
      </header>

      <nav className={st.viewTabs} aria-label="통계 화면 전환">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "overview" ? "/dashboard/stats" : `/dashboard/stats?view=${v.key}`}
            className={`${st.viewTab} ${view === v.key ? st.viewTabOn : ""}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {view === "overview" ? (
        <StatsView data={data} kpis={kpis} />
      ) : (
        <InsightsView data={insights} section={view as InsightSection} />
      )}
    </AppShell>
  );
}
