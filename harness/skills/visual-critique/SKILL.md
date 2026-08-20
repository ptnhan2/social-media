---
name: visual-critique
description: How to interpret VLM critique results and turn them into style decisions. The agent cannot see video, so it relies on VLM critique plus this skill to understand what "good" looks like.
---

# Skill: Visual Critique — How to Judge Video Frames

> This skill teaches the agent how to interpret VLM critique results and make
> informed style decisions. The agent cannot see video (DeepSeek is text-only),
> so it relies on VLM (GLM-4V-Flash) critique + this skill to understand what
> "good" looks like.

## The 5 Critique Aspects

### 1. Composition (layout, focal point, balance)
- **What to look for**: Is there a clear focal point? Is the layout balanced? Is negative space used well?
- **Score 1-2**: Cluttered, no focal point, elements compete for attention
- **Score 3**: Adequate but uninspired, centered everything with no variation
- **Score 4-5**: Strong focal point, deliberate use of space, rule of thirds, leading lines
- **Style knobs that affect composition**: `chapter-card.title.fontSizeShort`, `chapter-card.title.fontSizeLong`

### 2. Color (harmony, contrast, temperature)
- **What to look for**: Do colors work together? Is contrast sufficient for legibility? Is the temperature (warm/cool) intentional?
- **Score 1-2**: Clashing colors, insufficient contrast, washed out
- **Score 3**: Functional but flat, no color depth
- **Score 4-5**: Harmonious palette, intentional contrast, color adds emotion
- **Style knobs that affect color**: `edge.stroke.mode` (solid=flat, gradient=depth), `edge.stroke.gradientStops`, `host-reflection.filter`

### 3. Motion (smoothness, purpose, energy)
- **What to look for**: Does motion serve the narrative? Is easing smooth? Is there enough movement?
- **Score 1-2**: Static/no motion, or jarring/abrupt motion
- **Score 3**: Some motion but feels mechanical (linear easing) or purposeless
- **Score 4-5**: Every element moves with purpose, smooth easing, motion matches narrative energy
- **Style knobs that affect motion**: `edge.revealDurationSec`, `host-reflection.pushStart`, `host-reflection.pushEnd`
- **Key insight**: Static frames consistently score 1/5. Always ensure at least subtle animation.

### 4. Text Legibility (readability, hierarchy, occlusion)
- **What to look for**: Can you read the text? Is there clear hierarchy? Is anything occluded?
- **Score 1-2**: Unreadable, text too small, poor contrast with background
- **Score 3**: Readable but no clear hierarchy, or text competes with visuals
- **Score 4-5**: Large, clear text, strong hierarchy (size + weight), no occlusion
- **Style knobs that affect text**: `chapter-card.title.fontSizeShort`, `chapter-card.title.fontSizeLong`, `host-reflection.subtitleFontSize`

### 5. Pacing (rhythm, breathing room, flow)
- **What to look for**: Does the video breathe? Are transitions smooth? Does the rhythm match the content?
- **Score 1-2**: Too fast (no time to absorb) or too slow (boring)
- **Score 3**: Adequate but uniform rhythm, no variation
- **Score 4-5**: Varied rhythm, breathing room between beats, transitions match content energy
- **Style knobs that affect pacing**: `edge.revealDurationSec`

## How to Use Critique Results

1. **Identify the TOP ISSUE** — the VLM names the single most impactful improvement
2. **Find low-scoring aspects** (score ≤ 3) — these are improvement opportunities
3. **Map to style knobs** — use `propose_improvement` to get concrete proposals
4. **Prioritize by impact** — motion and text legibility are the most impactful for story-driven videos
5. **Apply one change at a time** — don't change multiple knobs simultaneously (can't isolate effects)
6. **Re-render and re-critique** — verify the improvement before persisting

## Decision Framework

| Critique says... | You should... |
|---|---|
| "Motion: 1 — static" | Increase `revealDurationSec`, ensure all elements have entrance animations |
| "Color: 3 — flat" | Switch `edge.stroke.mode` from `solid` to `gradient`, add `gradientStops` |
| "Text: 2 — unreadable" | Increase `fontSizeShort`/`fontSizeLong`, check contrast |
| "Pacing: 2 — too fast" | Increase `revealDurationSec`, add pauses between beats |
| "Composition: 3 — no variation" | Vary layout, use different font sizes for hierarchy |

## Anti-Patterns

- **Don't change everything at once** — one knob per render cycle
- **Don't ignore high scores** — if text is 5/5, don't change font size
- **Don't skip re-rendering** — always verify changes visually via VLM
- **Don't persist without approval** — every change goes through update_style (approval-gated)
