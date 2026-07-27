import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { docsNav } from "@/lib/nav";
import { metaOf } from "@/lib/reportMeta";
import type { ReportType, ReportStatus } from "@prisma/client";
import f from "../_docfolder.module.css";
import s from "@/components/report/report.module.css";

function fmt(d: Date) {
  return new Date(d).toISOString().slice(0, 16).replace("T", " ");
}

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const type = (sp.type ?? "EQUIPMENT") as ReportType;
  const status = (sp.status ?? "DRAFT") as ReportStatus;
  const meta = metaOf(type);

  const reports = await prisma.report.findMany({
    where: { type, status },
    include: { school: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell brand={{ title: "문서관리", subtitle: "보고서/목록 관리" }} sections={docsNav()}>
      <div className={f.head}>
        <h1 className={f.title}>
          {meta.icon} {meta.title} — {status === "DONE" ? "완료본" : "저장본"}
        </h1>
        <p className={f.desc}>{reports.length}건</p>
      </div>
      <div className={s.panel}>
        <div className={s.tableWrap}>
          <table className={f.table}>
            <thead>
              <tr><th>No</th><th>학교명</th>{type === "CONSULTING" && <th>회차</th>}<th>수정일</th><th>열기</th></tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#6d7882" }}>문서가 없습니다.</td></tr>
              )}
              {reports.map((r, i) => {
                const href =
                  type === "CONSULTING"
                    ? `/pms/consulting/new?school=${encodeURIComponent(r.school.name)}&round=${r.round ?? 1}`
                    : `${meta.path}?school=${encodeURIComponent(r.school.name)}`;
                return (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.school.name}</td>
                    {type === "CONSULTING" && <td>{r.round}차</td>}
                    <td>{fmt(r.updatedAt)}</td>
                    <td><Link href={href} className={f.openBtn}>열기</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
