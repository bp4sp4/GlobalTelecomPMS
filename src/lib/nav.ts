import type { NavSection } from "@/components/layout/AppShell";

/** 전 페이지 공통 통합 사이드바 */
export function mainNav(isAdmin: boolean): NavSection[] {
  return [
    {
      title: "문서 관리",
      items: [
        { label: "대시보드", href: "/dashboard" },
        { label: "문서 작성", href: "/docs" },
        { label: "저장 문서", href: "/docs/saved" },
        { label: "완료된 문서", href: "/docs/completed" },
        { label: "관제(통계)", href: "/dashboard/stats" },
      ],
    },
    {
      title: "시스템",
      items: [
        ...(isAdmin ? [{ label: "학교 데이터 업로드", href: "/system/csv" }] : []),
        { label: "로그아웃", href: "/api/auth/logout" },
      ],
    },
  ];
}

// 하위 호환 별칭 (기존 호출부 유지)
export const dashboardNav = mainNav;
export function docsNav(isAdmin = false): NavSection[] {
  return mainNav(isAdmin);
}
