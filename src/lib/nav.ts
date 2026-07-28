import type { NavSection } from "@/components/layout/AppShell";

/** 전 페이지 공통 통합 사이드바 */
export function mainNav(isAdmin: boolean): NavSection[] {
  return [
    {
      title: "문서 관리",
      items: [
        { label: "대시보드", href: "/dashboard", icon: "home" },
        { label: "문서 작성", href: "/docs", icon: "edit" },
        { label: "저장 문서", href: "/docs/saved", icon: "save" },
        { label: "완료된 문서", href: "/docs/completed", icon: "check" },
        { label: "관제(통계)", href: "/dashboard/stats", icon: "chart" },
      ],
    },
    {
      title: "시스템",
      items: [
        ...(isAdmin
          ? [
              { label: "학교 데이터 업로드", href: "/system/csv", icon: "upload" },
              { label: "접속 · 변경 기록", href: "/system/logs", icon: "log" },
            ]
          : []),
        { label: "로그아웃", href: "/api/auth/logout", icon: "logout" },
      ],
    },
  ];
}

// 하위 호환 별칭 (기존 호출부 유지)
export const dashboardNav = mainNav;
export function docsNav(isAdmin = false): NavSection[] {
  return mainNav(isAdmin);
}
