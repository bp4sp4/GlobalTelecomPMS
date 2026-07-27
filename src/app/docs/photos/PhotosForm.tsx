"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { saveReport } from "@/lib/reportClient";
import { DatePicker } from "@/components/ui";
import s from "@/components/report/report.module.css";
import p from "./photos.module.css";

const CATEGORIES = ["장비사진", "개선사진", "교육사진", "집중진단"];
const ROOMS = ["방송실", "강당/체육관", "시청각실", "특별실", "다목적실", "소강당", "기타실"];

type Photo = { url: string; name: string };
type Store = Record<string, Record<string, Photo[]>>; // category -> room -> photos

export function PhotosForm({
  school, office, district, initial, initialStatus,
}: {
  school: string; office: string | null; district: string | null;
  initial: { shootDate?: string; handler?: string; memo?: string; photos?: Store } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const [shootDate, setShootDate] = useState(initial?.shootDate ?? "");
  const [handler, setHandler] = useState(initial?.handler ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [store, setStore] = useState<Store>(initial?.photos ?? {});
  const [msg, setMsg] = useState<{ t: string; kind: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const get = (room: string): Photo[] => store[cat]?.[room] ?? [];

  async function onFiles(room: string, files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(room);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      fd.append("school", school);
      fd.append("category", cat);
      fd.append("room", room);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? "업로드 실패");
      setStore((prev) => {
        const next = { ...prev };
        next[cat] = { ...(next[cat] ?? {}) };
        next[cat][room] = [...(next[cat][room] ?? []), ...d.files];
        return next;
      });
    } catch (e) {
      setMsg({ t: (e as Error).message, kind: "statusErr" });
    } finally {
      setUploading(null);
    }
  }

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true); setMsg(null);
    try {
      await saveReport({ school, type: "PHOTOS", payload: { shootDate, handler, memo, photos: store }, status });
      setMsg({ t: status === "DONE" ? "완료 처리되었습니다." : "저장(초안)되었습니다.", kind: "statusOk" });
    } catch (e) { setMsg({ t: (e as Error).message, kind: "statusErr" }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className={s.head}>
        <div><h1 className={s.title}>방송사진</h1><p className={s.subtitle}>폴더별 사진 업로드 · 저장/완료</p></div>
        <div className={`${s.actions} no-print`}>
          <Link href="/docs" className={s.btn}>문서관리 홈</Link>
          <a className={s.btn} href={`/api/reports/export?school=${encodeURIComponent(school)}&type=PHOTOS`}>CSV 출력</a>
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
          <div className={s.field}><label className={s.label}>지청</label><input className={`${s.input} ${s.readonly}`} value={office ?? ""} readOnly /></div>
          <div className={s.field}><label className={s.label}>주소</label><input className={`${s.input} ${s.readonly}`} value={district ?? ""} readOnly /></div>
          <div className={s.field}><label className={s.label}>촬영/점검일</label><DatePicker value={shootDate} onChange={setShootDate} /></div>
          <div className={s.field}><label className={s.label}>담당자</label><input className={s.input} value={handler} onChange={(e) => setHandler(e.target.value)} placeholder="성명" /></div>
          <div className={s.field}><label className={s.label}>메모</label><input className={s.input} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="비고" /></div>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.panelTitle}>사진 구분</h2>
        <div className={p.tabs}>
          {CATEGORIES.map((c) => (
            <button key={c} className={`${p.tab} ${cat === c ? p.tabActive : ""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className={p.rooms}>
        {ROOMS.map((room) => {
          const photos = get(room);
          return (
            <div key={room} className={p.roomCard}>
              <div className={p.roomHead}>
                <b>{room}</b>
                <button className={`${s.btn} ${s.btnPrimary}`} style={{ height: 36 }}
                  disabled={uploading === room}
                  onClick={() => inputs.current[room]?.click()}>
                  {uploading === room ? "업로드 중..." : "사진 찾기"}
                </button>
                <input ref={(el) => { inputs.current[room] = el; }} type="file" accept="image/*" multiple hidden
                  onChange={(e) => onFiles(room, e.target.files)} />
              </div>
              <div className={p.thumbs}>
                {photos.length === 0 && <span className={p.empty}>업로드된 사진 없음</span>}
                {photos.map((ph, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={ph.url} alt={ph.name} className={p.thumb} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
