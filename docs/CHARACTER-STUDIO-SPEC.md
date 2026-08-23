# CHARACTER STUDIO SPEC — mini studio tạo character assets (chờ duyệt)

> Written 2026-08-23. **TRẠNG THÁI: ĐỀ XUẤT — chưa triển khai, chờ user duyệt
> từng mục [D?]**. Thảo luận + góp ý trong chat, duyệt xong mới code.
>
> Nguyên tắc gốc (user, 2026-08-23): auto chỉ là ĐIỂM KHỞI ĐẦU — user luôn
> phải chỉnh sửa được asset đã ghép, và ghép thủ công từ đầu được. Chất lượng
> cuối do MẮT user quyết, không do thuật toán.

## 1. Mục tiêu

Một công cụ trong web hiện tại (Composer) để user tự tạo + tinh chỉnh
character assets KHÔNG cần đụng code/tool dòng lệnh:

- Tải ảnh stock → tách nền → ghép đầu vào body → chỉnh → lưu vào pose library
- 3 chế độ ghép: **auto** (detect cổ), **edit** (sửa asset đã ghép),
  **manual** (đặt tay từ đầu) — đúng yêu cầu gốc
- Kết quả lưu đúng format render pipeline đang dùng → save xong là video dùng
  được ngay

## 2. Vị trí trong app — [D1: chọn kiểu]

| Phương án | Ưu | Nhược |
|---|---|---|
| **A. Tab "Character" ở left rail → mở overlay full-screen** (đề xuất) | Đúng pattern UI hiện tại (7 tab sẵn); studio cần canvas to nên mở overlay; không đụng routing | Overlay là layer UI mới |
| B. Route riêng `/character` | Tách biệt hoàn toàn | App chưa có router; phải thêm dependency + navigation; rời khỏi editor khi dùng |
| C. Panel hẹp trong left rail | Không cần gì mới | Quá chật cho canvas tương tác — loại |

## 3. Layout (phương án A)

```
┌────────────────────────────────────────────────────────────────┐
│ CHARACTER STUDIO                                         [✕]   │
├─────────────┬──────────────────────────────┬──────────────────┤
│ HEAD        │                              │ INSPECTOR        │
│ [preview]   │      CANVAS TƯƠNG TÁC        │ ── Body ──       │
│ [Upload]    │   (body + head kéo được)    │ [Tải ảnh stock]  │
│ [Gen AI…]   │                              │ [Tách nền ▾]     │
│─────────────│   lưới nền trong suốt        │   (flood-fill /  │
│ POSE        │   hiển thị alpha             │    AI model)     │
│ LIBRARY     │                              │ [Đặt cổ tự động] │
│ ┌───┬───┐   │   đường neck-line kéo được   │ ── Head ──       │
│ │prs│thk│   │   (đặt crop)                 │ scale  ────●──  │
│ ├───┼───┤   │                              │ rotate ────●──  │
│ │pnt│cel│   │                              │ [Reset vị trí]  │
│ └───┴───┘   │                              │ ── Save ──      │
│ [+ Thêm pose]│                             │ tên: [_______]  │
│             │                              │ [💾 Lưu pose]   │
├─────────────┴──────────────────────────────┴──────────────────┤
│ status: "tách nền xong → cổ detect ở y=214 (auto) → kéo đầu…" │
└────────────────────────────────────────────────────────────────┘
```

## 4. 3 flows chính

### 4.1 Add pose (flow chính)
1. **Tải ảnh stock** (drag-drop hoặc file picker) → hiện trên canvas (ảnh gốc)
2. **Tách nền** → chọn algo (mặc định flood-fill; nút "AI model" cho nền
   phức tạp) → canvas chuyển sang nền trong suốt + lưới; giữ nút "thử lại
   với ngưỡng khác" (slider tolerance)
3. **Đặt neck-line** (crop đầu người trong ảnh): auto (detect) + kéo line
   chỉnh tay; vùng trên line mờ đi (sẽ bị cắt)
4. **Ghép head**: auto (head đặt tại cổ detect) HOẶC manual (kéo head tới
   chỗ mình muốn từ đầu)
5. **Chỉnh**: kéo head, slider scale/rotate — canvas live-update
6. **Đặt tên → Lưu pose** → PNG 800×1100 + anchor .json vào
   `public/<project>/character/poses/` → library grid cập nhật

### 4.2 Edit pose có sẵn
- Click pose trong library → load body gốc + head + anchor hiện tại
- Vào thẳng bước 5 (chỉnh) — có nút quay lại bước 3/4 nếu muốn làm lại
- Save: overwrite (backup bản cũ vào `poses/.backups/` tự động)

### 4.3 Manage head — [D2: scope v1?]
- **V1 tối thiểu**: xem head hiện tại + upload head mới (PNG/SVG)
- **V1 đầy đủ**: + nút "Gen AI" (form style → gọi Stability → candidates →
  chọn → tách nền → lưu) — tái dùng tools/assets/character_gen.py qua API
- **Đề xuất**: v1 làm tối thiểu (head 4b đã ổn), Gen AI để v2

## 5. Backend API (theo pattern /api/* trong vite.config.ts)

| Endpoint | Việc | Tham số |
|---|---|---|
| `POST /api/character/body` | Upload ảnh stock → inbox | multipart file |
| `POST /api/character/remove-bg` | Tách nền | {file, algo: flood\|ai, tolerance} → PNG xử lý |
| `POST /api/character/detect-neck` | Detect cổ | {file} → {neckX, neckY, neckWidth, confidence} |
| `POST /api/character/composite` | Bake preview | {body, head, anchor} → PNG preview |
| `POST /api/character/pose` | Lưu pose | {name, pngData, anchor} → ghi file |
| `GET /api/character/poses` | List poses + anchors | — |
| `POST /api/character/head` | Lưu head mới | multipart file |

Tất cả xử lý nặng chạy qua subprocess python (tái dùng `process_body.py` +
`bake_poses.py` refactor thành importable) — KHÔNG viết lại logic bằng JS.

## 6. Kỹ thuật tách nền — [D3: chọn chiến lược]

| Algo | Khi nào dùng | Trạng thái |
|---|---|---|
| **Flood-fill** (từ viền, tolerance) | Ảnh stock nền đơn sắc/isolated — chiếm đa số case | ✅ đã có, chạy tức thì |
| **AI model** (u2net_human_seg qua hyperframes/rembg) | Nền phức tạp, ảnh đời thường | ⚠️ model 168MB đã timeout 1 lần — cần retry download nền (background) lần đầu |
| **Đề xuất** | Flood-fill là DEFAULT; nút "AI model" hiện khi flood-fill ra kết quả tệ (user tự đánh giá bằng mắt) | |

**Chuẩn hoá output tách nền**: PNG trong suốt + auto-crop bbox subject —
cùng format cho cả 2 algo, canvas không cần biết nguồn gốc.

## 7. Data model — anchor

```jsonc
// poses/<name>.json — source of truth cho mỗi pose
{
  "neckX": 426,        // cổ (px trong canvas 800×1100) — head center-x neo đây
  "neckY": 0,          // 0 = đầu ảnh (đã crop tại cổ); >0 nếu để lề
  "neckWidth": 55,     // loãng cổ — head scale = headWidthRatio × neckWidth
  "headWidthRatio": 2.6,   // tỉ lệ mascot, chỉnh bằng slider
  "headRotate": 0,     // độ
  "method": "auto|manual|edited",  // provenance: ghép bằng cách nào
  "source": "pexels-35406701",     // provenance ảnh gốc
  "editedAt": "2026-08-23T..."
}
```

**[D4: head scale theo neckWidth hay tuyệt đối?]**
- Đề xuất: theo `neckWidth` (tỉ lệ) — body to nhỏ đều proportion đúng;
  đổi head khác kích thước asset vẫn tự fit

## 8. Tích hợp render pipeline

- Studio lưu **PNG đã ghép sẵn** (head + body bake) → `presenceAsset()`
  đọc đúng như hiện tại — KHÔNG đổi render code
- Anchor .json lưu KÈM để studio load lại khi edit (và cho tương lai:
  runtime layering, multi-channel head swap = re-bake từ anchor)
- Sau khi save pose: nhắc user "Render lại để thấy trong video"? —
  **[D5: có cần nút preview-in-video ngay trong studio không?]** (render
  1 frame từ treatment với pose đang chỉnh — tốn ~20s/lần) — đề xuất: v2

## 9. Phasing

| Phase | Nội dung | Ước lượng |
|---|---|---|
| **V1** | Tab Character + overlay studio: upload → bg-remove (flood-fill) → neck-line kéo → auto/manual ghép → drag/scale/rotate → save pose → library grid | 1-2 session |
| V2 | AI bg removal option + head upload/gen + edit-existing flow + preview-in-video | 1 session |
| V3 | Multi-channel heads + context-mapping editor | sau |

## 10. Decision points — chờ user

- **[D1]** Studio = tab + overlay (A) hay route riêng (B)?
- **[D2]** Head management v1: chỉ xem+upload, hay cả Gen AI luôn?
- **[D3]** Bg removal: flood-fill default + AI option (đề xuất), hay AI luôn?
- **[D4]** Head scale theo tỉ lệ neckWidth (đề xuất) hay px tuyệt đối?
- **[D5]** Preview-in-video trong studio: v1 hay v2?
- **[D6]** Tên pose: đặt tay mỗi lần (đề xuất) hay auto từ tên file?
- **[D7]** Có cần rotate head không ở v1, hay chỉ drag + scale cho gọn?
