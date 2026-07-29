import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { supabaseAdmin, ensurePhotoBucket, PHOTO_BUCKET } from "@/lib/supabase";

/**
 * Supabase Storage 는 객체 키에 한글 같은 비ASCII 문자를 허용하지 않는다
 * ("Invalid key" 오류). 그래서 폴더명을 ASCII 로 바꿔 저장한다.
 * 화면에 보이는 구분/실 이름은 보고서 payload 에 그대로 남으므로 영향 없다.
 */
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

/** 매핑에 없는 이름은 ASCII 부분 + 짧은 해시로 (충돌 없이 안정적인 폴더명) */
function asciiDir(v: string, map?: Record<string, string>) {
  const mapped = map?.[v];
  if (mapped) return mapped;
  const ascii = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase();
  const hash = createHash("sha1").update(v).digest("hex").slice(0, 8);
  return ascii ? `${ascii}-${hash}` : hash;
}

// POST multipart: files[], school, category, room
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  const school = String(form.get("school") ?? "unknown");
  const category = String(form.get("category") ?? "etc");
  const room = String(form.get("room") ?? "etc");

  if (!files.length) return NextResponse.json({ message: "파일 없음" }, { status: 400 });

  await ensurePhotoBucket();
  const sb = supabaseAdmin();
  const urls: { url: string; name: string }[] = [];

  const dir = `${asciiDir(school)}/${asciiDir(category, CATEGORY_DIR)}/${asciiDir(room, ROOM_DIR)}`;
  const stamp = Date.now();

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    // 확장자도 ASCII 로 (한글 파일명에서 넘어올 수 있다)
    const rawExt = (f.name.split(".").pop() ?? "").toLowerCase();
    const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "jpg";
    const path = `${dir}/${stamp}_${i}.${ext}`;

    const buf = Buffer.from(await f.arrayBuffer());
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, buf, {
      contentType: f.type || "image/jpeg",
      upsert: true,
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    // name 은 화면 표시용 원본 파일명 (경로와 무관)
    urls.push({ url: data.publicUrl, name: f.name });
  }

  logActivity({
    session,
    req,
    action: "UPLOAD",
    entity: "PHOTO",
    target: `${school} · ${category} · ${room}`,
    detail: `사진 ${urls.length}장 업로드`,
  });

  return NextResponse.json({ ok: true, files: urls });
}

export const config = { api: { bodyParser: false } };
