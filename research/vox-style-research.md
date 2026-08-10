# Vox Style / Vox Animation — Research Report

> Nguồn: tổng hợp từ Storybench (phỏng vấn Johnny Harris, Sam Ellis, Joey Sendaydiego), PremiumBeat, Easy-Peasy.AI, Cliptude, Vox Pops, VIDEOAI.ME, FlatPackFX, aescripts, fontdiff/v8eo (typography). Ngày: 2026-08-02.

## 1. Định nghĩa

Vox style = **"animated opinion essay"** (Joe Posner, Vox EP). KHÔNG phải 1 hiệu ứng — là **1 design system** với luật sáng lập:
- **No desks** (người sau bàn = cable news)
- **No talking-head backbone** (phỏng vấn không phải xương sống video)
- Chỉ làm video khi topic có **yếu tố thị giác rõ rệt** — b-roll phủ lên narration "không đủ tư cách" (Posner: *"simply slapping b-roll and stock photography on top of narration didn't cut it"*)

Nguồn gốc: Vox YouTube 2014, thương hiệu bởi Borders (Johnny Harris), Earworm (Estelle Caswell), Atlas (Sam Ellis). Hiện là genre phổ biến nhất internet (Johnny Harris, Cleo Abram...).

## 2. Anatomy — 7 trụ cột

### A. Paper collage / cutout
- Texture giấy báo (newsprint), halftone dots, giấy thủ công, mép xé — *"lack of texture makes output look flat and digital"* (Vox Pops)
- **Kỹ thuật AE tái tạo** (dịch được sang Remotion):
  - `Turbulent Displace` mép layer → mép giấy không đều
  - **2 lớp drop shadow**: ngắn-mạnh + dài-yếu → ảo giác nhiều lớp giấy 3D
  - Texture grayscale, blend Screen/Multiply
  - Film grain toàn cảnh
- **Joey Sendaydiego (art director)**: *"You don't want it to look perfect because that might make it look more like an ad than an editorial piece"*

### B. Kinetic typography
- Font: **Archivo Black, Oswald, Bebas Neue, Anton, League Gothic** — heavy condensed sans, free Google Fonts
- Công thức: **chữ TRẮNG + highlight VÀNG trên nền đen** — *"almost impossible to make unreadable"*
- Chữ **stamp vào đúng từ narrator nói** (không float mượt)

### C. Highlight sweep (signature move)
- Nét bút marker **VÀNG quét qua cụm từ/tài liệu** đúng lúc voiceover đọc
- "Vox yellow" là chuẩn đánh giá độ giống
- Kỹ thuật: yellow rect mask animate (track matte), Multiply

### D. Annotated maps (Atlas/Borders)
- Map sạch, **bỏ label** (Mapbox custom) + **GEOlayers 3** (AE) / **Google Earth Studio**
- Harris animate **5 thuộc tính**: lat, lon, zoom, bearing, pitch — offset bearing keyframes → camera "comes down and orbits"
- Callout lines + labels đúng cue; country fill accent
- Nhịp: toggle map ↔ ground footage — *"you can't do 10 minutes on a map"*

### E. Data viz — "data builds"
- Counter 0→final; bars fill; giant number stamp trên beat
- **"The animation IS the moment of revelation"**

### F. Motion "on twos" (chữ ký handmade)
- **Graphics 12fps trong timeline 24fps** (Posterize Time 12.5 @ 25fps)
- *"slightly choppy stop-motion feel is why Vox reads as handmade while corporate explainers feel synthetically smooth"*
- Remotion: quantize `Math.floor(frame/2)*2`
- Spider-Verse dùng cùng nguyên lý (nhân vật khác nhau ones/twos, offset)

### G. Camera & transitions
- Tracking transitions: 3D camera lùi + blur peak tại cut
- Dolly, parallax 2.5D giữa lớp giấy
- **Straight cuts / 200ms crossfade** — không transition cầu kỳ
- Chromatic aberration viền + Gaussian blur mask

## 3. Sound design

- **Đổi music mỗi ~20s**, duck dưới voice, **cắt animation theo beat**
- SFX khớp từng motion: "soft paper ticks" khi xếp hộp, paper rustle lật trang
- Narration register: **"calm, curious narrator"** — *"a smart friend explaining, never a news anchor"*
- Viết cho tai: "Look at this", "Here's the thing", pause để viewer nghĩ

## 4. Cấu trúc kể chuyện — "Visual evidence, then context" (Johnny Harris)

1. **Cold open visual anchor** — vật cụ thể, chưa context
2. **The question** — 1 câu hứa hẹn
3. **Context bridges ngắn** — giải thích sau, từng nhịp, chiếm thiểu số runtime
4. **Recurring anchors** — visual quay lại như nhân vật
5. **The zoom-out** — kết mở rộng ý lớn

**Luật per scene**: 1 narration line ≤20 từ + 1 visual idea. **Giữ 1 ảnh 5-6 giây** — chậm là đúng.

## 5. Editing rhythm

- Hook 2-3s: tension, không logo/chào
- Climax ~70% duration
- Mỗi video 1 art direction riêng, 1 motif anchor (vd: flying text cho video AI — Sendaydiego)

## 6. Bài học cho OpenMontage pipeline

1. **Lock 1 style frame** (palette 2-3 màu + type + texture) → mọi scene thừa hưởng
2. **1 màu accent duy nhất** (Vox yellow #FFD400) trên nền tối
3. **Stills trước, motion sau** — approve board trước khi animate
4. **On-twos cho mọi motion** — thứ tách Vox khỏi slideshow
5. **Highlight sweep + paper texture + drop shadows** = 3 kỹ thuật editorial cốt lõi
6. **Music đổi mỗi 20s** + SFX khớp từng beat

## 7. Triển khai Remotion cho "AI Can't Write Subtext"

| Thành phần Vox | Triển khai Remotion |
|---|---|
| Paper texture | SVG noise/fibers overlay + drop shadow 2 lớp |
| On-twos | `Math.floor(frame/2)*2` quantize |
| Highlight sweep | SVG rect vàng animate width + mask |
| Kinetic type | Archivo Black (Google Fonts) stamp spring |
| Vox yellow | #FFD400 accent duy nhất trên slate tối |
| Visual anchor | Iceberg giấy quay lại (ch1 → ch5 → ch7 zoom-out) |
| Data builds | Counter + bars "on twos" + soft tick SFX |
| Cut rhythm | Cut thẳng, giữ ảnh 4-6s, music đổi ~20s |
