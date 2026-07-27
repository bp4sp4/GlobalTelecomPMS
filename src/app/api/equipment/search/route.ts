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

  const items = await prisma.equipmentCatalog.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { maker: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    take: limit,
    orderBy: [{ name: "asc" }, { maker: "asc" }],
  });
  return NextResponse.json(
    items.map((i) => ({ name: i.name, code: i.code, maker: i.maker }))
  );
}
