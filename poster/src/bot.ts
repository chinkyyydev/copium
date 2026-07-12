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
import { publishToX } from './publish.js';
import { recordPublished } from './history.js';
import { generate } from './generate.js';
import { runTick } from './tick.js';
import { PENDING_DIR } from './paths.js';
import { containsUrl } from './urls.js';

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
        () => void runTick().catch((e) => console.error('tick failed:', (e as Error).message)),
        { timezone: config.timezone },
      );
      console.log(`Auto-generation ON — cron "${config.postCron}" (${config.timezone}).`);
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
      move(id, 'approved');
      if (hasX()) {
        try {
          const tweetId = await publishToX(draft.text);
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
