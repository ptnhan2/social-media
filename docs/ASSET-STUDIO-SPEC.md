# ASSET STUDIO SPEC — mini studio tạo assets (v2 — tích hợp feedback user)

> v2 2026-08-23: đổi tên Character Studio → **Asset Studio** (mở rộng được
> cho nhiều loại asset), thêm stock search, Gen AI bắt buộc với packaged
> prompts, manual composite + export, coverage requirement, router.
> **TRẠNG THÁI: ĐỀ XUẤT — chờ duyệt vòng 2.**

## 0. Feedback đã tích hợp (v1 → v2)

| Feedback user | Thay đổi trong spec |
|---|---|
| Đặt "Asset Studio" thay vì "Character Studio" | §1 — scope mở: character là asset type ĐẦU TIÊN, kiến trúc nhận thêm type sau (thumbnail, overlay, background...) |
| Thêm tìm kiếm ảnh stock trong studio | §4.1 — ô search gọi Pexels/Unsplash API (key có sẵn), grid kết quả, click để import |
| Gen AI BẮT BUỘC + prompt đóng gói sẵn (editable) | §5 — hệ thống prompt recipes: user chọn recipe + vài option, không gõ prompt từ đầu |
| Tự ghép head+body + export với custom name | §4.3 — manual composite flow + export asset |
| Auto detect + auto ghép → data kéo-thả chỉnh trực tiếp | §4.2 — auto pipeline xuất anchor data, mọi thứ edit được trên canvas |
| Router (tại sao chưa có?!) | §2 — thừa nhận nợ kỹ thuật; thêm react-router, Asset Studio là route riêng `/assets` |
| D3: bg removal phải nghiên cứu kỹ, ưu tiên chất lượng cao nhất | §6 — comparison 5 algo đang chạy trên ảnh thật, kết quả đính kèm |
| D4: head phải CHE KIN cả đầu gốc của body | §7 — coverage validation + crop-dưới-cổ mặc định |
| D5: preview-in-video TRONG studio + asset import vào editor | §4.5 — preview render trong studio; export đăng ký vào editor asset system |
| D6: tên auto nhưng editable | §4.4 |
| D7: rotate head v1 | OK |

## 1. Mục tiêu + scope

Mini studio tạo asset **trong web hiện tại**, loại asset đầu tiên: character
pose (head × body). Kiến trúc asset-type plugin: mỗi type (character, sau
này thumbnail/overlay/...) có flow riêng nhưng chia sẻ: search, gen AI,
canvas, export.

**Nguyên tắc**: auto = điểm khởi đầu; MẮT user = phán quyết cuối; mọi asset
auto-tạo đều kéo-thả chỉnh sửa được trên canvas trước khi lưu.

## 2. Kiến trúc app — thêm router

- **react-router-dom** (chuẩn React, vite-compatible) — trả nợ kỹ thuật cấu trúc app:
  - `/` → project picker (hiện tại)
  - `/editor?project=...` → VideoEditor (hiện tại)
  - `/assets?project=...` → **Asset Studio** (mới)
- Navigation: link "Asset Studio" trong header editor + nút back
- Vite dev server đã SPA-fallback sẵn (middleware tự viết) — không vướng

## 3. Layout Asset Studio (`/assets`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Editor    ASSET STUDIO · isaacverse-final          [Type: Character▾]│
├──────────────┬───────────────────────────────┬──────────────────────┤
│ SEARCH       │                               │ INSPECTOR            │
│ [🔍 query..] │        CANVAS TƯƠNG TÁC       │ ── Nguồn ──         │
│ [Pexels|All] │   body + head kéo được        │ [Tách nền ▾]        │
│ (grid ảnh    │   neck-line kéo được          │   algo: (auto ▾)    │
│  stock]      │   nền lưới trong suốt         │ [Detect cổ]         │
│──────────────│                               │ [Auto ghép đầu]     │
│ GEN AI       │   overlay preview-in-video    │ ── Head ──         │
│ [Recipe: ▾]  │   (toggle, render 1 frame)    │ scale ───●──        │
│ [option      │                               │ rotate ──●──        │
│  fields...]  │                               │ [Chekinh đầu ✓]     │
│ [Generate]   │                               │ ── Export ──       │
│ (grid kết quả)│                              │ tên [auto/editable] │
│──────────────│                               │ [💾 Lưu pose]       │
│ LIBRARY      │                               │ [→ Đưa vào Editor]  │
│ (poses grid) │                               │                     │
└──────────────┴───────────────────────────────┴──────────────────────┘
```

## 4. Flows

### 4.1 Import body — 2 nguồn
- **Search stock**: ô query → API Pexels/Unsplash (keys có sẵn) → grid kết
  quả (thumb + nguồn + photographer) → click → download về inbox → hiện
  trên canvas. Attribution ghi vào provenance.
- **Upload file**: drag-drop / file picker → cùng flow.

### 4.2 Auto pipeline (điểm khởi đầu, mọi bước edit được)
1. Tách nền (algo theo §6) → canvas hiện nền trong suốt
2. Detect cổ → neck-line hiện trên canvas (**kéo chỉnh được**)
3. Auto ghép head tại cổ → head thành **object kéo-thả** trên canvas
   (kéo / scale / rotate — mọi thay đổi ghi vào anchor data live)
4. Coverage check (§7): cảnh báo nếu đầu gốc body lộ

### 4.3 Manual composite (từ đầu)
- Bỏ qua auto: neck-line + head do user tự đặt toàn bộ
- Export asset với **custom name** → vào library

### 4.4 Save pose
- Tên: **auto suggest** (từ query/pose detect) + **editable**
- Lưu: PNG bake 800×1100 + anchor .json (source of truth) vào
  `public/<project>/character/poses/` — render pipeline đọc ngay

### 4.5 Preview-in-video + bridge sang Editor
- **Preview trong studio**: toggle "xem trong video" → render 1 frame của
  treatment đang dùng pose đó (server render ~15-20s, cache)
- **Đưa asset vào Editor**: nút export → asset đăng ký vào editor asset
  system (uploads + EditorDoc.assets) → kéo vào timeline như media thường

## 5. Gen AI — prompt recipes (bắt buộc, smart)

**Không bắt user gõ prompt.** Hệ thống recipes:

```jsonc
// libraries/asset-studio/recipes.json (editable, mở rộng dần)
{
  "character-head": {
    "label": "Character head",
    "description": "Đầu nhân vật kênh — mascot",
    "fields": [
      { "name": "style", "type": "choice", "options": ["comic ink", "semi-real cartoon", "flat vector", "3D render", "minimal mascot"] },
      { "name": "expression", "type": "choice", "options": ["friendly", "confident", "focused", "energetic"] },
      { "name": "accessory", "type": "choice", "options": ["none", "glasses", "headphones", "cap"], "optional": true }
    ],
    "promptTemplate": "Comic book inked character head of a young man, {{expression}} expression{{#accessory}} wearing {{accessory}}{{/accessory}}, three-quarter view, cel shading, bold ink outlines, warm orange amber palette, plain dark navy background, head and shoulders, centered, no text",
    "postProcess": ["remove-bg", "normalize-512"]
  },
  "pose-body": { ... },        // tương lai: gen body khi thiếu ảnh stock
  "thumbnail-concept": { ... } // tương lai
}
```

Flow: chọn recipe → điền vài choice (dropdown, KHÔNG gõ chữ) → Generate →
grid candidates → chọn → auto post-process (tách nền + normalize) → vào
canvas/library. Nút "edit prompt" cho power user (template hiện ra sửa được).

Providers: chain đã có (Stability → Gemini → Replicate).

## 6. Bg removal — kết quả nghiên cứu (D3)

Comparison đang chạy trên 2 ảnh stock thật (celebrate + point-up), 5 algo:

| Algo | Kích thước model | Tốc độ (sau load) | Ghi chú |
|---|---|---|---|
| Flood-fill | 0 | tức thì | Chỉ hợp nền đơn sắc; mép tóc kém |
| u2net_human_seg (hyperframes) | 168MB | ~2-5s/ảnh | Cũ nhưng chuyên human |
| bria-rmbg (rembg) | ~176MB | ~3-6s | RMBG — production quality |
| isnet-general-use (rembg) | ~170MB | ~3-6s | general tốt |
| **birefnet-general (rembg)** | ~973MB | ~8-15s | **SOTA hiện tại** — load chậm lần đầu (download ~1GB), sau đó cache |

**Đề xuất (chờ comparison sheet duyệt)**: **birefnet-general làm DEFAULT**
(theo yêu cầu chất lượng cao nhất), fallback bria-rmbg khi birefnet chưa
load/OM; flood-fill chỉ còn là fallback offline. Model load 1 lần rồi cache
— session server giữ warm.

## 7. Head coverage (D4 — yêu cầu PHẢI che kín đầu gốc)

- **Crop dưới cổ mặc định**: neck-line crop THẤP HƠN cổ detect một margin
  (10-15% chiều cao đầu) — không để sót cằm/cổ gốc
- **Coverage validation**: sau khi ghép, scan vùng phía trên neck-line:
  pixel subject nào không được head che → viền đỏ cảnh báo trên canvas +
  badge "CHE KÍNH ✓/✗" trong inspector
- Head scale auto-đảm bảo minimum width = đủ che vùng crop (khỉ user kéo
  head nhỏ hơn → cảnh báo)

## 8. Backend API

| Endpoint | Việc |
|---|---|
| `GET /api/assets/search-stock?q=` | Pexels+Unsplash search (gộp kết quả) |
| `POST /api/assets/body` | Import body (URL stock hoặc upload) → inbox |
| `POST /api/assets/remove-bg` | {file, algo} → cutout PNG |
| `POST /api/assets/detect-neck` | {file} → anchor suggestion |
| `POST /api/assets/composite` | {body, head, anchor} → preview PNG (bake) |
| `POST /api/assets/pose` | Lưu pose (name + PNG + anchor) |
| `GET /api/assets/poses` | List library + anchors |
| `POST /api/assets/gen` | {recipe, fields} → candidates[] |
| `POST /api/assets/preview-frame` | {pose, treatment} → 1 frame render |
| `POST /api/assets/to-editor` | Đăng ký asset vào editor asset system |

Xử lý nặng = python subprocess (rembg/process_body/bake_poses/character_gen
refactor thành importable) — không viết lại logic JS.

## 9. Phasing

| Phase | Nội dung |
|---|---|
| **V1** | Router + /assets page: search stock → bg-remove (birefnet + fallback) → neck-line kéo → auto/manual ghép → drag/scale/rotate + coverage check → save pose → library |
| **V1.5** | Gen AI recipes (character-head) + preview-in-video frame |
| **V2** | Bridge sang editor asset system + edit-existing poses + thêm asset types |

## 10. Còn chờ duyệt vòng 2

1. **§6 bg removal**: chờ comparison sheet (đang download model) — user
   nhìn chất lượng từng algo trên ảnh thật rồi chốt default
2. **§2 router**: react-router-dom OK? (hoặc muốn lib khác?)
3. **§5 recipes**: recipe đầu tiên (character-head) đủ các field như mẫu?
4. **§9 phasing**: V1 có cần Gen AI ngay (đẩy V1.5 vào V1) không?
