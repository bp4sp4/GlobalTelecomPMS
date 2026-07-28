import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LogAction } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";

/** 프록시(Vercel) 뒤에서 실제 클라이언트 IP */
export function clientIp(req: Request): string | null {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? null;
}

/**
 * 데이터 변경 이력 기록.
 * after()로 응답 이후에 실행하므로 사용자 응답 속도에 영향을 주지 않는다.
 * 로그 저장 실패가 본 작업을 깨뜨리지 않도록 항상 삼킨다.
 */
export function logActivity(opts: {
  session: SessionPayload;
  req: Request;
  action: LogAction;
  entity: "REPORT" | "MESSAGE" | "PHOTO";
  entityId?: string | null;
  target?: string | null;
  detail?: string | null;
}) {
  const ip = clientIp(opts.req);
  after(async () => {
    await prisma.activityLog
      .create({
        data: {
          userId: opts.session.sub,
          username: opts.session.username,
          action: opts.action,
          entity: opts.entity,
          entityId: opts.entityId ?? null,
          target: opts.target ?? null,
          detail: opts.detail ?? null,
          ip,
        },
      })
      .catch(() => null);
  });
}

export const REPORT_TYPE_LABEL: Record<string, string> = {
  CONSULTING: "컨설팅 보고서",
  EQUIPMENT: "방송 장비 목록",
  SPEAKERLINE: "스피커 선로",
  IMPROVEMENT: "개선보고서",
  PHOTOS: "방송사진",
};
