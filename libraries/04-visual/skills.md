# Mined Skills — 04-visual

> Knowledge extracted from openmontage skills (2026-08-04).
> Source: skills/ (164 files mined, 41 relevant to this branch).

## typography
**Summary:** Defines the complete text-spec system for video: minimum readable sizes per element at 1080p/4K, broadcast safe-zone margins plus per-platform vertical safe zones, subtitle/caption specs (chars per line, lines, contrast), and text-animation timing with easing curves. Prescribes a curated font family system (1-2 families max) with proven heading/body pairings. All text must sit inside the title-safe area and hold on screen long enough for the reading speed.
**Key numbers/params:**
- Title: 60-90px @1080p / 120-180px @4K; body: 40-60px / 80-120px; subtitles 42px+ or 3-5% of video height; no text below 40px @1080p
- Max chars/line: 32-42 subtitles, 30 overlays; max 2 subtitle lines, 3 overlay lines
- Title safe = 80% frame (192px H margin @1080p → 1536x864px); action safe = 90% (96px margin)
- Universal vertical safe zone: 900x1400px centered
- Platform vertical safe zones: TikTok 900x1492, IG Reels 996x1400, YT Shorts 984x1500, FB Reels 1080x1520, IG Stories 1080x1620
- Contrast: 4.5:1 min (WCAG AA), 7:1 optimal; large text >18pt = 3:1
- Reading: 13 chars/sec min dwell, 21 chars/sec caption speed; 3s per 63 chars; title cards 3-6s; hold 1s per 13 chars after animation
- Animation: fade 0.3-0.5s, slide/scale 0.5-1.0s, kinetic/lower-third in 1.0-2.0s, lower-third out 0.5-1.0s
- Easing: easeOutCubic (0.33,1,0.68,1) default; caption min 1s / max 6-7s; gap 2 frames; sync tolerance 3 frames
- Subtitle bg: semi-transparent black 70-80% opacity; stroke 2-4px; bottom margin 60px; ≤90% frame width
- WPM by platform: TikTok/Reels 180-200, YouTube 160-180, LinkedIn 140-160, educational 120-140
- Lower third: 1920x360px region; in 1-2s, display 3-6s, out 0.5-1s
**Actionable rules:**
- Limit to 1-2 font families per video; heading must be ≥50% larger than body; sans-serif for motion/captions, serif only for cinematic cards, script fonts only for hero titles
- Never use linear easing for text animation (feels robotic)
- Verify 4.5:1 contrast on a representative graded frame; prefer white-on-dark (21:1)
- Load all fonts via @import/fontFamily and test rendering in the render environment
- For text-over-video, prefer 70-80% black box, then stroke, drop shadow last

## data-visualization
**Summary:** Chart-type decision tree (bar/line/pie/KPI grid/horizontal bar) gated by data-point count, with explicit "when NOT to chart" cases. Mandates animated build-up (2-4s) plus 3-5s hold before scene cuts, and per-chart label placement rules (values above bars, pie slices ≥10% labeled inside, ≤5-6 slices). Enforces data density limits for video readability, size minimums, playbook-derived colors, and accessibility (no color-only meaning, 3:1 contrast, no red-green).
**Key numbers/params:**
- Chart decision: <3 points → stat card; 3-9 → chart; >12 → aggregate top-N + "Other" first
- Density limits: bars 5-7 (max 9), line 5-12 points (max 15), pie 3-5 slices (max 6), KPI grid 3-6 (max 6)
- Timing: build 2-4s + hold 3-5s (min scene ~5s); bar stagger 0.1s; highlight 0.3-0.5s; KPI counter 1.5-2s; labels 0.2-0.3s; comparison transition 1-2s
- Fonts @1080p: title 32px (rec 36-40), axis/value labels 24px (28), annotations 20px, source 16px; 4K = 2x
- Pie: ≥10% slices labeled inside, <10% outside with leader line; aggregate <5% into "Other"
- Colors: primary[0]/accent[0] alternating; highlight = full saturation + 1.05x scale; non-focus = 30% opacity; baseline dashed
- Max 4-5 distinct colors per chart; contrast ≥3:1 between adjacent elements
**Actionable rules:**
- Bar chart y-axis always starts at 0; never 3D charts; avoid dual y-axes (split charts instead); no scatter in video
- Every chart needs title + units + source citation; no orphan labels
- Minimum 2s build (animation <1.5s too fast to track); hold 3-5s or extend the scene
- Round aggressively ($1,234,567 → $1.2M); aggregate time periods; split multi-metric scenes
- Key data point must get visual emphasis; use patterns + labels, never color alone

## video-gen-prompting
**Summary:** Universal video-generation prompt vocabulary built on the canonical 5-aspect skeleton (Subject / Subject Motion / Scene / Spatial / Camera), based on CMU/Harvard research showing VLMs fail on motion, spatial, and camera unless forced. Includes full cinematographic vocabularies: shot types, camera movements (translation vs rotation vs lens-only), camera height/angle, POV, lighting, lens/DoF, playback speeds, subject transitions, identity anchoring. Prompt length sweet spots per model; prefers Seedance 2.0 as premium default.
**Key numbers/params:**
- 5-aspect skeleton: Subject, Subject Motion, Scene, Spatial, Camera — forcing all five is highest-leverage
- Prompt length sweet spots: Seedance 2.0 200-400 words (80-150 inserts), Wan 2.2 200-400, Sora 2/VEO 3.1 100-250, LTX-2 ≤80, Runway Gen-4 ≤60
- Seedance 2.0: Elo 1269 (#1 Artificial Analysis); reference-to-video 9 img + 3 vid + 3 audio
- Lens: wide 24-35mm, telephoto 85mm+; identity: repeat 3-6 disambiguating attributes verbatim per shot
- Static shot = zero movement, zero focus change, zero zoom (strict)
- Playback speeds: time-lapse, fast-motion (1x-3x), slow-motion, stop-motion, speed-ramp, time-reversed
**Actionable rules:**
- Write prompts self-contained: if a reader can't picture it, the model won't render it
- Replace emotional adjectives with visual causes ("sad character" → "tears on cheek, shoulders slumped"); "epic/inspiring/moody" don't constrain pixels
- dolly ≠ zoom (translation vs focal length); pan ≠ truck (rotation vs lateral translation); bird's-eye ≠ aerial (strict top-down vs altitude)
- List overlays separately — never "overlay in the foreground"
- Name subject transitions with cause: "by subject movement" or "by camera movement"
- Repeat identity attributes verbatim in every shot — pronouns and "the same character" fail
- One speaker per clip for dialogue; put dialogue in quotes; keep physics simple; commit to one lighting setup
- Iterate: start simple, add one element at a time; freeze camera + simplify action on misfire

## video-stitching
**Summary:** Assembly strategy for multi-clip videos: decision tree between sequential stitching, spatial compositions (side-by-side/PIP/grid), AI clip chaining (LTX-2 ~8s clips), and hybrids. Transition selection by content relationship (hard cut same-scene, crossfade topic change, fade-through-black section break, J/L-cuts for dialogue). Audio coordination at stitch points with per-type LUFS targets, plus ffmpeg-level pitfalls (codec mismatch, audio drift, VFR, GOP structure) and a full stitch-plan template.
**Key numbers/params:**
- AI clips: LTX-2 ~8s max; normalize FPS; overlap prompts (last frame N = first frame N+1)
- Transitions: hard cut 0ms; crossfade 0.5-1.5s; fade-through-black 0.5-1.0s; L/J-cut 0.3-0.5s; AI good-continuity 0.3-0.5s crossfade
- Transition by pace: fast (<60s) crossfade 0.3-0.5s; medium 0.5-1.0s; slow (>10min) 1.0-1.5s
- PIP: bottom-right + 20px padding, 20-25% frame for commentary, 30-35% equal importance, 2px border
- Spatial: side-by-side duet main 70% width; before/after 50/50; commentary PIP corner 20-25%
- Audio targets: narration -16 LUFS, music under narration -28 to -24, music-only -14, SFX -20; -1 dBTP
- Codec fallback: `-c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k`; VFR→CFR `-vsync cfr -r 30`
- Audio drift: constant frame rate + `-async 1` for AI chains; 5ms fades / zero-crossings against pops
**Actionable rules:**
- Match resolution, FPS, aspect ratio, codec, and color across clips before stitching (probe with ffprobe); re-encode only minority clips
- Pad or crop non-conforming aspect ratios — never stretch
- Never let music cut abruptly at a stitch — crossfade or duck; if music spans clips, mix as single track post-concat
- Duck music -12 dB under narration at all times at stitch points
- Strip AI clip audio (not continuous); apply global color grade post-stitch
- Verify with playback scrub through every stitch point before declaring done

## remotion
**Summary:** Remotion is the default composition engine for ALL final renders (React-based, one render pass for video clips, stills, animated scenes, transitions, data-driven batch). FFmpeg is the fallback for simple standalone ops (trim, concat, subtitle burn) only. Supports 12 cut types (`text_card`, `stat_card`, `hero_title`, `callout`, `comparison`, `bar_chart`, `line_chart`, `pie_chart`, `kpi_grid`, `progress_bar`, `anime_scene`), where `anime_scene` creates animated-looking scenes from 1-4 still images via crossfade + camera motion + particles. A validated "zero-key video formula" (coherent background family, flat props, KPI rules, 4-6s scene pacing) produces polished videos with zero external assets. Pre-render `composition_validator` and post-render ffprobe verification are mandatory.

**Key numbers/params:**
- Crossfade overlap `crossfadeDur` ~1.2s; generate 2-3 images per scene from same visual system, vary shot/subject/lighting, use nearby seeds
- Scene pacing: 4-6s per scene; 8-10 scenes for a 45-50s video; chart animations ≥4s; hero title 4s
- 4-5 accent colors, reuse the same `chartColors` array across bar/pie/line scenes
- Media profiles: youtube_landscape 1920x1080@30, shorts/tiktok/reels 1080x1920@30, instagram_square 1080x1080@30, cinematic_wide 2560x1080@24
- Transition timing 15 frames; music volume 0.06-0.15, `fadeInSeconds` 2, `fadeOutSeconds` 3
- CRF 18 standard/master, CRF 32 draft; duration tolerance ±5%; narration transcription word count must be ≥80% of script
- KPI `value` auto-formats ≥1M→"XM", ≥1K→"XK" (use `value: 8.1, suffix: " Billion"`); `change` must be a number not a string
- Node.js 18+; render in series not parallel (each render spawns Chromium)

**Actionable rules:**
- DO NOT use CSS animations/transitions or Tailwind `animate-*` classes — use `useCurrentFrame()` + `interpolate()` with `extrapolateLeft/Right: 'clamp'`
- #1 footgun: `useVideoConfig().durationInFrames` returns COMPOSITION duration, not Sequence duration — pass `sceneDurationSeconds` prop and compute `effectiveDuration = Math.round(sceneDurationSeconds * fps)`
- Always run `composition_validator` before rendering; gate: ffprobe output MUST have an audio stream (missing audio = stop, fix audio prop, re-render)
- Music must be ≥ video duration (loop or extend); narration longer than video must be shortened and regenerated
- Do NOT specify `src/index.ts` entry — Remotion auto-discovers; composition name is `Explainer`
- Dynamic duration via `calculateMetadata` when TTS audio drives length; `staticFile()` for assets; `audio_energy.py` to auto-find music `offsetSeconds`
- Text-bearing scenes (CTA, titles) use `text_card`, never AI-generated images containing text

---

## color-grading
**Summary:** Color grading with 7 built-in profiles (cinematic_warm/cool, moody_dark, bright_clean, vintage_film, high_contrast, neutral) plus intensity control and a defined FFmpeg filter chain. Skin tones are the most critical element — healthy skin sits on a vectorscope line at ~123° and saturation must never exceed 1.2 on footage with people. LUTs (`.cube`) are applied LAST on already-corrected footage at 0.6-0.8 intensity, one LUT per project. Generated graphics must be colorblind-safe (Wong palette) and meet WCAG contrast.

**Key numbers/params:**
- Intensity: 0.6-0.85 for subtle grades, 1.0 full effect; recommended default start 0.8; generated/stylized visuals grade lighter at 0.5-0.6
- Profile by content: corporate/saas=bright_clean 0.8; science/edu=neutral 1.0; storytelling=cinematic_warm 0.85; tech=cinematic_cool 0.7; drama=moody_dark 0.6-0.7; social=high_contrast 0.8; retro=vintage_film 0.7
- Skin tone line ~123° on I-line; saturation never >1.2 with people; `moody_dark` kept at 0.6-0.7 to avoid grey skin
- `colorbalance` range -1.0 to 1.0 (rs/gs/bs shadows, rm/gm/bm mids, rh/gh/bh highlights); `colortemperature` 6500=neutral (lower=cooler)
- WCAG: body text 4.5:1 (AA), large text >18pt 3:1, AAA 7:1, UI components 3:1
- Wong palette: black `#000000`, orange `#E69F00`, sky blue `#56B4E9`, bluish green `#009E73`, yellow `#F0E442`, blue `#0072B2`, vermillion `#D55E00`, reddish purple `#CC79A7`
- Keep parameter changes small — ±0.05 per adjustment, then review
- LUT stored in `assets/luts/`, applied via blend at `all_opacity=0.7`

**Actionable rules:**
- Filter chain order: normalize → colortemperature → colorbalance → curves → eq → lut3d (creative LUT applied LAST)
- Always correct before grading (normalize/white-balance first, then creative LUT); test on skin tones first
- One LUT per project — switching LUTs between scenes creates inconsistency; same profile across all clips in a video
- Test on a single frame before grading the full video
- Enhancement order: subtitle → face → color → audio → final (grade AFTER face enhancement)
- Use Wong palette for all generated graphics (diagrams, code snippets, overlays); burned-in text must still meet 4.5:1 contrast against the graded background

---

## ffmpeg
**Summary:** FFmpeg handles all non-AI video/audio processing: trimming, concat, speed, audio mixing/ducking, subtitle burn-in, face enhance, color grade, loudness normalization. Tools: `video_trimmer`, `video_compose`, `audio_mixer`, `frame_sampler`, `face_enhance`, `color_grade`, `audio_enhance`. A fixed enhancement chain order avoids filter interactions, and platform-specific loudness targets standardize delivery. Codec-copy is used for lossless cuts; re-encoding only when filters apply.

**Key numbers/params:**
- `-c copy` for lossless cut/concat (instant); re-encode `-c:v libx264` when applying filters; CRF default 23, 18-20 for final deliverables
- Subtitle burn-in: vertical video font_size 18, max 3 words/cue, margin_v 50; horizontal font_size 22, max 6 words/cue, margin_v 40
- ASS color format `&H00FFFFFF` (8-char, not `&HFFFFFF`); escape Windows paths `C\:` in the subtitles filter
- Loudness targets (LUFS / LU range): social media -14 / 5-7; YouTube -14 to -16 / 7-11; podcast -16 / 7-11; broadcast -24 / 7. `clean_speech` preset = -16 LUFS, 11 LU
- Color grade intensity: 0.85 default (cinematic_warm talking head), 0.5 subtle, 1.0 may look over-processed
- Audio ducking: `sidechaincompress` threshold=0.02, ratio=9, attack=200ms, release=500ms
- Concat: demuxer `-f concat -safe 0` for same-codec segments; re-encode all segments first for mixed codecs/resolutions

**Actionable rules:**
- Enhancement chain order: subtitles first → face enhance → color grade → audio enhance last
- Subtitles must stay in bottom 20% of frame, never covering the face
- No audio clipping or silence gaps at cut points; loudness within platform target

---

## subtitle-sync
**Summary:** `subtitle_gen` converts word-level transcript timestamps into SRT, VTT, or caption JSON, grouping words by per-format word/character limits. Cue-length rules differ sharply between vertical (short-form, 3-4 words) and horizontal (YouTube/web, 6-8 words) formats, driven by reading speed and screen width. Burn-in styling uses ASS `force_style` with 8-char color format; timing must align cue start to word onset and extend ~200ms past the last word.

**Key numbers/params:**
- Vertical (1080x1920): max 3-4 words/cue, max 20 chars/line; Horizontal: max 6-8 words/cue, max 42 chars/line (broadcast limit)
- Average reading speed ~15 chars/second; min display 0.5s/cue, max 5s/cue
- Cue end extends ~200ms past last word; never linger into next speaker's turn
- Vertical ASS style: Arial, font_size 18, bold, outline_width 3, shadow 2, margin_v 50, alignment 2; Horizontal: font_size 22, outline_width 2, shadow 1, margin_v 40
- Common mistakes: font_size 28 fills a 9:16 frame (use ≤18); 5+ words on vertical covers the face; MarginV >200 pushes off-screen (stay <100)
- Color format `&HAABBGGRR` (8-char, e.g. `&H00FFFFFF` white, `&H00000000` black outline)

**Actionable rules:**
- Subtitles mandatory for vertical short-form (most viewers watch muted)
- Cue start must match word onset (not before speaker starts)
- Every spoken word must appear in a cue; cues never overlap
- Fallback: when word timestamps unavailable, use segment-level timing with even distribution

---

## reviewer
**Summary:** Instruction-driven self-review replacing the Python reviewer class — the quality gate between "work done" and "work accepted" at every stage checkpoint. Critique quality follows the CHAI rules (Accurate = cite artifact fields/lines/frames, Complete = hunt the same error class, Constructive = every critical finding must carry a concrete proposed fix). Findings are graded critical/suggestion/nitpick/investigation; decision is Pass / Revise / Pass-with-warnings with a hard 2-round cap. Includes specialized reviews: reference alignment, slideshow risk, decision log, creative differentiation, delivery promise, source understanding, final self-review, and atelier/composition-authoring doctrine enforcement.

**Key numbers/params:**
- Severity: critical (blocks), suggestion (should fix, needs `proposed_change`), nitpick, investigation (cannot pinpoint fix — surface, don't block)
- Critical finding WITHOUT a `proposed_fix` is downgraded to `investigation`
- Max 2 revision rounds, then Pass with warnings — perfectionism kills pipelines
- Slideshow risk: average ≥4.0 = CRITICAL fail; ≥3.0 = SUGGESTION; flag dimensions ≥3.5; recompute at scene_plan and edit stages
- Creative variation: score ≤2 = CRITICAL ("poor"), ≤3 = SUGGESTION ("fair"); every scene needs `shot_size` + `shot_intent`, hero moments need all 6 shot_language fields
- Cost drift >30% over estimate without re-approval = CRITICAL
- Final self-review: `frames_sampled >= 4`, all 5 checks (`technical_probe`, `visual_spotcheck`, `audio_spotcheck`, `promise_preservation`, `subtitle_check`) must have data
- Motion-led promise with <50% motion cuts flagged even if technically valid
- Atelier: any stock `cut.type` in atelier `edit_decisions.cuts` = CRITICAL; hero work locked to `templated` = CRITICAL unless sanctioned exception; `composition_mode` decision must list both `["templated","atelier"]`

**Actionable rules:**
- Every finding references a concrete field, line, or frame — forbid hallucinated criticism; vague findings ("hook is weak") are failures
- Don't inflate severity: missing schema field = critical, wordy paragraph = suggestion, comma splice = nitpick
- Review the artifact, not the process; playbook is law (violations always flagged)
- Reference grounding: factual errors about the reference and carbon copies = CRITICAL; user-loved elements dropped = SUGGESTION
- Runtime swap at compose without approved `render_runtime_selection` decision = CRITICAL; silent downgrade (motion→still) = CRITICAL
- Missing `source_media_review` when user files exist, or files listed as reviewed without probe data = CRITICAL
- Hero-component spine (two+ scenes sharing the same primary visual subject) = CRITICAL; signature device present in MOST beats = CRITICAL; absence of recorded scene-distinctness inventory itself = CRITICAL

---

## bespoke-composition
**Summary:** Atelier mode is the hand-authored composition path for hero pieces — every pixel written fresh so no two videos share a visual language. Governing rule: reuse engine knowledge, never creative components (stock `cut.type` scenes, registry finished blocks, pre-baked components are off-limits). The construction route is: commit to an art direction for THIS subject (taste_profile + one signature device) → plan each scene as its own composition (no hero-component spine) → pick motion principles not presets → get engine mechanics right → render through the runtime-appropriate bespoke path. HyperFrames is inherently atelier; Remotion atelier bypasses the cut registry via `_render_via_atelier`. Bespoke compositions are throwaway and project-local, never shared.

**Key numbers/params:**
- Composition axes locked at proposal: `renderer_family` (grammar), `render_runtime` (remotion/hyperframes/ffmpeg), `composition_mode` (templated vs atelier)
- Atelier default for: marketing, launches, impressive explainers, brand pieces, any single-deliverable where quality is the point; templated for batch/localization/drafts
- Signature device appears in 1-2 beats max (typically climactic) — earns weight by being scarce
- HyperFrames: compose 2-4 distinct atomic rules per beat; ≥3 different easings across the piece; 36+ atomic rules, 15+ blueprints, 16 transition families, 7 runtime adapters; `html-in-canvas-patterns` used for 1-3 hero beats only
- Atelier render params: `scale: 0.5` for fast draft (drop for 1080p final), `crf: 18`, `concurrency: 8`; no `asset_manifest`/`cuts` required
- Scaffold via `scripts/scaffold_atelier_project.py <slug>`; HF scaffold via `npx hyperframes init <slug>`
- HF: sub-composition mounts past 4 clips; `npx hyperframes beats .` emits `{time, strength}` per beat
- Assets-gate filmstrip: one still per scene at mid-scene frame via `npx remotion still ... --frame=<fps * mid_seconds>`
- Known gap F13: `hyperframes_compose.render` requires `edit_decisions.cuts[]` — call `npx hyperframes render .` directly for hand-authored HF

**Actionable rules:**
- No `Math.random()` / `Date.now()` per frame — use Remotion `random(seed)` or a seeded helper (determinism)
- `<Audio>` rejects `file://` — only `<OffthreadVideo>`/`<Img>` accept absolute paths; use `staticFile()` for audio/video
- Fonts: `loadFont()` from `@remotion/google-fonts/<Name>` at module scope, once
- GSAP in Remotion: paused timeline + `.seek(frame/fps)` — never `requestAnimationFrame`
- HF contract: every timed element needs `data-start`, `data-duration`, `data-track-index`, AND `class="clip"`; root `<body>` needs `data-composition-id`; every timeline `gsap.timeline({ paused: true })` registered in `window.__timelines`
- Captions vs on-screen text: pick ONE role per piece (meaning-adding vs accessibility subtitle), never both for the same line
- No silent fallback to stock; per-scene plan is a first-class artifact (write `art-direction.md` + `scenes.md` before composing)
- Checkpoint cadence: script+scene_plan approval → assets gate (filmstrip stills, no draft render to "earn" it) → first-render checkpoint
- Study worked precedents for PROCESS only — next piece must look like none of them

---

## taste-direction
**Summary:** Defines the video taste profile contract (`taste_profile`) — the compact creative contract carried through proposal, scene planning, asset prompts, edit, compose, and review. It starts with a specific design read (not adjectives), then three 1-10 integer dials (`visual_variance`, `motion_intensity`, `information_density`) that explain downstream choices, then a style path (existing playbook / custom playbook / atelier art direction) and a reference strategy. A checklist of anti-defaults catches generic AI-look failures before they ship.

**Key numbers/params:**
- Dials 1-10: visual_variance (tight system → distinct mode per beat), motion_intensity (calm holds → fast kinetic), information_density (one idea → dense dashboards)
- Dial logic: high motion + low info = short kinetic beats; low motion + high info = stable frames + chart builds; high variance = stronger anchors (type/palette/framing/sound motif)
- Anti-default flags: generic AI-purple gradients/corporate blue without subject reason; same transition on every cut when variance ≥4; dense callouts when density ≤4; kinetic motion hurting narration; text-only slides without typographic intent
- Reference strategy: one reference still per scene family or major beat — never compress the whole direction into one mood board
- Good design read ties to audience/promise/platform/subject (e.g. "Investor-facing AI launch: precise, restrained, credible"); weak reads = "modern and clean"/"cinematic"/"professional"

**Actionable rules:**
- State the design read BEFORE choosing a playbook or palette; do not let preset availability override the design read
- Set the three dials before writing concepts — they should explain later choices
- Add `production_plan.taste_profile` at proposal, log playbook selection in `decision_log`, explain how dials affect runtime/composition mode/assets
- At assets: include palette, texture, framing, reference strategy in prompts; generate reference stills before full batches
- For brand/product work inspect the real product surface and write an audit note before overlays
- Review hook: "Could this video belong to any topic after replacing the title?" If yes, the taste direction is too generic

---

## animation-runtime-selector
**Summary:** Answers two routing questions: which composition runtime (Remotion / HyperFrames / FFmpeg) and which animation library (Remotion primitives vs GSAP plugins vs Lottie/Manim/D3). Authoring mode (templated vs atelier) comes first — atelier is the default for hero work and blocks stock scene-types. A HARD RULE requires presenting BOTH runtimes to the user before locking `render_runtime` when both are available, and logging both in `options_considered`. A "keep it simple" bias says use Remotion primitives if they solve the scene in ≤20 lines, escalating to GSAP plugins only beyond that; GSAP must run deterministically (paused timeline + seek, never rAF).

**Key numbers/params:**
- Keep-it-simple test: primitive API solves it in ≤20 lines → use Remotion primitives (interpolate for fade/slide/scale, `spring({frame, fps, config:{damping, stiffness}})` for bounce)
- Runtime routing: React scene stack/captions/avatar → remotion; kinetic typography, website→video, registry blocks, beat-synced music, motion graphics → hyperframes; pure concat/trim → ffmpeg; selected runtime unavailable → escalate (never substitute silently)
- Library matrix: per-word text reveal → Remotion interpolate + word-level transcript; SplitText/MorphSVG/MotionPath/DrawSVG/CustomEase/Flip → GSAP plugins; 12 principles → framer-motion + Lottie; math → Manim; data viz → D3; charts (bar/line/pie/KPI) → Remotion built-ins
- 3 deterministic GSAP-in-Remotion patterns: (1) paused timeline `.progress(frame/durationInFrames)`, (2) paused timeline `.seek(frame/fps)`, (3) GSAP as value calculator (`gsap.parseEase('power2.out')`)
- Decision must be logged: category `render_runtime_selection`, BOTH runtimes in `options_considered`

**Actionable rules:**
- Present both runtimes with one-line description + one-line honest tradeoff + recommendation, wait for explicit approval; silent defaulting = CRITICAL reviewer finding
- Silent runtime swaps at compose time are contract violations
- Never use GSAP with `requestAnimationFrame` inside Remotion (non-deterministic); register GSAP plugins at module scope/app entry, never inside a component body
- Don't pull GSAP into a scene that only needs fade/slide; when a plugin is indicated, always read its Layer 3 skill

---

## vox-editorial-pipeline
**Summary:** Vox-style longform editorial explainer pipeline (paper-collage, kinetic typography with highlight sweeps, karaoke subtitles) — the "one folder + one gate + one skill" model. Canonical knowledge lives in `docs/vox-pipeline/playbook.md`; `gate_vox.py` is the automated quality gate and the agent is not the judge (0 FAIL required before every deliverable). Non-negotiable user-approved visual rules (paper backgrounds, Vox yellow only on dark scenes, subject cutouts via rembg, 10-type motion library with settle-jitter-then-hold) are gate-enforced — regression means reject. Asset provenance and anti-slideshow density requirements are mandatory. Scenes are DATA (`SCENES[]`), never hand-written timings.

**Key numbers/params:**
- PIPELINE_VERSION `2026-08-03-v10` (must match playbook/README/gate_vox.py/AGENTS.md)
- Paper bg cream `#F5F0E8` / dark `#171A1C` (noise+fiber+halftone+vignette); Vox yellow `#fff200` DARK scenes only, light scenes → amber `#C77F00` (gate-enforced)
- Accent variety ≥3 colors across video: red `#D64541`, blue `#2E74B5`, green `#2E7D32`
- Scenes 4-10s, sentences grouped; last item within 4s of scene end; PenArrow labels hold 2.5s+ (`labelStart`/`labelEnd`)
- Asset density (5+ min): ≥25-35 stock images (~1 img/10-13s; 10 images for 408s was rejected); ≥8 human/statue images (portraits/silhouettes/hands/statues/puppets); landscape/interior ≤1/3 of total; rembg cutout floor ≥60%
- Costs: TTS `chars × 0.0003`, music `duration/30 × 0.05`; music looped at 0.05 volume, Pixabay free first else 2-3 min compose
- Draft render: `--frames=0-1349 --every-nth-frame=3 --scale=0.2 --concurrency=8 --x264-preset=ultrafast --crf=32 --image-format=jpeg --jpeg-quality=45 --gl=angle` (~40s); master: scale=1, preset=medium, crf=18 (~40 min)
- Draft 10fps/384x216 = content-review only; motion needs 15fps+ or master
- Fonts: LOCAL woff2 in public/fonts + @font-face — `@remotion/google-fonts` FAILS headless

**Actionable rules:**
- Run `gate_vox.py` before EVERY deliverable (static + `--video` for audio/frame checks); 0 FAIL required, WARN acceptable
- Edit `SCENES[]` data, never the engine; copy timings from `timeline.json`, never hand-write
- Never Ctrl-C a Remotion render — kill chrome-headless processes (`Get-Process | ? { $_.ProcessName -match "chrome-headless" } | Stop-Process -Force`)
- Permission denied = target file open in a player; render to a new filename
- `python` is the hermes venv (no pip) — use Python 3.13 at `C:\Users\DELL\AppData\Local\Programs\Python\Python313\python.exe` for rembg/PIL
- Provenance: every stock asset records author+page_url+license; copyrighted film stills/celebrity photos OFF-LIMITS; Pixabay FIRST hit not trustworthy — audit tags (skip ai_generated/model, prefer real photos with cuttable subjects)
- ElevenLabs music can be near-silent — always `ffmpeg -af volumedetect`
- Update order for pipeline changes: playbook FIRST → propagate here + bump version marker → run `gate_vox.py --doc-sync` (0 FAIL required)

## animation-pipeline
**Summary:** Two first-class composition runtimes: Remotion (React, frame-accurate interpolation, default for data-heavy explainers) and HyperFrames (HTML/CSS/GSAP, default for motion-graphics-led briefs); choice is locked at proposal into `edit_decisions.render_runtime`. Motion quality comes from easing (never linear), anticipation, overshoot, and hold frames. Transitions should be limited to 2-3 consistent types, with meaning attached to each type (wipe = next step, zoom = deeper). Audio leads visual — SFX starts before the visual transition.
**Key numbers/params:**
- FPS: 24 cinematic | 30 web default | 60 UI | 12-15 stylized; Manim rendered at 60fps then transcoded to 30
- Easing: `easeInOutCubic (0.65,0,0.35,1)` default; linear ONLY for opacity/color, never motion
- Anticipation 2-3 frames (66-100ms); overshoot 10-15% past target, settle 3-5 frames
- Holds: key info 1.0-2.0s, between beats 0.3-0.5s, after reveal 1.5-3.0s, quick transition 0.1-0.2s
- Transitions: crossfade 0.5-1.0s, wipe/slide 0.5-0.8s, zoom 0.8-1.2s, morph 1.0-2.0s, hard cut instant
- Stagger entries 3-6 frames (100-200ms); `lag_ratio=0.1-0.2`
- Max 5 palette colors, 1 accent, min 3:1 contrast, ≥10% white-space margin
- Export: H.264 CRF 18-20 + yuv420p + faststart; GIF preview 480px/15fps/256 colors
**Actionable rules:**
- Do: default `easeInOutCubic`; hold key frames synced to narration; stagger multi-element entrances
- Do: pick 2-3 transition types and reuse them consistently
- Do: start transition SFX 10-20ms before the visual change
- Don't: use linear easing for motion; reveal everything at once

---

## cinematic
**Summary:** "Cinematic" and "epic" are banned adjectives — translate mood into concrete choices (aspect ratio, lens, grade, shot duration, audio layer count). Pacing follows a breathing rhythm with varied shot lengths, never the same length 3x. Audio is 4 layers (dialogue/music/ambient/Foley), music at 60-90 BPM dynamic not loop-based. Cinematic grading keeps lifted shadows and rolled-off highlights with one consistent LUT.
**Key numbers/params:**
- Aspect ratios: 2.39:1 → 1920x803 (138px bars), 2.35:1 → 1920x817, 1.85:1 → 1920x1038, 16:9 flat
- FPS 24; shot duration 4-8s standard (action 2-4s, documentary 6-12s, contemplative 10-20s, montage 1-3s)
- Cuts/min: cinematic 8-15, montage 20-40
- Audio layers (peak): dialogue -12dB, music -24 to -18dB, ambient -30 to -24dB, Foley -18 to -12dB
- Music 60-90 BPM; silence 3-5s at key reveals; room tone at -35dB
- Grades: `cinematic_warm` 0.85, `cinematic_cool` 0.7, `moody_dark` 0.6, `vintage_film` 0.7
- Narration 140-150 WPM (slower than standard 155)
- Murch rule priority: emotion → story → rhythm → eye trace → 2D plane → 3D space
**Actionable rules:**
- Do: replace "moody"/"epic" with lighting+grade+shot-duration combos
- Do: layer min 3 audio layers; remove music 3-5s at reveals
- Do: letterbox only when framing genuinely benefits (never for screen recording/talking head)
- Don't: repeat the same shot length 3 times; pure black/pure white in grade

---

## short-form
**Summary:** Short-form (9:16, 1080x1920) requires a frame-1 hook (70% decide within 3s), mandatory captions (80% watch muted, +12% retention with captions), and a visual change every 1-3 seconds. Universal safe zone is 900x1400 centered; bottom 300-320px is dead (platform UI). 3-second retention drives algorithm multipliers — target 70%+ at 3s, 60% at 15s, 50% at 30s. Algorithm rewards total watch time over completion rate.
**Key numbers/params:**
- Safe zone: universal 900x1400 centered; TikTok 900x1492, Reels 996x1400, Shorts 984x1500
- Durations: 15s (92% completion), 30s (84%), 60s (68%), 60s+ (48%)
- Retention→view multiplier: <60% = 1.0x, 60-70% = 1.6x, 70-85% = 2.2x, 85%+ = 2.8x
- Upload: H.264 High Profile L4.2, 8-15 Mbps VBR, max 500MB/287.6MB/72MB (desktop/iOS/Android)
- Captions: 42px+ bold sans-serif, 75% black bg or 3px stroke, max 30 chars/line, max 2 lines
- Pacing: visual change every 1-3s, 20-40 cuts/min, text 2-4s per block, no hold >3s, speed ramp 1.2-1.5x
- Word counts: 15s→35-40, 30s→70-80, 60s→125-150
- Audio: VO -12/-14 dB, music -22/-26 dB, target -14 LUFS, true peak -1 dBTP; VO at 180-200 WPM
- Music: 120-140 BPM energetic, 90-110 explainer
**Actionable rules:**
- Do: text on screen frame 1 (within 0.5s), voice starts immediately, movement in frame 1
- Do: keep important content above the bottom 300-320px dead zone
- Do: end 60s tutorials with a loop back to the hook
- Don't: static openings, blank intros, logos before the hook, silent buildup

---

## broll-planning
**Summary:** Decide stock vs generated by scene reality: real-world/people/archival → stock; abstract concepts, diagrams, branded style → generated. Extract B-roll needs from script sections into a B-Roll Brief (scene, need, source, keywords, duration, orientation, mood, fallback). Stock queries should be 2-4 keywords led by subject, always with a POV keyword (drone/OTS/macro/top-down/locked-off) — POV mismatch is more costly to fix than color grade. Score results 1-5, use 3+.
**Key numbers/params:**
- Query template: `[subject] [attribute] [POV]` — e.g. "tokyo skyline night drone", "scientist microscope OTS"
- Clip duration: 4-6s typical B-roll; video must be ≥ scene need (can trim, can't extend)
- Scoring heuristic: 5 perfect, 4 minor crop, 3 acceptable+grade, 2 marginal, 1 wrong; threshold 3+
- Image criteria: 1080p minimum for video frames, no watermarks, POV match
- Both Pexels and Pixabay free for commercial use, no required attribution
**Actionable rules:**
- Do: add a POV keyword to every stock query; ask the director if scene implies no POV
- Do: failure chain — retry synonyms → other provider → AI generation → only then escalate to user
- Do: track photographer/source_url/license in asset manifest
- Don't: use queries with >4 keywords; crop your way out of a wrong POV
- Don't: mix stock and generated styles within one scene

---

## scene-detect-usage
**Summary:** Scene detection defaults to the `content` detector (threshold 27, HSV-based). Choose `threshold` (12.0) only for fade-to-black content, `adaptive` (3.0) for mixed content with camera motion. Always generate a stats CSV first and set the threshold just below the smallest real peak rather than guessing. Set `min_scene_length` to suppress micro-scenes, then merge/validate/label detected scenes against narration.
**Key numbers/params:**
- Methods: content 27.0, threshold 12.0, adaptive 3.0 (multiplier on rolling average)
- Tuning: too many false cuts → 35-45; missing real cuts → 20-22; animated content → 30-35
- min_scene_length: default 1.0s, educational 2.0-3.0s, fast-paced 0.5-1.0s
- Presets: talking head single-cam content/22/3.0s; multi-cam content/27/1.0s; screen recording content/30/2.0s; animated explainer adaptive/3.0/2.0s; montage content/40/0.5s; documentary-with-fades threshold/12/2.0s
- Component weights default (1.0, 1.0, 1.0, 0.0); animated alternative (1.0, 0.5, 1.0, 0.2), threshold 32
**Actionable rules:**
- Do: generate `--stats stats.csv` and inspect `content_val` before tuning
- Do: use `content` for AI-generated video (rarely uses fade-to-black)
- Do: map detected scenes to script sections for the edit stage
- Don't: guess thresholds; use `threshold` detector on non-fade content

---

## enhancement-strategy
**Summary:** Enhancement is a fixed chain: subtitle burn → face enhance → color grade → audio enhance → final encode, each step optional and gracefully skipped. Face/color/audio presets are matched to footage condition (good footage = polish; degraded = restore elsewhere). Overlay density scales inversely with video length. Placement rules protect the speaker's face and keep subtitles in the bottom 20%.
**Key numbers/params:**
- Face presets: `talking_head_standard` default, `soft_skin`, `sharpen`, `brighten`, `denoise`
- Grade intensities: `cinematic_warm` 0.85, `cinematic_cool` 0.7, `bright_clean` 0.8, `moody_dark` 0.6, `neutral` 1.0
- Audio presets all target -16 LUFS: `clean_speech`, `voice_clarity` (3k/5kHz boost), `podcast`, `noise_reduce`, `normalize_only`
- Overlay density: short-form every 3-5s (subtitles mandatory), medium every 10-20s, long-form every 30-60s
- Subtitles bottom 20% (margin_v 50 vertical, 40 horizontal); text overlays 2-5s on screen
**Actionable rules:**
- Do: apply in the order subtitle → face → grade → audio → encode
- Do: consider overlay/B-roll if speaker on camera >30s straight
- Do: keep overlay position consistent once placed
- Don't: cover the speaker's eyes/nose/mouth; add decoration-only overlays

---

## diagram-gen-usage
**Summary:** Video diagrams must be half the complexity of static docs since viewers can't zoom. Default to flowchart TD; split any diagram exceeding complexity limits into multiple frames (which also creates natural "building" animation). Mermaid doesn't animate — use multi-stage renders crossfaded in FFmpeg, and `classDef` highlighting (current=orange/red, done=green, upcoming=grey). Render at 4K viewport even for 1080p output.
**Key numbers/params:**
- Node/edge limits: 1080p 15-20 nodes/20-25 edges, 4K 25-35/35-45, vertical 10-12/12-15
- Min font: 16px at 1080p, 14px at 4K, 18px vertical; render width min 1200px; viewport 3840x2160
- Node min width 150px at 1080p; padding 15-20px; 3-5 words per node; edge labels 1-2 words
- Themes: dark bg `tokyo-night`/`dracula`; light bg `github-light`/`catppuccin-latte`; code `one-dark`; max contrast `zinc-dark`; corporate `nord-light`
- Type suitability: flowchart/sequence/state/mindmap good; class fair (3-5 classes); ER poor; Gantt fair
**Actionable rules:**
- Do: progressive building via multi-stage renders + crossfade
- Do: default TD flowcharts; LR for timelines/sequences; avoid bottom-up
- Do: render 4K viewport for crisp text when scaled down
- Don't: exceed node limits — split instead; use labeled edges when a labeled node suffices

---

## manim-usage
**Summary:** ManimCE for math animations: one concept per scene, build incrementally (3Blue1Brown convention), never reveal >3-4 new elements at once. Render `-qh` (1080p60) for final then transcode to 30fps, `-qm` for drafts. Use timing table (equation writes 1.5-2.0s), dark backgrounds, semantic color roles. Default to 2D — 3D only when the spatial relationship IS the concept.
**Key numbers/params:**
- Render flags: `-ql` 480x360@15, `-qm` 1280x720@30, `-qh` 1920x1080@60, `-qp` 2560x1440@60, `-qk` 3840x2160@60
- Timings: Write 1.5-2.0s, transform 1.5s, Create 0.8-1.2s, color highlight 0.5s, camera zoom 1.5-2.0s (ease_in_out_cubic), punctuation cut 0.3-0.5s, `lag_ratio=0.1-0.2`, wait ≥1.5s after reveals
- Max 3-4 new elements revealed simultaneously
- Color roles: unknown=YELLOW, matrix/operator=RED, result=TEAL, known=BLUE_C, annotation=GREEN, de-emphasis=GREY 50%, error=RED_E
- 3D is CPU Cairo rendering — 5-10x slower than 2D
**Actionable rules:**
- Do: background BLACK or #1a1a2e; semantic colors; sync scene duration to narration segment
- Do: break complex proofs into multiple scenes
- Don't: use red-green-only distinctions (add brightness shades _A.._E); use 3D without spatial need

---

## screen-recording
**Summary:** Record at 4K and deliver at 1080p to enable 2x zoom headroom into code. Enlarge the cursor 1.5-2x with highlight ring, move deliberately, pause 0.5s before clicking. Speed-ramp boring parts (2-4x for installs/builds), keep key code at 1.0x, remove all dead air >1.5s with jump cuts masked by a subtle zoom shift. IDE font must be 18-22px+ for readability at delivery.
**Key numbers/params:**
- Record 3840x2160 → deliver 1920x1080; 60fps for UI/scrolling, 30fps for static code
- Cursor: 1.5-2x size, ring/glow ~50px radius, click flash, hold 0.5s before click
- Zoom: code focus 1.5-2x, UI highlight 2.0-2.5x, terminal 1.5x, transitions 0.6-0.8s ease-in-out
- Hold pan position ≥3s; jump-cut mask zoom shift 1.0→1.02x
- Speed: typing 2-3x, navigation 1.5-2x, installs/build 2-4x or cut, key code 1.0x
- Audio: HPF 80Hz, 3:1 compression, target -16 LUFS
- IDE: font 18-22px, zoom 150-175%, line numbers ON, minimap OFF
**Actionable rules:**
- Do: use `scene_detect` content/30/2.0s to find natural segments
- Do: hide cursor when not needed; announce what you're zooming into
- Do: dark theme, subtitles recommended
- Don't: circle the cursor; wander randomly; leave pauses >1.5s

---

## video-editing
**Summary:** Editorial skill for talking-head content: cut filler words at word boundaries, false starts (keep final take), dead air >1.5s trimmed to ~0.5s, tangents, repeated points. Do NOT cut natural breath pauses (0.3-0.8s), emphasis pauses, or verbal bridges. Use J-cuts (audio leads visual by ~0.5s) and L-cuts (audio trails ~0.5s) for smoothness. The `edit_decisions` artifact carries cuts, overlays, subtitles, music, transitions.
**Key numbers/params:**
- Dead air: silence >1.5s trimmed to ~0.5s
- J-cut: next audio starts ~0.5s before visual cut; L-cut: current audio continues ~0.5s after
- Breath pauses 0.3-0.8s are natural — keep them
- Pacing: short-form aggressive, medium balanced, long-form let scenes breathe
**Actionable rules:**
- Do: cut at word boundaries using word timestamps (never mid-word)
- Do: keep verbal bridges ("So...", "Now...") for flow
- Don't: cut natural breath/emphasis pauses; leave audio pops at cut points

---

## ink-theater
**Summary:** Ink Theater = minimalist black-ink-on-white "moving art" where a deadpan mascot physically performs an abstract idea via a low-tech contraption. It's a generic 3-step metaphor generator (concept→physical action, system→low-tech object, mascot performs action) plus a parametric HyperFrames engine — NOT its own pipeline, runs on the `animation` pipeline. Strict color grammar: black=structure, orange=flow/arrows only, red=problem, blue=good end-state. Character motion uses the InkPuppet + mocap action library (12 CMU-sourced clips), never hand-tuned sine motion.
**Key numbers/params:**
- Color grammar: black/orange/red/blue only; ≥35% negative space; subject 40-60%; deadpan mascot (white-dot eyes)
- Mocap catalog: 12 clips today (walk, run, climb, march, shuffle, jump, kick, sit, wave, twist, dance_spin, dance_glide)
- Add motion via `node ink-theater/mocap/add-motion.mjs <name> <cmu-id|url|path> <category> "<desc>"` (CMU mocap = thousands free)
- Motion eases: `ease.settle/overshoot/bouncy/soft`; overshoot for pops, settle for arrivals, bounce for landings
- Determinism: closed-form springs, seeded PRNG, no `repeat:-1`, one paused gsap.timeline on `window.__timelines`
**Actionable rules:**
- Do: embed the FULL handwriting font (bundled `patrickhand.ttf`), not a Google-Fonts subset woff2 (silent serif fallback bug)
- Do: vary mocap clips per beat — NEVER loop one clip
- Do: delete the mascot test — if the metaphor survives, it's decoration, redo it
- Don't: hand-author walk/dance motion; hot-link Google fonts (breaks determinism)

---

## lip-sync-usage
**Summary:** `lip_sync` is a post-production step for VIDEO input (dubbing, audio replacement); `talking_head` is for PHOTO input — never confuse them. Generate replacement audio FIRST, then lip-sync. Use `wav2lip` for drafts/iteration, `wav2lip_gan` for final renders and close-ups. Apply `face_enhance` AFTER lip-sync. For localization, keep the original video as source and sync each language separately — never chain outputs.
**Key numbers/params:**
- Models: `wav2lip` (faster, may blur chin), `wav2lip_gan` (better mouth/chin quality, slower)
- Face padding default `[0, 10, 0, 0]` works for 90% of footage; adjust bottom index for chin cutoff, top for forehead
- resize_factor: 1 = full res (final), 2 = half (drafts), 3+ degraded (previews only)
- Input requirements: face ~100px min, ≤30-degree angle, clean speech, audio length within 10% of video
**Actionable rules:**
- Do: face_enhance AFTER lip_sync (sync modifies the face region)
- Do: use wav2lip_gan for close-ups always
- Don't: chain lip_sync outputs for multi-language; lip-sync without finished audio first

---

## talking-head-gen-usage
**Summary:** `talking_head` turns ONE face photo + audio into an animated talking video (SadTalker default; MuseTalk when lip-sync precision is top priority). Generate audio first, then animate. `expression_scale` controls expressiveness (1.0 default conversational, 0.7 corporate, 1.5 social — above 1.5 risks artifacts); `still_mode=true` for formal/corporate. `crop` preprocess is the safest default. Source photo quality directly drives output quality.
**Key numbers/params:**
- Models: sadtalker (natural head motion, expressive) default; musetalk (sharper mouth, constrained motion)
- expression_scale: 0.5 subtle, 0.7 corporate, 1.0 default, 1.5 energetic, >1.5 avoid
- Preprocess: `crop` default (face crop→animate→paste back), `resize`, `full`
- Photo: min 256x256, best 512x512+, front-facing, neutral expression, no face coverings
- Audio: WAV/MP3, 16kHz+, clean (no background noise)
**Actionable rules:**
- Do: apply face_enhance AFTER talking_head; preview a 5-second clip first
- Do: corporate → still_mode=true + expression_scale=0.7
- Do: fallback — if SadTalker unavailable, make static video from photo and lip-sync with `lip_sync`
- Don't: feed degraded photos (restore with face_restore first); use resize/full unless crop mis-frames

---

## face-restore-usage
**Summary:** `face_restore` (AI reconstruction) vs `face_enhance` (FFmpeg polish): restore when the face is degraded/blurry/compressed beyond recognition, enhance when it just needs polish. Default CodeFormer at fidelity 0.5 (balance of restoration vs identity preservation); 0.3 for heavy degradation, 0.7 for light webcam cleanup. Restore BEFORE enhance. Never restore already-good footage.
**Key numbers/params:**
- Fidelity (CodeFormer): 0.0 max enhancement (may alter identity), 0.3 strong, 0.5 default, 0.7 conservative, 1.0 passthrough
- GFPGAN = faster, less controllable, no fidelity slider
- Order: face_restore → face_enhance (restore first, polish second)
- bg_upsampler=true enables Real-ESRGAN background upscale
**Actionable rules:**
- Do: compare input/output side-by-side — identity must stay recognizable
- Do: test on extracted key frames before processing full video
- Don't: use on good footage (introduces artifacts); skip fidelity starting point 0.5

---

## onboarding
**Summary:** First-interaction skill for vague requests: run preflight discovery (registry support_envelope + provider_menu), classify tools into available/quick-unlocks/hardware-unlocks, determine the user's setup tier, then present a short plain-language capability summary (8-12 lines, lead with what works). Present exactly 3 copy-paste starter prompts targeting different pipelines plus reference-based prompts. Never dump raw JSON, never apologize for missing capabilities, never pick a composition runtime during onboarding.
**Key numbers/params:**
- Tiers: zero-key (Piper TTS + stock + Remotion/HyperFrames + FFmpeg), starter (+1 image provider), standard (+music gen), full (+video gen +premium TTS), full+GPU
- Runtimes: Remotion (Node+npx+node_modules; React scenes, word captions, TalkingHead); HyperFrames (Node ≥22 + FFmpeg; HTML/CSS/GSAP)
- Cost answers: zero-key $0; paid setup $0.30-1.50/video; full $1-3; time: explainer 5-15 min, +image gen 10-20, cinematic 20-40
- Presentation: 8-12 lines max, ≤2 quick-unlock suggestions, 3 prompts
**Actionable rules:**
- Do: name BOTH runtimes explicitly; read actual install_instructions (no hardcoded provider names)
- Do: frame capabilities as "here's what you have" never "unfortunately you don't have"
- Don't: dump raw JSON/tool lists; explain the architecture; skip orientation for uncertain users

---

## checkpoint-protocol
**Summary:** Instruction-driven checkpointing replaces checkpoint_policy.py. Read the pipeline manifest per stage (`checkpoint_required` + `human_approval_default` are binding), write `in_progress` checkpoints on stage entry and after each significant partial item (partial data under `metadata.partial_progress`, never an invalid canonical artifact). Gated stages are written `awaiting_human`, and the turn MUST END at the gate — "present and continue" is a gate violation. Approval is per-gate unless recorded as a `decision_log` `approval_policy` entry. The assets gate reviews the storyboard/filmstrip (or per-scene snapshots for atelier scenes), NOT a rendered draft.
**Key numbers/params:**
- Manifest matrix: required+approval → checkpoint+human; required only → checkpoint+auto; not required → skip (rare)
- Sample checkpoint: 10-15s rendered clip at `projects/<name>/assets/sample/sample_v{N}.mp4` for reference-driven productions
- Canonical location: `projects/<project_id>/checkpoint_<stage>.json`; archive superseded to `projects/<id>/history/`
- Call `init_project()` before first stage to write `project.json`; `python -m backlot open my-project` (board is observer, never blocker)
- Assets gate: per-scene review stills → `projects/<id>/snapshots/<scene_id>.png` (remotion still)
**Actionable rules:**
- Do: checkpoint even when not required if the stage cost significant time/money; include cost snapshots
- Do: at pipeline start always check for existing progress and resume (never restart from idea)
- Don't: write gated stage as `completed` without `human_approved=True`; render a draft inside the assets stage to earn review

---

## creative-intake
**Summary:** Gather user intent through 7 targeted questions (purpose, audience, platform, tone, references, outcome, constraints) asked conversationally, not as a survey — start with purpose/audience, skip already-answered questions, stop when you have enough for research. Produce an informal `intake_brief` (quotes, stated vs inferred answers, references, constraints) passed as context to research so it never invents intent. For reference-video input, use the video-reference-analyst protocol instead — the VideoAnalysisBrief answers tone/structure/pacing, so only ask topic/length/narration/budget.
**Key numbers/params:**
- 7 questions: purpose, audience, platform, tone, references, outcome, constraints
- Reference-video intake leaves only 4 questions: topic, length, narration yes/no, budget ceiling
- Explicitly do NOT ask "what should it feel like?" when a reference video exists
**Actionable rules:**
- Do: ask the single most important missing question first, then the next gap
- Do: mark answers inferred vs stated; pass intake_brief as context, not a formal artifact
- Don't: numbered-survey the user; invent answers; delay production on a clear brief; assume explainer

---

## capability-extension
**Summary:** Structured protocol replacing "no ad-hoc Python scripts": classify the gap (one-off transform → project-scoped script; recurring visual need → playbook/Remotion component; missing provider → minimal BaseTool wrapper; missing knowledge → research + document as Layer 3 skill). Scripts must be idempotent, produce a file artifact in the project workspace, be logged in the decision log (`category: "capability_extension"`), and never call external APIs without user approval. Never modify existing tools in `tools/` — create wrappers.
**Key numbers/params:**
- Script location: `projects/<project-name>/scripts/`; tool wrapper: `projects/<project-name>/tools/<name>.py`
- Custom playbooks: `lib/playbook_generator.py`, validate against `schemas/styles/playbook.schema.json`, save `styles/custom/<project-name>.yaml`
- Decision log entry: decision_id, stage, category, subject, options_considered[], selected, reason, user_visible, confidence
**Actionable rules:**
- Do: log every extension; inform the user "I wrote a custom script for X because..."
- Do: require user approval before first paid API call (tool wrappers)
- Don't: bypass pipeline stages; write scripts with side effects beyond their output file (no emails, no pushes, no deletes outside workspace)

---

## skill-creator
**Summary:** Create new skills dynamically when a reusable gap exists (visualization technique, new tool without usage skill, recurring pattern) — never for one-off tasks, covered cases, or pure tool config. Research best practices first (web search + existing skills + tool docs). Choose the skill type and directory (stage director, meta, tool, style). Skills must teach thinking not just doing, include examples, reference concrete resources, end with a self-evaluation rubric (1-5 scoring), and document pitfalls.
**Key numbers/params:**
- Types: stage director `skills/pipelines/<pipeline>/`, meta `skills/meta/`, tool `.agents/skills/`, style `styles/` (YAML)
- Skill structure: When to Use → Prerequisites → Process (numbered steps) → Self-Evaluate rubric → Submit → Common Pitfalls
- Registration: add to `skills/INDEX.md`; reference in pipeline manifest `skill` field; tool skills in `.agents/skills/<tool-name>/`
**Actionable rules:**
- Do: be opinionated ("do A because [reason], fall back to B when [condition]")
- Do: validate no orphan references; match complexity to the task (50-line > 500-line for simple tasks)
- Don't: create skills for one-off tasks; write vague instructions ("make it good"); skip the self-evaluation rubric

---

## explainer/scene-director
**Summary:** Turns script sections into a visual plan: each section becomes 1-3 scenes with explicit type, timing, framing, movement, transitions, and required assets. Contains a scene-type table (hero_title/stat_card/charts/comparison/callout/animation/diagram/generated/broll...), a visual technique library (diagram reveal, analogy split, stat-card punch, dashboard sequence, before/after, timeline, zoom-and-focus, code walkthrough), a mandatory 5-aspect scene checklist, and motion minimums that prevent slideshow output.
**Rules we should adopt:**
- Scene types with duration guidance: stat_card 4-6s, charts 5-7s, comparison 4-6s, callout 4-6s, text_card 3-5s, animation 4-10s, diagram 4-8s, generated image 3-6s.
- Zero-key scene selection: when no image/video gen is available, prefer the Remotion-native types (hero_title, stat_card, charts, kpi_grid, comparison, callout, progress_bar, text_card) — they render with zero external deps and feel distinct via derived color/typography/pacing.
- Visual technique library to reference by name: Diagram Reveal (build progressively as narrator describes), Analogy Visualization (split screen abstract vs real-world), Stat Card Punch (full-screen number, hold 4-5s), Data Dashboard Sequence (kpi_grid→bar→line→pie), Before/After Split (comparison type), Timeline Progression, Zoom and Focus, Code Walkthrough (highlight lines in sync).
- Narration duration budget: narration = 85-90% of video duration; 2.0-2.5 words/sec documentary, 2.5-3.0 energetic; per-scene: 5s scene ≈ 10-12 words; 0.5-1s silence between scenes; validate word count before TTS.
- 5-aspect checklist per scene: Subject / Subject Motion / Scene / Spatial Framing / Camera — every aspect explicit, silent omission is the top failure mode; explicit `"camera": "N/A"` allowed only when marked.
- Overlays are NOT part of FG/MG/BG depth — list separately in `overlays: [...]`; never describe an overlay "in the foreground".
- Motion minimums (MANDATORY, anti-slideshow): ≥2 scenes with real motion, ≤60% static-image cuts (Ken Burns on a still = weak motion), ≥2 DISTINCT motion techniques across the video, no static hold >6s without motion, Remotion-native scenes get spring entrances by default.
- Coverage: scenes span full duration, no gaps >1s, every enhancement cue addressed. Variety: no >3 consecutive same-type scenes, ≥3 scene types, alternate high-info scenes with breathing room.
- Feasibility: every required_asset achievable with available tools; asset descriptions specific enough for prompt engineering ("Isometric illustration using the playbook's blue-green palette", not "an image about databases").
- CRITICAL: never use `generated` image scenes where text must be verbatim (CTA, business names, contact, legal) — AI hallucinates text; use `text_card` (Remotion renders exactly).
- One script section often needs 2-3 scenes; static scene for a dynamic concept (process/transformation described in narration) is a defect.
**What we already do differently:**
- Our scene data is layout-driven: scenes = layout IDs from `libraries/04-visual/registry.json` (approved only) + variant pools, with jitter. The 5-aspect checklist + motion minimums + "no AI text in generated images" map directly onto our layout/primitive development and gate_vox rules.

## explainer/edit-director
**Summary:** Assembles the edit decision list (EDL): maps assets to the timeline, defines cuts with layering (primary/overlay/background), configures mandatory subtitles, and layers audio with music ducking. Validates timeline coverage (no gaps/black frames, no overlapping primary cuts) and audio sync, then self-evaluates continuity, pacing, and AV sync.
**Rules we should adopt:**
- Cut structure: source + in/out seconds + layer + transform (scale/position/animation) + transition_in/out + transition_duration.
- Layering: `primary` (one at a time), `overlay` (text/stat/key terms on top), `background` (solid/texture behind everything).
- Subtitles mandatory for all explainer content: word-by-word style, playbook font, bottom-center, ≤8 words/line; timing derived from narration audio timestamps.
- Audio config: narration segments in order; music with fade in/out + ducking (threshold ~-3dB, reduction ~-8dB, attack 200ms, release 500ms) — music dips when narration plays.
- Apply playbook pacing rules: min/max scene hold, text-card hold, transition durations.
- Verify: cuts span full duration (no black frames), no overlapping primary cuts, every scene has a cut, every source references a valid asset, narration ordered/non-overlapping/aligns with cuts, music ducking configured, subtitles enabled with playbook fonts.
- Pitfalls: gaps between scenes (0.5s black frame), audio drift (adjust cuts to ACTUAL narration durations, not planned), no ducking = unwatchable, same transition everywhere (vary within playbook set), subtitle font mismatch.
**What we already do differently:**
- Our timeline is driven by `sentence_timeline.json` as source of truth for timings; scenes are layout-based rather than cut-based. The ducking config (threshold/reduction/attack/release) is a concrete spec we can reuse in audio_mixer.

## explainer/compose-director
**Summary:** Renders the final video with a mandatory pre-render validation step and an exhaustive post-render self-review (probe file → extract frames → transcribe rendered audio → visual inspection → audio inspection) — the #1 agent failure is skipping the audio transcription check and missing a silent render. Audio + subtitles go through Remotion natively (not external muxing/SRT burn), output profile is chosen by platform, and nothing is presented as final before review.
**Rules we should adopt:**
- Render strategy: Remotion is default for all explainers (animated text/charts, word-level captions); FFmpeg fallback only when Remotion unavailable.
- With Remotion: audio → `<Audio>` components (NOT external audio_mixer), subtitles → word-level captions from transcription (NOT SRT burn), text overlays → text_card (NOT AI images).
- Output profile per platform: YouTube 1920x1080, TikTok/Reels 1080x1920, Twitter 1280x720, LinkedIn 1920x1080.
- Pre-render validation (MANDATORY): run composition_validator — catches missing files, narration longer than video, music shorter than video. Fix before rendering.
- Post-render self-review — ALL steps mandatory, do not skip 6b:
  1. ffprobe the file FIRST: video stream + AUDIO STREAM present (missing audio stream = STOP and re-render), duration ±5%, size sane.
  2. Extract mid-cut frames.
  3. Transcribe the RENDERED audio (not source): 0 words = silent audio (STOP); <80% of script words = audio cut off.
  4. Visual inspection: background matches intent (watch for white bg on dark theme), images not blank/stretched, captions visible, overlays positioned, opening scene strong, CTA text correct.
  5. Audio inspection: last transcribed word vs last scripted word, words cut off at end, segment alignment, music audible.
  6. Compile structured review + recommendations, present to user.
- Two-pass encode for better quality at same size; use absolute timestamps (not relative offsets) to avoid accumulated drift; burn subtitles in (hardcoded).
**What we already do differently:**
- We already have the render-loop discipline (30s @ 360-540p → gate → user → master) and gate_vox.py runtime checks (freeze, sharpness, saturation, audio). The mandatory post-render AUDIO TRANSCRIPTION check (transcribe the rendered file) is worth adding to our loop — our gate checks audio audibility, but not script-coverage of the rendered narration.

## longform-educational/scene-director
**Summary:** Longform's biggest risk is visual monotony over 10-15 min. Every scene carries chapter_id; each chapter has a scene-type diet (50-70% stills/text, 20-30% diagrams/charts, 10-20% true motion) and a motion minimum (≥2 motion scenes PER CHAPTER, not per video). Chapter rhythm alternates high-information and breathing chapters; consistency anchors must hold across all chapters since images come from many API calls.
**Rules we should adopt:**
- Scene-type diet per chapter: 50-70% stills/text (generated images w/ subtle motion, text_card, callout, stat_card — render fast, carry narration), 20-30% diagrams/charts (educational meat), 10-20% true motion (anime_scene w/ particles, zoom, transitions — hero moments only).
- Reserve expensive motion for: chapter 1 hook, chapter transitions (a motion beat marks a new chapter), the climax chapter, key data reveals.
- Chapter rhythm: no two adjacent chapters with identical visual character (EP checks).
- Motion minimum PER CHAPTER: ≥2 motion scenes + ≥2 distinct motion techniques per chapter; middle chapters (4-9) are where viewers drop off if visuals die.
- Per-chapter style drift prevention: same palette/illustration style/lighting in EVERY prompt; record style anchors in scene_plan metadata; deliberate visual-register changes (e.g. historical section) must be logged as playbook_override.
- Coverage now checked per chapter (each chapter's scenes cover its full slot); variety no 3+ consecutive same-type globally AND within chapters.
- Feasibility favors cheap assets at longform scale (stills over video clips, diagrams over generated animation) to keep cost within budget.
**What we already do differently:**
- Our layouts + jitter already give per-scene variety; per-chapter diet/rhythm/motion-minimum rules are new — adopt when we structure longform scene data by chapter.

## longform-educational/edit-director
**Summary:** Every cut carries chapter_id and cuts are grouped by chapter — this is what lets compose slice segments. Chapter boundaries are decided at script stage and LOCKED at edit; moving a boundary after segment render invalidates files and must be logged. Chapter markers (section_title overlays + longer transitions) mask segment seams; one continuous music track keeps the video from feeling chopped.
**Rules we should adopt:**
- Every cut carries chapter_id; metadata.chapters must match script chapters exactly.
- Chapter boundary locking: once segments render, moving a boundary invalidates affected segments; if it MUST move, log `boundaries_moved: ["ch3-ch4"]` so the EP knows which segments are stale.
- Per-chapter validation: each chapter's cuts cover its full slot with no gaps; narration_duration ≤ visual_duration per chapter; one global music config ducked under all narration.
- Chapter structure: section_title overlay at each chapter start ("CHAPTER 4 — THE MECHANISM") helps navigation + masks seams; transitions at chapter boundaries slightly longer (0.6-0.8s) than within.
- Music continuity: one continuous track across the whole video, never per-chapter tracks.
- Captions: sentence-style (not word-by-word) for readability at 10+ min; paddingBottom ~22% clear of CTA/UI zones.
**What we already do differently:**
- Our sentence_timeline.json + layout scenes would need chapter grouping added for longform; the boundary-lock + seam-masking rules are the core adoptions.

## longform-educational/compose-director
**Summary:** The most longform-specific skill: render per-chapter segments and stitch — never the whole video in one render. Protocol: slice cuts by chapter → draft pass at scale=0.5 → full-scale segment renders → ffprobe each segment before stitching → stitch. Re-render discipline is binding: only re-render affected chapters; full re-render requires explicit user approval.
**Rules we should adopt:**
- Segment render protocol: slice `edit_decisions.cuts` by chapter; re-anchor each chapter's timings so it starts at 0; render segment per chapter; probe each segment (duration, audio, non-zero) BEFORE stitching; stitch with video_stitch; verify final ≈ sum of segments (±0.5s).
- Draft pass: render every segment at scale=0.5 first, stitch, present "Draft review — pacing/voice/visuals OK?" — ~2-4x faster, finds mistakes cheaply.
- Re-render discipline (BINDING): fix → identify affected chapter(s) → re-render ONLY those (5-15 min each) → re-stitch (seconds) → log `rerenders[]`. Full re-render = explicit user approval + decision_log entry. NEVER silently re-render everything.
- Post-render verification: probe final (audio stream present, ±5%), chapter boundary check (sample frames at each chapter start ±1s — no black frames/seams), transcribe rendered audio (≥80% of words, last word matches), sample ≥3 chapters (start/middle/end).
- Pitfalls: rendering whole video as one composition defeats the pipeline; stitching un-probed segments; audio bleed at chapter boundaries (each chapter's audio ends at its boundary).
**What we already do differently:**
- Our 30s-segment draft discipline is the short-form analog; the per-chapter segment isolation + re-render-only-affected-chapters is exactly how we'd scale our render loop to longform.

## animation/scene-director
**Summary:** Converts the script into a feasible animation plan with an animatic mindset (what appears / changes / holds / exits per scene), a limited transition family (cut/fade/slide/transform), and scene types matched to tool paths. For image_animation (anime_scene), each scene needs 2-3 images + varied camera motion + matched particle types + lighting, 4-7s each. The 5-aspect checklist shifts load by mode: Manim cares about Subject + Spatial Framing (Camera N/A), AI-video/anime_scene cares about all five.
**Rules we should adopt:**
- Animatic-minded planning: for each scene define what appears first, what changes, what is held, how it exits.
- Limit transition families to a small meaningful set (cut, fade, slide, transform) — don't invent a new transition per scene.
- Scene type → tool path matching: diagram scenes for structured explanation, animation scenes for motion-first, text_card for high-impact copy, generated only where needed.
- image_animation (anime_scene) recipe: 2-3 images per scene from the same visual system with nearby seeds for crossfade; camera motion chosen from zoom-in/zoom-out/pan-left/pan-right/ken-burns/drift-up/drift-down/parallax/static — vary per scene (no same camera motion on consecutive scenes); particles from fireflies/petals/sparkles/mist/light-rays matched to mood, alternate warm/cool; optional lightingFrom/lightingTo gradient; vignette true for cinematic (false for bright/open); 4-7s per scene (longer scenes need more images).
- 5-aspect checklist load by mode: Manim/diagrammatic = Subject + Spatial Framing (Camera → N/A explicitly); AI-video/anime_scene = all five like a cinematic shot. Explicit N/A allowed, silent omission forbidden.
- Overlays live under `overlays:` metadata, never inside framing description.
- Mix close-ups and wide establishing shots; use hero_title/section_title overlays for narrative structure.
**What we already do differently:**
- Our layout+primitives system with motion/texture/palette variant pools already encodes variety; the anime_scene recipe (2-3 image crossfade + particles + camera-motion matrix) is a concrete template to add to `04-visual/` if we do illustration-driven scenes.

## animation/edit-director
**Summary:** Timing is the product — the edit plan must protect hold time after key reveals, stagger secondary elements behind primaries to reinforce hierarchy, and keep motion meaningful (each motion signals emphasis, transition, transformation, or contrast). Continuous motion overcrowding and revealing everything at once are the top failures.
**Rules we should adopt:**
- Protect hold time: after key reveals, plan enough dwell time to process the frame; don't stack scenes edge-to-edge with motion.
- Stagger secondary elements: primary first, supporting second — the edit decisions reinforce hierarchy.
- Motion must mean something: emphasis, transition, transformation, or contrast — nothing decorative.
- Metadata: hold_windows, stagger_rules, transition_map, scene_timing_notes.
- Quality gate: key info has enough dwell, movement clarifies hierarchy, transitions consistent, readable on target platform.
- Pitfalls: overcrowding the timeline with continuous motion, revealing all elements at once, stylistic motion that reduces readability.
**What we already do differently:**
- Our motion comes from layout variant pools (motion variants with jitter). The hold-time/stagger/hierarchy discipline maps to how we set per-scene motion timing.

## animation/compose-director
**Summary:** Renders animation with an emphasis on text sharpness and timing integrity. Mandatory steps: copy assets into Remotion's public/ directory, build the composition JSON (anime_scene prop reference included), run audio-energy analysis on the music track to find the optimal offset (skip quiet intros) and detect loop need, run the composition validator before EVERY render, and extract mid-scene frames for post-render visual self-review. Runtime is locked at proposal and must never be silently swapped.
**Rules we should adopt:**
- Assets MUST be in `remotion-composer/public/` (staticFile() only resolves there) — #1 cause of render failures is skipping this copy/symlink; images + music both.
- anime_scene composition JSON prop reference: type, images (1-4, relative to public/), animation (9 camera motions, default ken-burns), particles (fireflies/petals/sparkles/mist/light-rays), particleColor, particleCount (1-50), particleIntensity (0-1), backgroundColor, vignette (default true), lightingFrom/lightingTo.
- Music offset analysis (MANDATORY): run audio-energy analysis — finds the N-second window with highest average energy (ambient tracks have quiet 10-30s intros), recommends offsetSeconds and needs_loop; apply offset + loop in the JSON; Remotion loops audio seamlessly with volume fade reset per loop.
- Pre-render validation (NO EXCEPTIONS): composition_validator catches missing files, invalid timings (out ≤ in), audio longer than video. Fix before rendering.
- Protect text/diagram sharpness (soft text, muddy thin lines, cramped mobile framing fail animation exports); preserve hold/stagger/transition timing through export.
- Render command: `npx remotion render Explainer --props=... --codec=h264 --crf=18` (composition name is `Explainer`; don't pass src/index.ts).
- Post-render self-review: extract one frame from mid-scene for each scene (ffmpeg select) — check images visible (not black), particles rendering, camera motion evident, overlays correct, palette consistent, vignette depth; then ffprobe (duration ±5%, 1920x1080, audio stream present).
- Never use `durationInFrames` from `useVideoConfig()` for scene-level timing — it returns FULL composition duration, not the scene Sequence duration.
**What we already do differently:**
- Our render loop (bundle → 30s draft → gate → master) + gate_vox runtime checks cover probing/quality; the composition-JSON + public/-staging + music-offset-analysis steps are new and apply to anime_scene-style projects.
