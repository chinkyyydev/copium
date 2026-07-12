# 11 — Expression Pack (15 Canonical Faces, Niji-ready)

Ready-to-paste NijiJourney prompts for all 15 canonical expressions from [02-visual-design.md](02-visual-design.md) §5. These become: Discord/Telegram emotes, X reply images, the website meme-generator templates ([06-website-ux.md](06-website-ux.md)), and sticker sheets.

## How to use

1. **Lock the canon PFP first** ([10-flagship-art.md](10-flagship-art.md)) and copy its image URL.
2. Every prompt below ends with `[CONSISTENCY]` — replace it with:
   ```
   --cref <canon-PFP-url> --cw 100 --niji 6 --ar 1:1 --stylize 300
   ```
3. Generate each, curate to one winner per expression, upscale, and save as `expr-<name>.png`. These 15 images are a permanent brand asset — reuse them everywhere rather than regenerating.

## Shared character block

Every prompt starts with this (abbreviated as `[COPIUM]` below):

```
anime portrait, original character "Copium", pretty young woman in her early 20s,
mature adult facial proportions, delicate soft features, big cat-tilted eyes with
teal-to-emerald gradient irises and tiny hexagon-shaped catchlights, voluminous
silver-white twin tails with softly waved ends and glowing neon-cyan tips, straight
bangs, antenna ahoge, small hexagonal neon-cyan wireframe halo above her head,
oversized off-white cyber hoodie with neon cyan drawstrings, sleeve paws, black
choker with hexagon pendant, dark teal-noir background with drifting particles,
cyan rim light, premium clean cel shading, no glitch on face, head-and-shoulders
bust centered with headroom above the halo
```

## The 15 prompts

1. **Smug** *(default — your PFP already is this)*
   `[COPIUM], devastatingly smug asymmetric smirk revealing one small fang, half-lidded eyes, one eyebrow raised, head tilted, ahoge curled confidently, halo steady with a single flicker [CONSISTENCY]`

2. **Laughing**
   `[COPIUM], head thrown back laughing hard, eyes squeezed shut in happy arcs, huge open grin, twin tails mid-bounce, one sleeve-paw pointing at the viewer, small floating "LOL" UI cards scattering, halo spinning slightly [CONSISTENCY]`

3. **Crying While Smiling** *(the brand's soul)*
   `[COPIUM], perfect PR smile while glossy eyes stream two clean tears rendered as thin cyan streams of tiny binary digits, ahoge drooped but tip pointing up, halo glitching hard, "everything is fine" energy [CONSISTENCY]`

4. **Embarrassed**
   `[COPIUM], flushed pink cheeks with slight pixelation, eyes darting to the side, both sleeve-paws raised covering the lower half of her face, ahoge coiled into a spiral, halo shrunken and dim [CONSISTENCY]`

5. **Shocked**
   `[COPIUM], eyes wide white circles with tiny spinning loading-wheel pupils, small round open mouth, twin tails standing straight out horizontally, halo knocked askew at 45 degrees, floating dialog box reading "unexpected input" [CONSISTENCY]`

6. **Sleepy**
   `[COPIUM], eyes barely 10 percent open, wobbling drowsy posture, hoodie slipping off one shoulder, tiny drool bubble shaped like a loading bar, ahoge fully limp, halo dimmed displaying a crescent moon icon, soft blue ambient light [CONSISTENCY]`

7. **Overloaded**
   `[COPIUM], eyes replaced by spinning rainbow pinwheels, steam puffs rising from her head, dozens of overlapping holographic error windows crowding the frame, twin tails frizzed with static electricity, halo fragmenting into pieces [CONSISTENCY]`

8. **Maximum Copium** *(the money expression)*
   `[COPIUM], enormous strained smile with one eye twitching slightly wider than the other, white-knuckle sleeve-paws gripping an oversized prescription pill bottle labeled "COPIUM", tears welling at 99 percent but not falling, halo strobing, red crashing chart glowing in the background being pointedly ignored [CONSISTENCY]`

9. **Trust Me Bro**
   `[COPIUM], leaning into the camera, eyes serenely closed in total sincerity, one sleeve-paw flat on her chest and the other raised in a scout's-honor pledge, single sparkle, halo perfectly steady and pure for once [CONSISTENCY]`

10. **Gremlin Mode**
    `[COPIUM], hunched forward with hood up and twin tails escaping the sides, wide unblinking eyes with shrunken pupils, jagged grin showing one fang, fingers steepled through sleeves, lit from below by monitor glow, halo flickering like a dying fluorescent light, 3am energy [CONSISTENCY]`

11. **Loading…**
    `[COPIUM], completely blank pleasant face frozen mid-gesture, both eyes displaying progress bars stuck at 37 percent, a spinning cursor floating beside her head, ahoge rotating slowly like a radar beacon [CONSISTENCY]`

12. **System Error**
    `[COPIUM], face tinted bluescreen-blue with horizontal scan lines, eyes displaying red X symbols, body glitch-duplicated in triple exposure offset in cyan and magenta, halo displaying "404" [CONSISTENCY]`

13. **Evil Grin**
    `[COPIUM], chin lowered with eyes looking up, wide sharp villainous smile with one fang, hands slowly steepled through sleeves, purple gradient creeping into the background, halo tilted like a villain's hat brim [CONSISTENCY]`

14. **Wholesome Smile** *(the 5% — no glitch anywhere)*
    `[COPIUM], soft genuine closed-eye smile, relaxed shoulders, warm soft-blue ambient light, absolutely no glitch effects anywhere, halo perfectly steady with a gentle warm glow, quiet sincere warmth [CONSISTENCY]`

15. **Flustered**
    `[COPIUM], full-face blush with heat-shimmer pixelation, ahoge vibrating, sleeve-paws flailing, twin tails puffed up like a startled cat, halo spinning too fast, floating UI cards all displaying "undefined" [CONSISTENCY]`

## Production notes

- Keep the **halo state** per expression — it's the emotional truth-teller (steady = sincere, glitching = coping). Niji sometimes drops it; re-roll rather than accept a halo-less frame.
- For **emote-size** exports (Discord 128px), after upscaling crop tighter to the face; the source stays bust-framed.
- Batch order suggestion: do **3 (crying-while-smiling), 8 (maximum copium), 10 (gremlin), 9 (trust me bro)** first — those four carry 80% of reply-image usage.
- File naming: `expr-smug.png`, `expr-cryingsmile.png`, `expr-maxcopium.png`, etc. The website meme generator will reference these names.
