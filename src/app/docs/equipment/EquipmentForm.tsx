"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import s from "@/components/report/report.module.css";

const opt = (a: string[]) => a.map((v) => ({ value: v, label: v }));

type Row = {
  category: string;
  name: string;
  manufacturer: string;
  model: string;
  qty: string;
  introDate: string;
  location: string;
  handler: string;
  status: string;
  replace: string;
};

const emptyRow = (): Row => ({
  category: "",
  name: "",
  manufacturer: "",
  model: "",
  qty: "",
  introDate: "",
  location: "",
  handler: "",
  status: "",
  replace: "",
});

const LOCATIONS = ["방송실", "시청각실", "특별실", "다목적실", "소강당", "기타실", "강당/체육관"];
const CATEGORIES = ["음향", "영상", "기타"];
const STATUSES = ["양호", "불량", "노후"];

export function EquipmentForm({
  school,
  office,
  district,
  initial,
  initialStatus,
}: {
  school: string;
  office: string | null;
  district: string | null;
  initial: { inspectDate?: string; handler?: string; items?: Row[] } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const [inspectDate, setInspectDate] = useState(initial?.inspectDate ?? "");
  const [handler, setHandler] = useState(initial?.handler ?? "");
  const [rows, setRows] = useState<Row[]>(initial?.items ?? []);
  const [msg, setMsg] = useState<{ t: string; kind: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 장비 카탈로그 검색
  const [eqQ, setEqQ] = useState("");
  const [eqHits, setEqHits] = useState<{ name: string; code: string; maker: string }[]>([]);
  const [eqOpen, setEqOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = eqQ.trim();
    if (q.length === 1) {
      setEqHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        // 빈 검색어면 기본 리스트(가나다순 상위) 노출
        const r = await fetch(`/api/equipment/search?q=${encodeURIComponent(q)}&limit=30`);
        if (r.ok) setEqHits(await r.json());
      } catch {
        /* noop */
      }
    }, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [eqQ]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setEqOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function addFromCatalog(it: { name: string; code: string; maker: string }) {
    setRows((rs) => [
      ...rs,
      { ...emptyRow(), name: it.name, manufacturer: it.maker, model: it.code, qty: "1" },
    ]);
    setEqQ("");
    setEqHits([]);
    setEqOpen(false);
  }

  function update(i: number, key: keyof Row, val: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }
  function delRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true);
    setMsg(null);
    try {
      await saveReport({
        school,
        type: "EQUIPMENT",
        payload: { inspectDate, handler, items: rows },
        status,
      });
      setMsg({
        t: status === "DONE" ? "완료 처리되었습니다." : "저장(초안)되었습니다.",
        kind: "statusOk",
      });
    } catch (e) {
      setMsg({ t: (e as Error).message, kind: "statusErr" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>방송 장비 목록</h1>
          <p className={s.subtitle}>학교별 장비 목록 작성/저장/완료</p>
        </div>
        <div className={`${s.actions} no-print`}>
          <Link href="/docs" className={s.btn}>
            문서관리 홈
          </Link>
          <a className={s.btn} href={`/api/reports/export?school=${encodeURIComponent(school)}&type=EQUIPMENT`}>CSV 출력</a>
          <button className={s.btn} onClick={() => window.print()}>PDF 출력</button>
          <button className={s.btn} disabled={busy} onClick={() => doSave("DRAFT")}>
            저장(초안)
          </button>
          <button
            className={`${s.btn} ${s.btnSuccess}`}
            disabled={busy}
            onClick={() => doSave("DONE")}
          >
            완료
          </button>
        </div>
      </div>

      {initialStatus && (
        <div className={`${s.statusMsg} ${s.statusInfo}`}>
          현재 상태:{" "}
          <span className={`${s.badge} ${initialStatus === "DONE" ? s.badgeDone : s.badgeDraft}`}>
            {initialStatus === "DONE" ? "완료" : "저장(초안)"}
          </span>
        </div>
      )}
      {msg && <div className={`${s.statusMsg} ${s[msg.kind]}`}>{msg.t}</div>}

      <div className={s.panel}>
        <h2 className={s.panelTitle}>기본 정보</h2>
        <div className={s.grid}>
          <div className={s.field}>
            <label className={s.label}>점검일자</label>
            <DatePicker value={inspectDate} onChange={setInspectDate} />
          </div>
          <div className={s.field}>
            <label className={s.label}>학교명</label>
            <input className={`${s.input} ${s.readonly}`} value={school} readOnly />
          </div>
          <div className={s.field}>
            <label className={s.label}>지청</label>
            <input className={`${s.input} ${s.readonly}`} value={office ?? ""} readOnly />
          </div>
          <div className={s.field}>
            <label className={s.label}>주소</label>
            <input className={`${s.input} ${s.readonly}`} value={district ?? ""} readOnly />
          </div>
          <div className={s.field}>
            <label className={s.label}>취급자 성명</label>
            <input
              className={s.input}
              value={handler}
              onChange={(e) => setHandler(e.target.value)}
              placeholder="성명"
            />
          </div>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>장비 목록</h2>

        <div ref={searchRef} style={{ position: "relative", maxWidth: 480, marginBottom: "1.6rem" }}>
          <input
            className={s.input}
            placeholder="클릭하면 장비 목록, 입력하면 검색"
            value={eqQ}
            onChange={(e) => {
              setEqQ(e.target.value);
              setEqOpen(true);
            }}
            onFocus={() => setEqOpen(true)}
          />
          {eqOpen && eqHits.length > 0 && (
            <div
              style={{
                position: "absolute", left: 0, right: 0, zIndex: 30,
                maxHeight: 320, overflowY: "auto", background: "#fff",
                border: "1px solid var(--krds-color-border-subtle)",
                borderRadius: "var(--krds-radius-medium)", boxShadow: "var(--krds-shadow-modal)",
              }}
            >
              {eqHits.map((it, k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => addFromCatalog(it)}
                  style={{
                    display: "flex", justifyContent: "space-between", gap: "1rem", width: "100%",
                    padding: "1rem 1.2rem", border: "none", background: "transparent",
                    cursor: "pointer", textAlign: "left", fontSize: "1.4rem",
                    borderBottom: "1px solid var(--krds-gray-10)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{it.name}</span>
                  <span style={{ color: "var(--krds-gray-50)" }}>{it.maker} · {it.code}</span>
                </button>
              ))}
            </div>
          )}
          <p style={{ fontSize: "1.3rem", color: "var(--krds-color-text-caption)", marginTop: "0.6rem" }}>
            검색 후 항목을 클릭하면 아래 표에 자동 추가됩니다.
          </p>
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>No</th>
                <th>분류</th>
                <th>장비명</th>
                <th>제조사</th>
                <th>모델/규격</th>
                <th>수량</th>
                <th>도입일자</th>
                <th>설치위치</th>
                <th>취급자</th>
                <th>상태</th>
                <th>교체여부</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", color: "#6d7882" }}>
                    행 추가를 눌러 장비를 입력하세요.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ minWidth: 110 }}><Select size="sm" value={r.category} options={opt(CATEGORIES)} placeholder="선택" onChange={(v) => update(i, "category", v)} /></td>
                  <td><input className={s.cellInput} value={r.name} onChange={(e) => update(i, "name", e.target.value)} /></td>
                  <td><input className={s.cellInput} value={r.manufacturer} onChange={(e) => update(i, "manufacturer", e.target.value)} /></td>
                  <td><input className={s.cellInput} value={r.model} onChange={(e) => update(i, "model", e.target.value)} /></td>
                  <td><input className={s.cellInput} style={{ minWidth: 60 }} value={r.qty} onChange={(e) => update(i, "qty", e.target.value)} /></td>
                  <td><input type="date" className={s.cellInput} value={r.introDate} onChange={(e) => update(i, "introDate", e.target.value)} /></td>
                  <td style={{ minWidth: 130 }}><Select size="sm" value={r.location} options={opt(LOCATIONS)} placeholder="선택" onChange={(v) => update(i, "location", v)} /></td>
                  <td><input className={s.cellInput} style={{ minWidth: 70 }} value={r.handler} onChange={(e) => update(i, "handler", e.target.value)} /></td>
                  <td style={{ minWidth: 100 }}><Select size="sm" value={r.status} options={opt(STATUSES)} placeholder="선택" onChange={(v) => update(i, "status", v)} /></td>
                  <td style={{ minWidth: 100 }}><Select size="sm" value={r.replace} options={opt(["필요", "불필요"])} placeholder="선택" onChange={(v) => update(i, "replace", v)} /></td>
                  <td><button className={s.delBtn} onClick={() => delRow(i)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.rowBtns}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={addRow}>+ 행 추가</button>
        </div>
      </div>
    </>
  );
}
