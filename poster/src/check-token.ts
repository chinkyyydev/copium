import 'dotenv/config';

/**
 * Instantly checks whether the DISCORD_BOT_TOKEN in .env is a currently-valid
 * token — via a REST call, so it does NOT open a gateway connection and won't
 * disturb a running bot. Run: npm run check-token
 */
const t = (process.env.DISCORD_BOT_TOKEN || '').trim();
if (!t) {
  console.log('No DISCORD_BOT_TOKEN found in .env');
  process.exit(1);
}
console.log(`token length ${t.length}, dot-segments ${t.split('.').length}, has spaces: ${/\s/.test(t)}`);

const res = await fetch('https://discord.com/api/v10/users/@me', {
  headers: { Authorization: 'Bot ' + t },
});

if (res.ok) {
  const j = (await res.json()) as { username: string; id: string };
  console.log(`\n✅ VALID — this token is bot "${j.username}" (id ${j.id}).`);
  console.log('   Now paste this SAME token into Render → Environment → DISCORD_BOT_TOKEN.');
  console.log('   Do NOT reset the token again, or this one dies too.');
} else {
  console.log(`\n❌ INVALID (HTTP ${res.status}).`);
  console.log('   Reset the token ONCE more, copy it with the 📋 button, paste here, save,');
  console.log('   and run this again — WITHOUT resetting a second time.');
}
