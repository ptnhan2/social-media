# Mined Skills — 02-framework

> Knowledge extracted from openmontage skills (2026-08-04).
> Source: skills/ (164 files mined, 6 relevant to this branch).

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

## explainer/proposal-director
**Summary:** The proposal is the approval gate before any money is spent. It transforms research into ≥3 genuinely different concepts (each grounded in research, with title/hook/narrative structure/custom visual identity/duration/cost), presents them via progressive reveal (research summary → mood board → concepts → invite mixing → production plan), and forces an explicit itemized cost estimate + approval. Includes hard governance: present both composition runtimes, design visual identity instead of picking a preset, never hide costs or unavailable tools.
**Rules we should adopt:**
- Preflight tool availability BEFORE designing concepts — never propose a concept requiring tools you don't have.
- Mood board (3-5 reference images + 2-3 palette directions + tone references + music mood) presented before full concepts — cheap direction check that prevents expensive concept misses.
- ≥3 concepts with hook grounded in a specific research finding (cite it); never "In this video we'll...".
- Hook construction patterns: surprising stat, misconception flip, recency, question, contrast, insider knowledge (each maps to a research signal).
- Narrative structure chosen from research signals (myth_busting ← 2+ misconceptions; problem_solution ← pain points; data_narrative ← surprising data; comparison ← comparative data; etc.).
- Design a visual identity from content/audience/tone (palette built from the subject — don't default to blue); use a preset playbook only when it genuinely fits; generate custom playbook otherwise.
- Concept diversity is two checks: structural (different structures/hooks/research) AND conceptual (each offers a different INSIGHT; if you removed titles they'd still differ).
- Progressive reveal: research summary → mood board → concepts → "you can mix elements" → production plan. Each step is a course-correct point.
- Production plan: specific providers (not just selectors), availability from preflight, per-tool cost, honest why-this-provider, fallback if unavailable.
- Show quality/cost tradeoff matrices + ≥2 alternative production paths at different price points; always show budget cap + headroom.
- Music plan surfaced at proposal time (user library first, then generation APIs, then stock) — never defer music failure to the asset stage.
- Cost estimate itemized per operation with budget cap comparison and headroom note.
- Playbook violation budget: up to 20% of scenes may deviate intentionally, logged as playbook_override decisions.
- Surface voice/TTS decision at proposal time (provider, voice ID, cost, why it fits).
**What we already do differently:**
- Our framework gate is the user-designs-the-analytical-framework step (stricter — user is the author). We don't present multiple concepts/mood boards/cost alternatives because our briefs are single-framework; the tradeoff-matrix + preflight-honesty discipline still applies to our tool selection in Phase 2.

## longform-educational/research-director
**Summary:** The core difference from short-form: research depth must scale with duration. A 10-15 min video needs 5-8 sub-topics/facets (one per chapter), 8-15 data points (1-2 per chapter), 3-6 expert voices, and 10-20 sources — a brief with 6 data points for 12 planned chapters is a research failure. The brief must declare `longform_ready` and carry `chapter_candidates` + narration `voice_language`.
**Rules we should adopt:**
- Duration-driven depth: target 10-15 min → 5-8 sub-topics or facets; if the topic can't sustain 10 minutes, say so in research_summary before promising longform.
- Quality bar (vs short-form): data points 8-15, audience questions 8-15, expert voices 3-6 (one per major section), sources 10-20, chapter candidates 5-8, searches 15-30.
- Each angle indicates chapter_count (aim 8-15), chapter_progression (the arc across chapters), depth_strategy (longform rewards chapters 4-9 carrying the weight).
- Metadata: `longform_ready` bool, `chapter_candidates` list with one-line summaries, `voice_language` (e.g. `vi`) so TTS language param propagates to later stages.
- Find what a 60s video CANNOT cover — that's the longform opportunity space.
**What we already do differently:**
- Our research (20+ queries, 100+ sources/video) already exceeds these counts. We lack the per-chapter grounding requirement (each planned chapter must have citable material) — worth adopting when we plan longform.

## longform-educational/proposal-director
**Summary:** Every concept MUST include a chapter_plan (8-15 chapters, 60-120s each, named with one-line summaries, following a narrative arc) because the chapter structure IS the segment-render plan that drives everything downstream. The proposal must surface the render strategy (segment-based + draft pass) and lock a single voice identity for ALL chapters before production. Costs scale with duration (~$2-3.50 for 12 min) but re-renders are free (local).
**Rules we should adopt:**
- chapter_plan mandatory in every concept: 8-15 chapters, each 60-120s, arc hook→setup→build→climax→landing; user approves this at proposal time.
- Present render strategy explicitly: segment-based (fix chapter N = re-render N only, 5-15 min, vs full render 60-90 min), draft pass at scale=0.5, expected 1 draft + 1 final + per-fix re-renders. Never surprise the user with a 90-min render.
- Voice consistency plan mandatory: single voice_id + model_id (eleven_v3 default) + language (always set for non-English, e.g. `vi`, never auto-detect) + `settings_identical_across_chapters: true`; verify the voice supports the language (`verified_languages`) BEFORE proposing.
- Cost estimate at longform scale: per-chapter asset estimates, not flat; note most re-renders are $0 (local) — the paid cost is assets.
- Pitfalls: proposing 2-3 chapters for 12 min (each becomes 4-6 min = 30+ min re-render); locking a voice without language-support check; omitting the voice consistency plan.
**What we already do differently:**
- Our framework gate is user-designed frameworks (short-form focus today). The chapter-plan + voice-identity-lock + render-strategy disclosure is the blueprint for when we do longform.

## animation/research-director
**Summary:** Animation research covers BOTH what to explain (topic) and how to animate it (technique) — a math animation needs different visual research than a kinetic-type brand piece. Adds an animation-technique search batch (how others visualize this concept, which modes map where, complexity rating, novelty), a visual_potential rating on every data point, and a mathematical/technical accuracy check so the animation never oversimplifies to the point of being wrong.
**Rules we should adopt:**
- Dual-track research: topic batches (landscape/trending/data/audience as in explainer) PLUS animation-technique batch: `[topic] (visualization OR infographic OR diagram)`, `[topic category] animation technique (motion graphics OR manim OR "after effects")`, "step by step / how it works visual", "animate [process]".
- Record for each technique: what it is, where used, which mode it maps to (manim/remotion/motion_graphics/ai_video/illustrative), complexity (simple/moderate/complex), novelty for this topic. Minimum 2, target 4-6.
- Every data point gets a `visual_potential` rating — can this be ANIMATED? ("73% → 23%" is a great shrinking-bar moment; "it's important" is not).
- Math/technical accuracy check for math-science topics: search formal definition + "common error" / "often confused with" / "technically incorrect"; record acceptable simplification level and misleading metaphors (e.g. "electrons orbiting like planets" is wrong).
- Angles carry `animation_fit` referencing technique research; diversity requires different animation modes across angles.
**What we already do differently:**
- N/A (no animation research track). If we pursue math/technical animation, the accuracy-check step is critical.

## animation/proposal-director
**Summary:** The unique dimension is animation mode selection — for animation videos, the mode IS the visual approach (Manim vs Remotion vs AI video vs motion graphics shapes everything). Mandates a live tool-availability scan (read from registry, never hardcode providers/costs), an animation-approach decision matrix (image-based vs clip-video vs Manim vs data-viz vs diagram-stills vs mixed), and mode-selection rules. Programmatic animation is FREE, so these pipelines can be far cheaper than explainers.
**Rules we should adopt:**
- Present tool availability scan BEFORE concepts (grouped by capability, live from registry): image gen, video gen, composition runtimes, audio, math/diagram. Never type provider names/costs/keys from memory — they drift.
- Animation approach decision matrix: A) Image-Based Animation (2-3 AI images per scene crossfaded + camera motion + particles — proven), B) Clip-Based Video (AI video clips — most cinematic, least consistent, not proven), C) Manim programmatic (precise, 3Blue1Brown style), D) Data Viz (Remotion charts/KPI — proven zero-key), E) Diagram + Image Stills, F) Mixed.
- Mode selection rules: visual/artistic → A; data/statistics → D (or A w/ data overlays); math/physics → C if available else E; abstract w/ budget → B for key moments; no paid APIs → D or E; always offer ≥1 free/local option; NEVER silently downgrade (if best approach needs a key the user lacks, say so).
- Animation hook patterns: Visual surprise ("Watch X transform into Y"), Misconception flip ("You've been visualizing X wrong"), Progressive reveal ("Start simple, end complex, every step animated"), Impossible camera ("What if you could see the invisible process?"), Data surprise. Hooks must promise a VISUAL experience.
- `progressive_build` narrative structure (3Blue1Brown's classic): start simple, add complexity layer by layer.
- Concept diversity: no two concepts use the same animation approach; ≥1 achievable free/local-only; each grounded in tool availability AND technique research; each states required API keys.
- Reuse strategy in every production plan: recurring_motifs, layout_system, transition_family, typography_hierarchy, estimated_unique_scenes vs reusable_templates.
- Cost note: Manim/Remotion/diagram_gen are FREE — primary cost is TTS + AI images; justify expensive AI video when free alternatives exist.
- Don't distinguish-but-confuse image_animation vs clip_video: image-based = stills + Remotion motion; clip-based = actual AI-generated clips.
**What we already do differently:**
- Our 2V Vox pipeline is closest (paper-collage + kinetic typography + karaoke). The approach-matrix + mode-selection + reuse-strategy discipline is a model for expanding visual styles beyond layouts.
