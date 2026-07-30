"use client";

import { useEffect, useState } from "react";

const KEY = "theme";
type Theme = "light" | "dark";

/**
 * 라이트/다크 전환 버튼.
 * 선택값은 localStorage 에 저장하고 <html data-theme> 로 적용한다.
 * (첫 페인트 전 적용은 layout.tsx 의 인라인 스크립트가 담당 — 깜빡임 방지)
 */
export function ThemeToggle({
  className,
  labelClassName,
}: {
  className?: string;
  labelClassName?: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* 저장 실패해도 현재 화면에는 적용된다 */
    }
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      title={dark ? "라이트 모드로" : "다크 모드로"}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {dark ? (
        // 해 (누르면 밝아짐)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // 달 (누르면 어두워짐)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
      <span className={labelClassName}>{dark ? "라이트 모드" : "다크 모드"}</span>
    </button>
  );
}
