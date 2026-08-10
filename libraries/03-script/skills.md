# Mined Skills — 03-script

> Knowledge extracted from openmontage skills (2026-08-04).
> Source: skills/ (164 files mined, 8 relevant to this branch).

## storytelling
**Summary:** The Explainer Arc template (hook → tension → concepts → palette cleanser → proof → implications → reframe) with per-length scaling table, plus the research-backed misconception-first approach (Derek Muller) and the But-Therefore connector method. Hooks/beats must be described anti-subjectively — visual cause of emotion, never the emotion itself. Pacing rules come from Mayer's cognitive science principles and Kurzgesagt/3Blue1Brown production methods.
**Key numbers/params:**
- Explainer arc (3 min): hook 0:00-0:08, tension 0:08-0:30, concept 1 0:30-0:50, concept 2 0:50-1:15, palette cleanser 1:15-1:20, key insight 1:20-1:50, proof 1:50-2:20, implications 2:20-2:45, reframe+close 2:45-3:00
- 30-second rule: 50% drop-off in first 30s; hook+tension complete by 0:30; survivors retain 40-60%
- Scaling: 1min=1-2 concepts (hook 5s), 2min=2-3 (8s), 3min=3-5 (8s), 5min=5-8 (10s)
- Narration 150-160 wpm (Kurzgesagt; conversational 170-190); new visual every 3-5s
- Max 1 new concept per 30-45s (Mayer segmenting); pattern interrupt every 45-90s; palette cleanser every 45-60s; deliberate silence 1-3s after key insights
- Learning drops ~30% when narration/visual offset; seductive details reduce learning 20-30%
**Actionable rules:**
- Never connect sections with "and then" — always BUT or THEREFORE
- Open with the audience's misconception before the truth (higher learning gains)
- Use guided discovery: question → naive attempt → key insight (2-3s silence) → build → generalization
- Describe beats by visual cause ("wide aerial pull-back; silhouetted against rising sun"), never "epic reveal"
- Name subject transitions explicitly (revealing / disappearing / switching / complex-alternating) with the mechanism (cut, pan, reveal-by-light)
- Attach one concrete camera-intent line per beat; set narration_wpm: 155 for timing

## long-form
**Summary:** 8-15 min video structure: hook by 0:30, chapters 2-4 min each (max 5-6), re-hook at 2:00, pattern interrupts every 45-90s, and retention curve management with burst sequences and open loops. Contains 2025-2026 retention benchmarks by duration and the 2-3 min retention valley survival tactics. Hard warnings on AI-generated content retention penalties (70% lower) driving TTS quality requirements. Audio must stay consistent (-14 LUFS, <2 LUFS chapter variation) with continuous ducked music bed.
**Key numbers/params:**
- Sweet spot 8-15 min; retention target 40-60% AVD; chapters 2-4 min; narration 150-160 WPM
- Retention benchmarks: 1-3min good 60%/excellent 75%; 10-20min 40%/55%; 20-60min 35%/50%
- Platform average AVD 23.7%; only 16.8% exceed 50% retention; only 16% reach final 10s; +10pp retention ≈ +25% impressions
- AI video retention ~70% lower; AI narration → 35% drop-off in first 45s
- 55%+ leave in first 60s; retention valley at 2:00-3:00 (first payoff before 2:00, interrupt at 1:45)
- Pattern interrupts: major every 60-90s, minor every 20-30s; bursts of 5-10 cuts for 10-15s every 2-3 min; interrupts in first 5s = +23% retention
- Music: duck -18 to -20 dB under speech, ±10 BPM consistency, 2-3s crossfades; LUFS variation <2 per chapter; limiter -1.5 dBTP
- Cut intervals: hook 3-5s, early body 10-15s, mid body 15-25s; B-roll clip 5-8s, B-roll 35-50% of video (+15-25% watch time); max 15s without change
- End screen last 5-20s (no critical content); max 1 info card per 2 min
- Chapter lengths: simple 2-3min, complex 3-4min, demo 2-3min, story 3-5min
**Actionable rules:**
- Complete hook + tension by 0:30; deliver first major payoff before 2:00
- Re-hook every 3-4 min with verbal signposts ("But that's not even the interesting part...")
- Plant open loops in the first 60s; resolve them late
- If retention <30% at any section, that section needs a pattern interrupt
- Reserve last 20 seconds for end screen; never put critical content there
- Prioritize natural-sounding TTS + sound-design processing chain to fight AI-content retention penalty

## explainer/idea-director
**Summary:** The brief is the creative foundation — a weak brief produces a weak video regardless of tools. Mandatory web research (content landscape, trending debates, 3-5 surprising facts, visual inspiration, audience gaps) precedes generating ≥3 *structurally different* angle options, then the user selects or mixes before the brief is assembled. Includes strict field quality bars and a 6-criterion self-eval rubric scored before submit.
**Rules we should adopt:**
- Angle diversity is structural, not cosmetic: ≥1 technical, ≥1 intuitive/analogy, ≥1 provocative/surprising; no two angles share a narrative structure; each suggests a different visual approach.
- Angle fields: name (5-8 words, specific not generic), hook (<15 words, must create curiosity/surprise), narrative_structure, visual_approach, target_audience (specific, not "developers"), why_this_works (must cite research).
- Title/hook quality bar: "How Vector Databases Find Your Data in 1ms" over "Vector Databases Explained"; hook must create an information gap.
- key_points must be concrete claims the video will prove, never vague topics.
- CTA must be actionable and specific ("Try building similarity search with 10 lines of Python"), never generic "like and subscribe".
- Self-evaluate before submit: hook strength, specificity, research depth, audience fit, playbook match, uniqueness (score 1-5, iterate if <3).
- Research is mandatory even for a "simple" topic — it's the #1 failure mode to skip it.
**What we already do differently:**
- We don't have a separate idea/brief stage; topic validation (Phase 0 scorecard) + research + framework (USER gate) cover this. The angle-diversity checklist could strengthen our Phase 1 research→framework step.

## explainer/research-director
**Summary:** Research must be run in parallel search batches by purpose: landscape scan, trending pulse, data/evidence, audience mining, expert voices, visual references — each batch has pre-written queries and specific parse targets. All angles must be grounded in specific findings with cited sources (credibility-rated primary > secondary > anecdotal). Enforces concrete quality minimums and a hard time budget so research doesn't rabbit-hole.
**Rules we should adopt:**
- 5 search batches run in parallel, each with defined queries:
  1. Landscape: `"[topic] explained" site:youtube.com`, `(guide OR tutorial) -site:youtube.com`, freshest content w/ current month/year, "best [category] [year]" listicles.
  2. Trending: `(announcement OR launch OR controversy) after:[year]-01-01`, `site:reddit.com after:[6mo]`, `site:news.ycombinator.com`, "why is [topic] trending".
  3. Data: statistics [year], `(study OR survey OR report)`, `"according to"`, `"surprisingly" OR "counterintuitively"`, `(comparison OR benchmark OR vs)`.
  4. Audience: `site:reddit.com "help" OR "ELI5"`, quora/stackoverflow, "why is X so hard", "common mistakes OR myths", "wish I knew".
  5. Experts: `(creator OR pioneer) (interview OR keynote)`, "unpopular opinion".
- Data points must be specific + sourced + credibility-rated + surprise-factor-rated + tagged for use (hook/stat_card/script_anchor/closing_punch). Minimum 3, target 5-8.
- Query construction rules: include current year in freshness queries; decompose compound topics (whole + mechanism + broader category); audience-aware variants (devs: architecture/code, execs: ROI/case study, public: "explained simply"); quote-mining patterns; search the negative space ("nobody talks about", "overlooked", `-[obvious_subtopic]`).
- Quality bar before submit: ≥3 existing content surveyed, ≥3 data points, ≥3 audience questions, ≥1 misconception, ≥3 angles, ≥5 sources, ≥10 searches.
- Constraints: 3-5 min research max, 10-25 searches, web search only (zero cost).
- If no data exists → record it (topic leans narrative/analogy). If no existing content → a content gap IS the opportunity, note prominently.
- Don't treat all sources equally; label credibility honestly; don't stop at surface-level search results.
**What we already do differently:**
- We already run parallel research sub-agents with 20+ queries each (stronger than the 10-25 here). We lack the explicit credibility-rating + surprise-factor tagging per data point and the "use" tagging (hook/stat_card/etc.) — worth adopting for our research files.

## explainer/script-director
**Summary:** Script is the backbone — mediocre script can't be saved by visuals. Enforces the dramatic arc (hook→setup→build→climax→landing), word budgets by duration/WPM, TTS-implementable delivery cues, and an enhancement cue density rule (≥1 visual cue per 8-10s). Every section carries speaker directions, enhancement cues, and pronunciation guides; scripts must be validated against the style playbook before submit.
**Rules we should adopt:**
- Arc: HOOK (0-5s, never "in this video we'll learn") → SETUP (create knowledge gap) → BUILD (progressive, "therefore/but" transitions, South Park rule — NEVER "and then") → CLIMAX (aha) → LANDING (recap + CTA, no new info).
- Word budgets by pace: conversational ~150 wpm (default), contemplative ~120, energetic ~180, technical ~130. Budget: 30s→65-75 words, 60s→130-150, 90s→195-225, 120s→260-300. If >20% over budget, cut ruthlessly.
- Speaker directions must be TTS-implementable: prefer structured delivery_cues (pace, energy, emphasis_words, pause_before/after, delivery_note, provider_text w/ SSML `<break>`) over prose; NEVER "smile while speaking".
- Enhancement cues per section (type + description + timestamp): overlay, diagram, stat_card, animation, code_snippet, broll. Density rule: ≥1 cue per 8-10s (60s video = 6-8 cues minimum).
- Pronunciation guides for technical terms/acronyms/non-English words.
- Every factual claim traceable to research; never invent statistics — re-search and add source if needed.
- Validate against playbook: pace/word density, voice style, motion pacing rules, mood.
**What we already do differently:**
- Our script flows from a user-designed framework with Vietnamese summaries + humanizer pass (target ≤30/100) and stance rules ("I/we/you" inside experience) — these aren't in openmontage. The arc + word-budget + delivery-cue discipline is directly applicable to our 03-script.md and our per-sentence ElevenLabs tagging.

## longform-educational/script-director
**Summary:** Longform scripts MUST be divided into chapters (60-120s each, self-contained narrative beats, unit of segment rendering). Each chapter has a mini-arc and contributes to the whole; every section carries chapter_id; a single voice_identity lives in metadata once and is used identically everywhere. Word budgets run 1,300-2,250 words for 10-15 min, and per-chapter duration math must be run after writing.
**Rules we should adopt:**
- Chapter structure: 8-15 chapters for 10-15 min; roles — ch1 hook, ch2-3 setup/definitions, ch4-8 build (the meat), ch9-13 climax/synthesis, final = landing/recap/CTA.
- Self-containment: each chapter opens with a one-line context anchor so a viewer joining mid-video understands; chapters must stand alone (they get re-rendered individually).
- Bridge lines between chapters ("So now that we know X, the real question is Y") — hides seams.
- Word budget (150 WPM; Vietnamese TTS slower, plan 130-140): 10 min→1,300-1,500 (110-125/chapter), 12 min→1,550-1,800 (130-150/chapter), 15 min→1,950-2,250 (160-190/chapter).
- After writing, run chapter duration math: flag any chapter >105% or <70% of its planned slot before it reaches the EP.
- Every section carries `chapter_id`; voice_identity (provider, voice_id, model_id, language, settings) present ONCE, identical everywhere.
- Enhancement cue distribution across ALL chapters — don't front-load into chapters 1-3 (90+ cues for 12 min).
- Centralize pronunciation guides in metadata (foreign names recur across chapters).
**What we already do differently:**
- Short-form only today. The chapter-as-segment-unit model is the key architectural idea for longform — it matches our 30s-segment render discipline scaled up.

## animation/idea-director
**Summary:** For animation-led videos, the brief must classify the animation mode upfront (diagrammatic / motion_graphics / kinetic_type / math_animation / illustrative / mixed), decide the visual path (which tools do the work) early, and define a reuse strategy — animation gets expensive when every scene is unique. Brief must be honest about missing tool capabilities immediately, not at the asset stage.
**Rules we should adopt:**
- Classify the animation mode explicitly — never treat all animation as one generic category.
- Decide the visual path early (diagram_gen / math_animate / code_snippet / image_selector / video_selector / provided art); if the mode depends on unavailable tools, say so in the brief immediately.
- Choose a reuse strategy upfront: recurring motifs, layout system, transition family, typography hierarchy.
- Quality gate: mode explicit, visual path feasible, project designed for reuse, honest about missing tools.
**What we already do differently:**
- We don't do a dedicated animation pipeline today; our Vox variant (2V) covers motion-graphics/karaoke. The mode-classification + reuse-strategy thinking applies if we add animated video styles.

## animation/script-director
**Summary:** Scripts are written in animation beats (statement / demonstration / transformation / comparison / conclusion — one clear visual idea per section) with writing style dictated by animation mode (Manim = precise/mathematical, Remotion = data-driven, AI video = descriptive/evocative). On-screen text is kept tight (max 8 words titles, 15 words descriptions), and visual holds are budgeted (3-4s breathing room per 10s of narration) so motion can land.
**Rules we should adopt:**
- One beat = one visual idea; beat types: statement (entrance animation), demonstration (main animation), transformation (morph/transition), comparison (side-by-side), conclusion (hold + emphasis).
- Writing style per mode: Manim = precise, maps to geometric transformations; Remotion = data-driven/punchy, maps to chart/component animations; AI video = descriptive/evocative scene descriptions; diagram stills = explanatory progressive build; mixed = tag each section's mode.
- On-screen text constraints: max 8 words titles, max 15 words descriptions; phrases over sentences; numbers/labels over paragraphs (math notation excepted).
- Visual hold budgeting: entrances 0.5-1s, reveals 1-2s, holds 1-3s, exits 0.5s; per 10s narration → 3-4s visual breathing room (90s video ≈ 60-65s narration + 25-30s holds).
- Motion-heavy videos need vocal breathing room: mark pauses where the viewer must absorb an animation; mark emphasis where a reveal/transform/comparison lands.
- Section metadata for motion intent: beat_type, animation_mode, text_constraints, narration_plan (describes/complements/silent), visual_priority, hold_time_seconds, delivery_cues, data_source.
- Research integration: ≥2 data points woven in, hook grounded in most surprising finding, ≥1 misconception addressed, cite sources naturally, never invent stats.
- Distinguish captions (narration transcribed) from on-screen text (designed content part of the animation) — they are not the same thing.
**What we already do differently:**
- N/A — new discipline for animation/vox-style scripting; our Vox karaoke captions map to the "on-screen text vs captions" distinction.
