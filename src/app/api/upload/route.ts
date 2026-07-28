import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { supabaseAdmin, ensurePhotoBucket, PHOTO_BUCKET } from "@/lib/supabase";

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

  const safe = (v: string) => v.replace(/[^\w가-힣.-]/g, "_");
  const stamp = Date.now();

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = f.name.split(".").pop() ?? "jpg";
    const path = `${safe(school)}/${safe(category)}/${safe(room)}/${stamp}_${i}.${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, buf, {
      contentType: f.type || "image/jpeg",
      upsert: true,
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
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
