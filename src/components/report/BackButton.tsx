"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 보고서 화면의 뒤로 버튼.
 * 직전 페이지(저장 문서/완료된 문서/컨설팅 허브 등)로 실제로 돌아간다.
 * 새 탭으로 URL을 직접 열어 히스토리가 없을 때만 fallback 경로로 이동.
 */
export function BackButton({
  className,
  fallback = "/docs",
  label = "뒤로",
}: {
  className?: string;
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  const [canBack, setCanBack] = useState(true);

  useEffect(() => {
    setCanBack(window.history.length > 1);
  }, []);

  return (
    <button
      type="button"
      className={className}
      onClick={() => (canBack ? router.back() : router.push(fallback))}
    >
      ← {label}
    </button>
  );
}
