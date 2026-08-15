---
name: style-knobs
description: Reference for all evolvable style knobs — what they control and how to change them
---

# Style Knobs Reference

All knobs are in `treatments.<treatment-name>.<knob-path>` format.
Change them via `update_style(style_path, new_value)`.

## semantic-diagram.edge.stroke
- mode: "solid" | "gradient" | "brush" — stroke rendering mode
- color: rgba string (for solid mode, e.g. "rgba(242,184,75,0.58)")
- width: number (stroke width in px)
- gradientStops: ["#color1", "#color2"] (for gradient mode)
- brushDasharray: "3 1 5 2" (for brush mode — irregular dash pattern)
- revealDurationSec: number (edge draw animation duration)

## chapter-card.title
- fontSizeShort: number (default 96, for titles <= 22 chars)
- fontSizeLong: number (default 82, for titles > 22 chars)
- lineHeight: number (default 1.08)

## chapter-card.accentLine
- height: number (default 5, underline thickness)
- maxWidth: number (default 190, underline max width in px)

## chapter-card.reveal
- inDurationSec: number (fade-in duration)
- lineStartSec: number (underline start time)
- lineEndSec: number (underline end time)

## host-reflection
- filter: CSS filter string (e.g. "saturate(.72) contrast(1.18) brightness(.72)")
- pushStart: number (camera push start scale, default 1.06)
- pushDurationSec: number (default 4)
- entranceDurationSec: number (default 0.5)
- letterboxTopPct: number (default 8)
- letterboxBottomPct: number (default 12)
- subtitleFontFamily: string (default "Georgia, serif")
- subtitleFontSize: number (default 27)

## screen-proof
- cameraStart: number (default 1.04)
- cameraDurationSec: number (default 4)
- entranceDurationSec: number (default 0.8)
- focusStartSec: number (default 0.65)
- focusEndSec: number (default 1.15)

## audience-demand
- contextInStartSec: number (default 2.4)
- contextInEndSec: number (default 3.3)
- responseInStartSec: number (default 3.5)
- responseInEndSec: number (default 4.2)

## process-timeline
- titleInDurationSec: number (default 0.45)
- progressStartSec: number (default 0.35)
- progressEndSec: number (default 1.2)

## candidate-comparison
- titleInDurationSec: number (default 0.45)
- candidateStaggerSec: number (default 0.22)

## cinematic-metaphor
- entranceDurationSec: number (default 0.7)
- pushStart: number (default 1.08)
- pushDurationSec: number (default 4)
