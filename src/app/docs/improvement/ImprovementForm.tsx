"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import s from "@/components/report/report.module.css";

const opt = (a: string[]) => a.map((v) => ({ value: v, label: v }));

type Row = {
  category: string; name: string; manufacturer: string; model: string;
  qty: string; location: string; amount: string; content: string;
};
const CATEGORIES = ["음향", "영상", "기타"];
const LOCATIONS = ["방송실", "시청각실", "특별실", "다목적실", "소강당", "기타실", "강당/체육관", "교실"];
const CONTENTS = ["음향장비 교체", "음향장비 설치", "음향장비 점검조정", "영상장비 교체", "영상장비 설치", "영상장비 기타", "장비 교체", "선로작업", "케이블작업"];

type Code = { code: string; name: string; category: string };

export function ImprovementForm({
  school, office, district, initial, initialStatus,
}: {
  school: string; office: string | null; district: string | null;
  initial: { improveDate?: string; handler?: string; items?: Row[]; memo?: string } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const [improveDate, setImproveDate] = useState(initial?.improveDate ?? "");
  const [handler, setHandler] = useState(initial?.handler ?? "");
  const [rows, setRows] = useState<Row[]>(initial?.items ?? []);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Code[]>([]);
  const [msg, setMsg] = useState<{ t: string; kind: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(String(r.amount).replace(/[^0-9]/g, "")) || 0), 0),
    [rows]
  );

  async function search() {
    if (!q.trim()) return;
    const res = await fetch(`/api/codes?kind=EQUIPMENT&q=${encodeURIComponent(q.trim())}`);
    if (res.ok) setHits(await res.json());
  }
  function addFromCode(c: Code) {
    setRows((rs) => [...rs, { category: "", name: c.name, manufacturer: "", model: c.code, qty: "", location: "", amount: "", content: "" }]);
  }
  function addRow() { setRows((rs) => [...rs, { category: "", name: "", manufacturer: "", model: "", qty: "", location: "", amount: "", content: "" }]); }

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true); setMsg(null);
    try {
      await saveReport({ school, type: "IMPROVEMENT", payload: { improveDate, handler, items: rows, memo, total }, status });
      setMsg({ t: status === "DONE" ? "완료 처리되었습니다." : "저장(초안)되었습니다.", kind: "statusOk" });
    } catch (e) { setMsg({ t: (e as Error).message, kind: "statusErr" }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className={s.head}>
        <div><h1 className={s.title}>개선보고서</h1><p className={s.subtitle}>개선 요청/조치 작성/저장/완료</p></div>
        <div className={`${s.actions} no-print`}>
          <Link href="/docs" className={s.btn}>문서관리 홈</Link>
          <a className={s.btn} href={`/api/reports/export?school=${encodeURIComponent(school)}&type=IMPROVEMENT`}>CSV 출력</a>
          <button className={s.btn} onClick={() => window.print()}>PDF 출력</button>
          <button className={s.btn} disabled={busy} onClick={() => doSave("DRAFT")}>저장</button>
          <button className={`${s.btn} ${s.btnSuccess}`} disabled={busy} onClick={() => doSave("DONE")}>완료</button>
        </div>
      </div>

      {initialStatus && <div className={`${s.statusMsg} ${s.statusInfo}`}>현재 상태: <span className={`${s.badge} ${initialStatus === "DONE" ? s.badgeDone : s.badgeDraft}`}>{initialStatus === "DONE" ? "완료" : "저장(초안)"}</span></div>}
      {msg && <div className={`${s.statusMsg} ${s[msg.kind]}`}>{msg.t}</div>}

      <div className={s.panel}>
        <h2 className={s.panelTitle}>기본 정보</h2>
        <div className={s.grid}>
          <div className={s.field}><label className={s.label}>학교명</label><input className={`${s.input} ${s.readonly}`} value={school} readOnly /></div>
          <div className={s.field}><label className={s.label}>개선일자</label><DatePicker value={improveDate} onChange={setImproveDate} /></div>
          <div className={s.field}><label className={s.label}>교육지원청</label><input className={`${s.input} ${s.readonly}`} value={office ?? ""} readOnly /></div>
          <div className={s.field}><label className={s.label}>취급자 성명</label><input className={s.input} value={handler} onChange={(e) => setHandler(e.target.value)} placeholder="성명" /></div>
          <div className={s.field}><label className={s.label}>주소</label><input className={`${s.input} ${s.readonly}`} value={district ?? ""} readOnly /></div>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>장비 검색 (코드북)</h2>
        <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem" }}>
          <input className={s.input} style={{ maxWidth: 400 }} placeholder="장비명 / 코드 검색" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={search}>검색</button>
        </div>
        {hits.length > 0 && (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>코드</th><th>장비명</th><th>추가</th></tr></thead>
              <tbody>{hits.map((c) => (
                <tr key={c.code}><td>{c.code}</td><td>{c.name}</td><td><button className={`${s.btn} ${s.btnPrimary}`} style={{ height: 32 }} onClick={() => addFromCode(c)}>+ 행추가</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>개선 항목</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>No</th><th>분류</th><th>장비명</th><th>제조사</th><th>모델/규격</th><th>수량</th><th>설치위치</th><th>개선금액</th><th>개선내용</th><th>삭제</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={10} style={{ textAlign: "center", color: "#6d7882" }}>행 추가 또는 코드북 검색으로 입력하세요.</td></tr>}
              {rows.map((r, i) => {
                const up = (k: keyof Row, v: string) => setRows((a) => a.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td style={{ minWidth: 100 }}><Select size="sm" value={r.category} options={opt(CATEGORIES)} placeholder="선택" onChange={(v) => up("category", v)} /></td>
                    <td><input className={s.cellInput} value={r.name} onChange={(e) => up("name", e.target.value)} /></td>
                    <td><input className={s.cellInput} value={r.manufacturer} onChange={(e) => up("manufacturer", e.target.value)} /></td>
                    <td><input className={s.cellInput} value={r.model} onChange={(e) => up("model", e.target.value)} /></td>
                    <td><input className={s.cellInput} style={{ minWidth: 50 }} value={r.qty} onChange={(e) => up("qty", e.target.value)} /></td>
                    <td style={{ minWidth: 130 }}><Select size="sm" value={r.location} options={opt(LOCATIONS)} placeholder="선택" onChange={(v) => up("location", v)} /></td>
                    <td><input className={s.cellInput} style={{ minWidth: 90 }} value={r.amount} onChange={(e) => up("amount", e.target.value)} /></td>
                    <td style={{ minWidth: 150 }}><Select size="sm" value={r.content} options={opt(CONTENTS)} placeholder="선택" onChange={(v) => up("content", v)} /></td>
                    <td><button className={s.delBtn} onClick={() => setRows((a) => a.filter((_, idx) => idx !== i))}>삭제</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={s.rowBtns}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={addRow}>+ 행 추가</button>
          <div style={{ marginLeft: "auto", fontWeight: 700 }}>개선금액 합계: {total.toLocaleString()} 원</div>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>비고</h2>
        <textarea className={s.input} style={{ height: 100, padding: "1rem 1.2rem", resize: "vertical" }} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
    </>
  );
}
