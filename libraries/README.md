# libraries/ — Pipeline Asset Libraries

8 nhánh library, mỗi nhánh tích lũy tài sản TÁI DÙNG của 1 bước pipeline.
Mọi nhánh tuân thủ **1 protocol chung** (xem `library-protocol.md`).

## 8 nhánh

| Thư mục | Bước pipeline | Chứa gì | Trạng thái |
|---|---|---|---|
| `01-topic/` | Phase 0 validate | Topic đã validate + scorecard + demand evidence | chờ build |
| `02-framework/` | Phase 1 framework | Analytical framework đã user-duyệt (reusable!) | chờ build |
| `03-script/` | Phase 1 script | Hook patterns, outline patterns, opening moves, stance models | chờ build |
| `04-visual/` | Phase 2 compose | **Layout templates + primitives + palettes + motion + sfx** | **đang build** |
| `05-audio/` | Phase 2 audio | Voices đã duyệt + params + cost; music tracks + license; SFX | chờ build |
| `06-assets/` | Phase 2 assets | Ảnh stock theo theme + provenance + cutout sẵn | chờ build |
| `07-repurpose/` | Phase 3 | Templates X/newsletter/blog/Reddit + engagement data | chờ build |
| `08-analytics/` | Phase 5 review | Retention/AVD mỗi video, golden episodes, learnings | chờ build |

## Trình tự build
1. `04-visual/` — điểm đau nhất (layout quyết định đẹp-xấu).
2. `02-framework/` + `03-script/` — nhanh, giá trị ngay.
3. `05-audio/` + `06-assets/` — gom tài sản đã trả tiền.
4. `07-repurpose/` + `08-analytics/` — khi có video publish.
5. `01-topic/` — nuôi từ phase 0.

## Nguyên tắc cốt lõi
- **Thêm = 1 file + 1 dòng registry** — không đụng file khác, không break video.
- **Sửa primitive 1 lần = fix mọi video** (video import từ library, không copy).
- **Vòng đời**: draft → approved (user duyệt) → demoted (❌ 2 lần).
- **Generator/production chỉ dùng mục `approved`**.
- **Mỗi tài sản có provenance**: nguồn, dùng ở video nào, số liệu hiệu quả.
