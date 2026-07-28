export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { mainNav } from "@/lib/nav";
import { DocumentList } from "@/components/docs/DocumentList";
import { loadDocRows, DOC_TYPES } from "@/lib/docList";

export default async function CompletedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const docs = await loadDocRows("DONE");

  return (
    <AppShell
      brand={{ title: "GlobalTelecom", subtitle: "BROADCAST CONSOLE" }}
      sections={mainNav(session.role === "ADMIN")}
      user={{ name: session.username, org: "서울특별시교육청" }}
    >
      <DocumentList mode="completed" docs={docs} types={DOC_TYPES} />
    </AppShell>
  );
}
