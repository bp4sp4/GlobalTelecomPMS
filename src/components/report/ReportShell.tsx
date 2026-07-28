import "server-only";
import { AppShell } from "@/components/layout/AppShell";
import { mainNav } from "@/lib/nav";

/** 보고서 작성 화면 공통 셸 — 좌측 사이드바를 다른 페이지와 동일하게 유지한다. */
export function ReportShell({
  session,
  children,
}: {
  session: { username: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <AppShell
      brand={{ title: "GlobalTelecom" }}
      sections={mainNav(session.role === "ADMIN")}
      user={{ name: session.username, org: "서울특별시교육청" }}
    >
      {children}
    </AppShell>
  );
}
