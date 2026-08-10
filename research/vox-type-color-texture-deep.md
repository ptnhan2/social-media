# Vox Typography, Color & Texture — Deep Research

> Nguồn: shadcn.io Vox Design System (extract), FontsInUse, wtfont, GraphicDesign StackExchange, Storybench Sendaydiego, Easy-Peasy.AI, PremiumBeat, DEmotion, Ben Marriott halftone, BorisFX. 2026-08-02.

## 1. Font system (VIDEO ≠ website)

Website: Balto (display, trả phí), Harriet (serif body, trả phí), Roboto Mono (label).

Video (bold condensed sans-serif):
| Vai trò | Font (Google, free) | Weight | Size @1080p | Style |
|---|---|---|---|---|
| Headline/title | Archivo Black | 900 | 80-120px | ALL CAPS, tracking -20~-40 |
| Sub-headline | Oswald/Bebas | 500-700 | 48-64px | - |
| Label/eyebrow | Roboto Mono | 400-500 | 11-12px | UPPERCASE, tracking 1.1px |
| Body | Inter | 400-500 | 24-36px | - |
| Data number | Archivo Black | 900 | 100-160px | - |
| Lower third primary | bold sans | 700 | ≥36pt | - |
| Lower third secondary | regular | 400-500 | 60-75% primary | - |
| Subtitle | bold sans | 700-900 | 28-36px | white + black outline 3-4px, bottom-center, max 2 dòng ~42 chars |

## 2. Kinetic type patterns
- Stamp per-word/per-phrase, sync narration; scale 0→100% snap + blur nhẹ
- Highlight sweep vàng (trim path, Multiply)
- Staggered reveal: bg trước, text sau 3-5f; lower third mask mở từng bước jagged
- Underline vàng trái→phải; strike-through (fact-check)
- Color change mid-phrase: 1 từ đổi sang vàng
- Tight kerning + strong horizontal rhythm; tracking -0.7~-1px

## 3. Color palette (CONFIRMED từ Vox Design System extract)

| Token | Hex | Ghi chú |
|---|---|---|
| Vox Yellow | **#fff200** | accent chính, 100% saturation, không bao giờ fade |
| Ink | #131313 | body text, headlines |
| Ink Absolute | #000000 | branding only |
| Canvas | #ffffff | website; video KHÔNG pure white |
| Hairline | #e9e9e9 | 1px divider |
| Muted gray | #636363 | secondary text |
| Link blue | #6aaae4 | hiếm |

(est.) cream #F5F0E8, dark slate #171A1C, navy #1A2332

Quy tắc: muted/desaturated base (cream, navy, gray) + **1 accent loud duy nhất** (yellow) cho thứ phải nhìn ngay. 3-4 màu/frame, accent 5-10% diện tích. Johnny Harris palette: #1A2332 navy, #FF6B35 orange, #FFD700 gold, #CC0000 red (thumbnail).

## 4. Texture recipes

| Texture | Cách làm | Opacity/Blend |
|---|---|---|
| Paper grain | texture scan overlay | Overlay/Soft Light 30-70% (nền), 15-30% (subtle) |
| Halftone/newsprint | CC Ball Action → Lens Blur → Levels crush; SVG: dot grid pattern | Multiply/Overlay 15-25%; dots 4-6px grid, ball 12-24px |
| Film grain | noise overlay | Overlay 8-15% |
| Vignette | lens blur 4-8 + ellipse mask subtract | feather 300 |
| Chromatic aberration | Quick CA plugin; blur 3.5 + mask feather 50 | rìa |
| Roughen edges (mép xé) | AE Roughen Edges Border 3.3 Sharpness 4.58; SVG feDisplacementMap | - |
| Ink bleed transitions | luma matte packs | - |

### Layer stack texture (top→bottom):
```
Posterize 12fps → Light flicker (wiggle 6fps) → Blur vignette → CA → Film grain (8-15%) → Paper/halftone (15-25%) → Vignette → Content → Background (không pure white)
```

## 5. Annotation/sticker components
- "Source:"/"Fact:" label: white box, black text, Roboto Mono, góc frame, có line nối
- Yellow circle: stroke 3-4px vàng, fill vàng 15% opacity
- Callout line: thin white 2-4px, chấm tròn đầu
- Highlight marker: rect vàng kéo dài opacity 40-60% Multiply, scaleX/clip 0.5-1s
- Drop shadow cutout: distance 2-4px, blur 8-12px; 2 lớp cho 3D stack
- Lower third: rough texture bg, height 60-80px
- Typewriter caption: monospace (Courier/IBM Plex Mono), type-on
- Pill tags: 1px border, radius 100px, 11px uppercase tracking 1.1
- Washi tape ở góc; halftone dots accent fills

## 6. Icons
- Vox KHÔNG dùng icon library generic — mỗi video 1 art direction, 1 anchor motif
- Flat vector geometric, single/two-tone, grid-consistent
- Hand-drawn annotation + Turbulent Displacement

## 7. Source
- https://www.shadcn.io/design/vox (màu/type chính thức)
- https://graphicdesign.stackexchange.com/questions/147413/what-font-does-vox-use-for-their-videos
- https://fontsinuse.com/uses/6828/vox-website
- https://wtfont.app/site/vox.com
- https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/
- https://easy-peasy.ai/blog/how-to-make-vox-style-videos-with-ai
- https://medium.com/@seijiyushin/why-every-documentary-on-youtube-suddenly-looks-like-vox-6220588e60ba
- https://www.youtube.com/watch?v=XjAZ3jlfpdc (Ben Marriott halftone)
- https://motionarray.com/learn/after-effects/halftone-effect-after-effects/
- https://borisfx.com/blog/create-after-effects-halftone-plugin-2-methods/
