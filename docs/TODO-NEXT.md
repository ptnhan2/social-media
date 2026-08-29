# TODO NEXT — Updated 2026-08-29 15:00 (sau khi A1 đóng)

> Chain thesis: produce ✅ (mini-loop + agent-loop-test) → critique 🟡 →
> fix 🟡 → learn 🟡. Đọc file này đầu session mới.

---

## Trạng thái lõi (29/08)

- **A1 ĐÓNG (0260c34)**: `write_edit_doc` — agent TỰ viết edit-doc từ story
  + beats qua write-path chuẩn (saveSourceDocs: schema gates + atomic +
  public sync). Gates: timeline semantics REFUSE (gap/overlap/start≠0),
  schema WARN; overwrite guard + backup. E2E agent-loop-test: 3-beat → TTS
  → generate → render 17.07s (-16.8dB). Fix kèm: render bundle cache giờ
  bao gồm projects-manifest.json (composition mới không còn vô hình)
- **AGENT LÊN CẤP APP (522afa6 + b6917e7 + 19cef2a)**: AgentDrawer mount
  trên router — 🤖 mọi trang, conversation sống qua navigation, context tự
  truyền; FAB ẩn khi mở (bug bị drawer đè); AgentPanel always-mounted;
  /api/assets/poses native (bridge spawnSync từng đóng băng API 20s);
  click-outside đóng
- **reviews/ convention (7f882e6)**: HTML user-facing chỉ ở `reviews/`
- **M1b + M2 + M3 SHIPPED** (đêm 29/08): take switcher + QC badge +
  breathPad ripple · image query cards · generate_timeline + validate +
  Timeline QA tab + harness tools (generate_timeline, write_edit_doc)
- **ZERO-MANUAL E2E × 2**: mini-loop-test (13.7s) + agent-loop-test (17.07s,
  edit-doc từ tool)
- 194/194 vitest · 34/34 harness · typecheck · ui-audit 0 critical

## QUEUE TIẾP THEO

### A. Produce loop mở rộng

| # | Việc | Chi tiết |
|---|---|---|
| ~~A1~~ | ~~Agent tự viết edit-doc~~ | **DONE (0260c34)**: write_edit_doc tool + bridge qua saveSourceDocs; E2E agent-loop-test 17.07s |
| ~~A2~~ | ~~Auto-register compositions~~ | **DONE (f2eeb25)** + fix cache hole (0260c34): manifest nằm trong render bundle cache key |
| A3 | Critique loop trên agent-loop-test | visual_critique ĐÃ chạy được; còn: agent TỰ chấm → TỰ quyết fix → qa_gate → request_keep = vòng learning THẬT (KEEP gate chờ user). Đây là mốc kiểm chứng TRỌN VÒNG tiếp theo |
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
