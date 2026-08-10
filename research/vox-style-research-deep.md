# Vox Style — Deep Research (Phase 2: Execution Spec)

> Phase 2 research — bổ sung Phase 1 (`vox-style-research.md`) bằng chi tiết THỰC THI (values, kỹ thuật, recipes).
> Nguồn: 5 research tracks song song (photo treatment / layout / motion / asset sourcing / type-color-texture), 50+ nguồn, 2026-08-02.
> File kèm: `vox-layout-composition-deep.md` (layout chi tiết), `vox-asset-sourcing-deep.md` (asset), `vox-motion-deep.md` (motion), `vox-photo-treatment-deep.md` (photo), `vox-type-color-texture-deep.md` (typography).

## 0. Những sai lầm cốt lõi của sample cũ (vì sao video "rất tệ")

| # | Lỗi sample cũ | Chuẩn Vox thực | Fix |
|---|---|---|---|
| 1 | Ảnh "sạch bóng", sống động, trông như stock/ads | Ảnh PHẢI có texture: desaturate/tint vintage, film grain, halftone, vignette | Layer treatment chuẩn lên mọi ảnh |
| 2 | Không có viền trắng kiểu sticker 3-6px + drop shadow | "Visible white borders (3–6px sticker edge) and soft drop shadows" — ảnh như vật thể giấy dán lên board | StickerBorder component |
| 3 | Chữ không đồng nhất, không có hệ thống | Font system: Archivo Black (headline) + Roboto Mono (label) + Inter (body); ALL CAPS, tracking âm | Type tokens |
| 4 | Màu dùng lung tung (đủ thứ accent) | 3-4 màu/frame; 1 accent (Vox yellow) chiếm ~5-10% frame; mọi thứ khác desaturated | Palette lockdown |
| 5 | Motion chưa đồng bộ narration, chữ xuất hiện không đúng từ được đọc | Text stamp đúng lúc narrator nói từ đó; per-word stagger | Marker-based timing |
| 6 | Vàng sai tông (#FFD400) | Vox yellow chính thức #fff200 (shadcn Vox DS extract); #FFD400 không chính thức | Sửa #fff200 |
| 7 | Thiếu "imperfect layer": jitter, boil, flicker, chromatic aberration | posterizeTime(6-8) wiggle, flicker opacity, CA rìa, vignette | Imperfection stack |
| 8 | Ảnh có thể quá nét/AI-look | Ảnh editorial, photojournalism, có grain, negative space | Selection checklist |

---

## 1. Photo Treatment — "viền trắng" & xử lý ảnh (THỰC CHẤT là paper cutout, KHÔNG phải viền vẽ sẵn)

### 1.1 Paper Cutout là gốc
Sendaydiego (art director Vox) xây visual từ **construction paper thật** — cắt, xếp lớp, chụp lại. "You don't want it to look perfect because that might make it look more like an ad than an editorial piece."

### 1.2 Recipe đầy đủ cho 1 ảnh (AE values → Remotion)

```
[Ảnh gốc]
├── 1. Desaturate/Tint → tông vintage (Tint swap colors + intensity 30-50%)
├── 2. Roughen Edges (mép xé): Border ≈3.3, Edge Sharpness ≈4.58
├── 3. White sticker border: 3-6px (viền trắng như decal)
├── 4. Drop shadow: soft, opacity ~30-50%, distance 4-8px, blur 10-15px
│      (hoặc 2 lớp: ngắn-mạnh + dài-yếu = giấy 3D)
└── 5. Halftone dots overlay (Multiply, 15-25%) cho archival look
```

- **Không có** "3px stroke đơn thuần" — viền trắng nằm TRÊN ảnh đã xử lý như sticker edge.
- **2.5D parallax**: các layer ảnh ở Z-depth khác nhau, camera push-in chậm; foreground di chuyển 1.5x, background 0.5x so với midground.

### 1.3 Texture overlay stack (đè lên MỌI THỨ, "breaking the digital feel")

| Lớp | Blend | Opacity | Ghi chú |
|---|---|---|---|
| Paper grain | Overlay/Soft Light | 30-70% | Nền giấy không bao giờ pure white |
| Halftone dots | Multiply/Overlay | 15-25% | Grid ~4-6px, ball 12-24px |
| Film grain | Overlay | 8-15% | Toàn video (global) |
| Vignette | - | soft | Lens blur 4-8 + ellipse mask subtract, feather ~300 |
| Chromatic aberration | - | rìa frame | Gaussian blur 3.5 + mask, feather ~50 |
| Light flicker | opacity | posterizeTime(6) wiggle(1,100) | Projector feel |

### 1.4 Ảnh đứng trên màn hình
- Giữ 1 ảnh **5-6 giây**, để narration làm việc — "slow is correct"
- Ken Burns: zoom 100% → **105-110%** trong 5-10s, EasyEase; ảnh nên ≥2x output res
- Motion background khi ảnh giữ lâu: xoay 5-6 textures, 2-3 texture/giây

---

## 2. Layout / Composition (chi tiết: `vox-layout-composition-deep.md`)

### 2.1 Frame anatomy 16:9 (1920x1080)
```
┌──────────────────────────────────────────┐
│ Top title strip (~5-8% top, ~54-86px)     │ headline bold condensed
├──────────────────────────────────────────┤
│ Center media (~60-70%)                    │ photo cutout / map / chart / doc
├──────────────────────────────────────────┤
│ Annotation zone (~10-15%)                 │ arrows, callout lines, labels
├──────────────────────────────────────────┤
│ Bottom caption (~4% bottom ≈43px)         │ subtitle: white fill + black outline 3-4px,
│  max 2 dòng, ~42 chars/dòng, sentence-case│ max 2 lines
└──────────────────────────────────────────┘
```

### 2.2 Nguyên tắc
- **"If a frame could be a movie still, it's wrong. If it could be a magazine spread, it's right."**
- Layer stack 3-5 lớp: Background texture → Main visual (cutout) → Annotation/accent (1-2 shapes, asymmetric) → Typography → Subtitle
- **Text wins over image**: con số narrator nói phải xuất hiện TO; ảnh desaturate khi text lên
- 3-4 màu/frame, accent 5-10% diện tích
- Title-safe 10% (1536x864), action-safe 5% (1728x972)
- Pattern: Photo cutout + center title | Split frame map/info | Full-frame typography | Document + highlight | Data chart sync | Split comparison

### 2.3 Typography system (xem `vox-type-color-texture-deep.md`)

| Vai trò | Font | Weight | Size @1080p | Style |
|---|---|---|---|---|
| Headline | Archivo Black | 900 | 80-120px | ALL CAPS, tracking -20~-40 |
| Sub-headline | Inter/Helvetica | 700 | 48-64px | - |
| Label/eyebrow | Roboto Mono | 400-500 | 11-12px | UPPERCASE, tracking 1.1px |
| Body | Inter | 400-500 | 24-36px | - |
| Data number | Archivo Black | 900 | 100-160px | - |
| Subtitle | bold sans | 700-900 | 28-36px | white + black outline 3-4px |

### 2.4 Color palette (Vox Design System extract — shadcn.io/design/vox)

| Token | Hex | Dùng |
|---|---|---|
| **Vox Yellow (accent chính)** | **#fff200** | highlight sweep, chart bar cao nhất, annotation — CHỈ 5-10% frame |
| Ink | #131313 | text trên nền sáng |
| Ink Absolute | #000000 | chỉ branding |
| Canvas | #ffffff | website; VIDEO KHÔNG dùng pure white — luôn texture |
| Hairline | #e9e9e9 | divider 1px |
| Muted gray | #636363 | secondary text |
| Cream/paper bg | #F5F0E8 (est.) | paper background |
| Dark slate bg | #171A1C (est.) | nền tối |
| Link blue (rare) | #6aaae4 | chỉ 1 lần website |

---

## 3. Motion System (chi tiết: `vox-motion-deep.md`)

### 3.1 Keyframe durations @24fps

| Action | Frames | Giây |
|---|---|---|
| Text stamp (1 từ) | 6-8f | ~0.3s |
| Word stagger | 2-4f | ~80-165ms |
| Highlight sweep | 12-16f | ~0.6s |
| Lower third reveal | 20-24f | ~0.9s |
| Photo slide-in | 15-20f | ~625-830ms |
| Arrow draw (trim path) | 15-24f | ~625ms-1s |
| Map zoom | 48-72f | 2-3s |
| Hold on still | 120-144f | 5-6s |
| Transition (blur+cam pull) | 16-20f | ~0.7s |

### 3.2 Enter/exit recipes
- **Text**: scale 0.85→1.0 pop + translateY 6-8px→0, easing ease-out, overshoot nhẹ 1.0→1.08→1.0 (6-10f); exit = reverse với 60% duration, KHÔNG fade khi narration đang nói
- **Photo**: slide-in từ cạnh + drop shadow cùng lúc, scale 0.9→1.0, rotation jitter ±1-3°
- **Card/box**: scale X 0→1 (~2s), text trong box delay 2-4f
- **Arrow/line**: trim path 0→100%, bell curve (peak giữa), Roughen Edges (Amount 10-20, Size 4-6) cho wobble

### 3.3 On-twos (12fps) — quy tắc ÁP DỤNG
- **Áp dụng**: text stamps, photo cutouts (khi slide/scale), icons, background texture
- **KHÔNG áp dụng**: camera moves, Ken Burns pan, transitions (blur) — cần smooth
- **KHÔNG dùng motion blur** cho graphic elements

### 3.4 Highlight sweep (signature)
- 12-16f, Vox yellow #fff200, Multiply blend, stroke 40-60px (theo font size), Round cap
- Hơi cong nhẹ (bezier), Roughen Edges (Amount 10-30, Size 2-4) cho ink bleed
- Sweep đúng lúc narrator đọc phrase

### 3.5 Imperfection stack
| Effect | Value |
|---|---|
| Jitter position | wiggle(2, 30) + posterizeTime(8) |
| Rotation wobble | ±1-3° |
| Boil (Turbulent Displace) | Amount 10-30, Size 2-20, posterizeTime(8) time*1000 |
| Flicker | posterizeTime(6) wiggle(1,100) opacity |
| Color boiling | Turbulent Noise Hue 15% + Saturation 50% |

### 3.6 Timing sync với narration
- Text xuất hiện ĐÚNG lúc từ được nói (forced alignment ~10ms precision)
- Stagger per word: documentary 150ms, conversational 80ms, energetic 50ms
- Hold per phrase: 600ms/400ms/300ms
- 1 narration line ≤20 từ; mỗi scene = 1 visual idea 5-6s; không shot nào >7s

---

## 4. Asset Sourcing (chi tiết: `vox-asset-sourcing-deep.md`)

### 4.1 Pipeline ưu tiên (như Vox làm)
1. **Visual anchor** — xác định 1 vật/ý duy nhất cho mỗi scene (1 idea = 1 scene)
2. Nguồn theo thứ tự: tự quay → archival miễn phí → map (Google Earth Studio) → stock → animation tự làm → screenshot/document

### 4.2 Archival miễn phí (dùng được cho commercial)
| Nguồn | Dùng cho |
|---|---|
| Internet Archive / Prelinger | educational films, newsreels, công nghiệp 1927-1970s |
| Library of Congress | ảnh/phim lịch sử Mỹ |
| NARA (catalog.archives.gov) | phim chính phủ |
| NASA Images | không gian, khoa học |
| Wikimedia Commons | ảnh lịch sử, bản đồ cũ, chân dung |
| Public Domain Review | nghệ thuật, tranh cổ |
| A/V Geeks (archive.org) | 25,000+ phim government/education |
| Pexels/Pixabay | b-roll đương đại (free, commercial OK) |

⚠️ **Cạm bẫy license**: Getty Editorial / AP Archive / Reuters = editorial only, KHÔNG dùng cho video monetized (DMCA risk). Shutterstock Standard giới hạn 500K views.

### 4.3 Checklist chọn ảnh "đạt Vox feel"
- [ ] KHÔNG stocky: không nụ cười giả, không handshake, không diversity-checklist casting
- [ ] Editorial, photojournalism, có câu chuyện
- [ ] Không oversaturated; ấm/trầm hoặc B&W
- [ ] Có grain/texture sẵn (nếu sạch → thêm ở hậu kỳ)
- [ ] Negative space cho text overlay (1/3-1/2 khung hình)
- [ ] Era đúng thời kỳ (không lẫn yếu tố hiện đại)
- [ ] Nghiêm túc, không meme
- [ ] TRÁNH AI-look: da plastic, ánh sáng không nhất quán, tỷ lệ sai, quá sạch, DOF nhân tạo, oversaturated

---

## 5. Remotion Implementation Spec (tổng hợp)

### 5.1 Global constants
```ts
const VOX = {
  yellow: '#fff200',      // CONFIRMED (Vox DS)
  ink: '#131313',         // CONFIRMED
  cream: '#F5F0E8',       // paper bg (est.)
  slate: '#171A1C',       // dark bg (est.)
  hairline: '#e9e9e9',
  mutedGray: '#636363',
  white: '#F6F6F6',       // never pure #FFF
};
const SAFE = { titleSafe: {x:192,y:108,w:1536,h:864}, actionSafe: {x:96,y:54,w:1728,h:972}, subtitleBottom: 43 };
```

### 5.2 Motion helpers
```ts
const onTwos = (f:number) => Math.floor(f/2)*2;                 // 12fps graphics
const stamp = (f:number, start:number) => spring({frame:f-start, fps:24,
  config:{damping:12, mass:0.8, stiffness:180}});               // text pop
const overshoot = spring({frame, fps:24, config:{damping:8, mass:0.6, stiffness:200}});
const drawOn = (f:number, start:number, dur:number) => easeInOut(min(max((f-start)/dur,0),1)); // trim path
const kenBurns = (f:number, start:number, dur:number) => 1 + 0.1*easeInOut(...); // 100→110%
const jitter = (seed:number, amount:number) => (noise2D(seed, Math.floor(frame/2))-0.5)*2*amount;
```

### 5.3 Scene layer template (stack bottom→top)
```
1. PaperBackground (cream + SVG noise/fibers + vignette)
2. MainVisual: PhotoCutout (desaturate → roughen edges → 4px white sticker border → 2-layer drop shadow)
   | flat accent shapes (1-2, asymmetric)
3. Annotation: callout lines (thin white, draw-on), yellow circle 3-4px, arrows
4. Typography: Archivo Black headline (stamp on-twos), Roboto Mono labels (11px, upper, 1.1px)
5. Subtitle: white + black outline 3-4px, bottom-center 43px
6. Overlay stack: halftone (15-25%) → paper grain (30-70%?) → film grain (8-15%) → vignette → CA rìa → flicker
```

### 5.4 Anchor motif rule
Mỗi video 1 motif anchor duy nhất (Sendaydiego: "find something unique and hold on to it as my anchor") — cho video subtext: **chat card / paper chat window** làm anchor lặp lại mọi chapter, như iceberg trong ch1 → ch5 → ch7 (Phase 1 plan).

---

## 6. Source URL chính (đầy đủ trong các file con)
- Vox DS extract: https://www.shadcn.io/design/vox
- PremiumBeat 5 breakdowns: https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/
- Easy-Peasy Vox guide: https://easy-peasy.ai/blog/how-to-make-vox-style-videos-with-ai
- Storybench (Sendaydiego): https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/
- Storybench (Borders/Harris): https://www.storybench.org/behind-the-scenes-of-the-vox-web-series-borders/
- Medium 50 Vox videos: https://medium.com/@seijiyushin/i-watched-50-vox-videos-back-to-back-here-is-what-they-all-share-88a42e293459
- Vox style guide (community): https://github.com/CK42BB/vox-explainer-skill/blob/main/references/vox-style-guide.md
- AE tutorial (values): https://www.youtube.com/watch?v=5eVyoHFzBEY
