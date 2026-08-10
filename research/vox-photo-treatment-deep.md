# Vox Photo Treatment — Deep Research

> Nguồn: PremiumBeat (replicating-vox-motion-graphic), Easy-Peasy.AI Vox guide, shaam.blog, DEmotion, EZEdit, YouTube "How To Edit VOX Style like a PRO" (5eVyoHFzBEY), Storybench Borders, viewinder archival. 2026-08-02.

## 1. Kết luận cốt lõi

**Vox KHÔNG dùng viền trắng kiểu Polaroid/stroke đơn thuần.** Ảnh được xử lý như **paper cutout** — cắt từ giấy thủ công, mép xé, drop shadow, đặt trên nền texture. Sendaydiego: *"You don't want it to look perfect because that might make it look more like an ad than an editorial piece."*

## 2. Recipe ảnh (AE → Remotion)

| Bước | Kỹ thuật | Value |
|---|---|---|
| 1 | Desaturate/Tint | Tint swap colors, intensity 30-50%, tông vintage |
| 2 | Roughen Edges | Border ≈3.3, Edge Sharpness ≈4.58 |
| 3 | White sticker border | 3-6px (giống decal) |
| 4 | Drop shadow | soft, opacity ~30-50%, distance 4-8px, blur 10-15px; hoặc 2 lớp (ngắn-mạnh + dài-yếu) |
| 5 | Halftone overlay | Multiply 15-25% |
| 6 | Boil/wiggle | posterizeTime(6); wiggle(1,100) |

## 3. Texture overlay stack (đè toàn bộ frame)

| Lớp | Blend | Opacity |
|---|---|---|
| Paper grain | Overlay/Soft Light | 30-70% |
| Halftone | Multiply/Overlay | 15-25% |
| Film grain | Screen/Overlay | 8-15% |
| Light leaks | Screen | thấp |
| Chromatic aberration | rìa | Gaussian Blur 3.5 + mask feather 50 |
| Vignette | - | Camera Lens Blur 4-8 + ellipse mask subtract + feather 300 |

> "No pure white backgrounds, ever... Editors call this 'breaking the digital feel'."

## 4. Animation trên ảnh
- Slow push-in: 100→105-110% trong 2-5s, EasyEase
- Scale reveal: 0→100% ~2s (unlink X/Y)
- Slide-in: 30-50px offset
- 2.5D parallax: foreground 1.5x, background 0.5x tốc độ midground
- Giữ 1 ảnh 5-6s — "slow is correct"
- Motion background: 5-6 textures xoay vòng 2-3/s khi ảnh giữ lâu

## 5. Screenshot/document
- Chromatic aberration rìa + blur viền = lens characteristics
- Nền gỗ/bàn/giấy bên dưới
- Highlight sweep vàng quét headline

## 6. AE values đã verify
- Roughen Edges: Border 3.3, Sharpness 4.58
- Posterize graphics: 12fps; flicker: 6fps
- Flicker expr: `posterizeTime(6); wiggle(1,100)`
- Vignette feather 300, expansion -100
- CA: Quick Chromatic Aberration (free) + Gaussian Blur 3.5

## 7. Source
- https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/
- https://easy-peasy.ai/blog/how-to-make-vox-style-videos-with-ai
- https://shaam.blog/articles/ai-documentary-animation-workflow-2026
- https://trydemotion.com/blog/motion-graphics-like-vox
- https://ezedit.in/how-to-create-vox-style-explainers-videos-a-breakdown-in-after-effects-amp-photoshop/
- https://www.youtube.com/watch?v=5eVyoHFzBEY
- https://www.youtube.com/watch?v=F7A503llNBA
- https://viewinder.com/archive-footage/
- https://paper-animation.com/ (tool)
