"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SeoulMap } from "./SeoulMap";
import st from "./stats.module.css";

export type OfficeStat = {
  name: string;
  full: string;
  schools: number;
  el: number;
  mid: number;
  high: number;
  etc: number;
  done: number;
  improve: number;
  focus: number;
  old: number;
  fault: number;
  urgent: number; // 시급성 '상' 건수
};
export type Kpi = { label: string; value: string; note: string };

const SERIES = [
  { key: "schools", label: "학교수", color: "#3182f6" },
  { key: "done", label: "컨설팅(완료)", color: "#00b843" },
  { key: "improve", label: "개선(건)", color: "#f04452" },
  { key: "focus", label: "집중진단", color: "#f59e0b" },
  { key: "old", label: "노후화", color: "#e0455f" },
  { key: "fault", label: "장애", color: "#8b5cf6" },
] as const;

const TABLE_GRID =
  "minmax(150px,1.4fr) 76px 56px 56px 56px 60px 110px 90px 96px 84px 72px";

const num = (d: OfficeStat, k: string) => (d as unknown as Record<string, number>)[k] ?? 0;

export function StatsView({ data, kpis }: { data: OfficeStat[]; kpis: Kpi[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"막대" | "히트맵" | "지도">("막대");
  const [sel, setSel] = useState(data[0]?.name ?? "");
  const [office, setOffice] = useState("");
  const [school, setSchool] = useState("");

  const max = useMemo(() => Math.max(1, ...data.map((d) => d.schools)), [data]);
  const current = data.find((d) => d.name === sel) ?? data[0];
  const rate = current && current.schools ? Math.round((current.done / current.schools) * 1000) / 10 : 0;

  const colMax = useMemo(() => {
    const m: Record<string, number> = {};
    SERIES.forEach((c) => (m[c.key] = Math.max(1, ...data.map((d) => num(d, c.key)))));
    return m;
  }, [data]);

  const mapOffices = useMemo(
    () =>
      data.map((d) => ({
        key: d.name,
        full: d.full,
        schools: d.schools,
        done: d.done,
        urgent: d.urgent,
      })),
    [data]
  );

  function openSchools() {
    const p = new URLSearchParams();
    if (school.trim()) p.set("q", school.trim());
    router.push(`/docs${p.toString() ? `?${p}` : ""}`);
  }

  if (!current) {
    return <div className={st.emptyPage}>집계할 학교 데이터가 없습니다.</div>;
  }

  return (
    <>
      <div className={st.body}>
        {/* 필터 툴바 */}
        <div className={st.toolbarRow}>
          <select
            className={st.select}
            value={office}
            onChange={(e) => {
              setOffice(e.target.value);
              if (e.target.value) setSel(e.target.value);
            }}
          >
            <option value="">전체 교육지원청</option>
            {data.map((d) => (
              <option key={d.name} value={d.name}>
                {d.full}
              </option>
            ))}
          </select>
          <input
            className={st.input}
            placeholder="학교명(옵션)"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openSchools()}
          />
          <button type="button" className={st.btnPrimary} onClick={() => router.refresh()}>
            새로고침
          </button>
        </div>

        {/* KPI */}
        <div className={st.kpis}>
          {kpis.map((k) => (
            <div key={k.label} className={st.kpi}>
              <div className={st.kpiLabel}>{k.label}</div>
              <div className={st.kpiValue}>{k.value}</div>
              <div className={st.kpiNote}>{k.note}</div>
            </div>
          ))}
        </div>

        {/* 차트 */}
        <section className={st.card}>
          <div className={st.cardHead}>
            <div>
              <h2 className={st.h2}>지청별 요약 (학교수 / 진단 / 이슈)</h2>
              <span className={st.hint}>그래프·지도·표에서 지청을 클릭하면 우측 상세가 바뀝니다</span>
            </div>
            <div className={st.tabs}>
              {(["막대", "히트맵", "지도"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${st.tab} ${tab === t ? st.tabOn : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tab === "막대" && (
            <>
              <div className={st.legend}>
                {SERIES.map((s) => (
                  <span key={s.key} className={st.legendItem}>
                    <span className={st.swatch} style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
              <div className={st.chartScroll}>
                <div
                  className={st.chart}
                  style={{ gridTemplateColumns: `repeat(${data.length},minmax(0,1fr))` }}
                >
                  {data.map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      className={`${st.barCol} ${sel === d.name ? st.barColOn : ""}`}
                      onClick={() => setSel(d.name)}
                    >
                      <span className={st.barTop}>{d.schools}</span>
                      <span className={st.barStack}>
                        {SERIES.map((s) => (
                          <span
                            key={s.key}
                            className={st.bar}
                            style={{
                              height: Math.max(4, Math.round((num(d, s.key) / max) * 140)),
                              background: s.color,
                            }}
                            title={`${s.label} ${num(d, s.key)}`}
                          />
                        ))}
                      </span>
                      <span className={st.barName}>{d.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "히트맵" && (
            <div className={st.chartScroll}>
              <div className={st.heat}>
                <div
                  className={st.heatRow}
                  style={{ gridTemplateColumns: `150px repeat(${SERIES.length},minmax(0,1fr))` }}
                >
                  <span className={st.heatHeadCell}>교육지원청</span>
                  {SERIES.map((c) => (
                    <span key={c.key} className={`${st.heatHeadCell} ${st.center}`}>
                      {c.label.replace("(완료)", "").replace("(건)", "")}
                    </span>
                  ))}
                </div>
                {data.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    className={`${st.heatRow} ${st.heatRowBtn} ${sel === d.name ? st.heatRowOn : ""}`}
                    style={{ gridTemplateColumns: `150px repeat(${SERIES.length},minmax(0,1fr))` }}
                    onClick={() => setSel(d.name)}
                  >
                    <span className={st.heatName}>{d.full}</span>
                    {SERIES.map((c) => {
                      const v = num(d, c.key);
                      const t = v / colMax[c.key];
                      return (
                        <span
                          key={c.key}
                          className={st.heatCell}
                          style={{ background: `rgba(49,130,246,${(0.08 + t * 0.82).toFixed(2)})` }}
                        >
                          <span style={{ color: t > 0.55 ? "#fff" : "var(--gt-sub)" }}>{v}</span>
                        </span>
                      );
                    })}
                  </button>
                ))}
                <div className={st.legendBarRow}>
                  <span className={st.hint}>낮음</span>
                  <div className={st.legendBar} />
                  <span className={st.hint}>높음</span>
                  <span className={st.hint}>셀 값은 각 지표의 건수입니다</span>
                </div>
              </div>
            </div>
          )}

          {tab === "지도" && (
            <div className={st.mapBox}>
              <SeoulMap offices={mapOffices} selected={sel} onSelect={setSel} />
            </div>
          )}
        </section>

        {/* 표 + 상세 */}
        <div className={st.split}>
          <section className={`${st.card} ${st.tableCard}`}>
            <div className={st.tableHead}>
              <h2 className={st.h2}>지청별 요약</h2>
              <span className={st.hint}>행을 클릭하면 우측 상세가 바뀝니다</span>
            </div>
            <div className={st.chartScroll}>
              <div className={st.tableInner}>
                <div className={`${st.row} ${st.rowHead}`} style={{ gridTemplateColumns: TABLE_GRID }}>
                  <span>교육지원청</span>
                  <span>학교수</span>
                  <span>초</span>
                  <span>중</span>
                  <span>고</span>
                  <span>기타</span>
                  <span>컨설팅(완료)</span>
                  <span>개선(건)</span>
                  <span>집중진단</span>
                  <span>노후화</span>
                  <span>장애</span>
                </div>
                {data.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    className={`${st.row} ${st.rowBtn} ${sel === d.name ? st.rowOn : ""}`}
                    style={{ gridTemplateColumns: TABLE_GRID }}
                    onClick={() => setSel(d.name)}
                  >
                    <span className={st.officeName}>{d.full}</span>
                    <span className={st.strong}>{d.schools}</span>
                    <span className={st.cell}>{d.el}</span>
                    <span className={st.cell}>{d.mid}</span>
                    <span className={st.cell}>{d.high}</span>
                    <span className={st.dim}>{d.etc}</span>
                    <span className={d.done > 0 ? st.doneVal : st.dim}>{d.done}</span>
                    <span className={st.cell}>{d.improve}</span>
                    <span className={st.cell}>{d.focus}</span>
                    <span className={st.cell}>{d.old}</span>
                    <span className={st.cell}>{d.fault}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={`${st.card} ${st.detail}`}>
            <div className={st.detailHead}>
              <span className={st.detailLabel}>선택 상세</span>
              <span className={st.detailTitle}>{current.full}</span>
              <span className={st.hint}>
                초 {current.el} · 중 {current.mid} · 고 {current.high} · 기타 {current.etc}
              </span>
            </div>

            <div className={st.detailBig}>
              <span className={st.bigNum}>{current.schools}</span>
              <span className={st.bigUnit}>개교</span>
              <span className={st.bigRate}>진행률 {rate}%</span>
            </div>

            <div className={st.metrics}>
              {[
                { label: "컨설팅(완료)", value: current.done, color: "#00b843" },
                { label: "개선(건)", value: current.improve, color: "#f04452" },
                { label: "집중진단", value: current.focus, color: "#f59e0b" },
                { label: "노후화", value: current.old, color: "#e0455f" },
                { label: "장애", value: current.fault, color: "#8b5cf6" },
              ].map((mt) => (
                <div key={mt.label} className={st.metric}>
                  <span className={st.swatch} style={{ background: mt.color }} />
                  <span className={st.metricLabel}>{mt.label}</span>
                  <span className={st.metricValue}>{mt.value}</span>
                </div>
              ))}
            </div>

            <button type="button" className={st.btnGhost} onClick={openSchools}>
              학교 목록 보기
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
