# Taste Standard — IsaacVerse Harness

> This document accumulates approved visual principles that define the harness's
> evolving standard of beauty. Every principle here was derived from evidence
> (VLM critique, user feedback, IsaacVerse audit) and approved through governance.
> The agent reads this file as memory to guide its style decisions.

## Composition

- **Centered text for chapter cards** — title text centered both horizontally and vertically. Score: 4/5 from VLM. Maintains focus and hierarchy.
- **Balanced negative space** — leave breathing room around text elements. Avoid edge-kissing.
- **Single focal point per beat** — one dominant visual element per scene. Multiple competing focal points reduce impact.

## Color

- **High contrast text** — white text on black/dark background ensures maximum legibility. VLM score: 5/5.
- **Warm accent for emphasis** — yellow/amber accent color for keywords or emphasis text. Adds warmth without breaking minimalist aesthetic.
- **Limited palette** — 2-3 primary colors per video. More colors = more visual noise.

## Motion

- **Motion must have purpose** — static frames score 1/5 on motion from VLM. Every element should have subtle, purposeful animation (fade, slide, scale).
- **Smooth easing** — use ease-in-out for organic motion, ease-out for entries. Avoid linear easing (feels mechanical).
- **Reveal animations** — diagram edges should animate in (draw-on effect) rather than appearing instantly. Reveal duration: 0.8-1.2s.

## Text Legibility

- **Large font for primary text** — chapter card titles at 96-120px (short/long variants). VLM score: 5/5.
- **Clear sans-serif typeface** — clean, geometric fonts for maximum readability at all sizes.
- **Hierarchy through size and weight** — bold main points, regular subtext. Don't rely on color alone for hierarchy.

## Pacing

- **Breathing room between beats** — 0.3-0.5s pause between scene transitions. VLM flagged lack of breathing room as pacing issue.
- **Gradual content changes** — fade transitions between content states. Sudden cuts feel jarring in story-driven content.
- **Match motion to narrative** — fast motion for action, slow for reflection. Motion speed should mirror emotional intensity.

## Style Knobs (approved values)

> ⚠️ 2026-08-19 audit: the entries below came from an earlier governance era
> (pre A/B-test invalidation) and DO NOT match the current style store
> (`isaacverse-style.json` has mode=solid, fontSizeShort=96). They are kept as
> *candidates*, not as approved truth. Re-approve through a valid measurement
> (pairwise comparison or a stronger VLM — see knowledge-base.md) before
> treating any of them as standard.

- `edge.stroke.mode`: gradient — CANDIDATE (adds depth over solid; needs re-verification)
- `edge.stroke.width`: 2-3 (range, allows per-treatment tuning)
- `chapter-card.title.fontSizeShort`: 96-110 (current store: 96; 110 needs re-verification)
- `edge.stroke.gradientStops`: warm-to-cool 2-color gradient

## Lessons Learned

> Accumulated from feedback + critique cycles. Each lesson has provenance.
> ⚠️ Provenance note (2026-08-19): lessons sourced from GLM-4V-Flash absolute
> scores are weak evidence — the controlled A/B test showed that VLM could not
> detect a real render change. Treat them as hypotheses pending re-verification
> with a valid oracle (pairwise comparison / Qwen3-VL video input).

- **Static frames are the #1 quality killer** — VLM consistently scores motion 1/5 on static keyframes. Always add at least subtle animation to every visual element. (Source: VLM critique 2026-08-15; caveat: keyframe sampling biases scores toward "no motion")

- **Fade duration length is not perceived as motion** — extending `chapter-card.reveal.inDurationSec` (0.45→1.1s) left the motion score at 1/5 and slightly hurt pacing (2→1). A lone opacity-fade does not read as movement to the VLM. To register as motion, an element needs translate/scale/spring displacement, not just a slower fade. Don't waste a change on fade-duration knobs alone for motion issues. (Source: cycle 2026-08-15; within-session comparison — direction plausible, magnitudes uncertain)

- **Stroke rendering mode is a PACE knob, not a MOTION knob** — switching `semantic-diagram.edge.stroke.mode` solid→gradient left motion at 3/5 but raised pacing 3→4. Use mode/color knobs to tune pacing and depth; reach for entrance/damping/displacement knobs when motion is the target. (Source: cycle 2026-08-18; ⚠️ cross-session comparison — NOT controlled, treat as unverified hypothesis)
