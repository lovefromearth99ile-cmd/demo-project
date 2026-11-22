# Aurora AI

Aurora is a bilingual AI chat workspace built with Next.js, with an optional OpenAI Realtime voice connection.

## Local chat demo mode (no API credits)

Set this in `.env.local`:

```env
AURORA_DEMO_MODE=true
```

The text chat then uses local, predefined sample replies only. It does not contact an AI model and does not use OpenAI API credits.

## Live Voice (paid Realtime API)

The Live Voice control uses WebRTC and the OpenAI Realtime API model `gpt-realtime-2.1-mini`. It requests a short-lived client secret on the server and never sends the permanent API key to the browser.

Important:
- Live Voice is paid API usage and will not work with a $0 API balance or an exhausted usage limit.
- Only start a session after the API account owner and a parent or guardian have approved API use and configured an appropriate spending limit.
- The browser will request microphone access only after the user clicks Live Voice and confirms the paid-session notice.
- End the session with the End voice button; this stops the microphone tracks and closes the WebRTC connection.
- Audio is sent to the Realtime API to generate the conversation. Do not speak passwords, financial details, or other sensitive personal information.

The selected Realtime model is the mini model to reduce cost compared with the larger Realtime model. Actual charges depend on usage; review the official [OpenAI API pricing](https://platform.openai.com/pricing) before enabling it.

## Live text chat (paid Responses API)

To use live text chat later, turn Demo Mode off with `AURORA_DEMO_MODE=false` and configure a valid `OPENAI_API_KEY` with approved API billing. API usage is billed separately from ChatGPT.

## Run locally

1. Install Node.js 20.9+.
2. Open a terminal in the `aurora-ai` folder.
3. Install dependencies: `npm.cmd install` in Windows PowerShell, or `npm install` elsewhere.
4. Create `.env.local` and set `AURORA_DEMO_MODE=true`.
5. Add `OPENAI_API_KEY` only when the account owner has approved API use; never commit `.env.local`.
6. Start with `npm.cmd run dev` in Windows PowerShell, or `npm run dev` elsewhere.
7. Visit http://localhost:3000.

## Features

- Responsive chat interface
- Bengali and English sample chat flow in Demo Mode
- Browser-local conversation history (this device only)
- Optional Realtime API speech-to-speech voice over WebRTC
- Server-side creation of short-lived Realtime client secrets
- Age-appropriate voice instructions

## Privacy and architecture

- Demo chat uses predefined local sample replies, not a live AI model.
- Live Voice sends microphone audio to the configured OpenAI Realtime API. Avoid sharing sensitive personal information.
- Chat history is stored only in the current browser; there is no cloud database or cross-device memory.
- The separate Adaption dataset and fine-tuning run are not connected to this application yet.
- This is a development project, not a public-ready product. Add authentication, robust server-side rate limiting, monitoring, and appropriate privacy review before public deployment.
