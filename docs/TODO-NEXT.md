# TODO NEXT — NIGHT RUN 2026-08-24 23:50 → sáng 25/08

> User ngủ, blanket approval "tự quyết định mọi thứ, không gián đoạn đến khi
> hoàn thành TẤT CẢ". Mọi quyết định thiết kế ghi rationale trong commit/docs.
> Trạng thái real-time: tool todolist. Ghi chú sau mỗi task: evidence.

## Phase A — Pose wiring + production poses (~2h)
- [ ] A1. `addCharacterPresenceClip` op (geometry từ presence grammar →
       x/y/w/h fractions; metadata src+isCharacterPresence+z30+animIn;
       userEdited) + unit test
- [ ] A2. PropertiesPanel "Character" section cho beat clip: pose dropdown
       (dynamic từ bridge list-poses), position/size/motion, add → timeline
- [ ] A3. E2E: preview hiện pose clip, kéo được, keyframe được
- [ ] A4. Re-bake 4 production poses bằng bake_poses với head sạch
       (head-front.png isnet cutout) — thay poses cũ chất lượng thấp
- [ ] A5. Cleanup pose library junk (stock-*, e2e-*, test leftovers) sau
       khi check không còn reference trong EditDoc/store
- [ ] A6. render-window --path editor verify pose clip xuất hiện trong
       video render thật

## Phase B — E2 parity: bezier edges + springs (~2.5h) — GAP LỚN NHẤT
Mục tiêu: pixel-diff 2 path mean < 2.0 (hiện 9.4) → đủ điều kiện flip
default render path sang editor (GENERATOR-SPEC).
- [ ] B1. Audit projection: SemanticDiagram edges project sang element
       clip như thế nào hôm nay (thiếu gì so với treatment path)
- [ ] B2. Element language: edge element (SVG quadratic bezier + gradient
       stroke + curvature) trong EditorClipOverlay
- [ ] B3. Spring anim preset trong clipStyle (spring curve cho animIn)
- [ ] B4. Project edges đầy đủ từ treatmentElements (geometry + styleSource)
- [ ] B5. Đo pixel-diff 2 path (render-window dual + PIL diff) → iterate
       đến < 2.0 hoặc best-effort + document
- [ ] B6. Nếu đạt gate: flip default render path + QA gates 4 window +
       full test suite. Nếu không đạt: giữ nguyên + docs rõ remaining gap.

## Phase C — nar-001 story-framing (~1h)
- [ ] C1. Đọc U4 decision (taste-standard nar-001 + PATTERN-LEARNING spec)
- [ ] C2. Implement đúng hướng đã duyệt (host presence + story-framing)
- [ ] C3. QA gates + render verify + principle_compliance không tụt

## Phase D — Asset Studio round 3 (~1h)
- [ ] D1. Zoom-to-selection (tool options + shortcut)
- [ ] D2. History panel thumbnails (dataURL nhỏ ghi vào entry khi commit)
- [ ] D3. Wand marching-ants (pulse animation overlay)
- [ ] D4. (skip multi-doc — rủi ro kiến trúc ban đêm; ghi needs-design)

## Phase E — Harness & agent (~1h)
- [ ] E1. Narrow clip-edit subagent cho Ox Alpha (prompt hẹp + editor_op
       only) + chạy e6_e2e.py verify autonomy
- [ ] E2. LangSmith render-review queue check + pull scores
- [ ] E3. design_quality eval subset (guardrail sau thay đổi đêm nay)

## Phase F — E2E test suite cho Asset Studio (~45m, time-boxed)
- [ ] F1. Playwright spec file cho studio core flows (import stock →
       bg-remove → lasso → save pose) — chạy lại được, không phải ad-hoc
- [ ] F2. Nếu setup friction cao → ghi clearly trong docs + bỏ (time-box)

## Phase G — Close-out (~30m)
- [ ] G1. Docs sync: TODO-NEXT (statuses), HARNESS-RECOVERY, ASSET-STUDIO,
       GENERATOR-SPEC (kết quả đo E2), CHARACTER-PRESENCE (wiring done)
- [ ] G2. Docs hygiene: archive docs stale (EVOLUTION build-progress cũ,
       html files không dùng), giữ docs/ chỉ còn active
- [ ] G3. Memory save (quyết định đêm)
- [ ] G4. Final push + CI xanh toàn bộ commits đêm

## Sau đêm (cần user/design session — KHÔNG làm đêm nay)
- Multi-doc studio, anchor editor kéo thả (CHARACTER-PRESENCE-SPEC mục 2)
- `repurpose` pipeline (transcript → X/blog/shorts) — feature lớn, cần duyệt
- Agent product UI (useStream) / self-host deploy
- E2 flip nếu B không đạt gate

---

> Lịch sử batches A-F + spec A1-D3: XONG (2026-08-21→23) — chi tiết
> HARNESS-RECOVERY.md + git log. File này giờ chỉ track việc CHƯA xong.
