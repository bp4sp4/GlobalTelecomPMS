"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/report/BackButton";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import { CellInput } from "@/components/report/CellInput";
import { PrintInfoTable } from "@/components/report/PrintInfoTable";
import { LoadPrevious } from "@/components/report/LoadPrevious";
import e from "@/components/report/editor.module.css";

const IMPROVE_OPTS = [
  { value: "필요", label: "필요" },
  { value: "불필요", label: "불필요" },
];

const FIXED = [
  { item: "앰프 랙 인입 스피커 선로 점검", purpose: "앰프 출력단 정상 작동 여부 확인", method: "앰프 출력단에서 직접 측정" },
  { item: "스피커 선로 분배 장치 입력단 점검", purpose: "분배장치 입력단 정상 작동 여부 확인", method: "분배장치 입력단에서 직접 측정" },
  { item: "스피커 선로 절체 장치 점검", purpose: "비상/일반 방송 절체 정상 여부 확인", method: "절체장치에서 직접 측정" },
  { item: "방송 장비 보호 장치 점검", purpose: "스피커 선로 보호장치 정상 여부 확인", method: "보호장치 출력단에서 직접 측정" },
];

/** 판정: 우리 입력값(양호/불량) 유지 */
const VERDICTS = [
  { key: "양호", fg: "var(--gt-green)", bg: "var(--gt-green-bg)", line: "var(--gt-green-dot)" },
  { key: "불량", fg: "#f04452", bg: "#fff0f0", line: "#f04452" },
];

const SECTIONS = [
  { id: "s0", label: "기본 정보" },
  { id: "s1", label: "송출부 점검" },
  { id: "s2", label: "출력/음압" },
  { id: "s3", label: "임피던스" },
  { id: "s4", label: "메모" },
];

const SEND_GRID = "28px minmax(200px,1.3fr) minmax(180px,1.2fr) minmax(180px,1.2fr) 170px minmax(160px,1fr)";
const OUT_GRID = "36px 90px minmax(140px,1.2fr) 110px 120px 120px 80px 170px 130px minmax(140px,1fr) 40px";
const IMP_GRID = "36px 90px minmax(140px,1.2fr) minmax(150px,1.1fr) 130px 170px 130px minmax(140px,1fr) 40px";

type S1 = { judge: string; note: string };
type OutRow = { floor: string; loc: string; db: string; out: string; watt: string; qty: string; judge: string; improve: string; note: string };
type ImpRow = { floor: string; loc: string; terminal: string; ohm: string; judge: string; improve: string; note: string };

const newOut = (): OutRow => ({ floor: "", loc: "", db: "", out: "", watt: "", qty: "1", judge: "", improve: "", note: "" });
const newImp = (): ImpRow => ({ floor: "", loc: "", terminal: "", ohm: "", judge: "", improve: "", note: "" });

function Verdict({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={e.verdict}>
      {VERDICTS.map((v) => {
        const on = value === v.key;
        return (
          <button
            key={v.key}
            type="button"
            className={e.verdictBtn}
            style={on ? { color: v.fg, background: v.bg, borderColor: v.line } : undefined}
            onClick={() => onChange(on ? "" : v.key)}
          >
            {v.key}
          </button>
        );
      })}
    </div>
  );
}

export function SpeakerlineForm({
  school, office, district, initial, initialStatus,
}: {
  school: string; office: string | null; district: string | null;
  initial: { inspectDate?: string; handler?: string; section1?: S1[]; section2?: OutRow[]; section3?: ImpRow[]; memo?: string } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const router = useRouter();
  const [inspectDate, setInspectDate] = useState(initial?.inspectDate ?? "");
  const [handler, setHandler] = useState(initial?.handler ?? "");
  const [s1, setS1] = useState<S1[]>(initial?.section1 ?? FIXED.map(() => ({ judge: "", note: "" })));
  const [s2, setS2] = useState<OutRow[]>(initial?.section2 ?? []);
  const [s3, setS3] = useState<ImpRow[]>(initial?.section3 ?? []);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState("s0");

  useEffect(() => {
    const els = SECTIONS.map((x) => document.getElementById(x.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((x) => x.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const verdicts = useMemo(
    () => [...s1.map((x) => x.judge), ...s2.map((x) => x.judge), ...s3.map((x) => x.judge)],
    [s1, s2, s3]
  );
  const good = verdicts.filter((v) => v === "양호").length;
  const bad = verdicts.filter((v) => v === "불량").length;
  const todo = verdicts.filter((v) => !v).length;

  const counts: Record<string, number | undefined> = {
    s1: FIXED.length,
    s2: s2.length,
    s3: s3.length,
  };

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true);
    setMsg(null);
    try {
      await saveReport({
        school, type: "SPEAKERLINE",
        payload: { inspectDate, handler, section1: s1, section2: s2, section3: s3, memo },
        status,
      });
      if (status === "DONE") {
        // 완료 처리 후에는 문서 작성 화면으로 돌아간다
        setMsg({ t: "완료 처리되었습니다. 문서 작성으로 이동합니다…", ok: true });
        router.push("/docs");
        router.refresh();
        return;
      }
      setMsg({ t: "저장(초안)되었습니다.", ok: true });
    } catch (err) {
      setMsg({ t: (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    initialStatus === "DONE" ? "저장 완료" : initialStatus === "DRAFT" ? "저장(초안)" : "미작성";

  return (
    <div className={e.page}>
      <header className={`${e.topbar} no-print`}>
        <div className={e.topInner}>
          <div>
            <div className={e.titleRow}>
              <h1 className={e.h1}>스피커 선로 점검 보고서</h1>
              <span className={e.badge}>{statusLabel}</span>
            </div>
            <div className={e.topMeta}>
              {school} · 송출부 점검 · 실별 출력/음압 · 임피던스 측정
            </div>
          </div>

          <div className={e.topActions}>
            <BackButton className={`${e.btn} ${e.btnMuted}`} />
            <a className={e.btn} href={`/api/reports/export?school=${encodeURIComponent(school)}&type=SPEAKERLINE`}>CSV</a>
            <button type="button" className={e.btn} onClick={() => window.print()}>PDF</button>
            <span className={e.vbar} />
            <button type="button" className={`${e.btn} ${e.btnOutline}`} disabled={busy} onClick={() => doSave("DRAFT")}>저장</button>
            <button type="button" className={`${e.btn} ${e.btnPrimary}`} disabled={busy} onClick={() => doSave("DONE")}>완료 처리</button>
          </div>
        </div>
      </header>

      {/* 인쇄용 표제 */}
      <div className="print-only" style={{ textAlign: "center", marginBottom: "6mm" }}>
        <div style={{ fontSize: "15pt", fontWeight: 700 }}>스피커 선로 점검 보고서</div>
        <div style={{ fontSize: "9pt", marginTop: "2mm" }}>{school} · {office ?? ""}</div>
      </div>

      <div className={e.layout}>
        {/* 목차 */}
        <nav className={`${e.toc} no-print`}>
          <div className={e.tocList}>
            <div className={e.tocTitle}>문서 구성</div>
            {SECTIONS.map((x) => (
              <a
                key={x.id}
                href={`#${x.id}`}
                className={`${e.tocItem} ${active === x.id ? e.tocItemOn : ""}`}
                onClick={() => setActive(x.id)}
              >
                <span className={e.tocDot} />
                {x.label}
                {counts[x.id] !== undefined && <span className={e.tocCount}>{counts[x.id]}</span>}
              </a>
            ))}
          </div>

          <div className={e.sideCard}>
            <div className={e.sideTitle}>판정 요약</div>
            <div className={e.sideRow}>
              <span className={e.sideKey}>양호</span>
              <span className={e.sideVal} style={{ color: "var(--gt-green)" }}>{good}</span>
            </div>
            <div className={e.sideRow}>
              <span className={e.sideKey}>불량</span>
              <span className={e.sideVal} style={{ color: "#f04452" }}>{bad}</span>
            </div>
            <div className={e.sideRow}>
              <span className={e.sideKey}>미판정</span>
              <span className={e.sideVal} style={{ color: "var(--gt-faint)" }}>{todo}</span>
            </div>
          </div>
        </nav>

        <div className={e.content}>
          {msg && <div className={`${e.msg} ${msg.ok ? e.msgOk : e.msgErr}`}>{msg.t}</div>}

          <LoadPrevious
            school={school}
            type="SPEAKERLINE"
            isEmpty={s2.length === 0 && s3.length === 0 && !s1.some((x) => x.judge || x.note)}
            label="지난 선로 점검"
            onLoad={(p: { section1?: S1[]; section2?: OutRow[]; section3?: ImpRow[]; handler?: string }) => {
              if (p.section1?.length) setS1(p.section1);
              if (p.section2?.length) setS2(p.section2);
              if (p.section3?.length) setS3(p.section3);
              if (p.handler) setHandler(p.handler);
              setMsg({ t: "지난 선로 점검 내용을 불러왔습니다. 재측정 값만 수정하세요.", ok: true });
            }}
          />


          {/* 기본 정보 */}
          <section id="s0" className={e.card}>
            <h2 className={e.h2}>기본 정보</h2>
            <PrintInfoTable
              pairs={[
                { label: "학교명", value: school },
                { label: "교육지원청", value: office ?? "" },
                { label: "주소", value: district ?? "" },
                { label: "점검일", value: inspectDate },
                { label: "취급자 성명", value: handler },
              ]}
            />
            <div className={`${e.infoGrid} no-print`}>
              <label className={e.field}>
                <span className={e.label}>학교명</span>
                <input readOnly value={school} className={`${e.readonly} ${e.readonlyStrong}`} />
              </label>
              <div className={e.field}>
                <span className={e.label}>점검일</span>
                <DatePicker value={inspectDate} onChange={setInspectDate} />
              </div>
              <label className={e.field}>
                <span className={e.label}>교육지원청</span>
                <input readOnly value={office ?? ""} className={e.readonly} />
              </label>
              <label className={e.field}>
                <span className={e.label}>취급자 성명</span>
                <input
                  className={e.input}
                  placeholder="성명"
                  value={handler}
                  onChange={(ev) => setHandler(ev.target.value)}
                />
              </label>
              <label className={e.field}>
                <span className={e.label}>주소</span>
                <input readOnly value={district ?? ""} className={e.readonly} />
              </label>
            </div>
          </section>

          {/* 1. 송출부 */}
          <section id="s1" className={e.card}>
            <div className={e.stepHead}>
              <span className={e.step}>1</span>
              <h2 className={e.h2}>송출부 스피커 선로 점검</h2>
            </div>

            <div className={e.tableBox}>
              <div className={e.tableScroll}>
                <div style={{ minWidth: 1010 }}>
                  <div className={`${e.gridRow} ${e.gridHead}`} style={{ gridTemplateColumns: SEND_GRID }}>
                    <span className={e.rowNo}>No</span>
                    <span>점검항목</span>
                    <span>목적</span>
                    <span>방법</span>
                    <span>판정</span>
                    <span>비고</span>
                  </div>
                  {FIXED.map((item, i) => (
                    <div key={item.item} className={e.gridRow} style={{ gridTemplateColumns: SEND_GRID }}>
                      <span className={e.rowNo}>{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{item.item}</span>
                      <span className={e.cellText}>{item.purpose}</span>
                      <span className={e.cellText}>{item.method}</span>
                      <Verdict
                        value={s1[i]?.judge ?? ""}
                        onChange={(v) => setS1((a) => a.map((r, idx) => (idx === i ? { ...r, judge: v } : r)))}
                      />
                      <CellInput
                        className={e.cell}
                        placeholder="비고"
                        value={s1[i]?.note ?? ""}
                        onChange={(ev) =>
                          setS1((a) => a.map((r, idx) => (idx === i ? { ...r, note: ev.target.value } : r)))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 2. 출력/음압 */}
          <section id="s2" className={e.card}>
            <div className={e.cardHead}>
              <div className={e.stepHead}>
                <span className={e.step}>2</span>
                <h2 className={e.h2}>교실(실) 스피커 출력/음압 점검</h2>
              </div>
              <span className={e.countText}>{s2.length}개 실 측정</span>
            </div>

            <div className={e.tableBox}>
              <div className={e.tableScroll}>
                <div style={{ minWidth: 1180 }}>
                  <div className={`${e.gridRow} ${e.gridHead}`} style={{ gridTemplateColumns: OUT_GRID }}>
                    <span className={e.rowNo}>No</span><span>층</span><span>위치</span><span>음압(dB)</span><span>출력상태</span>
                    <span>정격출력(W)</span><span>수량</span><span>판정</span><span>개선여부</span><span>비고</span>
                    <span className="no-print" />
                  </div>
                  {s2.map((r, i) => {
                    const up = (k: keyof OutRow, v: string) =>
                      setS2((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
                    return (
                      <div key={i} className={e.gridRow} style={{ gridTemplateColumns: OUT_GRID }}>
                        <span className={e.rowNo}>{i + 1}</span>
                        <CellInput className={e.cell} placeholder="1F" value={r.floor} onChange={(ev) => up("floor", ev.target.value)} />
                        <CellInput className={e.cell} placeholder="교실명 / 위치" value={r.loc} onChange={(ev) => up("loc", ev.target.value)} />
                        <CellInput className={e.cell} placeholder="dB" value={r.db} onChange={(ev) => up("db", ev.target.value)} />
                        <CellInput className={e.cell} placeholder="출력상태" value={r.out} onChange={(ev) => up("out", ev.target.value)} />
                        <CellInput className={e.cell} placeholder="W" value={r.watt} onChange={(ev) => up("watt", ev.target.value)} />
                        <CellInput className={e.cell} value={r.qty} onChange={(ev) => up("qty", ev.target.value)} />
                        <Verdict value={r.judge} onChange={(v) => up("judge", v)} />
                        <Select size="sm" value={r.improve} options={IMPROVE_OPTS} placeholder="선택" onChange={(v) => up("improve", v)} />
                        <CellInput className={e.cell} placeholder="비고" value={r.note} onChange={(ev) => up("note", ev.target.value)} />
                        <button
                          type="button"
                          className={`${e.delBtn} no-print`}
                          onClick={() => setS2((a) => a.filter((_, idx) => idx !== i))}
                          aria-label="행 삭제"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {s2.length === 0 && (
                <div className={e.tableEmpty}>
                  <div className={e.emptyDesc}>행 추가로 입력하세요</div>
                </div>
              )}
            </div>

            <button type="button" className={`${e.addRow} no-print`} onClick={() => setS2((a) => [...a, newOut()])}>
              + 행 추가
            </button>
          </section>

          {/* 3. 임피던스 */}
          <section id="s3" className={e.card}>
            <div className={e.cardHead}>
              <div className={e.stepHead}>
                <span className={e.step}>3</span>
                <h2 className={e.h2}>스피커 선로 임피던스 측정</h2>
              </div>
              <span className={e.countText}>{s3.length}개 선로 측정</span>
            </div>

            <div className={e.tableBox}>
              <div className={e.tableScroll}>
                <div style={{ minWidth: 1060 }}>
                  <div className={`${e.gridRow} ${e.gridHead}`} style={{ gridTemplateColumns: IMP_GRID }}>
                    <span className={e.rowNo}>No</span><span>층</span><span>위치</span><span>방송실 출력단자</span><span>측정저항(Ω)</span>
                    <span>판정</span><span>개선여부</span><span>비고</span>
                    <span className="no-print" />
                  </div>
                  {s3.map((r, i) => {
                    const up = (k: keyof ImpRow, v: string) =>
                      setS3((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
                    return (
                      <div key={i} className={e.gridRow} style={{ gridTemplateColumns: IMP_GRID }}>
                        <span className={e.rowNo}>{i + 1}</span>
                        <CellInput className={e.cell} placeholder="1F" value={r.floor} onChange={(ev) => up("floor", ev.target.value)} />
                        <CellInput className={e.cell} placeholder="위치" value={r.loc} onChange={(ev) => up("loc", ev.target.value)} />
                        <CellInput className={e.cell} placeholder="출력단자" value={r.terminal} onChange={(ev) => up("terminal", ev.target.value)} />
                        <CellInput className={e.cell} placeholder="Ω" value={r.ohm} onChange={(ev) => up("ohm", ev.target.value)} />
                        <Verdict value={r.judge} onChange={(v) => up("judge", v)} />
                        <Select size="sm" value={r.improve} options={IMPROVE_OPTS} placeholder="선택" onChange={(v) => up("improve", v)} />
                        <CellInput className={e.cell} placeholder="비고" value={r.note} onChange={(ev) => up("note", ev.target.value)} />
                        <button
                          type="button"
                          className={`${e.delBtn} no-print`}
                          onClick={() => setS3((a) => a.filter((_, idx) => idx !== i))}
                          aria-label="행 삭제"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {s3.length === 0 && (
                <div className={e.tableEmpty}>
                  <div className={e.emptyDesc}>행 추가로 입력하세요</div>
                </div>
              )}
            </div>

            <button type="button" className={`${e.addRow} no-print`} onClick={() => setS3((a) => [...a, newImp()])}>
              + 행 추가
            </button>
          </section>

          {/* 메모 */}
          <section id="s4" className={e.card}>
            <h2 className={e.h2}>메모</h2>
            <textarea
              className={`${e.textarea} no-print`}
              style={{ minHeight: 120 }}
              placeholder="현장 특이사항, 재점검 필요 구역 등을 기록하세요"
              value={memo}
              onChange={(ev) => setMemo(ev.target.value)}
            />
            <div className="print-only print-text">{memo}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
