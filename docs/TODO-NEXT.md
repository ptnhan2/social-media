# TODO NEXT — Updated 2026-08-31 00:30 (P1 + P2 SHIPPED)

> Chain thesis: produce ✅ · approve ✅ · content-studio ✅ · creation-flow ✅
> · research ✅ · **P1 script-editing ✅** · **P2 treatment/duration/progress ✅**
> · fix 🟡 · learn 🟡
> Đọc file này đầu session mới. Sau compact: đọc `docs/HARNESS-RECOVERY.md` nữa.

---

## Trạng thái lõi (30/08 tối — session 2)

- **P1 SHIPPED (beat CRUD + partial generate + direction pre-voice)**:
  - `script-beat.mjs` (5 ops: set-transcript/set-direction/add/delete/move)
    + `/api/project/script-beat` + UI đầy đủ trong BeatEditor (↑↓✕ +
    confirm, + thêm beat row, script edit blur-save, direction pre-voice)
  - **Partial generate**: scaffold `--only changed|<ids>` regen TTS CHỈ beats
    stale (missing segment / transcript mismatch / direction mismatch);
    kept segments giữ nguyên qc/takes/stem. Studio stale-detector → nút
    "⚡ Generate nhanh (N/M beats thay đổi)". E2E verified: 1/3 beats billed,
    timeline OK, stale counter reset về 0 sau produce
  - **Stale model**: segment.transcript = "từ đã thu", beat.transcript = "từ
    nên nói" — mismatch chính là tín hiệu stale (không sync!)
  - **Direction truth**: beat.direction (edit-doc) → segment.providerText →
    projection; pre-voice direction edit được (P1-B4)
  - Cold-diff review 4 MAJOR đã fix: (1) `--text ""` parse thành "true" khi
    clear direction; (2) audio-regen không sync edit-doc segment → stale
    vĩnh viễn + double-bill (giờ sync transcript/providerText/qc/takes sau
    voice_apply); (3) videoDoc.beats bị thay shell wholesale (giờ merge
    per-id); (4) TOCTOU với produce (giờ đọc current.json + mtime optimistic
    lock + .bak trước write)
  - **Bug có sẵn được fix**: scaffold chỉ viết 05-edit-doc.json, quên
    edit/current.json → store.load() ưu tiên current.json → stale reads.
    Giờ scaffold viết cả hai (lockstep)
- RESEARCH PIPELINE + VIDEO SHAPE + P0 fixes (session 1, sáng-chiều)
- **P2 SHIPPED (session 2, 00:30)**:
  - **B2 Treatment selector**: select 8 treatments trong mỗi beat →
    set-treatment op (default params seeded từ transcript, giữ accent cũ
    cho visual continuity). UI click-verified: Chapter card → Semantic
    diagram ✓
  - **B3 Duration edit**: number input mỗi beat → set-duration op
    (1-600s, retime cumulative). 20↔25s verified
  - **D5 Per-beat progress**: scaffold in JSON progress line mỗi beat →
    produce endpoint track detail → Generate button "TTS voice 3/7 beats"

## QUEUE TIẾP THEO

### P2 còn lại
- **D1**: Storyboard preview (static frames từ treatments)
- **A5**: Audience/tone/language inputs trong CreateCard

### P3 — YouTube integration
- **D2**: Export/Share từ studio (download MP4 từ approval card)
- **D3**: Project metadata (title, description, tags cho YouTube)

### A3 — running agent cycles (thesis test trọn vòng)
- Agent tự chạy: research → story → script → generate → approval gate
- User chỉ xuất hiện ở approval gate (KEEP/REDO)
- Đây là lần đầu LUẬN ĐIỂM harness được kiểm chứng TRỌN VÒNG

### Tech debt từ review (MINOR/deferred)
- spawnSync trong script-beat endpoint chặn event loop ~2-3s (bundle 1 lần
  ở server start là fix đúng — defer, pattern giống clip-metadata)
- B1 VLM relevance QC / B2 grade knob / B3 query build agent-side (M2 cũ)

## Vận hành

```powershell
# Servers đang chạy (persistent):
# Composer :5174 → HTTP 200 (vite auto-restart khi config đổi)
# Agent :2025 → /ok 200
# Beat CRUD: POST /api/project/script-beat {projectId, op, beatId?, text?, dir?, index?}
# Partial produce: POST /api/project/produce {projectId, only: "changed" | "id1,id2"}
# Verify: node remotion-composer/scripts/ui-audit.mjs --url "..."
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
