import 'dotenv/config';

/** All runtime configuration, resolved from environment (.env). */
export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  model: process.env.COPIUM_MODEL ?? 'claude-opus-4-8',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? '',
  discordBotToken: process.env.DISCORD_BOT_TOKEN ?? '',
  discordChannelId: process.env.DISCORD_CHANNEL_ID ?? '',
  x: {
    appKey: process.env.X_API_KEY ?? '',
    appSecret: process.env.X_API_SECRET ?? '',
    accessToken: process.env.X_ACCESS_TOKEN ?? '',
    accessSecret: process.env.X_ACCESS_SECRET ?? '',
  },
  timezone: process.env.COPIUM_TZ ?? 'America/New_York',
  // When the bot runs as a 24/7 worker, it generates on this cron internally
  // (default: every 2 hours on the hour = 12/day). Set COPIUM_AUTOGEN=false to
  // disable and drive generation externally instead.
  autogen: (process.env.COPIUM_AUTOGEN ?? 'true') !== 'false',
  postCron: process.env.COPIUM_POST_CRON ?? '0 */2 * * *',
  // Auto-post mode: publish scheduled posts straight to X without waiting for a
  // Discord approval. Each post is still carded with the link + a Delete button.
  // Set COPIUM_AUTO_POST=false to return to manual approval.
  autoPost: (process.env.COPIUM_AUTO_POST ?? 'false') === 'true',
} as const;

export const hasAnthropic = () => Boolean(config.anthropicApiKey);
export const hasDiscord = () => Boolean(config.discordWebhookUrl);
export const hasDiscordBot = () => Boolean(config.discordBotToken && config.discordChannelId);
export const hasX = () =>
  Boolean(config.x.appKey && config.x.appSecret && config.x.accessToken && config.x.accessSecret);
