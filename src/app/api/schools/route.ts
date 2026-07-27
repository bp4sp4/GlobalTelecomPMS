import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 학교명 부분검색 (원본 /api/schools?q= 대응). 최대 30개.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json([]);

  const schools = await prisma.school.findMany({
    where: { name: { contains: q } },
    select: { name: true, educationOffice: true, district: true },
    orderBy: { name: "asc" },
    take: 30,
  });
  return NextResponse.json(schools);
}
