"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/components/report/BackButton";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import { CellInput } from "@/components/report/CellInput";
import { PrintInfoTable } from "@/components/report/PrintInfoTable";
import e from "@/components/report/editor.module.css";

type Row = {
  category: string;
  name: string;
  manufacturer: string;
  model: string;
  qty: string;
  location: string;
  amount: string;
  content: string;
};

const CATEGORIES = ["음향", "영상", "기타"];
const LOCATIONS = ["방송실", "시청각실", "특별실", "다목적실", "소강당", "기타실", "강당/체육관", "교실"];
const CONTENTS = [
  "음향장비 교체", "음향장비 설치", "음향장비 점검조정",
  "영상장비 교체", "영상장비 설치", "영상장비 기타",
  "장비 교체", "선로작업", "케이블작업",
];

const opt = (a: string[]) => a.map((v) => ({ value: v, label: v }));

const GRID =
  "34px 108px minmax(150px,1.2fr) 120px minmax(130px,1fr) 70px 140px 120px minmax(160px,1.2fr) 36px";

const emptyRow = (name = ""): Row => ({
  category: "", name, manufacturer: "", model: "",
  qty: "1", location: "", amount: "", content: "",
});

type Code = { code: string; name: string; category?: string };

export function ImprovementForm({
  school, office, district, initial, initialStatus, issues,
}: {
  school: string;
  office: string | null;
  district: string | null;
  initial: { improveDate?: string; handler?: string; items?: Row[]; memo?: string } | null;
  initialStatus: "DRAFT" | "DONE" | null;
  issues: string[];
}) {
  const [improveDate, setImproveDate] = useState(initial?.improveDate ?? "");
  const [handler, setHandler] = useState(initial?.handler ?? "");
  const [rows, setRows] = useState<Row[]>(initial?.items ?? []);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // 코드북 검색
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Code[]>([]);
  const [open, setOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const kw = q.trim();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/codes?kind=EQUIPMENT${kw ? `&q=${encodeURIComponent(kw)}` : ""}`);
        if (r.ok) setHits(await r.json());
      } catch {
        /* 검색 실패는 무시하고 기존 목록 유지 */
      }
    }, kw ? 200 : 0);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const num = (v: string) => Number(String(v).replace(/[^0-9]/g, "")) || 0;
  const total = useMemo(() => rows.reduce((n, r) => n + num(r.amount), 0), [rows]);
  const totalQty = rows.reduce((n, r) => n + (Number(r.qty) || 0), 0);
  const avg = rows.length ? Math.round(total / rows.length) : 0;
  const won = (n: number) => n.toLocaleString("ko-KR");

  function update(i: number, key: keyof Row, val: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }
  function addRow(name = "") {
    setRows((rs) => [...rs, emptyRow(name)]);
  }
  function addFromCode(c: Code) {
    const [en, ko] = c.name.split("—").map((x) => x.trim());
    setRows((rs) => [...rs, { ...emptyRow(en || c.name), model: c.code, manufacturer: ko ?? "" }]);
    setQ("");
    setOpen(false);
  }

  const codeItems = useMemo(
    () =>
      hits.slice(0, 60).map((c) => {
        const [en, ko] = c.name.split("—").map((x) => x.trim());
        return { code: c.code, name: en || c.name, ko: ko ?? "", raw: c };
      }),
    [hits]
  );

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true);
    setMsg(null);
    try {
      await saveReport({
        school,
        type: "IMPROVEMENT",
        payload: { improveDate, handler, items: rows, memo, total },
        status,
      });
      setMsg({ t: status === "DONE" ? "완료 처리되었습니다." : "저장(초안)되었습니다.", ok: true });
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
          <div style={{ minWidth: 0 }}>
            <div className={e.titleRow}>
              <h1 className={e.h1}>개선보고서</h1>
              <span className={e.badge}>{statusLabel}</span>
            </div>
            <div className={e.topMeta}>
              {school} · 개선 요청/조치 · 항목 {rows.length}건
            </div>
          </div>

          <div className={e.topActions}>
            <BackButton className={`${e.btn} ${e.btnMuted}`} />
            <a
              className={e.btn}
              href={`/api/reports/export?school=${encodeURIComponent(school)}&type=IMPROVEMENT`}
            >
              CSV
            </a>
            <button type="button" className={e.btn} onClick={() => window.print()}>PDF</button>
            <span className={e.vbar} />
            <button type="button" className={`${e.btn} ${e.btnOutline}`} disabled={busy} onClick={() => doSave("DRAFT")}>
              저장
            </button>
            <button type="button" className={`${e.btn} ${e.btnPrimary}`} disabled={busy} onClick={() => doSave("DONE")}>
              완료 처리
            </button>
          </div>
        </div>
      </header>

      {/* 인쇄용 표제 */}
      <div className="print-only" style={{ textAlign: "center", marginBottom: "6mm" }}>
        <div style={{ fontSize: "15pt", fontWeight: 700 }}>개선보고서</div>
        <div style={{ fontSize: "9pt", marginTop: "2mm" }}>
          {school}
          {office ? ` · ${office}` : ""}
        </div>
      </div>

      <div className={e.layout} style={{ gridTemplateColumns: "minmax(0,1fr) 280px" }}>
        <div className={e.content}>
          {msg && <div className={`${e.msg} ${msg.ok ? e.msgOk : e.msgErr}`}>{msg.t}</div>}

          {/* 기본 정보 */}
          <section className={e.card}>
            <h2 className={e.h2}>기본 정보</h2>
            <PrintInfoTable
              pairs={[
                { label: "학교명", value: school },
                { label: "교육지원청", value: office ?? "" },
                { label: "주소", value: district ?? "" },
                { label: "개선일자", value: improveDate },
                { label: "취급자 성명", value: handler },
              ]}
            />
            <div className={`${e.infoGrid} no-print`}>
              <label className={e.field}>
                <span className={e.label}>학교명</span>
                <input readOnly value={school} className={`${e.readonly} ${e.readonlyStrong}`} />
              </label>
              <div className={e.field}>
                <span className={e.label}>개선일자</span>
                <DatePicker value={improveDate} onChange={setImproveDate} />
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

          {/* 개선 항목 */}
          <section className={e.card}>
            <div className={e.cardHead}>
              <h2 className={e.h2}>개선 항목</h2>
              <span className={`${e.countText} no-print`}>코드북에서 장비를 선택하거나 직접 입력하세요</span>
            </div>

            {/* 코드북 검색 */}
            <div className={`${e.combo} no-print`} ref={comboRef}>
              <div className={e.comboRow}>
                <input
                  className={`${e.comboInput} ${open ? e.comboInputOn : ""}`}
                  placeholder="장비명 / 코드 검색"
                  value={q}
                  onFocus={() => setOpen(true)}
                  onChange={(ev) => {
                    setQ(ev.target.value);
                    setOpen(true);
                  }}
                />
                <button type="button" className={e.comboBtn} onClick={() => setOpen((v) => !v)}>
                  검색
                </button>
              </div>

              {open && (
                <div className={e.comboPanel}>
                  <div className={e.comboList}>
                    {codeItems.map((it) => (
                      <button key={it.code} type="button" className={e.comboItem} onClick={() => addFromCode(it.raw)}>
                        <span className={e.comboCode}>{it.code}</span>
                        <span className={e.comboName}>{it.name}</span>
                        <span className={e.comboMaker}>{it.ko}</span>
                      </button>
                    ))}
                    {codeItems.length === 0 && <div className={e.comboEmpty}>검색 결과가 없습니다</div>}
                  </div>
                </div>
              )}
            </div>

            {/* 표 */}
            <div className={e.tableBox}>
              <div className={e.tableScroll}>
                <div className={e.gridMin}>
                  <div className={`${e.gridRow} ${e.gridHead}`} style={{ gridTemplateColumns: GRID }}>
                    <span>No</span>
                    <span>분류</span>
                    <span>장비명</span>
                    <span>제조사</span>
                    <span>모델/규격</span>
                    <span>수량</span>
                    <span>설치위치</span>
                    <span>개선금액</span>
                    <span>개선내용</span>
                    <span className="no-print" />
                  </div>

                  {rows.map((r, i) => (
                    <div key={i} className={e.gridRow} style={{ gridTemplateColumns: GRID }}>
                      <span className={e.rowNo}>{i + 1}</span>
                      <Select
                        size="sm"
                        value={r.category}
                        options={opt(CATEGORIES)}
                        placeholder="선택"
                        onChange={(v) => update(i, "category", v)}
                      />
                      <CellInput
                        className={e.cell}
                        style={{ fontWeight: 600 }}
                        placeholder="장비명"
                        value={r.name}
                        onChange={(ev) => update(i, "name", ev.target.value)}
                      />
                      <CellInput
                        className={e.cell}
                        placeholder="제조사"
                        value={r.manufacturer}
                        onChange={(ev) => update(i, "manufacturer", ev.target.value)}
                      />
                      <CellInput
                        className={e.cell}
                        placeholder="모델/규격"
                        value={r.model}
                        onChange={(ev) => update(i, "model", ev.target.value)}
                      />
                      <CellInput
                        className={e.cell}
                        value={r.qty}
                        onChange={(ev) => update(i, "qty", ev.target.value)}
                      />
                      <Select
                        size="sm"
                        value={r.location}
                        options={opt(LOCATIONS)}
                        placeholder="선택"
                        onChange={(v) => update(i, "location", v)}
                      />
                      <CellInput
                        className={e.cell}
                        style={{ fontWeight: 700, textAlign: "right" }}
                        placeholder="0"
                        value={r.amount}
                        onChange={(ev) => update(i, "amount", ev.target.value)}
                      />
                      <Select
                        size="sm"
                        value={r.content}
                        options={opt(CONTENTS)}
                        placeholder="선택"
                        onChange={(v) => update(i, "content", v)}
                      />
                      <button
                        type="button"
                        className={`${e.delBtn} no-print`}
                        onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                        aria-label="행 삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {rows.length === 0 && (
                <div className={e.tableEmpty}>
                  <div className={e.emptyDesc}>행 추가 또는 코드북 검색으로 입력하세요</div>
                </div>
              )}
            </div>

            <button type="button" className={`${e.addRow} no-print`} onClick={() => addRow()}>
              + 행 추가
            </button>

            {/* 인쇄 시 합계는 표 아래에 노출 */}
            <div className="print-only" style={{ textAlign: "right", fontWeight: 700 }}>
              개선금액 합계: {won(total)} 원
            </div>
          </section>

          {/* 비고 */}
          <section className={e.card}>
            <h2 className={e.h2}>비고</h2>
            <textarea
              className={`${e.textarea} no-print`}
              style={{ minHeight: 120 }}
              placeholder="개선 사유, 협의 내용, 후속 조치 계획 등을 기록하세요"
              value={memo}
              onChange={(ev) => setMemo(ev.target.value)}
            />
            <div className="print-only print-text">{memo}</div>
          </section>
        </div>

        {/* 우측 요약 */}
        <div className={`${e.toc} no-print`}>
          <section className={e.sideCard} style={{ padding: 24, gap: 16 }}>
            <div className={e.sideTitle}>개선금액 합계</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1.6px" }}>{won(total)}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gt-mute)" }}>원</span>
            </div>
            <div className={e.divider} />
            <div className={e.sideRow}>
              <span className={e.sideKey}>개선 항목</span>
              <span className={e.sideVal}>{rows.length}건</span>
            </div>
            <div className={e.sideRow}>
              <span className={e.sideKey}>총 수량</span>
              <span className={e.sideVal}>{totalQty}</span>
            </div>
            <div className={e.sideRow}>
              <span className={e.sideKey}>평균 단가</span>
              <span className={e.sideVal}>{won(avg)}원</span>
            </div>
          </section>

          <section className={e.sideCard} style={{ padding: 24, gap: 12 }}>
            <div className={e.sideTitle}>컨설팅 지적사항</div>
            <div className={e.sideDesc}>
              {issues.length
                ? "1차 컨설팅에서 지적된 항목을 개선 항목으로 바로 불러올 수 있습니다."
                : "1차 컨설팅에 등록된 장애 항목이 없습니다."}
            </div>
            {issues.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {issues.map((label) => (
                  <button key={label} type="button" className={e.issueBtn} onClick={() => addRow(label)}>
                    <span className={e.issueDot} />
                    <span className={e.issueText}>{label}</span>
                    <span className={e.issuePlus}>+</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
