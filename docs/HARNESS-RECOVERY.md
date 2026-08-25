# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-25 03:15 (night run). Previous: 23:45 24/08.
> **TRẠNG THÁI: NIGHT RUN HOÀN TẤT 6/7 phase** (A pose wiring, B E2 parity
> edges+springs, C nar-002 variety, D studio round 3, E harness E6 PASS 7/7,
> G close-out; F Playwright skipped time-box).
> Full evidence + decisions: `docs/TODO-NEXT.md` (đầu file) + git log đêm.

---

## 🌅 VIỆC TIẾP THEO (session sau)

1. **E2 parity tiếp** (mục tiêu flip default render): node layout math,
   footer, presence timing — xem ASSET của B5 trong TODO-NEXT
2. **Playwright E2E suite** cho Asset Studio (F skipped — infra decisions)
3. Việc cũ: `repurpose` pipeline (cần duyệt user), multi-doc, anchor editor

## 🌙 TÓM TẮT ĐÊM (chi tiết trong TODO-NEXT + commits bc12fe3..HEAD)

- **Pose wiring HOÀN TẤT**: Character tab trong editor PropertiesPanel →
  overlay clip trên track "Character" riêng → render 2 paths. Production
  poses baked (VLM 4/4 PASS) + library cleanup.
- **E6 AGENT AUTONOMY: PASS 7/7 LẦN ĐẦU** — clip-editor subagent chạy trọn
  protocol. 4 bug hệ thống fix (quan trọng nhất: render-window không sync
  LIVE editor doc — clip edits invisible trong renders; driver interrupt
  handling hỏng → keep gate bị parse reject).
- **E2 parity**: edges + springs vào element language (mean 9.4 → 7-14
  interior), gate <2.0 chưa đạt → treatment stays master (documented).
- **nar-002 variety**: 7 context × 2-3 variants, deterministic rotation.
- **Studio round 3**: zoom-to-selection, history thumbnails, wand pulse.
- 137/137 tests, principle_compliance 14/14 guardrail, CI xanh.

## 🔧 VẬN HÀNH

```powershell
# LangGraph (:2024) — đang chạy (restart để nhận code harness mới)
harness\.venv\Scripts\python.exe -m langgraph_cli dev --port 2024 --host 127.0.0.1
# Composer (:5174) — đang chạy
cd remotion-composer\composer-app; npx vite --port 5174

# E6 agent autonomy re-run (cần reset kicker 18 + baseline trước — xem e6_e2e.py)
& "harness\.venv\Scripts\python.exe" harness\e6_e2e.py

# Render 2 paths (editor path giờ sync LIVE editor doc — đã fix)
node remotion-composer\scripts\render-window.mjs --project isaacverse-final --start 3.5 --end 7 --quality draft --path editor
```

## ⚠️ GOTCHAS MỚI (đêm)

1. **render-window sync**: phải kéo projects→public→bundle; trước giờ thiếu
   bước đầu → clip edits KHÔNG BAO GIỜ hiện trong render (đã fix trong
   syncRuntimePublic)
2. **LangGraph interrupt items**: dict với key "value" (không phải attribute)
   — driver phải `item.get("value")`; resume MỘT interrupt/lần (batch resume
   corrupt keep_gate)
3. **deepagents subagent tools**: subagent thiếu tool → nó theo failure
   branch của task brief (tự revert) — cung cấp ĐỦ tools cho protocol trọn
4. **editorProjection metadata spread**: `elementType: el.type` ghi đè marker
   — dùng `el.elementType ?? el.type`
5. **Konva content**: treatments preview render bằng DOM (không canvas) —
   verify bằng img/DOM query, không pixel-sample canvas
6. **CI @types/react**: react-konva kéo @types/react@19.x vào tree nhưng
   package.json không pin → npm ci trên CI báo lock out-of-sync. PHẢI pin
   `@types/react@^18` + `@types/react-dom@^18` khi cài Konva (hoặc bất kỳ
   package nào peer-depend @types/react)
7. **Rules-of-Hooks**: useCallback/useMemo KHÔNG ĐƯỢC đặt sau early-return
   (loading guard) — hooks phải chạy cùng thứ tự mọi render
