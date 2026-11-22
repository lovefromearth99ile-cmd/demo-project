import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const demoMode = process.env.AURORA_DEMO_MODE === "true";
  return NextResponse.json({
    status: "ok",
    mode: demoMode ? "demo" : process.env.OPENAI_API_KEY ? "live" : "setup",
    demoMode,
    configured: Boolean(process.env.OPENAI_API_KEY)
  });
}