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

/**
 * A small, rule-based local demo. It deliberately does not call an AI service
 * and must not be presented as a live or fine-tuned language model.
 */
function getDemoReply(message: string): string {
  const text = message.toLowerCase();

  if (/(suicid|self.?harm|hurt myself|kill myself|sexual.*minor|child.*sexual)/i.test(text)) {
    return "I can’t help with harmful or unsafe content. If this is about something happening to you or someone nearby, please reach out to a trusted person or local emergency service. I can stay with a safe, supportive conversation.";
  }

  if (/\b(hello|hi|hey|introduce|who are you)\b/.test(text) || /হ্যালো|নমস্কার|কে তুমি/.test(text)) {
    return "নমস্কার! আমি Aurora — তোমার learning ও coding workspace-এর demo assistant। আমি এখন Demo Mode-এ আছি, তাই এই উত্তরটি আগে থেকে তৈরি sample response; live AI model থেকে তৈরি নয়।\n\nআমি এখানে তোমাকে interface পরীক্ষা করতে, Bengali/English chat flow দেখতে এবং sample learning prompts চেষ্টা করতে সাহায্য করতে পারি।";
  }

  if (/\b(math|mathematics|গণিত|যোগ|addition)\b/.test(text)) {
    return "চলো একটি ছোট Mathematics demo দেখি।\n\nউদাহরণ: ২ + ৩ = ৫।\n\nএখানে ২ ও ৩ হলো যোগের সংখ্যা, আর ৫ হলো যোগফল। তুমি চাইলে পরের ধাপে Algebra, Geometry বা Calculus-এর জন্য sample prompt পরীক্ষা করতে পারো।\n\nমনে রেখো: এটি rule-based Demo Mode, তাই এটি live AI tutor নয়।";
  }

  if (/\b(code|coding|program|programming|javascript|python|c language)\b/.test(text)) {
    return "চলো Coding demo দেখি।\n\nC ভাষায় একটি ছোট Hello World program:\n\n#include <stdio.h>\nint main(void) {\n    printf(\"Hello, Aurora!\\n\");\n    return 0;\n}\n\nএই sample-টি শুধু interface পরীক্ষা করার জন্য। Demo Mode-এ আমি তোমার code বুঝে নিজে থেকে নতুন সমাধান তৈরি করতে পারি না।";
  }

  if (/বাংলা|bengali|translate|অনুবাদ/.test(text)) {
    return "অবশ্যই — Aurora interface Bengali ও English message পাঠাতে পারে।\n\nDemo Mode-এ আমি কিছু নির্দিষ্ট sample reply দিতে পারি, কিন্তু পূর্ণ অনুবাদ বা স্বাভাবিক multi-turn AI conversation এখনও চালু নয়।";
  }

  return `তোমার message Aurora Demo-তে পৌঁছেছে:\n“${message.slice(0, 260)}${message.length > 260 ? "…" : ""}”\n\nDemo Mode সফলভাবে চলছে। এটি একটি local, rule-based sample; কোনো live AI model ব্যবহার করছে না এবং OpenAI API credit খরচ করছে না।\n\nTry these sample prompts:\n• “Hello Aurora, introduce yourself in Bengali”\n• “Teach me a mathematics example”\n• “Show me a C programming example”`;
}

export async function POST(request: Request) {
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

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    return NextResponse.json({ error: "A user message is required." }, { status: 400 });
  }

  // Demo mode is intentionally local and does not call OpenAI or use API credits.
  if (process.env.AURORA_DEMO_MODE === "true") {
    return NextResponse.json({
      reply: getDemoReply(latestUserMessage.content),
      demoMode: true
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Aurora is not connected yet. Add OPENAI_API_KEY in your hosting environment, then restart or redeploy."
      },
      { status: 503 }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
