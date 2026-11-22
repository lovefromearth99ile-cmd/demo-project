import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    configured: Boolean(process.env.OPENAI_API_KEY)
  });
}