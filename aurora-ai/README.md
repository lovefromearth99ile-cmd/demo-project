# Aurora AI

Aurora is a bilingual AI chat workspace built with Next.js and the OpenAI Responses API.

## Current MVP features

- Responsive chat interface
- English and Bengali conversation support
- Browser-local conversation history (this device only)
- Server-side OpenAI API route; the API key is never sent to the browser
- Input and output moderation checks for selected high-risk categories
- Age-appropriate assistant instructions
- API health check

## Requirements

- Node.js 20.9+
- OpenAI API key, with parent/guardian permission and management of billing

API usage is billed separately from a ChatGPT plan. Agree on a budget with a parent or guardian before enabling API access.

## Run locally

1. Open a terminal in the `aurora-ai` folder.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`.
4. Have a parent or guardian help configure `OPENAI_API_KEY` and review billing.
5. The default model is `gpt-6.2-sol`; change `OPENAI_MODEL` only when needed.
6. Start the app: `npm run dev`
7. Visit http://localhost:3000

Never commit `.env.local` or share an API key in chat, screenshots, or source code.

## Deploy

For Vercel, import this repository and set the project Root Directory to `aurora-ai`. Add `OPENAI_API_KEY` only as a server-side Environment Variable. Do not deploy with a real key until a parent or guardian has reviewed permission and billing.

Before making the app public, add authentication, robust server-side rate limiting, and suitable privacy, safety, and monitoring controls.

## Privacy and architecture

- Messages are sent to the configured OpenAI API to generate replies. Avoid entering passwords, financial details, private identifiers, or other sensitive information.
- Chat history is saved in the current browser only; there is no cloud database or cross-device memory.
- The separate Adaption dataset and fine-tuning run are not connected to this app yet. This MVP uses an OpenAI-hosted model at inference time.
- Moderation and assistant instructions are protective layers, not a guarantee of safety.
- This is a development starter, not a public-ready product.
