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
