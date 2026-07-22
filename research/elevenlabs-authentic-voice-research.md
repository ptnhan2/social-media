# ElevenLabs Default Voice Authenticity Research — Comprehensive Report

**Date:** 2026-07-22
**Queries:** 38 unique search queries
**Sources:** 50+ analyzed
**Scope:** Optimizing ElevenLabs default/library voices WITHOUT custom voice cloning

---

## 1. ALL ELEVENLABS SETTINGS THAT AFFECT NATURALNESS

### 1.1 Stability (0.0–1.0, default 0.5)

The single most impactful setting. LOWER = more expressive & varied. HIGHER = consistent but monotonous.

| Use Case | Recommended Stability | Source |
|----------|----------------------|--------|
| YouTube narration/documentaries | 35–45% | recharm.com, reviewnexa.com |
| Storytelling/podcasts | 40–55% | neuraplus-ai.github.io |
| Technical tutorials | 65–75% | neuraplus-ai.github.io |
| Audiobooks (long-form) | 60–75% | facelesshustle.ai |
| Character dialogue | 25–40% | aiproductivity.ai |
| Educational/explainer | 50–60% | michydev.com |

**Key insight from MichyDev (5M+ views):** "ElevenLabs defaults are tuned for enterprise narration, not viral short-form. They sound robotic on purpose. Drop stability to 30-40% — it's counterintuitive but essential."

**v3-specific:** Creative mode = most expressive but prone to hallucinations. Natural = closest to original recording. Robust = stable but less responsive to directional prompts. (ElevenLabs official docs)

### 1.2 Clarity + Similarity Enhancement (similarity_boost, 0.0–1.0, default 0.75)

| Use Case | Recommended Setting | Source |
|----------|---------------------|--------|
| Narrations | 75% | reviewnexa.com |
| Conversational | 70% | reviewnexa.com |
| Emotional content | 65–70% | reviewnexa.com |
| General purpose | 75–85% | neuraplus-ai.github.io |
| For Adam voice (documentary) | 75% | oreateai.com |

**Critical warning:** Above 80% introduces audio artifacts and metallic "ringing" sound (reviewnexa.com, facelesshustle.ai). Below 65% causes voice to lose natural tone. The sweet spot is 70–80%.

### 1.3 Style Exaggeration (style, 0.0–1.0, default 0.0)

| Use Case | Recommended Setting | Source |
|----------|---------------------|--------|
| YouTube narration | 0–10% | recharm.com |
| Marketing/ads | 30–45% | neuraplus-ai.github.io |
| Character dialogue | 30–60% | aiproductivity.ai |
| Meditation/ASMR | 10–20% | neuraplus-ai.github.io |
| Corporate/business | 0% (off) | oreateai.com |
| Documentary narration | 0–15% | facelesshustle.ai |
| Short-form/reels | 10–50% | reviewnexa.com, michydev.com |

**Warning:** Values above 60% introduce phonetic distortions and unnatural pitch swings (neuraplus-ai.github.io). Setting to 0 greatly increases generation speed (ElevenLabs docs). For v2 Multilingual model, you can push 15–25% for dramatic content (michydev.com).

### 1.4 Speaker Boost (boolean, default: true)

- ON for most use cases — boosts similarity to original speaker
- ON by default in ElevenLabs web UI (render count: Convai forum)
- Slight computational overhead but worth it for quality
- Always use ON unless doing experimental re-renders (michydev.com)

### 1.5 Speed (0.7–1.2, default 1.0)

| Value | Effect | Use Case |
|-------|--------|----------|
| 0.7 | Slowest | Tutorials, listening practice |
| 0.8–0.9 | Slower | Audiobooks, formal narration |
| 0.95–1.05 | Natural/match creator cadence | YouTube narration (michydev.com) |
| 1.1 | Fast | Quick updates, energetic |
| 1.2 | Fastest | Efficient delivery |

Supported on: Multilingual v2, Turbo v2.5, Flash v2.5 (NOT Flash v2). Range strictly 0.7–1.2. Values outside this range are rejected. (ElevenLabs API docs, UnifiedTTS)

### 1.6 Model Selection

| Model | Best For | Character Limit | Key Strength |
|-------|----------|-----------------|--------------|
| eleven_v3 | Emotional storytelling, drama, characters | 5,000 | Audio tags, 70+ languages, multi-speaker |
| eleven_multilingual_v2 | YouTube narration, audiobooks, long-form | 10,000 | Stability, consistency, natural breathing |
| eleven_turbo_v2_5 | Quality-speed balance | 40,000 | ~250ms latency, 32 languages |
| eleven_flash_v2_5 | Real-time, chatbots | 40,000 | ~75ms latency, 32 languages |

**Decision rule:** v2 for stable/educational YouTube narration; v3 for emotional/cinematic storytelling (recharm.com)

**Critical caveat:** v3 does NOT support SSML break tags. Use [pause], [short pause], [long pause] instead. Every other model supports `<break time="X.Xs" />`. (ElevenLabs help center)

### 1.7 The MichyDev "7 Settings That Make AI Reels Sound Human"

| # | Setting | Recommended Value |
|---|---------|-------------------|
| 1 | Stability | 30–40% |
| 2 | Similarity | 75–80% |
| 3 | Style Exaggeration | 15–25% |
| 4 | Speaker Boost | ON |
| 5 | Model | V3 for narration, V2 for character voices |
| 6 | Speed | 0.95–1.05 |
| 7 | [pause] markers | Explicit `[pause]` markers for dramatic moments |

Source: michydev.com (5M+ views across platforms)

---

## 2. ALL SCRIPT FORMATTING TECHNIQUES

### 2.1 Punctuation as Performance Direction

| Punctuation | Effect | Example |
|-------------|--------|---------|
| `.` (period) | Full stop, sentence-ending pause | "This matters." |
| `,` (comma) | Short pause, clause separation | "Look, here's the thing." |
| `…` (ellipsis) | Hesitation, trailing off, suspense | "I honestly didn't expect that…" |
| `—` (em dash) | Dramatic break, interruption | "Everything worked — until it crashed." |
| `!` (exclamation) | Energy, emphasis | "This changes everything!" |
| `?` (question) | Rising intonation | "But does it actually work?" |
| `""` (quotes) | Stress on quoted phrase | He called it "absolutely phenomenal." |
| Line break | Natural breathing pause between paragraphs | (blank line between sections) |

Sources: recharm.com, dtptips.com, vmeg.ai, imihir.com, artlist.io

### 2.2 Capitalization and Emphasis

| Technique | Effect | Reliability |
|-----------|--------|-------------|
| ALL CAPS word | Strong emphasis/stress | High — works on all models |
| "Quoted phrase" | Moderate stress, special attention | High |
| Capitalize first letter | Mild stress | Medium |
| Mixed case tricks (trapezIi) | Steers pronunciation stress | Works on all models (ElevenLabs docs) |

**Combined technique (dtptips.com):** Put key phrases in ALL CAPS inside quotation marks for maximum emphasis: The tiger showed the perfect balance of **"POWER AND GRACE"**.

### 2.3 Explicit Pause Methods

**For v2 models (Multilingual v2, Turbo, Flash):**
```
<break time="1.5s" />
```
- Maximum 3 seconds
- Too many break tags causes instability (speeding up, artifacts)
- Reserved for section headings and pre-conclusion beats

**For Eleven v3:**
```
[pause], [short pause], [long pause]
```
- No SSML break support in v3
- Also works: `[pause]`, `[hesitates]`, `[stammers]`

**Punctuation-based alternatives (less consistent but usable everywhere):**
- `---` or `-- --` for longer pause
- `—` (em dash) for mid-sentence break
- `…` (ellipsis) for hesitation

Sources: ElevenLabs help center, josuesomarribas.com, techbloat.com

### 2.4 Audio Tags (Eleven v3 ONLY)

**Voice/emotion control:**
| Tag | Effect |
|-----|--------|
| `[excited]`, `[happy]`, `[sad]`, `[angry]` | Emotional states |
| `[whispers]`, `[shouts]` | Volume/delivery |
| `[laughs]`, `[laughs harder]`, `[wheezing]` | Laughter variants |
| `[sighs]`, `[exhales]` | Audible exhale |
| `[sarcastic]`, `[curious]`, `[nervous]` | Delivery style |
| `[sorrowful]`, `[frustrated]`, `[calm]` | Emotional nuance |
| `[gulps]`, `[gasps]`, `[clears throat]` | Physical actions |
| `[crying]`, `[sobbing]`, `[snorts]` | Intense emotions |
| `[mischievously]`, `[tired]`, `[disgusted]` | Character/attitude |

**Sound effects:**
| Tag | Effect |
|-----|--------|
| `[gunshot]`, `[applause]`, `[clapping]` | Environmental |
| `[swallows]`, `[gulps]` | Physical |

**Special/Creative:**
| Tag | Effect |
|-----|--------|
| `[strong X accent]` | Accent direction |
| `[sings]`, `[woo]` | Vocal experiments |
| `[interrupting]`, `[overlapping]` | Dialogue cues |
| `[slow]`, `[fast]` | Pace control |

**Usage:** Tags must match voice natural characteristics. Don't expect a shouting-trained voice to whisper. Layer tags for nuance: `[nervously] I don't think this is... [gulps] Let's just go back.` (ElevenLabs v3 blog, webfuse.com)

### 2.5 The next_text API Trick (v2 models)

Source: Tommy Wilczek (Medium), github.com/i-am-neon

Use the `next_text` parameter in the API to inject emotional context that influences delivery WITHOUT being spoken aloud:

```
text: "You won't believe what I found"
next_text: "she shouted, angrily"
```

The model reads `next_text` as contextual direction (like a book narration tag) and adjusts delivery accordingly. Caveat: not always reliable; treat as a creative hack, not a production guarantee.

### 2.6 Text Normalization (Pre-Processing)

**Numbers to words:**
- `123` → "one hundred twenty-three"
- `$45.67` → "forty-five dollars and sixty-seven cents"
- `2nd` → "second"
- `3.5` → "three point five"
- `123-456-7890` → "one two three, four five six, seven eight nine zero"
- `01/02/2026` → "January second, twenty twenty-six"

**Abbreviations to expand:**
- `Dr.` → "Doctor" (but "St. Patrick" stays)
- `Ave.` → "Avenue"
- `100km` → "one hundred kilometers"
- `Ctrl + Z` → "control z"
- URLs → "eleven labs dot io slash docs"

**API:**
- `apply_text_normalization` parameter: "on", "off", or "auto"
- Multilingual v2 handles normalization better than Flash v2.5
- Flash v2.5 disables normalization by default for speed

Sources: ElevenLabs docs normalization section, github.com/elevenlabs/elevenlabs-docs

### 2.7 Conversational Writing Rules

1. **Break long paragraphs:** Split at 500–800 character chunks. Generate in segments rather than one huge block.
2. **Write for speech, not reading:** "Here's what actually works" not "The following methodology should be implemented."
3. **Use conversational hooks:** "So," "Honestly," "Here's the thing…", "Look,"
4. **Keep sentences 10–18 words:** Short sentences improve rhythm and prevent monotone.
5. **Eliminate fillers:** No "um", "uh", "like" unless intentionally placed for tone.
6. **Read script aloud test:** If a human stumbles reading it, the AI will fail harder.
7. **Avoid emojis and special characters:** They create awkward delivery.
8. **Use line breaks intentionally:** Create visual/rhythm separation for the AI.

Sources: recharm.com, imihir.com, artlist.io, queststudio.io

### 2.8 Complete Script Pre-Processing Pipeline (josuesomarribas.com)

```
Input script
  ↓
1. Strip markdown/link syntax
2. Expand numbers/figures to words
3. Spell out acronyms on first use
4. Insert structural break tags at section boundaries
5. Generate in 500-word chunks
```

---

## 3. ALL POST-PROCESSING TECHNIQUES

### 3.1 The Complete Voiceover Audio Chain

Source: Sonarworks, Baywood Audio, Vois.so, Lenny B

**Recommended processing chain order:**
```
1. High-Pass Filter (80–100 Hz) — remove rumble
2. Subtractive EQ — cut problem frequencies
3. Compression — even out dynamics (3:1 or 4:1 ratio)
4. De-Esser (5–8 kHz) — tame sibilance
5. Additive EQ/Presence — boost clarity
6. Limiter — prevent clipping at -1.0 dB
7. Loudness Normalization — target platform LUFS
```

### 3.2 EQ Frequency Table for AI Voice

| Frequency | Issue | Fix |
|-----------|-------|-----|
| <80 Hz | Rumble, sub-bass noise | High-pass filter at 80 Hz |
| 80–250 Hz | Boomy, muddy, proximity overload | Gentle cut |
| 200–400 Hz | Muddiness | Cut 2–4 dB |
| 250–800 Hz | Boxiness, "cardboard" sound | Wide subtractive cut |
| 500 Hz | Boxiness (narrow) | Narrow cut |
| 700 Hz–1.2 kHz | Nasal, honky | Narrow cut |
| 1.5–4.5 kHz | Presence, clarity, harshness | Gentle boost for intelligibility |
| 2–4 kHz | Harshness from over-boost | Cut if fatiguing |
| 3–5 kHz | Presence — makes voice "cut through" | +2–3 dB boost |
| 5–8 kHz | Sibilance ("s", "t" sounds) | De-esser, 3–6 dB reduction |
| 8–12 kHz | AI-specific harsh artifacts | Dynamic EQ, fast attack |
| 10–16 kHz | Air, sparkle — adds openness | +2–3 dB shelf boost |
| 12–16 kHz | AI sibilant over-extension | Dynamic EQ, 1–3 ms attack |

**AI-specific note (Sonarworks):** AI-generated voices extend sibilance up to 12–16 kHz — beyond normal human vocal range. Use multiband dynamic EQ at 4–8 kHz, 8–12 kHz, and 12–16 kHz bands with fast attack (1–3ms) to control synthetic artifacts.

### 3.3 Compression Settings

| Content Type | Ratio | Attack | Release |
|-------------|-------|--------|---------|
| YouTube narration | 3:1 or 4:1 | 10–20ms | 100ms |
| Documentary | 3:1 | 10ms | 80ms |
| Fast-paced content | 4:1 | 5–10ms | 50ms |

Goal: smooth volume levels, fuller studio sound (recharm.com, baywoodaudio.com)

### 3.4 De-Essing (AI-Specific)

AI voices need stronger de-essing than human recordings:
- Target: 5–8 kHz (primary), 8–12 kHz (AI-specific)
- Reduction: 3–6 dB on sibilant peaks only
- Use multiband de-esser for AI voices
- Place AFTER compression in the chain

Sources: Sonarworks blog, Baywood Audio

### 3.5 LUFS Normalization Targets

| Platform | Target LUFS | True Peak |
|----------|------------|-----------|
| YouTube | -14 LUFS | Below -1.0 dB |
| Spotify | -14 LUFS | Below -1.0 dB |
| Apple Podcasts | -16 LUFS | Below -1.0 dB |
| ACX/Audible | -18 to -23 LUFS | Below -3.0 dB |

Source: vois.so, auphonic.com

### 3.6 Subtle Enhancements for "Humanizing"

| Technique | How | Why |
|-----------|-----|-----|
| Subtle pitch variation | Light pitch correction with slow correction speed | Human voices naturally fluctuate slightly |
| Harmonic saturation | Subtle tape/tube saturation | Adds organic warmth AI voices lack |
| Light room reverb | Small room, 1.5–2.5s decay, 20–40ms pre-delay | Makes voice feel like it exists in physical space |
| Breath addition | Keep/reintroduce natural breaths | Over-cleaned audio sounds synthetic |

Sources: Sonarworks blog, recharm.com, baywoodaudio.com

### 3.7 iZotope RX — Industry Standard for AI Voice Cleanup

The #1 must-have for voiceover post-production (UAD Forum consensus). Features: de-essing, noise removal, mouth de-click, breath control.

### 3.8 Auphonic.com — Automated Option

Free 2 hours/month. Automated LUFS normalization, EQ, compression, noise reduction. Used by BBC, iHeartRadio, MSNBC. Good for creators who don't want manual audio engineering.

---

## 4. AI VOICEOVER + BACKGROUND MUSIC

### 4.1 Mixing Rules

1. **Voice ALWAYS takes priority** — music supports, never competes
2. **Music at 10–15% volume** of narration level (longstories.ai)
3. **Auto-ducking:** Automatically reduce music volume when voice is speaking
4. **Manual keyframes better than auto-ducking:** For intentional moments (pauses, punchlines, dramatic beats)
5. **Test on phone speakers** — viewers hear on phone speakers, not studio headphones

### 4.2 Audio Ducking Workflow (CapCut)

Source: cursa.app (CapCut audio guide)

**Method A — Manual Keyframing:**
1. Set music base level ~ -18 to -22 dB
2. Before speech starts: add keyframe at base level
3. At speech start: add keyframe lowering to -25 to -30 dB
4. At speech end: add keyframe raising back up
5. Make transitions quick but not instant (~200ms ramp)

**Method B — Auto Ducking:**
1. Select music track
2. Enable Auto Ducking
3. Set strength for clear voice
4. Fine-tune problem sections manually

### 4.3 Music Selection Tips

- Match music mood/tempo to video theme
- Adjust dynamically: softer during narration, louder during pauses/montages
- AI-generated music preferred (Soundverse, Mubert, Soundraw) — no copyright issues
- Original music performs better with YouTube algorithm (YouTube penalizes reused tracks)
- 10–15% volume of voice during narration sections

Sources: soundverse.ai, longstories.ai, cursa.app

### 4.4 SFX Integration

- Keep effects brief, precisely placed
- Volume below voiceover
- One well-placed effect = twenty cluttered ones
- Comedic SFX after punchlines, dramatic stings at key moments

Source: tryaivoices.com

---

## 5. COMPLETE WORKFLOW

### 5.1 Script Preparation → ElevenLabs Settings → Post-Processing → Final Output

```
PHASE 1: SCRIPT NORMALIZATION (PRE-TTS)
├── Strip markdown, links, emojis
├── Expand all numbers → words
├── Expand abbreviations (Dr. → Doctor)
├── Spell out dates, currencies, URLs
├── Add conversational hooks ("So,", "Here's the thing…")
├── Insert pause markers at section breaks
│   ├── v2: <break time="1.0s" />
│   └── v3: [long pause] or …
├── Break into 500-800 character chunks
├── Add audio tags for emotion (v3 only)
│   └── [excited], [whispers], [sighs], etc.
└── Read aloud test: if you stumble, rewrite

PHASE 2: VOICE SELECTION & SETTINGS
├── Choose voice library voice matching content tone
│   ├── Test 3-5 voices with same 30-second script
│   ├── "Informative" voices → explainers
│   ├── "Conversational" voices → storytelling
│   └── "Energetic" voices → ads/fast content
├── Model selection:
│   ├── YouTube narration → Multilingual v2
│   ├── Emotional storytelling → Eleven v3
│   └── Real-time → Flash v2.5
├── Voice settings:
│   ├── Stability: 35–45% (v2) or Natural (v3)
│   ├── Similarity: 70–80%
│   ├── Style Exaggeration: 0–15% (narration), 0–0% (corporate)
│   ├── Speaker Boost: ON
│   └── Speed: 0.95–1.05
└── Generate in chunks (not one massive text block)

PHASE 3: AUDIO POST-PROCESSING
├── High-Pass Filter: 80 Hz
├── Subtractive EQ: Cut mud at 200–400 Hz, nasal at 700–1200 Hz
├── Compression: 3:1 or 4:1, 10–20ms attack, 80–100ms release
├── De-Esser: 5–8 kHz primary, 8–12 kHz AI-specific
├── Additive EQ: +2–3 dB at 3–5 kHz presence, +2–3 dB shelf at 10 kHz+ air
├── Harmonic saturation: Subtle tape/tube warmth
├── Pitch variation: Very subtle (slow correction speed)
├── Light reverb: Small room, 20–40ms pre-delay, mix 5–10% wet
├── Limiter: -1.0 dB ceiling
└── LUFS Normalization: -14 LUFS (YouTube)

PHASE 4: FINAL MIX
├── Import voiceover to video editor (CapCut/DaVinci Resolve/Premiere)
├── Add background music at 10–15% voice volume
├── Enable auto-ducking or manual keyframes
├── Add SFX sparingly where needed
├── Render with correct export settings (AAC/MP3 320kbps)
└── Final listen on phone speakers + headphones
```

### 5.2 The MichyDev Complete Reel Workflow

```
Script → 7 voice settings → Generate → Pulse-check first 3 seconds → 
Re-edit in CapCut → Post-processing chain → Publish
```

Key rule: **Regenerate every clip. Never reuse audio across videos** (pattern recognition triggers platform flags).

---

## 6. WHAT FACELESS CHANNELS DO WITH ELEVENLABS

### 6.1 Common Production Patterns

From Reddit (r/YT_Faceless, r/thesidehustle) and creator guides:

**Standard solo workflow:**
```
ChatGPT script → ElevenLabs voiceover → Stock footage/visuals → 
CapCut edit + captions → Upload with metadata
```
Time: 8–10 hours per 10-min video (reported by r/YT_Faceless user)

**Optimized workflow (2-3 hours):**
```
AI script → ElevenLabs chunked generation → Template-based visual assembly →
Automated caption generation → Batch processing multiple videos
```

**Daily posting stack:**
- ElevenLabs Starter ($5-6/month)
- CapCut Pro ($19.99/month) or free
- Canva (free) for thumbnails
- ChatGPT or Claude for scripts

### 6.2 Faceless Channel Monetization Data

| Niche | CPM Range | Monthly Income (100K views) |
|-------|-----------|---------------------------|
| Finance/Investing | $15-$50 | $1,500-$5,000 |
| Tech/Software | $10-$30 | $1,000-$3,000 |
| True Crime/Documentary | $8-$20 | $800-$2,000 |
| Education/History | $5-$15 | $500-$1,500 |
| Compilation/Entertainment | $2-$8 | $200-$800 |

Source: genra.ai, faceless.my

### 6.3 YouTube 2026 AI Content Policy

- Must disclose synthetically generated content (YouTube 2026 update)
- Demonetized: mass-produced slideshow + AI narration with no original research
- MONETIZED: Channels with real research, original perspective, production effort
- AI voice cloning of someone else = mandatory disclosure
- Penalties: removal from YPP, potential channel suspension

Source: shortimize.com, voicecreator.pro

### 6.4 ElevenLabs Plan Recommendations for Faceless

| Plan | Monthly Cost | Characters | Videos/Month |
|------|-------------|-----------|--------------|
| Free | $0 | 10,000 | ~2-3 short videos |
| Starter | $5-6 | 30,000 | ~5-8 short videos |
| Creator | $22 | 100,000 | ~12-15 long-form OR 50-100 Shorts |
| Independent Publisher | $99 | 500,000 | ~60-75 long-form |

Source: fluxnote.io

---

## 7. SPECIFIC CAPCUT AUDIO EDITING FEATURES

### 7.1 CapCut Audio Enhancement Chain

Source: cursa.app (CapCut beginner audio chain)

```
Voice clip selected
  ↓
1. Normalize Loudness (consistent baseline)
2. Noise Reduction (light, avoid "watery" artifacts)
3. Voice Enhance / EQ (subtle clarity boost)
4. Compressor / Limiter (control peaks if available)
```

**Specific CapCut tools:**
- **Enhance Voice:** AI-powered, 0–100% slider. Improves clarity automatically.
- **Normalize Loudness:** One-click consistent volume across all clips.
- **Noise Reduction:** Reduces background hiss. Start low, increase gradually.
- **Voice Effects:** Built-in presets for quick tonal changes (Deep, Chipmunk, Robot etc.)
- **Pitch Tuning:** Real-time pitch adjustment for creative effects.
- **Auto Echo Reduction:** Automatically removes echo from recordings.
- **Auto Ducking:** Reduces music volume when voice is active.
- **Audio Extract:** Pull audio from video files for remixing.

### 7.2 CapCut Audio Mixing Workflow

```
Voice track (primary)
├── Enhance Voice: 50–70%
├── Normalize Loudness
├── Noise Reduction: light
└── EQ preset: "Vocal" or manual presence boost

Music track (secondary)
├── Volume: ~15–25% of voice
├── Auto Ducking: enabled, moderate strength
└── Manual keyframes for dramatic sections

SFX track (tertiary)
├── Volume: below voice, above music in quiet moments
└── Place precisely at emotional moments (punchlines, reveals)
```

### 7.3 CapCut Quick Voice Enhancement

On Desktop: Select clip → Right panel → "Audio" tab → Enable "Enhance Voice" → Slide to desired clarity level.

On Mobile: Select clip → "Audio" → "Enhance Voice" → Adjust strength.

Source: hollyland.com, capcut.com, cursa.app

### 7.4 Known CapCut Bug

Applying pitch/speed change to AI voice clip, then trimming/splitting it, resets the effect on export. **Fix:** Export the audio with effect applied first, reimport, then edit.

Source: capcutguide.com

---

## 8. AUTOMATED TOOLS & SCRIPTS FOR ELEVENLABS OUTPUT

### 8.1 Text Pre-Processing Automation

From josuesomarribas.com — a 20-line pre-processing script that:
1. Strips markdown/link syntax
2. Expands figures into words ("12% lift" → "twelve percent lift")
3. Spells out acronyms on first use
4. Inserts structural `<break>` tags at section boundaries

### 8.2 Chunked Generation Tools

**dub-chunk (GitHub: thiagoghisi):**
- Splits transcripts into paragraphs
- Generates one TTS clip per paragraph
- Stitches with natural configurable pauses
- Maintained voice consistency across 204 API calls (zero issues over 102 minutes of output)

**ElevenLabs Python SDK (built-in):**
- `text_chunker()` function automatically splits at 15 sentence boundary characters
- Supports streaming via WebSocket for real-time applications
- Built into the official elevenlabs-python package

### 8.3 Fully Automated Pipeline Example

The `dub-chunk` tool represents the ideal automated workflow:
```
Transcript → Parse → Consolidate same-speaker → 
Generate per-paragraph via ElevenLabs API → 
Stitch with pause gaps → Output finished MP3
```

Requirements: Python 3.10+, ffmpeg, ElevenLabs API key
Result: 96-min interview dubbed into English with 2 cloned voices, 204 API calls, zero consistency issues.

### 8.4 Auphonic (Standalone Service)

AI-powered audio post-processing:
- Free 2 hours/month
- Automatic LUFS normalization, EQ, compression, noise reduction
- API available for integration into automated pipelines
- Used by BBC, iHeartRadio, MSNBC
- Can be triggered via Zapier for "upload → process → download" automation

---

## SOURCE INDEX

| # | Source | Key Contribution |
|---|--------|-----------------|
| 1 | michydev.com | 7 settings guide, stability 30-40%, $27 blueprint |
| 2 | recharm.com | Complete humanizing guide, v2 vs v3, post-processing |
| 3 | reviewnexa.com | 18-month testing, stability 35-40%, similarity 75-80% |
| 4 | aiproductivity.ai | Use-case-specific table: narration/ads/character/IVR |
| 5 | neuraplus-ai.github.io | Stability 50-75%, clarity 75-90%, style 20-50% ranges |
| 6 | facelesshustle.ai | Audio-specific settings: stability 60-75%, chunk at 500 words |
| 7 | zyncai.com | Complete voice settings guide per content type |
| 8 | oreateai.com | Adam voice deep dive, documentary settings |
| 9 | ElevenLabs official docs (best-practices) | SSML, audio tags, normalization, emotion control |
| 10 | ElevenLabs API docs (settings/update) | Full parameter reference: stability, similarity_boost, style, speed, speaker_boost |
| 11 | ElevenLabs help center | Break tags vs v3 pause tags, model support matrix |
| 12 | ElevenLabs blog (v3 audio tags) | Complete tag reference: emotions, sounds, special |
| 13 | webfuse.com | Cheat sheet: models, voices, settings |
| 14 | dtptips.com | ALL CAPS + quotes emphasis technique |
| 15 | vmeg.ai | Punctuation + capital emphasis, 3 emphasis methods |
| 16 | aivoicelab.com | Complete audio tag reference table, emphasis guide |
| 17 | Tommy Wilczek (Medium) | next_text API trick for emotional context |
| 18 | github.com/i-am-neon | Emotional ElevenLabs voices demo |
| 19 | josuesomarribas.com | SSML model matrix, pre-processing pipeline |
| 20 | imihir.com | Script formatting guide, 10-18 word sentences |
| 21 | artlist.io | Script-first approach, punctuation timing |
| 22 | queststudio.io | 17 fixes for human-sounding AI voice |
| 23 | techbloat.com | Complete pause methods guide |
| 24 | techharry.com | Emotional voice settings step-by-step |
| 25 | ElevenLabs normalization docs | Full text normalization guide + Python/TypeScript examples |
| 26 | ElevenLabs Magazine | Flash v2.5 normalization caveats |
| 27 | calesthio/generative-media-skills | Complete spoken-text preparation ladder |
| 28 | Sonarworks blog | AI-specific de-essing, multiband dynamic EQ, saturation |
| 29 | Baywood Audio | Complete vocal chain: HPF→EQ→Comp→De-Ess→Additive EQ→Reverb |
| 30 | vois.so | LUFS targets, de-essing at 7kHz, limiting at -1.0 dB |
| 31 | cursa.app | CapCut audio chain: Normalize→Noise Reduce→EQ→Limiter |
| 32 | tryaivoices.com | CapCut voiceover + music mixing tips |
| 33 | capcutguide.com | CapCut bug: pitch reset on trim |
| 34 | hollyland.com | CapCut enhance voice feature |
| 35 | soundverse.ai | AI music for YouTube automation channels |
| 36 | longstories.ai | Background music at 10-15% voice volume |
| 37 | thiagoghisi/eleven-labs-dubbing-chunking | Chunked TTS pipeline, 204 API calls zero issues |
| 38 | ElevenLabs SDK (elevenlabs-python) | text_chunker, realtime_tts |
| 39 | reddit r/YT_Faceless | Real workflow data, 8-10 hours per video |
| 40 | voicecreator.pro | YouTube 2026 AI policy, disclosure requirements |
| 41 | shortimize.com | YouTube 2026 monetization rules |
| 42 | genra.ai | Faceless channel income data, CPM rates |
| 43 | faceless.my | Top AI faceless channels analysis |
| 44 | steamcommunity.com | Creator discussion on ElevenLabs settings |
| 45 | fluxnote.io | ElevenLabs pricing, plan recommendations |
| 46 | narrato.io / narrationbox.com | Why AI voice sounds robotic, fix methods |
| 47 | playhtai.com | 10-step fix robotic AI voiceovers |
| 48 | clippie.ai | Top 10 AI tools for faceless YouTube 2026 |
| 49 | neuraplus-ai.github.io (faceless guide) | Complete faceless video workflow |
| 50 | fyreinteractive.co | Reddit/Quora for script research |
| 51 | bitdegree.org | ElevenLabs review with settings guide |
| 52 | mspoweruser.com | ElevenLabs review with plan comparison |
| 53 | aifire.co | Complete ElevenLabs usage guide |

---

## QUICK REFERENCE CARD

### ElevenLabs Settings — YouTube Narration (Default Voice)

```
Model:          eleven_multilingual_v2 (stable narration)
                 OR eleven_v3 (emotional/cinematic)
Stability:      35–45% (v2) / Natural (v3)
Similarity:     75–80%
Style:          0–15%
Speaker Boost:  ON
Speed:          0.95–1.05
```

### Script Before Generation

```
1. Expand all numbers, dates, currencies to words
2. Add [pause] / ... / <break time="X.Xs" /> at section breaks
3. ALL CAPS for key emphasis words
4. Break into 500-800 char chunks
5. v3: Add [emotion] tags at sentence start
6. Read aloud test
```

### Post-Processing Chain

```
High-Pass 80Hz → Cut mud 200-400Hz → Cut nasal 700-1200Hz →
Compression 3:1 → De-Ess 5-8kHz → Boost presence 3-5kHz +2dB →
Air shelf 10kHz+ +2dB → Limiter -1.0dB → Normalize -14 LUFS
```

### CapCut Mixing

```
Enhance Voice 50-70% → Normalize Loudness → 
Background music at 15% voice → Auto Ducking ON
```
