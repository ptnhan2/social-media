# Vox Motion System — Deep Research

> Nguồn: Storybench (Sendaydiego), PremiumBeat, Easy-Peasy.AI, HyperFrames motion vocabulary, Animata, Devcrea, Medium hand-crafted look, OlafMotion, Escape Studios (Spider-Verse on-twos), FinalLayer (Ken Burns), aescripts, AugmentClaude Vox Director, Skillshare stop-motion collage. 2026-08-02.

## 1. Enter/exit recipes

### Text stamps
| Param | Value |
|---|---|
| Duration per word | 8-12f (~330-500ms) |
| Stagger | 2-4f (~80-165ms) |
| Easing | cubic-bezier(0.2,0.8,0.2,1) ease-out mạnh |
| Scale | 0.85→1.0 (+overshoot 1.08) |
| Position | translateY 6-8px→0 |
| Overshoot | 6-10f, amplitude 5-10% (text) / 15-25% (element lớn) |
| Exit | reverse × 60% duration; KHÔNG fade khi narration đang nói |

### Photos
| Param | Value |
|---|---|
| Duration | 15-20f (~625-830ms) |
| Easing | ease-out (fast start, slow settle) |
| Scale | 0.9→1.0 |
| Offset | 30-50px từ hướng slide |
| Rotation jitter | ±1-3° |
| Drop shadow | xuất hiện cùng lúc, opacity 30-50%, distance 4-8px |

### Cards/shapes
- Scale X 0→1 (~48f/2s), EasyEase bell curve; text trong box delay 2-4f

### Arrows/callout lines
| Param | Value |
|---|---|
| Trim Paths | 0→100% |
| Duration | 15-24f (~625ms-1s) |
| Easing | bell curve, peak giữa |
| Roughen Edges | Amount 10-20, Size 4-6, Complexity 4 |

## 2. Ken Burns (camera trên ảnh tĩnh)
- Zoom ratio: 1:1.2 → 1:1.5 max; typical 100→110-120% trong 5-10s
- Establishing: 10-15s, rất chậm; detail: 5-7s; energetic: 3-5s
- Ảnh nên ≥2x output resolution
- Parallax 2.5D: foreground 1.5x / mid 1x / bg 0.5x, rotation nhẹ 1-3°

## 3. On-twos (12fps) — quy tắc
**ÁP DỤNG**: text stamps, photo cutouts (khi slide/scale), icons, shapes, background texture
**KHÔNG ÁP DỤNG**: camera moves, Ken Burns pan, transitions/blur (cần smooth)
- Spider-Verse nguyên lý: characters on-twos, camera on-ones
- KHÔNG dùng motion blur cho graphics

## 4. Highlight sweep
| Param | Value |
|---|---|
| Duration | 15-30f (~625ms-1.25s) |
| Color | #fff200, blend Multiply |
| Stroke width | 40-60px (theo font) |
| Line cap | Round |
| Easing | bell curve |
| Texture | Roughen Edges Amount 10-30, Size 2-4, Complexity 4-10 |
| Shape | hơi cong nhẹ (bezier) |

## 5. Hand-drawn arrows
- Trim path draw-on 20-30f (~830ms-1.25s)
- Stroke 6-10px, trắng/accent
- Wobble: `wiggle(2,30)` + posterizeTime(8)
- Outline vẽ trước, arrow head sau

## 6. Callout annotation
- Circle: 15-20f; line: 10-15f; text: sau 4-6f stagger
- Circle 3-4px stroke vàng, fill vàng opacity 15%
- Dashed/solid, 3-6px, opacity 80-100%

## 7. Transitions
| Loại | Khi nào |
|---|---|
| Hard cut | MẶC ĐỊNH ~80%+ |
| 3D cam track-back + blur | sequence phức tạp; cam 12-20f, blur 5-8f (0→peak→0), peak blur 15-25px tại edit point |
| Match cut | text-to-text, cắt tại đỉnh motion curve |
| Crossfade | ≤200ms, hiếm |

## 8. Imperfection stack
| Effect | Value |
|---|---|
| Boil (Turbulent Displace) | Amount 10-30, Size 2-20, Complexity 4-10, `posterizeTime(8); time*1000` |
| Rotation wobble | ±1-3°, wiggle(1.5,2) |
| Position jitter | ±2-5px, wiggle(2,30)+posterizeTime(6-8) |
| Color boiling | Turbulent Noise Hue 15% + Saturation 50% |
| Light flicker | posterizeTime(6); wiggle(1,100) opacity |
| Film grain | Overlay 5-15% |

## 9. Timing sync với narration
- Text xuất hiện đúng lúc từ được nói (~10ms precision qua forced alignment)
- Stagger per word: documentary 150ms / conversational 80ms / energetic 50ms
- Hold per phrase: 600/400/300ms
- 1 line ≤20 từ; 1 visual idea/scene 5-6s; không shot >7s
- Marker-based sync trong AE; music đổi ~20s, duck dưới voice

## 10. Remotion spring configs
```ts
// Text pop-in
spring({frame, fps:24, config:{damping:12, mass:0.8, stiffness:180}});
// Overshoot (element lớn)
spring({frame, fps:24, config:{damping:8, mass:0.6, stiffness:200}});
// Inertial bounce: amp 0.04-0.1, freq 1.5-3, decay 3-6
```

## 11. Source
- https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/
- https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/
- https://easy-peasy.ai/blog/how-to-make-vox-style-videos-with-ai
- https://github.com/heygen-com/hyperframes/blob/main/skills/embedded-captions/references/motion-vocabulary.md
- https://animata.design/docs/text/kinetic-center-build
- https://www.devcrea.com/create-highlight-effect-after-effects
- https://medium.com/the-inspired-animator/how-to-apply-a-hand-crafted-look-to-your-animations-in-after-effects-2da1c5dbd282
- https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- https://escapestudiosanimation.blogspot.com/2020/08/how-to-render-animation-on-twos.html
- https://finallayer.com/blog/what-is-the-ken-burns-effect
- https://www.youtube.com/watch?v=ZaFQyP3H9tk
- https://www.youtube.com/watch?v=5iMo97AKz6Q
