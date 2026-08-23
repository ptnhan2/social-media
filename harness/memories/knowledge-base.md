# Knowledge Base — Experiment Results

> This file accumulates results of every style change experiment.
> The agent reads this BEFORE making changes to avoid repeating failed experiments.
> Format: knob, old→new, before/after scores, result, learning.

## Experiments

### nar-001 A+ — character presence system live (2026-08-23 evening)
- User gold-standard brief: 1 branded head x pose library x position/motion/
  size grammar — never the same framing twice (docs/CHARACTER-PRESENCE-SPEC.md)
- Phase 1 shipped: grammar module (characterPresence.ts, shared by BOTH render
  paths), head + 4 placeholder poses, context mapping (narrativeFunction ->
  config), params.characterPresence override per beat
- First applications: SD beat-02 (present pose, beside-content, pop, medium)
  + PT beat-04 (point-right, edge-l-in pointing INTO the timeline, slide-r)
  — 2 DIFFERENT shots; PT kicker now shows narrativeFunction (Part B)
- QA: treatment path diff 1.47 vs pre-nar; pose swap diff 1.13; editor path
  diff 1.70 — presence reaches BOTH render flows
- Generator sync PRODUCTION-VERIFIED: added 2 presence elements + keptUser 1
  (the E6-edited kicker clip preserved via userEdited ledger — merge works)
- Evaluator: nar-002 compliance check added; principle_compliance stays 1
- Gotcha: render baselines BEFORE editing code (rendered after = both sides
  identical, gate FAIL 0.0 falsely)

## Experiments

### Generator session (E2-E6) — 2026-08-23 afternoon
- E4: userEdited ledger live in ALL editorOperations (37 ops) + userDeletedClipIds
  (EditorDoc field) — regeneration can never lose or resurrect user work.
  10 ledger tests.
- E5: style-aware projection — treatmentElements resolves style-store knobs at
  projection time (StyleResolver, node-safe); element clips carry styleSource
  (prop→knob) + styleResolvedAt{storeVersion}; textGradient metadata for
  gradient titles. scripts/generate-editor.mjs: cold/sync/scoped, 3-way merge
  (3 node tests). current.json cold-regenerated at store v73 — **preview now
  shows the current style for the first time** (golden doc backed up).
- E2: dual compositions (isaacverse-final-30s + -30s-editor), render-window
  --path editor|treatment, EditorClipOverlay gradient-text support.
  PATH-IDENTITY GATE NOT MET: paths differ (max mean 9.4, 14% px on 3.5-7s) —
  the element language lacks bezier edges/spring physics. Editor flip DEFERRED
  until parity; treatment stays the master render default.
- E3: editor-ops bridge + harness editor_op tool (10 tools). AGENTS.md clip
  editing protocol added.
- E6: MECHANICALLY PROVEN — editor_op metadata (kicker fontSize 18→30) →
  editor-path render → pixel-diff PASS (1.438). Root cause found on the way:
  render-window never synced the LIVE editor JSON (public copy was 7 days
  stale — clip edits invisible in renders). Fixed: syncRuntimePublic pulls
  projects/<slug>/editor/current.json every render.
- E6 agent-driven LOOP: NOT reliable yet — 2 Ox Alpha attempts failed
  (empty-turn endings, exploration sprawl, one rogue hand-edit of current.json
  caught by the permission interrupt — no damage, restored from backup).
  Next step for full autonomy: narrow clip-edit subagent or better tool-
  following model. e6_e2e.py is the driver for re-running the E2E.
- GOTCHA for eval: the 'Change edge stroke mode' dataset case mutates the real
  store every full run (reset stroke.mode=solid after; done 2x overnight).


### U3 user review — principles CONFIRMED + PROMOTED (2026-08-23 morning)
- User viewed side-by-side before/after frames for all 4 windows:
  "cac phien ban after co cai thien ro hon (du toi nghi van co the tot hon nua)"
- Result: typo-001, col-001, col-002, comp-001 → verified=2, promoted=true
  (1: eval compliance pass; 2: user visual confirmation) — now REAL standard.
- The "van co the tot hon nua" part is recorded in feedback.jsonl as a
  continuing-improvement signal — NOT yet a new principle (too vague to
  classify; next specific feedback will refine direction).
- Learning phase stays 3 (self-evaluating). nar-001 still awaits U4.


### D-phase: eval trend proven end-to-end (2026-08-23 overnight)
Four experiments in LangSmith (dataset isaacverse-harness-evals, 14 cases):
1. **D1a baseline** (harness-eval-4626481a): principle_compliance 0/14,
   code_quality 0/14 — the documented "before" state
2. **D1b after-principles** (harness-eval-7a9dc319): principle_compliance
   14/14, code_quality 14/14, aesthetic_quality 12/14 (working gemini judge)
3. **D2 intentionally broken** (harness-eval-db191690, comments.fontWeight
   default 900→400): principle_compliance 10/14 — all 4 design cases scored
   0. THE EVALUATOR CATCHES REGRESSIONS.
4. **D3 restored** (harness-eval-0f937467): principle_compliance 14/14 —
   recovery confirmed.
- Answer to "is the agent getting smarter?": the LangSmith comparison view
  now shows this 4-point trend. Future principle work extends the same chart.
- Evaluator hardened during D2: getStyle defaults are parsed too (caught a
  real leftover — SD title.fontWeight 800 → fixed 900).
- Remaining noise: read_memory/used_think are response-text heuristics and
  vary run to run; ignore for trend reading. The mutating eval case
  ("Change edge stroke mode to gradient") flips the real store every run —
  reset stroke.mode=solid after each full eval (done twice tonight).


### Principle application: 5 user design directives → ALL treatments (2026-08-23 overnight)
- Protocol: v5 (principle-based, NOT knob A/B) — first full E-phase run
- Principles: typo-001 (bold 900+ + effects), col-001 (vivid/contrast),
  col-002 (gradients), comp-001 (organic curves); nar-001 documented as
  requires-design-session (host/narrative needs a design decision, not a
  mechanical edit — pending user direction U4)
- Changes: ~30 fontWeight→900 + shadows across 9 treatments; host-reflection +
  cinematic-metaphor filters de-washed (saturate≥1.0, brightness≥0.9);
  gradient titles (ProcessTimeline, CandidateComparison); curved quadratic
  bezier edges (curvature knob 0.12); curved gradient progress bar; organic
  step dots; ~20 new wired style knobs
- QA: 4/4 qa_gate PASS (pixel-diff means: chapter 1.4, semantic 2.6,
  host 5.8, process 3.6 — changes verifiably reached every render)
- Eval transition (offline evaluators): principle_compliance 0→1,
  code_quality 0.0→1.0 (36→5 hardcoded tunable values)
- Learning: principle-based application works — one pass over the treatments
  fixed violations the knob protocol could never address. The QA gate
  (build+render+diff in one call) made 4 sequential edit batches safe.

### Eval baseline (D1a) — experiment harness-eval-4626481a (2026-08-23)
- 14/14 cases ran (42 min, Ox Alpha, max_concurrency=1)
- Baseline scores: used_expected_tools 14/14, no_phantom_tools 14/14,
  response_not_empty 14/14, response_quality 13/14, read_memory 7/14,
  used_think 4/14, principle_compliance 0/14, code_quality 0/14
- CAVEAT: aesthetic_quality 0/14 is a JUDGE MISCONFIG, not a real score —
  the gemini model prefix resolved to a missing vertexai package (fixed:
  google_genai:gemini-3.6-flash). Baseline aesthetic scores are invalid;
  before/after trend rests on principle_compliance + code_quality
  (deterministic, unchanged logic).
- NOTE: eval case "Change edge stroke mode to gradient" EXECUTES update_style
  against the real store — the eval agent flipped stroke.mode to gradient
  (user-rejected state). Reset to solid after detection. Future: mutating
  eval cases should target a scratch copy of the store, or the reset belongs
  in the eval teardown.
- Evaluator refinements AFTER baseline (documented for honest trend reading):
  code_quality now counts numeric fontSize literals + fontWeight<900 only
  (identifier values reference getStyle vars — were false positives);
  washed-filter check excludes blur layers (background depth is intentional).

### Pattern learning system live (2026-08-23)
- taste-standard.md: 71 structured principles (20 ACTIVE, 51 CANDIDATE),
  schema-validated by validate_principles.py
- pattern_extractor.py: 5 meta-patterns (4 HIGH) in feedback-patterns.json;
  learning phase 2 (patterns recognized; phase 3 blocked on <2 verified
  principles — promote after user confirms principle application)
- self-check.md auto-generated, injected into agent memory; verified live:
  agent reports patterns + phase correctly
- online_evaluators.py: tool_discipline + response_quality_online feedback
  on new traces (native LangSmith create_feedback), low scorers routed to
  the render-review annotation queue; watermark idempotent


### Experiment: host-reflection.pushDurationSec 4 → 1.5 — UNVERIFIABLE (oracle blind)
- Date: 2026-08-21 (C3, deterministic protocol run)
- Segment: isaacverse-final 7-10.5s (host-reflection, critique motion 2/5 weakest)
- Pixel-diff gate: PASS (max mean 5.284, 8.7% pixels — huge)
- Pairwise verdict: "identical" (control passed) — the oracle CANNOT see a
  whole-frame zoom shift at this magnitude
- Human fallback vote (vote_session): TIE — user indifferent at 360p
- Result: UNVERIFIABLE. REVERTED (pushDurationSec=4). Not refuted — neither
  oracle (VLM nor user) could discriminate it.

### Experiment: host-reflection.filter saturate/brightness up — UNVERIFIABLE (oracle blind)
- Date: 2026-08-21 (C3 cycle 2, targeting critique's color complaint "washed out")
- Segment: isaacverse-final 7-10.5s
- Change: saturate(.72)→(.8), brightness(.72)→(.88)
- Pixel-diff gate: PASS (max mean 3.751, 8.5% pixels)
- Pairwise verdict: "identical" (control passed) — blind to whole-frame
  luminance shift
- Human fallback vote: TIE
- Result: UNVERIFIABLE. REVERTED.

### Finding: the pairwise oracle's blind spot is PERCEPTUAL, not pipeline (2026-08-21)
- debug_montage.py verified the montage builder: the two montages differ
  (mean 4.06, 10.65% pixels, different bytes). The VLM receives genuinely
  different images and still says "identical" with pixel-level confidence.
- Probe: the SAME VLM correctly judged the fontSize 82/110 pair ("after",
  matching the morning verdict) — the endpoint is not degraded; it is
  specifically blind to GLOBAL changes (whole-frame luminance, saturation,
  zoom) while catching LOCAL high-contrast changes (text size, accent
  blocks, glow).
- Practical rule: pairwise verdicts are only meaningful for local,
  high-contrast knob changes. Global/luminance/motion changes cannot pass
  the gate regardless of pixel-diff magnitude — do not spend cycles on them
  until the oracle improves (F4 native video input).

### Taste-profile insight from 10 calibration votes (2026-08-21)
- User's DECIDED preferences are all LOCAL/high-contrast features: text size
  (prefers 82 over 110), accent line width (190 over 340), accent visibility,
  amber hue (baseline). All 4 decided votes chose the CURRENT baseline.
- User TIES on: all motion pairs (4), global luminance/saturation (2).
- Implication: improvement cycles should target color/text/composition with
  local contrast — motion and global-filter knobs are invisible to this user
  at draft resolution (and to the montage oracle). Spending cycles on motion
  is wasted budget until renders are judged at higher resolution or with
  native video input.

### Conclusion: process-timeline is INSTRUMENT-BLOCKED for pairwise gates (2026-08-21)
- All 4 wired knob types tested today; none can pass the pairwise gate:
  - spring.stiffness 150→180: pairwise "identical" (pixel-diff 0.311)
  - spring.damping 18 vs 4: vote-session VLM "identical", user tie
  - colors.amber: 0.0 pixel diff (not effectively wired for this beat)
  - progressEndSec 1.2 vs 3.5: pixel-diff 0.478 but pairwise "identical"
    (the 3px progress bar is too thin for the 3-frame montage)
- This is an INSTRUMENT limitation, not a knob limitation. The unlock is
  native video input for the VLM (TODO-NEXT F4 — international DashScope
  key) or a denser montage. Until then, do NOT spend cycles on
  process-timeline: record and move on.
- Style store verified restored to true baseline (damping 18, amber
  #f2b84b, progressEndSec 1.2) after two polluted values (damping 22,
  amber #ffb84b) leaked in from dead runs — always verify the store after
  any run that dies mid-cycle.

### Finding: colors.amber on process-timeline — SUB-THRESHOLD, not unwired (corrected 2026-08-21 night)
- Segment: isaacverse-final 10.5-14s (beat final-beat-04, activeStep=2).
- colors.amber #f2b84b → #ffb84b: pixel-diff 0.0. CORRECTION of the earlier
  "did not reach the render" reading: the delta is R-channel-only (242→255,
  13 units) → grayscale diff ≈ 3.9, BELOW the >8 changed-pixel threshold.
  The change DID reach the render; it is simply invisible to the gate.
- Rule: hue-only changes with small channel deltas (especially on small
  accent regions — this beat's steps pin their own colors, leaving only a
  17px kicker + 3px progress bar + faint gradient amber-driven) are below
  the pixel-diff instrument's resolution. Use bigger hue steps or
  channel-balanced colors when testing palette knobs.

### Finding + fix: 11 dead knobs wired (2026-08-21 night, audit_knob_paths.py)
- audit_knob_paths.py cross-checks every getStyle() path vs the store.
- Found and FIXED (all behavior-preserving, QA-verified):
  - host-reflection subtitle path MISMATCH: code read flat
    `subtitleFontSize`/`subtitleFontFamily` while the store nests
    `subtitle.fontSize` — knob dead since inception. Wired to nested paths
    (+ fontStyle wired too).
  - semantic-diagram node.borderWidth/borderRadius/background/fontSize/
    detailFontSize, kicker.fontSize/fontWeight/letterSpacing,
    title.fontSize/fontWeight/letterSpacing — all hardcoded in
    treatments.tsx despite store entries. Now wired.
  - candidate-comparison.candidateStaggerSec — hardcoded 0.22. Now wired.
- QA: identity renders 0.0/0.0 vs pre-change renders (behavior-preserving);
  bump tests node.fontSize 20→28 → 1.654, subtitle.fontSize 27→36 → 2.375;
  vite build + 79/79 tests pass.
- IMPLICATION for earlier experiments: any cycle that touched these knobs
  before 2026-08-21 night could not have changed the render (the C2 "amber
  sub-threshold" case above is separate and real).

### Experiment: process-timeline.progressEndSec 1.2 → 3.5 — reaches render (sanity check)
- Date: 2026-08-21 (local sanity render, not an agent cycle)
- Pixel-diff gate: PASS (max mean 0.478, peak at t=1.34-2.02s — bar fill window)
- Not pairwise-tested; style restored to 1.2 immediately after.

### Experiment: process-timeline.spring.stiffness 150 → 180 — NO CHANGE (pairwise identical)
- Date: 2026-08-21 (C2 first attempt)
- Segment: isaacverse-final 10.5-14s (process-timeline)
- Pixel-diff gate: PASS (max mean 0.311 — small but reached render)
- Pairwise verdict: "identical" (control passed) → auto-reverted
- Result: NO CHANGE. REVERTED (stiffness=150).
- Learning: a 150→180 stiffness delta is below the montage oracle's
  discrimination threshold — consistent with the spring damping 18→4 miss
  in the vote session. Spring knobs on this treatment need drastic deltas
  or a better instrument.

### Experiment: edge.stroke.width 2 → 4 — USER-REJECTED (user-directed fix cycle)
- Date: 2026-08-21 (Batch B test — first feedback-driven cycle ever run)
- Segment: isaacverse-final 3.5-7s (semantic-diagram)
- Feedback: "đường nối nhạt quá, mảnh và khó để ý" → interpretation: width 2→4
- Pixel-diff gate: PASS (max mean 1.767)
- Keep gate: user REJECTED with note "Cả hai đều xấu — màu hơi bệt, đường dày
  hơn vẫn không có chiều sâu" → reverted (width=2 restored)
- Learning: thicker stroke alone does not read as more visible/better to this
  user. Note diagnosed as case 1 (maps to knob): "màu bệt / không chiều sâu"
  → edge.stroke.mode gradient was the follow-up candidate.
- Path evidence: shortened chain ran correctly (update_style → render →
  compare_renders → request_keep(user_directed=True), NO critique/pairwise).

### Experiment: edge.stroke.mode solid → gradient — USER-REJECTED (hot-fix re-evaluation)
- Date: 2026-08-21 (Batch B test — the "hot fix then re-evaluate" promise)
- Segment: isaacverse-final 3.5-7s (semantic-diagram)
- Trigger: diagnosis of the previous rejection note (color depth)
- Pixel-diff gate: PASS (max mean 1.395)
- Keep gate: user REJECTED with note "Tạm ổn — trả về style cũ" → reverted
  (mode=solid restored; store verified back at full baseline)
- Learning: gradient stroke reads as "acceptable but not preferred" vs solid
  for this user — consistent with their calibration votes preferring baseline
  values (see preferences.jsonl 2026-08-21 vote session).

### Experiment: entrance.durationSec 0.75 → 1.5 — REGRESSED (pairwise verdict)
- Date: 2026-08-21 (first full cycle driven through the Composer AgentPanel UI)
- Segment: isaacverse-final 3.5-7s (semantic-diagram)
- Baseline scores: composition=3, color=4, motion=2, text=5, pacing=3 — motion weakest
- Pixel-diff gate: max mean=0.806, changed 0.296-1.998% (change reached render)
- Oracle control (A-vs-A): "Identical" — honest
- Pairwise verdict (A=duration0.75 vs B=duration1.5): "WINNER: first" (baseline wins)
- Keep gate: not reached (verdict loss auto-reverts, no human gate needed)
- Result: REGRESSED. REVERTED (style store durationSec=0.75 verified after cycle)
- Learning: extending the entrance beyond 0.75s does not read as an improvement to
  the oracle. The narrated failure details (missing "MEANING" node, cyan-vs-amber)
  are confabulated specifics — only the verdict line is trusted per protocol.
- Zones honored: oracle-trust.md read at cycle start; all aspects ASK; nothing
  auto-kept; loss → revert without gate (correct protocol v4 behavior).

### Finding: treatments.host-reflection.subtitle.fontSize NOT WIRED (2026-08-21)
- Pixel-diff gate: FAIL (max mean 0.0) for 27 → 36 on segment 7-10.5s.
- Root cause: treatments.tsx hardcodes `fontSize: 28` for the host-reflection
  caption (~line 296); the style-store knob is never read.
- Action: do NOT experiment with subtitle knobs until the treatment reads the
  store (wiring task tracked in TODO-NEXT Batch C3).

### Finding: renders/windows/ab_A_damping18 + ab_B_damping2 are PRE-FIX renders (2026-08-21)
- Pixel-diff gate between them: FAIL (max mean 0.0) — both were rendered
  2026-08-19 15:40, BEFORE the 4-root-cause pipeline fix landed that evening.
- They are stale identical outputs; never reuse them as an A/B pair.
- The valid damping evidence is the 2026-08-19 evening cycle (mean 0.32-0.80)
  and the fresh vs_dm_A/vs_dm_B pair (2026-08-21, max mean 0.58).

### Experiment: chapter-card.reveal.inDurationSec 0.45 → 1.1
- Date: 2026-08-16
- Segment: isaacverse-final 0-4s (chapter-card: "The timeline is not the edit")
- Before scores: composition=3, color=4, motion=1, text=5, pacing=2
- After scores: composition=3, color=4, motion=1, text=5, pacing=1
- Result: REGRESSED (pacing dropped 2→1, motion unchanged)
- Learning: inDurationSec controls fade-in speed, NOT motion. Increasing it makes pacing WORSE. Reverted to 0.45.
- Action: Reverted. inDurationSec is NOT a motion knob.

### Experiment: chapter-card.accentLine.maxWidth 190 → 340
- Date: 2026-08-16
- Segment: isaacverse-final 0-4s (chapter-card)
- Before scores: composition=5, color=5, motion=1, text=5, pacing=3
- After scores: not measured (run consumed 51M tokens, killed)
- Result: FAILED (wrong knob — maxWidth is composition, not motion)
- Learning: accentLine.maxWidth changes visual width of accent line, does NOT add motion.
- Action: Reverted. Always match knob to aspect.

### Experiment: chapter-card.title.fontSizeShort 96 → 130
- Date: 2026-08-19
- Segment: isaacverse-final 0-3.5s (chapter-card)
- Before scores: composition=4, color=3, motion=2, text=5, pacing=2
- Pixel-diff gate: FAIL (max mean=0.0, change did NOT reach render)
- Result: FAILED (pipeline issue — style change not applied to render)
- Learning: fontSizeShort change did not reach render despite style store update. Need to investigate render pipeline for chapter-card treatment.
- Action: Reverted. Style store version rolled back to 29.

## Per-treatment win rate (update after every cycle)

> **Montage oracle limits (2026-08-21 vote session — read before choosing knobs):**
> the 3-frame montage pairwise verdict detected only 4/8 verified-different
> pairs. CAUGHT: big accent visibility, glow 18→60, fontSize 82→110, semantic
> entrance damping 18→2. MISSED ("identical"): process-timeline spring damping
> 18→4, amber→red hue swap, edge reveal timing, accentLine width 190→340.
> Knobs that change SIZE or STRONG brightness in static frames verify best;
> pure timing/motion/hue knobs often die at pairwise. Prefer verifiable knobs
> when the weakest aspect allows a choice.

| Treatment | Cycles | Wins kept | Losses reverted | Notes |
|---|---|---|---|---|
| semantic-diagram | 4 | 2 (damping 18→2, reveal 0.65→2) | 2 (durationSec 0.75→1.5, stroke.width 2→4*, stroke.mode solid→gradient*) | *user-directed, user-rejected. VLM-detectable knobs exist here. |
| chapter-card | 2 | 0 | 2 (inDurationSec, fontSizeShort pre-fix invalid) | motion impossible; text knobs user-prefers-baseline (votes 2026-08-21) |
| process-timeline | 4 | 0 | 4 (stiffness 180, damping 4, amber, progressEndSec 3.5) | INSTRUMENT-BLOCKED: all pairwise "identical" |
| host-reflection | 2 | 0 | 2 (pushDurationSec 1.5, filter bright) | UNVERIFIABLE: oracle blind to global changes; user tied |
| screen-proof / audience-demand / candidate-comparison / cinematic-metaphor | 0 | 0 | 0 | untested |



## Key findings from code research (2026-08-16)

### semantic-diagram treatment (segment 3.5-7s)
- `edge.stroke.mode`: solid→gradient changes STROKE COLOR (visual depth), does NOT add new animation. Draw-on animation exists in both modes.
- `edge.revealDurationSec`: controls how long edge draw-on takes. INCREASING it makes the draw-on animation span more frames (hypothesis: easier to detect as motion — UNVERIFIED, see measurement invalidation).
- `entrance.damping/stiffness/mass/durationSec`: wired to style store. Controls node entrance spring animation (scale + opacity). Lower damping = bouncier. NOTE: 18→10 was NOT detectable by GLM-4V-Flash keyframe critique — only try more drastic values (e.g. 18→2) and only with a valid oracle.
- **Knobs most likely to produce visible motion change (unverified ranking):**
  1. `entrance.durationSec` 0.75→1.5 (longer entrance animation)
  2. `edge.revealDurationSec` 0.65→2.0 (longer draw-on)
  3. `entrance.damping` 18→2 (DRASTIC bouncier entrance — 18→10 undetectable)

### chapter-card treatment (segment 0-3.5s)
- NO motion knobs available. Only fade/reveal timing knobs.
- Do NOT try to improve motion on chapter-card segments.
- If motion is weak, switch to semantic-diagram segment (3.5-7s) which HAS motion knobs.

## Pending experiments (try these next)

> ⚠️ DO NOT trust GLM-4V-Flash absolute scores to measure these. Use pairwise
> comparison (show critic BOTH videos, ask which is better) or a stronger VLM
> (Qwen3-VL with native video input). See "Measurement invalidation" below.

- entrance.damping: 18 → 2 (DRASTIC — to test whether any measurement can detect spring changes)
- edge.revealDurationSec: 0.65 → 2.0 (expected: longer draw-on → more frames show motion)
- entrance.durationSec: 0.75 → 1.5 (expected: longer entrance animation → more visible motion)
- edge.stroke.mode: solid → gradient (expected: improves COLOR, not motion — but still worth trying for overall quality)

## Measurement invalidation (2026-08-19) — READ BEFORE ANY EXPERIMENT

### ✅ RESOLVED same day: full root-cause chain found and fixed

The "style never reached the render" chain (below) was fixed on 2026-08-19
evening. Final root causes (4, not 3):
1. getStyle path prefix missing "treatments." (treatments.tsx) — FIXED.
2. **BeatContent stub regression**: Composer v2 commit (17bf79c) replaced
   `<BeatTreatment/>` with an empty `<BeatContent/>` stub inside every beat
   Sequence — treatments were NEVER rendered; visuals came from editor overlay
   clips (which don't read the style store). FIXED: EditVideo.tsx now renders
   the treatment path when no editor doc is passed (CLI/harness renders), and
   the editor path when the Composer preview passes one.
3. Style JSON webpack-bundling staleness — FIXED by making styleLoader.ts fetch
   the JSON at RUNTIME from public/ (same pattern as the edit doc).
4. **Test methodology bug**: A/B renders write to the same deterministic output
   path — render B overwrites render A, so "diff A vs B" compared B with B.
   ALWAYS copy the before-render aside before rendering the after.

The render pipeline now verifiably applies style changes: damping 18→2 →
0.2-1.7% of pixels change (deterministic PIL diff), peaking during the node
entrance. render-window.mjs rebuilds the bundle only when TS/TSX source changes
(hash-gated) and syncs the runtime JSONs otherwise (~19s per render vs ~52s).

### ✅ FIRST VERIFIED IMPROVEMENT (2026-08-19 evening)

**Experiment: entrance.damping 18 → 2 — IMPROVED (pairwise verdict)**
- Segment: isaacverse-final 3.5-7s (semantic-diagram)
- Baseline scores (Qwen3-VL-flash, keyframe pairs): composition=4, color=3,
  motion=2, text=3, pacing=2 — motion weakest → damping chosen for motion.
- Pixel-diff gate: mean 0.32-0.80, changed 0.46-1.69% (change reached render).
- Oracle control (A-vs-A, premise-neutral prompt): "Identical" — honest.
- Pairwise verdict (A=damping18 vs B=damping2, premise-neutral): "clearly
  different", more visible purposeful movement in second image, "WINNER: second".
- Result: IMPROVED. KEPT (style store now has damping=2).
- Caveats: the VLM's narrated details are confabulated (describes boxes that
  don't exist) — only the binary verdict + direction is trustworthy. Absolute
  scores remain coarse; use pairwise + pixel-diff gate for keep/revert decisions.
- Learning: lower damping makes the entrance more visibly animated and the
  pairwise oracle prefers it. Next candidates: entrance.durationSec 0.75→1.5,
  edge.revealDurationSec 0.65→2.0.

### Oracle protocol (v3 — use this for all future experiments)
1. Render BEFORE, copy aside, apply ONE change, render AFTER.
2. Pixel-diff gate (PIL): max mean diff > 0.05 else the change didn't reach
   the render — abort and debug, never critique.
3. Pairwise control A-vs-A with premise-NEUTRAL prompt — must answer
   "identical", else the oracle is confabulating; do not trust verdicts.
4. Pairwise A/B verdict — trust only WINNER/different-identical, not details.
5. Record knob, values, gate numbers, verdict, decision (keep/revert).

### ROOT CAUSE FOUND 2026-08-19: style changes never reached the render

Every style-knob experiment on this project was INVALID — not because the VLM
was insensitive, but because the renders were pixel-identical regardless of the
style value. Verified by deterministic pixel-diff (PIL ImageChops):

- `entrance.damping` 18 → 2: 0.0% pixel difference at every sampled frame
- `edge.revealDurationSec` 0.65 → 5.0 (fully-drawn vs barely-started edge): 0.0%
- `chapter-card.title.fontSizeShort` 96 → 200 (2x larger title): 0.0%
- A hardcoded bright-red 150px square added to the node component: 0 red pixels

So NO style knob, and not even a source-code edit, affected the render output.

Three compounding bugs found:
1. **getStyle path prefix** — `treatments.tsx` lines 60,61,114-117 called
   `getStyle("semantic-diagram....")` WITHOUT the `"treatments."` prefix, so they
   always returned the hardcoded fallback. FIXED (added prefix). Other treatments
   were already correct.
2. **Remotion render-time bundle cache** — `remotion render <entry>` reuses a
   stale bundle in `%TEMP%/remotion-webpack-bundle-*` and webpack's persistent
   cache in `node_modules/.cache/webpack`; source/JSON edits did not invalidate
   it. Partially mitigated (render-window.mjs + render_window now clear these +
   build an explicit bundle), but a deeper staleness remains (see #3).
3. **Style JSON not reliably loaded** — even after switching styleLoader to a
   runtime `fetch(staticFile(...))` (to bypass webpack bundling), a fontSizeShort
   96→200 change still produced 0 diff. The served bundle does not pick up
   styleLoader.ts edits. **This is UNRESOLVED** — the render keeps using a stale
   bundle regardless of cache clears. Needs a dedicated debugging session
   (likely the webpack persistent cache is not actually invalidating, or Remotion
   serves a bundle from an uncleaned location).

### What this means
- ALL prior experiment results in this file (damping, revealDurationSec,
  stroke.mode) are VOID — the renders never changed.
- The "GLM-4V-Flash can't detect changes" conclusion was WRONG: GLM correctly
  reported no change because there was no change to detect.
- Do NOT run any style-improvement experiment until bug #3 is fixed and a
  deterministic pixel-diff confirms the change reaches the render.

### How to verify the fix (when bug #3 is resolved)
Run `harness/test_style_read.py` (or any damping A/B + PIL pixel-diff). The test
MUST show mean_diff > 0 before any VLM critique is trusted.

### Experiment: entrance.damping 18 → 10 — ❌ REFUTED (renders were identical)
- Date: 2026-08-19
- Segment: isaacverse-final 3.5-7s (semantic-diagram: 'A cut is a decision')
- What happened: an earlier session recorded "motion 1→3, pacing 3→4, IMPROVED" by comparing
  critiques from TWO DIFFERENT sessions. That comparison was INVALID: GLM-4V-Flash is
  non-deterministic and scores from different sessions are not comparable.
- Controlled A/B test (same session, same VLM, direct tool calls — harness/test_ab_direct.py):
  - Baseline (damping=18): composition=4, color=4, motion=3, text=4, pacing=3
  - After (damping=10): composition=4, color=4, motion=3, text=4, pacing=3
  - Result: NO CHANGE — zero delta on all five aspects.
- Learning:
  1. **Absolute 1-5 scores from GLM-4V-Flash on 4 static keyframes cannot detect
     a spring damping change of 18→10.** Either the VLM cannot see it, or 80ms frame
     pairs do not capture it, or score noise swallows the signal.
  2. **Never compare critiques across sessions** — only within one controlled run.
  3. Any "improvement" claim requires: same session, same VLM config, before+after
     rendered and critiqued back-to-back (or better: pairwise comparison).
- Action: reverted to damping=18. The earlier SUCCESS claim is void. Do not re-record
  it as a win anywhere.

### Experiment: edge.revealDurationSec 0.65 → 2 — IMPROVED (pairwise verdict)
- Date: 2026-08-20
- Segment: isaacverse-final 3.5-7s (semantic-diagram)
- Baseline scores: composition=3, color=3, motion=4, text=5, pacing=4 — motion was weakest at 4/5
- Pixel-diff gate: max mean=0.896, changed 0.159-1.503% (change reached render)
- Oracle control (A-vs-A, premise-neutral): "Identical" — honest
- Pairwise verdict (A=reveal0.65 vs B=reveal2, premise-neutral): "WINNER: second"
- More visible, purposeful animation with sequential node reveals and better narrative progression
- Result: IMPROVED. KEPT (style store now has revealDurationSec=2)
- Learning: Increasing edge.revealDurationSec from 0.65→2 seconds creates more visible motion with sequential node reveals, improving the narrative progression and visual engagement of semantic diagrams.

### Root cause: the measurement instrument, not the knob
- GLM-4V-Flash receives 4 keyframes (2 pairs, 80ms apart) scaled to 640px. Motion is
  temporal; sparse static frames barely encode it.
- The VLM prompt asks for 1-5 integers on 5 aspects at once — coarse + non-deterministic.
- Verdict: **GLM-4V-Flash + keyframe sampling is NOT a valid quality oracle for motion.**
  Until a better oracle exists (Qwen3-VL native video input, or pairwise A/B), treat all
  motion-score claims from it as noise.
