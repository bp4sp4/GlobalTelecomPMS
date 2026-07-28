"use client";

import Link from "next/link";
import { BackButton } from "@/components/report/BackButton";
import s from "./summary.module.css";

/** 요약본 상단 액션바 — 뒤로 / PDF 출력 / 원본 문서 열기 */
export function SummaryActions({ editHref }: { editHref: string }) {
  return (
    <div className={`${s.actions} no-print`}>
      <BackButton className={s.btn} fallback="/docs/completed" />
      <div className={s.actionsRight}>
        <button type="button" className={s.btn} onClick={() => window.print()}>
          PDF 출력
        </button>
        <Link href={editHref} className={`${s.btn} ${s.btnPrimary}`}>
          문서 열기
        </Link>
      </div>
    </div>
  );
}
