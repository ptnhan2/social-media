# Knowledge Base — Experiment Results

> This file accumulates results of every style change experiment.
> The agent reads this BEFORE making changes to avoid repeating failed experiments.
> Format: knob, old→new, before/after scores, result, learning.

## Experiments

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
| process-timeline | 0 | 0 | 0 | untested — spring + progress knobs wired |
| host-reflection | 0 | 0 | 0 | subtitle.fontSize NOT WIRED (hardcoded 28) |
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
