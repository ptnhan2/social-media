# TUTORIAL CANDIDATES — REVIEW CHO USER (D2)

> Sinh tự động lúc 2026-08-21T23:16 bởi generate_review_doc.py.
> Nguồn: 2 video Isaac, 41 candidates thô.
> Quy trình (roadmap P3): candidates là GIẢ THUYẾT — duyệt của bạn → entry CANDIDATE trong
> taste-standard.md → verify cycle → nguyên tắc thật. Isaac là một trường phái, không phải
> phúc âm (divergence là mục tiêu).

## Bảng quyết định nhanh

| Nhóm | Số lượng | Khuyến nghị |
|---|---|---|
| accent-area | 13 | GỘP + DUYỆT |
| composition | 2 | GHI NHẬN |
| junk | 2 | BỎ |
| motion | 7 | HOÃN (F4) |
| other | 2 | XEM TỪNG CÁI |
| pacing | 1 | GHI NHẬN |
| text-hierarchy | 14 | DUYỆT + CYCLE |

## Đo đạc deterministic trên renders hiện tại

- Accent-area: Hiện tại các render baseline đo được amber 0.03–4.69% và cyan 0.03–0.56% diện tích khung hình — toàn bộ dưới mọi ngưỡng candidate.
- Text hierarchy: semantic-diagram: title/node=2.3x, node/detail=1.43x (candidate ≥1.5x → FAIL sát sao 0.07x); chapter-card title/subtitle=4.1x (dư dả).
- Lưu ý: mọi phép đo ở mid-frame, ngưỡng hue ±, sat/val ≥ 0.35 (harness/measure_candidates.py).

## Nhóm: accent-area — GỘP + DUYỆT

**Lý do:** Gộp 5+ biến thể thành MỘT nguyên tắc 'accent color ≤ ~10% diện tích khung' — style hiện tại thỏa với biên rộng (khoảng cách an toàn cho tương lai). Không cần cycle.

- "The accent color (red-orange) occupies ≤ 8% of the frame area in static shots and is never overlaid by more than one additional colored object at a time."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@150.0s`
- "Accent color (orange/gold glow) is applied to ≤ 20% of total frame area, concentrated on poster borders and character hair/beard, while foreground subject uses ≤ 2 muted non-accent colors (off-white, maroon)."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@300.0s`
- "Accent color (purple) occupies ≤ 8% of total frame area and appears on exactly 1–2 elements per frame, always confined to the top row."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@450.0s`
- "Accent color (non-neutral, saturated hues like cyan/magenta/orange) occupies ≤ 12% of total frame area and is restricted to title, timeline tracks, and presenter’s hair/beard."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@600.0s`
- "Accent color is used on ≤ 8% of the frame area and exclusively on currently active UI controls."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@750.0s`
- "Accent color (orange-red) occupies ≤12% of total frame area across all three snapshots, concentrated in hair, border highlights, and cursor—never in background or primary text."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@900.0s`
- "Accent color (orange-red) occupies ≤2% of total frame area and appears exclusively on non-background elements (hair/beard), never on UI or text."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@1050.0s`
- "Accent color (non-white) occupies ≤ 8% of total frame area per unit, concentrated in gradient text and micro-labels."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@150.0s`
- "Accent color (non-white/non-gray) occupies ≤ 8% of total frame area per panel, concentrated in borders, banners, or small icons."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@300.0s`
- "Accent color (amber nodes) occupies ≤ 6% of total frame area across all instances."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@450.0s`
- "Accent color occupies ≤3% of frame area and is confined to a single dynamic focal cluster."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@600.0s`
- "Accent colors (green/red) occupy ≤ 8% of total frame area and appear exclusively on data curves and their direct labels."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@750.0s`
- "Accent color (non-white/non-black) occupies ≤12% of frame area and is confined to three contiguous elements: graph line, directional arrow, and portrait glow."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@900.0s`

## Nhóm: composition — GHI NHẬN

**Lý do:** Áp dụng cho presenter/footage (host-reflection) hơn là diagram treatments. Ghi vào taste-standard như hướng dẫn composition, không cần cycle.

- "Identical compositional units (arcs + labels) are repeated horizontally with ≤ 5% variation in position or scale across successive frames, indicating translational motion without transformation."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@450.0s`
- "All compositional elements align to a single vertical centerline, with ≥40% horizontal negative space on both sides."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@900.0s`

## Nhóm: junk — BỎ

**Lý do:** Sinh từ frame đen/lỗi sample (VLM phân tích garbage frame).

- "A trailing ellipsis (“…”) placed in extreme negative space (<1% of frame area) functions as a visual pause cue, not information delivery."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@1200.0s`
- "Accent color (gold/yellow) occupies ≤ 0.01% of total frame area when used for micro-typography in black-field contexts."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@1200.0s`

## Nhóm: motion — HOÃN (F4)

**Lý do:** Không đo được bằng công cụ hiện tại (montage oracle mù motion — đã chứng minh 2026-08-21). Giữ lại, verify khi có native video input.

- "A primary graphical element (the line) remains spatially fixed across ≥2 consecutive frames before any secondary object enters the frame."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@150.0s`
- "Motion blur is applied only to newly introduced objects, not to pre-established graphical elements."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@150.0s`
- "Motion is restricted to primary subject’s upper-body gestures and subtle icon pulsing; background elements remain static, enforcing focal stability despite high visual density."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@300.0s`
- "Motion is restricted to one element per temporal beat, using horizontal slide with visible motion blur implying duration ≤ 0.5s at 30fps."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@450.0s`
- "Pointing gestures are timed to coincide with entry of a new focal UI element, and the gesture completes within 0.9s of the element’s visual reveal."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@900.0s`
- "A single animated highlight (e.g., oval stroke) is introduced only after two static frames, following a 2:1 static-to-motion ratio for emphasis buildup."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@150.0s`
- "Radial compositional framing is used to isolate and elevate a single animated element while leveraging >90% negative space for contrast."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@600.0s`

## Nhóm: other — XEM TỪNG CÁI

**Lý do:** Chưa phân loại được tự động.

- "Motion is restricted to two types: linear (playhead) and naturalistic micro-motion (flame); no UI animations occur."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@750.0s`
- "All non-data elements (gridlines, background, inset portrait) are desaturated or low-contrast to ensure ≥ 4:1 luminance contrast between data curves and surroundings."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@750.0s`

## Nhóm: pacing — GHI NHẬN

**Lý do:** Hard-cut vs fade là lựa chọn gu — cần vote thật trước khi thành chuẩn.

- "Black-screen cuts are used as hard breaks with no transitional motion (instant cut, not fade/dissolve)."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@1050.0s`

## Nhóm: text-hierarchy — DUYỆT + CYCLE

**Lý do:** Nguyên tắc hierarchy hợp lệ. Có 1 điểm fail đo được: node/detail 1.43x < 1.5x (knob detailFontSize 14→13 có thể fix) — candidate đầu tiên cho cycle sau khi có oracle tốt hơn (hoặc vote trực tiếp).

- "Text appears only once per ~3-second segment, positioned in bottom-right quadrant, occupying < 3% of frame height and using uniform weight/spacing without hierarchy."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@300.0s`
- "Text hierarchy uses exactly two font sizes (small for data labels, large for summary blocks), with size ratio ≈ 1:1.8 (measured by bounding box height)."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@450.0s`
- "Primary focal point (title + flowchart) is vertically centered and horizontally aligned, with presenter positioned at 70–80% horizontal position to avoid symmetry and guide eye flow left→right."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@600.0s`
- "Typographic hierarchy is enforced by size alone—no weight variation or case shifts—where the main title is ≥ 3× larger than any UI label (none visible, but inferred from absence)."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@600.0s`
- "Focal point is maintained via luminance contrast (program monitor ≥ 1.8× brighter than adjacent panels) and central horizontal placement (40–45% of frame width)."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@750.0s`
- "Text hierarchy enforces a strict 3-tier size ratio: primary title ≥1.8× subtitle ≥1.5× metadata (e.g., view count unit), with weight contrast ≥200 (e.g., Bold vs. Regular)."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@900.0s`
- "Subtitle text height is ≤4% of frame height and positioned ≥10% above bottom edge, with zero stroke/shadow."
  - nguồn: `tutorial:04 - How I Actually Edit Viral Videos.mp4@1050.0s`
- "Text size hierarchy inverts semantic priority: the lower (“deeper”) phrase is 1.2–1.3× larger in rendered height than the upper (“surface”) phrase."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@150.0s`
- "Title text height is ≥ 1.7× the height of supporting descriptive text, with letter-spacing ≤ –25 tracked units."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@300.0s`
- "In multi-panel layouts, the central panel is scaled 3–5% larger than side panels and positioned 2–4px forward in Z-space to establish visual hierarchy without motion."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@300.0s`
- "Text uses strict two-tier size/weight hierarchy: secondary label (“call to adventure”) is ≥ 1.2× taller and ≥ 20% heavier stroke weight than primary label (“status quo”)."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@450.0s`
- "Text size hierarchy uses ≥2.5× height difference between secondary and primary phrases, with primary phrase using bold weight and subtle emissive effect."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@600.0s`
- "Subtitle text changes occur without accompanying motion graphics—implying a cut-based pacing where visual stability precedes semantic shift."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@750.0s`
- "Tertiary callout text is 1.5× larger and ≥200% heavier weight than supporting text, and appears only in the final third of a multi-panel sequence."
  - nguồn: `tutorial:02 - How I Actually Write Viral Scripts.mp4@900.0s`

## Việc chờ bạn (buổi sáng)

1. Duyệt từng nhóm theo khuyến nghị (sửa tự do — đây là GIẢ THUYẾT).
2. Vote 2 cặp 1080p đã render sẵn (hr3_1080_*) — test giả thuyết resolution.
3. Quyết định node/detail 1.43x: fix bằng cycle (detailFontSize 14→13) hay kệ.
4. (Nếu rảnh) Cấp key DashScope quốc tế — F4 giờ là critical path của toàn bộ
   hướng tiến hóa treatment (xem knowledge-base 'blind spot is PERCEPTUAL').