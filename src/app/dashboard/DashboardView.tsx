"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";
import styles from "./DashboardView.module.css";

export type SchoolRow = {
  name: string;
  district: string;
  type: string;
  status: "완료" | "진행 중" | "검토 대기" | "미착수";
  updatedAt: string;
};
export type MessageRow = {
  id: string;
  author: string;
  at: string;
  body: string;
};
export type SessionRow = { user: string; ip: string; at: string };

const STATUS_STYLE: Record<SchoolRow["status"], { color: string; background: string }> = {
  완료: { color: "var(--gt-green)", background: "var(--gt-green-bg)" },
  "진행 중": { color: "var(--gt-blue)", background: "var(--gt-blue-bg)" },
  "검토 대기": { color: "var(--gt-amber)", background: "var(--gt-amber-bg)" },
  미착수: { color: "var(--gt-mute)", background: "var(--gt-line-soft)" },
};

export function DashboardView({
  user,
  total,
  done,
  inProgress,
  documents,
  sessions,
  schools,
  messages: initialMessages,
  isAdmin,
}: {
  user: string;
  total: number;
  done: number;
  inProgress: number;
  documents: number;
  sessions: SessionRow[];
  schools: SchoolRow[];
  messages: MessageRow[];
  isAdmin: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const pct = total > 0 ? (done / total) * 100 : 0;
  const latest = sessions[0];

  async function send() {
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const d = await res.json();
      if (res.ok) {
        setMessages((m) => [
          {
            id: d.message.id,
            author: d.message.author.username,
            at: new Date(d.message.createdAt).toISOString().slice(0, 19).replace("T", " "),
            body: d.message.content,
          },
          ...m,
        ]);
        setDraft("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <div className={styles.status}>
            <span
              className={`${styles.dot} ${styles.dotPulse}`}
              style={{ background: "var(--gt-green-dot)" }}
            />
            <span className={styles.statusText}>시스템 정상 · 실시간 집계 중</span>
          </div>
          <h1 className={styles.h1}>컨설팅 관제</h1>
          <p className={styles.sub}>학교 검색은 문서관리에서 진행합니다 · 운영자 {user}</p>
        </div>
        <div className={styles.headActions}>
          <Link href="/docs" className={styles.btn}>
            문서관리로 이동
          </Link>
          <LogoutButton className={`${styles.btn} ${styles.btnGhost}`} />
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.col}>
          {/* 진행률 히어로 */}
          <section className={`${styles.card} ${styles.hero}`}>
            <div className={styles.heroTop}>
              <div>
                <div className={styles.heroLabel}>전체 컨설팅 진행률</div>
                <div className={styles.pctRow}>
                  <span className={styles.pct}>
                    {pct.toFixed(1)}
                    <span>%</span>
                  </span>
                  <span className={styles.pctSub}>
                    {done} / {total}개교
                  </span>
                </div>
              </div>

              <div className={styles.heroRight}>
                <div className={styles.remain}>
                  <div className={styles.remainLabel}>잔여</div>
                  <div className={styles.remainNum}>
                    {total - done}
                    <span>개교</span>
                  </div>
                </div>
                <div className={styles.divider} />
                <div className={styles.sessions}>
                  <div className={styles.sessionHead}>
                    <span
                      className={`${styles.dot} ${styles.dotPulse}`}
                      style={{ background: "var(--gt-green-dot)" }}
                    />
                    원격 접속 · 최근 10분
                  </div>
                  {isAdmin ? (
                    <>
                      {latest ? (
                        <div className={styles.sessionRow}>
                          <span className={styles.sessionUser}>{latest.user}</span>
                          <span className={styles.mono}>{latest.ip}</span>
                          <span className={styles.monoDim}>
                            {latest.at.split(" ")[1] ?? latest.at}
                          </span>
                        </div>
                      ) : (
                        <div className={styles.sessionMeta}>최근 접속 기록이 없습니다.</div>
                      )}
                      <div className={styles.sessionMeta}>
                        접속 {sessions.length}건 · 고유 계정{" "}
                        {new Set(sessions.map((s) => s.user)).size}개
                      </div>
                    </>
                  ) : (
                    <div className={styles.sessionMeta}>admin 계정에서만 확인할 수 있습니다.</div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.barWrap}>
              <div className={styles.bar}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
              </div>
              <div className={styles.scale}>
                <span>0</span>
                <span>{Math.round(total / 2)}</span>
                <span>{total}</span>
              </div>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>문서 자동합계</div>
                <div className={styles.statNum}>
                  {documents}
                  <span>건</span>
                </div>
                <div className={styles.statHint}>reports 테이블 자동 집계</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>완료</div>
                <div className={`${styles.statNum} ${styles.statNumGreen}`}>
                  {done}
                  <span>건</span>
                </div>
                <div className={styles.statHint}>컨설팅 DONE=1 / 스피커선로 DONE=4</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>진행 중</div>
                <div className={`${styles.statNum} ${styles.statNumBlue}`}>
                  {inProgress}
                  <span>건</span>
                </div>
                <div className={styles.statHint}>작성 후 미확정 문서</div>
              </div>
            </div>
          </section>

          {/* 학교별 진행 현황 */}
          <section className={`${styles.card} ${styles.section}`}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitleWrap}>
                <h2 className={styles.h2}>학교별 진행 현황</h2>
                <span className={styles.pill}>최근 처리 {schools.length}개교</span>
              </div>
              <Link href="/docs/saved" className={styles.moreLink}>
                전체 {total}개교 보기
              </Link>
            </div>

            <div className={styles.rows}>
              <div className={`${styles.row} ${styles.rowHead}`}>
                <span>학교명</span>
                <span>지역</span>
                <span>유형</span>
                <span>상태</span>
                <span style={{ justifySelf: "end" }}>최종 처리</span>
              </div>
              {schools.length === 0 && (
                <div className={styles.empty}>아직 작성된 문서가 없습니다.</div>
              )}
              {schools.map((s, i) => (
                <div key={`${s.name}-${i}`} className={`${styles.row} ${styles.rowBody}`}>
                  <span className={styles.schoolName}>{s.name}</span>
                  <span className={styles.cellMute}>{s.district}</span>
                  <span className={styles.cellSub}>{s.type}</span>
                  <span className={styles.badge} style={STATUS_STYLE[s.status]}>
                    {s.status}
                  </span>
                  <span className={styles.updated}>{s.updatedAt}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 메시지 도크 */}
        <section className={`${styles.card} ${styles.dock}`}>
          <div className={styles.dockHead}>
            <h2 className={styles.h2}>메시지</h2>
            <span className={styles.dockMeta}>
              {user} ({isAdmin ? "admin" : "guest"})
            </span>
          </div>

          <div className={styles.msgList}>
            {messages.length === 0 && <div className={styles.empty}>등록된 공지가 없습니다.</div>}
            {messages.map((m) => (
              <div key={m.id} className={styles.msg}>
                <div className={styles.msgHead}>
                  <span className={styles.msgAuthor}>{m.author}</span>
                  <span className={styles.mono}>{m.at}</span>
                </div>
                <div className={styles.msgBody}>{m.body}</div>
              </div>
            ))}
          </div>

          <div className={styles.composer}>
            <textarea
              className={styles.textarea}
              placeholder="메시지를 입력하세요 (최대 1000자)"
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className={styles.composerFoot}>
              <span className={styles.count}>{draft.length} / 1000</span>
              <button
                type="button"
                className={styles.btn}
                onClick={send}
                disabled={busy || !draft.trim()}
              >
                전송
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
