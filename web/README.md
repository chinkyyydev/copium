# Copium Web — talk to her

The MVP chat page: Copium holds a live conversation in-voice, switches between
her 15 canonical expressions as she talks, and (optionally) speaks her replies
out loud. Shares `SYSTEM_PROMPT` and the token-policy guard with
[`poster/`](../poster) — she is one character everywhere, and she can't name
or shill a token here either.

## Run it

```bash
cd web
npm install
copy .env.example .env      # then fill in ANTHROPIC_API_KEY at minimum
npm run dev                 # http://localhost:3000
```

Works immediately with just `ANTHROPIC_API_KEY` — text chat with the
placeholder avatar. Add art and voice as they land:

| Layer | How to enable |
|-------|---------------|
| **Face** | Drop `expr-<name>.png` files into `public/expressions/` ([naming](public/expressions/README.md)). Auto-detected per expression. |
| **Voice** | Create her voice with ElevenLabs Voice Design (casting spec in [doc 08 §3](../brand/08-production-prompts.md)), set `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` in `.env`. The voice toggle on the page lights up. |

## How it works

```
browser (public/)                    server (src/server.ts)
┌──────────────────────┐            ┌────────────────────────────┐
│ chat UI              │ /api/chat  │ Claude + CHAT_SYSTEM_PROMPT│
│ expression swapper   │──────────▶│  → {reply, expression}     │
│ audio player + flap  │ /api/tts   │  → token-policy guard      │
└──────────────────────┘◀──────────│ ElevenLabs proxy           │
                                    └────────────────────────────┘
```

- The model returns `{"reply", "expression"}`; the expression id (one of the
  15 from [doc 11](../brand/11-expression-pack.md)) drives her face.
- Every reply passes `violatesTokenPolicy()` from
  [`poster/src/contentGuard.ts`](../poster/src/contentGuard.ts); a rejected
  reply regenerates once, then falls back to an in-voice error line.
- API keys never reach the browser.

## Upgrade path → Live2D

When the rigged model lands (spec: [doc 08 §2](../brand/08-production-prompts.md)),
only the avatar layer in `public/` changes: replace the `<img>` swapper with a
`pixi-live2d-display` canvas, map the same 15 expression ids to `.exp3` files,
and feed the same `/api/tts` audio into its lipsync. The server, persona, and
chat flow don't change at all.
