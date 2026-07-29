"use client";

import { draftTime } from "@/lib/useDraft";
import s from "./loadPrevious.module.css";

/** 저장하지 않고 나갔던 내용이 남아 있을 때 뜨는 복구 배너 */
export function DraftBanner({
  at,
  onRestore,
  onDismiss,
}: {
  at: string;
  onRestore: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className={`${s.bar} ${s.barDraft} no-print`}>
      <span className={`${s.icon} ${s.iconDraft}`}>!</span>
      <span className={s.text}>
        <b>저장하지 않은 작성 내용</b>이 있습니다
        <span className={s.meta}>{draftTime(at)} 자동 보관</span>
      </span>
      <button type="button" className={`${s.btn} ${s.btnDraft}`} onClick={onRestore}>
        이어서 작성
      </button>
      <button type="button" className={s.close} onClick={onDismiss} aria-label="닫기">
        ×
      </button>
    </div>
  );
}
