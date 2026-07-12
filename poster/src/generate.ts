import Anthropic from '@anthropic-ai/sdk';
import { config, hasAnthropic } from './config.js';
import { SYSTEM_PROMPT, pickCategory, categoryById, type Category } from './persona.js';
import { fewShotBlock, stubPost } from './fewshot.js';
import { recentTexts, isDuplicate } from './history.js';
import { containsUrl } from './urls.js';
import { violatesTokenPolicy } from './contentGuard.js';

export interface GenerateOptions {
  categoryId?: string;
  /** For reactive posts: a short description of the event to riff on. */
  reactiveContext?: string;
  /** Force the offline canned-post path (no API key required). */
  stub?: boolean;
}

export interface GeneratedPost {
  text: string;
  category: Category;
  source: 'generated' | 'stub';
}

/** Strip stray wrapping quotes / whitespace the model sometimes adds. */
function clean(text: string): string {
  let t = text.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('“') && t.endsWith('”'))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

function buildUserPrompt(category: Category, reactiveContext?: string): string {
  const examples = fewShotBlock(category.id);
  const recent = recentTexts(30);
  const parts: string[] = [];

  parts.push(`Write one ${category.label} post.`);
  parts.push(category.hint);
  if (reactiveContext) {
    parts.push(`\nReact to this current event (keep it generic — no real names/tickers): ${reactiveContext}`);
  }
  if (examples) {
    parts.push(`\nExamples of the right voice for this category:\n${examples}`);
  }
  if (recent.length) {
    parts.push(
      `\nDo NOT repeat or closely rephrase any of these recent posts:\n${recent.map((r) => `- ${r}`).join('\n')}`,
    );
  }
  parts.push('\nReturn only the post text.');
  return parts.join('\n');
}

export async function generate(opts: GenerateOptions = {}): Promise<GeneratedPost> {
  const category = opts.categoryId ? categoryById(opts.categoryId) ?? pickCategory() : pickCategory();

  if (opts.stub || !hasAnthropic()) {
    return { text: stubPost(category.id), category, source: 'stub' };
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  // Up to 3 attempts to avoid producing a near-duplicate of a past post.
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(category, opts.reactiveContext) }],
    });

    const text = clean(
      response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join(''),
    );

    if (text.length > 280) continue; // too long, retry
    if (isDuplicate(text)) continue; // already posted this, retry
    if (containsUrl(text)) continue; // URL would cost 13x on X, retry
    const violation = violatesTokenPolicy(text);
    if (violation) {
      console.warn(`[guard] regenerating — ${violation}: ${text}`);
      continue; // she never names/shills tokens; retry
    }
    return { text, category, source: 'generated' };
  }

  // Fall back to a canned post rather than posting nothing.
  return { text: stubPost(category.id), category, source: 'stub' };
}
