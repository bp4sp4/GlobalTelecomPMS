"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "@/components/ui";
import styles from "./page.module.css";

type SchoolHit = { name: string; educationOffice: string | null; district: string | null };
type ReportStatus = "완료" | "작성 중" | "미착수";
type ReportItem = {
  key: string;
  title: string;
  desc: string;
  path: string;
  status: ReportStatus;
  progress: number;
  progressLabel: string;
};
type SchoolInfo = { name: string; district: string; level: string; code: string };
type RecentItem = { title: string; at: string };

const STATUS_STYLE: Record<ReportStatus, { color: string; background: string }> = {
  완료: { color: "var(--gt-green)", background: "var(--gt-green-bg)" },
  "작성 중": { color: "var(--gt-blue)", background: "var(--gt-blue-bg)" },
  미착수: { color: "var(--gt-mute)", background: "var(--gt-line-soft)" },
};
const BAR_COLOR: Record<ReportStatus, string> = {
  완료: "var(--gt-green-dot)",
  "작성 중": "var(--gt-blue)",
  미착수: "#d7dbe0",
};
const ACTION: Record<ReportStatus, string> = {
  완료: "열기",
  "작성 중": "이어 작성",
  미착수: "작성",
};

const NOTICE =
  "개선 사항이 없으면 내용을 비워 두세요 — 작성 시 개선 통계에 포함됩니다.";

export function DocsClient() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const userTyped = useRef(false);
  /** 검색어 → 결과 캐시 (같은 세션 안에서 재조회를 없앤다) */
  const cache = useRef(new Map<string, SchoolHit[]>());

  // 이전 선택 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("docs_selected_school");
      if (saved) {
        setQ(saved);
        void loadSchool(saved);
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 자동완성
  useEffect(() => {
    const kw = q.trim();
    if (kw.length < 1) {
      setHits([]);
      return;
    }

    // 1) 같은 검색어를 이미 받아온 적 있으면 즉시 표시 (지우고 다시 칠 때 특히 빠름)
    const cached = cache.current.get(kw);
    if (cached) {
      setHits(cached);
      if (userTyped.current) setOpen(true);
      return;
    }

    // 2) 앞 글자 결과가 서버 상한(30개)에 못 미치면 그 안에 답이 다 있다 —
    //    네트워크 없이 걸러서 먼저 보여주고, 아래에서 정확한 결과로 갱신한다
    for (let i = kw.length - 1; i > 0; i--) {
      const prev = cache.current.get(kw.slice(0, i));
      if (prev && prev.length < 30) {
        setHits(prev.filter((s) => s.name.includes(kw)));
        if (userTyped.current) setOpen(true);
        break;
      }
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/schools?q=${encodeURIComponent(kw)}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data: SchoolHit[] = await res.json();
          cache.current.set(kw, data);
          setHits(data);
          if (userTyped.current) setOpen(true);
        }
      } catch {
        /* 취소되었거나 실패 — 기존 결과 유지 */
      }
    }, 90);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function loadSchool(name: string) {
    try {
      const res = await fetch(`/api/school-status?school=${encodeURIComponent(name)}`);
      if (!res.ok) return;
      const d = await res.json();
      setSchool(d.school);
      setReports(d.reports);
      setRecent(d.recent);
    } catch {
      /* noop */
    }
  }

  function pick(name: string) {
    userTyped.current = false;
    setQ(name);
    setHits([]);
    setOpen(false);
    void loadSchool(name);
    try {
      localStorage.setItem("docs_selected_school", name);
    } catch {
      /* noop */
    }
  }

  function reset() {
    userTyped.current = false;
    setQ("");
    setHits([]);
    setSchool(null);
    setReports([]);
    setRecent([]);
    try {
      localStorage.removeItem("docs_selected_school");
    } catch {
      /* noop */
    }
  }

  const doneCount = reports.filter((r) => r.status === "완료").length;
  const writingCount = reports.filter((r) => r.status === "작성 중").length;
  const idleCount = reports.filter((r) => r.status === "미착수").length;
  const pct = reports.length ? Math.round((doneCount / reports.length) * 100) : 0;

  return (
    <div className={styles.grid}>
      <div className={styles.col}>
        {/* 1. 학교 선택 */}
        <section className={styles.card}>
          <div className={styles.stepHead}>
            <span className={styles.step}>1</span>
            <h2 className={styles.h2}>학교 선택</h2>
          </div>

          <div className={styles.searchRow} ref={boxRef}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>
                <SearchIcon size={19} />
              </span>
              <input
                className={styles.searchInput}
                placeholder="학교명을 입력하세요 (초성 가능)"
                value={q}
                onChange={(e) => {
                  userTyped.current = true;
                  setQ(e.target.value);
                }}
                onFocus={() => hits.length && setOpen(true)}
              />
            </div>
            <button
              type="button"
              className={styles.searchBtn}
              onClick={() => hits[0] && pick(hits[0].name)}
            >
              검색
            </button>

            {open && hits.length > 0 && (
              <div className={styles.suggest}>
                {hits.map((h) => (
                  <button
                    key={h.name}
                    type="button"
                    className={styles.suggestItem}
                    onMouseDown={() => pick(h.name)}
                  >
                    <span>{h.name}</span>
                    <span className={styles.suggestSub}>{h.educationOffice ?? ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {school && (
            <div className={styles.selected}>
              <div className={styles.selectedLeft}>
                <span className={styles.pulseDot} />
                <span className={styles.schoolName}>{school.name}</span>
                <span className={styles.tag}>선택됨</span>
              </div>
              <div className={styles.meta}>
                <span>{school.district}</span>
                <span className={styles.metaBar} />
                <span>{school.level}</span>
                <span className={styles.metaBar} />
                <span className={styles.mono}>코드 {school.code}</span>
              </div>
              <button type="button" className={styles.resetBtn} onClick={reset}>
                초기화
              </button>
            </div>
          )}
        </section>

        {/* 2. 보고서 종류 */}
        <section className={styles.card}>
          <div className={styles.headBetween}>
            <div className={styles.stepHead}>
              <span className={styles.step}>2</span>
              <h2 className={styles.h2}>보고서 종류</h2>
            </div>
            {school && (
              <span className={styles.countText}>
                {reports.length}종 중 {doneCount}종 완료
              </span>
            )}
          </div>

          {!school ? (
            <p className={styles.empty}>학교를 먼저 검색해서 선택해 주세요.</p>
          ) : (
            <div className={styles.reportList}>
              {reports.map((r) => (
                <Link
                  key={r.key}
                  href={`${r.path}?school=${encodeURIComponent(school.name)}`}
                  className={styles.reportRow}
                >
                  <div>
                    <div className={styles.reportTitle}>{r.title}</div>
                    <div className={styles.reportDesc}>{r.desc}</div>
                  </div>
                  <div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${r.progress}%`, background: BAR_COLOR[r.status] }}
                      />
                    </div>
                    <span className={styles.barLabel}>{r.progressLabel}</span>
                  </div>
                  <span className={styles.badge} style={STATUS_STYLE[r.status]}>
                    {r.status}
                  </span>
                  <span className={styles.action}>{ACTION[r.status]}</span>
                </Link>
              ))}
            </div>
          )}

          <div className={styles.notice}>
            <span className={styles.noticeDot} />
            <span className={styles.noticeText}>{NOTICE}</span>
          </div>
        </section>
      </div>

      {/* 우측 요약 */}
      <div className={styles.side}>
        <section className={styles.sideCard}>
          <div>
            <div className={styles.sideLabel}>이 학교 진행률</div>
            <div className={styles.pctRow}>
              <span className={styles.pct}>
                {pct}
                <span>%</span>
              </span>
              <span className={styles.pctSub}>
                {doneCount} / {reports.length || 5}종
              </span>
            </div>
          </div>
          <div className={styles.sideBar}>
            <div className={styles.sideBarFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.legend}>
            <div className={styles.legendRow}>
              <span className={styles.legendKey}>완료</span>
              <span style={{ fontWeight: 700, color: "var(--gt-green)" }}>{doneCount}종</span>
            </div>
            <div className={styles.legendRow}>
              <span className={styles.legendKey}>작성 중</span>
              <span style={{ fontWeight: 700, color: "var(--gt-blue)" }}>{writingCount}종</span>
            </div>
            <div className={styles.legendRow}>
              <span className={styles.legendKey}>미착수</span>
              <span style={{ fontWeight: 700, color: "var(--gt-mute)" }}>{idleCount}종</span>
            </div>
          </div>
        </section>

        <section className={styles.sideCard}>
          <h3 className={styles.h3}>최근 작성</h3>
          <div className={styles.recentList}>
            {recent.length === 0 && <p className={styles.empty}>기록이 없습니다.</p>}
            {recent.map((r, i) => (
              <div key={i} className={styles.recentItem}>
                <div className={styles.recentTitle}>{r.title}</div>
                <div className={styles.recentAt}>{r.at}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
