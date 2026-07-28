import { watch, mkdirSync } from 'node:fs';
import cron from 'node-cron';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageFlags,
  type TextChannel,
} from 'discord.js';
import { config, hasDiscordBot, hasX } from './config.js';
import { list, find, move, createDraft, type Draft } from './queue.js';
import { publishToX, deleteFromX, XPublishError } from './publish.js';
import { recordPublished } from './history.js';
import { generate } from './generate.js';
import { runTick } from './tick.js';
import { PENDING_DIR } from './paths.js';
import { containsUrl } from './urls.js';
import { violatesTokenPolicy } from './contentGuard.js';

// Brand palette (doc 02): cyan = awaiting, emerald = done, red = rejected, amber = error.
const COLOR = { pending: 0x22e4ff, done: 0x2ee6a8, reject: 0xff4d6d, amber: 0xffb020 } as const;

if (!hasDiscordBot()) {
  console.error(
    'Discord bot not configured. Set DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID in .env.\n\n' +
      'Setup:\n' +
      '  1. https://discord.com/developers/applications → New Application → Bot → Reset Token (copy it)\n' +
      '  2. Bot → Privileged Gateway Intents: none needed. Save.\n' +
      '  3. OAuth2 → URL Generator → scopes: bot → permissions: Send Messages, Embed Links → open URL, add to your server\n' +
      '  4. In Discord, enable Developer Mode (Settings → Advanced), right-click your review channel → Copy Channel ID\n' +
      '  5. Put the token in DISCORD_BOT_TOKEN and the channel id in DISCORD_CHANNEL_ID, then: npm run bot',
  );
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const carded = new Set<string>(); // draft ids we've already posted a card for
let channel: TextChannel;
// While X's post cap is hit, auto-posting is paused until this epoch-ms and
// new drafts queue for manual approval instead of failing one by one.
let xCapPausedUntil = 0;

function embedFor(draft: Draft, state: keyof typeof COLOR, footer: string): EmbedBuilder {
  return new EmbedBuilder()
    .setAuthor({ name: '🧿 Copium Clinic — dose approval' })
    .setDescription(draft.text)
    .addFields(
      { name: 'category', value: draft.category, inline: true },
      { name: 'length', value: `${draft.text.length}/280`, inline: true },
      { name: 'source', value: draft.source, inline: true },
    )
    .setColor(COLOR[state])
    .setFooter({ text: footer });
}

function buttonsFor(id: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`approve:${id}`).setLabel('Approve & Post').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject:${id}`).setLabel('Reject').setEmoji('❌').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`regen:${id}`).setLabel('Regenerate').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
  );
}

async function cardDraft(draft: Draft): Promise<void> {
  if (carded.has(draft.id) || draft.discordMessageId) {
    carded.add(draft.id);
    return;
  }
  const msg = await channel.send({
    embeds: [embedFor(draft, 'pending', `id ${draft.id} · awaiting approval`)],
    components: [buttonsFor(draft.id)],
  });
  move(draft.id, 'pending', { discordMessageId: msg.id });
  carded.add(draft.id);
  console.log(`carded ${draft.id}`);
}

/**
 * Auto-post mode: publish a fresh draft straight to X, then card it as a
 * notification with the tweet link and a Delete button. Falls back to the
 * normal approval card if the draft contains a URL ($0.20 rate) or the
 * publish fails.
 */
async function autoPublish(draft: Draft): Promise<void> {
  if (containsUrl(draft.text)) {
    console.warn(`auto-post: ${draft.id} contains a URL — held for manual approval.`);
    carded.delete(draft.id); // let the normal approval card flow handle it
    await cardDraft(draft);
    return;
  }
  const violation = violatesTokenPolicy(draft.text);
  if (violation) {
    // Token policy is absolute: never auto-post it, and don't even offer an
    // approve button — reject outright and note why.
    console.warn(`auto-post: ${draft.id} blocked — ${violation}.`);
    move(draft.id, 'rejected');
    await channel.send(
      `🚫 blocked a draft (**${violation}**) — she never names or shills tokens. it was auto-rejected:\n> ${draft.text.replace(/\n/g, '\n> ')}`,
    );
    return;
  }
  if (xCapPausedUntil > Date.now()) {
    console.warn(`auto-post: X post cap pause active — ${draft.id} held for manual approval.`);
    carded.delete(draft.id);
    await cardDraft(draft);
    return;
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
    const deleteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`delete:${draft.id}`).setLabel('Delete from X').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    );
    await channel.send({
      embeds: [embedFor(draft, 'done', `🚀 auto-posted → x.com/i/status/${tweetId}`)],
      components: [deleteRow],
    });
    console.log(`auto-posted ${draft.id} → ${tweetId}`);
  } catch (err) {
    console.error(`auto-post failed for ${draft.id}: ${(err as Error).message}`);
    carded.delete(draft.id);
    await cardDraft(draft); // fall back to manual approval
    if (err instanceof XPublishError && err.kind === 'usage-cap') {
      // Monthly caps don't always come with a reset header — re-try in 24h.
      const until = err.resetAt ?? Date.now() + 24 * 60 * 60 * 1000;
      const alreadyPaused = xCapPausedUntil > Date.now();
      xCapPausedUntil = until;
      if (!alreadyPaused) {
        const t = Math.floor(until / 1000);
        await channel.send(
          `💸 **X wants money** — ${err.message}\n` +
            `Auto-posting is paused until <t:${t}:f> (<t:${t}:R>). New drafts will queue here for manual approval instead of spamming failures.`,
        );
      }
    } else {
      await channel.send(`⚠ auto-post failed (${(err as Error).message}) — draft ${draft.id} queued for manual approval above.`);
    }
  }
}

/** Post review cards for any pending drafts not yet carded. */
async function scanAndCard(): Promise<void> {
  let pending: Draft[];
  try {
    pending = list('pending');
  } catch {
    return; // transient read error; next watch event will retry
  }
  for (const draft of pending) {
    if (!carded.has(draft.id) && !draft.discordMessageId) {
      try {
        await cardDraft(draft);
      } catch (err) {
        console.warn(`failed to card ${draft.id}: ${(err as Error).message}`);
      }
    }
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot online as ${c.user.tag}. Watching for new drafts…`);
  let fetched;
  try {
    fetched = await client.channels.fetch(config.discordChannelId);
  } catch (err) {
    console.error(`\n✗ Could not access channel ${config.discordChannelId}: ${(err as Error).message}`);
    console.error(
      'Most likely: the bot has not been added to the server that contains this channel.\n' +
        '  → Discord Developer Portal → your app → OAuth2 → URL Generator\n' +
        '  → scopes: bot   permissions: View Channel, Send Messages, Embed Links\n' +
        '  → open the generated URL and add the bot to your server.\n' +
        'Also confirm DISCORD_CHANNEL_ID is a TEXT channel id (right-click the channel → Copy Channel ID),\n' +
        'not the server id, a voice channel, or a category.',
    );
    process.exit(1);
  }
  if (!fetched || !fetched.isTextBased()) {
    console.error(`✗ ${config.discordChannelId} exists but is not a text channel the bot can post to.`);
    process.exit(1);
  }
  channel = fetched as TextChannel;

  mkdirSync(PENDING_DIR, { recursive: true }); // ensure it exists in a fresh container
  await scanAndCard(); // catch up on anything generated while offline

  let debounce: NodeJS.Timeout | null = null;
  watch(PENDING_DIR, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void scanAndCard(), 300);
  });

  // 24/7 mode: generate on a schedule inside this same process (no external
  // cron / Task Scheduler needed). New drafts are picked up by the watcher above.
  if (config.autogen) {
    if (!cron.validate(config.postCron)) {
      console.error(`Invalid COPIUM_POST_CRON "${config.postCron}" — auto-generation disabled.`);
    } else {
      cron.schedule(
        config.postCron,
        () =>
          void (async () => {
            const draft = await runTick();
            if (config.autoPost && hasX()) {
              carded.add(draft.id); // claim it before the watcher cards it for approval
              await autoPublish(draft);
            }
            // else: the pending-dir watcher cards it for manual approval as usual
          })().catch((e) => console.error('tick failed:', (e as Error).message)),
        { timezone: config.timezone },
      );
      const mode = config.autoPost ? 'AUTO-POST (no approval — cards carry a Delete button)' : 'manual approval';
      console.log(`Auto-generation ON — cron "${config.postCron}" (${config.timezone}), mode: ${mode}.`);
    }
  } else {
    console.log('Auto-generation OFF (COPIUM_AUTOGEN=false). Drive generation externally.');
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const [action, id] = interaction.customId.split(':');

  const found = find(id);
  if (!found) {
    await interaction.reply({ content: 'that draft is gone (already handled?).', flags: MessageFlags.Ephemeral });
    return;
  }
  const draft = found.draft;
  const who = interaction.user.username;

  await interaction.deferUpdate(); // ack within 3s; publishing may take longer

  try {
    if (action === 'approve') {
      // URL guard: X bills a post with any link at $0.20 (vs $0.015). Refuse to
      // publish it automatically; leave the card's buttons so the user can
      // Regenerate or Reject.
      if (containsUrl(draft.text)) {
        await interaction.followUp({
          content:
            '⚠ Not posted — this draft contains a URL, which X bills at **$0.20** instead of $0.015 (13×). Regenerate or Reject it, or post it manually if you really want the link.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const approveViolation = violatesTokenPolicy(draft.text);
      if (approveViolation) {
        await interaction.followUp({
          content: `🚫 Not posted — **${approveViolation}**. Token policy is absolute: she never names or shills tokens. Regenerate or Reject.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      move(id, 'approved');
      if (hasX()) {
        try {
          const tweetId = await publishToX(draft.text);
          xCapPausedUntil = 0; // a post went through — the cap has lifted
          move(id, 'published', { tweetId });
          recordPublished({
            text: draft.text,
            category: draft.category,
            publishedAt: new Date().toISOString(),
            tweetId,
          });
          await interaction.editReply({
            embeds: [embedFor(draft, 'done', `✅ posted by ${who} → x.com/i/status/${tweetId}`)],
            components: [],
          });
        } catch (err) {
          await interaction.editReply({
            embeds: [embedFor(draft, 'amber', `⚠ approved by ${who}, but X post failed: ${(err as Error).message}`)],
            components: [],
          });
        }
      } else {
        await interaction.editReply({
          embeds: [embedFor(draft, 'done', `✅ approved by ${who} (no X creds — not posted)`)],
          components: [],
        });
      }
    } else if (action === 'delete') {
      if (!draft.tweetId) {
        await interaction.followUp({ content: 'no tweet id on record for this draft.', flags: MessageFlags.Ephemeral });
        return;
      }
      try {
        await deleteFromX(draft.tweetId);
        move(id, 'rejected', { tweetId: undefined });
        await interaction.editReply({
          embeds: [embedFor(draft, 'reject', `🗑️ deleted from X by ${who}`)],
          components: [],
        });
      } catch (err) {
        await interaction.followUp({
          content: `couldn't delete: ${(err as Error).message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (action === 'reject') {
      move(id, 'rejected');
      await interaction.editReply({
        embeds: [embedFor(draft, 'reject', `❌ rejected by ${who}`)],
        components: [],
      });
    } else if (action === 'regen') {
      move(id, 'rejected');
      const post = await generate({ categoryId: draft.category });
      const created = createDraft({
        text: post.text,
        category: post.category.id,
        source: post.source,
      });
      await interaction.editReply({
        embeds: [embedFor(draft, 'reject', `🔄 regenerated by ${who} → new draft ${created.id} below`)],
        components: [],
      });
      await cardDraft(created);
    }
  } catch (err) {
    console.error(`interaction ${action}:${id} failed:`, err);
  }
});

client.on(Events.Error, (err) => console.error('Discord client error:', err.message));

client.login(config.discordBotToken);
