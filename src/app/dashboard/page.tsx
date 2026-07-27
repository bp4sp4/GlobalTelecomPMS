import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { Card, StatCard } from "@/components/ui";
import { dashboardNav } from "@/lib/nav";
import { MessageComposer } from "./MessageComposer";
import styles from "./page.module.css";

const CONSULTING_TARGET = 300;

function fmt(d: Date) {
  return new Date(d).toISOString().slice(0, 19).replace("T", " ");
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdmin = session.role === "ADMIN";

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [consultingDone, totalReports, messages, accessLogs] = await Promise.all([
    prisma.report.count({ where: { type: "CONSULTING", status: "DONE" } }),
    prisma.report.count(),
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
  ]);
  const pct = Math.round((consultingDone / CONSULTING_TARGET) * 1000) / 10;

  // 접속 로그 사용자명 매핑
  const userMap = new Map<string, string>();
  if (accessLogs.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(accessLogs.map((l) => l.userId))] } },
      select: { id: true, username: true },
    });
    users.forEach((u) => userMap.set(u.id, u.username));
  }

  const initialMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    author: { username: m.author.username },
  }));

  return (
    <AppShell
      brand={{ title: "문서 자동화", subtitle: "현장 작업 문서 생성 시스템" }}
      sections={dashboardNav(isAdmin)}
    >
      <div className={styles.header}>
        <div>
          <h1 className={styles.headTitle}>대시보드</h1>
          <p className={styles.headDesc}>
            학교 검색은 문서관리에서 진행합니다. ({session.name ?? session.username} /{" "}
            {isAdmin ? "admin" : "guest"})
          </p>
        </div>
        <Link href="/api/auth/logout" className={styles.logoutBtn}>
          로그아웃
        </Link>
      </div>

      <div className={styles.statGrid}>
        <StatCard
          label="컨설팅 진행"
          value={`${consultingDone} / ${CONSULTING_TARGET}`}
          sub="완료기준: 컨설팅 DONE=1 / 스피커선로 DONE=4"
          percent={pct}
        />
        <StatCard
          label="문서 자동합계"
          value={totalReports}
          sub="reports 테이블 자동 집계"
          percent={100}
        />
        <StatCard
          label="완료"
          value={consultingDone}
          sub="완료기준: 컨설팅 DONE=1 / 스피커선로 DONE=4"
          percent={pct}
        />
        <StatCard
          label="진행률"
          value={`${pct}%`}
          sub="자동계산 완료 / 컨설팅대상"
          percent={pct}
        />
      </div>

      <div className={styles.twoCol}>
        <Card title="원격 접속(최근 10분)" meta="admin 전용">
          {!isAdmin ? (
            <p className={styles.placeholder}>admin 계정에서만 접속자 목록을 볼 수 있습니다.</p>
          ) : accessLogs.length === 0 ? (
            <p className={styles.placeholder}>최근 10분간 접속 기록이 없습니다.</p>
          ) : (
            <div>
              {accessLogs.map((l) => (
                <div key={l.id} className={styles.accessItem}>
                  <span className={styles.accessUser}>{userMap.get(l.userId) ?? "사용자"}</span>
                  <span>{l.ip ?? "-"}</span>
                  <span className={styles.accessTime}>{fmt(l.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="메시지" meta={`${session.username} (${isAdmin ? "admin" : "guest"})`}>
          <MessageComposer initial={initialMessages} />
        </Card>
      </div>

      <Card>
        <div className={styles.banner}>
          <h2 className={styles.bannerTitle}>진행상태 표시 영역</h2>
          <p className={styles.bannerDesc}>
            문서/보고서 연동 후 진행현황과 통계를 자동 표시합니다.
          </p>
          <Link href="/docs" className={styles.ctaBtn}>
            문서관리로 이동
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
