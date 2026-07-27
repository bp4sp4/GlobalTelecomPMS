import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { CodeKind } from "@prisma/client";

// GET /api/codes?kind=EQUIPMENT&q=&category=
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") as CodeKind | null;
  const q = (searchParams.get("q") ?? "").trim();
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};
  if (kind) where.kind = kind;
  if (category) where.category = category;
  if (q) where.OR = [{ code: { contains: q } }, { name: { contains: q } }];

  const codes = await prisma.code.findMany({
    where,
    orderBy: { code: "asc" },
    take: q ? 40 : 500,
  });
  return NextResponse.json(codes);
}
