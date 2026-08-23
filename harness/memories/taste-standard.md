# Taste Standard — IsaacVerse Harness

> This document accumulates approved visual principles that define the harness's
> evolving standard of beauty. The agent reads this file as memory to guide its
> style decisions.
>
> **Schema (2026-08-23)**: every principle is a JSON object inside a fenced
> ```json block. Fields: `id` (unique), `principle`, `scope` (`global` |
> `treatment:<name>` | `category:<type>` | `one-time`), `category`
> (`typography|color|composition|motion|pacing|narrative`), `direction`,
> `source`, `confidence` (`high`≥3 signals | `medium`=2 | `low`=1), `verified`,
> `rejected`, `promoted` (true when verified ≥ 2), `status` (`ACTIVE` = apply
> by default | `CANDIDATE` = hypothesis, verify before applying).
> Validate with: `python harness/validate_principles.py`.

## ACTIVE PRINCIPLES — user's design direction (2026-08-22)

> The 5 directives the user gave after reviewing the Isaac reference material.
> These are HIGH confidence and ACTIVE: apply them to ALL treatments by
> default; they override inherited preferences when in conflict.

```json
[
  {"id": "typo-001", "principle": "All text elements use bold weight (900+) with visual effects (stroke, gradient fill, or shadow)", "scope": "global", "category": "typography", "direction": "bolder+effects", "source": "user:2026-08-22", "confidence": "high", "verified": 2, "rejected": 0, "promoted": true, "status": "ACTIVE"},
  {"id": "col-001", "principle": "Colors are vivid, saturated and high-contrast — never washed out or muted; accent elements must pop against the background", "scope": "global", "category": "color", "direction": "more-vivid+higher-contrast", "source": "user:2026-08-22", "confidence": "high", "verified": 2, "rejected": 0, "promoted": true, "status": "ACTIVE"},
  {"id": "col-002", "principle": "Use gradients and color transitions instead of flat single-color fills — titles, lines, bars and borders all benefit from gradient treatment", "scope": "global", "category": "color", "direction": "gradients+transitions", "source": "user:2026-08-22", "confidence": "high", "verified": 2, "rejected": 0, "promoted": true, "status": "ACTIVE"},
  {"id": "comp-001", "principle": "Lines and connectors are organic curves (bezier paths, brush-like strokes), not mechanical straight lines", "scope": "global", "category": "composition", "direction": "organic-curves", "source": "user:2026-08-22", "confidence": "high", "verified": 2, "rejected": 0, "promoted": true, "status": "ACTIVE"},
  {"id": "nar-001", "principle": "Information is presented as narrative — a character or host presence tells the story — instead of raw data display", "scope": "global", "category": "narrative", "direction": "story-over-information", "source": "user:2026-08-22", "confidence": "high", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE", "note": "U4 2026-08-23: A+B confirmed; A upgraded to full character-presence system per gold standard brief (see nar-002 + docs/CHARACTER-PRESENCE-SPEC.md)"}
]
```

### Character presence (nar-001 A+ — user gold standard brief 2026-08-23)

> Spec đầy đủ: docs/CHARACTER-PRESENCE-SPEC.md. 1 branded head x pose library
> x position/motion/size grammar — moi lan xuat hien la 1 shot khac nhau.

```json
[
  {"id": "nar-002", "principle": "Character appears with a DIFFERENT pose, position, motion and size every time - never the same framing twice in a row; pose/gesture matches the narrative context (Isaac head-on-many-bodies model)", "scope": "global", "category": "narrative", "direction": "context-matched-variety", "source": "user:2026-08-23 gold standard brief", "confidence": "high", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE", "note": "see docs/CHARACTER-PRESENCE-SPEC.md"},
  {"id": "comp-201", "principle": "Character placement follows photography composition (rule-of-thirds power points, lead room, negative-space balance) and never covers the focal content", "scope": "global", "category": "composition", "direction": "composition-aware-presence", "source": "user:2026-08-23 gold standard brief", "confidence": "high", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"}
]
```

## INHERITED PRINCIPLES (VLM-critique era — medium confidence)

> Derived from VLM critiques and the IsaacVerse audit (2026-08-15..19).
> These predate the user's 5 directives; keep applying them except where an
> ACTIVE principle above overrides (e.g. limited-palette yields to gradients).

### Composition

```json
[
  {"id": "comp-101", "principle": "Centered text for chapter cards — title centered horizontally and vertically, maintaining focus and hierarchy", "scope": "treatment:chapter-card", "category": "composition", "direction": "centered", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "comp-102", "principle": "Balanced negative space — breathing room around text elements, no edge-kissing", "scope": "global", "category": "composition", "direction": "more-negative-space", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "comp-103", "principle": "Single focal point per beat — one dominant visual element per scene", "scope": "global", "category": "composition", "direction": "single-focus", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"}
]
```

### Color

```json
[
  {"id": "col-101", "principle": "High contrast text — white text on black/dark background for maximum legibility", "scope": "global", "category": "color", "direction": "max-contrast", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "col-102", "principle": "Warm accent for emphasis — amber/orange accent on keywords; adds warmth without noise", "scope": "global", "category": "color", "direction": "warm-accent", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "col-103", "principle": "Limited palette — 2-3 primary colors per video (SUPERSEDED by col-002 gradients where they conflict: gradient fills may span 2 hues)", "scope": "global", "category": "color", "direction": "limited-palette", "source": "vlm:2026-08-15", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"}
]
```

### Motion

```json
[
  {"id": "mot-101", "principle": "Motion must have purpose — every element has subtle, purposeful animation (fade, slide, scale); static frames score worst", "scope": "global", "category": "motion", "direction": "purposeful-motion", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "mot-102", "principle": "Smooth easing — ease-in-out for organic motion, ease-out for entries; avoid linear easing", "scope": "global", "category": "motion", "direction": "smooth-easing", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "mot-103", "principle": "Reveal animations — edges draw on progressively (0.8-1.2s) instead of appearing instantly", "scope": "global", "category": "motion", "direction": "draw-on-reveal", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 1, "rejected": 0, "promoted": false, "status": "ACTIVE"}
]
```

### Typography

```json
[
  {"id": "typo-101", "principle": "Large font for primary text — chapter card titles 96-120px", "scope": "treatment:chapter-card", "category": "typography", "direction": "larger", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "typo-102", "principle": "Clean sans-serif typeface for readability at all sizes", "scope": "global", "category": "typography", "direction": "sans-serif", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "typo-103", "principle": "Hierarchy through size AND weight — bold main points, regular subtext", "scope": "global", "category": "typography", "direction": "strong-hierarchy", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"}
]
```

### Pacing

```json
[
  {"id": "pac-101", "principle": "Breathing room between beats — 0.3-0.5s pause at scene transitions", "scope": "global", "category": "pacing", "direction": "breathing-room", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "pac-102", "principle": "Gradual content changes — fade transitions between content states, no jarring cuts in story content", "scope": "global", "category": "pacing", "direction": "gradual-transitions", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"},
  {"id": "pac-103", "principle": "Match motion to narrative — fast for action, slow for reflection", "scope": "global", "category": "pacing", "direction": "motion-matches-mood", "source": "vlm:2026-08-15", "confidence": "medium", "verified": 0, "rejected": 0, "promoted": false, "status": "ACTIVE"}
]
```

## Legacy knob guidance (pre-principle era)

> ⚠️ 2026-08-19 audit: the entries below came from an earlier governance era
> (pre A/B-test invalidation) and DO NOT match the current style store. Kept
> as *candidates* only — re-verify before treating as standard:
> `edge.stroke.mode: gradient` (CANDIDATE), `edge.stroke.width: 2-3`,
> `chapter-card.title.fontSizeShort: 96-110`, `edge.stroke.gradientStops:
> warm-to-cool 2-color gradient`.

## Lessons Learned

> Accumulated from feedback + critique cycles. Each lesson has provenance.
> ⚠️ Provenance note (2026-08-19): lessons sourced from GLM-4V-Flash absolute
> scores are weak evidence — treat as hypotheses pending re-verification.

- **Static frames are the #1 quality killer** — always add subtle animation to every visual element. (Source: VLM critique 2026-08-15; caveat: keyframe sampling biases scores toward "no motion")
- **Fade duration is not perceived as motion** — an element needs translate/scale/spring displacement, not just a slower fade. Don't spend changes on fade-duration knobs for motion issues. (Source: cycle 2026-08-15)
- **Stroke rendering mode is a PACE knob, not a MOTION knob** — use mode/color knobs to tune pacing and depth; entrance/damping/displacement knobs for motion. (Source: cycle 2026-08-18; unverified cross-session comparison)


## Tutorial Candidates — học từ Isaac (CANDIDATE, CHƯA VERIFY)

> Sinh 2026-08-22 từ 3 video Isaac (04-editing, 02-scripts, 06-thumbnails) qua
> montage VLM. Đây là GIẢ THUYẾT — mỗi nguyên tắc phải qua verification cycle
> (pixel-diff + pairwise + KEEP gate của user) trước khi thành nguyên tắc
> thật trong các mục ở trên. Không tự áp nguyên tắc CANDIDATE khi phán xét;
> chỉ dùng để gợi ý knob/khía cạnh cần thử. Khi promote: cap tỉ lệ nguyên tắc
> nguồn-Isaac ≤ 50% của standard (divergence là mục tiêu). Xem gốc: docs/
> learning-browser.html + harness/memories/tutorial-candidates.json.

### Accent area - MERGED 2026-08-23 (user duyet)

> Gop 17 quan sat thanh 1 nguyen tac. Nguon goc tung quan sat: tutorial-candidates.json.
> Do deterministic tren renders: accent 0.03-4.69% dien tich (measure_candidates.py).

```json
{"id": "col-201", "principle": "Accent color is vivid but restrained: occupies <= ~10% of frame area, concentrated on focal elements (titles, borders, highlights, active controls) - never on backgrounds or body text", "scope": "global", "category": "color", "direction": "restrained-vivid-accent", "source": "tutorial:merged-17-observations+user-review:2026-08-23", "confidence": "high", "verified": 1, "rejected": 0, "promoted": false, "status": "ACTIVE", "note": "complements col-001 (vivid color, small area); measured 0.03-4.69% <= 10%"}
```

### Text hierarchy - MERGED 2026-08-23 (user duyet)

> Gop 16 quan sat thanh 1 nguyen tac do duoc. Nguon goc: tutorial-candidates.json.

```json
{"id": "typo-201", "principle": "Text hierarchy uses 2-3 tiers with adjacent size ratios >= 1.5x (title >= 1.8x subtitle >= 1.5x detail/metadata)", "scope": "global", "category": "typography", "direction": "strict-size-tiers", "source": "tutorial:merged-16-observations+user-review:2026-08-23", "confidence": "high", "verified": 1, "rejected": 0, "promoted": false, "status": "ACTIVE", "note": "node/detail fixed 1.43x -> 1.54x via detailFontSize 14->13"}
```

### Composition

```json
{"id": "tut-composition-001", "principle": "Identical compositional units (arcs + labels) are repeated horizontally with ≤ 5% variation in position or scale across successive frames, indicating translational motion without transformation.", "scope": "global", "category": "composition", "direction": "unverified", "source": "tutorial:tutorial:02 How I Actually Write Viral Scripts.mp4@450.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-composition-002", "principle": "All compositional elements align to a single vertical centerline, with ≥40% horizontal negative space on both sides.", "scope": "global", "category": "composition", "direction": "unverified", "source": "tutorial:tutorial:02 How I Actually Write Viral Scripts.mp4@900.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-composition-003", "principle": "Text is uniformly sized, lowercase, white-on-black, and positioned at fixed vertical offset (≈10% from bottom) across all panels.", "scope": "global", "category": "composition", "direction": "unverified", "source": "tutorial:tutorial:06 How I Actually Make Viral Thumbnails.mp4@150.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
```

### Pacing

```json
{"id": "tut-pacing-001", "principle": "Black-screen cuts are used as hard breaks with no transitional motion (instant cut, not fade/dissolve). CONFLICTS with pac-102 (gradual fades) - user must vote on real renders before either wins.", "scope": "global", "category": "pacing", "direction": "unverified", "source": "tutorial:tutorial:04 How I Actually Edit Viral Videos.mp4@1050.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-pacing-002", "principle": "Panel transitions use abrupt cuts (not motion-blurred or eased), with pose changes timed to coincide with new textual phrase introduction.", "scope": "global", "category": "pacing", "direction": "unverified", "source": "tutorial:tutorial:06 How I Actually Make Viral Thumbnails.mp4@150.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-pacing-003", "principle": "Subject entry occurs via hard cut (0-frame transition) without motion interpolation, coinciding with a new textual cue.", "scope": "global", "category": "pacing", "direction": "unverified", "source": "tutorial:tutorial:06 How I Actually Make Viral Thumbnails.mp4@300.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
```

### Motion (HOÃN verify — oracle mù motion tới khi có F4)

```json
{"id": "tut-motion-001", "principle": "A single animated highlight (e.g., oval stroke) is introduced only after two static frames, following a 2:1 static-to-motion ratio for emphasis buildup.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:02 How I Actually Write Viral Scripts.mp4@150.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-motion-002", "principle": "Radial compositional framing is used to isolate and elevate a single animated element while leveraging >90% negative space for contrast.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:02 How I Actually Write Viral Scripts.mp4@600.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-motion-003", "principle": "A primary graphical element (the line) remains spatially fixed across ≥2 consecutive frames before any secondary object enters the frame.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:04 How I Actually Edit Viral Videos.mp4@150.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-motion-004", "principle": "Motion blur is applied only to newly introduced objects, not to pre-established graphical elements.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:04 How I Actually Edit Viral Videos.mp4@150.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-motion-005", "principle": "Motion is restricted to primary subject’s upper-body gestures and subtle icon pulsing; background elements remain static, enforcing focal stability despite high visual density.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:04 How I Actually Edit Viral Videos.mp4@300.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-motion-006", "principle": "Motion is restricted to one element per temporal beat, using horizontal slide with visible motion blur implying duration ≤ 0.5s at 30fps.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:04 How I Actually Edit Viral Videos.mp4@450.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-motion-007", "principle": "Pointing gestures are timed to coincide with entry of a new focal UI element, and the gesture completes within 0.9s of the element’s visual reveal.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:04 How I Actually Edit Viral Videos.mp4@900.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-motion-008", "principle": "State changes occur via discrete text replacement (not animated transitions), with ≤1 semantic element changing per edit point.", "scope": "global", "category": "motion", "direction": "unverified", "source": "tutorial:tutorial:06 How I Actually Make Viral Thumbnails.mp4@600.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
```

### Khác

```json
{"id": "tut-other-001", "principle": "All non-data elements (gridlines, background, inset portrait) are desaturated or low-contrast to ensure ≥ 4:1 luminance contrast between data curves and surroundings.", "scope": "global", "category": "composition", "direction": "unverified", "source": "tutorial:tutorial:02 How I Actually Write Viral Scripts.mp4@750.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-other-002", "principle": "Motion is restricted to two types: linear (playhead) and naturalistic micro-motion (flame); no UI animations occur.", "scope": "global", "category": "composition", "direction": "unverified", "source": "tutorial:tutorial:04 How I Actually Edit Viral Videos.mp4@750.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-other-003", "principle": "Motion within diegetic graphics (e.g., hologram ring emergence) follows discrete stage progression (0 → partial → full structure) rather than continuous interpolation, suggesting keyframed reveal timing.", "scope": "global", "category": "composition", "direction": "unverified", "source": "tutorial:tutorial:06 How I Actually Make Viral Thumbnails.mp4@450.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
{"id": "tut-other-004", "principle": "Primary textual overlays are placed within the lower-left third of the frame, maintaining ≥15% vertical margin from bottom edge and avoiding occlusion of facial features.", "scope": "global", "category": "composition", "direction": "unverified", "source": "tutorial:tutorial:06 How I Actually Make Viral Thumbnails.mp4@600.0s", "confidence": "low", "verified": 0, "rejected": 0, "promoted": false, "status": "CANDIDATE"}
```
