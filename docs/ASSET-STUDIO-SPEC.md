# ASSET STUDIO — hiện trạng + kế hoạch session sau (2026-08-24)

> **TRẠNG THÁI: V3 ĐÃ BUILD NHƯNG CHƯA CHUẨN** — cần research kỹ hơn
> về UX/UI của các image editor chuyên nghiệp trước khi build tiếp.
>
> **LỆNH CHO SESSION SAU: research trước, build sau.** Đừng ngại làm
> nhiều hơn những gì user đã đề cập — nếu thấy feature nào của editor
> chuẩn mà đáng có thì cứ đề xuất thêm vào.

## 1. Hiện trạng Asset Studio V3

### Những gì đã có
- Layer system (body + head layers, visibility toggle)
- Tool palette (Move, Lasso, BG-remove)
- Canvas 800×600 với drag-to-move layers
- Stock search (8 preset pose buttons + custom query)
- Gen AI recipes (dropdowns, Stability API, auto post-process)
- Polygon lasso cut tool (click points, close, apply)
- Properties panel (X/Y/Scale/Rotate sliders)
- Undo/redo
- Save pose to library

### Những gì còn thiếu / chưa chuẩn
1. **UX chưa giống editor thật** — vẫn cảm giác như "web app" chứ không
   phải "editing studio". Canvas nhỏ, tools đơn giản, không có zoom/pan.
2. **Không có zoom/pan** — editor nào cũng phải có. Canvas fixed 800×600.
3. **Lasso UX thô** — không có preview real-time, không snap, không
   magnetic edge detection.
4. **Không có selection transform handles** — chỉnh scale/rotate qua slider
   thay vì drag handles trực tiếp trên canvas.
5. **Không có opacity/blend modes** — layers phẳng, không thể chỉnh
   độ mờ hay blend mode.
6. **Canvas không responsive** — không full-screen, không resize.
7. **Không có keyboard shortcuts** — V/M/L/Delete/Ctrl+Z...
8. **Không có floating panels** — panels fixed, không dock/undock.
9. **Composite export thô sơ** — không preview kết quả cuối trước khi save.
10. **Không có alignment guides** — không có snap-to-center, snap-to-edge.

## 2. LỆNH RESEARCH cho session sau

### 2.1 Research các editor để mô phỏng

| Editor | Cần học gì |
|---|---|
| **Photopea** (free, browser-based) | Layout, layer system, tool palette, keyboard shortcuts, zoom/pan, selection tools |
| **Photoshop Web** | Same as above + professional UI patterns |
| **Canva** | Simplicity, drag-drop UX, template system, export flow |
| **Figma** | Layer panel, properties panel, snap guides, collaborative UX |
| **Pixlr** | Simplicity + power balance, tool descriptions |

**Cách research**: mở từng editor, dùng thử các thao tác cơ bản:
- Import ảnh → các bước hiện ra sao?
- Zoom/pan hoạt động ra sao?
- Layer management UX?
- Selection/cut tool UX?
- Properties panel hiển thị gì khi chọn layer?

### 2.2 Features cần research và implement

#### BẮT BUỘC (core editing experience)
- [ ] **Zoom & pan** — scroll để zoom, space+drag để pan, Ctrl+0 để fit
- [ ] **Transform handles** — 8 handles quanh layer (resize) + rotate handle
- [ ] **Keyboard shortcuts** — V (move), L (lasso), M (marquee), Del (delete layer), Ctrl+Z/Y (undo/redo), Ctrl+D (deselect)
- [ ] **Full-screen canvas** — canvas chiếm toàn bộ không gian trống
- [ ] **Layer opacity slider** — chỉnh độ mờ từng layer
- [ ] **Layer delete** — nút xoá layer
- [ ] **Layer reorder** — drag layers trong panel để đổi thứ tự render
- [ ] **Snap guides** — center lines, edges, khi drag layer hiện guide xanh

#### NÊN CÓ (professional polish)
- [ ] **Context menu** (right-click) — Duplicate, Delete, Flatten, Properties
- [ ] **Rulers** — thanh thước trên và trái canvas
- [ ] **Canvas background options** — dark/light/checkerboard
- [ ] **Magic wand** — auto-select similar pixels (dùng cho bg removal)
- [ ] **Eraser tool** — brush-based erasing
- [ ] **Crop tool** — cắt canvas
- [ ] **Export preview** — xem kết quả cuối trước khi save
- [ ] **History panel** — visual undo stack với thumbnails
- [ ] **Layer rename** (double-click)
- [ ] **Layer lock** (không cho edit)
- [ ] **Grid overlay** — rule of thirds grid

#### NICE-TO-HAVE (power user)
- [ ] **Pen tool** (bezier curves) — precision cutting
- [ ] **Blend modes** — multiply, screen, overlay...
- [ ] **Filters** — blur, sharpen, color adjustments
- [ ] **Batch operations** — select multiple layers, group
- [ ] **Template system** — preset compositions (body + head positions)

### 2.3 Technical approach

**Canvas rendering**: 
- Option A: HTML5 Canvas API (full control, harder)
- Option B: CSS transforms + DOM (easier, less control)
- Option C: Fabric.js / Konva.js (canvas library, middle ground)
- **Recommendation**: research Fabric.js hoặc Konva.js — chúng có sẵn
  selection, transform handles, zoom/pan, layers...

**State management**:
- Layers là immutable objects → dễ undo/redo
- Tool state riêng biệt
- History = array of layer snapshots

**File structure**:
```
src/assets/
├── AssetStudio.tsx      — main editor component
├── Canvas.tsx           — canvas rendering + mouse handling
├── LayersPanel.tsx      — layer list UI
├── PropertiesPanel.tsx  — contextual properties
├── Toolbar.tsx          — top bar (undo, redo, export)
├── ImportPanel.tsx      — stock search + gen AI + upload
├── tools/
│   ├── move.ts          — move tool logic
│   ├── lasso.ts         — polygon lasso logic
│   └── ...
└── types.ts             — Layer, Tool, etc.
```

## 3. Assets hiện tại (giữ nguyên)

| Asset | Path | Trạng thái |
|---|---|---|
| Head (comic ink front) | `character/head-front.png` | ✅ Sạch (isnet cutout) |
| Head (comic ink 3/4) | `character/head-3q.png` | ✅ Có (chưa verify) |
| Body poses (4) | `character/poses/*.png` | ⚠️ Cần re-bake |
| Gen results | `assets/character/gen-results/` | ✅ Hoạt động |
| Stock inbox | `assets/character/bodies/inbox/` | ✅ Có raw photos |
| Recipes | `libraries/asset-studio/recipes.json` | ✅ Character head |

## 4. Backend APIs (đã hoạt động, giữ nguyên)

| Endpoint | Op | Trạng thái |
|---|---|---|
| `/api/assets/bridge` | `remove-bg` | ✅ rembg AI |
| `/api/assets/bridge` | `polygon-mask` | ✅ PIL polygon |
| `/api/assets/bridge` | `composite` | ✅ Alpha composite |
| `/api/assets/bridge` | `save-pose` | ✅ Export to library |
| `/api/assets/bridge` | `generate` | ✅ Stability AI |
| `/api/assets/bridge` | `list-recipes` | ✅ |
| `/api/assets/bridge` | `list-poses` | ✅ |
| `/api/assets/search-stock` | — | ✅ Pexels + Unsplash |
| `/api/assets/body` | — | ✅ Upload/URL import |
| `/api/assets/file` | — | ✅ Serve images |

## 5. Tóm tắt cho session sau

1. **Đọc file này trước tiên**
2. **Research Photopea/Canva/Figma** — mở từng cái, dùng thử, ghi chú UX patterns
3. **Chọn canvas library** (Fabric.js hoặc Konva.js) hoặc tự build
4. **Design component structure** trước khi code
5. **Build core features trước**: zoom/pan → transform handles → keyboard shortcuts
6. **Sau đó thêm**: snap guides → layer panel improvements → export preview
7. **Cuối cùng**: nice-to-haves (pen tool, blend modes, filters)

**Nguyên tắc**: mỗi feature phải CẢM GIÁC như đang dùng editor thật,
không phải web form. Nếu cần test: hỏi "Photopea làm thế nào?" rồi làm giống.
