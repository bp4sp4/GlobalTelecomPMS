"use client";

import { useState } from "react";

/**
 * 로그아웃은 반드시 POST로 처리한다.
 * (GET 링크로 두면 Next.js Link 프리페치가 이를 미리 호출해
 *  사용자가 클릭하지 않아도 세션이 삭제되는 문제가 발생한다.)
 */
export function LogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={busy}>
      로그아웃
    </button>
  );
}
