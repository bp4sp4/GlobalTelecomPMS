import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ReportType } from "@prisma/client";

const LEVEL_LABEL: Record<string, string> = {
  ELEMENTARY: "초등학교",
  MIDDLE: "중학교",
  HIGH: "고등학교",
  ETC: "기타",
};

const TYPES: { key: string; type: ReportType; title: string; desc: string; path: string }[] = [
  { key: "consulting", type: "CONSULTING", title: "방송 장비 컨설팅 보고서", desc: "1차 / 2차 저장 · 완료 상태 표시", path: "/docs/consulting" },
  { key: "equipment", type: "EQUIPMENT", title: "방송 장비 목록", desc: "학교별 장비 목록 작성 / 저장 / 완료", path: "/docs/equipment" },
  { key: "speakerline", type: "SPEAKERLINE", title: "스피커 선로 점검 보고서", desc: "선로 점검 작성 / 저장 / 완료", path: "/docs/speakerline" },
  { key: "improvement", type: "IMPROVEMENT", title: "개선보고서", desc: "개선 요청 / 조치 작성 · 저장 / 완료", path: "/docs/improvement" },
  { key: "photos", type: "PHOTOS", title: "방송사진", desc: "폴더별 사진 업로드 · 저장 / 완료", path: "/docs/photos" },
];

function fmt(d: Date) {
  return new Date(d).toISOString().slice(0, 16).replace("T", " ");
}

// GET /api/school-status?school=학교명
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("school") ?? "").trim();
  if (!name) return NextResponse.json({ message: "school required" }, { status: 400 });

  const school = await prisma.school.findUnique({
    where: { name },
    include: {
      reports: {
        select: { type: true, status: true, round: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!school) return NextResponse.json({ message: "not found" }, { status: 404 });

  const reports = TYPES.map((t) => {
    const found = school.reports.filter((r) => r.type === t.type);
    const done = found.filter((r) => r.status === "DONE");
    const draft = found.filter((r) => r.status === "DRAFT");

    let status: "완료" | "작성 중" | "미착수" = "미착수";
    let progress = 0;
    let progressLabel = "시작 전";

    if (t.type === "CONSULTING") {
      // 1차/2차 각각을 진행률로 환산
      const rounds = new Set(done.map((r) => r.round ?? 1));
      progress = Math.round((rounds.size / 2) * 100);
      if (rounds.size >= 2) {
        status = "완료";
        progressLabel = "2차까지 완료";
      } else if (rounds.size === 1) {
        status = "작성 중";
        progressLabel = "1차 완료";
      } else if (draft.length) {
        status = "작성 중";
        progress = 25;
        progressLabel = "작성 중";
      }
    } else if (done.length) {
      status = "완료";
      progress = 100;
      progressLabel = "저장 완료";
    } else if (draft.length) {
      status = "작성 중";
      progress = 50;
      progressLabel = "임시 저장됨";
    }

    return {
      ...t,
      status,
      progress,
      progressLabel,
      updatedAt: found[0] ? fmt(found[0].updatedAt) : null,
    };
  });

  const recent = school.reports.slice(0, 3).map((r) => ({
    title: TYPES.find((t) => t.type === r.type)?.title ?? r.type,
    at: fmt(r.updatedAt),
  }));

  return NextResponse.json({
    school: {
      name: school.name,
      district: school.district ?? "—",
      level: LEVEL_LABEL[school.schoolLevel] ?? "기타",
      code: school.neisCode ?? "—",
    },
    reports,
    recent,
  });
}
