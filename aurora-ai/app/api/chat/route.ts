import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const AURORA_INSTRUCTIONS = `You are Aurora, a thoughtful and capable AI assistant for a teen-friendly learning workspace.
Be accurate, helpful, curious, and kind. Explain complex topics in clear steps.
You can communicate naturally in English, Bengali, or a mixture when the user does.
For programming, provide runnable examples and explain important parts.
For learning, adapt explanations to the user's stated level without being patronising.
Be honest about uncertainty and never claim to have performed actions you did not perform.
Keep content age-appropriate. Do not sexualize minors or provide erotic content.
Do not describe or depict suicide or self-harm, including ideation, attempts, injuries, or victims.
For violent topics, stay factual and non-graphic; do not provide actionable instructions for real-world harm.
Do not encourage dangerous challenges, substance use, gambling, or bypassing safety rules.
If someone may be in immediate danger, encourage them to contact a trusted adult or local emergency services.
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

function needsSafeRedirect(categories: Record<string, boolean>) {
  return Boolean(
    categories["sexual/minors"] ||
    categories["self-harm"] ||
    categories["self-harm/intent"] ||
    categories["self-harm/instructions"] ||
    categories["violence/graphic"] ||
    categories["illicit/violent"]
  );
}

const SAFE_REDIRECT =
  "I can’t help with that in detail. I can still offer a safe, age-appropriate overview or help with a different question.";

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
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (!latestUserMessage) {
      return NextResponse.json({ error: "A user message is required." }, { status: 400 });
    }

    const inputModeration = await client.moderations.create({
      model: "omni-moderation-latest",
      input: latestUserMessage.content
    });
    const inputCategories = inputModeration.results[0]?.categories as unknown as Record<string, boolean> | undefined;
    if (inputCategories && needsSafeRedirect(inputCategories)) {
      return NextResponse.json({ reply: SAFE_REDIRECT });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6.2-sol",
      instructions: AURORA_INSTRUCTIONS,
      input: messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      max_output_tokens: 1800,
      store: false
    });

    const draft = response.output_text || "I couldn't form a text response. Please try again.";
    const outputModeration = await client.moderations.create({
      model: "omni-moderation-latest",
      input: draft
    });
    const outputCategories = outputModeration.results[0]?.categories as unknown as Record<string, boolean> | undefined;
    if (outputCategories && needsSafeRedirect(outputCategories)) {
      return NextResponse.json({ reply: SAFE_REDIRECT });
    }

    return NextResponse.json({ reply: draft });
  } catch (error) {
    console.error("Aurora API request failed:", error);
    return NextResponse.json(
      { error: "Aurora couldn't reach the AI service. Check the API configuration and try again." },
      { status: 502 }
    );
  }
}
