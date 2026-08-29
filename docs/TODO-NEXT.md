# TODO NEXT — Updated 2026-08-29 19:05 (PROCESS TRACE shipped)

> Chain thesis: produce ✅ (zero-manual ×2) → approve ✅ (Project Page gate)
> → fix 🟡 → learn 🟡. Đọc file này đầu session mới.

---

## Trạng thái lõi (29/08)

- **PROCESS TRACE SHIPPED (91d19d1)**: user correction — trang cần show TIẾN
  TRÌNH (idea → script → rules → từng bước agent dưới nền), không chỉ kết quả.
  Tiến trình trước đó KHÔNG được ghi. Giờ: `scripts/lib/trace.mjs` — mọi stage
  tự record vào `qa/pipeline-log.jsonl` (plan: idea+beats+treatment
  rules+gates · voice: providerText+takes+QC per beat · timeline: gates+style
  · render: output/quality · approval: transitions). GET /api/project/trace.
  ProjectPage rework: **Process Timeline là xương sống** (accordion tuần tự),
  player/approval/story/beats theo sau. Verified: 6 events đúng thứ tự trên
  agent-loop-test (chạy pipeline lại hoàn chỉnh)
- **PROJECT PAGE SHIPPED (8caab94, phase 1+2)**: stage-surface trình bày +
  duyệt (Fliki/HeyGen/Lovable patterns). Beat cards từ EDITOR-DOC TRUTH, QC
  badge, draft player, approval gate (pending/changes_requested/approved +
  feedback.jsonl hook), harness tools request_approval/check_approval
- **Data-flow fix (8caab94)**: scaffold-voice-plan giờ chảy QC/takeId vào
  audioPlan → projection → clips
- **A1 ĐÓNG (0260c34)**: write_edit_doc qua saveSourceDocs; E2E
  agent-loop-test. A2 (f2eeb25) + cache fix
- **AGENT LÊN CẤP APP (522afa6...)**: AgentDrawer mọi trang + fixes
- **M1b + M2 + M3 SHIPPED** (đêm 29/08) · **ZERO-MANUAL E2E × 2**
- 194/194 vitest · 34/34 harness · typecheck · ui-audit 0 critical

## QUEUE TIẾP THEO

### A0. Phase 3 — inline plan edit (user đã duyệt, làm sau 1+2)

| # | Việc | Chi tiết |
|---|---|---|
| P3 | Sửa transcript/duration ngay trên Project Page | Edit inline trên beat card → re-plan có word-diff (Lovable pattern) → re-run stage bị ảnh hưởng (voice regen per beat, không full) |

### A. Produce loop mở rộng

| # | Việc | Chi tiết |
|---|---|---|
| ~~A1~~ | ~~Agent tự viết edit-doc~~ | **DONE (0260c34)**: write_edit_doc tool + bridge qua saveSourceDocs; E2E agent-loop-test 17.07s |
| ~~A2~~ | ~~Auto-register compositions~~ | **DONE (f2eeb25)** + fix cache hole (0260c34): manifest nằm trong render bundle cache key |
| A3 | Critique loop trên agent-loop-test | **Gate đã có (8caab94)**: request_approval → user Keep/Redo trên Project Page → check_approval. Còn: chạy VÒNG ĐẦU TIÊN thật — agent tự critique (visual_critique + qa_gate) → tự fix → re-render → request_approval; user chỉ xuất hiện ở gate |
| A4 | Edit-doc ↔ editor-doc coupling | Voice retimes/direction sống trong editor doc; sync refresh từ edit-doc plan. write_edit_doc đã viết audioPlan rỗng — scaffold điền; direction (tags/CAPS) cần write-back vào edit-doc khi user edit (learning hook có sẵn) |

### B. M2 còn lại (image pipeline)

| # | Việc | Chi tiết |
|---|---|---|
| B1 | VLM relevance QC | qcVerdict per image clip + badge (CHƯA research câu hỏi VLM — xem constraint `vlm.question_design_leverage_strengths`) |
| B2 | Grade knob | Cohesion grade = style-store knob hiển thị trong Image tab |
| B3 | Query build agent-side | Agent tự viết query từ beat narrative (CHAI 3-pass theo spec) |

### C. M1b/M4 còn lại

| # | Việc | Chi tiết |
|---|---|---|
| ~~C3~~ | ~~Feedback.jsonl hooks~~ | **DONE (22f2def)**: take switch + image select + query reword đều ghi vào harness/memories/feedback.jsonl (verified live, 7→10 records) |
| C1 | B4 per-field ledger cho trim/move/nudge | Hiện chỉ setEditorClipMetadata + retimeVoiceClip có per-field |
| C2 | M4 mix-plan | Music/SFX clips + DuckZones + master LUFS emit |

### D. Tech debt (từ các session trước — chưa đóng)

| # | Việc | Nguồn |
|---|---|---|
| D1 | fonts→regen bridge | fonts.* knob đổi không trigger editor-doc regen |
| D2 | Compressor knob cho voice | style-store knob cho post-chain |
| D3 | AGENTS.md slim-down | 20 rules phân loại + "enforced by" |
| D4 | PropertiesPanel font select | friendly names thay role strings |
| D5 | Parity residuals | 4 treatments trên gate |
| D6 | Pexels API key expired | Unsplash đang dùng |
| D7 | Playwright batch 3 | marquee, guides, recipes CRUD |
| D8 | Stem naming | clip_voice_* vs therapy-beat-* (cosmetic) |

### E. Blocked / deferred (user đã chốt)

- repurpose pipeline — "hệ thống còn chưa chất lượng"
- Multi-doc Studio + anchor editor
- Auto-cut head (9+ approaches failed — docs/AUTO-CUT-ATTEMPT-LOG.md)

## Quy tắc session

1. **TODO-NEXT update real-time** — đổi chủ đề lớn = 1 dòng status trước khi nhảy
2. **Test-vehicle content = agent tự quyết** (memory
   `harness_goal.test_content_not_user_gates`) — user gates chỉ: roadmap,
   taste principles, paid spend
3. Trước khi kết session: doc-sync một vòng (TODO-NEXT + RECOVERY + spec log)
4. Hướng mặc định: **A (produce loop mở rộng) → A3 critique loop = học thật**

## Vận hành

```powershell
# Composer UI (persistent, đang chạy :5174)
# LangGraph agent (persistent, đang chạy :2025, PYTHONUTF8=1, /ok = 200)
# Verify: dispatch verify agent (Task tool, subagent_type "verify")
# UI audit: node remotion-composer/scripts/ui-audit.mjs --url "..." --click "label#N"
# Take switch: POST /api/project/audio-take {projectId, clipId, takeId}
# Image search: POST /api/project/image-search {projectId, clipId, query}
# Generate timeline: POST /api/project/generate-timeline {projectId}
# Agent tool: generate_timeline(project_slug, mode) — đăng ký trong agent.py
```
