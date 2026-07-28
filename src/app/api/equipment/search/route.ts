import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 장비 카탈로그 검색 (장비명/모델/제조사 부분일치)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  // 검색어 1글자면 결과 없음(오탐 방지). 0글자면 기본 리스트 노출.
  if (q.length === 1) return NextResponse.json([]);

  // 공백으로 나눈 각 단어를 모두 만족(AND)하되, 단어별로는 장비명/모델/제조사 어디든 매칭(OR).
  // 예) "mx 1646" → 'mx'와 '1646'을 모두 포함하는 항목 (AUDIO MIXER / GENPRO / MX-1646 …)
  // 하이픈은 무시하고 비교할 수 있도록 원문과 하이픈 제거 형태를 함께 조회한다.
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 5);

  const items = await prisma.equipmentCatalog.findMany({
    where: tokens.length
      ? {
          AND: tokens.map((t) => ({
            OR: [
              { name: { contains: t, mode: "insensitive" as const } },
              { code: { contains: t, mode: "insensitive" as const } },
              { maker: { contains: t, mode: "insensitive" as const } },
            ],
          })),
        }
      : undefined,
    take: limit,
    orderBy: [{ name: "asc" }, { maker: "asc" }],
  });
  return NextResponse.json(
    items.map((i) => ({ name: i.name, code: i.code, maker: i.maker }))
  );
}
