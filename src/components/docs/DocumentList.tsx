"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import s from "./DocumentList.module.css";

export type DocRow = {
  id: string;
  type: string; // 표시용 유형 라벨
  title: string;
  meta?: string;
  school: string;
  district: string;
  round?: string;
  savedAt: string;
  href: string; // 열기 경로
  summary?: string; // 목록에서 펼쳐 보는 총평/요약
};

const PAGE_SIZE = 20;

export function DocumentList({
  mode,
  docs,
  types,
}: {
  mode: "saved" | "completed";
  docs: DocRow[];
  types: string[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: docs.length };
    types.forEach((t) => (m[t] = docs.filter((d) => d.type === t).length));
    return m;
  }, [docs, types]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      const okType = filter === "전체" || d.type === filter;
      const okQuery = !q || `${d.title} ${d.school} ${d.district}`.toLowerCase().includes(q);
      return okType && okQuery;
    });
  }, [docs, filter, query]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const paged = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const isSaved = mode === "saved";
  const statusLabel = isSaved ? "저장(초안)" : "완료";

  function downloadCsv() {
    const rows = [
      ["문서명", "유형", "학교", "지역", "회차", isSaved ? "최종 저장" : "완료일", "상태", "요약"],
      ...visible.map((d) => [
        d.title,
        d.type,
        d.school,
        d.district,
        d.round ?? "",
        d.savedAt,
        statusLabel,
        d.summary ?? "",
      ]),
    ];
    const csv =
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
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isSaved ? "저장문서" : "완료문서"}_목록.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className={s.header}>
        <div>
          <div className={s.crumb}>문서 관리 / {isSaved ? "저장 문서" : "완료된 문서"}</div>
          <h1 className={s.h1}>{isSaved ? "저장된 문서" : "완료된 문서"}</h1>
          <p className={s.sub}>
            {isSaved
              ? `저장 상태(DRAFT) 문서만 집계됩니다 · 총 ${docs.length}건`
              : `완료 상태(DONE) 문서만 집계됩니다 · 총 ${docs.length}건`}
          </p>
        </div>
        <div className={s.headActions}>
          <button type="button" className={s.btnGhost} onClick={downloadCsv}>
            CSV 내려받기
          </button>
          <Link href="/docs" className={s.btnPrimary}>
            새 문서 작성
          </Link>
        </div>
      </header>

      <div className={s.body}>
        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>⌕</span>
            <input
              className={s.search}
              placeholder="학교명 · 문서명으로 검색"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className={s.chips}>
            {["전체", ...types].map((t) => (
              <button
                key={t}
                type="button"
                className={`${s.chip} ${filter === t ? s.chipOn : ""}`}
                onClick={() => {
                  setFilter(t);
                  setPage(1);
                }}
              >
                {t}
                <span className={s.chipCount}>{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <section className={s.list}>
          <div className={s.scroll}>
            <div className={s.inner}>
              <div className={`${s.row} ${s.head}`}>
                <span>문서명</span>
                <span>학교</span>
                <span>회차</span>
                <span>{isSaved ? "최종 저장" : "완료일"}</span>
                <span>상태</span>
                <span style={{ justifySelf: "end" }}>작업</span>
              </div>

              {paged.map((d) => {
                const open = openId === d.id;
                return (
                <Fragment key={d.id}>
                <div className={s.row}>
                  <div className={s.cellStack}>
                    <span className={s.docTitle}>{d.title}</span>
                    {d.summary ? (
                      <button
                        type="button"
                        className={`${s.docMeta} ${s.metaToggle} ${open ? s.metaToggleOn : ""}`}
                        onClick={() => setOpenId(open ? null : d.id)}
                        aria-expanded={open}
                      >
                        {d.meta ?? "요약"} · 요약 {open ? "닫기 ▴" : "보기 ▾"}
                      </button>
                    ) : (
                      d.meta && <span className={s.docMeta}>{d.meta}</span>
                    )}
                  </div>
                  <div className={s.cellStack}>
                    <span className={s.school}>{d.school}</span>
                    <span className={s.district}>{d.district}</span>
                  </div>
                  <span className={s.round}>{d.round ?? "—"}</span>
                  <span className={s.savedAt}>{d.savedAt}</span>
                  <span
                    className={`${s.status} ${isSaved ? s.statusDraft : s.statusDone}`}
                  >
                    {statusLabel}
                  </span>
                  <div className={s.rowActions}>
                    <Link href={d.href} className={s.smallGhost}>
                      PDF
                    </Link>
                    <Link href={d.href} className={s.smallPrimary}>
                      열기
                    </Link>
                  </div>
                </div>

                {open && d.summary && (
                  <div className={s.summaryPanel}>
                    <div className={s.summaryTitle}>총평 / 요약</div>
                    <p className={s.summaryText}>{d.summary}</p>
                  </div>
                )}
                </Fragment>
                );
              })}
            </div>
          </div>

          {visible.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon} />
              <div className={s.emptyTitle}>
                {isSaved ? "저장된 문서가 없습니다" : "완료된 문서가 없습니다"}
              </div>
              <div className={s.emptyDesc}>
                문서 작성에서 학교를 선택해 보고서를 시작하세요
              </div>
              <Link href="/docs" className={s.btnPrimary} style={{ marginTop: 6 }}>
                문서 작성으로 이동
              </Link>
            </div>
          )}
        </section>

        {visible.length > 0 && (
          <div className={s.footer}>
            <span className={s.footCount}>{visible.length}건 표시</span>
            <div className={s.pager}>
              <button
                type="button"
                className={s.pageBtn}
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, current - 3), Math.max(0, current - 3) + 5)
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${s.pageBtn} ${p === current ? s.pageOn : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
              <button
                type="button"
                className={s.pageBtn}
                disabled={current >= totalPages}
                onClick={() => setPage(current + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
