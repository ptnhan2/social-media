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
- Learning: inDurationSec controls fade-in speed, NOT motion. Increasing it makes pacing WORSE (slower fade = more static feeling). Reverted to 0.45.
- Action: Reverted. inDurationSec is NOT a motion knob.

### Experiment: chapter-card.reveal.inDurationSec 1.1 → 0.45 (revert)
- Date: 2026-08-16
- Segment: isaacverse-final 0-4s
- Before scores: composition=3, color=4, motion=1, text=5, pacing=1
- After scores: composition=3, color=4, motion=1, text=5, pacing=2
- Result: IMPROVED (pacing restored 1→2)
- Learning: Reverting to original value restored pacing. Confirms inDurationSec 0.45 is better than 1.1 for this segment.

### Experiment: edge.stroke.mode solid → gradient
- Date: 2026-08-18
- Segment: isaacverse-final 3.5-7s (semantic-diagram: "A cut is a decision")
- Before scores: composition=4, color=4, motion=3, text=5, pacing=3
- After scores: composition=4, color=4, motion=3, text=5, pacing=4
- Result: PARTIAL IMPROVEMENT (pacing 3→4, motion unchanged)
- Learning: gradient mode is a stroke-rendering/color-depth knob that reads as more deliberate pacing, NOT a motion knob. It did NOT add displacement-driven draw-on motion. Motion stayed at 3. KEPT the change (net positive, no regression).
- Action: Kept. Removed from pending list.

## Pending experiments (try these next)

- semantic-diagram.entrance.damping: 18 → 12 (expected: bouncier entrance → motion improves)
- host-reflection.pushStart: 1.06 → 1.10 (expected: faster camera push → motion improves)
- edge.stroke.gradientStops: change color pair (expected: different color depth)
