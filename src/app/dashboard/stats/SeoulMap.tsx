"use client";

import { useEffect, useMemo, useState } from "react";
import m from "./map.module.css";

/**
 * 서울 교육지원청 지도 — 진행률 / 시급성(상) 두 지표를 토글로 표시.
 * 경계 데이터는 public/geo 에 내장하고(외부 CDN 미사용), 메르카토르 투영을 직접 계산한다.
 * 출처: KOSTAT 2013 행정구역 경계 (southkorea/seoul-maps)
 */

const GEO_SRC = "/geo/seoul-municipalities.json";
const W = 620;
const H = 500;
const PAD = 14;

/** 교육지원청 관할 자치구 (도메인 상수) */
export const OFFICE_GU: Record<string, string[]> = {
  동부: ["동대문구", "중랑구"],
  서부: ["마포구", "서대문구", "은평구"],
  남부: ["영등포구", "구로구", "금천구"],
  북부: ["노원구", "도봉구"],
  중부: ["종로구", "중구", "용산구"],
  강동송파: ["강동구", "송파구"],
  강서양천: ["강서구", "양천구"],
  강남서초: ["강남구", "서초구"],
  동작관악: ["동작구", "관악구"],
  성동광진: ["성동구", "광진구"],
  성북강북: ["성북구", "강북구"],
};

export type MapOffice = {
  key: string;
  full: string;
  schools: number;
  done: number;
  urgent: number;
};

type Ring = [number, number][];
type Feature = {
  properties: { name: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

/** 메르카토르 (경도/위도 → 평면) */
function project(lon: number, lat: number): [number, number] {
  return [(lon * Math.PI) / 180, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
}

function ringsOf(f: Feature): Ring[] {
  const c = f.geometry.coordinates as number[][][] | number[][][][];
  if (f.geometry.type === "Polygon") return (c as number[][][]).map((r) => r as Ring);
  return (c as number[][][][]).flatMap((poly) => poly.map((r) => r as Ring));
}

/** 링의 면적 가중 중심 (라벨 위치) */
function centroid(ring: [number, number][]): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f;
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  if (a === 0) return ring[0];
  return [cx / (3 * a), cy / (3 * a)];
}

type Shape = { name: string; d: string; label: [number, number] };
type Mode = "rate" | "risk";

export function SeoulMap({
  offices,
  selected,
  onSelect,
}: {
  offices: MapOffice[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const [shapes, setShapes] = useState<Shape[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("rate");

  const guToOffice = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [office, gus] of Object.entries(OFFICE_GU)) {
      for (const g of gus) map[g] = office;
    }
    return map;
  }, []);

  const byKey = useMemo(() => Object.fromEntries(offices.map((o) => [o.key, o])), [offices]);
  const rateOf = (k: string) => {
    const o = byKey[k];
    return o && o.schools ? (o.done / o.schools) * 100 : 0;
  };
  const riskOf = (k: string) => byKey[k]?.urgent ?? 0;
  const metricOf = mode === "rate" ? rateOf : riskOf;

  const maxMetric = useMemo(
    () => Math.max(1, ...offices.map((o) => (mode === "rate" ? rateOf(o.key) : riskOf(o.key)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offices, mode]
  );

  const ranked = useMemo(
    () => [...offices].sort((a, b) => metricOf(b.key) - metricOf(a.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offices, mode]
  );

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch(GEO_SRC);
        if (!res.ok) throw new Error("geo fetch failed");
        const geo = (await res.json()) as { features: Feature[] };
        if (dead) return;

        // 전체 경계의 투영 좌표 범위를 구해 viewBox 에 맞춘다
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        const projected = geo.features.map((f) => {
          const rings = ringsOf(f).map((ring) =>
            ring.map(([lon, lat]) => {
              const p = project(lon, lat);
              if (p[0] < minX) minX = p[0];
              if (p[0] > maxX) maxX = p[0];
              if (p[1] < minY) minY = p[1];
              if (p[1] > maxY) maxY = p[1];
              return p;
            })
          );
          return { name: f.properties.name, rings };
        });

        const scale = Math.min((W - PAD * 2) / (maxX - minX), (H - PAD * 2) / (maxY - minY));
        const offX = PAD + ((W - PAD * 2) - (maxX - minX) * scale) / 2;
        const offY = PAD + ((H - PAD * 2) - (maxY - minY) * scale) / 2;
        const to = ([x, y]: [number, number]): [number, number] => [
          offX + (x - minX) * scale,
          offY + (maxY - y) * scale, // SVG 는 y 가 아래로 증가
        ];

        setShapes(
          projected.map(({ name, rings }) => {
            const screen = rings.map((r) => r.map(to));
            const d = screen
              .map((r) => `M${r.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")}Z`)
              .join("");
            const biggest = screen.reduce((a, b) => (b.length > a.length ? b : a), screen[0]);
            return { name, d, label: centroid(biggest) };
          })
        );
      } catch {
        if (!dead) setFailed(true);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  if (failed) {
    return <div className={m.fallback}>지도 경계 데이터를 불러오지 못했습니다.</div>;
  }
  if (!shapes) {
    return <div className={m.fallback}>지도를 불러오는 중…</div>;
  }

  const cur = byKey[selected];
  const focus = hover ?? selected;
  const isRisk = mode === "risk";

  const fillOf = (office: string | undefined) => {
    if (!office) return "#eceff2";
    const t = metricOf(office) / maxMetric;
    return isRisk
      ? `rgba(240,68,82,${(0.07 + t * 0.68).toFixed(3)})`
      : `rgba(49,130,246,${(0.08 + t * 0.72).toFixed(3)})`;
  };

  // 선택/호버된 지청을 맨 뒤에 그려 외곽선이 이웃 구에 가려지지 않게 한다
  const sorted = [...shapes].sort((a, b) => {
    const oa = guToOffice[a.name] === focus ? 1 : 0;
    const ob = guToOffice[b.name] === focus ? 1 : 0;
    return oa - ob;
  });

  return (
    <div className={m.wrap}>
      <div className={m.mapArea}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={m.svg}
          role="img"
          aria-label={isRisk ? "서울 교육지원청 시급성 지도" : "서울 교육지원청 진행률 지도"}
        >
          {sorted.map((sh) => {
            const office = guToOffice[sh.name];
            const on = office === selected;
            const hv = office != null && office === hover;
            return (
              <path
                key={sh.name}
                d={sh.d}
                className={`${m.district} ${on ? (isRisk ? m.onRisk : m.on) : ""} ${
                  hv ? (isRisk ? m.hvRisk : m.hv) : ""
                } ${office ? "" : m.blank}`}
                fill={fillOf(office)}
                onMouseEnter={() => office && setHover(office)}
                onMouseLeave={() => setHover(null)}
                onClick={() => office && onSelect(office)}
              >
                <title>{office ? `${byKey[office]?.full ?? office} · ${sh.name}` : sh.name}</title>
              </path>
            );
          })}
          {shapes.map((sh) => {
            const office = guToOffice[sh.name];
            const on = office === selected;
            const t = office ? metricOf(office) / maxMetric : 0;
            return (
              <text
                key={`t-${sh.name}`}
                x={sh.label[0]}
                y={sh.label[1]}
                className={`${m.label} ${on ? m.labelOn : ""}`}
                fill={
                  on
                    ? isRisk
                      ? "#c22836"
                      : "var(--gt-blue-dark)"
                    : t > 0.6
                    ? "#fff"
                    : "#5b6472"
                }
              >
                {sh.name.replace("구", "")}
              </text>
            );
          })}
        </svg>

        <div className={m.legend}>
          <span className={m.legendText}>{isRisk ? "시급성 낮음" : "진행률 낮음"}</span>
          <div className={`${m.legendBar} ${isRisk ? m.legendBarRisk : ""}`} />
          <span className={m.legendText}>높음</span>
          <span className={m.legendNote}>경계 출처: KOSTAT 2013</span>
        </div>
      </div>

      {/* 우측 고정 패널 — 지도를 가리지 않는다 */}
      <div className={m.panel}>
        <div className={m.modeTabs}>
          <button
            type="button"
            className={`${m.modeTab} ${!isRisk ? m.modeOn : ""}`}
            onClick={() => setMode("rate")}
          >
            진행률
          </button>
          <button
            type="button"
            className={`${m.modeTab} ${isRisk ? m.modeOnRisk : ""}`}
            onClick={() => setMode("risk")}
          >
            시급성 상 🔴
          </button>
        </div>

        {cur && (
          <div className={`${m.selCard} ${isRisk ? m.selCardRisk : ""}`}>
            <div className={m.selName}>{cur.full}</div>
            <div className={m.selGu}>{(OFFICE_GU[selected] ?? []).join(" · ")}</div>
            <div className={m.selRate}>
              {isRisk ? (
                <>
                  <b className={m.riskNum}>{cur.urgent}</b>
                  <span>건 시급성 상</span>
                </>
              ) : (
                <>
                  <b>{rateOf(selected).toFixed(1)}</b>
                  <span>% 진행률</span>
                </>
              )}
            </div>
            <div className={m.selFoot}>
              <span>
                학교 <b>{cur.schools}</b>
              </span>
              <span>
                완료 <b className={m.doneVal}>{cur.done}</b>
              </span>
              <span>
                🔴 <b className={m.riskVal}>{cur.urgent}</b>
              </span>
            </div>
          </div>
        )}

        <div className={m.rankTitle}>{isRisk ? "지청별 시급성 상" : "지청별 진행률"}</div>
        <div className={m.rankList}>
          {ranked.map((o, i) => {
            const v = metricOf(o.key);
            const on = o.key === selected;
            return (
              <button
                key={o.key}
                type="button"
                className={`${m.rankRow} ${on ? (isRisk ? m.rankOnRisk : m.rankOn) : ""}`}
                onMouseEnter={() => setHover(o.key)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(o.key)}
              >
                <span className={m.rankNo}>{i + 1}</span>
                <span className={m.rankName}>{o.key}</span>
                <span className={m.rankBar}>
                  <span
                    className={`${m.rankFill} ${isRisk ? m.rankFillRisk : ""}`}
                    style={{ width: `${maxMetric ? (v / maxMetric) * 100 : 0}%` }}
                  />
                </span>
                <span className={m.rankVal}>{isRisk ? `${v}건` : `${v.toFixed(1)}%`}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
