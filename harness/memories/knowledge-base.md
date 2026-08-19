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
- `edge.revealDurationSec`: controls how long edge draw-on takes. INCREASING this makes animation visible longer = more motion detected by VLM.
- `entrance.damping/stiffness/mass/durationSec`: NOW WIRED to style store (was hardcoded before fix). Controls node entrance spring animation (scale + opacity). Lower damping = bouncier = more visible motion.
- **Best motion knobs for semantic-diagram:**
  1. `entrance.damping` 18→10 (bouncier entrance)
  2. `edge.revealDurationSec` 0.65→2.0 (longer draw-on = more frames show motion)
  3. `entrance.durationSec` 0.75→1.5 (longer entrance animation)

### chapter-card treatment (segment 0-3.5s)
- NO motion knobs available. Only fade/reveal timing knobs.
- Do NOT try to improve motion on chapter-card segments.
- If motion is weak, switch to semantic-diagram segment (3.5-7s) which HAS motion knobs.

## Pending experiments (try these next)

- entrance.damping: 18 → 10 (expected: bouncier node entrance → motion improves on semantic-diagram)
- edge.revealDurationSec: 0.65 → 2.0 (expected: longer draw-on → VLM sees motion in more frames)
- entrance.durationSec: 0.75 → 1.5 (expected: longer entrance animation → more visible motion)
- edge.stroke.mode: solid → gradient (expected: improves COLOR, not motion — but still worth trying for overall quality)


### Experiment: entrance.damping 18 → 10 ✅ SUCCESS
- Date: 2026-08-19
- Segment: isaacverse-final 3.5-7s (semantic-diagram: 'A cut is a decision')
- Before scores: composition=5, color=5, motion=1, text=5, pacing=3
- After scores: composition=4, color=4, motion=3, text=5, pacing=4
- Result: IMPROVED (motion +2, pacing +1; composition -1, color -1)
- Learning: Lower entrance.damping (18→10) makes node entrance bouncier. VLM detects this as more visible motion. Tradeoff: slight decrease in composition/color scores (possibly because bouncier animation is less 'clean'). Net improvement is positive.
- Action: KEPT. This is the first verified score improvement.
