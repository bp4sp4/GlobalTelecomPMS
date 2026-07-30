import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { supabaseAdmin, ensurePhotoBucket, PHOTO_BUCKET } from "@/lib/supabase";

/**
 * POST /api/upload/sign
 * 브라우저가 Supabase Storage 로 "직접" 올릴 수 있는 서명 URL을 발급한다.
 *
 * 파일을 서버(Vercel)로 보내면 요청 본문 4.5MB 제한에 걸려
 * "Request Entity Too Large" 가 떨어진다(휴대폰 사진 몇 장이면 초과).
 * 그래서 경로 계산·권한 확인만 서버가 하고, 전송은 브라우저가 맡는다.
 */

/** Supabase Storage 키는 비ASCII를 허용하지 않는다 */
const CATEGORY_DIR: Record<string, string> = {
  장비사진: "equipment",
  개선사진: "improvement",
  교육사진: "training",
  집중진단: "focus",
};
const ROOM_DIR: Record<string, string> = {
  방송실: "broadcast",
  "강당/체육관": "gym",
  시청각실: "av",
  특별실: "special",
  다목적실: "multi",
  소강당: "hall",
  기타실: "etc",
  교실: "classroom",
};

function asciiDir(v: string, map?: Record<string, string>) {
  const mapped = map?.[v];
  if (mapped) return mapped;
  const ascii = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase();
  const hash = createHash("sha1").update(v).digest("hex").slice(0, 8);
  return ascii ? `${ascii}-${hash}` : hash;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const school = String(body?.school ?? "");
  const category = String(body?.category ?? "etc");
  const room = String(body?.room ?? "etc");
  const names: string[] = Array.isArray(body?.names) ? body.names.map(String) : [];

  if (!school || !names.length) {
    return NextResponse.json({ message: "school/names 필요" }, { status: 400 });
  }
  if (names.length > 50) {
    return NextResponse.json({ message: "한 번에 최대 50장까지 올릴 수 있습니다." }, { status: 400 });
  }

  await ensurePhotoBucket();
  const sb = supabaseAdmin();

  const dir = `${asciiDir(school)}/${asciiDir(category, CATEGORY_DIR)}/${asciiDir(room, ROOM_DIR)}`;
  const stamp = Date.now();

  const files: { name: string; path: string; token: string; url: string }[] = [];
  for (let i = 0; i < names.length; i++) {
    const rawExt = (names[i].split(".").pop() ?? "").toLowerCase();
    const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "jpg";
    const path = `${dir}/${stamp}_${i}.${ext}`;

    const { data, error } = await sb.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      return NextResponse.json({ message: error?.message ?? "서명 발급 실패" }, { status: 500 });
    }
    files.push({
      name: names[i],
      path,
      token: data.token,
      url: sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl,
    });
  }

  logActivity({
    session,
    req,
    action: "UPLOAD",
    entity: "PHOTO",
    target: `${school} · ${category} · ${room}`,
    detail: `사진 ${files.length}장 업로드`,
  });

  return NextResponse.json({ ok: true, bucket: PHOTO_BUCKET, files });
}
