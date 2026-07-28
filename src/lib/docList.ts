import "server-only";
import { prisma } from "@/lib/prisma";
import type { ReportStatus, ReportType } from "@prisma/client";
import type { DocRow } from "@/components/docs/DocumentList";

export const DOC_TYPES = [
  "컨설팅 보고서",
  "방송 장비 목록",
  "스피커 선로",
  "개선보고서",
  "방송사진",
];

const TYPE_LABEL: Record<ReportType, string> = {
  CONSULTING: "컨설팅 보고서",
  EQUIPMENT: "방송 장비 목록",
  SPEAKERLINE: "스피커 선로",
  IMPROVEMENT: "개선보고서",
  PHOTOS: "방송사진",
};

const TYPE_TITLE: Record<ReportType, string> = {
  CONSULTING: "방송장비 컨설팅 보고서",
  EQUIPMENT: "방송 장비 목록",
  SPEAKERLINE: "스피커 선로 점검 보고서",
  IMPROVEMENT: "개선보고서",
  PHOTOS: "방송사진",
};

const TYPE_PATH: Record<ReportType, string> = {
  CONSULTING: "/pms/consulting/new",
  EQUIPMENT: "/docs/equipment",
  SPEAKERLINE: "/docs/speakerline",
  IMPROVEMENT: "/docs/improvement",
  PHOTOS: "/docs/photos",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function metaOf(type: ReportType, payload: any): string | undefined {
  try {
    if (type === "CONSULTING") {
      const rows = Object.values(payload?.sections ?? {}).flat() as any[];
      const filled = rows.filter((r) => r?.state || r?.equipment || r?.fault).length;
      const issues = rows.filter((r) => r?.fault).length;
      return `점검 ${filled}건 · 개선 ${issues}건`;
    }
    if (type === "EQUIPMENT") {
      return `장비 ${(payload?.items ?? []).length}건`;
    }
    if (type === "SPEAKERLINE") {
      const n =
        (payload?.section2 ?? []).length + (payload?.section3 ?? []).length;
      return `측정 ${n}건`;
    }
    if (type === "IMPROVEMENT") {
      const items = payload?.items ?? [];
      const total = Number(payload?.total ?? 0);
      return `개선 ${items.length}건${total ? ` · ${total.toLocaleString()}원` : ""}`;
    }
    if (type === "PHOTOS") {
      let n = 0;
      for (const rooms of Object.values(payload?.photos ?? {})) {
        for (const files of Object.values((rooms ?? {}) as Record<string, unknown[]>)) {
          n += Array.isArray(files) ? files.length : 0;
        }
      }
      return `사진 ${n}장`;
    }
  } catch {
    /* noop */
  }
  return undefined;
}

/** 목록에서 펼쳐 볼 요약 — 컨설팅은 저장된 총평(자동요약)을 그대로 보여준다 */
function summaryOf(type: ReportType, payload: any): string | undefined {
  try {
    if (type === "CONSULTING") {
      const saved = String(payload?.analysis?.summary ?? "").trim();
      if (saved) return saved;
      const rows = Object.values(payload?.sections ?? {}).flat() as any[];
      const c = (u: string) => rows.filter((r) => r?.urgency === u).length;
      if (!rows.length) return undefined;
      return `- 총${rows.length}건 시급성 상 ${c("상")} 🔴 / 중 ${c("중")} 🟡 / 하 ${c("하")} 🟢`;
    }

    if (type === "EQUIPMENT") {
      const items = (payload?.items ?? []) as any[];
      if (!items.length) return undefined;
      const byCat = new Map<string, number>();
      for (const it of items) {
        const k = String(it?.category || "미분류");
        byCat.set(k, (byCat.get(k) ?? 0) + 1);
      }
      const detail = [...byCat.entries()].map(([k, n]) => `${k} ${n}건`).join(" · ");
      return `- 총 ${items.length}건 등록\n- 분류별: ${detail}`;
    }

    if (type === "SPEAKERLINE") {
      const s1 = (payload?.section1 ?? []) as any[];
      const s2 = (payload?.section2 ?? []) as any[];
      const s3 = (payload?.section3 ?? []) as any[];
      const all = [...s1, ...s2, ...s3];
      if (!all.length) return undefined;
      const good = all.filter((r) => r?.verdict === "양호").length;
      const bad = all.filter((r) => r?.verdict === "불량").length;
      const need = [...s2, ...s3].filter((r) => r?.improve === "필요").length;
      return [
        `- 송출부 ${s1.length}항목 · 출력/음압 ${s2.length}건 · 임피던스 ${s3.length}건`,
        `- 판정: 양호 ${good} 🟢 / 불량 ${bad} 🔴 / 미판정 ${all.length - good - bad}`,
        need ? `- 개선 필요 ${need}건` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (type === "IMPROVEMENT") {
      const items = (payload?.items ?? []) as any[];
      if (!items.length) return undefined;
      const total = Number(payload?.total ?? 0);
      const qty = items.reduce((n, r) => n + (Number(r?.qty) || 0), 0);
      const byCat = new Map<string, number>();
      for (const it of items) {
        const k = String(it?.category || "미분류");
        byCat.set(k, (byCat.get(k) ?? 0) + 1);
      }
      return [
        `- 개선 ${items.length}건 · 총 수량 ${qty}`,
        total ? `- 개선금액 합계 ${total.toLocaleString()}원` : null,
        `- 분류별: ${[...byCat.entries()].map(([k, n]) => `${k} ${n}건`).join(" · ")}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (type === "PHOTOS") {
      const photos = (payload?.photos ?? {}) as Record<string, Record<string, unknown[]>>;
      const lines: string[] = [];
      let total = 0;
      for (const [cat, rooms] of Object.entries(photos)) {
        let n = 0;
        const parts: string[] = [];
        for (const [room, files] of Object.entries(rooms ?? {})) {
          const c = Array.isArray(files) ? files.length : 0;
          if (c > 0) {
            n += c;
            parts.push(`${room} ${c}`);
          }
        }
        if (n > 0) {
          total += n;
          lines.push(`- ${cat} ${n}장 (${parts.join(" · ")})`);
        }
      }
      if (!total) return undefined;
      return [`- 총 ${total}장`, ...lines].join("\n");
    }
  } catch {
    /* noop */
  }
  return undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function fmt(d: Date) {
  return new Date(d).toISOString().slice(0, 16).replace("T", " ");
}

/** 저장(DRAFT) / 완료(DONE) 문서 목록 */
export async function loadDocRows(status: ReportStatus): Promise<DocRow[]> {
  const reports = await prisma.report.findMany({
    where: { status },
    include: { school: { select: { name: true, district: true } } },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return reports.map((r) => {
    const q = `?school=${encodeURIComponent(r.school.name)}`;
    const href =
      r.type === "CONSULTING"
        ? `${TYPE_PATH.CONSULTING}${q}&round=${r.round ?? 1}`
        : `${TYPE_PATH[r.type]}${q}`;
    return {
      id: r.id,
      type: TYPE_LABEL[r.type],
      title: TYPE_TITLE[r.type],
      meta: metaOf(r.type, r.payload),
      summary: summaryOf(r.type, r.payload),
      school: r.school.name,
      district: r.school.district ?? "—",
      round: r.type === "CONSULTING" ? `${r.round ?? 1}차` : undefined,
      savedAt: fmt(status === "DONE" ? (r.completedAt ?? r.updatedAt) : r.updatedAt),
      href,
    };
  });
}
