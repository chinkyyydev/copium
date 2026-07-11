# 06 — Website UX Specification

## 1. Product Concept

**copium.gg** (or .ai/.wtf) — "The Copium Clinic." Not a chatbot page: a *place*. The site is framed as a slightly-too-cheerful digital clinic where the internet gets its dose. Visiting should feel like entering a VTuber's stream room crossed with a cyberpunk pharmacy — alive, reactive, personal.

Design language: dark-mode native, Void Black base, Neon Cyan accents, floating particles, holographic UI panels with 1 px cyan borders and subtle scan lines. Glitch effects on interaction only (hover, transition), never idle-spammed. 60fps or the effect gets cut. Mobile-first: 70%+ of traffic will arrive from X on phones.

## 2. Information Architecture

```
/            → Hero + Live2D Copium + chat entry (the entire core loop on one page)
/dose        → Daily Dose of Copium (shareable daily card)
/memes       → Meme generator
/profile     → Relationship stats, XP, badges, achievements, streaks
/lore        → Character lore, expression gallery, world
/feed        → Embedded highlights of her best X posts (SEO + conversion)
```

Nav is a slim floating pill bar (bottom on mobile, top on desktop): Home · Dose · Memes · Profile.

## 3. Landing Page Layout (top to bottom)

1. **Hero (100vh).** Live2D Copium center-stage (desktop: right third; mobile: upper half), idle-animating, eyes tracking cursor/touch. Behind her: dynamic background (see §8). Left/below: the wordmark, one rotating tagline ("your daily dose, administered digitally"), and a single input field with placeholder text that cycles in-character ("tell me your L, patient…", "type something. i'm literally always here…"). **The input IS the CTA.** No "Sign up" wall — first message is instant, anonymous.
2. **First-response moment.** On first message, she greets, the halo boots up with a sound cue (muted by default, toggle visible), and a toast introduces the relationship meter at 0%: "patient intake complete."
3. **Scroll section 2 — Daily Dose preview.** Today's dose as a holographic prescription card + "get your personalized dose" CTA.
4. **Scroll section 3 — social proof.** Live-ish wall of her top X posts and fan reactions.
5. **Scroll section 4 — the Clinic Program.** Explains XP, levels, badges in-character ("loyalty is measured. nothing else here is.").
6. **Footer.** Links, disclaimer in-voice ("copium is not medical, financial, or good advice"), 404/500 pages fully in-character.

## 4. The Chat Experience (core product)

- **Avatar-first chat:** Live2D model reacts *while typing responses* — expression pre-empts the text (she grins before delivering a tease). Message bubbles styled as holographic cards; her typing indicator is the halo displaying a loading spinner + "generating cope…".
- **Typing animation:** streamed token-by-token with variable cadence — bursts and micro-pauses that feel like a fast typist, not a teleprinter. Occasional in-character self-corrections ("wait. no. better idea—") rendered as real-time strikethroughs. This is the #1 "feels alive" detail.
- **Idle behavior:** if the user goes quiet 45s, she does an idle animation; at 2 min she may send ONE nudge in-character ("still there or did you alt-tab to check the charts. it's the charts isn't it"). Never more than one nudge per session (anti-annoyance rule).
- **Voice interaction (v2):** push-to-talk mic button; she replies with a distinctive voice (spec: bright, quick, slightly smug timbre; SSML-tuned smirks and sighs). Voice output toggleable; captions always on.
- **Personality engine rules:** the 5% sincerity rule applies in chat; she remembers and references earlier messages in-session; safety layer redirects genuinely distressed users to a sincere register + real help resources — the comedy mask drops instantly when someone is actually hurting. This is non-negotiable and also the moment users fall in love with the character.

## 5. Memory System

- **Tier 0 (anonymous):** localStorage session memory — name, running jokes, last visit. Zero-friction.
- **Tier 1 (free account, one-click OAuth):** persistent memory — remembers your name, your recurring struggles ("how'd the exam go. THE exam. you know the one"), your streak, your inside jokes. Memory recall lines are visually marked with a small 💾 glint so users *notice* being remembered.
- Memory is user-visible and deletable ("my file at the clinic") — trust feature and GDPR hygiene in one.
- **Personalized greetings** on return, generated from memory + streak + time of day: "back at 1am again. we don't judge here. we chart."

## 6. Gamification (the Clinic Program)

| System | Mechanic | In-character framing |
|--------|----------|---------------------|
| **Relationship meter** | 0–100% per level, grows via visits, chats, streaks | "patient trust" |
| **Friendship levels** | 10 levels: Stranger → Visitor → Regular → Patient → Preferred Patient → Case Study → Chronic → Inner Circle → Cope Dealer → **Terminal (max)** | Each level unlocks: new greeting styles, expression stickers, chat themes, and at high tiers, lore reveals she "doesn't tell everyone" |
| **XP** | Chats, daily dose claims, meme creation, sharing (verified via return-link) | "dosage accumulation" |
| **Streaks** | Daily visit streak with 1 free "sick day" per week (forgiving design — punishing streaks kill retention) | "treatment adherence" |
| **Achievements** | ~50 at launch, comedic: "Night Shift" (chat 3–5am), "It's So Over" (tell her about 10 losses), "We're So Back" (return after 30-day absence — celebrates lapsed users instead of guilting them) | Framed as "diagnoses" |
| **Collectible badges** | Seasonal + event badges, displayed on profile; some earnable only during live events (FOMO with a smile) | "clinic merit pins" |

Anti-dark-pattern stance: streaks never guilt-trip, no pay-to-level, all gamification is celebration-shaped. The brand is cope, not exploitation.

## 7. Feature Specs

- **Daily Dose of Copium (/dose):** one tap → personalized prescription card (her art + dose text + user's name + date) rendered as a shareable image with watermark. New dose daily; claiming feeds the streak. THE growth feature — every share is a branded artifact on someone else's feed.
- **Meme generator (/memes):** her 15 expressions as templates + text tool in brand typography + optional "let her write the caption" AI assist. Output watermarked `copium.gg`. Weekly featured-meme spotlight (community loop).
- **Achievements toast style:** full-width glitch-slide banner + halo ping sound. Dopamine, briefly.

## 8. Dynamic Backgrounds & Ambient Systems

- Background = time-of-day reactive: dawn gradient / day clean-white mode / dusk purple / night Void Black with drifting cyan particles ("the servers breathe at night").
- Ambient particles react to chat sentiment: Ws trigger brief emerald confetti-pixels; Ls trigger a single falling red pixel she visibly kicks off-screen (signature micro-interaction).
- prefers-reduced-motion: full static fallback, all information preserved.

## 9. Core User Flows

**Flow A — First visit (X → fan):**
Lands from a post → hero, she's already looking at their cursor → types anything → instant reply in-voice → 3–4 exchanges → she offers today's dose → dose card generated with their name → "save your file?" (one-click OAuth) → account, streak day 1, achievement #1 "Patient Intake." Time to value: under 60 seconds, zero walls before the magic.

**Flow B — Daily return:**
Open site → personalized greeting referencing memory → claim dose (streak++) → optional chat → share card to X (XP) → out in 90 seconds. Designed as a *snack*, not a meal — daily habit loops must be short.

**Flow C — Meme creation:**
/memes → pick expression → write or AI-assist caption → render → share/download → watermark drives new Flow A visitors.

**Flow D — Distress catch:**
User expresses genuine crisis signals → comedy register drops → sincere voice + region-appropriate help resources + gentle handoff → no gamification pings during this state. Logged for safety review.

## 10. Technical Notes (for the build team)

- Stack suggestion: Next.js + pixi.js/Live2D Cubism SDK for web; edge-streamed LLM responses; Redis for session memory, Postgres for accounts.
- Live2D asset budget: <4MB initial model load with skeleton-first progressive load; static PNG fallback with blink loop for low-end devices.
- All AI responses pass a brand-voice + safety filter layer before render.
- Latency target: first token <1.2s. Personality dies at 5 seconds.
