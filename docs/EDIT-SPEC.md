# Edit Spec — IsaacVerse pipeline (S4+S5)

> Edit = biến VideoDoc (beats) + voice + music + assets → video render. Đây là core kỹ thuật.
> Grounded: transcript 04 (editing) + 03 (voice chop-combine áp dụng vào edit) + SYSTEM-SPEC Stage 5/6.
> Renderer = Remotion (dùng lại remotion-composer). Vox primitives retire — build edit comps mới.

## 1. Core: beat = timeline unit, không spatial layout
Mỗi beat = 1 Remotion `<Sequence>` trên timeline. Trong beat: visual asset + motion + text + SFX + VO segment. Music = track liên tục. Overlay = layer trên. Color = adjustment layer. Video = beats nối + music + overlay + grade.

## 2. Edit data model
```ts
interface EditClip {
  beat_id: string;
  start_s: number; end_s: number;          // timeline position
  visual: {
    type: "image"|"video"|"screen_record"|"animation"|"color";
    src?: string;
    motion: string[];                        // motion_token ids
    focal_point: { x: number; y: number };   // 0-1, cho focus-consistency
    zoom?: { from: number; to: number };      // scale interpolate
  };
  text?: {
    content: string;
    kind: "caption"|"center"|"scene_attached";
    pop: boolean;                             // TextPop anim
    position?: { x: number; y: number };
  };
  sfx: { id: string; at_s: number }[];        // within clip
  vo_segment: { src: string; start_s: number; end_s: number };
}
interface EditDoc {
  video_id: string;
  music: { src: string; bpm?: number; beats_s: number[] };  // beat-cut
  clips: EditClip[];                          // ordered = timeline
  overlays: { id: string; at_s: number; dur_s: number; type: "light_leak"|"dust"|"electric" }[];
  color_grade: { preset: "warm"|"cinematic"|"neutral"; intensity: number };
  master_duration_s: number;
}
```

## 3. Remotion composition architecture
```
<Composition> EditVideo
  ├─ <Audio> music (continuous, ducked under VO)
  ├─ <Series> / timeline of <Sequence> per EditClip
  │    ├─ <VisualComp> asset + motion (zoom/text-pop/glow/...)
  │    ├─ <TextComp> nếu có text (TextPop nếu pop=true)
  │    ├─ <Audio> vo_segment
  │    └─ <Audio> sfx[] (per event)
  ├─ <OverlayLayer> light_leak/dust/electric (screen blend, absolute)
  └─ <ColorGrade> adjustment layer (filter: brightness/contrast/saturate)
```
- Beat-cut: `end_s` mỗi clip snap về nearest music beat (nếu bpm/beats_s có).
- Motion = Remotion `interpolate`/`spring` theo frame.
- Focus-consistency: mỗi clip transform để `focal_point` → anchor cố định trên màn hình (vd center-rule-of-thirds).

## 4. Animation templates (catalog = Remotion comps, parameterized)
Đây là nơi chất lượng edit sống. Mỗi template = 1 comp + metadata (when_to_use). Params trích đúng transcript:
- **TextPop** (Finzar): scale `0.7 → 1.1` (qua 7 frame) `→ 1.0` (qua 5 frame), smooth + glow. Dùng cho center text emphasis.
- **Zoom**: scale `interpolate(from→to)` over clip, smooth (spring/ease-out). Highlight/add movement.
- **Typewriter**: text reveal char-by-char (frame-paced). Animation text.
- **TrimPath**: SVG `stroke-dashoffset` draw-on. Move shapes (flowchart arrows/boxes).
- **Glow**: CSS `drop-shadow`/`filter` intensity. Pop elements.
- **3DTransform**: CSS `transform: perspective rotateX/Y`. Depth.
- **Blur** / **Mosaic**: CSS `filter: blur()` / pixelate. Transition/bg.
- **LightLeakTransition**: overlay video black-bg, `mix-blend-mode: screen`, alpha fade in/out. Transition giữa scene.
- **BeatCut**: (rule, không comp) — snap clip boundary to music beat.

## 5. Assembly process (AI agent S4 — logic)
Input: VideoDoc (beats) + VO track (segmented per beat) + music + asset pool.
1. **Color-code** đã có (beat.edit_category) → resolve asset per category (retrieve image/video/screen-record/animation; gen nếu thiếu).
2. **Timeline**: VO segments định duration clip; **beat-cut** snap `end_s` về music beat.
3. **Motion assign** (retrieve theo edit_category + narrative intensity):
   - trials/normal → zoom subtle + beat_cut
   - crisis/reveal → zoom mạnh + impact + glow
   - emphasis text → TextPop
   - transition giữa scene → LightLeak
   - animation beat → Typewriter/TrimPath + Glow
4. **Text**: caption trên emphasis beat (không mỗi beat — irritate), center text + TextPop trên key moment, scene_attached nơi relevant.
5. **Overlay**: LightLeak trên scene transition; dust/electric sparingly.
6. **Focus-consistency**: set `focal_point` mỗi clip, transform về anchor cố định (rule-of-thirds intersection) qua cuts.
7. **Color grade**: preset (warm/cinematic) adjustment layer.
8. **SPACE guardrail**: giữ `pause_before` intentional (không nén mọi gap); chỉ cut awkward pauses (đã làm ở VO chop-combine).

## 6. Sound design (S5, integrate vào edit)
- **SFX per event** (retrieve by rule):
  - scene transition → `whoosh` (+ LightLeak)
  - build/approach → `riser`
  - reveal/emphasis/impact → `impact` (+ TextPop)
  - UI/screen → `click`
  - comedic beat → `meme`
- Music continuous, **duck under VO** (sidechain/lower vol khi VO).
- Combine SFX, lower volume (không annoying). = half video.
- "Mute-then-add feel" = rule-set (AI place theo event type), không phải per-frame human.

## 7. Focus-consistency rule (ràng buộc)
Giữ `focal_point` (subject chính) ở **cùng vị trí màn hình** qua cuts (favorite: rule-of-thirds intersection). Mỗi clip transform (scale+translate) để subject → anchor. Giữ mắt viewer không wander.

## 8. Color
Adjustment layer trên cả timeline: `filter: brightness() contrast() saturate()` theo preset (warm = +saturation +warm tint; cinematic = +contrast +cool shadow). Per-clip override nếu cần.

## 9. Map build
- `remotion-composer/edit/` — mới (không vox):
  - `types.ts` — EditClip, EditDoc.
  - `comps/` — TextPop, Zoom, Typewriter, TrimPath, Glow, LightLeak, VisualComp, TextComp, OverlayLayer, ColorGrade.
  - `EditVideo.tsx` — Root composition (timeline + tracks).
  - `assemble.ts` — AI assembly logic (VideoDoc → EditDoc).
- `remotion-composer/shared/` (vox primitives) → archive; edit dùng comps mới.
- Render: `npx remotion render build EditVideo renders/master.mp4`.
