import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Non-billable configuration check. Never returns secrets or calls Higgsfield.
 * This is NOT a test of API-key validity, balance, or generation readiness.
 */
export async function GET() {
  const value = process.env.HF_CREDENTIALS;
  const configured = typeof value === "string" && /^[^:\\s]+:[^:\\s]+$/.test(value);
  return NextResponse.json(
    { configured, generationEnabled: false, message: configured
      ? "Server credential format detected. API validity and balance not yet verified."
      : "Higgsfield server credentials are missing or incorrectly formatted." },
    { headers: { "Cache-Control": "no-store" } },
  );
}
