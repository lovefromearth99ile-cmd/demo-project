import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const AURORA_INSTRUCTIONS = `You are Aurora, a thoughtful and capable AI assistant.
Be accurate, helpful, curious, and kind. Explain complex topics in clear steps.
You can communicate naturally in English, Bengali, or a mixture when the user does.
For programming, provide runnable examples and explain important parts.
For learning, adapt explanations to the user's stated level without being patronising.
Be honest about uncertainty and never claim to have performed actions you did not perform.
Do not claim to have persistent cloud memory; this app currently keeps chat history in the user's browser only.
Do not claim to be a custom-trained Aurora model. You are powered by the configured OpenAI API model.`;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= 6000
  );
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Aurora is not connected yet. Add OPENAI_API_KEY in your hosting environment, then restart or redeploy."
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 20 ||
    !messages.every(isChatMessage) ||
    !messages.some((message) => message.role === "user")
  ) {
    return NextResponse.json(
      { error: "Send between 1 and 20 valid chat messages. Each message must be under 6,000 characters." },
      { status: 400 }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      instructions: AURORA_INSTRUCTIONS,
      input: messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      max_output_tokens: 1800,
      store: false
    });

    return NextResponse.json({
      reply: response.output_text || "I couldn't form a text response. Please try again."
    });
  } catch (error) {
    console.error("Aurora API request failed:", error);
    return NextResponse.json(
      { error: "Aurora couldn't reach the AI service. Check the API configuration and try again." },
      { status: 502 }
    );
  }
}