export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { mainNav } from "@/lib/nav";
import { DashboardView, type SchoolRow } from "./DashboardView";
import type { ReportType } from "@prisma/client";

const CONSULTING_TARGET = 300;

const TYPE_LABEL: Record<ReportType, string> = {
  CONSULTING: "컨설팅",
  EQUIPMENT: "장비목록",
  SPEAKERLINE: "스피커선로",
  IMPROVEMENT: "개선",
  PHOTOS: "방송사진",
};

function fmt(d: Date) {
  return new Date(d).toISOString().slice(0, 19).replace("T", " ");
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdmin = session.role === "ADMIN";

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [reportGroups, messages, accessLogs, users, recent] = await Promise.all([
    prisma.report.groupBy({ by: ["type", "status"], _count: true }),
    prisma.message.findMany({
      include: { author: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    isAdmin
      ? prisma.accessLog.findMany({
          where: { createdAt: { gte: tenMinAgo } },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.user.findMany({ select: { id: true, username: true } })
      : Promise.resolve([]),
    prisma.report.findMany({
      include: { school: { select: { name: true, district: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  const consultingDone = reportGroups
    .filter((g) => g.type === "CONSULTING" && g.status === "DONE")
    .reduce((s, g) => s + g._count, 0);
  const totalReports = reportGroups.reduce((s, g) => s + g._count, 0);
  const inProgress = reportGroups
    .filter((g) => g.status === "DRAFT")
    .reduce((s, g) => s + g._count, 0);

  const userMap = new Map(users.map((u) => [u.id, u.username]));

  const schools: SchoolRow[] = recent.map((r) => ({
    name: r.school.name,
    district: r.school.district ?? "—",
    type: TYPE_LABEL[r.type],
    status: r.status === "DONE" ? "완료" : "진행 중",
    updatedAt: fmt(r.updatedAt).slice(0, 10),
  }));

  return (
    <AppShell
      brand={{ title: "GlobalTelecom", subtitle: "BROADCAST CONSOLE" }}
      sections={mainNav(isAdmin)}
      user={{ name: session.username, org: "서울특별시교육청" }}
    >
      <DashboardView
        user={session.username}
        total={CONSULTING_TARGET}
        done={consultingDone}
        inProgress={inProgress}
        documents={totalReports}
        isAdmin={isAdmin}
        sessions={accessLogs.map((l) => ({
          user: userMap.get(l.userId) ?? "사용자",
          ip: l.ip ?? "-",
          at: fmt(l.createdAt),
        }))}
        schools={schools}
        messages={messages.map((m) => ({
          id: m.id,
          author: m.author.username,
          at: fmt(m.createdAt),
          body: m.content,
        }))}
      />
    </AppShell>
  );
}
