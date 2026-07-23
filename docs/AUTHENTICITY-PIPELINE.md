# Authenticity Pipeline — Stack-Optimized (No Tool Changes)

> Researched July 22, 2026 from 150+ sources.
> Core principle: OPTIMIZE the existing stack (ElevenLabs default + Open Design + CapCut), NOT replace it.

---

## 1. ElevenLabs Default Voice Optimization

### Settings (from 50+ sources)

| Setting | Value | Why |
|---------|-------|-----|
| **Stability** | **35-45%** (LOW) | Counter-intuitive — low stability = natural variation, not robotic |
| Similarity | 75-80% | Consistent but not stiff |
| Style | 0-15% | Low for narration — high = over-dramatic |
| Speaker Boost | ON | Clarity |
| Speed | 0.95-1.05 | Slightly slower = more natural |
| Model | Multilingual v2 (narration) / Eleven v3 (emotion) | v3 supports audio tags |

### Script Formatting = Performance Direction

**Language**: Script = English. User drafts hook in Vietnamese → agent translates to English preserving voice. Agent provides Vietnamese summary per section for user to verify logic.

| Technique | Effect | Example |
|-----------|--------|---------|
| `...` (ellipsis) | Natural pause, hesitation | "AI can't write subtext... and here's why." |
| `—` (em dash) | Dramatic break | "The problem isn't the model — it's the training." |
| ALL CAPS | Emphasis | "AI LITERALLY cannot do this" |
| `"quotes"` | Emphasis shift | The model treats this as "important" |
| Expand numbers | Correct reading | "twenty twenty-six" not "2026" |
| Chunks 500-800 chars | Separate files, reduce artifacts | Each chunk = 1 segment |

### ElevenLabs v3 Audio Tags

```
[excited] AI can actually do this!
[whispers] But there's a catch...
[sighs] And that's why most AI novels fail.
[narration] The context window problem is simple.
```

### Post-Processing Chain (CapCut or DAW)

```
1. HPF 80Hz (cut low rumble)
2. Subtractive EQ: cut mud 200-400Hz, nasal 700-1200Hz
3. Compression 3:1 ratio
4. De-esser 5-8kHz (AI voice needs STRONGER de-essing — extend to 12-16kHz)
5. Presence boost +2dB at 3-5kHz
6. Air shelf +1dB at 10kHz+
7. Subtle saturation (add warmth, reduce "too clean")
8. Light reverb (add physicality — AI voice has no spatial presence)
9. Limiter -1.0dB
10. Normalize -14 LUFS (YouTube standard)
```

**Key insight**: AI voice sounds fake because it's too "perfect." Saturation + reverb = physicality. Stronger de-essing = reduce TTS sibilance.

---

## 2. Open Design + CapCut Pipeline

### Open Design: DESIGN.md = Brand Contract

Create one `DESIGN.md` that locks:
- Palette: 2 primary + 1 accent (exact hex)
- Typography: font stack + weights
- Lighting style: 1 phrase ("golden hour side-light, cinematic")
- Composition: 2 rules max ("rule of thirds, subject lower-left")
- Anti-patterns: "NO purple gradients, NO emoji icons, NO Inter-as-display"

Every video: same DESIGN.md, different composition → consistency without sameness.

### Open Design: Anti-Slop Engine (Built-in)

- Vision self-critique: screenshots own output → scores → iterates until pass
- Hallmark anti-slop: 21 macro structures, detects generic patterns
- Sketch phase: 2-3 throwaway directions before committing
- Humanizer: strips AI tells (em-dashes overuse, "moreover," "furthermore")

### Voice-Led Editing (CRITICAL)

```
1. Generate ElevenLabs audio FIRST
2. Measure exact duration per segment (FFmpeg: ffprobe)
3. Pass durations to Open Design → generate visuals to MATCH audio
4. Import both into CapCut
5. Audio sets the timeline, visuals support
```

### CapCut Settings

| Technique | Setting | Purpose |
|-----------|---------|---------|
| Auto-captions | Montserrat Bold, black stroke 15px, spring anim 0.1s, max 3 words | Retention + accessibility |
| Enhance Voice | Strength 50-70% | Clean AI voice |
| Normalize Loudness | -14 LUFS | YouTube standard |
| Background music | -22dB or lower | Don't compete with voice |
| Film grain overlay | Subtle | **CRITICAL** — masks AI "too perfect" look |
| Transitions | 90% hard cuts, 10% creative | Hard cuts = pro, fades = amateur |
| Visual change | Every 1.8-2.5 seconds | Prevent viewer loss |
| Pattern interrupts | Every 90-120s | Reset attention |
| Color grade | Consistent LUT | Visual identity |

**Key insight**: Film grain = #1 technique to make AI visuals not look AI. AI makes everything mathematically perfect — grain adds randomness we associate with real cameras.

---

## 3. Content/Process Authenticity (No Tool Changes)

### ⚠️ CRITICAL: "Alive" vs "Mechanical" — The Difference That Matters

> Research from web5ngay (4.24M subs), Vui Vẻ (1.2M subs), Kurzgesagt (23M subs), Zenn (150K+ in 2 months).
> Passing compliance ≠ being engaging. Content must FEEL alive, not just pass review.

| Mechanical (AVOID) | Alive (TARGET) |
|---|---|
| Opens with "Section 1: Myth — nhiều writer cố..." | Opens with a SCENE: "Bạn viết với AI 3 tiếng. Output hoàn hảo. Và bạn xóa hết." |
| Explains concepts like Wikipedia definition | Shows someone SUFFERING without the concept first |
| Evidence = list of sources | Evidence = STORY with tension and characters |
| Ends with "3 quy tắc prompt" | Ends with snap-back to viewer's life: "AI không hỏng. Nó được tối ưu cho mục đích khác." |
| Sounds like anyone could have made it | Sounds like only THIS channel could have made it |
| No POV — just facts | Strong POV — "this is how I see it" |
| Smooth, resolved, no friction | Has rough edges, admits uncertainty, leaves some things complex |

### Core Principle: "Show Suffering Before Framework"

> **DON'T explain the framework first. Show someone suffering WITHOUT it first.**

❌ "Sanderson's Second Law states that limitations are more important than powers."
✅ "Here's a mistake that killed more fantasy novels than bad prose ever did. The hero is trapped. The villain is closing in. And suddenly — the hero discovers a NEW magic power. One the reader has never heard of. One that solves everything. The reader closes the book."

### The 3-Beat Hook (from Zenn channel — 7.6M views)

```
Beat 1 (Pull in): Second person, present tense, sensory detail about viewer's experience
Beat 2 (Flip): "But..." + surprising contrast
Beat 3 (Seal): Open loop — what we're about to explore
```

**Example for Craft × AI:**
- Beat 1: "You've been writing with AI for three hours. The output is grammatically perfect. Technically correct."
- Beat 2: "And completely lifeless. You can FEEL something is off, but you can't name what."
- Beat 3: "The problem isn't your prompt. It's not the model. It's something deeper — and once you see it, you can't unsee it."

### The Snap-Back Close (from Zenn, Kurzgesagt)

Every video ends by connecting the topic back to the viewer's personal life:

❌ "In conclusion, the 3 prompt rules are: don't name emotions, give subtext separately, use dialogue constraints."
✅ "AI isn't broken. It's optimized for a different purpose than fiction. Your prompts bridge that gap — but only if you understand the gap exists. The model will always want to explain. Your job is to let it imply."

### web5ngay Personality Injection Techniques

From web5ngay (4.24M subs, faceless, Vietnamese):
1. **Include yourself in the problem**: "I've made this mistake. You probably have too." — never "you people do this"
2. **Conversational openers**: "Here's the thing...", "Look...", "I know this sounds obvious, but..."
3. **Self-deprecating humor**: Make fun of the topic or yourself
4. **Address viewers as individuals**: "If you're watching this, you probably..."
5. **Admit paradox/counterintuitive**: "This sounds like a contradiction. Let me explain."
6. **Ritual opening**: A recognizable, warm opening that signals "this is THIS channel"

### Vui Vẻ's 3 Principles

From Vui Vẻ (1.2M subs, faceless, Vietnamese): **Đơn giản, Gần gũi, Vui vẻ** (Simple, Close/Intimate, Fun)
- Simple: complex topics made accessible
- Close: viewer sees themselves in the content
- Fun: warmth, not just information

### Kurzgesagt Emotional Formula

From Kurzgesagt (23M subs, faceless, English):
1. **Start with the GAP, not the answer**: Make viewer FEEL what they don't know
2. **5-beat emotional rollercoaster**: Hook (terrifying question) → Grounding (feel smart) → Crisis (scale expands) → Pivot (why this is beautiful) → Release (small but comforted)
3. **Earn your optimism**: Stare into the void first, THEN offer hope
4. **Visual dissonance**: Bright/cheerful delivery of heavy topics

### The "Emotional Job" Framework

Before writing ANY script, define:
1. **Emotional job**: What should viewer FEEL after watching? (authority? curiosity? inspiration? understanding?)
2. **The ONE thing**: The single belief/realization the viewer should leave with
3. **The gap**: What they don't know they don't know
4. **The snap-back**: How does this topic land on the viewer's own life?

### Before/After Examples (Study These)

**BEFORE (mechanical):**
> "In this video, we will explore how RLHF training affects AI's ability to write subtext in fiction."

**AFTER (alive):**
> "You just spent three hours writing with AI. The grammar is perfect. The structure is sound. And something is... off. The characters say exactly what they mean. Nobody talks around anything. It reads like a textbook wearing a novel's clothes. Here's the thing — that's not a bug. It's a feature. And understanding why changes everything about how you use AI."

**BEFORE (mechanical):**
> "Sanderson's Second Law states that limitations are more important than powers in magic system design."

**AFTER (alive):**
> "Here's a mistake that killed more fantasy novels than bad prose ever did. The hero is trapped. The villain is closing in. And suddenly — the hero discovers a NEW magic power. One the reader has never heard of. One that solves everything. Brandon Sanderson noticed this pattern. And he built a law that explains exactly WHY that scene fails."

### Script Writing Rules (Updated)

1. **Define emotional job BEFORE writing** (not after)
2. **Open with a scene, not a section header** — no "Section 1: Myth"
3. **Show suffering before solution** — viewer must FEEL the problem before you explain it
4. **Use storytelling, not lecture** — characters, tension, resolution
5. **Include yourself in the problem** — "I've been there too"
6. **Add friction** — admit uncertainty, acknowledge contradictions, leave some things complex
7. **Snap-back close** — connect topic to viewer's life in final line
8. **1-3-1 sentence rhythm** — short punch → longer elaboration → short close
9. **Conversational language** — contractions, <20 words/sentence, "you" frequently
10. **Read aloud** — if you stumble, rewrite. If it sounds like an essay, rewrite.

---

## 4. Complete Production Pipeline

```
1. RESEARCH (45-60 min)
   ├── Define 1-sentence thesis (what you argue, not what you cover)
   ├── Collect 5-10 sources: academic + Reddit + craft lectures
   ├── Mine 1 Reddit thread for audience vocabulary (exact quotes)
   └── Write 1-page research brief

2. SCRIPT (60-90 min)
   ├── Hook + thesis: Agent drafts from research + framework, with research-based anchor
   ├── AI draft remaining sections from research brief
   ├── Human rewrite: remove 7 AI tells, vary rhythm, add open loops
   ├── Add inline visual direction: [SHOW: diagram], [TEXT: stat]
   ├── "Therefore/But" between sections
   └── Read aloud → fix stumbling

3. VOICEOVER + VISUALS + RENDER (automated via HyperFrames)
   ├── HyperFrames ElevenLabs skill: generate VO with API key
   │   (Settings: stability 35-45%, similarity 75-80%, style 0-15% — verify during setup)
   ├── HyperFrames transcribe: Whisper word-level timestamps for captions
   ├── Open Design DESIGN.md: generate visuals per scene matching narration
   ├── HyperFrames render: HTML composition → MP4 (visuals + VO + captions)
   └── Film grain overlay applied

4. FINAL POLISH (CapCut, 15-20 min)
   ├── Import HyperFrames MP4
   ├── Background music -22dB
   ├── Enhance Voice 50-70%, normalize -14 LUFS
   ├── 90% hard cuts (if needed beyond HyperFrames transitions)
   ├── Pattern interrupts every 90-120s
   └── Export 1080p, 30fps, H.264

5. PUBLISH (10 min)
   ├── Source links in description (Kurzgesagt model)
   ├── AI disclosure toggle ON
   ├── 1 specific CTA
   └── Respond to first comments (human signal)
```

**Total: ~2.5-3 hours/video** (research + script = 2h, automated render + CapCut polish = 30-45 min)

---

## 5. Authenticity Checklist (Test Before Publishing)

Answer YES to at least 10/12:

1. Script written or heavily rewritten by human?
2. Contains analysis/synthesis/conclusions AI couldn't generate alone?
3. Sources cited (on screen + description)?
4. Viewer would instantly recognize this as YOUR channel?
5. Has unique angle/perspective, not just summarizing facts?
6. Voiceover has emotional variation (not flat/robotic)?
7. Visuals are custom (not shared stock)?
8. Video delivers on title/thumbnail promise?
9. Would this video still have value if AI tools didn't exist?
10. Upload frequency sustainable (not spam)?
11. Creative decisions documented (for appeal)?
12. AI disclosure toggled?

---

## 6. Single Highest-Impact Technique

**Hook + thesis drafted by agent from real research, reviewed by user.** The hook should contain a research-based anchor ("While researching the ACL paper on Narrative Flattening, I found...") that references actual research done for the video. User reviews the Vietnamese summary to verify the research is real and the logic is correct. The authenticity comes from: (1) the research actually happened, (2) the framework is human-designed, (3) the user reviewed and approved the logic.
