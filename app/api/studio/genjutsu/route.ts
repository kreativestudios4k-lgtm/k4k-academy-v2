import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const MODEL = "higgsfield/genjutsu/object-swap/v1.0";
function validUrl(value: unknown): value is string {
 if (typeof value !== "string") return false;
 try { const url = new URL(value); return url.protocol === "https:" && !!url.hostname && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1)/i.test(url.hostname); } catch { return false; }
}
export async function POST(req: NextRequest) {
 // Preview route deliberately refuses paid submissions until auth, credit accounting,
 // and API credentials are configured and verified.
 if (process.env.K4K_GENJUTSU_ENABLED !== "true")
  return NextResponse.json({error:"Generation is not enabled in this private preview."},{status:503});
 const auth = req.headers.get("authorization");
 if (!auth?.startsWith("Bearer "))
  return NextResponse.json({error:"Authentication required."},{status:401});
 // Fail closed: no client-controlled generation or credit charges until the
 // server validates the authenticated Supabase user and reserves credits atomically.
 return NextResponse.json({error:"Awaiting authenticated credit reservation and API activation.",model:MODEL},{status:501});
}
