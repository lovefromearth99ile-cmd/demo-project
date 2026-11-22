# Aurora AI

Aurora is a bilingual AI chat workspace built with Next.js and the OpenAI Responses API.

## Current MVP features

- Responsive chat interface
- English and Bengali conversation support through the configured model
- Local chat-history storage in the current browser
- Server-side OpenAI API route (the API key is never sent to the browser)
- Health check that reports whether the API key is configured

## Requirements

- Node.js 20.9+
- An OpenAI API key from the OpenAI API platform (API usage is billed separately from a ChatGPT plan)

## Run locally

1. Open a terminal in the `aurora-ai` folder.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`.
4. Add your key to `OPENAI_API_KEY` in `.env.local`.
5. Optional: set `OPENAI_MODEL=gpt-6-luna`. You can change this server-side later.
6. Start the app: `npm run dev`
7. Visit http://localhost:3000

Never commit `.env.local` or share your API key in chat, screenshots, or source code.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. Set the project Root Directory to `aurora-ai`.
3. Add `OPENAI_API_KEY` as a server-side Environment Variable.
4. Optionally add `OPENAI_MODEL` (default: `gpt-6-luna`).
5. Deploy.

The app will show **Setup required** until the server environment contains a valid API key.

## Important architecture note

This MVP uses an OpenAI-hosted model at inference time. The separate Adaption fine-tuning run and dataset are not automatically connected to this app yet. Browser chat history is stored locally on the device; there is no cloud database or cross-device memory in this first version. Add authentication, abuse protection, and a database before sharing the app widely.
