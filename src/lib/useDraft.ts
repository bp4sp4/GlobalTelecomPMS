"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 작성 중 내용 자동 임시보관.
 *
 * 서버 저장과 별개로 브라우저에 주기적으로 담아둔다.
 * 브라우저를 닫거나 네트워크가 끊겨도 다시 들어오면 복구할 수 있고,
 * 저장하지 않고 나가려 하면 브라우저가 확인 창을 띄운다.
 */
export function useDraft<T>({
  key,
  data,
  dirty,
  enabled = true,
}: {
  /** 문서를 구분하는 키 (예: consulting:광영고등학교:1) */
  key: string;
  /** 현재 폼 상태 */
  data: T;
  /** 저장 이후 변경된 내용이 있는지 */
  dirty: boolean;
  enabled?: boolean;
}) {
  const storageKey = `draft:${key}`;
  const [found, setFound] = useState<{ at: string; data: T } | null>(null);
  const loaded = useRef(false);

  // 들어올 때 임시보관본 확인
  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { at: string; data: T };
      if (parsed?.data) setFound(parsed);
    } catch {
      /* 형식이 깨졌으면 무시 */
    }
  }, [storageKey, enabled]);

  // 변경이 있을 때만 1.5초 뒤 보관 (입력 중 과도한 쓰기 방지)
  useEffect(() => {
    if (!enabled || !dirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ at: new Date().toISOString(), data })
        );
      } catch {
        /* 용량 초과 등 — 임시보관 실패가 작성을 막지는 않는다 */
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [storageKey, data, dirty, enabled]);

  // 저장하지 않고 이탈 시 경고
  useEffect(() => {
    if (!enabled || !dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty, enabled]);

  /** 저장이 끝나면 호출 — 보관본을 지운다 */
  function clear() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* noop */
    }
    setFound(null);
  }

  return { found, dismiss: () => setFound(null), clear };
}

/** 임시보관 시각을 "오늘 14:32" 형태로 */
export function draftTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay ? `오늘 ${hhmm}` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${hhmm}`;
}
