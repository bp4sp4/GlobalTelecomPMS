export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { mainNav } from "@/lib/nav";
import { NoSchool } from "@/components/report/NoSchool";
import { ConsultingHub, type RoundStatus, type Issue, type HistoryItem } from "./ConsultingHub";
import s from "./hub.module.css";

type Row = {
  item?: string;
  equipment?: string;
  fault?: string;
  state?: string;
  action?: string;
  actionCode?: string;
  field?: string;
  urgency?: string;
};
type ConsultingPayload = { sections?: Record<string, Row[]> };
type PhotoPayload = { photos?: Record<string, Record<string, unknown[]>> };

function fmt(d: Date) {
  return new Date(d).toISOString().slice(0, 16).replace("T", " ");
}
function statusOf(r: { status: string } | undefined): RoundStatus {
  if (!r) return "미작성";
  return r.status === "DONE" ? "저장 완료" : "저장 (초안)";
}
function allRows(payload: unknown): { facility: string; row: Row }[] {
  const sections = (payload as ConsultingPayload)?.sections ?? {};
  const out: { facility: string; row: Row }[] = [];
  for (const [facility, rows] of Object.entries(sections)) {
    for (const row of rows ?? []) out.push({ facility, row });
  }
  return out;
}

export default async function ConsultingEntry({
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
            include: { createdBy: { select: { username: true } } },
            orderBy: { updatedAt: "desc" },
          },
        },
      })
    : null;

  const nav = mainNav(session.role === "ADMIN");
  const shellUser = { name: session.username, org: "서울특별시교육청" };

  if (!record) {
    return (
      <AppShell brand={{ title: "GlobalTelecom" }} sections={nav} user={shellUser}>
        <NoSchool />
      </AppShell>
    );
  }

  const consulting = record.reports.filter((r) => r.type === "CONSULTING");
  const r1 = consulting.find((r) => (r.round ?? 1) === 1);
  const r2 = consulting.find((r) => r.round === 2);

  // 1차 지표 계산
  const rows1 = r1 ? allRows(r1.payload) : [];
  const equipCount = rows1.filter((x) => x.row.equipment).length;
  const faultCount = rows1.filter((x) => x.row.fault).length;
  const filled = rows1.filter((x) => x.row.state || x.row.equipment || x.row.fault).length;
  const completeness = rows1.length ? Math.round((filled / rows1.length) * 100) : 0;

  const photoReport = record.reports.find((r) => r.type === "PHOTOS");
  let photoCount = 0;
  if (photoReport) {
    const photos = (photoReport.payload as PhotoPayload)?.photos ?? {};
    for (const rooms of Object.values(photos)) {
      for (const files of Object.values(rooms ?? {})) {
        photoCount += Array.isArray(files) ? files.length : 0;
      }
    }
  }

  // 1차 지적사항(장애 코드 → 명칭)
  const faultCodes = [...new Set(rows1.map((x) => x.row.fault).filter(Boolean) as string[])];
  const codeRows = faultCodes.length
    ? await prisma.code.findMany({ where: { code: { in: faultCodes } } })
    : [];
  const codeName = new Map(codeRows.map((c) => [c.code, c.name]));

  const issues: Issue[] = rows1
    .filter((x) => x.row.fault)
    .slice(0, 6)
    .map((x) => ({
      title: `${codeName.get(x.row.fault!) ?? x.row.fault} — ${x.facility}`,
      source: x.row.urgency ? `시급성 ${x.row.urgency}` : "1차 지적",
    }));

  const history: HistoryItem[] = record.reports.slice(0, 5).map((r) => {
    const label =
      r.type === "CONSULTING"
        ? `${r.round ?? 1}차 ${r.status === "DONE" ? "저장 완료" : "초안 저장"}`
        : r.type === "PHOTOS"
          ? "방송사진 저장"
          : r.type === "EQUIPMENT"
            ? "장비 목록 저장"
            : r.type === "SPEAKERLINE"
              ? "스피커 선로 저장"
              : "개선보고서 저장";
    return { title: label, at: fmt(r.updatedAt), by: r.createdBy?.username ?? "—" };
  });

  return (
    <AppShell brand={{ title: "GlobalTelecom" }} sections={nav} user={shellUser}>
      <header className={s.header}>
        <div>
          <div className={s.crumb}>문서 작성 / 방송장비 컨설팅 보고서</div>
          <h1 className={s.h1}>방송장비 컨설팅 보고서</h1>
          <div className={s.schoolLine}>
            <span className={s.schoolName}>{record.name}</span>
            <span className={s.vbar} />
            <span className={s.schoolMeta}>
              {record.district ?? "—"} · 코드 {record.neisCode ?? "—"}
            </span>
          </div>
        </div>
        <LogoutButton className={`${s.btn} ${s.btnGhost}`} />
      </header>

      <ConsultingHub
        school={{
          name: record.name,
          district: record.district ?? "—",
          code: record.neisCode ?? "—",
        }}
        firstStatus={statusOf(r1)}
        firstSavedAt={r1 ? fmt(r1.updatedAt) : null}
        firstAuthor={r1?.createdBy?.username ?? "—"}
        firstMetrics={[
          { label: "점검 장비", value: equipCount, unit: "대" },
          { label: "개선 필요", value: faultCount, unit: "건", color: "var(--gt-amber)" },
          { label: "첨부 사진", value: photoCount, unit: "장" },
          { label: "입력 완성도", value: completeness, unit: "%", color: "var(--gt-blue)" },
        ]}
        secondStatus={statusOf(r2)}
        issues={issues}
        history={history}
      />
    </AppShell>
  );
}
