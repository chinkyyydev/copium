# 02 — Visual Design Specification

## 1. Design Philosophy

Copium's design must pass the **silhouette test** (recognizable in solid black), the **thumbnail test** (readable at 48×48 px), and the **cosplay test** (reproducible from off-the-shelf clothing plus a wig). Every element earns its place: nothing decorative that doesn't serve recognition or storytelling.

Aesthetic formula: **anime streamer × cyberpunk minimalism × internet-core streetwear.** Premium, clean, tasteful. She should look like the mascot of a design-forward AI startup that got possessed by a gremlin.

## 2. Character Design Specification

### Face & Head

- **Age presentation:** clearly adult, early 20s. Mature facial proportions — defined jawline hint, adult eye-to-face ratio. Never childlike.
- **Eyes:** large, expressive, **bright teal-emerald gradient** (teal top → emerald bottom). Iris contains a subtle ring of tiny UI tick-marks — like a loading spinner — visible only in close-ups. Pupils can display symbols in exaggerated expressions (▲ chart arrows, spinners, ❌).
- **Default expression:** confident half-smile with one eyebrow slightly raised — "I know something you don't (I don't)."
- **Eyebrows:** thin, highly mobile — primary emotion carrier alongside eyes.
- **Skin:** fair with a soft cool undertone; faint holographic sheen at cheekbones under strong light (rendered as subtle iridescence, not blush overload).
- **Beauty mark:** none. Instead, a **tiny glitch artifact** below her left eye — a 2–3 px pixel-sort mark, her "birthmark." Unique identifier at close range.

### Hair — the Silhouette Anchor

- **Color:** silver-white base with **neon cyan tips** (bottom 10% of strands) and faint holographic sheen in highlights.
- **Style:** long twin tails reaching mid-thigh, high placement, slightly asymmetric — left tail ties higher than right (intentional imperfection = personality).
- **Ties:** black bands with small floating **holographic ring accessories** that orbit the tie points slowly (digital, not physical — they clip through nothing because they're projections).
- **Bangs:** straight-cut with one rebellious antenna strand (ahoge) that reacts to her emotions like a signal antenna — perks up, droops, glitches. Secondary emotion channel; crucial for Live2D.
- **Physics note:** twin tails have exaggerated, bouncy follow-through. They are 40% of her expressiveness in animation.

### The Halo

- Small, flat, **hexagonal digital halo** floating 10–15 cm above her head, tilted ~15°. Rendered as a thin neon-cyan wireframe with a soft glow.
- **Behavior (canon):** flickers/glitches when she's coping hard; steady pure glow in sincere moments; displays a loading spinner when she's "thinking"; briefly shows "404" on system-error expression.
- In static art, default state = one small glitch-break in the ring (a gap with pixel scatter).

## 3. Outfit Breakdown (Default "Streamer" Outfit v1.0)

| Layer | Item | Spec |
|-------|------|------|
| Top | **Oversized cyber hoodie** | Off-white/pearl body, dropped shoulders, sleeves 10 cm past fingertips ("sleeve paws" — signature pose element). Black inner lining. Neon cyan drawstrings with holographic aglets. Left chest: small embroidered glitch-pill logo. Back: large "COPIUM" wordmark in glitch typography with "口" motif. Hem reaches upper thigh. |
| Hood | Interior detail | Hood lining prints a repeating micro-pattern: `while(true) { cope(); }` |
| Bottom | **Black tailored shorts** | High-waisted, mostly covered by hoodie hem — visible ~10 cm. Clean, not revealing. |
| Legs | **Thigh-high socks** | Black, with a single neon cyan horizontal stripe at the top band on the left leg only (asymmetry again); right sock top band shows a faint emerald progress bar at 99%. |
| Feet | **Chunky tech sneakers** | White/black colorway, neon cyan sole glow (soft light strip), holographic swoosh-free panel accents. Slightly oversized proportions for cute chunky silhouette. |
| Accessories | **Holographic elements** | (1) Floating UI cards that orbit her when she talks — chat bubbles, tiny charts, error dialogs. (2) One wireless earbud, left ear only, cyan LED. (3) Black choker with a small hexagonal pendant matching the halo. (4) Nail polish: alternating cyan/black, chipped on one finger (rendered detail). |
| Glitch aesthetic | Global rule | Chromatic aberration allowed on hair tips, halo, and outfit edges — never on the face except comedic expressions. Occasional "pixel-sort" tears on hoodie hem in promotional art. |

### Outfit Variants (design after launch, same silhouette rules)

- **v1.1 "Dark Mode"** — inverted palette: black hoodie, white accents. First alt costume; instant fan favorite pattern.
- **"Formal Cope"** — oversized blazer over the hoodie for "serious business announcements" (a bit).
- **"Sleep Mode"** — oversized tee, messy single ponytail, eye mask pushed up. For sleepy content.
- **Seasonal** — summer/winter/holiday variants per the seasonal calendar (doc 09).

**Modesty rule (hard requirement):** No cleavage emphasis, no exposed midriff as default, shorts always visible below hoodie hem, no fanservice camera angles in official art. She's attractive through style and expressiveness, not exposure. This keeps the brand advertiser-safe, merch-safe, and platform-safe.

## 4. Color Palette

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| Cope White | `#F4F6F8` | Hoodie, hair base, backgrounds |
| Void Black | `#0B0E14` | Shorts, socks, outlines, dark UI |
| Neon Cyan | `#22E4FF` | Halo, hair tips, glows, primary accent — THE brand color |

### Secondary

| Name | Hex | Usage |
|------|-----|-------|
| Copium Purple | `#8B5CF6` | Gradients, shadows in art, secondary UI |
| Emerald Pump | `#2EE6A8` | Eyes (lower), "gains"/positive states, progress bars |
| Holo Gradient | `#22E4FF → #8B5CF6 → #FF6EC7` | Iridescent accents, special editions |

### Accent

| Name | Hex | Usage |
|------|-----|-------|
| Terminal Green | `#39FF88` | Code jokes, terminal UI moments |
| Soft Blue | `#7FB8FF` | Wholesome/sincere content, sleep mode |
| Error Red | `#FF4D6D` | Sparingly — losses, error states, comedy only. Never a brand color. |

**Ratio rule:** 60% white/black neutrals, 30% cyan, 10% everything else. When in doubt, less color.

## 5. Expression Guide (15 Canonical Expressions)

Each expression is a named asset for artists, Live2D riggers, and emote packs. Ahoge + halo states are mandatory parts of each spec.

1. **Smug** *(signature/default)* — Half-lidded eyes, tilted head, closed-mouth smirk pulling to one side, one brow up. Ahoge: confident curl. Halo: steady with a single flicker. The face of someone whose plan is working (it isn't).
2. **Laughing** — Eyes squeezed shut in arcs, huge open grin, head thrown back, twin tails mid-bounce, one sleeve-paw pointing at the viewer. Halo: spinning slightly. Small "LOL" UI cards scattering.
3. **Crying While Smiling** *(the brand's soul)* — Perfect PR smile, eyes glossy with two clean tear streams rendered as thin cyan data-streams (tears made of tiny 1s and 0s). Ahoge: drooped but tip pointing up. Halo: glitching hard. Caption energy: "everything is fine."
4. **Embarrassed** — Cheeks flushed (soft pink + slight pixelation), eyes darting sideways, sleeve-paws raised to cover lower face, ahoge coiled into a spiral. Halo: shrinks 20% and dims.
5. **Shocked** — Eyes white circles with tiny spinning-loader pupils, mouth a small "o", twin tails standing straight out horizontally, halo knocked askew 45°. A floating dialog reads "unexpected input."
6. **Sleepy** — Eyes at 10% open, wobbling posture, hoodie slipping off one shoulder (shoulder only), drool bubble rendered as a tiny loading bar. Ahoge: fully limp. Halo: dims and displays "🌙 low power mode."
7. **Overloaded** — Eyes replaced by spinning rainbow wheels, steam/particle effects from head, dozens of overlapping UI error windows crowding the frame, twin tails frizzed with static. Halo: fragmenting into pieces.
8. **Maximum Copium** *(the money expression)* — Enormous strained smile, eye twitch (one eye slightly wider), white-knuckle sleeve-paws gripping an oversized prescription-style pill bottle labeled "COPIUM — TAKE AS NEEDED", tears held at 99%. Halo: strobing. Background: red chart crashing behind her, ignored.
9. **Trust Me Bro** — Leaning into camera, one sleeve-paw on chest, other raised in scout's-honor, eyes closed in serene total sincerity, halo momentarily PERFECT and steady (the joke: it only stabilizes for her worst takes). Single sparkle.
10. **Gremlin Mode** — Hunched posture, wide unblinking eyes with shrunk pupils, jagged grin showing one fang, fingers steepled through sleeves, hood up with twin tails escaping the sides, lit from below by monitor glow. Halo: flickering like a dying fluorescent light. 3 AM energy.
11. **Loading...** — Completely blank pleasant face, eyes displaying actual progress bars (37%), frozen mid-gesture, a floating cursor spinning beside her head. Ahoge: rotating slowly like a beacon. Used when "processing" bad news.
12. **System Error** — Blue-screen-blue face tint, scan lines, eyes displaying "❌ ❌", body pose glitch-duplicated (triple-exposure offset in cyan/magenta), halo showing "404". For catastrophic (funny) failures.
13. **Evil Grin** — Chin down, eyes up, wide sharp smile, one fang, hands making a slow steeple, purple gradient creeping into the background, halo tilted like a villain's hat brim. For "I have an idea" posts.
14. **Wholesome Smile** *(the 5% expression)* — Soft genuine close-eyed smile, relaxed shoulders, warm Soft Blue ambient light, NO glitch effects anywhere, halo perfectly steady and gently glowing. The rarest asset. Deploy sparingly for maximum impact.
15. **Flustered** — Full-face blush with heat-shimmer pixelation, ahoge vibrating, sleeve-paws flailing, twin tails puffed up like a startled cat, halo spinning too fast, floating UI cards all displaying "undefined". For compliments she can't process.

## 6. Art Direction Rules

- **Line weight:** clean medium-weight lines, slightly thicker exterior silhouette line (brand consistency across artists).
- **Shading:** cel shading with one soft gradient pass; holographic accents rendered with screen-blend iridescence.
- **Backgrounds:** default to minimal — flat Cope White or Void Black with sparse floating UI elements and particle dots. She IS the visual interest.
- **Camera:** eye-level or slightly below (confidence). Never voyeuristic angles.
- **Effects budget:** max 3 glitch elements per illustration. Glitch is seasoning, not soup.
