# 10 — Flagship Art Kit (X Profile Pic + Banner)

Production kit for Copium's flagship face on X — the profile picture and banner that become the brand's first impression. Built for **NijiJourney / Midjourney**, vibe **"smug genius"** (her signature). Extends [02-visual-design.md](02-visual-design.md) and [08-production-prompts.md](08-production-prompts.md).

**Direction:** maximally striking and attractive through charisma, styling, expression, and lighting — never exposure. This keeps the account, sponsorships, and merch advertiser/platform-safe (a business requirement, not just taste).

## Profile Picture — Director's Cut (1:1, circular-safe)

Design thesis: **the gap.** Soft, delicate, almost angelic features running a completely
smug expression — "she looks sweet, she's about to say something devastating." Signature
details that are canon from here on: **one-fang asymmetric smirk**, **hexagon-shaped
catchlights** in her eyes, **sleeve-paw knuckle at her chin**, **wavy-ended twin tails**.

```
masterpiece anime portrait, original character "Copium", breathtakingly pretty young
woman in her early 20s, mature adult facial proportions, delicate soft features with a
devastatingly smug asymmetric smirk revealing one small fang, big cat-tilted half-lidded
eyes with teal-to-emerald gradient irises and tiny hexagon-shaped catchlights, long dark
lashes, faint blush, subtle glossy lips, voluminous silver-white twin tails with softly
waved ends and glowing neon-cyan tips, loose face-framing strands, straight bangs, one
confident antenna ahoge, small hexagonal neon-cyan wireframe halo floating above her head
casting a soft glow on her hair, oversized off-white cyber hoodie slipping off one
shoulder (tasteful), one sleeve-paw raised with knuckle resting at her chin as if
appraising the viewer, black choker with hexagon pendant, single cyan-LED earbud, faint
floating holographic UI cards, dark teal-noir background with drifting particles and
bokeh, hard cyan rim light one side and soft magenta fill the other, chromatic aberration
on hair tips and halo only, no glitch on face, premium clean cel shading, ultra-detailed
eyes, head-and-shoulders bust centered with headroom above the halo
--niji 6 --ar 1:1 --stylize 350
```

**Alternate take (run in the same batch):** same prompt, but swap the expression clause
for: `bright mischievous grin with one fang, sparkling wide eyes barely containing a
laugh, cheeks slightly puffed with suppressed smugness` — warmer gremlin-cute fallback
if the smirk version reads too icy.

- **X displays PFPs as a circle** → keep a centered bust with headroom above the halo so the crop doesn't cut the halo (her key identifier). Don't over-tighten to a face crop.
- Upload ≥ 400×400 (Niji output is plenty). Test how it reads at ~48 px — it must still be recognizably her.

## Banner (3:1 → export 1500×500)

```
anime key visual, original character "Copium", full upper body, leaning toward camera
with one oversized sleeve-paw raised in a lazy peace sign, signature smug grin, wide
dark cyberpunk cityscape at dusk with purple-to-cyan neon and floating holographic
chart panels, drifting particles, cinematic rim light, large empty copy space on the
LEFT third for text, character positioned on the RIGHT --niji 6 --ar 3:1 --stylize 300
--cref <canon-PFP-url> --cw 100
```

- On X the profile pic overlaps the banner's **bottom-left** — keep her on the right, empty space on the left.

## Consistency Workflow (non-negotiable for a mascot)

1. Run the PFP prompt → 2×2 grid.
2. Pick the best → **U**pscale → this is **canon Copium**. Save it; note its `--seed`.
3. Every future image appends `--cref <canon-url> --cw <n>`:
   - `--cw 100` — copy face + hair + **outfit** (canon look; use for banner, promo, most art).
   - `--cw ~40` — keep her face, allow a **new outfit** (alt costumes, seasonal art).
4. Optionally add `--sref <canon-url>` to also lock the art *style* across a set.

## Tuning Notes

- `--stylize` 250–400: higher = prettier/more stylized but drifts from the prompt; lower = more literal. 300 is a good start.
- If the halo renders as a round angel ring, add to the prompt: `flat hexagonal wireframe halo, not a round ring`.
- If she looks too young, reinforce: `mature adult facial proportions, early 20s`.
- If eyes lose the gradient, add: `heterochromia-free teal top emerald bottom gradient eyes`.
- If glitch effects spread onto the face, add `no glitch on face`.
- Batch 8–12, curate hard. The face is the brand — spend the rolls.

## Next assets (same character, via --cref)

- The 15 canonical expressions from [02-visual-design.md](02-visual-design.md) §5 for the emote/reaction set (crying-while-smiling, maximum copium, gremlin mode, trust me bro…).
- Meme-generator base faces for the website [/memes](06-website-ux.md) feature.
- Sticker sheet + Telegram/Discord emotes.
