"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * 사진 업로드 (브라우저 → Supabase Storage 직접 전송).
 *
 * 서버를 거치면 Vercel 요청 본문 4.5MB 제한에 걸리므로,
 * 서버에서는 서명 URL만 받고 파일 전송은 브라우저가 직접 한다.
 * 큰 사진은 업로드 전에 줄여 용량과 시간을 아낀다.
 */

const MAX_EDGE = 2000; // 긴 변 최대 픽셀
const QUALITY = 0.82;

let client: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return client;
}

/** 사진이 크면 긴 변 2000px 로 줄인다 (실패하면 원본 그대로) */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", QUALITY)
    );
    // 줄인 게 더 크면 원본을 쓴다
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export type UploadedPhoto = { url: string; name: string };

export async function uploadPhotos({
  school,
  category,
  room,
  files,
  onProgress,
}: {
  school: string;
  category: string;
  room: string;
  files: File[];
  /** (완료 수, 전체 수) */
  onProgress?: (done: number, total: number) => void;
}): Promise<UploadedPhoto[]> {
  if (!files.length) return [];

  // 1) 서버에서 저장 경로 + 서명 토큰 받기
  const res = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      school,
      category,
      room,
      names: files.map((f) => f.name),
    }),
  });

  // 서버가 JSON 이 아닌 응답을 줄 수도 있다(프록시 오류 등)
  const text = await res.text();
  let data: {
    bucket?: string;
    files?: { name: string; path: string; token: string; url: string }[];
    message?: string;
  };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `업로드 준비 실패 (${res.status}) ${text.slice(0, 80) || "응답을 해석할 수 없습니다"}`
    );
  }
  if (!res.ok || !data.files) throw new Error(data.message ?? "업로드 준비 실패");

  // 2) 브라우저에서 스토리지로 직접 올리기 (3개씩)
  const bucket = data.bucket ?? "broadcast-photos";
  const slots = data.files;
  const out: UploadedPhoto[] = [];
  let done = 0;
  let queue = 0;

  async function worker() {
    for (;;) {
      const i = queue++;
      if (i >= files.length) return;
      const slot = slots[i];
      const body = await shrink(files[i]);
      const { error } = await sb()
        .storage.from(bucket)
        .uploadToSignedUrl(slot.path, slot.token, body, {
          contentType: body.type || "image/jpeg",
        });
      if (error) throw new Error(`${files[i].name}: ${error.message}`);
      out[i] = { url: slot.url, name: slot.name };
      onProgress?.(++done, files.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
  return out.filter(Boolean);
}
