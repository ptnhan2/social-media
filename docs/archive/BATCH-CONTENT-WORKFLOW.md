# Batch Content Workflow — Faceless Channel (Compliance-First)

> ⚠️ **SUPERSEDED (partial)** — Nguồn sự thật chính thức giờ là `.kilo/agent/content-manager-agent.md` (essential rules + state machine, auto-load) + `docs/phase-rules/phase-*.md` (reference detail) + `00-state.md` mỗi video. File này giữ làm legacy reference: cadence 8/tháng (2/tuần) vẫn đúng; nếu xung đột rule với agent body / phase-rules, **agent body là chuẩn**.

> Faceless format: research → script → voiceover → visuals → assembly
> 2 videos/tuần = 8/tháng. ~2h/day production.
> **Compliance-first**: 14 giải pháp từ 20+ sources (xem `YOUTUBE-AI-COMPLIANCE.md`)
> Core principle: "YouTube không ban AI. Nó ban template-replicable content with no detectable human creative direction."

## Overview — 5 Phase System

```
Phase 0: Quarterly Planning (2h, 3 tháng/lần)
    ↓
Phase 1: Monthly Pre-Production (research + script outline)
    ↓
Phase 2: Monthly Production (voiceover + visuals + assembly)
    ↓
Phase 3: Monthly Repurposing (transcript-first, 8-12 outputs/video)
    ↓
Phase 4: Weekly Publishing (3 videos/week + daily Shorts/devlog)
    ↓
Phase 5: Monthly Review (retention gate + compliance audit)
```

## Channel Identity (set up ONCE before Phase 0)

### Persona + Thesis [Compliance #1, #9]
- **Name**: BeDevNathan
- **Thesis** (for About + Description): "I'm building an AI agent for novelists. Every week I review AI writing tools and analyze writing craft through the lens of what AI can and can't do for long-form fiction. New videos Monday, Wednesday, Friday."
- **POV**: Dev perspective — I know the technical challenges of AI + long-form fiction because I'm building it. This is NOT interchangeable with generic "AI tool review" channels.

### Visual DNA [Compliance #11]
- Lock palette + typography in DESIGN.md
- Thumbnail system: same palette/typography, different composition per video
- Intro: 2-3s branded animation (generate once, reuse)

### Revenue Diversification [Compliance #13]
- YouTube AdSense = ONE stream, not the business
- Newsletter (email list owned) → primary
- Product (AI agent) → future
- Course/membership → future

---

## Phase 0: Quarterly Planning (2h, mỗi 3 tháng)

### Chọn 8 topics/tháng × 3 tháng = 24 topics

Direction: Craft × AI Intersection (single primary pillar). 6 content categories rotate:
- Craft Principle × AI
- Framework × AI
- AI Pattern Analysis
- Community Problem Solve
- Model Comparison (craft lens)
- Workflow Design

Secondary: daily devlog (build-in-public social posts)

### Validate demand (20-30 min/topic)

> Research-based process from 25+ sources (Ahrefs, vidIQ, TubeBuddy, OverseerOS, AutonoLab, Colin & Samir, Think with Google). See `RESEARCH-VALIDATION-METHODOLOGY.md` for full source list.

**5-stage validation cho mỗi topic:**

#### Stage 1: Search Demand Verification (5 min)
1. **YouTube autocomplete**: Gõ topic vào YouTube search bar. Topic xuất hiện trong top suggestions = demand thật. Dùng wildcard `*` trước/sau keyword để tìm biến thể.
2. **YouTube Suggest alphabet trick**: Gõ `topic a`, `topic b`, `topic c`... để tìm tất cả autocomplete variants.
3. Nếu không có keyword tool (vidIQ/TubeBuddy): YouTube autocomplete + Google Trends là đủ cho demand signal.

#### Stage 2: Competitor Analysis (10 min)
Search topic trên YouTube. Cho 5-10 top results, thu thập:

| Video | Views | **Channel subs** | Upload date | **Outlier score** | Why it worked | Gap |
|-------|-------|-----------------|-------------|-------------------|---------------|-----|

- **Channel subs**: View counts KHÔNG có nghĩa nếu không biết channel size. 44K views trên 100K-sub channel = bình thường. 44K views trên 5K-sub channel = outlier 8.8x.
- **Outlier score = Video views ÷ Channel median views**. Dùng median, không dùng average (1 viral video distort mean).
  - 2x = worth noticing
  - 3-5x = strong signal
  - 10x+ = deep analysis warranted
- **Why it worked**: Format? Topic? Title pattern? Thumbnail style? Timing? Personality?
- **Mid-sized channel test**: Nếu 10K-100K sub channels hit 50K+ views thường xuyên = demand thật. Chỉ mega-channels mới có views = saturated.

> "A 1M-view video on a 10M-sub channel is NOT an outlier. A 50K-view video on a 5K-sub channel IS a 10x outlier — this is the gold." — OverseerOS

#### Stage 3: Google Trends — YouTube Search mode (5 min)
1. Vào [Google Trends](https://trends.google.com)
2. **Switch search type từ "Web Search" → "YouTube Search"** (critical —大多数人 miss this)
3. Set timeframe 5 năm để thấy seasonality + long-term trajectory
4. Compare 2-5 terms cùng lúc (VD: "Sudowrite" vs "NovelCrafter" vs "AI writing")
5. Check **"Rising" related queries** — percentage growth, early signal trước peak
6. Check **"Top" related queries** — most-searched adjacent topics

| Signal | Strong | Weak |
|--------|--------|------|
| Rising queries | Trending up | Declining |
| Seasonality | Publish 4-8 tuần trước peak | Past peak |
| Term comparison | Target term cao nhất | Target term thấp nhất |

> Google Trends KHÔNG cho absolute volume — chỉ 0-100 relative index.

#### Stage 4: Content Gap Analysis (5 min)
Từ competitor videos, identify 1 trong 4 gap types:

| Gap Type | Signal | Action |
|----------|--------|--------|
| Missing question | Comment lặp cùng câu hỏi | Answer directly |
| Weak comparison | Competitor cover partial, not full decision | Create complete comparison |
| Audience segment | 1 nhóm bị bỏ qua (VD: novel writers vs general) | Target that subgroup |
| Format gap | Topic có nhưng sai format (tutorial vs test) | Repackage in better format |

#### Stage 5: Scorecard (2 min)

Score mỗi category 0-5. Total 0-50.

| Category | Question |
|----------|----------|
| Viewer clarity | How specific is the target viewer? |
| Pain/desire strength | How urgent is the problem? |
| Demand evidence | Competitor breakouts + search data |
| Search potential | Search intent + volume match |
| Suggested/browse potential | Curiosity gap + visual click potential |
| Title potential | Can write 5-10 strong title options? |
| Thumbnail potential | Visual tension, mobile readability |
| Retention potential | Natural structure, payoff, rewatch hooks |
| Differentiation | Hard-to-copy angle |
| Channel fit | Pillar alignment, positioning |

| Score | Decision |
|-------|----------|
| 0-15 | Kill |
| 16-24 | Save for later |
| 25-32 | Needs sharper angle |
| 33-40 | Produce |
| 41-50 | Priority |

> Source: OverseerOS Topic Validation Scorecard (2026). See `RESEARCH-VALIDATION-METHODOLOGY.md`.

### Write title + thumbnail concept

Title patterns (≤60 chars — titles >60 chars mất 1/3 views):
- "I Studied [N] [X]. Here's What I Found"
- "Why [X] Is [Unexpected]"
- "[N] Mistakes Keeping You [X]"

> "Build packaging BEFORE script. Title + thumbnail = creative target." — overseeros.com

### Plan emotional journey (NOT template structure) [Compliance #3]

> ❌ BANNED: Academic templates (Myth→Reality→Proof→Takeaway, Hook→Problem→3 solutions→Verdict, etc.)
> ✅ REQUIRED: Emotional journey using storytelling techniques from `docs/AUTHENTICITY-PIPELINE.md`

Each video is a different emotional journey — NOT a template. Use storytelling techniques (not structures):
- Circular open loop + callback
- Anxiety cascade → relief
- Cultural reference = emotional stakes
- Personification (abstract → character)
- Contrast as primary argument
- Honesty through self-criticism
- Writing for the EAR (slang, vivid imagery, onomatopoeia)
- Earned optimism
- Dual perspective (experts AND beginners)
- Urgency/deadline

Between any two videos, at least 3 of these must differ:
1. Emotional journey type (anxiety→relief, curiosity→discovery, contrarian→reveal, etc.)
2. Thesis (the main argument/perspective)
3. Footage mix (different visual approaches)
4. Storytelling rhythm (how beats connect — "But/Therefore" not "And then")
5. Length (vary between 5-15 min)

### Save: `content-plan-Q[X]-Q[X+1]-2026.md`

---

## Phase 1: Monthly Pre-Production (4-5h)

Cho 8 videos/tháng. Agent làm research + draft, user review/fix + design analytical framework.

> **Content approach**: Pure analysis từ docs/reviews/public info — KHÔNG test tool. Writing voice = first-person analytical (confident, experiential, không secondhand-sounding). See `CONTENT-CREATION-MECHANISMS.md` for full mechanism catalog.

### Step 0: Assign Content Creation Mechanism (per video)

Mỗi video dùng 1-2 cơ chế từ `CONTENT-CREATION-MECHANISMS.md`. Không 2 video liên tiếp dùng cùng cơ chế chính — tự nhiên tạo format variation (compliance #3).

| Mechanism | User does | Agent does |
|-----------|-----------|------------|
| #1 Original Framework | Design criteria/scoring | Research evidence, fill matrix, draft |
| #0 Content Synthesis | Review synthesis, ensure angle | Aggregate 5-10+ sources, extract insights |
| #2 Comparative Analysis | Define criteria | Research each subject, create matrix |
| #3 Case Study Deep-Dive | Select subject, determine lens | Deep research across sources |
| #4 Debunking | Select claims, review verdicts | Collect claims, research evidence |
| #5 First Principles | Guide assumption challenges | Identify assumptions, research evidence |
| #6 Expert Aggregation | Synthesize meta-analysis | Collect expert positions, map consensus |
| #7 Community-Driven | Select questions | Mine Reddit/forums, rank by frequency |
| #10 Story-Driven | Ensure unique thesis | Research, identify narrative arc |

### Step 1: Research (multiple sub-agents in parallel — 20+ sources minimum)

> **CRITICAL**: Before writing ANY script, research must cover 20+ sources across multiple angles. Use sub-agents (Task tool) running in parallel to research different aspects of the topic simultaneously.

**Launch 3-5 sub-agents in parallel, each researching a different angle:**

| Sub-agent | Angle | What to find |
|-----------|-------|-------------|
| 1 | Craft theory | What do experts (Sanderson, Hello Future Me, writing books) say about this craft principle? |
| 2 | AI behavior | How does AI actually handle this? Academic papers (ACL, arXiv), benchmarks (NC Bench), model documentation |
| 3 | Community pain points | What do real writers say on Reddit (r/WritingWithAI, r/writing), forums, YouTube comments? Exact quotes + engagement numbers |
| 4 | Existing content | What YouTube videos already exist on this topic? Views, gaps, what's missing? |
| 5 | Real examples | Specific examples from books, AI outputs, comparisons — concrete evidence to use in script |

**Each sub-agent must:**
- Search 20+ queries (not 2-3)
- Find multiple articles per query
- Return exact quotes, specific numbers, named sources
- Note contradictions between sources (tension = script material)

**Output per sub-agent:**
- Key findings (1-2 sentences each)
- Exact quotes with source attribution
- Specific data points (numbers, percentages, study results)
- Contradictions found between sources
- Gaps: what NO source covers well

**Agent compiles all sub-agent results into:**
- 1-page research brief
- Sources list (for description/credibility)
- Best quotes (for script evidence)
- Contradictions (for script tension)
- Community pain points (for hook/emotional connection)

**Only AFTER research is complete → proceed to Step 2 (Viewer Problem Research)**

### Step 2: Competitor Research (15 min/video)

Search topic trên YouTube. 5-7 competitor videos. Cho mỗi video:

| Video | Views | Channel subs | Outlier score | Why it worked | Gap we can beat |
|-------|-------|-------------|---------------|---------------|-----------------|

- **Channel subs**: bắt buộc — view counts vô nghĩa nếu không biết channel size
- **Outlier score = Video views ÷ Channel median views** (dùng median, không dùng average)
  - 3-5x = strong signal (topic works at this scale)
  - 10x+ = deep analysis warranted (what made it break out?)
- **Why it worked**: format? title pattern? thumbnail style? timing? personality? search demand?
- **Gap**: 1 trong 4 gap types (missing question / weak comparison / audience segment / format gap)
- **Analyze channels 2-3x your size** — these show what your realistic next level looks like. Mega-channels don't teach what works at your scale.

### Step 3: Hook Design (5 min/video)

| Type | Example |
|------|---------|
| Result-first | "This AI tool wrote 10,000 words of coherent fiction." |
| Mistake-first | "Most novelists use AI writing tools completely wrong." |
| Contrast | "Two authors used Sudowrite. One got garbage. One got a bestseller." |
| Proof | "After testing 7 AI tools, the same problem kept showing up." |

### Step 4: Script Outline (15 min/video)

Use assigned mechanism from Step 0 + emotional journey (NOT template structure):

```
TITLE: [≤60 chars]
MECHANISM: [# from CONTENT-CREATION-MECHANISMS.md]
EMOTIONAL JOB: [What should viewer FEEL after watching?]
THE ONE THING: [Single belief viewer should leave with]
THE GAP: [What they don't know they don't know]
THE SNAP-BACK: [How does this land on viewer's life?]
HOOK: [3-beat: Pull in → Flip → Seal — see AUTHENTICITY-PIPELINE.md]

[Organic flow using storytelling techniques — NO section headers, NO "firstly/secondly"]

CTA: "Building an AI agent for novelists. Follow for updates."
```

### Step 5: Design Analytical Framework [COMPLIANCE CRITICAL]

**This is the step that makes content non-interchangeable.** Human contribution = framework design, NOT "hot take."

> AI can generate opinions. AI cannot design a unique analytical framework that produces logical, consistent, objective analysis. That's the human contribution.

**User must:**
1. **Design the analytical framework** — choose evaluation criteria, define scoring, decide synthesis logic (from research in `RESEARCH-FRAMEWORKS.md`, NOT intuition)
2. **Review the logic** — ensure framework produces objective, consistent analysis
3. **Verify unique angle** — no other channel uses this specific framework

**Agent then:**
1. Research evidence for each criterion/dimension
2. Fill in the framework with data from public sources (docs, reviews, community, academic)
3. Draft voiceover text in **first-person analytical voice**

**Writing voice — first-person analytical:**
| Instead of (secondhand) | Write (first-person analytical) |
|---|---|
| "According to Reddit users, Sudowrite loses context after chapter 5" | "Sudowrite's context retention breaks down around chapter 5 — the story bible compresses too much, and the AI starts forgetting early character details" |
| "The Nerdy Novelist says Claude is better for creative writing" | "Claude's advantage in fiction writing comes down to instruction adherence — it maintains constraints better across long outputs" |

> From YouTube official: "We want content that we know what channel it comes from. It couldn't be on a hundred other channels."
> From Zenn case study: "The automation is in the production, not the thinking."

### Step 6: "Would this exist without AI?" Test [COMPLIANCE]

Before saving: "If I couldn't use AI for anything, would I still make this video? Would it still be worth watching?"
- If YES → save brief
- If NO → rethink angle

### Step 7: Save production brief + document process [COMPLIANCE]

Save to: `videos/YYYY-MM/NN-short-name/`

Per video folder:
- `02-brief.md` — tóm tắt tiếng Việt (cho user review) + English outline + hook + technical info
- `01-research.md` — research notes + sources + evidence
- `03-script.md` — final English voiceover script (sau khi user approve)

> File structure: see top of this file. These are appeal evidence if flagged.

---

## Phase 2: Monthly Production — Faceless (optimized stack pipeline)

> Full authenticity pipeline: see `AUTHENTICITY-PIPELINE.md` for detailed settings.
> Core principle: OPTIMIZE existing stack (ElevenLabs + HyperFrames), NOT replace tools.
~3-4 hours/video (vs 1,200h Kurzgesagt vs 30min template slop)

### Step 1: Finalize script (60-90 min) [Compliance #2 — CRITICAL FOR AUTHENTICITY]

**⚠️ Script must FEEL alive, not just be logically correct. See `docs/AUTHENTICITY-PIPELINE.md` section "Alive vs Mechanical" for full guide.**

**Before writing, define:**
- Emotional job: What should viewer FEEL after watching?
- The ONE thing: Single belief/realization viewer should leave with
- The gap: What they don't know they don't know
- The snap-back: How does this topic land on viewer's life?

**Anti-mechanical rules (BANNED patterns):**
- ❌ Opening with section headers ("Section 1: Myth") → ✅ Open with a SCENE
- ❌ Explaining framework before showing problem → ✅ Show suffering first, then solution
- ❌ Wikipedia-style definitions → ✅ Storytelling with characters and tension
- ❌ "In conclusion..." endings → ✅ Snap-back to viewer's life
- ❌ Smooth, resolved, frictionless → ✅ Admit uncertainty, leave rough edges

**Techniques from successful faceless channels:**
- web5ngay (4.24M): Include yourself in problem, conversational openers, self-deprecating humor
- Vui Vẻ (1.2M): Đơn giản, Gần gũi, Vui vẻ — viewer sees themselves in content
- Kurzgesagt (23M): Start with GAP not answer, 5-beat emotional rollercoaster, earn optimism

**Script requirements:**
- Hook + thesis: Agent drafts from research + framework, with research-based anchor
- 3-beat hook: Pull in (viewer's experience) → Flip (surprising contrast) → Seal (open loop)
- 1-3-1 sentence rhythm: short punch → longer elaboration → short close
- "Therefore/But" between sections (not "and then...")
- Remove 7 AI-script tells (fake specificity, cliché hooks, uniform rhythm, filler, no visual direction, unearned authority, missing open loops)
- Contractions, <20 words/sentence, 130-150 wpm, 4.2 "you" per 100 words
- Snap-back close: connect topic to viewer's life in final line
- Read aloud → fix stumbling points
- Format: "Voiceover Text (English)" | "Vietnamese Summary (cho user check logic)" | "Visual Cue Ideas"

### Step 1b: Humanize pass (automated — `humanizer` skill)

> Local skill, no API key needed. MIT license. 28 pattern detectors, 560+ AI vocabulary terms, statistical analysis.

After script draft, run humanize pass to remove AI writing patterns:

1. **Score**: `node src/cli.js score` — check AI-likeness (0-100, lower = more human)
2. **Analyze**: `node src/cli.js analyze -f script.md` — full report of patterns found
3. **Autofix**: `node src/cli.js humanize --autofix -f script.md` — auto-rewrite problematic sections
4. **Verify**: Read aloud — if anything still sounds AI, rewrite manually

**28 patterns it detects (key ones):**
- Significance inflation ("marking a pivotal moment...")
- Vague attributions ("Experts believe", "Studies show")
- AI vocabulary Tier 1: delve, tapestry, vibrant, crucial, seamless, robust, leverage, transformative...
- Negative parallelisms ("It's not just X, it's Y")
- Rule of three overuse
- Filler phrases ("In order to" → "to")
- Generic conclusions ("The future looks bright")
- Chatbot artifacts ("I hope this helps!")
- Low burstiness (AI = metronomic, human = bursts)
- Sentence length uniformity (AI = all same length)

**Always-on mode**: Add core rules to system prompt so agent ALWAYS writes human-like:
- Ban Tier 1 vocabulary
- Kill filler phrases
- No sycophancy, chatbot artifacts, or generic conclusions
- Vary sentence length, have opinions, use concrete specifics
- If you wouldn't say it in conversation, don't write it

### Step 2: Voiceover + Visuals + Render (automated via OpenMontage)

> **MIGRATED 2026-08-01**: production chuyển từ HyperFrames-handdraw SANG **OpenMontage** (clone `openmontage/`). Xem `STACK-DECISIONS.md` §2 + `phase-2-production.md` + `openmontage/AGENT_GUIDE.md`.

- **OpenMontage pipeline**: agent đọc AGENT_GUIDE → preflight (`provider_menu_summary`) → chọn pipeline (`pipeline_defs/*.yaml`) → init project (`lib/checkpoint.init_project`) → seed brief/script từ `02-brief.md`+`03-script.md` → stage-by-stage (director skills + tools) → gate approval → render → final_review.
- **Voiceover**: OpenMontage TTS selector (ElevenLabs ưu tiên — settings stability 35-45%, similarity 75-80%, style 0-15%; fallback Piper local free). Script formatting: `...` pauses, ALL CAPS emphasis.
- **Visuals**: OpenMontage image selector (FLUX/Imagen/Pixabay...) + provider scored 7-dim. ≥1 non-AI element per video: diagrams, data charts, comparison matrices.
- **Composition**: Remotion (data-driven) hoặc HyperFrames (motion-graphics) — OpenMontage trình cả 2, user chọn ở proposal.
- **Output**: `projects/<project-id>/renders/final.mp4` (final_review PASS bắt buộc: ffprobe + frame + audio + delivery promise).

### Step 3: Final Polish (CapCut, 15-20 min)

- Import HyperFrames MP4
- Background music at -22dB
- Enhance Voice 50-70%, Normalize Loudness -14 LUFS
- 90% hard cuts (if needed beyond HyperFrames transitions)
- Pattern interrupts every 90-120s: text pop, music shift, silence, question
- Color grade: consistent LUT across all clips
- Export 1080p, 30fps, H.264

### Step 5: Pre-publish authenticity check [Compliance #8, #14]

Answer YES to at least 10/12:
- [ ] Script written or heavily rewritten by human?
- [ ] Contains analysis AI couldn't generate alone?
- [ ] Sources cited (on screen + description)?
- [ ] Viewer would recognize this as YOUR channel?
- [ ] Has unique angle, not just summarizing facts?
- [ ] Voiceover has emotional variation?
- [ ] Visuals are custom (not shared stock)?
- [ ] Video delivers on title/thumbnail promise?
- [ ] Would this video still have value if AI tools didn't exist?
- [ ] Upload frequency sustainable?
- [ ] Creative decisions documented?
- [ ] AI disclosure toggled?

### Batch production schedule

| Day | Task | Time |
|-----|------|------|
| Day 1 | Script finalize 4 videos (agent draft + human review logic) | 4-6h |
| Day 2 | Voiceover 6 + visuals 6 + assembly 6 | 6h |
| Day 3 | Script 6 more + voiceover 6 + visuals 6 + assembly 6 | 8h |
| **Total** | **8 videos** | **~14-16h** |

---

## Phase 3: Monthly Repurposing (transcript-first, ~18h)

> Mọi output từ transcript, KHÔNG rewatch video.
> 1 video → 8-12 outputs trong 90 min (lenspov.com)

### Per video:

| Output | Time | Source | Platform |
|--------|------|--------|----------|
| 2-3 Shorts | 20 min | Transcript → cut 30-60s clips | YT Shorts, TikTok, Reels |
| 1 X Thread | 15 min | Transcript → 5-8 tweets | X |
| 1 Newsletter section | 20 min | Cut content (insight KHÔNG vào video) | Email |
| 1 Blog post | 30 min | Script outline → expand 1500-3000 words | Hashnode/Dev.to |
| 1 Reddit post | 15 min | Genuine insight, no promo | r/writing, r/Worldbuilding |

### Rules:
- **Shorts spaced 3-5 days apart** (not same day — cannibalize attention)
- **Newsletter = cut content** (lead với insight không vào video)
- **Each X tweet standalone** (if can't earn quote-tweet, cut it)
- **Reddit: NO product link** first 3 months

### Shorts spacing for 8 videos × 2-3 Shorts = 16-24 Shorts/month
- ~6-9 Shorts/week → space Mon/Wed/Fri or Tue/Thu/Sat

---

## Phase 4: Weekly Publishing

### Schedule (3 videos/week)

| Day | YouTube long-form | Shorts | X | Blog | Reddit | Newsletter |
|-----|------------------|--------|---|------|--------|------------|
| Mon | Video 1 | | "New video" | | | |
| Tue | | Short 1 (from last week's video) | | | | |
| Wed | Video 2 | | X Thread 1 | Blog 1 | Reddit 1 | |
| Thu | | Short 2 | | | | |
| Fri | Video 3 | | X Thread 2 | Blog 2 | Reddit 2 | Newsletter |
| Sat | | Short 3 | | | | |
| Sun | | Short 4 (from this week's video) | | Blog 3 | Reddit 3 | |

### Daily (15-30 min)
- **Devlog** (2 min): git log → 1-3 câu → X + Threads
- **Reddit engagement** (30 min): r/writing, r/Worldbuilding — answer 2-3 questions

### Upload checklist (compliance-first) [Compliance #8]

**YouTube long-form:**
- [ ] Title ≤60 chars
- [ ] Description + timestamps + links
- [ ] Tags: 5-10 keywords
- [ ] Thumbnail (same palette, different composition — Visual DNA)
- [ ] **Toggle "altered or synthetic content"** in YouTube Studio [Compliance #8]
- [ ] **Add "AI-assisted content" in description** [Compliance #8]
- [ ] **Channel About has thesis** [Compliance #9]
- [ ] Script draft + research notes archived [Compliance #10]

**Shorts/TikTok/Reels:**
- [ ] Caption (1 câu hook)
- [ ] Hashtags: #aiwriting #novelwriting #writingcommunity
- [ ] Native upload (không cross-post link)

---

## Phase 5: Monthly Review (30 min)

### Retention gate
- AVD >50%? → ✅ Repurpose
- AVD <50% but views >channel median? → ✅ Repurpose
- Both below? → ❌ Note "weak topic, avoid similar"

### Compliance audit [Compliance #3, #10, #14]
- [ ] Last 30 uploads: do any 2 consecutive videos share >2/5 elements? (format, thesis, footage, structure, length)
- [ ] Every video has documented human argument?
- [ ] Every video has disclosure toggled?
- [ ] Creative process docs archived for each?

### Analytics review
- [ ] YouTube: views, CTR, retention
- [ ] X: impressions, engagement
- [ ] Newsletter: open rate
- [ ] Blog: views, search terms
- [ ] Note: topic nào perform → làm thêm similar
- [ ] Note: topic nào flop → avoid
- [ ] CTR target: 5-8%+ (67% revenue variance from CTR — reelsmakerai.com)

### If flagged: Remediate, DON'T delete [Compliance #12]
- Days 0-1: Read notice. DON'T delete videos.
- Days 2-4: Audit last 30 uploads against compliance checklist
- Days 5-10: Archive templated uploads. Publish 3-5 new videos with missing layers.
- Days 11-18: Appeal via YouTube Studio. Acknowledge pattern → describe fix → link proof videos.
- Days 19-21: Wait (7-14 day review)

---

## Tools

| Tool | Dùng cho | Giá |
|------|----------|-----|
| **OpenMontage** | Production system (research→assets→compose→render), clone `openmontage/` | Free (AGPLv3), BYOK provider keys |
| **ElevenLabs** | Voiceover (TTS) — consistent voice = brand identity | $5/mo |
| **Remotion** | Data-driven composition (OpenMontage render runtime) | Free |
| **HyperFrames** | Motion-graphics composition (OpenMontage render runtime) | standalone `npx hyperframes` |
| **CapCut** | Video assembly + auto-captions (post-edit optional) | Free |
| **Canva** | Thumbnails (same palette, different composition) | Free tier |
| **Pexels** | Stock footage (ONLY if heavily transformed) | Free |
| **Piper TTS** | Offline TTS fallback (OpenMontage local) | Free |
| **Google Trends** | Topic validation | Free |
| **Google Sheets/Notion** | Content tracking + compliance audit log | Free |
| **Beehiiv/Substack** | Newsletter (owned audience) | Free |
| **Hashnode/Dev.to** | Blog | Free |

---

## Time Summary

| Phase | Frequency | Time |
|-------|-----------|------|
| Channel identity setup | Once | 2h |
| Phase 0: Quarterly planning | 3 tháng/lần | 2h |
| Phase 1: Pre-production (incl. human argument) | 1/tháng | 4-5h |
| Phase 2: Production (faceless) | 1/tháng | 14h |
| Phase 3: Repurposing | 1/tháng | 18h |
| Phase 4: Publishing | weekly | 2h/tuần |
| Phase 4: Daily | 20/tháng | 30 min/ngày |
| Phase 5: Review + compliance audit | 1/tháng | 45 min |
| **Total** | | **~42h/tháng** |

### Monthly output
- 8 long-form videos (compliance-first)
- 24-36 Shorts/Reels/TikTok
- 8 X threads
- 8 blog posts
- 4 newsletters
- 8 Reddit posts
- 20 daily devlogs
- **= ~100+ pieces/tháng**

---

## Compliance Quick Reference

> Full details: `YOUTUBE-AI-COMPLIANCE.md`

**The one-sentence test:** "Could a reviewer identify this as mass-produced from a template, with no detectable human creative direction?"

**14 compliance rules (need ≥11/14):**
1. ✅ Named persona (BeDevNathan) + documented POV
2. ✅ Script has analytical framework (human-designed, not AI-generated)
3. ✅ Format variation (4 structures rotate, 3/5 elements differ)
4. ✅ Transformative commentary (1 type per video)
5. ✅ Original visuals (custom per scene, not shared stock)
6. ✅ Mixed footage (≥1 non-stock/non-AI element)
7. ✅ Cadence matches depth (2/week research-based)
8. ✅ Disclosure (toggle + description note)
9. ✅ Channel thesis (About + Description)
10. ✅ Document process (drafts, notes, prompts archived)
11. ✅ Visual DNA (consistent style, different composition)
12. ✅ If flagged: remediate, don't delete (21-day appeal)
13. ✅ Revenue diversified (newsletter + product + course)
14. ✅ "Would this exist without AI?" = yes
