# ASSET STUDIO — SPEC + V4 PLAN (2026-08-24, sau research)

> **TRẠNG THÁI: V3 đã build nhưng UX chưa chuẩn → research đã xong →
> đây là kế hoạch V4. CHỜ USER DUYỆT trước khi implement.**
>
> Nguồn research: Photopea official docs (workspace/navigation), so sánh
> Konva vs Fabric (konvajs.org + 3 bài deep-comparison 2025-2026),
> react-filerobot-image-editor (đối chiếu), npm version check 2026-08-24.

## 1. RESEARCH FINDINGS (đã làm, không cần làm lại)

### 1.1 Photopea — layout chuẩn editor (mô phỏng theo cái này)

Cấu trúc workspace (từ photopea.com/learn/workspace + navigation):

```
┌────────────────────────────────────────────────────────────────────┐
│ File | Edit | Image | Layer | Select | View    [↶][↷]  [Save pose] │ ← main menu
├────────────────────────────────────────────────────────────────────┤
│ Tool options bar — ĐỔI THEO TOOL đang chọn                          │
│ (Lasso: [Apply][Cancel] • Eraser: Size ▬●▬ Hardness ▬●▬ ...)        │
├──────┬────────────────────────────────────────────────┬────────────┤
│ Tool │  rulers ┌──────────────────────────┐ rulers    │ Layers     │
│ bar  │         │                          │           ├────────────┤
│      │         │       CANVAS             │           │ Properties │
│ 🖱 V │         │   (checkerboard bg)      │           ├────────────┤
│ ✂ L  │         │                          │           │ History    │
│ 🪄 W │         │  [grid/guides tùy chọn]  │           ├────────────┤
│ 🧽 E │         │                          │           │ Import     │
│ 🔍 Z │         │                          │           │ Stock|Gen|↥ │
│ ✋ H │         └──────────────────────────┘           │ (tabs)     │
├──────┴────────────────────────────────────────────────┴────────────┤
│ zoom 100% ▾ | 512×512 | X:120 Y:88 | Move tool                     │ ← status bar
└────────────────────────────────────────────────────────────────────┘
```

Patterns quan trọng học từ Photopea:
1. **Tool options bar** (ngay dưới menu): hiện tham số của tool đang chọn
   — V3 thiếu hoàn toàn (tham số nằm rải rác ở properties panel).
2. **Navigation**: `Z` zoom / `Space` giữ = hand tạm thời / `Ctrl+Space` =
   zoom tạm thời / wheel = scroll / `Alt+wheel` = zoom tại con trỏ.
3. **History panel**: list các action có tên, click nhảy tới state bất kỳ
   (không chỉ linear undo/redo như V3).
4. **Toolbar**: icon có mũi tên góc = nhóm tool (click-hold mở submenu),
   hover hiện tên + phím tắt, đáy toolbar có fg/bg color.
5. **Sidebar phải**: panels xếp cột, mỗi panel title-bar riêng, fold/unfold
   được, Window menu để tìm panel bị mất.

### 1.2 Figma — snap & properties
- Drag layer hiện **snap guides** (đường đỏ khi align center/edge với layer
  khác hoặc canvas) + distance numbers.
- Properties panel: numeric input X/Y/W/H/Rotation **kèm nút ↔ link W:H**
  và constraint 9-chấm.

### 1.3 Canva — import UX
- Import panel trái: search bar lớn + grid kết quả, **click ảnh = thêm
  layer ngay vào canvas center** (không cần nút "Add" riêng).
- Tabs dọc: Templates/Uploads/Elements — tương ứng Stock/Gen/Upload của ta.

### 1.4 Quyết định library: **Konva + react-konva** (chốt)

| Tiêu chí | Konva | Fabric.js |
|---|---|---|
| React bindings | ✅ react-konva official | ❌ community, tích hợp tay |
| Transform handles | ✅ `Konva.Transformer` | ✅ built-in |
| Zoom/pan | ✅ stage.scale + pos (docs đầy đủ demo) | ✅ tự viết |
| Image filters | ✅ Brighten/Contrast/HSV/Blur (đủ color-match) | ✅ nhiều hơn (không cần) |
| Eraser | ✅ `destination-out` trên cached node (demo chính thức) | ✅ |
| Layers của ta | ✅ scene-graph node → map thẳng Layer model | ✅ |
| Text editing | ⚠️ basic — **ta không cần** (layers toàn ảnh) | ✅ rich — lợi thế không dùng tới |
| Bundle | ~150kb | ~220kb |
| Downloads/tháng | 10.1M | 3.7M |

- **Bài học từ filerobot**: react-filerobot-image-editor (MIT, built trên
  konva 9.3) chứng minh Konva đủ sức làm full editor trong React — nhưng
  chính nó là single-image step-flow (Tabs Adjust/Effects/Crop), không phải
  layer compositing như ta cần, và đang ở bản 5.0.0-beta → **không lấy làm
  base, chỉ tham khảo kiến trúc**.
- **Versions pin** (đã check npm 2026-08-24): `konva@^9.3` +
  `react-konva@^18.2` (React 18 compatible) + `use-image@^1.1`. KHÔNG dùng
  konva@10 (react-konva 18 pair với konva 9; combo này filerobot đang chạy
  production).

## 2. V4 ARCHITECTURE

### 2.1 File structure (thay AssetStudio.tsx 598-line monolith)

```
src/assets/
├── AssetStudio.tsx        — shell: layout + global keyboard + route entry
├── studio/
│   ├── types.ts           — Layer, ToolId, EditorState, HistoryEntry
│   ├── store.ts           — useReducer + snapshot history (undo/redo/jump)
│   ├── tools.ts           — tool registry (id, icon, shortcut, options schema)
│   ├── geometry.ts        — snap guides, polygon point-in-poly, bbox utils
│   ├── imageOps.ts        — eraser/flood-fill/canvas → blob (client-side ops)
│   ├── exportComposite.ts — stage → offscreen canvas → PNG → save-pose bridge
│   ├── CanvasStage.tsx    — Konva Stage: layers, Transformer, zoom/pan, lasso overlay, guides
│   ├── ToolOptionsBar.tsx — contextual bar theo tool
│   ├── Toolbar.tsx        — tool palette trái (nhóm tool + tooltip + shortcut)
│   ├── LayersPanel.tsx    — list: eye, thumbnail, rename, opacity, lock, reorder, delete
│   ├── PropertiesPanel.tsx— transform numeric + filters + flip + blend
│   ├── HistoryPanel.tsx   — named action list, click-to-jump
│   ├── ImportPanel.tsx    — tabs: Stock search | Gen AI | Upload (drag-drop)
│   └── StatusBar.tsx      — zoom %, doc size, cursor pos, active tool
```

### 2.2 State model

```ts
interface Layer {
  id: string; name: string;
  src: string;              // URL ảnh (qua /api/assets/file)
  x: number; y: number;
  scaleX: number; scaleY: number;   // giữ aspect mặc định
  rotation: number;
  opacity: number;
  visible: boolean; locked: boolean;
  flipX: boolean; flipY: boolean;
  filters: { brightness: number; contrast: number; saturate: number; hue: number; blur: number };
  blendMode: string;
  width: number; height: number;    // natural size
}
interface EditorState {
  layers: Layer[];           // index 0 = bottom
  selectedIds: string[];
  activeTool: ToolId;
  docWidth: number; docHeight: number;  // canvas size (default 1024×1024)
  toolOptions: Record<ToolId, any>;     // lasso points, eraser size...
}
```

- **History = snapshot array** `{ label, state }` (layers serializable vì
  ảnh chỉ lưu URL) → undo/redo + History panel click-to-jump **miễn phí**
  bằng 1 cơ chế (Photopea pattern).
- **Konva chỉ là VIEW** — mọi state sống trong reducer; Stage render từ
  state, transform end → dispatch. (Bài học filerobot + react-konva best
  practice — tránh state sống rải rác trong Konva nodes.)

### 2.3 Tools (V4 scope)

| Tool | Shortcut | Options bar | Behaviour |
|---|---|---|---|
| Move/Select | `V` | — | click chọn layer, drag move, Transformer 8 handles + rotate, snap guides |
| Lasso | `L` | Add/Subtract mode, [Apply][Cancel] | click points trên CANVAS (không phải panel), preview segment, Enter/đouble-click đóng, Apply → polygon-mask trên layer đang chọn |
| Magic wand | `W` | Tolerance ▬●▬, Contiguous ✓ | click pixel → flood-fill select → Delete xoá vùng |
| Eraser | `E` | Size ▬●▬, Hardness ▬●▬ | brush `destination-out` TRỰC TIẾP trên canvas (live) |
| BG remove | `B` | — | 1 click → rembg (bridge) trên layer đang chọn |
| Zoom | `Z` / `Alt+wheel` | 100% ▾ | click = zoom in, Alt+click = out |
| Hand | `H` / `Space` giữ | — | pan viewport |

### 2.4 Keyboard shortcuts (Photopea-compatible)
`V L W E B H Z` tools • `Space` pan tạm • `Alt+wheel` zoom • `Ctrl+0` fit •
`Ctrl+Z/Ctrl+Shift+Z` undo/redo • `Ctrl+J` duplicate • `Del` delete layer •
`Ctrl+D` deselect • `Arrow` nudge 1px / `Shift+Arrow` 10px • `[` `]` đưa
layer xuống/lên • `Enter` đóng lasso.

### 2.5 Zoom/pan implementation
- `stage.scale({x,y}) + stage.position()` — zoom tại con trỏ (pointer-anchored).
- Checkerboard = Konva Rect pattern bên dưới doc, doc bounds vẽ border.
- Status bar zoom % clickable dropdown (25/50/100/200/Fit).

## 3. IMPLEMENTATION PLAN (P0→P7)

Mỗi phase KẾT THÚC BẰNG E2E verify trong browser (:5174/assets) — không
để dồn về cuối (bài học user correction #4).

| Phase | Nội dung | Verify khi xong |
|---|---|---|
| **P0** | Install konva@^9.3 + react-konva@^18.2 + use-image. Scaffold file structure. Store + types + history reducer + unit tests (vitest) | `npm test` xanh; store test: undo/redo/jump/delete layer |
| **P1** | Shell layout (menu bar, tool bar trái, sidebar phải 3 panels + import, status bar) + CanvasStage: zoom/pan/fit/checkerboard/doc bounds | Mở app, wheel zoom tại con trỏ đúng điểm, Space+drag pan, Ctrl+0 fit, status bar cập nhật |
| **P2** | Layer render từ state + Transformer (8 handles + rotate, keep-aspect mặc định) + drag move + **snap guides** (canvas center/edges) + LayersPanel đầy đủ (eye/rename/opacity/lock/reorder-drag/delete/duplicate) + toàn bộ shortcuts | Click layer → handles; drag → snap center hiện guide đỏ; reorder panel đổi thứ tự render; Ctrl+Z hoạt động mọi op |
| **P3** | Lasso ON canvas (points + preview + close + Apply→mask qua bridge) + Eraser brush live (destination-out) + Magic wand flood-fill + BG-remove 1-click | Cut 1 head thật bằng lasso; erase nhẹ mép; wand xoá bg đơn giản; BG remove trên body photo |
| **P4** | PropertiesPanel: X/Y/W/H/R numeric + link W:H, flip H/V, **filters (brightness/contrast/saturate/hue/blur)** live qua Konva.Filters + blend modes | Tăng brightness head → thấy ngay; so màu head vs body chỉnh được |
| **P5** | ImportPanel tabs: Stock (search + presets, click = add layer) \| Gen AI (recipes, generate, click = add layer) \| Upload (drag-drop). Rewire từ V3 middleware — **không đổi backend** | Flow end-to-end: search stock → add → gen head → add → cut → chỉnh |
| **P6** | Export: composite → preview modal (PNG thật) → Save pose (bridge save-pose) → xuất hiện trong pose library | Save 1 pose, render CharacterPresence thấy pose mới trong preview video |
| **P7** | Polish: History panel (named actions, jump), rulers + drag guides, grid rule-of-thirds, context menu right-click, fg/bg color slot | Bonus — làm nếu còn session |

**Scope dự kiến: P0–P6 là 1 session lớn tự chủ (batch_autonomous_first),
P7 session sau.** Commit sau mỗi phase + test xanh.

## 4. GIỮ NGUYÊN TỪ V3 (không đụng)

- Backend + bridge: `/api/assets/*` middleware + `tools/assets/asset_api.py`
  (11 ops) + recipes.json + stock_body_fetch.py + character_gen.py.
- Route `/assets` trong App.tsx; styles chung styles.css.
- Assets: head-front.png, head-3q.png, poses/, gen-results/, inbox/.

## 5. RỦI RO + CÂU HỎI CHO USER

1. **Konva Transformer không có skew/x-skew như Photoshop** — chấp nhận
   (không cần cho compositing body+head).
2. **Lasso apply qua bridge** (server PIL) nhanh (~100-300ms) — nếu thấy
   lag có thể chuyển mask client-side bằng canvas clip. Bắt đầu với bridge
   cho nhất quán với pipeline bake.
3. **Eraser là destructive** (sửa pixel layer) — snapshot history vẫn undo
   được vì undo = trở lại state trước (reload src cũ). Cần cache src gốc
   trong history entry (URL blob) — làm trong P3.
4. **Doc size mặc định** 1024×1024 hay theo ảnh body đầu tiên import?
   → Đề xuất: theo ảnh body import đầu (auto-fit doc), user chỉnh sau.

## 6. Liên kết
- Auto-cut log (vì sao phải manual studio): `docs/AUTO-CUT-ATTEMPT-LOG.md`
- Character presence grammar: `docs/CHARACTER-PRESENCE-SPEC.md`
- Recovery/handoff: `docs/HARNESS-RECOVERY.md`
