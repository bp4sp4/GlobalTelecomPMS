"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import { SignaturePad } from "@/components/ui/SignaturePad/SignaturePad";
import s from "@/components/report/report.module.css";
import sig from "./signature.module.css";

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
const URGENCY = ["상", "중", "하"];
const MAINTENANCE = ["매월", "분기별", "비정기", "없음"];
const SIGN_ROLES = ["기술지원단1", "기술지원단2", "교직원지원단1", "교직원지원단2", "학교담당자", "결재"];

type Sign = { org: string; name: string; sign: string };

type Row = {
  item: string; equipment: string; fault: string; state: string;
  action: string; actionCode: string; field: string; urgency: string;
};
type Code = { code: string; name: string; category?: string };

// 장비 코드 접두어 → 한글 분류
const EQUIP_CAT_LABELS: Record<string, string> = {
  AU: "음향",
  PA: "전관음향",
  VI: "영상",
  ETC: "전원",
};

const rowsFor = (fac: string): Row[] =>
  FACILITY_ITEMS[fac].map((item) => ({ item, equipment: "", fault: "", state: "", action: "", actionCode: "", field: "", urgency: "" }));

export function ConsultingForm({
  school, office, district, round, initial, initialStatus,
}: {
  school: string; office: string | null; district: string | null; round: number;
  initial: {
    facilities?: Record<string, boolean>;
    base?: { visitDate?: string; maintenance?: string; suneung?: string };
    sections?: Record<string, Row[]>;
    signatures?: Record<string, Sign>;
  } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const [facilities, setFacilities] = useState<Record<string, boolean>>(
    initial?.facilities ?? { 방송실: true, 시청각실: true, "강당/체육관": true }
  );
  const [visitDate, setVisitDate] = useState(initial?.base?.visitDate ?? "");
  const [maintenance, setMaintenance] = useState(initial?.base?.maintenance ?? "없음");
  const [suneung, setSuneung] = useState(initial?.base?.suneung ?? "아니오");
  const [sections, setSections] = useState<Record<string, Row[]>>(
    initial?.sections ?? Object.fromEntries(FACILITIES.map((f) => [f, rowsFor(f)]))
  );
  const [signs, setSigns] = useState<Record<string, Sign>>(initial?.signatures ?? {});
  const [equip, setEquip] = useState<Code[]>([]);
  const [faults, setFaults] = useState<Code[]>([]);
  const [actions, setActions] = useState<Code[]>([]);
  const [msg, setMsg] = useState<{ t: string; kind: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const equipOpts = useMemo(() => equip.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}`, category: c.category })), [equip]);
  const faultOpts = useMemo(() => faults.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` })), [faults]);
  const actionOpts = useMemo(() => actions.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` })), [actions]);
  const fieldOpts = FIELDS.map((f) => ({ value: f, label: f }));
  const urgencyOpts = URGENCY.map((u) => ({ value: u, label: u }));
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
    setSigns((prev) => ({
      ...prev,
      [role]: { org: "", name: "", sign: "", ...prev[role], [key]: val },
    }));
  }

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true); setMsg(null);
    try {
      await saveReport({
        school, type: "CONSULTING", round,
        payload: { facilities, base: { visitDate, maintenance, suneung }, sections, signatures: signs },
        status,
      });
      setMsg({ t: status === "DONE" ? "완료 처리되었습니다." : "저장(초안)되었습니다.", kind: "statusOk" });
    } catch (e) { setMsg({ t: (e as Error).message, kind: "statusErr" }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>방송장비 컨설팅 보고서</h1>
          <p className={s.subtitle}>{school} · 작성회차: {round}차</p>
        </div>
        <div className={`${s.actions} no-print`}>
          <Link href={`/docs/consulting?school=${encodeURIComponent(school)}`} className={s.btn}>뒤로</Link>
          <a className={s.btn} href={`/api/reports/export?school=${encodeURIComponent(school)}&type=CONSULTING&round=${round}`}>CSV 출력</a>
          <button className={s.btn} onClick={() => window.print()}>PDF 출력</button>
          <button className={s.btn} disabled={busy} onClick={() => doSave("DRAFT")}>저장</button>
          <button className={`${s.btn} ${s.btnSuccess}`} disabled={busy} onClick={() => doSave("DONE")}>완료</button>
        </div>
      </div>

      {initialStatus && <div className={`${s.statusMsg} ${s.statusInfo}`}>현재 상태: <span className={`${s.badge} ${initialStatus === "DONE" ? s.badgeDone : s.badgeDraft}`}>{initialStatus === "DONE" ? "완료" : "저장(초안)"}</span></div>}
      {msg && <div className={`${s.statusMsg} ${s[msg.kind]}`}>{msg.t}</div>}

      <div className={s.panel}>
        <h2 className={s.panelTitle}>시설 선택</h2>
        <div style={{ display: "flex", gap: "1.6rem", flexWrap: "wrap", alignItems: "center" }}>
          {FACILITIES.map((f) => (
            <label key={f} style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={!!facilities[f]} onChange={(e) => setFacilities((p) => ({ ...p, [f]: e.target.checked }))} />
              {f}
            </label>
          ))}
          <span style={{ color: "var(--krds-color-text-caption)", fontSize: "1.3rem" }}>시설이 없으면 체크 해제하면 저장/출력에서 제외됩니다.</span>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>학교 기본 정보</h2>
        <div className={s.grid}>
          <div className={s.field}><label className={s.label}>교육지원청</label><input className={`${s.input} ${s.readonly}`} value={office ?? ""} readOnly /></div>
          <div className={s.field}><label className={s.label}>학교명</label><input className={`${s.input} ${s.readonly}`} value={school} readOnly /></div>
          <div className={s.field}><label className={s.label}>소재지</label><input className={`${s.input} ${s.readonly}`} value={district ?? ""} readOnly /></div>
          <div className={s.field}><label className={s.label}>컨설팅 방문일</label><DatePicker value={visitDate} onChange={setVisitDate} /></div>
          <div className={s.field}><label className={s.label}>유지관리 현황</label>
            <Select value={maintenance} options={maintenanceOpts} onChange={setMaintenance} />
          </div>
          <div className={s.field}><label className={s.label}>수능시험장 여부</label>
            <Select value={suneung} options={suneungOpts} onChange={setSuneung} />
          </div>
        </div>
      </div>

      {FACILITIES.filter((f) => facilities[f]).map((fac) => (
        <div className={s.panel} key={fac}>
          <h2 className={s.panelTitle}>점검 · {fac}</h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>점검항목</th><th>장비</th><th>장애</th><th>동작상태</th><th>조치내용</th><th>조치</th><th>분야</th><th>시급성</th><th>삭제</th></tr></thead>
              <tbody>
                {sections[fac]?.map((r, i) => (
                  <tr key={i}>
                    <td><input className={`${s.cellInput} ${s.itemCell}`} title={r.item} value={r.item} onChange={(e) => upRow(fac, i, "item", e.target.value)} /></td>
                    <td style={{ minWidth: 170 }}><Select size="sm" value={r.equipment} options={equipOpts} categoryLabels={EQUIP_CAT_LABELS} placeholder="선택" onChange={(v) => upRow(fac, i, "equipment", v)} /></td>
                    <td style={{ minWidth: 170 }}><Select size="sm" value={r.fault} options={faultOpts} placeholder="선택" onChange={(v) => upRow(fac, i, "fault", v)} /></td>
                    <td><input className={s.cellInput} value={r.state} onChange={(e) => upRow(fac, i, "state", e.target.value)} /></td>
                    <td><input className={s.cellInput} value={r.action} onChange={(e) => upRow(fac, i, "action", e.target.value)} /></td>
                    <td style={{ minWidth: 170 }}><Select size="sm" value={r.actionCode} options={actionOpts} placeholder="선택" onChange={(v) => upRow(fac, i, "actionCode", v)} /></td>
                    <td style={{ minWidth: 100 }}><Select size="sm" value={r.field} options={fieldOpts} placeholder="선택" onChange={(v) => upRow(fac, i, "field", v)} /></td>
                    <td style={{ minWidth: 90 }}><Select size="sm" value={r.urgency} options={urgencyOpts} placeholder="선택" onChange={(v) => upRow(fac, i, "urgency", v)} /></td>
                    <td><button className={s.delBtn} onClick={() => delRow(fac, i)}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={s.rowBtns}><button className={`${s.btn} ${s.btnPrimary}`} onClick={() => addRow(fac)}>+ 행 추가</button></div>
        </div>
      ))}

      <div className={s.panel}>
        <h2 className={s.panelTitle}>확인 서명란 (전자서명)</h2>
        <div className={s.tableWrap}>
          <table className={sig.table}>
            <thead>
              <tr>
                <th className={sig.rowLabel}>구분</th>
                {SIGN_ROLES.map((role) => <th key={role}>{role}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className={sig.rowLabel}>소속</th>
                {SIGN_ROLES.map((role) => (
                  <td key={role}>
                    <input className={sig.cellInput} placeholder="소속" value={signs[role]?.org ?? ""} onChange={(e) => upSign(role, "org", e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr>
                <th className={sig.rowLabel}>성명</th>
                {SIGN_ROLES.map((role) => (
                  <td key={role}>
                    <input className={sig.cellInput} placeholder="성명" value={signs[role]?.name ?? ""} onChange={(e) => upSign(role, "name", e.target.value)} />
                  </td>
                ))}
              </tr>
              <tr>
                <th className={sig.rowLabel}>서명</th>
                {SIGN_ROLES.map((role) => (
                  <td key={role} className={sig.signCell}>
                    <SignaturePad height={64} value={signs[role]?.sign} onChange={(d) => upSign(role, "sign", d)} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
