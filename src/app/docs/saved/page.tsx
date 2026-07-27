import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { docsNav } from "@/lib/nav";
import { TYPE_META } from "@/lib/reportMeta";
import f from "../_docfolder.module.css";

export default async function SavedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const counts = await prisma.report.groupBy({
    by: ["type"],
    where: { status: "DRAFT" },
    _count: true,
  });
  const map = new Map(counts.map((c) => [c.type, c._count]));

  return (
    <AppShell brand={{ title: "문서관리", subtitle: "보고서/목록 관리" }} sections={docsNav()}>
      <div className={f.head}>
        <h1 className={f.title}>저장된 문서</h1>
        <p className={f.desc}>저장 상태(DRAFT) 문서만 집계합니다. 유형을 선택해 목록을 확인하세요.</p>
      </div>
      <div className={f.grid}>
        {TYPE_META.map((m) => (
          <Link key={m.type} href={`/docs/list?type=${m.type}&status=DRAFT`} className={f.card}>
            <span className={f.icon}>{m.icon}</span>
            <div className={f.body}>
              <h2 className={f.cardTitle}>{m.title}</h2>
              <p className={f.cardDesc}>저장본 · 열기</p>
            </div>
            <span className={f.count}>{map.get(m.type) ?? 0}건</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
