export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { mainNav } from "@/lib/nav";
import { DocsClient } from "./DocsClient";
import styles from "./page.module.css";

export default async function DocsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      brand={{ title: "GlobalTelecom", subtitle: "BROADCAST CONSOLE" }}
      sections={mainNav(session.role === "ADMIN")}
      user={{ name: session.username, org: "서울특별시교육청" }}
    >
      <header className={styles.header}>
        <div>
          <div className={styles.crumb}>문서 관리 / 문서 작성</div>
          <h1 className={styles.h1}>보고서 작성</h1>
        </div>
        <LogoutButton className={styles.logout} />
      </header>
      <DocsClient />
    </AppShell>
  );
}
