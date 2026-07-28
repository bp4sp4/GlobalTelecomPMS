"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/components/report/BackButton";
import { saveReport } from "@/lib/reportClient";
import { DatePicker, Select } from "@/components/ui";
import { CellInput } from "@/components/report/CellInput";
import e from "@/components/report/editor.module.css";

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
  category: "", name: "", manufacturer: "", model: "", qty: "1",
  introDate: "", location: "", handler: "", status: "", replace: "",
});

const LOCATIONS = ["방송실", "시청각실", "특별실", "다목적실", "소강당", "기타실", "강당/체육관"];
const STATUSES = ["정상", "불량", "노후"];
const REPLACE = ["불필요", "필요"];
const CATEGORIES = ["전체", "음향", "전관음향", "영상", "전원"];
const CAT_BY_PREFIX: Record<string, string> = {
  AU: "음향", PA: "전관음향", VI: "영상", ETC: "전원",
};

const opt = (a: string[]) => a.map((v) => ({ value: v, label: v }));
const GRID =
  "minmax(180px,1.4fr) minmax(150px,1.1fr) 80px 150px 150px 120px 120px 120px 40px";

type CatalogItem = { name: string; code: string; maker: string };

export function EquipmentForm({
  school, office, district, initial, initialStatus,
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
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // 장비 카탈로그 검색
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("전체");
  const [nameCat, setNameCat] = useState<Record<string, string>>({});
  const comboRef = useRef<HTMLDivElement>(null);

  // 코드북으로 장비명 → 분류(음향/영상 등) 매핑
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/codes?kind=EQUIPMENT");
        if (!r.ok) return;
        const codes: { code: string; name: string; category: string }[] = await r.json();
        const map: Record<string, string> = {};
        for (const c of codes) {
          const label = CAT_BY_PREFIX[c.category];
          if (!label) continue;
          const key = c.name.split("—")[0].trim().toUpperCase();
          if (key) map[key] = label;
        }
        setNameCat(map);
      } catch {
        /* noop */
      }
    })();
  }, []);

  useEffect(() => {
    const kw = q.trim();
    if (kw.length === 1) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/equipment/search?q=${encodeURIComponent(kw)}&limit=40`);
        if (r.ok) setHits(await r.json());
      } catch {
        /* noop */
      }
    }, kw ? 200 : 0);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const catOf = useMemo(
    () => (name: string) => nameCat[name.trim().toUpperCase()] ?? "",
    [nameCat]
  );
  const visibleHits = useMemo(
    () => (cat === "전체" ? hits : hits.filter((h) => catOf(h.name) === cat)),
    [hits, cat, catOf]
  );

  const totalQty = rows.reduce((n, r) => n + (Number(r.qty) || 0), 0);
  const replaceCount = rows.filter((r) => r.replace === "필요").length;

  function update(i: number, key: keyof Row, val: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }
  function addFromCatalog(it: CatalogItem) {
    setRows((rs) => [
      ...rs,
      { ...emptyRow(), name: it.name, manufacturer: it.maker, model: it.code, category: catOf(it.name) },
    ]);
    setQ("");
    setHits([]);
    setOpen(false);
  }

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true);
    setMsg(null);
    try {
      await saveReport({
        school, type: "EQUIPMENT",
        payload: { inspectDate, handler, items: rows },
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
          <div>
            <div className={e.titleRow}>
              <h1 className={e.h1}>방송 장비 목록</h1>
              <span className={e.badge}>{statusLabel}</span>
            </div>
            <div className={e.topMeta}>
              {school} · {district ?? "—"} · 등록 {rows.length}건
            </div>
          </div>

          <div className={e.topActions}>
            <BackButton className={`${e.btn} ${e.btnMuted}`} />
            <a
              className={e.btn}
              href={`/api/reports/export?school=${encodeURIComponent(school)}&type=EQUIPMENT`}
            >
              CSV
            </a>
            <button type="button" className={e.btn} onClick={() => window.print()}>
              PDF
            </button>
            <span className={e.vbar} />
            <button
              type="button"
              className={`${e.btn} ${e.btnOutline}`}
              disabled={busy}
              onClick={() => doSave("DRAFT")}
            >
              저장
            </button>
            <button
              type="button"
              className={`${e.btn} ${e.btnPrimary}`}
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
        <div style={{ fontSize: "15pt", fontWeight: 700 }}>방송 장비 목록</div>
        <div style={{ fontSize: "9pt", marginTop: "2mm" }}>
          {school} · {office ?? ""}
        </div>
      </div>

      <div className={e.container}>
        {msg && <div className={`${e.msg} ${msg.ok ? e.msgOk : e.msgErr}`}>{msg.t}</div>}

        {/* 기본 정보 */}
        <section className={e.card}>
          <h2 className={e.h2}>기본 정보</h2>
          <div className={e.infoGrid}>
            <div className={e.field}>
              <span className={e.label}>점검일자</span>
              <DatePicker value={inspectDate} onChange={setInspectDate} />
            </div>
            <label className={e.field}>
              <span className={e.label}>학교명</span>
              <input readOnly value={school} className={`${e.readonly} ${e.readonlyStrong}`} />
            </label>
            <label className={e.field}>
              <span className={e.label}>지청</span>
              <input readOnly value={office ?? ""} className={e.readonly} />
            </label>
            <label className={e.field}>
              <span className={e.label}>주소</span>
              <input readOnly value={district ?? ""} className={e.readonly} />
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
          </div>
        </section>

        {/* 장비 목록 */}
        <section className={e.card}>
          <div className={e.cardHead}>
            <h2 className={e.h2}>장비 목록</h2>
            <div className={e.stats}>
              <span>
                등록 <b>{rows.length}</b>건
              </span>
              <span>
                총 수량 <b>{totalQty}</b>
              </span>
              <span>
                <span className={e.statDot} style={{ background: "var(--gt-amber)" }} />
                교체 필요 {replaceCount}
              </span>
            </div>
          </div>

          {/* 장비 검색 */}
          <div className={`${e.combo} no-print`} ref={comboRef}>
            <div className={e.comboRow}>
              <input
                className={`${e.comboInput} ${open ? e.comboInputOn : ""}`}
                placeholder="클릭하면 장비 목록, 입력하면 검색"
                value={q}
                onFocus={() => setOpen(true)}
                onChange={(ev) => {
                  setQ(ev.target.value);
                  setOpen(true);
                }}
              />
              <button
                type="button"
                className={e.comboBtn}
                onClick={() => setRows((rs) => [...rs, emptyRow()])}
              >
                + 추가
              </button>
            </div>

            {open && (
              <div className={e.comboPanel}>
                <div className={e.comboChips}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${e.comboChip} ${cat === c ? e.comboChipOn : ""}`}
                      onClick={() => setCat(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className={e.comboList}>
                  {visibleHits.map((it, k) => (
                    <button
                      key={`${it.code}-${k}`}
                      type="button"
                      className={e.comboItem}
                      onClick={() => addFromCatalog(it)}
                    >
                      <span className={e.comboCode}>{it.code}</span>
                      <span className={e.comboName}>{it.name}</span>
                      <span className={e.comboMaker}>{it.maker}</span>
                    </button>
                  ))}
                  {visibleHits.length === 0 && (
                    <div className={e.comboEmpty}>검색 결과가 없습니다</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 표 */}
          <div className={e.tableBox}>
            <div className={e.tableScroll}>
              <div style={{ minWidth: 1180 }}>
                <div className={`${e.gridRow} ${e.gridHead}`} style={{ gridTemplateColumns: GRID }}>
                  <span>장비명</span>
                  <span>모델/규격</span>
                  <span>수량</span>
                  <span>도입일자</span>
                  <span>설치위치</span>
                  <span>취급자</span>
                  <span>상태</span>
                  <span>교체여부</span>
                  <span className="no-print" />
                </div>

                {rows.map((r, i) => (
                  <div key={i} className={e.gridRow} style={{ gridTemplateColumns: GRID }}>
                    <div className={e.nameCell}>
                      <CellInput
                        className={e.nameInput}
                        placeholder="장비명"
                        value={r.name}
                        onChange={(ev) => update(i, "name", ev.target.value)}
                      />
                      <span className={e.codeText}>{r.manufacturer || "—"}</span>
                    </div>
                    <CellInput
                      className={e.cell}
                      placeholder="모델/규격"
                      value={r.model}
                      onChange={(ev) => update(i, "model", ev.target.value)}
                    />
                    <CellInput
                      className={e.cell}
                      type="number"
                      min={0}
                      value={r.qty}
                      onChange={(ev) => update(i, "qty", ev.target.value)}
                    />
                    <DatePicker value={r.introDate} onChange={(v) => update(i, "introDate", v)} />
                    <Select
                      size="sm"
                      value={r.location}
                      options={opt(LOCATIONS)}
                      placeholder="선택"
                      onChange={(v) => update(i, "location", v)}
                    />
                    <CellInput
                      className={e.cell}
                      placeholder="취급자"
                      value={r.handler}
                      onChange={(ev) => update(i, "handler", ev.target.value)}
                    />
                    <Select
                      size="sm"
                      value={r.status}
                      options={opt(STATUSES)}
                      placeholder="선택"
                      onChange={(v) => update(i, "status", v)}
                    />
                    <Select
                      size="sm"
                      value={r.replace}
                      options={opt(REPLACE)}
                      placeholder="선택"
                      onChange={(v) => update(i, "replace", v)}
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
                <div className={e.emptyTitle}>등록된 장비가 없습니다</div>
                <div className={e.emptyDesc}>위 검색창을 클릭해 장비를 선택하세요</div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`${e.addRow} no-print`}
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
          >
            + 행 추가
          </button>
        </section>
      </div>
    </div>
  );
}
