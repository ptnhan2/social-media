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

### 3 Required Human Signals (YouTube 2026)

| Signal | How to implement with existing stack |
|--------|-------------------------------------|
| **Personal POV** | Hook + thesis handwritten. "Last week I analyzed X and found Y." AI can't manufacture a Tuesday in your life. |
| **Named evidence** | "ACL 2025 paper by Wang et al. shows..." not "studies show." Source links in description. |
| **Channel-identity continuity** | Same DESIGN.md + same ElevenLabs voice + same CapCut style = recognizable brand |

### 7 AI-Script Tells to Remove

1. Fake specificity ("studies show") → Named source
2. Cliché hooks ("What if I told you...") → Personal anchor
3. Uniform sentence rhythm → Vary: short punch → longer flow → jab
4. Filler ("It's worth noting that...") → Delete
5. No visual direction → Add inline: [SHOW: diagram], [TEXT: stat]
6. Unearned authority ("experts agree") → Name the expert or cut
7. Missing open loops → Plant questions that resolve later

### "Therefore & But, Not And Then"

- ✅ "THEREFORE AI names emotions" → "BUT you can override..."
- ❌ "And next we'll talk about..."

### Conversational Script Rules

- Contractions: "you're" not "you are"
- <20 words/sentence, 1 comma max
- 130-150 wpm target
- 4.2 "you" per 100 words (top performers average)
- Read aloud before generating — if you stumble, rewrite

### Show Your Thinking (Visible Reasoning)

- "Here's what I expected → Here's what I found"
- Contradictions: "ACL says X... but Reddit says Y..." → resolve
- "3 explanations possible. Here's why 2 are wrong."
- Dated personal anchor: "In March, when I analyzed..."
- Name sources on screen: "Source: Wang et al. 2025, ACL"

---

## 4. Complete Production Pipeline

```
1. RESEARCH (45-60 min)
   ├── Define 1-sentence thesis (what you argue, not what you cover)
   ├── Collect 5-10 sources: academic + Reddit + craft lectures
   ├── Mine 1 Reddit thread for audience vocabulary (exact quotes)
   └── Write 1-page research brief

2. SCRIPT (60-90 min)
   ├── Hook + thesis: HANDWRITTEN, dated personal anchor
   ├── AI draft remaining sections from research brief
   ├── Human rewrite: remove 7 AI tells, vary rhythm, add open loops
   ├── Add inline visual direction: [SHOW: diagram], [TEXT: stat]
   ├── "Therefore/But" between sections
   └── Read aloud → fix stumbling

3. VOICEOVER (5 min)
   ├── Format script: ellipsis pauses, ALL CAPS emphasis, expand numbers
   ├── ElevenLabs: stability 35-45%, similarity 75-80%, style 0-15%
   ├── Generate per chunk (500-800 chars)
   └── Measure duration per segment

4. VISUALS (20 min)
   ├── Load DESIGN.md (same every video, different composition)
   ├── Generate per scene matching narration beats
   ├── Use measured audio durations as visual targets
   └── Anti-slop engine: vision self-critique until pass

5. ASSEMBLY (30 min)
   ├── CapCut: import ElevenLabs MP3 as master audio
   ├── Place visuals aligned to narration
   ├── Auto-captions (Montserrat Bold, stroke 15px, spring 0.1s)
   ├── 90% hard cuts, 10% creative transitions
   ├── Film grain overlay (mask AI perfection)
   ├── Background music -22dB
   ├── Enhance Voice 50-70%, normalize -14 LUFS
   └── Pattern interrupt every 90-120s

6. PUBLISH (10 min)
   ├── Source links in description (Kurzgesagt model)
   ├── AI disclosure toggle ON
   ├── 1 specific CTA
   └── Respond to first comments (human signal)
```

**Total: ~3-4 hours/video**

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
