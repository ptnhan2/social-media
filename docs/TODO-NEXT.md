# TODO NEXT — Updated 2026-08-29 03:15 (sau overnight session 29/08)

> Overnight autonomous session (00:45–05:45, user ngủ): M1b + M2 + M3 +
> zero-manual E2E — tất cả SHIPPED, verified (verify agent 8/8 PASS), CI xanh.
> Đọc file này đầu session mới.

---

## Trạng thái lõi (đêm 29/08 + sáng 29/08)

- **AGENT LÊN CẤP APP (sáng 29/08, 522afa6)**: AgentDrawer mount trên router —
  nút 🤖 nổi ở mọi trang, conversation sống qua navigation (client-side),
  context (project/view/playhead qua ref) tự truyền; tab Agent trong editor
  bị THÁO; picker→editor chuyển sang client-side nav (full reload giết
  conversation); /api/assets/poses native (python bridge spawnSync từng đóng
  băng API ~20s → poses 35ms); ui-audit exempt covered-by-open-overlay
- **M1b SHIPPED**: take switcher (play + đổi take 1 click, voice_take.py +
  /api/project/audio-take), QC badge đỏ trên timeline (qc.pass=false),
  breathPadSec live retime + voice-first ripple (applyVoiceTake grows beat +
  end-aligned overlays + shifts downstream; retimeVoiceClip cho user edits)
- **M2 SHIPPED**: image query cards — Image tab trên image element clips:
  query + Re-search (Unsplash, 12 candidates), candidate grid + select
  (download + src swap + provenance), upload-own; manifest per beat;
  endpoint /api/project/image-search|image-select (agent + UI chung)
- **M3 SHIPPED**: generate_timeline — validateEditDocTimeline (contiguity,
  cues, params — pure, shared), generate-timeline.mjs (pre-flight →
  generate-editor sync → voice post-check → report), Timeline QA tab trong
  Composer (checklist + warnings + Generate), harness tool
  generate_timeline đăng ký trong Deep Agents tool list
- **ZERO-MANUAL E2E PASSED (thesis test)**: projects/mini-loop-test — video
  13.7s 3-beat sản xuất hoàn toàn bằng loop: scaffold-voice-plan --regen →
  generate-timeline (5/5 PASS, 0 warnings) → render-window draft. Artifact:
  renders/mini-loop-draft.mp4 (919KB, audio -16.5dB đúng target, frames thật)
- **reviews/ convention (7f882e6)**: HTML user-facing chỉ ở reviews/ (YYYY-
  MM-DD-<kebab>.html), cũ → reviews/archive/; docs/ chỉ .md active
- 194/194 vitest + 5/5 node + 34/34 harness + 13/13 e2e + typecheck + ui-audit
  0 critical (multi-viewport + state navigation) + verify agent 8/8 PASS

## QUEUE TIẾP THEO

### A. Produce loop mở rộng (hướng chính — M3 đã đóng timeline step)

| # | Việc | Chi tiết |
|---|---|---|
| ~~A2~~ | ~~Auto-register compositions~~ | **DONE (f2eeb25)**: generate-timeline tự append projects-manifest.json; Root.tsx map manifest → Composition. Đã verify bằng render lại mini-loop qua manifest path |
| A1 | Produce flow hoàn chỉnh từ script | VideoDoc → edit-doc (agent viết beats) → scaffold-voice → generate-timeline → render. Hiện mini-loop edit-doc viết tay; agent cần tool viết edit-doc (hoặc dùng HTTP patch ops có sẵn) |
| A3 | Critique loop trên mini-loop | visual_critique ĐÃ chạy (VLM mô tả khớp thiết kế — qa/visual-critique-2026-08-29.md). Còn: qa_gate + request_keep + improve cycle → learning loop THẬT (produce → critique → improve) — KEEP gate chờ user |
| A4 | Edit-doc ↔ editor-doc coupling | Voice retimes/direction sống trong editor doc; sync refresh từ edit-doc plan (per-field ledger). Produce flow phải viết edit-doc audioPlan + beat timing (scaffold đã làm) — đóng gap khi A1 |

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
