# Copium — X Posting Engine

Autonomous posting for [@copium](../brand/04-social-media-strategy.md). Claude generates posts in Copium's voice → a human approves them in Discord → they publish to X. The persona lives in [src/persona.ts](src/persona.ts) and is the same brain the website chat will use.

```
generate ──► Discord buttons ──► ✅ Approve & Post ──► X
 (Claude)     (bot posts card)    ❌ Reject
                   │              🔄 Regenerate
              file queue: queue/{pending,approved,published,rejected}
```

## Quick start (works with zero API keys)

```bash
cd poster
npm install
cp .env.example .env          # optional for stub mode; required to go live
npm run status                # shows what's configured
npm run generate -- --stub    # generate a canned draft (no Claude key needed)
npm run list                  # see it in the pending queue
npm run approve -- <id>       # approve the draft (id printed by generate/list)
npm run publish -- --dry      # dry-run publish (prints instead of posting)
```

`--stub` uses the curated example posts so you can exercise the whole pipeline before wiring up any keys. Drop `--stub` once `ANTHROPIC_API_KEY` is set to generate fresh posts.

## Approve from your phone (Discord buttons)

Run the bot as a long-running process. It watches the `pending` queue, posts each new draft as a card with **✅ Approve & Post · ❌ Reject · 🔄 Regenerate** buttons, and handles the clicks — no CLI needed, works from the Discord mobile app.

```bash
npm run bot     # keep this running (its own terminal / pm2 / a service)
```

Set up the bot once (see [.env.example](.env.example) → option A):

1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application** → **Bot** → **Reset Token**, copy it → `DISCORD_BOT_TOKEN`. No privileged intents needed.
2. **OAuth2 → URL Generator** → scopes `bot`, permissions **Send Messages** + **Embed Links** → open the URL → add the bot to your server.
3. Enable **Developer Mode** (Settings → Advanced), right-click your review channel → **Copy Channel ID** → `DISCORD_CHANNEL_ID`.

Now the flow is: `npm run run` (or a scheduler) drops a draft → the bot cards it in Discord → you tap **Approve & Post** on your phone → it publishes to X and edits the card to show the link. **Regenerate** rejects the draft and posts a fresh one in the same category. If X keys aren't set yet, Approve just marks it approved (no post).

> The bot and the plain webhook are alternatives — with the bot running you don't need `DISCORD_WEBHOOK_URL`. The CLI `approve`/`reject`/`publish` commands still work either way.

## Going live — 3 keys

Fill in `.env` (see [.env.example](.env.example)):

1. **`ANTHROPIC_API_KEY`** — from [console.anthropic.com](https://console.anthropic.com). Enables real generation. Default model `claude-opus-4-8`; set `COPIUM_MODEL=claude-sonnet-5` (or `claude-haiku-4-5`) for cheaper high-volume posting.
2. **`DISCORD_WEBHOOK_URL`** — the review channel (Server Settings → Integrations → Webhooks). Every draft gets posted here for a human to eyeball. **This is the brand-safety gate — keep it.**
3. **`X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_SECRET`** — from [developer.x.com](https://developer.x.com). Needs a Read+Write app with OAuth 1.0a user tokens. The **Free** tier can post ~1,500/month; upgrade to **Basic (~$200/mo)** when you add the reply strategy. If the tier's post cap runs out mid-month (X answers `429 UsageCapExceeded`), the bot posts one clear "X wants money" notice to Discord, pauses auto-posting until the cap resets (or 24 h if X doesn't say), and queues new drafts for manual approval instead of failing one by one.

Then:

```bash
npm run generate               # real Claude generation → queued + Discord ping
npm run approve -- <id>         # after a human reads it
npm run publish                # posts all approved drafts to X
```

## Daily automation

`npm run run` performs one scheduled tick: it looks at the current time, picks the matching [posting slot](src/schedule.ts) (gm / main / afternoon / evening / gremlin), generates one on-theme draft, and queues it for review. Point a scheduler at it:

- **Windows Task Scheduler** — new task, action `npm run run`, start-in the `poster` folder, trigger at 08:30 / 12:00 / 16:00 / 20:00 / 00:00.
- **cron / GitHub Actions** — same idea, one entry per slot.

Approval and publishing stay manual by design. Once you trust the routine slots, you can add an auto-approve path — but **never** auto-approve reactive/breaking-news posts (doc 04).

## Commands

| Command | What it does |
|---|---|
| `npm run status` | Show config + queue counts |
| `npm run generate -- [--count N] [--category ID] [--reactive "text"] [--stub]` | Generate draft(s) into pending |
| `npm run list` | List all drafts by status |
| `npm run approve -- <id>` | Approve a pending draft |
| `npm run reject -- <id>` | Reject a draft |
| `npm run publish -- [id] [--dry]` | Publish approved drafts to X (or dry-run) |
| `npm run run` | One scheduled tick |
| `npm run bot` | Long-running Discord bot with approve/reject/regenerate buttons |

Categories: `ai programming startup crypto gaming anime internet optimism motivation advice reaction meta sincere`

For a live event: `npm run generate -- --category reaction --reactive "a big platform is having an outage"`.

## How it stays on-brand

- **Persona** ([persona.ts](src/persona.ts)) encodes the voice, the [bleak-fact + insane-reframe] structure, the 5% sincerity rule, and the hard rules (no real tickers, no financial advice, no punching down, sponsor-safe).
- **Few-shot** ([fewshot.ts](src/fewshot.ts)) anchors each category with real examples.
- **De-dup** — generation avoids the last 30 posts and retries on near-duplicates ([history.ts](src/history.ts)).
- **Human gate** — nothing reaches X without passing through `approved`.
