# ASSET STUDIO — SPEC + V4 PLAN (2026-08-24, sau research)

> **TRẠNG THÁI: V4 hoàn tất P0-P7 + UX audit round 1 (commit b5dcbe4).**
> 124/124 tests. Studio dùng production được. Còn audit list §7 (round 2+).
>
> Nguồn research: Photopea official docs (workspace/navigation), so sánh
> Konva vs Fabric (konvajs.org + 3 bài deep-comparison 2025-2026),
> react-filerobot-image-editor (đối chiếu), npm version check 2026-08-24.

## 0.5. TRẢ LỜI CÂU HỎI USER (2026-08-24 tối)

**Export ra dự án kiểu gì?**
Save pose → flatten toàn doc (đúng như thấy trên canvas, kể filters/blend)
→ upload PNG → `save-pose` → viết vào `public/<project>/character/poses/
<tên>.png` + anchor JSON. CharacterPresence render pose này trong video
khi scene config chọn pose name đó. Download PNG = chỉ tải file về máy.
**GAP còn lại**: chưa có UI trong editor để KÉO pose vào scene — pose
được tham chiếu qua characterPresence config trong EditDoc (cần làm khi
gắn character vào timeline).

**Từ dự án nhảy vào studio bằng nút nào?**
Nút **🎨 Asset Studio** trên header của VideoEditor (bên trái nút Export).
Từ 21:08 đã làm nổi bật màu cam để dễ thấy. Nút ← trên studio để quay lại.

**Gen AI prompt?**
Từ commit b5dcbe4: prompt resolved hiển thị trong textarea chỉnh sửa được
(WYSIWYG — text bạn thấy = text gửi đi), nút ↺ reset về auto, và option
"✏️ Custom prompt" nhập prompt hoàn toàn mới. Backend hỗ trợ sẵn
`op_generate {prompt}` — trước đó frontend chỉ không expose.

## 0. KẾT QUẢ E2E ĐÃ VERIFY (browser thật :5174/assets)

| Feature | Bằng chứng |
|---|---|
| Stock import → layer | click ảnh → "✓ Đã thêm layer body", doc auto-fit 683×1024 |
| Gen AI → layer | Stability gen → click → head layer, history "Import head" |
| Zoom/pan | wheel pointer-anchored (0.5625→0.61875), Ctrl+0 fit |
| Drag + snap guides | 62 red pixels tại doc center khi kéo gần center |
| Transformer resize | W 682.93→572.43, H 1024→858.31, aspect 0.667 giữ nguyên |
| Lasso cut | trong polygon [238] photo / ngoài polygon [43,48,56] checker |
| Eraser | nét chà → checkerboard, upload OK, history "Erase" |
| Magic wand | "Wand chọn 3.6% layer" → Delete → "Magic erase body" |
| BG remove | pixel nền [219] → checkerboard [50,56,65], "isnet-general-use" |
| Filters | brightness 0→60: pixel [230,230,231]→[253,253,254] live |
| Undo/redo | pixel-level verify: cut → undo (photo restore) → redo (cut) |
| Export save pose | modal preview → "✓ Pose đã lưu vào library" → grid 11 poses |
| Session persist (P7) | reload → layer còn, rulers còn, undo tiếp tục được |
| Rulers + guides (P7) | kéo từ ruler → "1 guide", double-click xoá |
| Grid (P7) | toggle → thirds lines render |
| Context menu (P7) | right-click → 6 items, Duplicate → 2 layers + history |
| New/reset (P7) | confirm → 0 layers, history ["Open"], localStorage reset |

**Bug đã bắt + fix trong E2E:**
1. `.as4-root` height 100% collapse → 100vh (page scroll làm click lệch)
2. polygon-mask server CROP ảnh → layer stretch; fix: flag `nocrop=true`
3. Lasso mode `delete` ≠ server contract `remove`
4. Transformer nằm ở canvas thứ 2 (Konva 1 layer = 1 canvas) — scan đúng
   canvas khi verify pixel
5. Konva KHÔNG có event `contextmenu` trên node → bind DOM-level trên
   stage container + getIntersection (custom attr `layerId`)
6. Menu context đóng ngay khi mở: window close-listener bắt lại chính
   event mở menu → `stopPropagation()` ở container listener

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

**TRẠNG THÁI: P0-P6 ✅ XONG (2026-08-24, commit 55108b7). P7 còn lại.**

| Phase | Nội dung | Verify khi xong | Trạng thái |
|---|---|---|---|
| **P0** | Install konva@^9.3 + react-konva@^18.2 + use-image. Scaffold file structure. Store + types + history reducer + unit tests (vitest) | `npm test` xanh; store test: undo/redo/jump/delete layer | ✅ 111/111 |
| **P1** | Shell layout (menu bar, tool bar trái, sidebar phải 3 panels + import, status bar) + CanvasStage: zoom/pan/fit/checkerboard/doc bounds | Mở app, wheel zoom tại con trỏ đúng điểm, Space+drag pan, Ctrl+0 fit, status bar cập nhật | ✅ |
| **P2** | Layer render từ state + Transformer (8 handles + rotate, keep-aspect mặc định) + drag move + **snap guides** (canvas center/edges) + LayersPanel đầy đủ (eye/rename/opacity/lock/reorder-drag/delete/duplicate) + toàn bộ shortcuts | Click layer → handles; drag → snap center hiện guide đỏ; reorder panel đổi thứ tự render; Ctrl+Z hoạt động mọi op | ✅ |
| **P3** | Lasso ON canvas (points + preview + close + Apply→mask qua bridge) + Eraser brush live (destination-out) + Magic wand flood-fill + BG-remove 1-click | Cut 1 head thật bằng lasso; erase nhẹ mép; wand xoá bg đơn giản; BG remove trên body photo | ✅ |
| **P4** | PropertiesPanel: X/Y/W/H/R numeric + link W:H, flip H/V, **filters (brightness/contrast/saturate/hue/blur)** live qua Konva.Filters + blend modes | Tăng brightness head → thấy ngay; so màu head vs body chỉnh được | ✅ |
| **P5** | ImportPanel tabs: Stock (search + presets, click = add layer) \| Gen AI (recipes, generate, click = add layer) \| Upload (drag-drop). Rewire từ V3 middleware — **không đổi backend** | Flow end-to-end: search stock → add → gen head → add → cut → chỉnh | ✅ |
| **P6** | Export: composite → preview modal (PNG thật) → Save pose (bridge save-pose) → xuất hiện trong pose library | Save 1 pose, render CharacterPresence thấy pose mới trong preview video | ✅ (pose xuất hiện trong library; CharacterPresence render kiểm ở bước dùng thật) |
| **P7** | Polish: History panel (named actions, jump) ✅ (đã xong từ P2), session-persist, rulers + drag guides + snap-to-guide, grid rule-of-thirds, context menu right-click, New/reset | E2E bảng §0 | ✅ commit 5327783 |

**V4 HOÀN TẤT (P0-P7).** Bỏ qua fg/bg color slot (không có brush tool nào dùng — thêm khi có painting).

## 7. UX AUDIT (trả lời "còn bao nhiêu vấn đề bỏ sót?")

### Round 1 — ĐÃ FIX (commit b5dcbe4, 2026-08-24 tối)
| # | Vấn đề | Fix |
|---|---|---|
| 1 | Gen AI ẩn prompt, không sửa được | Textarea WYSIWYG (resolved prompt hiển thị + edit + reset auto) |
| 2 | Không nhập prompt hoàn toàn mới | Option "✏️ Custom prompt" (backend hỗ trợ sẵn) |
| 3 | Lasso Backspace pop-point là dead code (branch không tới được) | Gộp vào handler Delete/Backspace đúng thứ tự |
| 4 | Status bar thiếu cursor X/Y (spec §P1 đòi nhưng bị sót) | cursorStore (useSyncExternalStore, rAF throttle) |
| 5 | Eraser không có brush preview | Circle outline theo mouse, đúng kích thước doc px |
| 6 | Canvas trống không có hint | Empty-state overlay |
| 7 | Ảnh đã import/gen MẤT sau khi reset doc | `list-inbox` op + "File gần đây" grid trong Upload tab |
| 8 | Save pose không nói rõ pose đi đâu | Info line trong modal + nút Download PNG (tải về máy) |
| 9 | Stock không credit photographer (licensing) | Credit hiện trên ảnh + title đầy đủ |
| 10 | Nút vào studio từ editor dễ miss | 🎨 Asset Studio nổi màu cam |

### Round 2+ — CÒN LẠI (theo priority, chưa làm)
1. **Pose wiring vào video** — chưa có UI trong editor gắn pose vào scene/
   timeline; hiện chỉ qua characterPresence config trong EditDoc (việc lớn,
   dính đến CharacterPresence integration — cần design session riêng)
2. **Marquee select** — kéo ô chọn nhiều layer (giờ chỉ shift+click)
3. **Wand shift+click add-vùng** + marching ants animation
4. **Lasso edit points** sau khi đặt (kéo point chỉnh vị trí)
5. **Zoom-to-selection**, pan bounds (giờ pan vô hạn)
6. **Gen options**: aspect ratio (hardcoded 1:1), seed, negative prompt
7. **History panel thumbnails** (giờ text-only)
8. **Stock pagination** (load more — giờ 12 kết quả cố định)
9. **Shortcuts cheat sheet** (nhấn ? để hiện)
10. **Multi-doc** — 1 doc/project; muốn nhiều pose song song phải New + save liên tục

Nguyên nhân bỏ sót: build theo feature-list của plan, không có pass
"walk the whole flow như user lần đầu". Bài học: sau mỗi phase E2E phải
check cả DISCOVERABILITY (tìm được tính năng không?) chứ chỉ check
FUNCTION (chạy được không?).

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
