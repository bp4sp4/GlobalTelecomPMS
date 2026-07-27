import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 학교 상세(지청/주소) — 원본 /api/school-info?name= 대응
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") ?? "").trim();
  if (!name) {
    return NextResponse.json({ message: "name required" }, { status: 400 });
  }
  const school = await prisma.school.findUnique({ where: { name } });
  if (!school) return NextResponse.json({ message: "not found" }, { status: 404 });

  return NextResponse.json({
    school_name: school.name,
    district: school.educationOffice
      ? `서울특별시${school.educationOffice}교육지원청`
      : null,
    address: school.district,
    schoolLevel: school.schoolLevel,
  });
}
