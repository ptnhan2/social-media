---
name: style-knobs
description: Reference for all evolvable style knobs — what they control, expected effects, and which visual aspect they influence. Read this BEFORE changing any knob.
---

# Style Knobs Reference

All knobs are in `treatments.<treatment-name>.<knob-path>` format.
Style store: `/workspace/libraries/04-visual/isaacverse-style.json`

## Aspect → Knob Mapping (READ THIS FIRST)

When the critic says an aspect is weak, find the right knob here:

### MOTION (critic score: motion)
Motion means visible animation — elements moving, fading, scaling, drawing on.

| Knob | Current | Effect | How to improve |
|------|---------|--------|----------------|
| `semantic-diagram.edge.stroke.mode` | solid | solid=static line, gradient=animated draw-on, brush=hand-drawn effect | Change solid→gradient to add draw-on animation |
| `semantic-diagram.edge.revealDurationSec` | 0.65 | How long the edge takes to draw on (seconds) | Increase for slower, more dramatic reveal. Decrease for snappy |
| `semantic-diagram.entrance.damping` | 18 | Spring animation damping (higher=less bounce) | Decrease for bouncier entrance animation |
| `semantic-diagram.entrance.stiffness` | 140 | Spring stiffness (higher=faster snap) | Increase for more energetic entrance |
| `semantic-diagram.entrance.durationSec` | 0.75 | How long entrance animation lasts | Increase for slower, more visible entrance |
| `host-reflection.pushStart` | 1.06 | Camera push zoom (1.0=static, 1.06=slow push, 1.1=faster) | Increase for more camera motion |
| `host-reflection.pushDurationSec` | 4 | How long the push takes | Decrease for faster, more noticeable push |
| `screen-proof.cameraStart` | 1.04 | Camera zoom start for screen-proof treatment | Increase for more zoom motion |
| `cinematic-metaphor.pushStart` | 1.08 | Camera push for cinematic metaphor | Increase for more motion |
| `chapter-card.reveal.inDurationSec` | 0.45 | Chapter card fade-in duration | NOTE: This controls FADE speed, not motion. Changing it won't add motion. |

### COLOR (critic score: color)
Color means harmony, contrast, temperature, saturation.

| Knob | Current | Effect | How to improve |
|------|---------|--------|----------------|
| `semantic-diagram.edge.stroke.mode` | solid | solid=flat color, gradient=2-color depth | Change to gradient for richer color |
| `semantic-diagram.edge.stroke.gradientStops` | ["#7fd8e8","#f2d58a"] | Gradient colors (cyan→warm) | Try different color pairs |
| `semantic-diagram.edge.stroke.color` | rgba(242,184,75,0.58) | Edge color in solid mode | Adjust opacity or hue |
| `host-reflection.filter` | saturate(.72)... | CSS filter on host footage | Adjust saturation/contrast/brightness |
| `colors.amber` | #f2b84b | Primary accent color | Change hue for different mood |
| `colors.cyan` | #61d7e8 | Secondary accent color | Change for different palette |

### COMPOSITION (critic score: composition)
Composition means layout, focal point, balance, negative space.

| Knob | Current | Effect | How to improve |
|------|---------|--------|----------------|
| `chapter-card.title.fontSizeShort` | 96 | Title font size (short titles) | Increase for more dominant title |
| `chapter-card.title.fontSizeLong` | 82 | Title font size (long titles) | Adjust for better fit |
| `chapter-card.accentLine.height` | 5 | Accent line thickness | Increase for more visual weight |
| `chapter-card.accentLine.maxWidth` | 190 | Accent line max width | Adjust for balance |
| `semantic-diagram.node.fontSize` | 20 | Node label font size | Adjust for readability |
| `semantic-diagram.node.borderRadius` | 10 | Node corner radius | Adjust for style |

### TEXT LEGIBILITY (critic score: text)
Text legibility means readability, hierarchy, occlusion.

| Knob | Current | Effect | How to improve |
|------|---------|--------|----------------|
| `chapter-card.title.fontSizeShort` | 96 | Title size | Increase if too small |
| `chapter-card.title.fontSizeLong` | 82 | Long title size | Increase if too small |
| `semantic-diagram.node.fontSize` | 20 | Node text size | Increase for readability |
| `semantic-diagram.node.detailFontSize` | 14 | Node detail text | Increase for readability |
| `host-reflection.subtitle.fontSize` | 27 | Subtitle size | Increase for readability |
| `semantic-diagram.title.fontSize` | 46 | Diagram title size | Adjust for hierarchy |

### PACING (critic score: pacing)
Pacing means rhythm, breathing room, flow, cut timing.

| Knob | Current | Effect | How to improve |
|------|---------|--------|----------------|
| `semantic-diagram.edge.revealDurationSec` | 0.65 | Edge draw-on speed | Faster=energetic, slower=contemplative |
| `semantic-diagram.entrance.durationSec` | 0.75 | Entrance animation length | Adjust for pacing feel |
| `chapter-card.reveal.inDurationSec` | 0.45 | Card fade-in speed | Faster=snappy, slower=dramatic |
| `chapter-card.reveal.lineStartSec` | 0.15 | When accent line starts drawing | Adjust timing |
| `chapter-card.reveal.lineEndSec` | 0.8 | When accent line finishes | Adjust timing |
| `process-timeline.progressStartSec` | 0.35 | When progress bar starts | Adjust for pacing |
| `process-timeline.progressEndSec` | 1.2 | When progress bar finishes | Adjust for pacing |

## Treatment Reference

### semantic-diagram
Network/node visualization with connecting edges. Used for explaining concepts.
Key knobs: edge.stroke.mode, edge.revealDurationSec, entrance.*

### chapter-card
Big section title cards. Used between sections.
Key knobs: title.fontSize*, reveal.*, accentLine.*

### host-reflection
Host voiceover with letterbox and optional subtitle. Camera push.
Key knobs: filter, pushStart, pushDurationSec, letterbox*, subtitle.*

### screen-proof
Screen recording or proof display with camera zoom.
Key knobs: cameraStart, cameraDurationSec, focusStartSec, focusEndSec

### audience-demand
Context/response animation showing demand.
Key knobs: contextIn*, responseIn* timing

### process-timeline
Step-by-step process with progress bar.
Key knobs: titleInDurationSec, progressStartSec, progressEndSec

### candidate-comparison
Side-by-side comparison of options.
Key knobs: titleInDurationSec, candidateStaggerSec

### cinematic-metaphor
Cinematic push with metaphor visual.
Key knobs: entranceDurationSec, pushStart, pushDurationSec

## Common Improvement Patterns

1. **"Motion is 1/5"** → Change `edge.stroke.mode` from `solid` to `gradient` (adds draw-on animation)
2. **"Color is 3/5"** → Change `edge.stroke.mode` to `gradient` + adjust `gradientStops`
3. **"Text is 3/5"** → Increase `fontSizeShort` or `fontSize` by 10-20%
4. **"Pacing is 2/5"** → Adjust `revealDurationSec` and `entrance.durationSec` for better rhythm
5. **"Composition is 3/5"** → Adjust `accentLine.maxWidth` or `fontSizeShort` for better balance

## Rules

- Change ONE knob per cycle (isolate effects)
- Use `update_style` tool (not edit_file) to change knobs
- After change: re-render + re-critique to verify
- If score doesn't improve: revert and try a different knob
- Record what worked in /memories/taste-standard.md
