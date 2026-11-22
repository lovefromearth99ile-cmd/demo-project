import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VOICE_INSTRUCTIONS = `You are Aurora, a helpful, age-appropriate voice assistant.
Speak naturally and clearly. Reply in the same language the user speaks, including Bengali or English.
Keep answers concise in voice conversations, and explain complex ideas step by step when asked.
Be honest about uncertainty. Do not claim to be a different model or to have persistent memory.
Keep all content suitable for a teen audience. Do not sexualize minors or provide erotic content.
Do not describe or depict suicide or self-harm. Do not give actionable instructions for real-world violence or dangerous activities.
If a user may be in immediate danger, encourage them to contact a trusted adult or local emergency services.`;

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "realtime",
          model: "gpt-realtime-2.1-mini",
          instructions: VOICE_INSTRUCTIONS,
          audio: {
            input: {
              noise_reduction: { type: "near_field" },
              turn_detection: { type: "server_vad" }
            },
            output: { voice: "marin" }
          }
        }
      }),
      cache: "no-store"
    });

    const raw = await response.text();
    let data: { value?: string; expires_at?: number; error?: { message?: string } } = {};
    try {
      data = JSON.parse(raw);
    } catch {
      // Keep the response generic if the upstream body is not JSON.
    }

    if (!response.ok || typeof data.value !== "string") {
      console.error("Realtime client secret request failed:", response.status, data.error?.message || raw.slice(0, 500));
      const message =
        response.status === 401 || response.status === 403
          ? "OpenAI rejected this API key or its Realtime permissions. Check the key's project and permissions."
          : response.status === 429
            ? "Realtime API usage is unavailable. Check the API credit balance and usage limits."
            : "OpenAI could not create a Live Voice session. Check API access and try again.";
      return NextResponse.json({ error: message }, { status: response.status || 502 });
    }

    return NextResponse.json(
      { value: data.value, expires_at: data.expires_at },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Realtime session setup failed:", error);
    return NextResponse.json(
      { error: "Could not reach the Realtime API. Check your connection and try again." },
      { status: 502 }
    );
  }
}
