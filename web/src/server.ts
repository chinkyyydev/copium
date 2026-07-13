/**
 * Copium web chat — MVP server.
 *
 * POST /api/chat  { messages: [{role, content}...] } -> { reply, expression }
 * POST /api/tts   { text } -> audio/mpeg (ElevenLabs; 503 when not configured)
 * GET  /api/health -> { claude, tts, greeting }
 *
 * Keys live server-side only. The frontend is static files in public/.
 * Upgrade path: when the Live2D rig lands, only the frontend avatar layer
 * changes — these endpoints stay as they are.
 */
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { violatesTokenPolicy } from '../../poster/src/contentGuard.js';
import {
  CHAT_SYSTEM_PROMPT,
  FALLBACK_REPLY,
  GREETING,
  isExpression,
  type Expression,
} from './chatPersona.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3000);
const MODEL = process.env.COPIUM_CHAT_MODEL ?? 'claude-sonnet-5';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID ?? '';

const hasClaude = Boolean(ANTHROPIC_KEY);
const hasTts = Boolean(ELEVEN_KEY && ELEVEN_VOICE);

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- chat ----------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Keep the last N turns; cap each message so nobody smuggles in a novel. */
function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

/** Pull {reply, expression} out of the model output, defensively. */
function parseReply(text: string): { reply: string; expression: Expression } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.reply !== 'string' || !obj.reply.trim()) return null;
    const expression: Expression =
      typeof obj.expression === 'string' && isExpression(obj.expression)
        ? obj.expression
        : 'smug';
    return { reply: obj.reply.trim().slice(0, 1000), expression };
  } catch {
    return null;
  }
}

app.post('/api/chat', async (req, res) => {
  if (!hasClaude) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }
  const history = sanitizeHistory(req.body?.messages);
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    res.status(400).json({ error: 'messages must end with a user message' });
    return;
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  try {
    // Two attempts: regenerate once if the token-policy guard trips.
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: CHAT_SYSTEM_PROMPT,
        messages: history,
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const parsed = parseReply(text) ?? { reply: text.trim().slice(0, 1000), expression: 'smug' as Expression };
      const violation = violatesTokenPolicy(parsed.reply);
      if (violation) {
        console.warn(`[guard] chat reply rejected — ${violation}`);
        continue;
      }
      res.json(parsed);
      return;
    }
    res.json(FALLBACK_REPLY);
  } catch (err) {
    console.error('[chat] generation failed:', err);
    res.json(FALLBACK_REPLY);
  }
});

// ---------- voice ----------

app.post('/api/tts', async (req, res) => {
  if (!hasTts) {
    res.status(503).json({ error: 'ElevenLabs not configured' });
    return;
  }
  const text = typeof req.body?.text === 'string' ? req.body.text.slice(0, 1000) : '';
  if (!text.trim()) {
    res.status(400).json({ error: 'text required' });
    return;
  }
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVEN_VOICE)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVEN_KEY,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5', // low latency — right tradeoff for live chat
          voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35 },
        }),
      },
    );
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error(`[tts] ElevenLabs ${r.status}: ${detail.slice(0, 300)}`);
      res.status(502).json({ error: 'tts failed' });
      return;
    }
    res.setHeader('content-type', 'audio/mpeg');
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error('[tts] request failed:', err);
    res.status(502).json({ error: 'tts failed' });
  }
});

// ---------- meta ----------

app.get('/api/health', (_req, res) => {
  res.json({ claude: hasClaude, tts: hasTts, model: MODEL, greeting: GREETING });
});

app.listen(PORT, () => {
  console.log(`copium-web listening on http://localhost:${PORT}`);
  console.log(`  claude: ${hasClaude ? MODEL : 'NOT CONFIGURED (chat disabled)'}`);
  console.log(`  voice:  ${hasTts ? 'elevenlabs ready' : 'not configured (text-only)'}`);
});
