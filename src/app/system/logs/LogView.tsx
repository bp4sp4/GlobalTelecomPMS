"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui";
import s from "./logs.module.css";

export type AccessRow = { id: string; user: string; role: string; ip: string; at: string };
export type ActivityRow = {
  id: string;
  user: string;
  action: string;
  entity: string;
  target: string;
  detail: string;
  ip: string;
  at: string;
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: "추가",
  UPDATE: "수정",
  DELETE: "삭제",
  COMPLETE: "완료",
  UPLOAD: "업로드",
};
const ACTION_CLASS: Record<string, string> = {
  CREATE: s.aCreate,
  UPDATE: s.aUpdate,
  DELETE: s.aDelete,
  COMPLETE: s.aComplete,
  UPLOAD: s.aUpload,
};
const ACTION_DOT: Record<string, string> = {
  CREATE: "#00b843",
  UPDATE: "#f59e0b",
  DELETE: "#f04452",
  COMPLETE: "#3182f6",
  UPLOAD: "#8b5cf6",
};
const ENTITY_LABEL: Record<string, string> = {
  REPORT: "보고서",
  MESSAGE: "공지/메모",
  PHOTO: "사진",
};
const ACTIONS = ["", "CREATE", "UPDATE", "DELETE", "COMPLETE", "UPLOAD"];
const PERIOD_LABEL: Record<string, string> = {
  "7": "최근 7일",
  "30": "최근 30일",
  all: "전체 기간",
};

/** 사내망/로컬 판별 — 사설 대역과 루프백을 내부로 본다 */
function isInternal(ip: string) {
  if (ip === "::1" || ip === "—" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  return m ? Number(m[1]) >= 16 && Number(m[1]) <= 31 : false;
}

function csv(rows: string[][], name: string) {
  const body =
    "﻿" +
    rows
      .map((r) =>
        r
          .map((v) => {
            const t = String(v ?? "");
            return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
          })
          .join(",")
      )
      .join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** 현재 페이지 주변 번호만 노출 (1 … 4 5 [6] 7 8 … 20) */
function pageNumbers(current: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const out = new Set<number>([1, last, current]);
  for (let d = 1; d <= 2; d++) {
    if (current - d > 1) out.add(current - d);
    if (current + d < last) out.add(current + d);
  }
  const sorted = [...out].sort((a, b) => a - b);
  const res: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) res.push("…");
    res.push(n);
  });
  return res;
}

export function LogView({
  tab,
  page,
  pageSize,
  total,
  accessTotal,
  activityTotal,
  actionCounts,
  query,
  action,
  period,
  access,
  activity,
  todayBins,
  todayTotal,
  ipStats,
}: {
  tab: "activity" | "access";
  page: number;
  pageSize: number;
  total: number;
  accessTotal: number;
  activityTotal: number;
  actionCounts: Record<string, number>;
  query: string;
  action: string;
  period: string;
  access: AccessRow[];
  activity: ActivityRow[];
  todayBins: number[];
  todayTotal: number;
  ipStats: { ip: string; count: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(query);
  const first = useRef(true);

  const isActivity = tab === "activity";
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  /** 검색어/필터/페이지를 URL 에 반영 — 새로고침·뒤로가기에도 상태가 유지된다 */
  function go(next: { tab?: string; page?: number; q?: string; action?: string; period?: string }) {
    const p = new URLSearchParams();
    const t = next.tab ?? tab;
    const kw = next.q ?? q;
    const ac = next.action ?? action;
    const pd = next.period ?? period;
    const pg = next.page ?? 1;

    if (t === "access") p.set("tab", "access");
    if (kw.trim()) p.set("q", kw.trim());
    if (t === "activity" && ac) p.set("action", ac);
    if (pd !== "30") p.set("period", pd);
    if (pg > 1) p.set("page", String(pg));

    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    setQ(query);
  }, [query]);

  // 입력이 멈추면 검색
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (q === query) return;
    const t = setTimeout(() => go({ q, page: 1 }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  /** 접속 기록은 날짜별로 묶어서 보여준다 */
  const groups = useMemo(() => {
    const map = new Map<string, AccessRow[]>();
    for (const r of access) {
      const d = r.at.slice(0, 10);
      map.set(d, [...(map.get(d) ?? []), r]);
    }
    return [...map.entries()].map(([date, rows]) => ({
      date,
      rows,
      ips: new Set(rows.map((r) => r.ip)).size,
    }));
  }, [access]);

  const maxIp = Math.max(1, ...ipStats.map((i) => i.count));
  const maxBin = Math.max(1, ...todayBins);

  function download() {
    if (isActivity) {
      csv(
        [
          ["일시", "사용자", "동작", "구분", "대상", "내용", "IP"],
          ...activity.map((r) => [
            r.at,
            r.user,
            ACTION_LABEL[r.action] ?? r.action,
            ENTITY_LABEL[r.entity] ?? r.entity,
            r.target,
            r.detail,
            r.ip,
          ]),
        ],
        `변경기록_${page}페이지.csv`
      );
    } else {
      csv(
        [
          ["일시", "사용자", "권한", "세션", "IP"],
          ...access.map((r) => [r.at, r.user, r.role, isInternal(r.ip) ? "내부" : "외부", r.ip]),
        ],
        `접속기록_${page}페이지.csv`
      );
    }
  }

  const rowCount = isActivity ? activity.length : access.length;

  return (
    <>
      <header className={s.header}>
        <div>
          <div className={s.crumb}>시스템 / 로그</div>
          <h1 className={s.h1}>접속 · 변경 기록</h1>
          <p className={s.sub}>
            관리자 전용 · 최신순 · {PERIOD_LABEL[period]} · 한국시간(KST)
          </p>
        </div>
        <div className={s.headActions}>
          <select
            className={s.period}
            value={period}
            onChange={(e) => go({ period: e.target.value, page: 1 })}
          >
            <option value="30">최근 30일</option>
            <option value="7">최근 7일</option>
            <option value="all">전체 기간</option>
          </select>
          <button type="button" className={s.btnGhost} onClick={download}>
            현재 페이지 CSV
          </button>
        </div>
      </header>

      <div className={s.layout}>
        <div className={s.main}>
          <div className={s.tabs}>
            <button
              type="button"
              className={`${s.tab} ${isActivity ? s.tabOn : ""}`}
              onClick={() => go({ tab: "activity", page: 1 })}
            >
              변경 기록 <span className={s.tabCount}>{activityTotal}</span>
            </button>
            <button
              type="button"
              className={`${s.tab} ${!isActivity ? s.tabOn : ""}`}
              onClick={() => go({ tab: "access", page: 1, action: "" })}
            >
              접속 기록 <span className={s.tabCount}>{accessTotal}</span>
            </button>
          </div>

          <div className={s.toolbar}>
            <div className={s.searchWrap}>
              <span className={s.searchIcon}>
                <SearchIcon />
              </span>
              <input
                className={s.search}
                placeholder={isActivity ? "사용자 · 대상 · 내용 · IP 검색" : "사용자 · IP 검색"}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {isActivity && (
              <div className={s.chips}>
                {ACTIONS.map((a) => (
                  <button
                    key={a || "all"}
                    type="button"
                    className={`${s.chip} ${action === a ? s.chipOn : ""}`}
                    onClick={() => go({ action: a, page: 1 })}
                  >
                    {a ? ACTION_LABEL[a] : "전체"}
                    <span className={s.chipCount}>{actionCounts[a] ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <section className={s.list}>
            <div className={s.scroll}>
              {isActivity ? (
                <div className={s.innerActivity}>
                  <div className={`${s.rowActivity} ${s.head}`}>
                    <span>일시</span>
                    <span>사용자</span>
                    <span>동작</span>
                    <span>구분</span>
                    <span>대상</span>
                    <span>내용</span>
                    <span>IP</span>
                  </div>
                  {activity.map((r) => (
                    <div key={r.id} className={s.rowActivity}>
                      <span className={s.mono}>{r.at}</span>
                      <span className={s.user}>{r.user}</span>
                      <span>
                        <span className={`${s.badge} ${ACTION_CLASS[r.action] ?? ""}`}>
                          {ACTION_LABEL[r.action] ?? r.action}
                        </span>
                      </span>
                      <span className={s.dim}>{ENTITY_LABEL[r.entity] ?? r.entity}</span>
                      <span className={s.target}>{r.target}</span>
                      <span className={s.dim}>{r.detail}</span>
                      <span className={s.monoFaint}>{r.ip}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={s.innerAccess}>
                  <div className={`${s.rowAccess} ${s.head}`}>
                    <span>일시</span>
                    <span>사용자</span>
                    <span>세션</span>
                    <span className={s.right}>IP</span>
                  </div>
                  {groups.map((g) => (
                    <div key={g.date} className={s.group}>
                      <div className={s.groupHead}>
                        <span className={s.groupDate}>{g.date}</span>
                        <span className={s.groupCount}>{g.rows.length}회 접속</span>
                        <span className={s.groupIps}>고유 IP {g.ips}개</span>
                      </div>
                      {g.rows.map((r) => {
                        const local = isInternal(r.ip);
                        return (
                          <div key={r.id} className={`${s.rowAccess} ${s.rowInGroup}`}>
                            <span className={s.mono}>{r.at}</span>
                            <span className={s.user}>
                              {r.user} <span className={s.role}>({r.role})</span>
                            </span>
                            <span>
                              <span className={`${s.badge} ${local ? s.sInternal : s.sExternal}`}>
                                {local ? "내부" : "외부"}
                              </span>
                            </span>
                            <span className={`${s.mono} ${s.right}`}>{r.ip}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {rowCount === 0 && (
              <div className={s.empty}>
                <div className={s.emptyTitle}>
                  {query || action
                    ? "조건에 맞는 기록이 없습니다"
                    : isActivity
                    ? "변경 기록이 없습니다"
                    : "접속 기록이 없습니다"}
                </div>
                <div className={s.emptyDesc}>
                  {query || action
                    ? "검색어 · 필터 · 기간을 바꿔보세요"
                    : isActivity
                    ? "문서를 저장·완료·삭제하거나 사진을 올리면 여기에 기록됩니다"
                    : "로그인하면 접속 시각과 IP가 기록됩니다"}
                </div>
              </div>
            )}
          </section>

          {total > 0 && (
            <div className={s.footer}>
              <span className={s.footCount}>
                총 {total.toLocaleString()}건 중 {from.toLocaleString()}–{to.toLocaleString()}
              </span>
              <div className={s.pager}>
                <button
                  type="button"
                  className={s.pageBtn}
                  disabled={page <= 1}
                  onClick={() => go({ page: page - 1 })}
                  aria-label="이전 페이지"
                >
                  ‹
                </button>
                {pageNumbers(page, lastPage).map((n, i) =>
                  n === "…" ? (
                    <span key={`gap${i}`} className={s.pageGap}>
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className={`${s.pageBtn} ${n === page ? s.pageOn : ""}`}
                      onClick={() => go({ page: n })}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className={s.pageBtn}
                  disabled={page >= lastPage}
                  onClick={() => go({ page: page + 1 })}
                  aria-label="다음 페이지"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 우측 요약 */}
        <aside className={s.side}>
          <section className={s.sideCard}>
            <div className={s.sideTitle}>오늘 활동</div>
            <div className={s.bigNum}>
              <b>{todayTotal}</b>
              <span>회 접속</span>
            </div>
            <div className={s.spark}>
              {todayBins.map((n, i) => (
                <span
                  key={i}
                  className={s.sparkBar}
                  style={{
                    height: Math.max(4, Math.round((n / maxBin) * 48)),
                    background: n === 0 ? "var(--gt-line-soft)" : n >= maxBin ? "var(--gt-blue)" : "#a7c9f8",
                  }}
                  title={`${String(i * 2).padStart(2, "0")}시–${String(i * 2 + 2).padStart(2, "0")}시 · ${n}회`}
                />
              ))}
            </div>
            <div className={s.sparkScale}>
              <span>00시</span>
              <span>12시</span>
              <span>23시</span>
            </div>
          </section>

          <section className={s.sideCard}>
            <div className={s.sideTitle}>접속 IP</div>
            {ipStats.length === 0 && <div className={s.sideNote}>기록이 없습니다</div>}
            {ipStats.map((i) => (
              <div key={i.ip} className={s.ipRow}>
                <div className={s.ipHead}>
                  <span className={s.mono}>{i.ip}</span>
                  <span className={s.ipCount}>{i.count}</span>
                </div>
                <div className={s.ipBar}>
                  <div className={s.ipBarFill} style={{ width: `${(i.count / maxIp) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className={s.sideNote}>외부 IP 접속은 별도 확인이 필요합니다</div>
          </section>

          <section className={s.sideCard}>
            <div className={s.sideTitle}>변경 유형</div>
            {ACTIONS.filter(Boolean).map((a) => (
              <div key={a} className={s.typeRow}>
                <span className={s.typeDot} style={{ background: ACTION_DOT[a] }} />
                <span className={s.typeLabel}>{ACTION_LABEL[a]}</span>
                <span className={`${s.typeValue} ${(actionCounts[a] ?? 0) > 0 ? "" : s.typeZero}`}>
                  {actionCounts[a] ?? 0}
                </span>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
