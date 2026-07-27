import "server-only";
import { createClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "broadcast-photos";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let ensured = false;
export async function ensurePhotoBucket() {
  if (ensured) return;
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(PHOTO_BUCKET);
  if (!data) {
    await sb.storage.createBucket(PHOTO_BUCKET, { public: true });
  }
  ensured = true;
}
