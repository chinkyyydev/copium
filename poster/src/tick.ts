import { generate } from './generate.js';
import { createDraft, type Draft } from './queue.js';
import { activeSlot, categoryForSlot } from './schedule.js';

/**
 * One posting tick: pick the current time slot, generate an on-theme draft, and
 * queue it. Shared by the CLI `run` command and the bot's internal scheduler.
 * The caller is responsible for surfacing it for review (webhook or bot card).
 */
export async function runTick(): Promise<Draft> {
  const slot = activeSlot();
  const categoryId = categoryForSlot(slot);
  const post = await generate({ categoryId });
  const draft = createDraft({
    text: post.text,
    category: post.category.id,
    source: post.source,
  });
  console.log(`[tick] ${slot.label} → ${draft.category} [${draft.id}] (${post.source}) ${post.text}`);
  return draft;
}
