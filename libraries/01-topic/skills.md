# Mined Skills — 01-topic

> Knowledge curated for the current production pipeline (2026-08-12).
> Source: skills/ (164 files mined, 3 relevant to this branch).

## video-reference-analyst
**Summary:** Handles "make me something like this" requests (reference video → new production). Analyzes the reference with VideoAnalyzer (`analysis_depth: "standard"`) and MUST emit a 5-aspect breakdown (Subject, Subject Motion, Scene, Spatial Framing, Camera) — the canonical form downstream proposal/script/scene-directors ingest directly. Per-scene `motion_type` (motion_clip/animated_still/static_image) decides whether to plan around video gen or image+composition. The protocol mandates: capability audit with honest gaps, critical questions (lock audio architecture before proposals), a mandatory lightweight research pass, 2-3 creatively differentiated proposals with itemized costs, a Layer 3 skill gate before ANY generation, and sample-first production before entering the full pipeline.

**Key numbers/params:**
- `analysis_depth: "standard"`, `max_keyframes: 20`; motion types: `motion_clip`, `animated_still`, `static_image`, plus `flow_variance`
- Lightweight research: 3-5 similar videos, 3-5 subject data points, 2-3 minutes web-search budget
- 2-3 proposal variants; differentiation patterns: same structure/different subject, same subject/different angle, same tone/different treatment, same content/different platform, counter-take
- Clip duration: prefer 10s clips over 5s (60s video = 6×10s, not 12×5s — half the cost, fewer cuts); most providers support 5s and 10s
- TTS default recommendation: Google Chirp3-HD (near-free, expressive, 24kHz); ElevenLabs for voice cloning only; never hardcode provider — run preflight
- Sample: 10-15 seconds, 1-2 scenes (hook + one middle scene); stored at `projects/<name>/assets/sample/sample_v{N}.mp4`
- 5 aspects must each be marked N/A when not applicable — silent omission is the most common analyst failure

**Actionable rules:**
- Never guess whether a reference uses images or video — read `motion_type`; getting this wrong selects the wrong pipeline
- NEVER propose a carbon copy; each proposal needs a creative twist; always recommend one option with a reason
- Do NOT pick the provider for the user — present cost comparison table, recommend, let them decide
- Read every Layer 3 skill referenced by each tool's `agent_skills` BEFORE writing generation prompts; NEVER read tool source code (*.py) to learn usage
- Sample-first is mandatory — push back gently if user wants full production immediately
- Do not collapse pipeline stages or skip `checkpoint_required` gates; Layer 3 skill gate and step 3b research are non-optional
- Gap honesty: if video gen is unavailable, say so and offer stock-footage fallback options

---

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

## animation/idea-director
**Summary:** For animation-led videos, the brief must classify the animation mode upfront (diagrammatic / motion_graphics / kinetic_type / math_animation / illustrative / mixed), decide the visual path (which tools do the work) early, and define a reuse strategy — animation gets expensive when every scene is unique. Brief must be honest about missing tool capabilities immediately, not at the asset stage.
**Rules we should adopt:**
- Classify the animation mode explicitly — never treat all animation as one generic category.
- Decide the visual path early (diagram_gen / math_animate / code_snippet / image_selector / video_selector / provided art); if the mode depends on unavailable tools, say so in the brief immediately.
- Choose a reuse strategy upfront: recurring motifs, layout system, transition family, typography hierarchy.
- Quality gate: mode explicit, visual path feasible, project designed for reuse, honest about missing tools.
**What we already do differently:**
- IsaacVerse uses dedicated semantic motion treatments selected by narrative purpose; topic research must supply the evidence each treatment needs.
