import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in before uploading." }, { status: 401 });
  const supabase = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const input = body as { contentType?: unknown; filename?: unknown };
  if (!["image/jpeg","image/png","image/webp"].includes(String(input.contentType))) {
    return NextResponse.json({ error: "Only JPG, PNG and WebP images are supported." }, { status: 400 });
  }
  const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from("studio-references").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Unable to prepare upload." }, { status: 500 });
  return NextResponse.json({ path, token: data.token, maxBytes: 10485760 });
}
