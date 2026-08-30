# TODO NEXT — Updated 2026-08-30 21:30 (RESEARCH PIPELINE SHIPPED + pre-compact)

> Chain thesis: produce ✅ · approve ✅ · content-studio ✅ · creation-flow ✅
> · **research ✅ (Tavily + DeepSeek E2E verified)** · fix 🟡 · learn 🟡
> Đọc file này đầu session mới. Sau compact: đọc `docs/HARNESS-RECOVERY.md` nữa.

---

## Trạng thái lõi (30/08 tối — trước compact)

- **RESEARCH PIPELINE SHIPPED (4161a3b..4d73806)**: `research_topic` tool
  (Tavily web search + DeepSeek planning/synthesis) → `qa/research.json` →
  Research review card trong studio → [Duyệt research] → `draft_story`
  INFORMED BY research. Journey: idea → 🔍 RESEARCH → story → script → voice
  → video → approved. E2E verified với API thật: 5 sub-questions, 20
  findings, 15 sources, key insights có data thật (NASA $327M, Knight
  Capital $440M). TAVILY_API_KEY đã có trong .env (tvly-dev-...)
- **VIDEO SHAPE SHIPPED (c05cc02)**: CreateCard có shape presets (Hook/
  Explainer/Deep dive/Custom) + shape flows vào agent prompt + draft_story
  nhận targetDurationSec/beatCount
- **P0 WALKTHROUGH FIXES SHIPPED**: Generate confirm dialog + total duration
  display + shape info trong StoryCard + delete project + history refresh +
  editor button disable pre-script
- **CONTENT STUDIO v4 (704915c)**: app visual language, token discipline,
  design-audit.mjs
- **Walkthrough audits**: 3 lần browser-driven (#1 UX bugs, #2 workflow
  gaps, #3 user needs) — findings trong WALKTHROUGH-AUDIT-3.md +
  WORKFLOW-AUDIT.md
- **Tổng cộng session 30/08**: ~25 commits (agent drawer → creation flow →
  research pipeline → 3 walkthrough audits → P0 fixes)

## QUEUE TIẾP THEO (sau compact)

### P1 — beat CRUD + partial generate
- **B1**: ADD/DELETE/REORDER beat trong studio (script editor table stakes)
- **D4**: Partial generate — chỉ re-voice beats thay đổi (tiết kiệm TTS cost)
- **B4**: Direction pre-voice — cho phép đặt direction tags TRƯỚC generate

### P2 — visual + progress
- **B2**: Treatment selector per beat (hiện tất cả đều CHAPTER-CARD)
- **B3**: Edit duration per beat
- **D1**: Storyboard preview (static frames từ treatments)
- **D5**: Progress feedback trong Generate (per-beat status)
- **A5**: Audience/tone/language inputs trong CreateCard

### P3 — YouTube integration
- **D2**: Export/Share từ studio (download MP4 từ approval card)
- **D3**: Project metadata (title, description, tags cho YouTube)

### A3 — running agent cycles (thesis test trọn vòng)
- Agent tự chạy: research → story → script → generate → approval gate
- User chỉ xuất hiện ở approval gate (KEEP/REDO)
- Đây là lần đầu LUẬN ĐIỂM harness được kiểm chứng TRỌN VÒNG

## Vận hành

```powershell
# Servers đang chạy (persistent):
# Composer :5174 → HTTP 200
# Agent :2025 → /ok 200
# Tavily key trong .env (TAVILY_API_KEY=tvly-dev-...)
# DeepSeek key trong .env (DEEPSEEK_API_KEY)

# Research 1 topic:
# → research_topic(project_slug, idea) → Research card trong studio
# Verify: node remotion-composer/scripts/ui-audit.mjs --url "..." --click "label"
# Design audit: node remotion-composer/scripts/design-audit.mjs
```

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
