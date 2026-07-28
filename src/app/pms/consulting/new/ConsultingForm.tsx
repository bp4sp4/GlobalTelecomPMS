"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/report/BackButton";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import { SignaturePad } from "@/components/ui/SignaturePad/SignaturePad";
import { CellInput } from "@/components/report/CellInput";
import {
  buildConsultingResult,
  buildImprovement,
  buildSummary,
} from "@/lib/consultingSummary";
import f from "./form.module.css";

const FACILITIES = ["방송실", "시청각실", "강당/체육관"];
const FACILITY_ITEMS: Record<string, string[]> = {
  방송실: [
    "전원 공급 상태 점검",
    "오디오 장비 구성 및 상태 점검",
    "음향 입,출력 신호 상태 점검",
    "교내 비상/일반 방송 출력 점검",
    "영상장비 구성 및 상태 점검",
    "콘솔/랙 케이블 정리 상태 점검",
    "개선/조치 사항",
  ],
  시청각실: ["전원 공급 상태 점검", "오디오/영상 장비 상태 점검", "케이블 정리 상태 점검", "개선/조치 사항"],
  "강당/체육관": ["전원 공급 상태 점검", "음향 출력 상태 점검", "스피커 선로 상태 점검", "개선/조치 사항"],
};
const FIELDS = ["음향", "영상", "조명", "기타"];
const MAINTENANCE = ["매월", "분기별", "비정기", "없음"];
const SIGN_ROLES = ["기술지원단1", "기술지원단2", "교직원지원단1", "교직원지원단2", "학교담당자", "결재"];

const SEVERITIES = [
  { key: "상", fg: "#f04452", bg: "#fff0f0", line: "#f04452" },
  { key: "중", fg: "var(--gt-amber)", bg: "var(--gt-amber-bg)", line: "var(--gt-amber)" },
  { key: "하", fg: "var(--gt-green)", bg: "var(--gt-green-bg)", line: "var(--gt-green-dot)" },
];

const SECTIONS = [
  { id: "sec-basic", label: "학교 기본 정보" },
  { id: "sec-check", label: "시설 점검" },
  { id: "sec-analysis", label: "현황 분석" },
  { id: "sec-summary", label: "총평" },
  { id: "sec-sign", label: "확인 서명" },
];

type Sign = { org: string; name: string; sign: string };
type Row = {
  item: string; equipment: string; fault: string; state: string;
  action: string; actionCode: string; field: string; urgency: string;
};
type Code = { code: string; name: string; category?: string };

const EQUIP_CAT_LABELS: Record<string, string> = {
  AU: "음향", PA: "전관음향", VI: "영상", ETC: "전원",
};

function defaultSigns(school: string): Record<string, Sign> {
  const mk = (org: string): Sign => ({ org, name: "", sign: "" });
  return {
    기술지원단1: mk("서울시교육청"),
    기술지원단2: mk("서울시교육청"),
    교직원지원단1: mk(school),
    교직원지원단2: mk(school),
    학교담당자: mk(school),
    결재: mk(school),
  };
}

const rowsFor = (fac: string): Row[] =>
  FACILITY_ITEMS[fac].map((item) => ({
    item, equipment: "", fault: "", state: "", action: "", actionCode: "", field: "", urgency: "",
  }));

export function ConsultingForm({
  school, office, district, round, initial, initialStatus,
}: {
  school: string; office: string | null; district: string | null; round: number;
  initial: {
    facilities?: Record<string, boolean>;
    base?: { visitDate?: string; maintenance?: string; suneung?: string };
    sections?: Record<string, Row[]>;
    signatures?: Record<string, Sign>;
    analysis?: { requirement?: string; result?: string; improvement?: string; summary?: string };
  } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const [facilities, setFacilities] = useState<Record<string, boolean>>(
    initial?.facilities ?? { 방송실: true, 시청각실: true, "강당/체육관": true }
  );
  const [tab, setTab] = useState(FACILITIES[0]);
  const [visitDate, setVisitDate] = useState(initial?.base?.visitDate ?? "");
  const [maintenance, setMaintenance] = useState(initial?.base?.maintenance ?? "없음");
  const [suneung, setSuneung] = useState(initial?.base?.suneung ?? "아니오");
  const [sections, setSections] = useState<Record<string, Row[]>>(
    initial?.sections ?? Object.fromEntries(FACILITIES.map((x) => [x, rowsFor(x)]))
  );
  const [signs, setSigns] = useState<Record<string, Sign>>(
    initial?.signatures && Object.keys(initial.signatures).length
      ? initial.signatures
      : defaultSigns(school)
  );
  const [requirement, setRequirement] = useState(initial?.analysis?.requirement ?? "");
  const [consultingResult, setConsultingResult] = useState(initial?.analysis?.result ?? "");
  const [improvement, setImprovement] = useState(initial?.analysis?.improvement ?? "");
  const [summary, setSummary] = useState(initial?.analysis?.summary ?? "");
  const [equip, setEquip] = useState<Code[]>([]);
  const [faults, setFaults] = useState<Code[]>([]);
  const [actions, setActions] = useState<Code[]>([]);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState("sec-basic");

  // 스크롤 위치에 따라 현재 보고 있는 섹션을 목차에 표시
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const equipOpts = useMemo(
    () => equip.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}`, category: c.category })),
    [equip]
  );
  const faultOpts = useMemo(() => faults.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` })), [faults]);
  const actionOpts = useMemo(() => actions.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` })), [actions]);
  const fieldOpts = FIELDS.map((x) => ({ value: x, label: x }));
  const maintenanceOpts = MAINTENANCE.map((m) => ({ value: m, label: m }));
  const suneungOpts = [{ value: "아니오", label: "아니오" }, { value: "예", label: "예" }];

  useEffect(() => {
    (async () => {
      const load = async (kind: string) => {
        const r = await fetch(`/api/codes?kind=${kind}`);
        return r.ok ? r.json() : [];
      };
      setEquip(await load("EQUIPMENT"));
      setFaults(await load("FAULT"));
      setActions(await load("ACTION"));
    })();
  }, []);

  const activeFacilities = FACILITIES.filter((x) => facilities[x]);
  const allRows = useMemo(
    () => activeFacilities.flatMap((x) => sections[x] ?? []),
    [sections, activeFacilities]
  );
  const counts = {
    total: allRows.length,
    상: allRows.filter((r) => r.urgency === "상").length,
    중: allRows.filter((r) => r.urgency === "중").length,
    하: allRows.filter((r) => r.urgency === "하").length,
  };
  const filled = allRows.filter((r) => r.state || r.equipment || r.fault || r.action).length;
  const completion = allRows.length ? Math.round((filled / allRows.length) * 100) : 0;
  const signedCount = SIGN_ROLES.filter((r) => signs[r]?.sign || signs[r]?.name?.trim()).length;

  // 목차에 표시할 섹션별 입력 현황
  const sectionStatus: Record<string, { text: string; tone: "ok" | "warn" | "none" }> = {
    "sec-basic": visitDate
      ? { text: "완료", tone: "ok" }
      : { text: "방문일", tone: "warn" },
    "sec-check": {
      text: `${filled}/${counts.total}`,
      tone: counts.total > 0 && filled === counts.total ? "ok" : "none",
    },
    "sec-analysis": consultingResult.trim()
      ? { text: "작성됨", tone: "ok" }
      : { text: "비어있음", tone: "warn" },
    "sec-summary": summary.trim()
      ? { text: "작성됨", tone: "ok" }
      : { text: "비어있음", tone: "warn" },
    "sec-sign": {
      text: `${signedCount}/${SIGN_ROLES.length}`,
      tone: signedCount === SIGN_ROLES.length ? "ok" : "warn",
    },
  };

  const codeMaps = useMemo(() => {
    const toMap = (list: Code[]) =>
      Object.fromEntries(list.map((c) => [c.code, c.name])) as Record<string, string>;
    return { equip: toMap(equip), fault: toMap(faults), action: toMap(actions) };
  }, [equip, faults, actions]);

  function upRow(fac: string, i: number, key: keyof Row, val: string) {
    setSections((prev) => ({
      ...prev,
      [fac]: prev[fac].map((r, idx) => (idx === i ? { ...r, [key]: val } : r)),
    }));
  }
  function addRow(fac: string) {
    setSections((prev) => ({
      ...prev,
      [fac]: [...prev[fac], { item: "", equipment: "", fault: "", state: "", action: "", actionCode: "", field: "", urgency: "" }],
    }));
  }
  function delRow(fac: string, i: number) {
    setSections((prev) => ({ ...prev, [fac]: prev[fac].filter((_, idx) => idx !== i) }));
  }
  function upSign(role: string, key: keyof Sign, val: string) {
    setSigns((prev) => {
      const cur: Sign = prev[role] ?? { org: "", name: "", sign: "" };
      return { ...prev, [role]: { ...cur, [key]: val } };
    });
  }
  function autoFillResult() {
    setConsultingResult(buildConsultingResult(sections, activeFacilities, codeMaps));
    setImprovement(buildImprovement(sections, activeFacilities, codeMaps));
  }
  function autoFillSummary() {
    setSummary(buildSummary(sections, activeFacilities, codeMaps));
  }

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true);
    setMsg(null);
    try {
      await saveReport({
        school, type: "CONSULTING", round,
        payload: {
          facilities,
          base: { visitDate, maintenance, suneung },
          sections,
          signatures: signs,
          analysis: { requirement, result: consultingResult, improvement, summary },
        },
        status,
      });
      setMsg({ t: status === "DONE" ? "완료 처리되었습니다." : "저장(초안)되었습니다.", ok: true });
    } catch (e) {
      setMsg({ t: (e as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    initialStatus === "DONE" ? "저장 완료" : initialStatus === "DRAFT" ? "저장(초안)" : "미작성";

  return (
    <div className={f.page}>
      {/* 상단 액션바 */}
      <header className={`${f.topbar} no-print`}>
        <div className={f.topInner}>
          <div>
            <div className={f.titleRow}>
              <h1 className={f.h1}>방송장비 컨설팅 보고서</h1>
              <span className={f.roundBadge}>
                {round}차 · {statusLabel}
              </span>
            </div>
            <div className={f.topMeta}>
              {school} · {district ?? "—"} · 입력 완성도 <span className={f.mono}>{completion}%</span>
            </div>
          </div>

          <div className={f.topActions}>
            <BackButton
              className={`${f.btn} ${f.btnMuted}`}
              fallback={`/docs/consulting?school=${encodeURIComponent(school)}`}
            />
            <a
              className={f.btn}
              href={`/api/reports/export?school=${encodeURIComponent(school)}&type=CONSULTING&round=${round}`}
            >
              CSV
            </a>
            <button type="button" className={f.btn} onClick={() => window.print()}>
              PDF
            </button>
            <span className={f.vbar} />
            <button
              type="button"
              className={`${f.btn} ${f.btnOutline}`}
              disabled={busy}
              onClick={() => doSave("DRAFT")}
            >
              저장
            </button>
            <button
              type="button"
              className={`${f.btn} ${f.btnPrimary}`}
              disabled={busy}
              onClick={() => doSave("DONE")}
            >
              완료 처리
            </button>
          </div>
        </div>
      </header>

      {/* 인쇄용 표제 */}
      <div className="print-only" style={{ textAlign: "center", marginBottom: "6mm" }}>
        <div style={{ fontSize: "9pt" }}>2026년 학교정보화지원체계(테크센터) 운영지원사업</div>
        <div style={{ fontSize: "15pt", fontWeight: 700, margin: "2mm 0" }}>방송장비 컨설팅 보고서</div>
        <div style={{ fontSize: "9pt" }}>
          {school} · 작성회차 {round}차
        </div>
      </div>

      <div className={f.layout}>
        {/* 좌측 목차 */}
        <nav className={`${f.toc} no-print`}>
          <div className={f.tocList}>
            <div className={f.tocTitle}>문서 구성</div>
            {SECTIONS.map((sec) => {
              const st = sectionStatus[sec.id];
              const toneClass =
                st.tone === "ok" ? f.tocStatOk : st.tone === "warn" ? f.tocStatWarn : "";
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className={`${f.tocItem} ${activeSection === sec.id ? f.tocItemOn : ""}`}
                  onClick={() => setActiveSection(sec.id)}
                >
                  <span className={f.tocDot} />
                  {sec.label}
                  <span className={`${f.tocStat} ${toneClass}`}>{st.text}</span>
                </a>
              );
            })}
          </div>

          <div className={f.progressCard}>
            <div className={f.progressLabel}>입력 완성도</div>
            <div className={f.progressNum}>
              {completion}
              <span>%</span>
            </div>
            <div className={f.progressTrack}>
              <div className={f.progressFill} style={{ width: `${completion}%` }} />
            </div>
            <div className={f.progressHint}>
              {SIGN_ROLES.length - signedCount > 0
                ? `서명 ${SIGN_ROLES.length - signedCount}칸이 비어 있습니다`
                : "서명 완료"}
            </div>
          </div>
        </nav>

        <div className={f.content}>
          {msg && <div className={`${f.msg} ${msg.ok ? f.msgOk : f.msgErr}`}>{msg.t}</div>}

          {/* 학교 기본 정보 */}
          <section id="sec-basic" className={f.section}>
            <div className={f.sectionHead}>
              <h2 className={f.h2}>학교 기본 정보</h2>
              <div className={`${f.chips} no-print`}>
                <span className={f.hint}>점검 시설</span>
                <div className={f.chipList}>
                  {FACILITIES.map((x) => (
                    <button
                      key={x}
                      type="button"
                      className={`${f.chip} ${facilities[x] ? f.chipOn : ""}`}
                      onClick={() => setFacilities((p) => ({ ...p, [x]: !p[x] }))}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={f.infoGrid}>
              <label className={f.field}>
                <span className={f.label}>교육지원청</span>
                <input readOnly value={office ?? ""} className={f.readonly} />
              </label>
              <label className={f.field}>
                <span className={f.label}>학교명</span>
                <input readOnly value={school} className={`${f.readonly} ${f.readonlyStrong}`} />
              </label>
              <label className={f.field}>
                <span className={f.label}>소재지</span>
                <input readOnly value={district ?? ""} className={f.readonly} />
              </label>
              <div className={f.field}>
                <span className={f.label}>컨설팅 방문일</span>
                <DatePicker value={visitDate} onChange={setVisitDate} />
              </div>
              <div className={f.field}>
                <span className={f.label}>유지관리 현황</span>
                <Select value={maintenance} options={maintenanceOpts} onChange={setMaintenance} />
              </div>
              <div className={f.field}>
                <span className={f.label}>수능시험장 여부</span>
                <Select value={suneung} options={suneungOpts} onChange={setSuneung} />
              </div>
            </div>
          </section>

          {/* 시설 점검 */}
          <section id="sec-check" className={f.section}>
            <div className={f.sectionHead}>
              <h2 className={f.h2}>시설 점검</h2>
              <div className={f.stats}>
                <span>
                  총 <b style={{ color: "var(--gt-text)" }}>{counts.total}</b>건
                </span>
                <span>
                  <span className={f.statDot} style={{ background: "#f04452" }} />상 {counts.상}
                </span>
                <span>
                  <span className={f.statDot} style={{ background: "var(--gt-amber)" }} />중 {counts.중}
                </span>
                <span>
                  <span className={f.statDot} style={{ background: "var(--gt-green-dot)" }} />하 {counts.하}
                </span>
              </div>
            </div>

            <div className={`${f.tabs} no-print`}>
              {activeFacilities.map((x) => (
                <button
                  key={x}
                  type="button"
                  className={`${f.tab} ${tab === x ? f.tabOn : ""}`}
                  onClick={() => setTab(x)}
                >
                  {x}
                  <span className={f.tabCount}>{sections[x]?.length ?? 0}</span>
                </button>
              ))}
            </div>

            {/* 화면에서는 선택한 시설만, 인쇄에서는 전체 시설 출력 */}
            {activeFacilities.map((fac) => (
              <div key={fac} className={fac === tab ? undefined : "print-only"}>
                <div className="print-only" style={{ fontWeight: 700, margin: "3mm 0 2mm" }}>
                  {fac}
                </div>
                <div className={f.tableBox}>
                  <div className={f.tableScroll}>
                    <div className={f.grid}>
                      <div className={`${f.gridRow} ${f.gridHead}`}>
                        <span>점검항목</span>
                        <span>장비</span>
                        <span>장애</span>
                        <span>동작상태</span>
                        <span>조치내용</span>
                        <span>조치</span>
                        <span>분야</span>
                        <span>시급성</span>
                        <span className="no-print" />
                      </div>

                      {(sections[fac] ?? []).map((r, i) => (
                        <div key={i} className={f.gridRow}>
                          <CellInput
                            className={f.itemInput}
                            title={r.item}
                            value={r.item}
                            onChange={(e) => upRow(fac, i, "item", e.target.value)}
                          />
                          <Select
                            size="sm"
                            value={r.equipment}
                            options={equipOpts}
                            categoryLabels={EQUIP_CAT_LABELS}
                            placeholder="장비 검색"
                            onChange={(v) => upRow(fac, i, "equipment", v)}
                          />
                          <Select
                            size="sm"
                            value={r.fault}
                            options={faultOpts}
                            placeholder="선택"
                            onChange={(v) => upRow(fac, i, "fault", v)}
                          />
                          <CellInput
                            className={f.cell}
                            placeholder="동작상태"
                            value={r.state}
                            onChange={(e) => upRow(fac, i, "state", e.target.value)}
                          />
                          <CellInput
                            className={f.cell}
                            placeholder="조치내용"
                            value={r.action}
                            onChange={(e) => upRow(fac, i, "action", e.target.value)}
                          />
                          <Select
                            size="sm"
                            value={r.actionCode}
                            options={actionOpts}
                            placeholder="선택"
                            onChange={(v) => upRow(fac, i, "actionCode", v)}
                          />
                          <Select
                            size="sm"
                            value={r.field}
                            options={fieldOpts}
                            placeholder="선택"
                            onChange={(v) => upRow(fac, i, "field", v)}
                          />
                          <div className={f.sev}>
                            {SEVERITIES.map((sv) => {
                              const on = r.urgency === sv.key;
                              return (
                                <button
                                  key={sv.key}
                                  type="button"
                                  className={f.sevBtn}
                                  style={
                                    on ? { color: sv.fg, background: sv.bg, borderColor: sv.line } : undefined
                                  }
                                  onClick={() => upRow(fac, i, "urgency", on ? "" : sv.key)}
                                >
                                  {sv.key}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            className={`${f.delBtn} no-print`}
                            onClick={() => delRow(fac, i)}
                            aria-label="행 삭제"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className={`${f.addRow} no-print`} onClick={() => addRow(tab)}>
              + 행 추가
            </button>
          </section>

          {/* 현황 분석 */}
          <section id="sec-analysis" className={f.section}>
            <h2 className={f.h2}>현황 분석 및 권고사항</h2>

            <div className={f.fieldBlock}>
              <span className={f.label}>학교 요구사항</span>
              <textarea
                className={`${f.textarea} ${f.textareaPlain} no-print`}
                style={{ minHeight: 88 }}
                placeholder="학교에서 요청한 사항을 입력하세요"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
              />
              <div className="print-only print-text">{requirement}</div>
            </div>

            <div className={f.fieldBlock}>
              <div className={f.sectionHead}>
                <span className={f.label}>컨설팅 결과</span>
                <button type="button" className={`${f.autoBtn} no-print`} onClick={autoFillResult}>
                  자동 정리
                </button>
              </div>
              <textarea
                className={`${f.textarea} no-print`}
                style={{ minHeight: 180 }}
                value={consultingResult}
                onChange={(e) => setConsultingResult(e.target.value)}
              />
              <div className="print-only print-text">{consultingResult}</div>
              <span className={`${f.hint} no-print`}>
                코드가 아니라 “내용(명칭)” 기준으로 정리됩니다
              </span>
            </div>

            <div className={f.fieldBlock}>
              <span className={f.label}>개선사항</span>
              <textarea
                className={`${f.textarea} no-print`}
                style={{ minHeight: 160 }}
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
              />
              <div className="print-only print-text">{improvement}</div>
              <span className={`${f.hint} no-print`}>
                점검항목 중 ‘개선사항’만 별도로 정리됩니다
              </span>
            </div>
          </section>

          {/* 총평 */}
          <section id="sec-summary" className={f.section}>
            <div className={f.sectionHead}>
              <h2 className={f.h2}>총평</h2>
              <button type="button" className={`${f.autoBtn} no-print`} onClick={autoFillSummary}>
                자동 요약
              </button>
            </div>
            <div className={f.sumChips}>
              <div className={f.sumChip} style={{ background: "#f9fafb" }}>
                <span className={f.sumChipLabel} style={{ color: "var(--gt-mute)" }}>
                  총
                </span>
                <span className={f.sumChipValue}>{counts.total}건</span>
              </div>
              <div className={f.sumChip} style={{ background: "#fff0f0" }}>
                <span className={f.sumChipLabel} style={{ color: "#c9576a" }}>
                  시급성 상
                </span>
                <span className={f.sumChipValue} style={{ color: "#f04452" }}>
                  {counts.상}
                </span>
              </div>
              <div className={f.sumChip} style={{ background: "var(--gt-amber-bg)" }}>
                <span className={f.sumChipLabel} style={{ color: "#a8802a" }}>
                  중
                </span>
                <span className={f.sumChipValue} style={{ color: "var(--gt-amber)" }}>
                  {counts.중}
                </span>
              </div>
              <div className={f.sumChip} style={{ background: "var(--gt-green-bg)" }}>
                <span className={f.sumChipLabel} style={{ color: "#2c8a52" }}>
                  하
                </span>
                <span className={f.sumChipValue} style={{ color: "var(--gt-green)" }}>
                  {counts.하}
                </span>
              </div>
            </div>
            <textarea
              className={`${f.textarea} ${f.textareaPlain} no-print`}
              style={{ minHeight: 160 }}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <div className="print-only print-text">{summary}</div>
          </section>

          {/* 확인 서명 */}
          <section id="sec-sign" className={f.section}>
            <div className={f.sectionHead}>
              <h2 className={f.h2}>확인 서명 (전자서명)</h2>
              <span
                className={f.signCount}
                style={{
                  color: signedCount === SIGN_ROLES.length ? "var(--gt-green)" : "var(--gt-amber)",
                }}
              >
                {signedCount} / {SIGN_ROLES.length} 서명
              </span>
            </div>
            <div className={f.signGrid}>
              {SIGN_ROLES.map((role) => {
                const v = signs[role] ?? { org: "", name: "", sign: "" };
                return (
                  <div key={role} className={f.signCard}>
                    <div className={f.signRole}>{role}</div>
                    <input
                      className={f.signInput}
                      placeholder="소속"
                      value={v.org}
                      onChange={(e) => upSign(role, "org", e.target.value)}
                    />
                    <input
                      className={f.signName}
                      placeholder="성명"
                      value={v.name}
                      onChange={(e) => upSign(role, "name", e.target.value)}
                    />
                    <SignaturePad height={76} value={v.sign} onChange={(d) => upSign(role, "sign", d)} />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
