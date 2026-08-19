# Knowledge Base — Experiment Results

> This file accumulates results of every style change experiment.
> The agent reads this BEFORE making changes to avoid repeating failed experiments.
> Format: knob, old→new, before/after scores, result, learning.

## Experiments

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

### Root cause: the measurement instrument, not the knob
- GLM-4V-Flash receives 4 keyframes (2 pairs, 80ms apart) scaled to 640px. Motion is
  temporal; sparse static frames barely encode it.
- The VLM prompt asks for 1-5 integers on 5 aspects at once — coarse + non-deterministic.
- Verdict: **GLM-4V-Flash + keyframe sampling is NOT a valid quality oracle for motion.**
  Until a better oracle exists (Qwen3-VL native video input, or pairwise A/B), treat all
  motion-score claims from it as noise.
