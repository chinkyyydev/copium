# Deploying the Copium poster to Render (24/7)

The bot is a single always-on worker: it runs the Discord approval bot **and** generates one post every 2 hours internally. Render deploys from a Git repo, so the flow is: push to GitHub → create the Render Blueprint → add your secrets.

The repo is already initialized and committed locally (with `.env` excluded). You just need to push it to GitHub and connect Render.

## 1. Create a GitHub repo and push

1. On [github.com](https://github.com) → **New repository** → name it (e.g. `copium`), **don't** add a README/.gitignore, click Create.
2. From the project root (`copium chat bot`), run what GitHub shows under "…or push an existing repository":

```powershell
git remote add origin https://github.com/<your-username>/<repo>.git
git branch -M main
git push -u origin main
```

(If you have the GitHub CLI: `gh repo create copium --private --source . --push` does it in one step.)

## 2. Create the service on Render (Blueprint)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your GitHub account and pick the repo you just pushed.
3. Render reads [render.yaml](../render.yaml) and proposes a **Worker + 1 GB disk**. Click **Apply**.

## 3. Add your secrets

In the new service → **Environment**, add these (they're `sync:false` in the blueprint, so they live only in Render, never in git):

| Key | Value |
|---|---|
| `DISCORD_BOT_TOKEN` | your bot token |
| `DISCORD_CHANNEL_ID` | `1525532826454200525` |
| `ANTHROPIC_API_KEY` | your Anthropic key (for real, non-stub posts) |
| `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_SECRET` | your X keys (to actually publish) |

Only the two `DISCORD_*` are required to boot. Save — Render redeploys automatically.

## 4. Verify

Open the service → **Logs**. Healthy boot looks like:

```
Bot online as copium#7756. Watching for new drafts…
Auto-generation ON — cron "0 */2 * * *" (America/New_York).
```

It's now live 24/7 — every 2 hours it drafts a post and cards it in your Discord channel with the Approve/Reject/Regenerate buttons.

## 5. Turn off the local machinery

So you don't get double posts, stop the stuff on your PC:

```powershell
Unregister-ScheduledTask -TaskName CopiumPoster -Confirm:$false
```

Stop any local `npm run bot` too. (Keep the local project for editing/testing with `--stub`.)

## Everyday operations

| Task | How |
|---|---|
| Ship code changes | `git push` (auto-deploys) |
| Watch logs | Render dashboard → Logs |
| Change cadence / timezone | edit `render.yaml` `envVars` → push, or edit in dashboard → Environment |
| Update a key | dashboard → Environment → edit → save (auto-restarts) |
| Pause posting | set `COPIUM_AUTOGEN=false` in Environment (bot stays up, stops generating) |
| Stop entirely | dashboard → Settings → Suspend, or Delete |

## Notes

- **Cost:** the Starter worker is ~$7/mo, plus ~$0.25/mo for the 1 GB disk. Render has **no free always-on worker tier** (free services sleep after inactivity, which would silence the bot).
- **One instance only.** Keep the worker at 1 instance — two bots would both react to the same button click.
