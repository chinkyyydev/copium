import { generate } from './generate.js';
import { createDraft, list, move, find } from './queue.js';
import { notifyForReview } from './review.js';
import { publishToX } from './publish.js';
import { recordPublished } from './history.js';
import { runTick } from './tick.js';
import { hasAnthropic, hasDiscord, hasX, config } from './config.js';

/** Minimal flag parser: --key value  and  --flag (boolean). */
function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function cmdGenerate(flags: Record<string, string | boolean>) {
  const count = Number(flags.count ?? 1);
  const stub = Boolean(flags.stub);
  const categoryId = typeof flags.category === 'string' ? flags.category : undefined;
  const reactiveContext = typeof flags.reactive === 'string' ? flags.reactive : undefined;

  for (let i = 0; i < count; i++) {
    const post = await generate({ categoryId, reactiveContext, stub });
    const draft = createDraft({
      text: post.text,
      category: post.category.id,
      source: post.source,
    });
    console.log(`\n[${draft.id}] (${draft.category}, ${post.source}, ${post.text.length}/280)`);
    console.log(`  ${post.text}`);
    await notifyForReview(draft);
  }
  console.log(`\nQueued ${count} draft(s) to pending. Review, then: npm run approve <id>`);
}

function cmdList() {
  for (const status of ['pending', 'approved', 'published', 'rejected'] as const) {
    const drafts = list(status);
    if (drafts.length === 0) continue;
    console.log(`\n── ${status.toUpperCase()} (${drafts.length}) ──`);
    for (const d of drafts) {
      const tail = d.tweetId ? `  →  x.com/i/status/${d.tweetId}` : '';
      console.log(`  [${d.id}] (${d.category}) ${d.text}${tail}`);
    }
  }
  console.log('');
}

function cmdApprove(positional: string[]) {
  const id = positional[0];
  if (!id) return console.error('Usage: npm run approve <id>');
  const found = find(id);
  if (!found) return console.error(`No draft with id ${id}`);
  move(id, 'approved');
  console.log(`✓ Approved ${id}. Publish with: npm run publish`);
}

function cmdReject(positional: string[]) {
  const id = positional[0];
  if (!id) return console.error('Usage: npm run reject <id>');
  const found = find(id);
  if (!found) return console.error(`No draft with id ${id}`);
  move(id, 'rejected');
  console.log(`✗ Rejected ${id}.`);
}

async function cmdPublish(positional: string[], flags: Record<string, string | boolean>) {
  const dry = Boolean(flags.dry);
  const only = positional[0];
  const approved = list('approved').filter((d) => !only || d.id === only);

  if (approved.length === 0) {
    console.log('Nothing approved to publish. Approve drafts first: npm run approve <id>');
    return;
  }

  for (const draft of approved) {
    if (dry || !hasX()) {
      const why = dry ? '(--dry)' : '(no X credentials — dry run)';
      console.log(`~ Would publish ${draft.id} ${why}: ${draft.text}`);
      continue;
    }
    try {
      const tweetId = await publishToX(draft.text);
      move(draft.id, 'published', { tweetId });
      recordPublished({
        text: draft.text,
        category: draft.category,
        publishedAt: new Date().toISOString(),
        tweetId,
      });
      console.log(`✓ Published ${draft.id} → x.com/i/status/${tweetId}`);
    } catch (err) {
      console.error(`✗ Failed to publish ${draft.id}: ${(err as Error).message}`);
    }
  }
}

/** One scheduled tick: figure out the slot, generate a draft, queue for review. */
async function cmdRun(_flags: Record<string, string | boolean>) {
  const draft = await runTick();
  await notifyForReview(draft);
}

function cmdStatus() {
  console.log('Copium poster — configuration status:');
  console.log(`  Claude API:      ${hasAnthropic() ? '✓ set' : '✗ missing (uses --stub canned posts)'}`);
  console.log(`  Model:           ${config.model}`);
  console.log(`  Discord review:  ${hasDiscord() ? '✓ set' : '✗ missing (drafts queue locally, no notification)'}`);
  console.log(`  X publishing:    ${hasX() ? '✓ set' : '✗ missing (publish runs as dry-run)'}`);
  console.log(`  Timezone:        ${config.timezone}`);
  const pending = list('pending').length;
  const approved = list('approved').length;
  console.log(`  Queue:           ${pending} pending, ${approved} approved`);
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const { positional, flags } = parseArgs(rest);

  switch (command) {
    case 'generate': return cmdGenerate(flags);
    case 'list': return cmdList();
    case 'approve': return cmdApprove(positional);
    case 'reject': return cmdReject(positional);
    case 'publish': return cmdPublish(positional, flags);
    case 'run': return cmdRun(flags);
    case 'status': return cmdStatus();
    default:
      console.log(`Copium poster. Commands:
  npm run status                       show config + queue
  npm run generate -- [--count N] [--category ID] [--reactive "text"] [--stub]
  npm run list                         show all drafts by status
  npm run approve -- <id>              move a draft to approved
  npm run reject -- <id>               move a draft to rejected
  npm run publish -- [id] [--dry]      publish approved drafts to X
  npm run run                          one scheduled tick (pick slot, generate, queue)

Categories: ai programming startup crypto gaming anime internet optimism motivation advice reaction meta sincere`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
