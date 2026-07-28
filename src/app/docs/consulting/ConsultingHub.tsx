"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import s from "./hub.module.css";

export type RoundStatus = "저장 (초안)" | "저장 완료" | "미작성";
export type Metric = { label: string; value: number | string; unit?: string; color?: string };
export type Issue = { title: string; source: string };
export type HistoryItem = { title: string; at: string; by: string };

export function ConsultingHub({
  school,
  firstStatus,
  firstSavedAt,
  firstAuthor,
  firstMetrics,
  secondStatus,
  issues,
  history,
}: {
  school: { name: string; district: string; code: string };
  firstStatus: RoundStatus;
  firstSavedAt: string | null;
  firstAuthor: string;
  firstMetrics: Metric[];
  secondStatus: RoundStatus;
  issues: Issue[];
  history: HistoryItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const firstDone = firstStatus !== "미작성";
  const secondDone = secondStatus !== "미작성";
  const bothSaved = firstDone && secondDone;
  const alreadyComplete = firstStatus === "저장 완료" && secondStatus === "저장 완료";
  const pct = Math.round(((firstDone ? 1 : 0) * 0.43 + (secondDone ? 1 : 0) * 0.57) * 100);

  const href = (round: number) =>
    `/pms/consulting/new?school=${encodeURIComponent(school.name)}&round=${round}`;

  const badgeStyle = (done: boolean) => ({
    color: done ? "var(--gt-blue)" : "var(--gt-mute)",
    background: done ? "var(--gt-blue-bg)" : "var(--gt-line-soft)",
  });

  async function complete() {
    if (!bothSaved || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/reports/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school: school.name, type: "CONSULTING" }),
      });
      if (res.ok) {
        setMsg("완료 처리되었습니다.");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.message ?? "완료 처리에 실패했습니다.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.grid}>
      <div className={s.col}>
        {/* 회차 진행 */}
        <section className={s.card}>
          <div className={s.headBetween}>
            <h2 className={s.h2}>회차 진행</h2>
            <span className={s.muted}>
              1차 {firstStatus} · 2차 {secondStatus}
            </span>
          </div>
          <div className={s.steps}>
            <div className={s.stepNode}>
              <span className={`${s.stepCircle} ${firstDone ? s.stepCircleOn : ""}`}>1</span>
              <span className={`${s.stepLabel} ${firstDone ? s.stepLabelOn : ""}`}>1차 컨설팅</span>
            </div>
            <div
              className={`${s.stepLine} ${
                secondDone ? s.stepLineOn : firstDone ? s.stepLineHalf : ""
              }`}
            />
            <div className={s.stepNode}>
              <span className={`${s.stepCircle} ${secondDone ? s.stepCircleOn : ""}`}>2</span>
              <span className={`${s.stepLabel} ${secondDone ? s.stepLabelOn : ""}`}>2차 컨설팅</span>
            </div>
            <div className={`${s.stepLine} ${alreadyComplete ? s.stepLineOn : ""}`} />
            <div className={s.stepNode}>
              <span className={`${s.stepCircle} ${alreadyComplete ? s.stepCircleOn : ""}`}>✓</span>
              <span className={`${s.stepLabel} ${alreadyComplete ? s.stepLabelOn : ""}`}>
                완료 처리
              </span>
            </div>
          </div>
        </section>

        {/* 1차 */}
        <section className={s.card}>
          <div className={s.headBetween}>
            <div>
              <div className={s.titleRow}>
                <h3 className={s.roundTitle}>1차 컨설팅</h3>
                <span className={s.badge} style={badgeStyle(firstDone)}>
                  {firstStatus}
                </span>
              </div>
              <div className={s.saveMeta}>
                <span>
                  최종 저장 <span className={s.mono}>{firstSavedAt ?? "—"}</span>
                </span>
                <span className={s.vbar} />
                <span>작성자 {firstAuthor}</span>
              </div>
            </div>
            <div className={s.actions}>
              <Link href={href(1)} className={`${s.btn} ${s.btnGhost}`}>
                미리보기
              </Link>
              <Link href={href(1)} className={s.btn}>
                1차 작성 / 수정
              </Link>
            </div>
          </div>

          <div className={s.metrics}>
            {firstMetrics.map((m) => (
              <div key={m.label} className={s.metric}>
                <div className={s.metricLabel}>{m.label}</div>
                <div className={s.metricValue} style={m.color ? { color: m.color } : undefined}>
                  {m.value}
                  {m.unit && <span>{m.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2차 */}
        <section className={s.card}>
          <div className={s.headBetween}>
            <div>
              <div className={s.titleRow}>
                <h3 className={s.roundTitle}>2차 컨설팅</h3>
                <span className={s.badge} style={badgeStyle(secondDone)}>
                  {secondStatus}
                </span>
              </div>
              <div className={s.muted} style={{ marginTop: 8 }}>
                1차 개선 항목 {issues.length}건이 자동으로 불러와집니다
              </div>
            </div>
            <Link href={href(2)} className={s.btn}>
              {secondDone ? "2차 작성 / 수정" : "2차 작성 시작"}
            </Link>
          </div>

          {issues.length > 0 && (
            <div className={s.issues}>
              {issues.map((it, i) => (
                <div key={i} className={s.issue}>
                  <span className={s.issueDot} />
                  <span className={s.issueTitle}>{it.title}</span>
                  <span className={s.issueSrc}>{it.source}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 우측 */}
      <div className={s.side}>
        <section className={s.sideCard}>
          <div>
            <div className={s.sideLabel}>보고서 완성도</div>
            <div className={s.pctRow}>
              <span className={s.pct}>
                {pct}
                <span>%</span>
              </span>
              <span className={s.pctSub}>
                {(firstDone ? 1 : 0) + (secondDone ? 1 : 0)} / 2회차
              </span>
            </div>
          </div>
          <div className={s.bar}>
            <div className={s.barFill} style={{ width: `${pct}%` }} />
          </div>

          <div className={s.checkList}>
            {[
              { n: "1", label: firstDone ? "1차 저장 완료" : "1차 작성 필요", done: firstDone },
              { n: "2", label: secondDone ? "2차 저장 완료" : "2차 작성 필요", done: secondDone },
              {
                n: "✓",
                label: alreadyComplete
                  ? "완료 처리됨"
                  : bothSaved
                    ? "완료 처리 가능"
                    : "완료 처리 대기",
                done: alreadyComplete,
              },
            ].map((c) => (
              <div key={c.n} className={s.checkRow}>
                <span className={`${s.checkMark} ${c.done ? s.checkMarkOn : ""}`}>{c.n}</span>
                <span className={`${s.checkText} ${c.done ? s.checkTextOn : ""}`}>{c.label}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={`${s.btn} ${s.btnFull}`}
            disabled={!bothSaved || busy || alreadyComplete}
            onClick={complete}
          >
            {alreadyComplete ? "완료됨" : busy ? "처리 중…" : "완료 처리"}
          </button>
          {msg && <div className={s.okMsg}>{msg}</div>}
          <div className={s.hint}>1차·2차 모두 저장되어야 완료 처리할 수 있습니다.</div>
        </section>

        <section className={s.sideCard}>
          <h3 className={s.h3}>저장 이력</h3>
          <div className={s.historyList}>
            {history.length === 0 && <p className={s.empty}>기록이 없습니다.</p>}
            {history.map((h, i) => (
              <div key={i} className={s.historyItem}>
                <div className={s.historyTitle}>{h.title}</div>
                <div className={s.historyAt}>
                  {h.at} · {h.by}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
