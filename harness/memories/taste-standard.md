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


## Tutorial Candidates — học từ Isaac (CANDIDATE, CHƯA VERIFY)

> Sinh 2026-08-22 từ 3 video Isaac (04-editing, 02-scripts, 06-thumbnails) qua
> montage VLM. Đây là GIẢ THUYẾT — mỗi nguyên tắc phải qua verification cycle
> (pixel-diff + pairwise + KEEP gate của user) trước khi thành nguyên tắc
> thật trong các mục ở trên. Không tự áp nguyên tắc CANDIDATE khi phán xét;
> chỉ dùng để gợi ý knob/khía cạnh cần thử. Khi promote: cap tỉ lệ nguyên tắc
> nguồn-Isaac ≤ 50% của standard (divergence là mục tiêu). Xem gốc: docs/
> learning-browser.html + harness/memories/tutorial-candidates.json.

### Accent area (màu nhấn chiếm bao nhiêu % khung)

- CANDIDATE: The accent color (red-orange) occupies ≤ 8% of the frame area in static shots and is never overlaid by more than one additional colored object at a time.  `[04 How I Actually Edit Viral Videos.mp4@150.0s]`
- CANDIDATE: Accent color (orange/gold glow) is applied to ≤ 20% of total frame area, concentrated on poster borders and character hair/beard, while foreground subject uses ≤ 2 muted non-accent colors (off-white, maroon).  `[04 How I Actually Edit Viral Videos.mp4@300.0s]`
- CANDIDATE: Accent color (purple) occupies ≤ 8% of total frame area and appears on exactly 1–2 elements per frame, always confined to the top row.  `[04 How I Actually Edit Viral Videos.mp4@450.0s]`
- CANDIDATE: Accent color (non-neutral, saturated hues like cyan/magenta/orange) occupies ≤ 12% of total frame area and is restricted to title, timeline tracks, and presenter’s hair/beard.  `[04 How I Actually Edit Viral Videos.mp4@600.0s]`
- CANDIDATE: Accent color is used on ≤ 8% of the frame area and exclusively on currently active UI controls.  `[04 How I Actually Edit Viral Videos.mp4@750.0s]`
- CANDIDATE: Accent color (orange-red) occupies ≤12% of total frame area across all three snapshots, concentrated in hair, border highlights, and cursor—never in background or primary text.  `[04 How I Actually Edit Viral Videos.mp4@900.0s]`
- CANDIDATE: Accent color (orange-red) occupies ≤2% of total frame area and appears exclusively on non-background elements (hair/beard), never on UI or text.  `[04 How I Actually Edit Viral Videos.mp4@1050.0s]`
- CANDIDATE: Accent color (non-white) occupies ≤ 8% of total frame area per unit, concentrated in gradient text and micro-labels.  `[02 How I Actually Write Viral Scripts.mp4@150.0s]`
- CANDIDATE: Accent color (non-white/non-gray) occupies ≤ 8% of total frame area per panel, concentrated in borders, banners, or small icons.  `[02 How I Actually Write Viral Scripts.mp4@300.0s]`
- CANDIDATE: Accent color (amber nodes) occupies ≤ 6% of total frame area across all instances.  `[02 How I Actually Write Viral Scripts.mp4@450.0s]`
- CANDIDATE: Accent color occupies ≤3% of frame area and is confined to a single dynamic focal cluster.  `[02 How I Actually Write Viral Scripts.mp4@600.0s]`
- CANDIDATE: Accent colors (green/red) occupy ≤ 8% of total frame area and appear exclusively on data curves and their direct labels.  `[02 How I Actually Write Viral Scripts.mp4@750.0s]`
- CANDIDATE: Accent color (non-white/non-black) occupies ≤12% of frame area and is confined to three contiguous elements: graph line, directional arrow, and portrait glow.  `[02 How I Actually Write Viral Scripts.mp4@900.0s]`
- CANDIDATE: Accent color (orange-red hair/beard) occupies ≤10% of frame area and is the only non-neutral chromatic element.  `[06 How I Actually Make Viral Thumbnails.mp4@150.0s]`
- CANDIDATE: Accent color (non-white/non-black) occupies ≤ 12% of total frame area and appears in ≤ 3 distinct non-contiguous regions per frame.  `[06 How I Actually Make Viral Thumbnails.mp4@300.0s]`
- CANDIDATE: Accent color (cyan) occupies ≤15% of frame area and is strictly confined to diegetic UI elements (holograms), never applied to non-diegetic text or background.  `[06 How I Actually Make Viral Thumbnails.mp4@450.0s]`
- CANDIDATE: Accent color (yellow-orange) occupies ≤10% of frame area and is restricted to title text and character highlights only.  `[06 How I Actually Make Viral Thumbnails.mp4@600.0s]`

### Text hierarchy (tỉ lệ cỡ chữ các tầng)

- CANDIDATE: Text appears only once per ~3-second segment, positioned in bottom-right quadrant, occupying < 3% of frame height and using uniform weight/spacing without hierarchy.  `[04 How I Actually Edit Viral Videos.mp4@300.0s]`
- CANDIDATE: Text hierarchy uses exactly two font sizes (small for data labels, large for summary blocks), with size ratio ≈ 1:1.8 (measured by bounding box height).  `[04 How I Actually Edit Viral Videos.mp4@450.0s]`
- CANDIDATE: Primary focal point (title + flowchart) is vertically centered and horizontally aligned, with presenter positioned at 70–80% horizontal position to avoid symmetry and guide eye flow left→right.  `[04 How I Actually Edit Viral Videos.mp4@600.0s]`
- CANDIDATE: Typographic hierarchy is enforced by size alone—no weight variation or case shifts—where the main title is ≥ 3× larger than any UI label (none visible, but inferred from absence).  `[04 How I Actually Edit Viral Videos.mp4@600.0s]`
- CANDIDATE: Focal point is maintained via luminance contrast (program monitor ≥ 1.8× brighter than adjacent panels) and central horizontal placement (40–45% of frame width).  `[04 How I Actually Edit Viral Videos.mp4@750.0s]`
- CANDIDATE: Text hierarchy enforces a strict 3-tier size ratio: primary title ≥1.8× subtitle ≥1.5× metadata (e.g., view count unit), with weight contrast ≥200 (e.g., Bold vs. Regular).  `[04 How I Actually Edit Viral Videos.mp4@900.0s]`
- CANDIDATE: Subtitle text height is ≤4% of frame height and positioned ≥10% above bottom edge, with zero stroke/shadow.  `[04 How I Actually Edit Viral Videos.mp4@1050.0s]`
- CANDIDATE: Text size hierarchy inverts semantic priority: the lower (“deeper”) phrase is 1.2–1.3× larger in rendered height than the upper (“surface”) phrase.  `[02 How I Actually Write Viral Scripts.mp4@150.0s]`
- CANDIDATE: Title text height is ≥ 1.7× the height of supporting descriptive text, with letter-spacing ≤ –25 tracked units.  `[02 How I Actually Write Viral Scripts.mp4@300.0s]`
- CANDIDATE: In multi-panel layouts, the central panel is scaled 3–5% larger than side panels and positioned 2–4px forward in Z-space to establish visual hierarchy without motion.  `[02 How I Actually Write Viral Scripts.mp4@300.0s]`
- CANDIDATE: Text uses strict two-tier size/weight hierarchy: secondary label (“call to adventure”) is ≥ 1.2× taller and ≥ 20% heavier stroke weight than primary label (“status quo”).  `[02 How I Actually Write Viral Scripts.mp4@450.0s]`
- CANDIDATE: Text size hierarchy uses ≥2.5× height difference between secondary and primary phrases, with primary phrase using bold weight and subtle emissive effect.  `[02 How I Actually Write Viral Scripts.mp4@600.0s]`
- CANDIDATE: Subtitle text changes occur without accompanying motion graphics—implying a cut-based pacing where visual stability precedes semantic shift.  `[02 How I Actually Write Viral Scripts.mp4@750.0s]`
- CANDIDATE: Tertiary callout text is 1.5× larger and ≥200% heavier weight than supporting text, and appears only in the final third of a multi-panel sequence.  `[02 How I Actually Write Viral Scripts.mp4@900.0s]`
- CANDIDATE: Overlay captions use font size ≥ 2.3× that of embedded UI text and are positioned within 10% of the bottom-left corner margin.  `[06 How I Actually Make Viral Thumbnails.mp4@300.0s]`
- CANDIDATE: Subtitle typography remains static in size, weight, and position across sequential frames—even during motion—preserving legibility through consistency.  `[06 How I Actually Make Viral Thumbnails.mp4@450.0s]`

### Composition

- CANDIDATE: Identical compositional units (arcs + labels) are repeated horizontally with ≤ 5% variation in position or scale across successive frames, indicating translational motion without transformation.  `[02 How I Actually Write Viral Scripts.mp4@450.0s]`
- CANDIDATE: All compositional elements align to a single vertical centerline, with ≥40% horizontal negative space on both sides.  `[02 How I Actually Write Viral Scripts.mp4@900.0s]`
- CANDIDATE: Text is uniformly sized, lowercase, white-on-black, and positioned at fixed vertical offset (≈10% from bottom) across all panels.  `[06 How I Actually Make Viral Thumbnails.mp4@150.0s]`

### Pacing

- CANDIDATE: Black-screen cuts are used as hard breaks with no transitional motion (instant cut, not fade/dissolve).  `[04 How I Actually Edit Viral Videos.mp4@1050.0s]`
- CANDIDATE: Panel transitions use abrupt cuts (not motion-blurred or eased), with pose changes timed to coincide with new textual phrase introduction.  `[06 How I Actually Make Viral Thumbnails.mp4@150.0s]`
- CANDIDATE: Subject entry occurs via hard cut (0-frame transition) without motion interpolation, coinciding with a new textual cue.  `[06 How I Actually Make Viral Thumbnails.mp4@300.0s]`

### Motion (HOÃN verify — oracle mù motion tới khi có F4)

- CANDIDATE: A primary graphical element (the line) remains spatially fixed across ≥2 consecutive frames before any secondary object enters the frame.  `[04 How I Actually Edit Viral Videos.mp4@150.0s]`
- CANDIDATE: Motion blur is applied only to newly introduced objects, not to pre-established graphical elements.  `[04 How I Actually Edit Viral Videos.mp4@150.0s]`
- CANDIDATE: Motion is restricted to primary subject’s upper-body gestures and subtle icon pulsing; background elements remain static, enforcing focal stability despite high visual density.  `[04 How I Actually Edit Viral Videos.mp4@300.0s]`
- CANDIDATE: Motion is restricted to one element per temporal beat, using horizontal slide with visible motion blur implying duration ≤ 0.5s at 30fps.  `[04 How I Actually Edit Viral Videos.mp4@450.0s]`
- CANDIDATE: Pointing gestures are timed to coincide with entry of a new focal UI element, and the gesture completes within 0.9s of the element’s visual reveal.  `[04 How I Actually Edit Viral Videos.mp4@900.0s]`
- CANDIDATE: A single animated highlight (e.g., oval stroke) is introduced only after two static frames, following a 2:1 static-to-motion ratio for emphasis buildup.  `[02 How I Actually Write Viral Scripts.mp4@150.0s]`
- CANDIDATE: Radial compositional framing is used to isolate and elevate a single animated element while leveraging >90% negative space for contrast.  `[02 How I Actually Write Viral Scripts.mp4@600.0s]`
- CANDIDATE: State changes occur via discrete text replacement (not animated transitions), with ≤1 semantic element changing per edit point.  `[06 How I Actually Make Viral Thumbnails.mp4@600.0s]`

### Khác

- CANDIDATE: Motion is restricted to two types: linear (playhead) and naturalistic micro-motion (flame); no UI animations occur.  `[04 How I Actually Edit Viral Videos.mp4@750.0s]`
- CANDIDATE: All non-data elements (gridlines, background, inset portrait) are desaturated or low-contrast to ensure ≥ 4:1 luminance contrast between data curves and surroundings.  `[02 How I Actually Write Viral Scripts.mp4@750.0s]`
- CANDIDATE: Motion within diegetic graphics (e.g., hologram ring emergence) follows discrete stage progression (0 → partial → full structure) rather than continuous interpolation, suggesting keyframed reveal timing.  `[06 How I Actually Make Viral Thumbnails.mp4@450.0s]`
- CANDIDATE: Primary textual overlays are placed within the lower-left third of the frame, maintaining ≥15% vertical margin from bottom edge and avoiding occlusion of facial features.  `[06 How I Actually Make Viral Thumbnails.mp4@600.0s]`
