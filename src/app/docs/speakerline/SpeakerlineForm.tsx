"use client";

import { useState } from "react";
import Link from "next/link";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import s from "@/components/report/report.module.css";

const JUDGE_OPTS = [{ value: "양호", label: "양호" }, { value: "불량", label: "불량" }];
const IMPROVE_OPTS = [{ value: "필요", label: "필요" }, { value: "불필요", label: "불필요" }];

const FIXED = [
  { item: "앰프 랙 인입 스피커 선로 점검", purpose: "앰프 출력단 정상 작동 여부 확인", method: "앰프 출력단에서 직접 측정" },
  { item: "스피커 선로 분배 장치 입력단 점검", purpose: "분배장치 입력단 정상 작동 여부 확인", method: "분배장치 입력단에서 직접 측정" },
  { item: "스피커 선로 절체 장치 점검", purpose: "비상/일반 방송 절체 정상 여부 확인", method: "절체장치에서 직접 측정" },
  { item: "방송 장비 보호 장치 점검", purpose: "스피커 선로 보호장치 정상 여부 확인", method: "보호장치 출력단에서 직접 측정" },
];
const JUDGE = ["양호", "불량"];

type S1 = { judge: string; note: string };
type OutRow = { floor: string; loc: string; db: string; out: string; watt: string; qty: string; judge: string; improve: string; note: string };
type ImpRow = { floor: string; loc: string; terminal: string; ohm: string; judge: string; improve: string; note: string };

export function SpeakerlineForm({
  school, office, district, initial, initialStatus,
}: {
  school: string; office: string | null; district: string | null;
  initial: { inspectDate?: string; handler?: string; section1?: S1[]; section2?: OutRow[]; section3?: ImpRow[]; memo?: string } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const [inspectDate, setInspectDate] = useState(initial?.inspectDate ?? "");
  const [handler, setHandler] = useState(initial?.handler ?? "");
  const [s1, setS1] = useState<S1[]>(initial?.section1 ?? FIXED.map(() => ({ judge: "", note: "" })));
  const [s2, setS2] = useState<OutRow[]>(initial?.section2 ?? []);
  const [s3, setS3] = useState<ImpRow[]>(initial?.section3 ?? []);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [msg, setMsg] = useState<{ t: string; kind: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true); setMsg(null);
    try {
      await saveReport({ school, type: "SPEAKERLINE", payload: { inspectDate, handler, section1: s1, section2: s2, section3: s3, memo }, status });
      setMsg({ t: status === "DONE" ? "완료 처리되었습니다." : "저장(초안)되었습니다.", kind: "statusOk" });
    } catch (e) { setMsg({ t: (e as Error).message, kind: "statusErr" }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>스피커 선로 점검 보고서</h1>
          <p className={s.subtitle}>송출부 점검 · 실별 출력/음압 · 임피던스 측정</p>
        </div>
        <div className={`${s.actions} no-print`}>
          <Link href="/docs" className={s.btn}>문서관리 홈</Link>
          <a className={s.btn} href={`/api/reports/export?school=${encodeURIComponent(school)}&type=SPEAKERLINE`}>CSV 출력</a>
          <button className={s.btn} onClick={() => window.print()}>PDF 출력</button>
          <button className={s.btn} disabled={busy} onClick={() => doSave("DRAFT")}>저장</button>
          <button className={`${s.btn} ${s.btnSuccess}`} disabled={busy} onClick={() => doSave("DONE")}>완료</button>
        </div>
      </div>

      {initialStatus && (
        <div className={`${s.statusMsg} ${s.statusInfo}`}>현재 상태: <span className={`${s.badge} ${initialStatus === "DONE" ? s.badgeDone : s.badgeDraft}`}>{initialStatus === "DONE" ? "완료" : "저장(초안)"}</span></div>
      )}
      {msg && <div className={`${s.statusMsg} ${s[msg.kind]}`}>{msg.t}</div>}

      <div className={s.panel}>
        <h2 className={s.panelTitle}>기본 정보</h2>
        <div className={s.grid}>
          <div className={s.field}><label className={s.label}>학교명</label><input className={`${s.input} ${s.readonly}`} value={school} readOnly /></div>
          <div className={s.field}><label className={s.label}>점검일</label><DatePicker value={inspectDate} onChange={setInspectDate} /></div>
          <div className={s.field}><label className={s.label}>교육지원청</label><input className={`${s.input} ${s.readonly}`} value={office ?? ""} readOnly /></div>
          <div className={s.field}><label className={s.label}>취급자 성명</label><input className={s.input} value={handler} onChange={(e) => setHandler(e.target.value)} placeholder="성명" /></div>
          <div className={s.field}><label className={s.label}>주소</label><input className={`${s.input} ${s.readonly}`} value={district ?? ""} readOnly /></div>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>1. 송출부 스피커 선로 점검</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>No</th><th>점검항목</th><th>목적</th><th>방법</th><th>판정</th><th>비고</th></tr></thead>
            <tbody>
              {FIXED.map((f, i) => (
                <tr key={i}>
                  <td>{i + 1}</td><td>{f.item}</td><td>{f.purpose}</td><td>{f.method}</td>
                  <td style={{ minWidth: 100 }}>
                    <Select size="sm" value={s1[i]?.judge ?? ""} options={JUDGE_OPTS} placeholder="선택" onChange={(v) => setS1((a) => a.map((r, idx) => idx === i ? { ...r, judge: v } : r))} />
                  </td>
                  <td><input className={s.cellInput} value={s1[i]?.note ?? ""} onChange={(e) => setS1((a) => a.map((r, idx) => idx === i ? { ...r, note: e.target.value } : r))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>2. 교실(실) 스피커 출력/음압 점검</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>No</th><th>층</th><th>위치</th><th>음압(dB)</th><th>출력상태</th><th>정격출력(W)</th><th>수량</th><th>판정</th><th>개선여부</th><th>비고</th><th>삭제</th></tr></thead>
            <tbody>
              {s2.length === 0 && <tr><td colSpan={11} style={{ textAlign: "center", color: "#6d7882" }}>행 추가로 입력하세요.</td></tr>}
              {s2.map((r, i) => {
                const up = (k: keyof OutRow, v: string) => setS2((a) => a.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><input className={s.cellInput} style={{ minWidth: 50 }} value={r.floor} onChange={(e) => up("floor", e.target.value)} /></td>
                    <td><input className={s.cellInput} value={r.loc} onChange={(e) => up("loc", e.target.value)} /></td>
                    <td><input className={s.cellInput} style={{ minWidth: 60 }} value={r.db} onChange={(e) => up("db", e.target.value)} /></td>
                    <td><input className={s.cellInput} value={r.out} onChange={(e) => up("out", e.target.value)} /></td>
                    <td><input className={s.cellInput} style={{ minWidth: 70 }} value={r.watt} onChange={(e) => up("watt", e.target.value)} /></td>
                    <td><input className={s.cellInput} style={{ minWidth: 50 }} value={r.qty} onChange={(e) => up("qty", e.target.value)} /></td>
                    <td>
                      <Select size="sm" value={r.judge} options={JUDGE_OPTS} placeholder="선택" onChange={(v) => up("judge", v)} />
                    </td>
                    <td>
                      <Select size="sm" value={r.improve} options={IMPROVE_OPTS} placeholder="선택" onChange={(v) => up("improve", v)} />
                    </td>
                    <td><input className={s.cellInput} value={r.note} onChange={(e) => up("note", e.target.value)} /></td>
                    <td><button className={s.delBtn} onClick={() => setS2((a) => a.filter((_, idx) => idx !== i))}>삭제</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={s.rowBtns}><button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setS2((a) => [...a, { floor: "", loc: "", db: "", out: "", watt: "", qty: "", judge: "", improve: "", note: "" }])}>+ 행 추가</button></div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>3. 스피커 선로 임피던스 측정</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>No</th><th>층</th><th>위치</th><th>방송실 출력단자</th><th>측정저항(Ω)</th><th>판정</th><th>개선여부</th><th>비고</th><th>삭제</th></tr></thead>
            <tbody>
              {s3.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", color: "#6d7882" }}>행 추가로 입력하세요.</td></tr>}
              {s3.map((r, i) => {
                const up = (k: keyof ImpRow, v: string) => setS3((a) => a.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><input className={s.cellInput} style={{ minWidth: 50 }} value={r.floor} onChange={(e) => up("floor", e.target.value)} /></td>
                    <td><input className={s.cellInput} value={r.loc} onChange={(e) => up("loc", e.target.value)} /></td>
                    <td><input className={s.cellInput} value={r.terminal} onChange={(e) => up("terminal", e.target.value)} /></td>
                    <td><input className={s.cellInput} style={{ minWidth: 80 }} value={r.ohm} onChange={(e) => up("ohm", e.target.value)} /></td>
                    <td><select className={s.cellSelect} style={{ minWidth: 70 }} value={r.judge} onChange={(e) => up("judge", e.target.value)}><option value="">선택</option>{JUDGE.map((j) => <option key={j}>{j}</option>)}</select></td>
                    <td><select className={s.cellSelect} style={{ minWidth: 70 }} value={r.improve} onChange={(e) => up("improve", e.target.value)}><option value="">선택</option><option>필요</option><option>불필요</option></select></td>
                    <td><input className={s.cellInput} value={r.note} onChange={(e) => up("note", e.target.value)} /></td>
                    <td><button className={s.delBtn} onClick={() => setS3((a) => a.filter((_, idx) => idx !== i))}>삭제</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={s.rowBtns}><button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setS3((a) => [...a, { floor: "", loc: "", terminal: "", ohm: "", judge: "", improve: "", note: "" }])}>+ 행 추가</button></div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>메모</h2>
        <textarea className={s.input} style={{ height: 100, padding: "1rem 1.2rem", resize: "vertical" }} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
    </>
  );
}
