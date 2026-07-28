export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { mainNav } from "@/lib/nav";
import { LogView, type AccessRow, type ActivityRow } from "./LogView";
import type { LogAction, Prisma } from "@prisma/client";

const PAGE_SIZE = 30;
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "COMPLETE", "UPLOAD"];
const PERIODS: Record<string, number | null> = { "7": 7, "30": 30, all: null };

/** 기록 시각은 UTC 로 저장되므로 화면에는 한국시간으로 환산해 보여준다 */
const KST = 9 * 60 * 60 * 1000;
function fmtKst(d: Date) {
  return new Date(d.getTime() + KST).toISOString().slice(0, 19).replace("T", " ");
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    q?: string;
    action?: string;
    period?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // 미들웨어에서도 /system 을 ADMIN 전용으로 막지만, 페이지에서도 한 번 더 확인
  if (session.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const tab: "activity" | "access" = sp.tab === "access" ? "access" : "activity";
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim();
  const action = sp.action && ACTIONS.includes(sp.action) ? (sp.action as LogAction) : "";
  const period = sp.period && sp.period in PERIODS ? sp.period : "30";

  const days = PERIODS[period];
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
  const periodWhere = since ? { createdAt: { gte: since } } : {};

  const skip = (page - 1) * PAGE_SIZE;

  // 한국시간 기준 오늘 0시 (스파크라인용)
  const nowKst = new Date(Date.now() + KST);
  const todayStart = new Date(
    Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate()) - KST
  );

  const [accessTotal, activityTotal, actionGroups, ipGroups, todayLogs] = await Promise.all([
    prisma.accessLog.count({ where: periodWhere }),
    prisma.activityLog.count({ where: periodWhere }),
    prisma.activityLog.groupBy({ by: ["action"], _count: true, where: periodWhere }),
    prisma.accessLog.groupBy({
      by: ["ip"],
      _count: true,
      where: periodWhere,
      orderBy: { _count: { ip: "desc" } },
      take: 4,
    }),
    prisma.accessLog.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { createdAt: true },
    }),
  ]);

  const actionCounts: Record<string, number> = { "": activityTotal };
  for (const g of actionGroups) actionCounts[g.action] = g._count;

  // 2시간 단위 12구간
  const bins = new Array(12).fill(0) as number[];
  for (const l of todayLogs) {
    const h = Number(fmtKst(l.createdAt).slice(11, 13));
    bins[Math.min(11, Math.floor(h / 2))] += 1;
  }

  const ipStats = ipGroups
    .filter((g) => g.ip)
    .map((g) => ({ ip: g.ip as string, count: g._count }));

  let accessRows: AccessRow[] = [];
  let activityRows: ActivityRow[] = [];
  let filtered = 0;

  if (tab === "activity") {
    const where: Prisma.ActivityLogWhereInput = {
      ...periodWhere,
      ...(action ? { action } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { target: { contains: q, mode: "insensitive" } },
              { detail: { contains: q, mode: "insensitive" } },
              { ip: { contains: q } },
            ],
          }
        : {}),
    };

    const [rows, count] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.activityLog.count({ where }),
    ]);
    filtered = count;
    activityRows = rows.map((l) => ({
      id: l.id,
      user: l.username,
      action: l.action,
      entity: l.entity,
      target: l.target ?? "—",
      detail: l.detail ?? "",
      ip: l.ip ?? "—",
      at: fmtKst(l.createdAt),
    }));
  } else {
    // AccessLog 는 userId 만 저장하므로, 사용자명 검색은 먼저 계정을 찾아 id 로 건다
    let where: Prisma.AccessLogWhereInput = { ...periodWhere };
    if (q) {
      const matched = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      where = {
        ...periodWhere,
        OR: [{ userId: { in: matched.map((u) => u.id) } }, { ip: { contains: q } }],
      };
    }

    const [rows, count] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.accessLog.count({ where }),
    ]);
    filtered = count;

    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
      select: { id: true, username: true, name: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    accessRows = rows.map((l) => {
      const u = userMap.get(l.userId);
      return {
        id: l.id,
        user: u ? (u.name ? `${u.username} (${u.name})` : u.username) : "삭제된 계정",
        role: u ? (u.role === "ADMIN" ? "운영자" : "사용자") : "—",
        ip: l.ip ?? "—",
        at: fmtKst(l.createdAt),
      };
    });
  }

  return (
    <AppShell
      brand={{ title: "GlobalTelecom", subtitle: "BROADCAST CONSOLE" }}
      sections={mainNav(true)}
      user={{ name: session.username, org: "서울특별시교육청" }}
    >
      <LogView
        tab={tab}
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered}
        accessTotal={accessTotal}
        activityTotal={activityTotal}
        actionCounts={actionCounts}
        query={q}
        action={action}
        period={period}
        access={accessRows}
        activity={activityRows}
        todayBins={bins}
        todayTotal={todayLogs.length}
        ipStats={ipStats}
      />
    </AppShell>
  );
}
