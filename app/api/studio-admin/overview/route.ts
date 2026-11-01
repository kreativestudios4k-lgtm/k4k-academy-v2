import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at) return NextResponse.json({ error: "Verified account required." }, { status: 401, headers });
  const admins = (process.env.K4K_STUDIO_ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(data.user.email.toLowerCase())) return NextResponse.json({ error: "Administrator access required." }, { status: 403, headers });
  const { data: customerData, error: customerError } = await supabase.rpc("k4k_studio_admin_customers");
  return NextResponse.json({
    customerData: customerError ? null : customerData,
    customerDataError: customerError ? "Customer data unavailable. Check administrator permissions and database configuration." : null,
    administrator: { email: data.user.email },
    environment: process.env.VERCEL_ENV || "development",
    providerConfigured: Boolean(process.env.HF_CREDENTIALS),
    storageConfigured: Boolean(url && key),
    pilotEnabled: process.env.K4K_ENABLE_TEST_GENERATION === "true",
    allowlistedTesterCount: (process.env.K4K_GENERATION_TEST_USERS || "").split(",").filter(x => x.trim()).length,
    modules: [
      { name: "Customers", status: customerError ? "Connection unavailable" : "Connected — read only", detail: customerError ? "Could not read Academy customer records." : "Existing Academy students and memberships are shown securely." },
      { name: "AI Generations", status: "Not connected", detail: "Generation history and job logs are not yet persisted." },
      { name: "API Usage", status: "Configuration only", detail: "Provider credentials and pilot state can be checked; spend requires metering." },
      { name: "Credits", status: "Not connected", detail: "No live credit ledger is connected to this preview." },
      { name: "Payments", status: "Not connected", detail: "Stripe data is intentionally excluded from this pilot dashboard." },
      { name: "Errors", status: "Not connected", detail: "Centralised error logging has not been enabled." }
    ]
  }, { headers });
}
