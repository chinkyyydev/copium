/**
 * One-off diagnostic: logs in, prints every server the bot is in and every text
 * channel it can see (with IDs), then exits. Use it to find the right
 * DISCORD_CHANNEL_ID. Run: npx tsx src/diag.ts
 */
import { Client, GatewayIntentBits, ChannelType, Events } from 'discord.js';
import { config } from './config.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  if (c.guilds.cache.size === 0) {
    console.log('\n⚠ The bot is in NO servers. Open the OAuth invite URL and add it to your server.');
  }
  for (const [, guild] of c.guilds.cache) {
    console.log(`\nServer: "${guild.name}"  (server id ${guild.id})`);
    const text = guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildText);
    if (text.size === 0) {
      console.log('  (no text channels visible — check the bot\'s View Channel permission)');
    }
    for (const [, ch] of text) {
      console.log(`  #${ch.name}   →   channel id ${ch.id}`);
    }
  }
  await client.destroy();
  process.exit(0);
});

client.login(config.discordBotToken);
