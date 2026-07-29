import JSZip from "jszip";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/photos/zip?school=학교명
 * 해당 학교의 방송사진을 구분/실 폴더 구조 그대로 묶어 ZIP 으로 내려준다.
 */
export const dynamic = "force-dynamic";

type Photo = { url: string; name: string };
type Store = Record<string, Record<string, Photo[]>>;

/** ZIP 안의 폴더·파일명에 쓸 수 없는 문자 정리 (한글은 그대로 둔다) */
function safe(v: string) {
  return v.replace(/[\\/:*?"<>|]/g, "_").trim() || "_";
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const schoolName = searchParams.get("school");
  if (!schoolName) return NextResponse.json({ message: "school 필요" }, { status: 400 });

  const school = await prisma.school.findUnique({
    where: { name: schoolName },
    select: { id: true, name: true },
  });
  if (!school) return NextResponse.json({ message: "학교 없음" }, { status: 404 });

  const report = await prisma.report.findFirst({
    where: { schoolId: school.id, type: "PHOTOS" },
    orderBy: { updatedAt: "desc" },
    select: { payload: true },
  });

  const photos = ((report?.payload as { photos?: Store } | null)?.photos ?? {}) as Store;

  // 내려받을 사진 목록 (구분/실 순서 유지)
  const items: { path: string; url: string }[] = [];
  for (const [category, rooms] of Object.entries(photos)) {
    for (const [room, files] of Object.entries(rooms ?? {})) {
      (files ?? []).forEach((f, i) => {
        if (!f?.url) return;
        const ext = (f.name?.split(".").pop() ?? "jpg").replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const base = f.name ? safe(f.name.replace(/\.[^.]+$/, "")) : `${room}_${i + 1}`;
        items.push({
          path: `${safe(school.name)}/${safe(category)}/${safe(room)}/${String(i + 1).padStart(2, "0")}_${base}.${ext}`,
          url: f.url,
        });
      });
    }
  }

  if (!items.length) {
    return NextResponse.json({ message: "내려받을 사진이 없습니다." }, { status: 404 });
  }

  const zip = new JSZip();
  // 스토리지에서 받아 담는다 (동시 6개씩 — 너무 많이 열면 서버가 막힌다)
  const failed: string[] = [];
  const queue = [...items];
  async function worker() {
    for (;;) {
      const it = queue.shift();
      if (!it) return;
      try {
        const res = await fetch(it.url);
        if (!res.ok) throw new Error(String(res.status));
        zip.file(it.path, await res.arrayBuffer());
      } catch {
        failed.push(it.path);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, items.length) }, worker));

  if (failed.length) {
    zip.file(
      `${safe(school.name)}/내려받지_못한_사진.txt`,
      `아래 사진을 가져오지 못했습니다:\n${failed.join("\n")}\n`
    );
  }

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
  const filename = `${school.name}_방송사진.zip`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      // 한글 파일명은 RFC 5987 형식으로 (브라우저 호환)
      "Content-Disposition": `attachment; filename="photos.zip"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(buf.length),
    },
  });
}
