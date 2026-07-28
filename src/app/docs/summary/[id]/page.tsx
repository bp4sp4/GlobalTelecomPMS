export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportShell } from "@/components/report/ReportShell";
import {
  buildConsultingResult,
  buildImprovement,
  buildSummary,
  type SummaryRow,
  type CodeMap,
} from "@/lib/consultingSummary";
import { TYPE_TITLE, TYPE_PATH, summaryOf } from "@/lib/docList";
import { SummaryActions } from "./SummaryActions";
import s from "./summary.module.css";

const FACILITIES = ["방송실", "시청각실", "강당/체육관"];
const SIGN_ROLES = ["기술지원단1", "기술지원단2", "교직원지원단1", "교직원지원단2", "학교담당자", "결재"];

type Sign = { org?: string; name?: string; sign?: string };
type ConsultingPayload = {
  facilities?: Record<string, boolean>;
  base?: { visitDate?: string; maintenance?: string; suneung?: string };
  sections?: Record<string, SummaryRow[]>;
  signatures?: Record<string, Sign>;
  analysis?: { requirement?: string; result?: string; improvement?: string; summary?: string };
};

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: { school: true },
  });
  if (!report) notFound();

  const school = report.school;
  const officeFull = school.educationOffice
    ? `서울특별시${school.educationOffice}교육지원청`
    : "";
  const year = (report.completedAt ?? report.updatedAt).getFullYear();
  const editHref =
    report.type === "CONSULTING"
      ? `${TYPE_PATH.CONSULTING}?school=${encodeURIComponent(school.name)}&round=${report.round ?? 1}`
      : `${TYPE_PATH[report.type]}?school=${encodeURIComponent(school.name)}`;

  // ---- 컨설팅: 원본 보고서 요약본 형식 ----
  if (report.type === "CONSULTING") {
    const payload = report.payload as ConsultingPayload;
    const sections = payload.sections ?? {};
    const facilityOrder = FACILITIES.filter((f) => payload.facilities?.[f] !== false);

    const codes = await prisma.code.findMany({ select: { code: true, name: true, kind: true } });
    const mapOf = (kind: string): CodeMap =>
      Object.fromEntries(codes.filter((c) => c.kind === kind).map((c) => [c.code, c.name]));
    const maps = { equip: mapOf("EQUIPMENT"), fault: mapOf("FAULT"), action: mapOf("ACTION") };

    const analysis = payload.analysis ?? {};
    const requirement = (analysis.requirement ?? "").trim();
    const result =
      (analysis.result ?? "").trim() || buildConsultingResult(sections, facilityOrder, maps);
    const improvement =
      (analysis.improvement ?? "").trim() || buildImprovement(sections, facilityOrder, maps);
    const summary =
      (analysis.summary ?? "").trim() || buildSummary(sections, facilityOrder, maps);

    const signs = payload.signatures ?? {};
    const signedCount = SIGN_ROLES.filter((r) => signs[r]?.sign || signs[r]?.name?.trim()).length;

    return (
      <ReportShell session={session}>
        <div className={s.page}>
          <SummaryActions editHref={editHref} />

          <div className={s.paper}>
            {/* 표제 */}
            <div className={s.band}>
              <div className={s.bandSub}>{year}년 학교정보화지원체계(테크센터) 운영지원사업</div>
              <div className={s.bandTitle}>방송장비 컨설팅 보고서</div>
              <div className={s.bandMeta}>작성회차: {report.round ?? 1}차</div>
            </div>

            {/* 1. 학교 기본 정보 */}
            <section className={s.section}>
              <h2 className={s.h2}>학교 기본 정보</h2>
              <table className={s.info}>
                <tbody>
                  <tr>
                    <th>교육지원청</th>
                    <td>{officeFull}</td>
                    <th>학교명</th>
                    <td className={s.strong}>{school.name}</td>
                  </tr>
                  <tr>
                    <th>소재지</th>
                    <td>{school.district ?? ""}</td>
                    <th>컨설팅 방문일</th>
                    <td>{payload.base?.visitDate ?? ""}</td>
                  </tr>
                  <tr>
                    <th>유지관리 현황</th>
                    <td>{payload.base?.maintenance ?? ""}</td>
                    <th>수능시험장 여부</th>
                    <td>{payload.base?.suneung ?? ""}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* 2. 현황 분석 및 권고사항 */}
            <section className={s.section}>
              <h2 className={s.h2}>2. 현황 분석 및 권고사항</h2>

              <h3 className={s.h3}>학교 요구사항</h3>
              <div className={s.pre}>{requirement || "등록된 요구사항이 없습니다."}</div>

              <h3 className={s.h3}>컨설팅 결과</h3>
              <div className={s.pre}>{result || "정리할 점검 내용이 없습니다."}</div>

              <h3 className={s.h3}>개선사항</h3>
              <div className={s.pre}>{improvement || "개선/조치 사항이 없습니다."}</div>
            </section>

            {/* 3. 총평 */}
            <section className={s.section}>
              <h2 className={s.h2}>3. 총평</h2>
              <div className={s.pre}>{summary}</div>
            </section>

            {/* 4. 확인 서명란 */}
            <section className={s.section}>
              <div className={s.signHead}>
                <h2 className={s.h2}>4. 확인 서명란 (전자서명)</h2>
                <span className={s.signCount}>
                  {signedCount} / {SIGN_ROLES.length} 서명
                </span>
              </div>
              <div className={s.signScroll}>
                <table className={s.sign}>
                  <tbody>
                    <tr>
                      <th className={s.signLabel}>구분</th>
                      {SIGN_ROLES.map((r) => (
                        <th key={r}>{r}</th>
                      ))}
                    </tr>
                    <tr>
                      <th className={s.signLabel}>소속</th>
                      {SIGN_ROLES.map((r) => (
                        <td key={r}>{signs[r]?.org ?? ""}</td>
                      ))}
                    </tr>
                    <tr>
                      <th className={s.signLabel}>성명</th>
                      {SIGN_ROLES.map((r) => (
                        <td key={r}>{signs[r]?.name ?? ""}</td>
                      ))}
                    </tr>
                    <tr>
                      <th className={s.signLabel}>서명</th>
                      {SIGN_ROLES.map((r) => (
                        <td key={r} className={s.signCell}>
                          {signs[r]?.sign ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={signs[r]!.sign!} alt={`${r} 서명`} className={s.signImg} />
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </ReportShell>
    );
  }

  // ---- 그 외 문서: 기본 정보 + 자동 요약 ----
  const summaryText = summaryOf(report.type, report.payload) ?? "요약할 내용이 없습니다.";

  return (
    <ReportShell session={session}>
      <div className={s.page}>
        <SummaryActions editHref={editHref} />

        <div className={s.paper}>
          <div className={s.band}>
            <div className={s.bandSub}>{year}년 학교정보화지원체계(테크센터) 운영지원사업</div>
            <div className={s.bandTitle}>{TYPE_TITLE[report.type]}</div>
            <div className={s.bandMeta}>
              {report.status === "DONE" ? "완료 문서" : "저장(초안)"}
            </div>
          </div>

          <section className={s.section}>
            <h2 className={s.h2}>학교 기본 정보</h2>
            <table className={s.info}>
              <tbody>
                <tr>
                  <th>교육지원청</th>
                  <td>{officeFull}</td>
                  <th>학교명</th>
                  <td className={s.strong}>{school.name}</td>
                </tr>
                <tr>
                  <th>소재지</th>
                  <td>{school.district ?? ""}</td>
                  <th>{report.status === "DONE" ? "완료일" : "최종 저장"}</th>
                  <td>
                    {(report.completedAt ?? report.updatedAt).toISOString().slice(0, 10)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={s.section}>
            <h2 className={s.h2}>요약</h2>
            <div className={s.pre}>{summaryText}</div>
          </section>
        </div>
      </div>
    </ReportShell>
  );
}
