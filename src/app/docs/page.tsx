export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { docsNav } from "@/lib/nav";
import { DocsClient } from "./DocsClient";
import styles from "./page.module.css";

export default async function DocsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      brand={{ title: "문서관리", subtitle: "보고서/목록 관리" }}
      sections={docsNav()}
    >
      <div className={styles.header}>
        <div>
          <h1 className={styles.headTitle}>문서 자동화 시스템</h1>
          <p className={styles.headDesc}>학교를 검색하여 보고서를 작성합니다.</p>
        </div>
        <LogoutButton className={styles.logoutLink} />
      </div>
      <DocsClient />
    </AppShell>
  );
}