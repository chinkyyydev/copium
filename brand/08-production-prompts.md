# 08 — Production Prompts (Image Generation, Live2D, Animation)

## 1. Master Image Generation Prompt

### Core Identity Block (include verbatim in EVERY generation)

```
masterpiece, best quality, original character "Copium", anime style illustration,
1girl, solo, adult woman in her early 20s, mature facial proportions,
long silver-white twin tails reaching mid-thigh, high asymmetric twin tail placement
(left tail tied slightly higher), neon cyan gradient hair tips, straight-cut bangs,
single expressive ahoge antenna strand,
large bright teal-to-emerald gradient eyes, subtle tech ring detail in iris,
tiny pixel glitch mark below left eye,
small hexagonal wireframe digital halo floating above head, neon cyan glow,
slightly tilted, one small glitch gap in the ring,
oversized off-white cyber hoodie with dropped shoulders, sleeves longer than hands
(sleeve paws), neon cyan drawstrings, black inner lining, small glitch-pill logo
on chest, black tailored shorts visible under hoodie hem, black thigh-high socks
with single cyan stripe on left leg, chunky white-and-black tech sneakers with
soft cyan glowing soles, black choker with small hexagon pendant,
single wireless earbud in left ear with cyan LED,
floating translucent holographic UI panels and small digital particles around her,
subtle chromatic aberration on hair tips and halo only,
color palette: white, black, neon cyan (#22E4FF), accents of purple (#8B5CF6)
and emerald (#2EE6A8),
clean cel shading, medium line weight with bold silhouette outline,
cyberpunk minimalism, premium streetwear aesthetic, streamer vibes
```

### Negative Prompt Block

```
child, childlike, loli, underage appearance, revealing clothing, cleavage, midriff,
fanservice angle, extra fingers, deformed hands, multiple halos, wings,
generic angel halo (round), realistic style, 3d render, watermark, text artifacts,
oversaturated, excessive glitch effects on face, copying existing characters
```

### Variable Blocks (swap per asset)

- **Expression:** insert one of the 15 canonical expression descriptions from doc 02 §5 verbatim.
- **Pose:** e.g. `dynamic three-quarter view, one sleeve-paw raised in peace sign, twin tails mid-bounce` / `sitting cross-legged floating in digital space, laptop on lap` / `leaning toward viewer, hands behind back`.
- **Environment:** `flat off-white background with sparse floating UI elements` (default) / `dark void with drifting cyan particles and holographic charts` / `cozy streamer room at night, monitor glow` / `cyberpunk city rooftop at dusk, purple gradient sky`.
- **Lighting:** `soft even key light with cyan rim light` (default) / `monitor-glow underlight` (gremlin content) / `warm soft blue ambient` (sincere content).
- **Crop:** `portrait bust, centered, looking at viewer` (PFP) / `full body, silhouette-forward` (model sheets) / `16:9 wide with copy space on left` (banners/marketing).

### Consistency Protocol

1. Generate a canonical reference set first (front, side, back, ¾ + 15 expressions) and human-curate it; use as image-prompt/reference conditioning (or train a LoRA/character reference) for all future assets.
2. Every published asset passes a checklist: halo hexagonal + gapped? left tail higher? cyan tips ~10%? glitch mark under LEFT eye? sock stripe on LEFT leg? sleeve paws? adult proportions? ≤3 glitch elements?
3. Palette-check final images against doc 02 §4 hexes; correct in post if drifted.

## 2. Live2D Production Guide

### Model Spec

- **Format:** Live2D Cubism 5, PSD source at 4096×4096, model displayed ~1200 px tall on web.
- **Layer separation (minimum):** hair front/side/back per twin tail (3 segments each for follow-through), ahoge (independent), face parts (brows ×2, eyes: white/iris/highlight/lids upper+lower, mouth: 9 shapes), head, neck, torso, arms upper/lower, sleeve paws, hoodie body/hood/drawstrings ×2, shorts, legs, halo (independent, 3 sub-layers: ring, glow, glitch fragments), 4–6 floating UI card layers, particle layer.
- **Parameters (Cubism standard + custom):** angle X/Y/Z (±30), body X/Y/Z, eye open L/R, eye smile, eyeball X/Y, brow L/R Y + form, mouth open + form, plus custom params: `ParamAhoge` (−1 droop → +1 perk), `ParamHaloGlitch` (0 steady → 1 fragmenting), `ParamHaloSpin`, `ParamTailBounceL/R`, `ParamBlush`, `ParamGremlin` (pupil shrink + grin morph), `ParamUICards` (visibility/orbit).

### Physics

- Twin tails: 3-pendulum chains each, high sway, exaggerated bounce (overshoot ~15%) — they are the personality; tune bouncier than realistic.
- Ahoge: 2-pendulum, fast response — it should react before the face does.
- Drawstrings, hood, halo micro-float: subtle secondary motion.
- Halo: NOT physics-driven; parameter-driven (it's a projection — it lags head movement by 100ms deliberately, like network latency; signature detail).

### Expression & Motion Set (deliverables for the rigger)

- **15 expressions** mapped from doc 02 §5 as .exp3 files.
- **Idle motions (loop, randomized):** breathing (4s cycle), blink (every 2–6s randomized, occasional double-blink), weight shift (20s), tail sway, halo slow spin, ahoge micro-twitch, occasional glance-around, rare (every ~3 min): stretch + yawn, checks an invisible phone, kicks a falling red pixel.
- **Reaction motions:** greet-wave (sleeve paw), laugh (head back + tail bounce), shock-jump, smug head-tilt, gremlin hunch, sleepy sway, celebration hop, "typing" loop (for chat).
- **Transitions:** all expression changes over 0.3–0.5s eased curves; emotional transitions route through a micro "neutral blink" frame so switches never pop.

### Facial Tracking (for live appearances)

- ARKit 52-blendshape mapping to Cubism params; mouth movement via audio-based lipsync (Cubism lipsync from voice waveform, 5 vowel shapes A/I/U/E/O + closed).
- Operator hotkeys: the 15 expressions on a stream deck; `ParamGremlin` and `ParamHaloGlitch` on dials for live comedy timing.

## 3. Animation Prompts (promo/video generation)

### Master Animation Style Block

```
2D anime animation, clean cel shading, character "Copium" [insert Core Identity Block],
smooth 24fps character animation with exaggerated squash-and-stretch on twin tails,
holographic UI elements animating with 8-frame glitch flickers,
neon cyan particle ambience, camera: gentle push-in, premium motion-graphics polish,
background: dark digital void with floating translucent panels
```

### Key Promo Sequences (production briefs)

1. **Boot-Up (brand ident, 4s):** black screen → single cyan cursor blink ×2 → glitch-burst → she assembles from pixel-sort fragments, halo ignites last with an audio ping → smug expression → wordmark. This is the intro sting for ALL video content.
2. **The Dose (loop, 6s):** she catches a falling giant capsule, taps it, it bursts into UI confetti reading today's dose text. Daily Dose social video template.
3. **It's So Over / We're So Back (10s):** split scene — red crashing chart, she deflates (crying-while-smiling) → beat → chart bounces one pixel → instant maximum-smug, sunglasses UI drops onto face reading "SO BACK". Her signature bit, animated.
4. **Streaming overlay package:** animated frame with halo-hexagon corner brackets, "COPIUM CLINIC — LIVE" ticker, chat-reactive particle burst, BRB screen (sleep-mode Copium + "rendering optimism…" progress bar stuck at 99%), starting-soon countdown where the numbers occasionally glitch into "SOON™".

### Audio Direction

- Palette: soft synthwave + UI bleeps; signature sound = the **halo ping** (a warm two-note chime with a subtle bitcrush tail) — use it like a sonic logo on every boot-up, achievement, and video sting.
- Voice spec (for TTS/VA casting): early-20s female, bright and quick, smug lilt, capable of deadpan flatness and sudden warmth; speaks slightly fast; laughs easily.
