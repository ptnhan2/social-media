# TODO NEXT — NIGHT RUN 2026-08-24/25 — HOÀN TẤT 6/7 PHASE

> Kết quả night run (user ngủ, autonomous mode — quyết định ghi trong commits).
> Chi tiết evidence: HARNESS-RECOVERY.md + git log `bc12fe3..HEAD` đêm 24-25/08.

## Trạng thái các phase

### Phase A — Pose wiring + production poses ✅ (commit cd03818, 44349e4)
- addCharacterPresenceClip op (grammar geometry → overlay clip, userEdited
  ledger) + 2 unit tests — renders qua md.src path sẵn có
- PropertiesPanel tab "Character" cho beat clip: pose dropdown động từ
  bridge list-poses + position/size/motion → clip spanning beat range
- Track "Character" riêng (userCreated → top-level timeline row)
- E2E: preview render + kéo được + render-window editor path (VLM confirm
  character trong frame)
- 4 production poses bake lại với head-front.png (VLM 4/4 PASS) + dọn
  junk poses (check references trước)
- BUG bắt được: Rules-of-Hooks violation (useCallback sau early-return)

### Phase B — E2 parity: bezier edges + springs ✅ (commit 6d22403)
- Edge element (elementType=edge): SVG quadratic bezier + curvature +
  gradient/brush stroke + draw-on reveal trong EditorClipOverlay
- "spring" anim preset trong clipStyle (underdamped overshoot-settle)
- Projection: semantic-diagram edges project đầy đủ (styleSource provenance)
- BUG: editorProjection ghi đè elementType bằng el.type trong metadata
  spread (edges biến mất âm thầm)
- Đo lường (B5): beat interior mean 7-14 (trước: edges hoàn toàn thiếu),
  frame 0 = 40 (cross-beat boundary artifact)
- **B6 DECISION: gate <2.0 CHƯA đạt → KHÔNG flip default render path**
  (remaining gaps: node box layout math khác, footer, presence timing —
  VLM side-by-side đã list). Treatment path stays master.

### Phase C — nar-001/nar-002 presence variety ✅ (commit ae69cc7)
- CONTEXT_PRESENCE: 7 context entries × 2-3 variants (pose/position/motion/
  size) — rotation deterministic theo beat.startSec (nar-002 "never same
  framing twice"), cùng kết quả 2 render paths
- 6 unit tests (consecutive-same-context differ, determinism, override
  wins, variant table shape)
- Part B scope: kicker narrative framing giữ trên 2 treatment diagram
  (asset/cinematic treatments sẽ clutter nếu thêm label — documented)
- VLM render verify: character hiển thị (variant theo seed)

### Phase D — Asset Studio round 3 ✅ (commit ae33c04)
- Zoom-to-selection (🔍→ Selection button) + fix stale ui.selectedIds
  closure trong actionsRef deps
- History panel thumbnails (56px JPEG dataURL khi commit, persisted)
- Wand selection pulse (node-level rAF, zero re-renders)

### Phase E — Harness & agent ✅ (commits a29da0d, 80688ac)
- **E1: clip-editor subagent — E6 PASS 7/7** (agent autonomy loop đầu tiên
  chạy trọn vẹn: delegate → editor_op → qa_gate → request_keep → persist)
- 4 bug fix: subagent thiếu tools (tự revert), render-window không kéo
  LIVE editor doc (clip edits invisible trong renders — regression từ
  E6-era), driver resume 1 giá trị cho nhiều interrupts (keep bị parse
  nhầm reject → agent revert đúng protocol), interrupt serialization
  (dict value key, không phải attribute)
- E2: render-review queue 4 items cũ (artifacts 22/08) — lành mạnh
- E3: guardrail PASS — principle_compliance 14/14, code_quality 14/14

### Phase F — Playwright E2E suite ⏭️ SKIPPED (time-box)
- Lý do: 3h sáng, cần infra decisions (test runner config, fixture
  strategy cho Konva canvas) đáng có session riêng. Ad-hoc browser E2E
  đã cover mọi feature đêm nay. **Defer to next session.**

### Phase G — Close-out ✅ (commit này)
- Docs sync toàn bộ + archive html stale + memory + final push

## Còn lại sau đêm (next session)

1. **E2 parity tiếp** (nếu muốn flip): node box layout math trong
   projection (DiagramNodeView layout ≠ 270×100), footer text, presence
   timing — cần đo lại sau mỗi mục
2. **Playwright E2E suite** cho Asset Studio (infra decisions)
3. Multi-doc studio + anchor editor kéo thả (CHARACTER-PRESENCE-SPEC)
4. `repurpose` pipeline (transcript → X/blog/shorts) — cần duyệt user
5. Poses production: user tự bake thêm poses bằng studio (công cụ đủ)
