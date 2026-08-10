# Reference Study — 3 Vox-style Production Workflows vs. Our Pipeline

> Date: 2026-08-03. Sources: YouTube transcripts (yt-dlp) của 3 video:
> 1. **How To Create Vox-Style AI Motion Graphics (Full Workflow)** — `Jkt4aTOpqpM` (tool: Open Art Director)
> 2. **How to Edit Like Vox in CapCut - Full Tutorial** — `AUZTKkIZb9Q` (tool: CapCut)
> 3. **I Made a Vox-Style Explainer Video With One Prompt (Claude)** — `0-kbZa8Dagg` (tool: Claude Code + Higgsfield MCP)
>
> Mục đích: đối chiếu với pipeline hiện tại (`docs/vox-pipeline/playbook.md` + `voxKit.tsx`/`VoxScenes.tsx`),
> chẩn đoán lý do video của ta "phèn, kém sinh động", và rút bài học cải thiện quy trình.
> Lưu ý: mô hình không đọc được ảnh — chẩn đoán dựa trên phân tích code (số liệu cụ thể), không phải xem mắt.

---

## 1. Tinh túy từng video

### Video 1 — Open Art Director (full AI workflow)
- **Deconstruct vox look trước khi build**: single narrator → animated maps/arrows → big bold captions "punch onto the screen" → **camera pushes in khi có chi tiết đáng chú ý** → single fact-checked topic.
- **Script là người chở video, KHÔNG phải graphics**: script builder với format + surprising angle + verified facts + "don't invent a single number beyond them". Cấu trúc hook → buildup → payoff.
- **Lock style trước khi generate full**: tạo boards, chọn frame chuẩn, approve → style giữ nhất quán mọi scene. Style bằng tiếng Anh thường: "modern collage, real cutout photos, bold flat color, grayscale subjects against coral and navy and cream".
- **Audio trước, "build the bass first"**: audition 10 voices (5M/5F) → chọn; audition 10 tracks → chọn. Voice + music set mood trước khi visuals.
- **Narrated slideshow = "cohesive but boring"** → chính là trạng thái hiện tại của ta. Bước kế: thêm motion graphics **tối giản, đúng timing với voice**: "simple motions per board that are perfectly timed to the voice... the last thing we want is graphics that distract".
- **Fix có chủ đích**: @-mention 1 asset → regenerate chỉ asset đó; xin 3-5 variations rồi chọn; **text glitch → lock captions static, chỉ animate objects**; board hỏng dai dẳng → **redesign chính element đó** (map lỗi → đổi thành "guy thinking over a chessboard", sạch hơn).
- **Caption punch đúng beat narrator**: "bold caption punches onto the screen right as the narrator hits the beat".

### Video 2 — CapCut (kỹ thuật edit)
- **Layered textures trên footage**: scan lines (blend mode overlay) + chromatic aberration (less is more) + vignette (dẫn mắt).
- **Text hoà vào giấy**: twist animation (chữ cong như viết tay) → compound + freeze frame → blend mode → noise/particles 70% → retro cartoon texture. Text KHÔNG đứng lì như text web.
- **12fps look**: FPS lag effect — "animations feel handmade/editorial, closer to old-school frame by frame motion graphics". Deliberate, not random.
- **Music "mima"** (minimal): không đấu voice, gợi "information value".
- **Foley/tactile sound design**: sound đời thực — typing, clicking, camera shutter, highlighting, chalk drag, paper movement, pencil scratch — **đặt ở BẤT KỲ ĐÂU có movement/animation/motion graphics**.
- **Motion signature: long, slow, smooth** với **rebound-out curve** (fast-in, slow-out) — áp cho highlight, text slides, picture zooms.
- **Match cutting**: zoom in/out qua transition giữa 2 object, curve rơi đúng marker cut.
- **Cut on motion**: cắt GIỮA lúc motion đang chạy → cut vô hình.

### Video 3 — Claude + Higgsfield (1 prompt)
- **Research là step 1 trong prompt**: "Search the web for the real facts. Cross-check every number against at least two independent sources. List your sources at the end. If disputed, use the conservative figure." — fact-discipline nằm trong chính prompt generation.
- **Format chuẩn**: 60s = 6 blocks × 10s. Topic locked → angle ("Why AI is showing up on your electricity bill" / angle: "data centers added 23B to US power bills") → format → generate.
- **Skill file = workflow tái sử dụng** (SKILL.md) — tương đương playbook của ta, nhưng chạy được end-to-end.
- **Kết quả nhìn thấy được**: "zoom in effect, going through different images and videos and assets, the voiceover, everything is in sync" — **continuous zoom + mix image/video + sync voice**.
- Voice: chọn AI voice hoặc clone giọng mình; music tùy chọn (nhiều người không thích AI music).

---

## 2. Đối chiếu với pipeline của ta (bằng chứng code)

Video hiện tại: `voxfull_master_1080p.mp4` — 308s, 35 scenes, fps=30. Code: `VoxScenes.tsx`, `voxKit.tsx`.

| # | Kỹ thuật tham chiếu | Pipeline của ta | Gap |
|---|---|---|---|
| 1 | **Continuous camera push-in/zoom** (cả 3 video, video 3: "zoom in effect" xuyên suốt) | Entrance-only motion: toàn video 308s chỉ có **1 chỗ zoom** (IcebergView, 2.2s); 15/16 photo scenes chỉ `slideL`/`slideR` 0.5s rồi **đứng im 7-9s** | **LỚN NHẤT** — nguồn chính của "kém sinh động" |
| 2 | **Match cut / cut on motion** (video 2) | Hard cut giữa các frame tĩnh, không transition | Lớn |
| 3 | **Rebound-out curve: fast-in slow-out** (video 2: "the trick") | `easeOut` đồng nhất mọi nơi — mọi chuyển động cùng một nhịp giảm tốc | Trung bình–lớn |
| 4 | **Motion đúng beat narrator, caption punch** (video 1) | Items xuất hiện đúng sentence start (timeline-sync ✅) nhưng chỉ fade 6 frame, không có punch scale; item-level motion chỉ `slideL`/`slideR` (15 chỗ, không dùng 10 type còn lại của Animated) | Trung bình |
| 5 | **Layered textures: scanlines/aberration/vignette** (video 2) | `ImperfectionOverlay` (grain + flicker + CA edge) có áp toàn cục ✅ nhưng chỉ 1 lớp mỏng; không vignette depth, không scanline | Trung bình |
| 6 | **Text hoà vào giấy: twist/noise/blend** (video 2) | Text = font web sắc nét + chip nền cream borderRadius 3 — "giấy có chữ dán" chứ không "chữ viết tay trên giấy" | Trung bình |
| 7 | **12fps editorial look** (video 2) | `onTwos()` áp cho TornFrame/PhotoCard (graphics) ✅ nhưng item text/karaoke/photos chạy 30fps liên tục | Nhỏ–trung bình |
| 8 | **Foley ở mọi chỗ có movement** (video 2) | 23 SFX/308s ≈ 1/13s, tập trung cụm đầu (9.6-14s) và 78-95.6s; **gap dài 16-48s không âm thanh** ở các đoạn motion graphics | Trung bình |
| 9 | **Audition voice/music 10 options** (video 1) | 1 voice, 1 track (đã chọn theo mô tả, không nghe so sánh nhiều) | Trung bình |
| 10 | **Fix 1 asset có chủ đích, 3-5 variations** (video 1) | Sửa = edit data + re-render cả video; không có cơ chế variation | Trung bình (chi phí iteration) |
| 11 | **Style lock trước khi build** (video 1, 3) | Playbook + gate đã lock style ✅ | OK |
| 12 | **Script: hook→buildup→payoff + facts-only** (video 1, 3) | Phase 0-1 đã có ✅ (framework + fact-check + stance) | OK |

## 3. Chẩn đoán "phèn và xấu, kém sinh động" — gốc rễ

1. **Video của ta đang dừng ở tầng "narrated slideshow"** — đúng cái mà video 1 gọi là "cohesive but boring". Ta có paper collage, cutout, karaoke (tầng 1-2) nhưng **thiếu tầng motion layer** (tầng 3 của họ): camera push, long slow zoom, match cut. Sau 0.5-1s entrance, màn hình đứng im 7-9s → mắt người xem chết.
2. **Motion vocabulary nghèo + đồng nhất**: 12 motion types trong Animated nhưng scene chỉ dùng 2 (slideL/slideR). Không có push-in, không có long zoom, không có stagger mạnh. → Cảm giác "template".
3. **Không có "camera language"**: không zoom vào chi tiết lúc narrator nhấn, không cut-on-motion → không có nhịp điện ảnh; giống PowerPoint có texture giấy.
4. **Text đứng lì trên chip**: không được xử lý như "chữ viết tay trên giấy" (twist/noise/blend của video 2) → phần chữ trông "sản xuất hàng loạt".
5. **Foley thưa và không gắn sự kiện**: SFX không đánh dấu từng item xuất hiện/motion → lớp âm thanh không "chạm" vào mắt.
6. **Ease đồng nhất**: thiếu rebound-out (fast-in slow-out) — signature motion của Vox — nên mọi entrance đều "trôi trôi", không có cú "punch".

**Điểm đang làm tốt (không phá bỏ)**: karaoke subtitle, cutout theo chủ thể, torn paper + washi, on-twos trên graphics, timeline-sync, style lock qua gate, license gate, asset density.

## 4. Bài học cải thiện quy trình (đề xuất, chờ user approve trước khi sửa engine/rules)

### P0 — Thêm "motion layer" (sửa engine, tác động lớn nhất)
- **Camera push-in/zoom cho photo scenes**: thêm motion `pushIn`/`slowZoom` (scale 1.0 → 1.12-1.18 xuyên cả scene 8-10s, ease linear/chậm) — mặc định cho photo/collage, thay slide-only. Đây là kỹ thuật xuất hiện ở cả 3 video tham chiếu.
- **Match cut**: khi scene sau nối scene trước (cùng chủ đề ảnh hoặc chuyển ý), zoom-out/xoay nhẹ qua cut; tối thiểu: bỏ "dead hold" cuối scene, để motion chạy qua điểm cut.
- **Caption punch**: item quan trọng (size ≥ 100) vào với spring overshoot scale 1.0→1.08→1.0 tại đúng beat narrator (punch 8-10 frame), không chỉ fade.
- **Rebound-out curve**: thêm ease `fastInSlowOut` (customEase: nhanh đầu 0.2, chậm dần cuối) cho entrances chính — thay easeOut đồng nhất.

### P1 — Tăng chiều sâu hình ảnh + âm thanh
- **Vignette + subtle scanline/texture layer** lên toàn frame (ngoài ImperfectionOverlay hiện có).
- **Foley gắn sự kiện**: quy tắc gate — mỗi scene có item/motion mới cần ≥1 SFX timing tại item entrance (thay vì cụm đầu video); target ~45-55 SFX cho video 5+ phút.
- **Text treatment**: label nhỏ chuyển sang cảm giác viết tay (nghiêng nhẹ, không chip nền đồng nhất — dùng textShadow nhẹ + độ rung sin như hiện tại nhưng tăng, hoặc texture noise qua SVG filter) — giữ hero text sắc nét.

### P2 — Quy trình / iteration
- **Audition nhỏ cho voice/music**: mỗi video chọn 3-5 giọng/3-5 track, nghe so sánh (ghi params + cost như đã có).
- **Variation trước khi sửa**: khi scene lỗi, tạo 2-3 phương án dữ liệu (position/rotate/size) thay vì sửa mò.
- **Gate mới (đề xuất)**: `motion-variety` (mỗi 3 scenes liên tiếp phải có ≥2 motion type khác nhau), `zoom-coverage` (≥40% photo scenes có continuous zoom), `sfx-event` (≥1 SFX trong vòng 2s quanh mỗi item entrance), `cut-motion` (không có 3 hard cuts liên tiếp giữa scenes tĩnh).

### Giữ nguyên
- Script-first + fact-check (phase 0-1), style lock, license/provenance, asset density, karaoke, cutout, on-twos graphics, cleanup rules.

---

## 5. Nguồn (transcripts)

- `C:\Users\DELL\AppData\Local\Temp\kilo\voxref1.en.txt` (video 1, 361 dòng)
- `C:\Users\DELL\AppData\Local\Temp\kilo\voxref2.en.txt` (video 2, 275 dòng)
- `C:\Users\DELL\AppData\Local\Temp\kilo\voxref3.en.txt` (video 3, 615 dòng)

---

# PART 2 — Beauty Study (2026-08-03, buổi chiều): tại sao video của ta "phèn, xấu, kém sinh động"

> User nhận xét: bài học ở Part 1 (chủ yếu motion layer) KHÔNG đủ để giải quyết "phèn và xấu".
> → Nghiên cứu thêm chính các video vox style ĐẸP + teardown visual style, đo lường khách quan bằng ffmpeg/PIL.

## 2.1 Nguồn tham chiếu đẹp (5 video + 8 bài phân tích)

| ID | Video | Vì sao chọn |
|---|---|---|
| `7wuYBfE131U` | I Made Vox-Style Motion Graphics Using Only Claude Code & Remotion | **Cùng stack với ta** (Claude Code + Remotion) — finished explainer "US-Iran peace deal" 47s chất lượng broadcast |
| `EhyOQ0QMINg` | Johnny Harris — Why Recessions Happen (15:43) | Đỉnh cao vox hiện đại: maps + graph hero + giọng kể |
| `_2105LHq1lI` | AI Vox Style Motion Graphics Are Finally Usable (Gemini Omni) | Demo vox clip AI đẹp + so sánh Omni vs Remotion |
| `gcHkxP9adiM` | Vox — Computers just got a lot better at writing | Visual anchor "flying text" (motif lặp lại xuyên video) |
| `StFCNZ9shSA` | I Made Vox Style Motion Graphics With 1 Prompt (Claude) | "Style brief" step trước production prompt |
| — | storybench.org (Vox art director Joey Sendaydiego) | "Mỗi video cần 1 anchor/motif duy nhất"; "đừng làm quá hoàn hảo — quá hoàn hảo trông như quảng cáo" |
| — | pressclubinstitute.org (Vox producer Nate Krieger) | "Không có gì trên màn hình xảy ra mà không có SFX thúc"; tránh minh hoạ 1-1 wallpaper |
| — | premiumbeat.com — Replicating the VOX Motion Graphic Look | 12fps stutter; 3D camera track-back + blur transition; motion background; lens characteristics (CA edge + blur + mask) |
| — | medium.com — Why every documentary suddenly looks like Vox | "Amateur = motion trang trí; Pro = motion trả lời câu hỏi narrator vừa hỏi"; "ít element hơn, dùng nhiều lần hơn, timing tốt hơn"; consistency là sự khác biệt |
| — | trydemotion.com — Why Your Motion Graphics Never Look Like Vox | flat design base; bold saturated colors trên neutral bg; timing precision; stagger; micro-timing |
| — | easy-peasy.ai — How to Make Vox-Style Videos with AI | Prompt recipes chuẩn vox: push-in + 2.5D parallax, yellow circle annotation, chart bars stamping with tick, map zoom + route line tự vẽ, typewriter caption, "Vox editors hold a single image 5-6s — slow is correct" |
| — | LinkedIn Salil Bajaj — reverse engineering Vox | **Analog visual design**: roughness, irregularities, paper quality → "tangible feel" → credibility + learning mindset |

## 2.2 ĐO LƯỜNG KHÁCH QUAN (bằng chứng "phèn" — không phải cảm giác)

Chạy trên master của ta (308s) vs segment tham chiếu (360p). Grid ảnh để xem mắt: `C:\Users\DELL\AppData\Local\Temp\kilo\grid_*.png`.

| Metric | **OURS master** | RemotionVox | JohnnyHarris | GeminiVox | VoxWriting |
|---|---|---|---|---|---|
| Cuts/min (scene>0.30) | 5.8 | 5.4 | **14.5** | **21.0** | 8.5 |
| Thời gian "đứng hình" (frozen ≥0.4s) | **99%** video | 75% | 72% | **21%** | 84% |
| Freeze dài nhất | 19.4s | 6.7s | 13.9s | **1.9s** | 19.7s |
| Độ bão hòa trung bình | 0.102 | 0.175 | **0.226** | **0.322** | 0.097 |
| % pixel bão hòa (S>0.45) | **0.019** | 0.138 | 0.136 | **0.199** | 0.033 |
| Độ tương phản (luma std) | **0.132** | **0.190** | 0.174 | **0.190** | 0.161 |

**Đọc kết quả:**
1. **Kém sinh động — xác nhận bằng số**: video của ta đứng hình 99% thời lượng, freeze dài nhất 19.4s (≈ 2 lần giới hạn dead-tail của chính gate ta: 4s!). GeminiVox chỉ 21% frozen. Kể cả VoxWriting (phong cách archival tĩnh chủ đích) chỉ 84%.
2. **Phèn — xác nhận bằng số**: % pixel bão hòa của ta = **0.019, thấp hơn GeminiVox 10x**, thấp hơn Johnny Harris 7x, thấp hơn cả VoxWriting đen-trắng 1.7x. Độ tương phản thấp nhất (0.132 vs 0.16-0.19). → **Palette của ta "muted trên muted": nền cream + accent amber/đỏ/xanh nhạt, không có "cú đấm" màu nào.** Vox thật = nền muted + **accent bão hòa mạnh** (yellow highlight, red stroke, navy/coral) — sat ratio 0.14-0.20.
3. **Pacing**: cut density của ta ≈ RemotionVox (5.8 vs 5.4/min) nhưng thấp hơn hẳn JH (14.5) và Gemini (21). Ta đúng nghĩa "giữ 1 cảnh 8-9s tĩnh"; vox đẹp = nhiều cut hơn + motion trong cảnh.

## 2.3 Kỹ thuật làm ĐẸP rút từ các video này (đối chiếu pipeline ta)

### A. Kiến trúc cảnh 3 lớp + background khoá (video Remotion — cùng stack)
- **1 background dùng chung cho MỌI scene** (static, texture, cùng font + cùng accent palette); chỉ midground/foreground đổi.
- Lý do: "background static nhưng đồ vật chuyển động vào → trông như **1 continuous shot** thay vì loạt cut".
- **3 lớp**: background (chia sẻ) + midground (nhân vật B&W **halftone pattern** — cảm giác magazine/paper, "không digital") + foreground (structures/ships/scenery).
- **Red offset marker stroke sau mỗi cutout** (lệch vài px, màu đỏ) → ảo giác 3D + signature vox. (Ta đang dùng white sticker border — khác hẳn!)
- **"Animate with intent" — chỉ 2 hàm: spring (pop-up) + interpolate (smooth); stagger các element (không vào cùng lúc)** — ta có Animated 12 types nhưng dùng 2 và không stagger thật sự.

### B. Visual anchor / motif duy nhất mỗi video (Vox art director + JH)
- "For every video, try to find something unique and hold on to it as my anchor" — flying text (Computers writing), **GDP line graph** (JH: "this line either going up or going down" — đồ thị là hero xuyên suốt).
- Video 3 trước đó cũng chốt: "6 narration blocks quanh **1 recurring physical object**" (thùng dầu, container, server rack).
- **Ta không có**: 35 scenes rời rạc, mỗi scene 1 ảnh mới, không motif lặp lại → cảm giác "ghép nối", không "1 tác phẩm".

### C. Màu: nền muted + accent BÃO HÒA (đo được: ta yếu 7-10x)
- Vox: bold saturated colors trên neutral bg, dùng có chủ đích (yellow highlight sọc, red stroke, navy/coral collage).
- Ta: amber #C77F00 trên cream — chroma thấp; gate chỉ ép "≥3 accents" chứ không ép "đủ bão hòa".
- Fix đề xuất: thêm accent bão hòa cao (đỏ #D64541, xanh dương đậm, yellow #fff200 trên dark) với DIỆN TÍCH lớn hơn hẳn hiện tại (hero punch, stroke, hình nền block màu), tăng tương phản (vignette mạnh hơn, chữ sáng hơn trên nền tối hơn).

### D. Chuyển động làm "sống" (đo được: ta 99% frozen)
- **Motion background**: texture chuyển động nhẹ trên cảnh tĩnh (premiumbeat) — "slight bit of movement, không distraction".
- **Long slow push-in / 2.5D parallax** giữa các lớp ảnh (easy-peasy prompt: "camera slowly pushes in with subtle 2.5D parallax between photo layers") — chính là thứ GeminiVox có (21% frozen).
- **3D camera track-back + blur** qua transition (premiumbeat) — match cut mềm.
- **12fps stutter cho graphics** — premiumbeat xác nhận: "the smallest design implementation, so pleasing to the eye" — ta mới áp onTwos cho TornFrame.
- **"Vox editors hold a single image 5-6s — slow is correct"** — giữ lâu KHÔNG sai, sai là giữ lâu MÀ TĨNH. Cần motion trong lúc giữ.

### E. Sound: SFX thúc MỌI chuyển động + music đổi nhịp
- Nate Krieger (Vox producer): "I try to not have anything happen on screen without a sound effect motivating it a little bit... flipping between photos → click; writing → pencil sound" → **mỗi item/motion mới = 1 SFX** (ta: 23 SFX/308s, gap 16-48s).
- Joss Fong: music đổi mỗi ~20s, track slice, kết mở là attention cues; top phải fast-paced.

### F. "Không làm quá hoàn hảo" + analog tangible feel
- Sendaydiego: "You don't want it to look perfect because that might make it look more like an ad than an editorial piece."
- Salil Bajaj: roughness/irregularity/paper = tangible = credible = learning mindset. → Ta đã có torn/paper (đúng hướng) nhưng THIẾU halftone, thiếu red stroke, thiếu độ "bẩn" có chủ đích trên chữ/ảnh.

### G. Script/video-language (JH + Joss Fong)
- JH: ví dụ bằng đồ vật đời thường ("mọi TV, bài học piano, lát pizza"), trực tiếp gọi mắt ("look at a graph", "brace yourself"), hero visual lặp lại.
- Joss Fong: viết kiểu video ("This is…", "Look at this…"), chừa "1 nhịp" cho ý lớn ngấm; không reveal payoff sớm.

## 2.4 Kết luận cho pipeline của ta (bổ sung Part 1 — vẫn chờ approve trước khi sửa engine/rules)

| Ưu tiên | Thay đổi | Bằng chứng |
|---|---|---|
| **P0** | **3-layer scene + 1 locked shared background** (bỏ "mỗi scene 1 ảnh mới"): background chung, midground cutout B&W halftone, foreground props; element stagger theo spring | 2.3A |
| **P0** | **Red offset stroke sau cutout** (thay/thêm white sticker border) | 2.3A |
| **P0** | **Continuous motion cho mọi cảnh giữ lâu**: motion background nhẹ + slow push-in/2.5D parallax; freeze% target < 60% (từ 99%) | 2.2, 2.3D |
| **P0** | **Accent bão hòa + tương phản**: tăng diện tích màu mạnh (hero punch, stroke, block), vignette đậm hơn; gate thêm check `saturation` (sat_ratio ≥ 0.08 trên mẫu frame) | 2.2 |
| **P1** | **Visual anchor/motif mỗi video** — ghi vào 02-brief + timeline: 1 vật/1 đồ thị/1 motif lặp lại ≥ 30% scenes | 2.3B |
| **P1** | **SFX gắn mọi sự kiện** (mỗi item entrance ≥1 SFX; target ~50-60/video 5+ phút) | 2.3E |
| **P1** | **12fps stutter toàn graphics** (mở rộng onTwos: item text, chips, karaoke highlight) | 2.3D |
| **P2** | Match cut mềm (track-back + blur giữa chapters); music đổi đoạn ~20-30s; halftone treatment cho cutouts | 2.3D/E |
| **P2** | Đừng ép "hoàn hảo": thêm roughness có chủ đích (tilt, lệch baseline, texture chữ) | 2.3F |

**Không phá bỏ**: script-first + fact-check, style lock, license gate, asset density, karaoke, torn paper, gate pacing 4-10s (giữ cảnh lâu đúng — chỉ thêm motion trong lúc giữ).

## 2.5 Grid ảnh để user so mắt (model không xem được ảnh)

- `C:\Users\DELL\AppData\Local\Temp\kilo\grid_RemotionVox.png` — explainer Remotion (3 lớp, red stroke, halftone)
- `C:\Users\DELL\AppData\Local\Temp\kilo\grid_JohnnyHarris.png` — JH maps + graph + talking head
- `C:\Users\DELL\AppData\Local\Temp\kilo\grid_GeminiVox.png` — vox AI clip (màu bão hòa, cut dày)
- `C:\Users\DELL\AppData\Local\Temp\kilo\grid_VoxWriting.png` — Vox flying text motif
- `C:\Users\DELL\AppData\Local\Temp\kilo\grid_OURS_master.png` — master của ta (so sánh trực tiếp)

---

# PART 3 — Vox v2: Hồ sơ số của "phèn" + Spec định lượng (2026-08-03 tối)

> User: "Nên cụ thể hoá bằng con số, đừng dùng tính từ mơ hồ. Vẫn chưa tìm được giải pháp cho vụ phèn và xấu."
> → Đo thêm 5 đặc trưng khung hình (sharpness/edges/hues/saturation/grain) trên video ta vs 4 tham chiếu,
> rồi chốt spec có NGƯỠNG SỐ cho từng hạng mục + gate tự động chặn. Không còn từ "nhiều/mạnh/đậm".

## 3.1 Hồ sơ số của "phèn" (đo trên 12 frame/video, 320px, median)

| Metric (median) | **OURS** | RemotionVox | JohnnyHarris | GeminiVox | VoxWriting | Gap của ta |
|---|---|---|---|---|---|---|
| Sharpness (Laplacian var) | **0.0075** | 0.0137 | 0.0133 | 0.0096 | 0.0142 | **1.8-1.9x mềm** |
| Edge density (phần frame có cạnh) | **0.032** | 0.060 | 0.052 | 0.098 | 0.047 | **1.7-3.2x trống** |
| Số hue bão hòa / frame (12 bin, S>0.35) | **2.25** | 4.92 | 3.75 | 2.75 | 3.33 | **thiếu 1-2.7 hue** |
| % pixel bão hòa (S>0.35) | **0.037** | 0.240 | 0.166 | 0.307 | 0.060 | **1.6-8x nhạt** |
| Grain energy (nhiễu phim) | **0.0125** | 0.024 | 0.029 | 0.043 | 0.021 | **1.9-3.4x sạch bóng** |
| + freeze (Part 2): % đứng hình / freeze dài nhất | **99% / 19.4s** | 75% / 6.7s | 72% / 13.9s | 21% / 1.9s | 84% / 19.7s | — |
| + màu (Part 2): sat_ratio S>0.45 / contrast | **0.019 / 0.132** | 0.138 / 0.190 | 0.136 / 0.174 | 0.199 / 0.190 | 0.033 / 0.161 | — |

**"Phèn" = số**: khung hình mềm (sharpness thấp 1.8x) + trống (edge 2-3x thấp) + ít màu (2.25 hue) + nhạt (saturation 1.6-8x thấp) + quá sạch (grain 2-3x thấp) + đứng hình 99%. Không phải cảm giác — đây là 6 con số có thể đo lại bất cứ lúc nào.

## 3.2 VOX V2 SPEC — ngưỡng số (target = trung vị nhóm tham chiếu tốt, có thể kiểm bằng script)

| # | Hạng mục | Hiện tại | **Target** | Cách đạt (số cụ thể) |
|---|---|---|---|---|
| S1 | Sharpness | 0.0075 | **≥ 0.012** | Thêm halftone dots (dot 4px, spacing 14px, opacity 8%) + annotation pen (stroke 6px) + torn edge scale 6→10 → tăng chi tiết tần số cao |
| S2 | Edge density | 0.032 | **≥ 0.055** | Mọi frame ≥ 3 lớp visual (bg + midground + foreground); photo scene ≥ 2 cutout + 1 annotation; text scene kèm 1 chart/stamp/sweep |
| S3 | Hue bão hòa/frame | 2.25 | **≥ 3.5** | 2 accent/frame từ bộ 4 (red #D64541, blue #2E74B5, green #2E7D32, yellow #fff200 dark-only); backdrop hình khối màu ≥ 15% diện tích frame ở text scenes |
| S4 | % pixel bão hòa | 0.037 | **≥ 0.12** | Red offset stroke (8px, #D64541, opacity 0.9) sau ≥ 80% cutout scenes; hero text màu accent; sweep rộng ≥ 30% frame width |
| S5 | Grain energy | 0.0125 | **≥ 0.020** | ImperfectionOverlay: grain 12%→22%; thêm fiber noise; vignette tối mép 12-18% |
| S6 | % thời gian đứng hình | 99% | **≤ 55%** | Mọi scene ≥ 1 continuous motion: push-in scale 1.00→1.12 xuyên scene (rate 0.012/s @10s); motion bg (texture trôi 2%/s); hold tĩnh tối đa 4s |
| S7 | Freeze dài nhất | 19.4s | **≤ 6.0s** | Hệ quả S6 + gate chặn |
| S8 | SFX count | 23 | **≥ 100** | 1 SFX mỗi item entrance + mỗi cut + mỗi annotation draw |
| S9 | SFX max gap | 48.4s | **≤ 8.0s** | Như S8 |
| S10 | Photo scenes có continuous zoom | 1/16 (6%) | **≥ 60%** | pushIn/slowZoom mặc định cho photo/collage |
| S11 | Scene avg length | 8.8s | **6.5-7.5s** | Nhóm câu lại ít hơn; giữ rule 4-10s, không cut nhanh |
| S12 | 12fps on-twos | TornFrame only | **mọi graphics** | item text, chips, chart, annotation cùng onTwos() |

## 3.3 Gate mới trong gate_vox.py (tự động, FAIL = không deliver; số đo lặp lại được)

| Check | Ngưỡng FAIL | Đo bằng |
|---|---|---|
| `freeze-ratio` | frozen > 55% duration | ffmpeg freezedetect n=-30dB d=0.4 |
| `max-freeze` | freeze dài nhất > 6.0s | như trên |
| `sharpness` | median Laplacian var < 0.012 | 12 frame mẫu, 320px, numpy |
| `edge-density` | median edge ratio < 0.055 | gradient Sobel thr 0.12 |
| `saturation` | median sat_ratio < 0.12 | HSV S>0.35 |
| `hue-variety` | median hue bins < 3.5 | 12 bin, S>0.35 |
| `grain` | median grain < 0.020 | |frame − gaussian2| mean |
| `sfx-count` | SFX < 100 | static SFX[] |
| `sfx-gap` | max gap > 8.0s | static SFX[] |
| `motion-zoom` | photo/collage có zoom < 60% | static SCENES[] |

Script đo: `C:\Users\DELL\AppData\Local\Temp\kilo\vox_metrics.py` + `vox_frames.py` (sẽ gộp vào gate_vox.py).
Quy trình: render draft → chạy gate (0 FAIL) → user xem → master.

## 3.4 Thứ tự triển khai (sau khi user approve)

1. **voxKit.tsx**: thêm `PushIn` (continuous zoom), `MotionBg` (texture drift), `HalftoneDots`, `RedOffsetStroke`, nâng `ImperfectionOverlay` (grain 22%, vignette 15%), onTwos mở rộng.
2. **VoxScenes.tsx**: refactor PhotoView sang 3 lớp (bg chung 1 ảnh cho 1 chapter + midground cutout B&W halftone + foreground); mọi scene thêm ≥ 1 motion liên tục; SFX theo sự kiện (~100+).
3. **gate_vox.py**: thêm 10 check bảng 3.3.
4. Render draft 45s → gate → user duyệt → master.
