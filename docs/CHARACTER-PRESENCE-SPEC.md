# CHARACTER PRESENCE SPEC — narrative character system (nar-001 A+)

> Written 2026-08-23 after user direction (the "gold standard" brief):
> một character head thương hiệu gắn vào vô số body/tư thế khác nhau để minh
> hoạ nội dung (cách Isaac làm), vị trí/motion/kích thước đa dạng mỗi lần
> xuất hiện. ĐÂY LÀ TIÊU CHUẨN VÀNG cho narrative trong video.
>
> Nguyên tắc sống còn (user, nguyên văn ý): "không thể nào toàn bộ script
> chỉ có 1 portrait lặp đi lặp lại" — mỗi lần xuất hiện là 1 TƯ THẾ KHÁC,
> phù hợp context.

## 0. Core idea

```
1 BRANDED HEAD (nhận diện cố định)
      ×  POSE LIBRARY (body + gesture, mở rộng dần)
      ×  POSITION GRAMMAR (composition-aware placement)
      ×  MOTION VOCABULARY (entrance/exit)
      ×  SIZE TIERS
      = mỗi appearance là một "shot" khác nhau của cùng nhân vật
```

Head mang brand recognition; body + gesture kể chuyện; vị trí + motion +
size tạo nhịp thị giác. Không bao giờ 2 lần xuất hiện liền kề giống hệt nhau.

## 1. Character model

### 1.1 Head (thương hiệu, cố định)
- Asset: `character/head.svg` — stylized head silhouette, vòng gradient stroke
  (colors.gradientStart → gradientEnd) + glow nhẹ, khớp ngôn ngữ thiết kế.
- Head KHÔNG bao giờ đổi giữa các lần xuất hiện (identity anchor).

### 1.2 Pose library (mở rộng vô hạn)
Mỗi pose = SVG body silhouette (không mặt — head ghép lên):
đặt head tại anchor-point của pose.

| Pose | Gesture | Ngữ cảnh tự nhiên |
|---|---|---|
| `present` | tay chỉ về nội dung chính | process/diagram — đang trình bày |
| `explain` | 2 tay mở rộng | định nghĩa, mở rộng ý |
| `think` | tay chống cằm | đặt vấn đề, hoài nghi |
| `point-left` / `point-right` | chỉ sang ngang | so sánh, chỉ vào 2 lựa chọn |
| `shrug` | 2 tay xỏe | "không chắc/cái này không工作的" |
| `celebrate` | 2 tay giơ cao | chốt rule, kết luận thắng lợi |
| `lean` | tựa hông, relaxed | kể chuyện, side comment |
| `facepalm` | che mặt | failure mode, sai lầm thường gặp |
| `run` / `stop` | động tác chạy/dừng | tempo, chuyển cảnh nhanh chậm |
| `scale-hold` | cầm cái cân | weigh tradeoffs |

Placeholder Phase 1: 4 pose đơn giản (present, think, point-right, celebrate)
vẽ silhouette tối giản đúng palette. Thư viện lớn dần — mỗi pose mới là 1 asset.

## 2. Presence grammar

### 2.1 Position (tham khảo positioning nhiếp ảnh)
Preset — KHÔNG toạ độ tự do (safe-margin có sẵn cho từng preset):

| Preset | Nguồn composition | Dùng khi |
|---|---|---|
| `thirds-tl` / `thirds-tr` | rule-of-thirds power point trên | narrator quan sát |
| `thirds-bl` / `thirds-br` | power point dưới (tránh footer có sẵn) | narrator giao tiếp |
| `edge-l-in` / `edge-r-in` | profile mép khung, NHÌN VÀO TRONG (lead room) | giới thiệu ý mới |
| `center` | dead-center, toàn bộ attention | big reveal, rule cuối |
| `below-title` | ngay dưới headline, trước text | phản biện/chốt nhẹ cho title |
| `beside-content` | sát cạnh diagram/timeline (không đè) | đang thao tác với content |
| `lower-third` | dải dưới (như TV lower third) | caption-style presence |

Quy tắc positioning:
1. Không che focal content (comp-103 single focal point)
2. Hướng nhìn/chỉ tay LEAD INTO the frame (không chỉ ra ngoài)
3. Cân bằng trọng lượng thị giác đang có (comp-102 negative space)
4. Tránh footer/signature có sẵn của treatment (safe margins)

### 2.2 Motion vocabulary
| Motion | Cảm giác | Config |
|---|---|---|
| `slide-l/r/u/d` | thư thái, định hướng | translate + ease-out |
| `pop` | năng lượng, chốt ý | scale spring overshoot nhẹ |
| `jump-in` | vui, đột ngột | translate-y arc + scale bounce |
| `drop-in` | rơi xuống, settle bounce | gravity feel |
| `fade-scale` | nhẹ nhàng, không phá nhịp | opacity + scale 0.85→1 |
| `peek` | hiếu kỳ, thân mật | trượt 50% từ mép, giữ cropped |

Exit: mirror entrance hoặc `exit-slide` ra phía đối diện. Motion phải match
mood của beat (pac-103 motion-matches-mood).

### 2.3 Size tiers
| Tier | Chiều cao (~%) | Dùng khi |
|---|---|---|
| `chip` | ~12% | ambient, hint nhẹ |
| `small` | ~20% | narrator thường |
| `medium` | ~35% | beside-content, thao tác |
| `half` | ~55% | khoảnh khắc kể chuyện |
| `full` | ~90% | character owns the frame 1 nhịp |

### 2.4 Timing
- `with-title` / `after-title` (+0.3-0.5s stagger)
- `on-emphasis` — xuất hiện đúng lúc điểm chính land
- `persistent` — có mặt từ frame 0

## 3. Context matching (bảng khởi đầu, sẽ HỌC)

narrativeFunction → presence config (khởi tạo bằng tay, tinh chỉnh bằng
feedback loop — mỗi KEEP vote trên presence config là dữ liệu học):

| Loại beat | Pose | Position | Motion | Size |
|---|---|---|---|---|
| name the problem | `think` | `thirds-tr` | `slide-u` | small |
| reframe/concept | `explain` | `beside-content` | `pop` | medium |
| process/how-to | `present` | `edge-l-in` | `slide-r` | medium |
| compare choices | `point-right` | `thirds-bl` | `peek` | small |
| failure mode | `facepalm` | `thirds-br` | `drop-in` | small |
| deliver the rule | `celebrate` | `center` | `jump-in` | half |
| reflection | `lean` | `lower-third` | `fade-scale` | medium |
| closing | `present` | `center` | `pop` | full |

## 4. Data model

```jsonc
// style store — default mỗi treatment
"treatments.semantic-diagram.characterPresence": {
  "enabled": true,
  "pose": "explain", "position": "beside-content",
  "motion": "pop", "size": "medium", "timing": "after-title"
}
// beat params — override MỖI BEAT (nguồn của variety)
"params.characterPresence": { "pose": "think", "position": "thirds-tr", ... }
```

Resolution: params > treatment default > tắt. Head asset global
(`character.head`), pose assets theo tên (`character/poses/<pose>.svg`).

## 5. Implementation phases

- **Phase 1 (bắt đầu ngay — placeholder mechanism)**: grammar engine
  (CharacterPresence component: pose/position/motion/size/timing đầy đủ),
  head asset + 4 placeholder poses, wire vào SemanticDiagram +
  ProcessTimeline MỖI BEAT MỘT CONFIG KHÁC NHAU (chứng minh variety),
  projection qua treatmentElements (element clip mang styleSource), QA gates,
  sync generator, preview :5174 review.
- **Phase 2**: pose library 10+ (art tốt hơn), thêm treatments
  (CandidateComparison, ChapterCard), context-mapping hoàn chỉnh.
- **Phase 3**: learning loop — agent tự chọn config theo context table,
  user feedback (KEEP votes) tinh chỉnh mapping — presence trở thành phần
  của pattern learning (mục tiêu "học 1 hiểu 10" áp cho presence).

## 6. Taste-standard principles phát sinh

- **nar-002** (HIGH, ACTIVE): Character appears with a DIFFERENT
  pose/position/motion/size every time — never the same framing twice in a
  row; pose matches the narrative context (Isaac's head-on-many-bodies model).
- **comp-201** (MEDIUM, ACTIVE): Character placement follows photography
  composition (thirds/lead-room/negative-space) and never covers the focal
  content.

Ghi vào taste-standard.md kèm source "user:2026-08-23 gold standard brief".

---

# PHẦN 7+8: ASSET PIPELINE + CUSTOMIZER — PLAN (chờ user duyệt 2026-08-23)

> Direction từ user: body phải là **người thật** (photo assets, không phải
> line-drawing); head gen AI nhưng user đang mất định hướng — giai đoạn này
> chỉ cần 1 head basic; thêm **page custom character trong web hiện tại**.

## 7. Asset pipeline

### 7.1 Kiến trúc assets (tách head khỏi body hoàn toàn)

```
character/
├── head.png                  ← HEAD (per kênh sau này: channels/<id>/character/head.png)
└── poses/
    ├── present.png           ← BODY (người thật, không đầu, cropped tại cổ)
    ├── think.png
    ├── manifest.json         ← anchors + metadata mỗi pose
    └── inbox/                ← body photos thô chờ xử lý
```

- **Head asset chuẩn**: PNG 512×512 nền trong suốt, đầu chính diện hơi nghiêng
  3/4, biểu cảm neutral-friendly, chiếm ~70% khung. Ring gradient KHÔNG nướng
  sẵn — render runtime theo palette kênh (đổi kênh đổi màu ring tự động).
- **Body asset chuẩn**: PNG ~800×1100 nền trong suốt, người THẬT chụp từ cổ
  xuống (đầu ngoài khung hoặc crop tại cổ), mỗi pose 1 file.
- **manifest.json**: mỗi pose có `headAnchor: {x%, y%, scale, rotate}` —
  điểm gắn đầu, tỉ lệ, góc nghiêng.

### 7.2 Body — 2 track (user chọn)

| | **Track AI-gen (đề xuất)** | **Track stock photo** |
|---|---|---|
| Nguồn | generate_image: "person neck-down, head out of frame, [pose], studio lighting, plain background" | Pexels/Unsplash (license-free) — tôi đưa search recipes, user duyệt ảnh |
| Style | Kiểm soát bằng prompt lock → đồng đều | Đa dạng thật nhưng khó đồng nhất model/ánh sáng |
| Bản quyền | Sạch 100% | License-free nếu chọn đúng nguồn (tránh ảnh random web) |
| Pose theo yêu cầu | Đúng pose cần, muốn gì ra đó | Phụ thuộc ảnh có sẵn |
| Xử lý sau | Auto: bg removal + normalize + anchor | Thủ công hơn: user download → inbox → tôi xử lý tiếp |
| Rủi ro | Chất lượng photo-real cần test batch đầu | Tốn công chọn ảnh, style lệch |

Cả 2 track dùng chung pipeline xử lý: `inbox/ → bg removal → normalize →
anchor annotate → manifest → dùng được`.

### 7.3 Head — quy trình gen có hướng dẫn (giải quyết "mất định hướng")

User không cần biết prompt gì. Quy trình 4 bước:

1. **Trả lời 4 câu hỏi taste** (hoặc dùng default tôi đề xuất):
   - vibe: friendly / professional / playful / edgy
   - art style: semi-realistic cartoon (đề xuất) / flat / 3D render / comic
   - palette: theo màu kênh (gradient cam-vàng hiện tại / khác)
   - chi tiết: kính, mũ, râu, tóc...
2. **Tôi generate 4-6 hướng style** (1 head mỗi hướng) → user chọn hướng
3. **Refine vòng 2**: 3-4 biến thể của hướng đã chọn (góc mặt, biểu cảm nhẹ)
4. **Finalize**: bg removal + chuẩn hoá format 512×512 → vào registry

Phase này chỉ cần 1 head basic. Đổi head sau = drop file mới (web page lo).

**Đề xuất style khởi điểm** (lý do): semi-realistic cartoon head trên body
người thật — tương phản mascot/person tạo brand nhận diện rõ (đúng mô hình
Isaac), DỄ ghép hơn photo-real head (không cần khớp ánh sáng/angle).

### 7.4 Compositing runtime (refactor Phase 1 hiện tại)

CharacterPresence render 2 layer: body PNG tại anchor position + head PNG tại
`headAnchor` của pose (scale/rotate theo manifest). 4 pose SVG placeholder
hiện tại sẽ thay bằng body photos thật + head layer.

## 8. Character Customizer — page trong Composer web

### 8.1 Vị trí

Tab **"Character"** trong left rail hiện tại (cạnh Media/Audio/Text/Effects/
Transitions/Filters/Brand kit) — đúng pattern UI đang có, không cần route mới.

### 8.2 Layout (3 vùng)

```
┌─────────────────────────────────────────────────┐
│ HEAD                                             │
│ [head preview]  [Generate AI] [Upload file]      │
│ Style: semi-realistic ▾   Palette: channel ▾    │
├─────────────────────────────────────────────────┤
│ POSE LIBRARY                        [+ Add pose] │
│ [present] [think] [point-right] [celebrate] ... │
│  (mỗi ô = body + head ghép sẵn — live preview)   │
├─────────────────────────────────────────────────┤
│ PREVIEW TRÊN VIDEO THẬT                          │
│ [1 frame từ treatment, character ghép vào]       │
│ [Regenerate style] [Save to channel]             │
└─────────────────────────────────────────────────┘
```

### 8.3 Features theo phase

- **C1 (core)**: head preview + Generate AI (form style → candidates → chọn)
  + Upload + pose grid live-composite + save vào registry
- **C2**: Add-pose flow (upload body photo → auto bg removal → click đặt
  headAnchor → register) + anchor editor kéo thả
- **C3**: multi-channel (channel selector, mỗi kênh head riêng) + context
  mapping editor (pose nào cho narrative nào)

### 8.4 Backend

- API endpoints theo pattern `/api/render` sẵn có: `/api/character/generate`
  (gọi image gen), `/api/character/save`, `/api/character/poses`
- Image gen chạy qua key có sẵn trong .env (Kilo Gateway / OpenRouter)
- Storage: `public/<project>/character/` (pattern hiện tại)

## 9. Thứ tự triển khai + ước lượng

| Bước | Việc | Ai | Ước lượng |
|---|---|---|---|
| 1 | Head style exploration: gen 4-6 hướng, user chọn | Tôi gen + user chọn | 1-2h |
| 2 | Body track test: AI-gen 3-4 poses (headless) + bg removal, so với stock track | Tôi | 2-3h |
| 3 | Compositing refactor: headless bodies + anchors + head registry + 2-layer render | Tôi | 1-2h |
| 4 | Character tab C1 (customizer page) | Tôi build + user duyệt UX | 4-6h |
| 5 | Swap head + bodies thật vào, QA renders, user review preview | Tôi + user | 1-2h |

Bước 1+2 chạy song song, không phụ thuộc nhau. Sau bước 5: kênh mới = 1 head
mới qua customizer (5 phút/đầu).

## 10. Quyết định user cần chốt (khi đọc plan này)

1. **Body track**: AI-gen (đề xuất) hay stock photo?
2. **Head style khởi điểm**: semi-realistic cartoon (đề xuất) hay hướng khác?
3. **Character tab**: đồng ý vị trí trong left rail? Cần gì thêm ở C1?
4. **4 câu taste cho head** (mục 7.3.1) — trả lời luôn hoặc để tôi dùng default
