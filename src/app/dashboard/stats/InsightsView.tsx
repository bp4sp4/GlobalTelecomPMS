"use client";

import Link from "next/link";
import i from "./insights.module.css";

export type Insights = {
  monthly: { key: string; label: string; count: number }[];
  target: number;
  done: number;
  paceText: string;
  faultTop: { code: string; name: string; category: string; count: number }[];
  urgency: { 상: number; 중: number; 하: number };
  imp: {
    total: number;
    schools: number;
    items: number;
    avg: number;
    byContent: { label: string; count: number }[];
    byOffice: { name: string; amount: number }[];
  };
  speaker: {
    good: number;
    bad: number;
    byOffice: { name: string; total: number; bad: number; rate: number }[];
  };
  funnel: { label: string; draft: number; done: number }[];
  r1NoR2: number;
  pending: { school: string; office: string; faults: number; urgent: number; days: number }[];
  pendingTotal: number;
  suneung: { total: number; done: number; rows: { school: string; office: string; done: boolean }[] };
};

export type InsightSection = "issues" | "progress" | "actions";

const CAT_LABEL: Record<string, string> = {
  AUD: "음향", VID: "영상", PWR: "전원",
  AU: "음향", VI: "영상", PA: "전관음향", ETC: "기타",
};

const won = (n: number) => n.toLocaleString("ko-KR");

export function InsightsView({ data, section }: { data: Insights; section: InsightSection }) {
  const maxMonth = Math.max(1, ...data.monthly.map((mo) => mo.count));
  const urgTotal = data.urgency.상 + data.urgency.중 + data.urgency.하;
  const maxFault = Math.max(1, ...data.faultTop.map((f) => f.count));
  const maxImpOffice = Math.max(1, ...data.imp.byOffice.map((o) => o.amount));
  const maxContent = Math.max(1, ...data.imp.byContent.map((c) => c.count));
  const maxFunnel = Math.max(1, ...data.funnel.map((f) => f.draft + f.done));
  const spkTotal = data.speaker.good + data.speaker.bad;
  const spkRate = spkTotal ? (data.speaker.bad / spkTotal) * 100 : 0;

  const monthlyCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>월별 컨설팅 완료 추이</h2>
          <span className={i.hint}>완료 처리 시점 기준 (한국시간)</span>
        </div>
        <div className={i.pace}>
          <span className={i.paceDone}>
            {data.done} <em>/ {data.target}건</em>
          </span>
          <span className={i.paceText}>{data.paceText}</span>
        </div>
      </div>
      <div className={i.months}>
        {data.monthly.map((mo) => (
          <div key={mo.key} className={i.monthCol}>
            <span className={i.monthVal}>{mo.count > 0 ? mo.count : ""}</span>
            <span
              className={`${i.monthBar} ${mo.count === 0 ? i.monthBarZero : ""}`}
              style={{ height: Math.max(4, Math.round((mo.count / maxMonth) * 120)) }}
            />
            <span className={i.monthLabel}>{mo.label}</span>
          </div>
        ))}
      </div>
    </section>
  );

  const funnelCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>문서 작성 현황</h2>
          <span className={i.hint}>유형별 초안 → 완료</span>
        </div>
        {data.r1NoR2 > 0 && (
          <span className={i.warnPill}>1차 완료 후 2차 미작성 {data.r1NoR2}개교</span>
        )}
      </div>
      <div className={i.funnel}>
        {data.funnel.map((f) => {
          const total = f.draft + f.done;
          return (
            <div key={f.label} className={i.funnelRow}>
              <span className={i.funnelLabel}>{f.label}</span>
              <span className={i.funnelTrack}>
                {f.done > 0 && (
                  <span
                    className={i.funnelDone}
                    style={{ width: `${(f.done / maxFunnel) * 100}%` }}
                    title={`완료 ${f.done}건`}
                  />
                )}
                {f.draft > 0 && (
                  <span
                    className={i.funnelDraft}
                    style={{ width: `${(f.draft / maxFunnel) * 100}%` }}
                    title={`초안 ${f.draft}건`}
                  />
                )}
              </span>
              <span className={i.funnelVal}>
                <b className={i.goodVal}>{f.done}</b> 완료 · {f.draft} 초안
                <em className={i.hbarSub}> / {total}</em>
              </span>
            </div>
          );
        })}
      </div>
      <div className={i.funnelLegend}>
        <span className={i.legendItem}>
          <span className={`${i.swatch} ${i.swDone}`} /> 완료
        </span>
        <span className={i.legendItem}>
          <span className={`${i.swatch} ${i.swDraft}`} /> 초안
        </span>
      </div>
    </section>
  );

  const faultCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>장애 코드 TOP 10</h2>
          <span className={i.hint}>컨설팅 점검에서 입력된 장애 기준</span>
        </div>
      </div>
      {data.faultTop.length === 0 ? (
        <div className={i.empty}>아직 입력된 장애가 없습니다</div>
      ) : (
        <div className={i.faultList}>
          {data.faultTop.map((f, idx) => (
            <div key={f.code} className={i.faultRow}>
              <span className={i.faultNo}>{idx + 1}</span>
              <span className={i.faultName} title={`${f.code} · ${f.name}`}>
                {f.name}
              </span>
              <span className={i.faultCat}>{CAT_LABEL[f.category] ?? f.category}</span>
              <span className={i.faultBar}>
                <span className={i.faultFill} style={{ width: `${(f.count / maxFault) * 100}%` }} />
              </span>
              <span className={i.faultCount}>{f.count}건</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const urgencyCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>시급성 분포</h2>
          <span className={i.hint}>점검 행 기준 총 {urgTotal}건</span>
        </div>
      </div>
      <div className={i.urgNums}>
        <div className={i.urgItem}>
          <span className={`${i.urgDot} ${i.dotHigh}`} />
          <span className={i.urgLabel}>상</span>
          <b className={i.urgHigh}>{data.urgency.상}</b>
        </div>
        <div className={i.urgItem}>
          <span className={`${i.urgDot} ${i.dotMid}`} />
          <span className={i.urgLabel}>중</span>
          <b className={i.urgMid}>{data.urgency.중}</b>
        </div>
        <div className={i.urgItem}>
          <span className={`${i.urgDot} ${i.dotLow}`} />
          <span className={i.urgLabel}>하</span>
          <b className={i.urgLow}>{data.urgency.하}</b>
        </div>
      </div>
      {urgTotal > 0 ? (
        <div className={i.urgBar}>
          <span className={i.segHigh} style={{ width: `${(data.urgency.상 / urgTotal) * 100}%` }} />
          <span className={i.segMid} style={{ width: `${(data.urgency.중 / urgTotal) * 100}%` }} />
          <span className={i.segLow} style={{ width: `${(data.urgency.하 / urgTotal) * 100}%` }} />
        </div>
      ) : (
        <div className={i.empty}>아직 판정된 항목이 없습니다</div>
      )}
      <div className={i.note}>
        시급성 <b>상</b>은 즉시 조치 대상입니다 · 전체 통계의 지도에서 &quot;시급성 상&quot; 보기로 지역
        분포를 확인할 수 있습니다
      </div>
    </section>
  );

  const speakerCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>스피커선로 불량률</h2>
          <span className={i.hint}>선로 점검 판정 기준</span>
        </div>
        <div className={i.spkRate}>
          <b>{spkRate.toFixed(1)}</b>
          <span>%</span>
        </div>
      </div>
      {spkTotal === 0 ? (
        <div className={i.empty}>아직 선로 점검 데이터가 없습니다</div>
      ) : (
        <>
          <div className={i.spkSummary}>
            양호 <b className={i.goodVal}>{data.speaker.good}</b> · 불량{" "}
            <b className={i.badVal}>{data.speaker.bad}</b> / 총 {spkTotal}건
          </div>
          <div className={i.hbarList}>
            {data.speaker.byOffice.map((o) => (
              <div key={o.name} className={i.hbarRow}>
                <span className={i.hbarName}>{o.name}</span>
                <span className={i.hbarTrack}>
                  <span className={i.hbarFillBad} style={{ width: `${o.rate}%` }} />
                </span>
                <span className={i.hbarVal}>
                  {o.rate.toFixed(1)}% <em className={i.hbarSub}>({o.bad}/{o.total})</em>
                </span>
              </div>
            ))}
          </div>
          <div className={i.note}>불량률이 높은 지청은 배선 노후 가능성이 큽니다</div>
        </>
      )}
    </section>
  );

  const impCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>개선금액</h2>
          <span className={i.hint}>
            {data.imp.schools}개교 · {data.imp.items}건
          </span>
        </div>
        <div className={i.impTotal}>
          <b>{won(data.imp.total)}</b>
          <span>원</span>
        </div>
      </div>
      {data.imp.items === 0 ? (
        <div className={i.empty}>아직 개선보고서가 없습니다</div>
      ) : (
        <>
          <div className={i.subTitle}>지청별 합계</div>
          <div className={i.hbarList}>
            {data.imp.byOffice.map((o) => (
              <div key={o.name} className={i.hbarRow}>
                <span className={i.hbarName}>{o.name}</span>
                <span className={i.hbarTrack}>
                  <span className={i.hbarFill} style={{ width: `${(o.amount / maxImpOffice) * 100}%` }} />
                </span>
                <span className={i.hbarVal}>{won(o.amount)}원</span>
              </div>
            ))}
          </div>
          {data.imp.byContent.length > 0 && (
            <>
              <div className={i.subTitle}>개선내용별 건수</div>
              <div className={i.chipRow}>
                {data.imp.byContent.map((c) => (
                  <span key={c.label} className={i.contentChip}>
                    {c.label}
                    <b>{c.count}</b>
                    <span className={i.chipGauge} style={{ width: `${(c.count / maxContent) * 100}%` }} />
                  </span>
                ))}
              </div>
            </>
          )}
          <div className={i.note}>평균 {won(data.imp.avg)}원 / 개교</div>
        </>
      )}
    </section>
  );

  const pendingCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>미조치 학교</h2>
          <span className={i.hint}>1차 컨설팅에서 장애가 지적됐지만 개선보고서가 없는 학교</span>
        </div>
        {data.pendingTotal > 0 && <span className={i.dangerPill}>{data.pendingTotal}개교</span>}
      </div>
      {data.pending.length === 0 ? (
        <div className={i.empty}>모든 지적 학교에 개선보고서가 작성되었습니다 👍</div>
      ) : (
        <>
          <div className={i.pendHead}>
            <span>학교</span>
            <span>지청</span>
            <span>지적</span>
            <span>시급 🔴</span>
            <span>경과</span>
            <span />
          </div>
          {data.pending.map((p) => (
            <div key={p.school} className={i.pendRow}>
              <span className={i.pendSchool}>{p.school}</span>
              <span className={i.pendOffice}>{p.office || "—"}</span>
              <span className={i.pendVal}>{p.faults}건</span>
              <span className={p.urgent > 0 ? i.badVal : i.pendDim}>
                {p.urgent > 0 ? `${p.urgent}건` : "—"}
              </span>
              <span className={i.pendDim}>{p.days}일</span>
              <Link
                href={`/docs/improvement?school=${encodeURIComponent(p.school)}`}
                className={i.pendGo}
              >
                개선 작성 →
              </Link>
            </div>
          ))}
          {data.pendingTotal > data.pending.length && (
            <div className={i.note}>외 {data.pendingTotal - data.pending.length}개교</div>
          )}
        </>
      )}
    </section>
  );

  const suneungCard = (
    <section className={i.card}>
      <div className={i.cardHead}>
        <div>
          <h2 className={i.h2}>수능시험장 점검</h2>
          <span className={i.hint}>컨설팅 기본정보의 수능시험장 여부 기준</span>
        </div>
        {data.suneung.total > 0 && (
          <span className={i.okPill}>
            {data.suneung.done} / {data.suneung.total} 완료
          </span>
        )}
      </div>
      {data.suneung.total === 0 ? (
        <div className={i.empty}>
          수능시험장으로 표시된 학교가 아직 없습니다
          <br />
          <span className={i.hint}>
            컨설팅 기본정보에서 수능시험장 여부를 &quot;예&quot;로 저장하면 집계됩니다
          </span>
        </div>
      ) : (
        <div className={i.snList}>
          {data.suneung.rows.map((r) => (
            <div key={r.school} className={i.snRow}>
              <span className={`${i.snDot} ${r.done ? i.snDotOk : i.snDotNo}`} />
              <span className={i.snSchool}>{r.school}</span>
              <span className={i.pendOffice}>{r.office || "—"}</span>
              <span className={r.done ? i.goodVal : i.badVal}>{r.done ? "완료" : "미완료"}</span>
            </div>
          ))}
          {data.suneung.total > data.suneung.rows.length && (
            <div className={i.note}>외 {data.suneung.total - data.suneung.rows.length}개교</div>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className={i.body}>
      {section === "issues" && (
        <>
          <div className={i.pair}>
            {faultCard}
            {urgencyCard}
          </div>
          {speakerCard}
        </>
      )}

      {section === "progress" && (
        <>
          {monthlyCard}
          {funnelCard}
        </>
      )}

      {section === "actions" && (
        <>
          {pendingCard}
          <div className={i.pair}>
            {impCard}
            {suneungCard}
          </div>
        </>
      )}
    </div>
  );
}
