import { config, hasDiscord } from './config.js';
import type { Draft } from './queue.js';

/**
 * The human review gate. Posts a draft to a Discord channel via webhook so a
 * human can eyeball it before it goes live. Approval itself happens out-of-band
 * via the CLI (`npm run approve <id>`) — this is just the notification.
 *
 * Brand rule (doc 03/04): reactive/breaking-news posts must always pass through
 * a human. Routine slots can be auto-approved later once you trust the pipeline.
 */
export async function notifyForReview(draft: Draft): Promise<void> {
  if (!hasDiscord()) return;

  const content = [
    '**🧿 new copium draft — awaiting dose approval**',
    `> ${draft.text.replace(/\n/g, '\n> ')}`,
    '',
    `category: \`${draft.category}\`  ·  source: \`${draft.source}\`  ·  ${draft.text.length}/280`,
    `approve: \`npm run approve ${draft.id}\`   reject: \`npm run reject ${draft.id}\``,
  ].join('\n');

  try {
    const res = await fetch(config.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, username: 'Copium Clinic', allowed_mentions: { parse: [] } }),
    });
    if (!res.ok) {
      console.warn(`  ⚠ Discord webhook returned ${res.status} — draft still queued locally.`);
    }
  } catch (err) {
    console.warn(`  ⚠ Discord notification failed (${(err as Error).message}) — draft still queued locally.`);
  }
}
