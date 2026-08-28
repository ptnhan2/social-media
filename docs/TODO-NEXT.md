# TODO NEXT — Updated 2026-08-29 00:30 (sau session 28/08 toàn ngày)

> Session 28/08 nhảy nhiều chủ đề (voice → UI audit → rules → agents → voice
> direction → v3) mà TODO-NEXT không được update real-time — vi phạm workflow
> discipline #2. File này là bản cân đối lại toàn bộ. **Đọc file này đầu
> session mới.**

---

## Trạng thái lõi (đã xong, verify xanh)

- **Voice pipeline M1a SHIPPED + vận hành thật**: per-beat clips, provider
  text editing, Regenerate button (đã fix race text + stale public sync),
  QC gates (WER qua ElevenLabs Scribe, clip/duration/tail/lufs), v3 migration
  (audio tags + CAPS — user nghe ra khác biệt rõ, confirmed)
- **UI audit tool**: `scripts/ui-audit.mjs` — 9 checks deterministic ×
  multi-viewport + state navigation (--click) + dead-class detection
- **Enforcement architecture**: agents `verify` + `ui-probe` (dispatch qua
  Task tool, đã test thật), `/handoff` command, 5 skills trigger-bound
- **AGENTS.md rules #17-20** (readiness, pre-verified checklists, background
  process, UI verification matrix) + memory
- 185/185 vitest, CI xanh, demo Composer mở tại
  `localhost:5174/editor?project=ai-dialogue-therapy` (beat-05 đang giữ bản
  `[assertive]` + CAPS)

## A. ~~Chờ USER quyết~~ → ĐÃ TỰ QUYẾT (29/08 00:35 — correction: test-vehicle content không phải user gate)

> **Bài học (user correction)**: mình đang build HARNESS, không phải sản xuất
> video. Content của test vehicle = agent tự quyết. User gates chỉ: roadmap,
> taste principles cho learning loop, paid spend. Memory đã lưu.

| # | Quyết định (agent) | Lý do |
|---|---|---|
| A1 | Giữ Rachel | Harness không cần casting |
| A2 | Giữ beat-06 | Test content, text↔audio đã khớp — đổi chẳng test gì mới |
| A3 | Chấp nhận 41.84s | Cơ chế retime chạy đúng mới là feature |
| A4 | Giữ QC logic (±15% OR WER-verified) | Validated + có tests |
| A5 | Skip directed pass | Audio tags confirmed; batch regen sẽ test đúng cách trong M3 |
| A6 | Skip script restore | Chỉ liên quan production thật |

## QUEUE THẬT (harness capability)

## B. M1b — voice pipeline phần còn lại (spec đã duyệt)

| # | Việc | Chi tiết |
|---|---|---|
| B1 | Take switcher | Audio tab: play từng take, đổi take 1 click (takes đã lưu trên disk) |
| B2 | QC badge trên timeline | Clip voice QC FAIL = badge đỏ trên clip |
| B3 | breathPadSec per-beat + ripple | Field trong Audio tab; audio dài hơn → tự ripple beat sau (hiện clip chỉ giãn, đè nếu dài hơn nhiều) |
| B4 | Per-field ledger cho trim/move/nudge | Hiện chỉ setEditorClipMetadata có per-field |

## C. M2-M4 roadmap (spec v3 đã duyệt — PIPELINE-PRODUCTION-SPEC.md)

| # | Milestone | Nội dung |
|---|---|---|
| C1 | M2 image sourcing | Query cards trong Image tab (CHAI 3-pass), re-search, candidate grid + provenance, upload own, VLM relevance QC |
| C2 | M3 timeline + validate | generate_timeline wrap + validate_edit_doc + report panel trong Composer; E2E mini-video 10-15s zero-manual |
| C3 | M4 mix-plan | Music/SFX clips + DuckZones + master LUFS emit (AudioMixer render đã hỗ trợ) |

## D. Tech debt / bugs từ các session trước (chưa đóng)

| # | Việc | Nguồn |
|---|---|---|
| D1 | fonts→regen bridge | fonts.* knob đổi không trigger editor-doc regen (KB open item từ font A/B session) |
| D2 | Compressor knob cho voice | Nếu audio tags vẫn bị flatten qua post-chain — nới compressor (style store knob) |
| D3 | AGENTS.md slim-down | Phân loại 20 rules + "enforced by" từng rule — ĐÃ UNBLOCK (agents proven 28/08) |
| D4 | PropertiesPanel font select | Hiện thị role strings thay vì friendly names (UI polish) |
| D5 | Parity residuals | 4 treatments trên gate (chapter-card 2.28, cinematic 3.24, candidate 3.45, host-reflection 5.9-6.3) |
| D6 | Pexels API key expired | Dùng Unsplash; renew key khi cần |
| D7 | Playwright batch 3 | Marquee, guides, gen panel mock, recipes CRUD |
| D8 | Stem naming inconsistency | clip_voice_* vs therapy-beat-* filenames (cosmetic, hoạt động đúng) |

## E. Blocked / deferred (user đã chốt)

- repurpose pipeline — "hệ thống còn chưa chất lượng"
- Multi-doc Studio + anchor editor kéo thả
- Auto-cut head (9+ approaches failed — docs/AUTO-CUT-ATTEMPT-LOG.md)

## Quy tắc session mới

1. **TODO-NEXT update real-time** — mỗi khi đổi chủ đề lớn, 1 dòng status
   vào file này trước khi nhảy (bài học 28/08)
2. **Test-vehicle content = agent tự quyết** — đừng biến content của demo
   video thành user gates (bài học 29/08 00:35, memory
   `harness_goal.test_content_not_user_gates`)
3. Trước khi kết session: chạy doc-sync một vòng (TODO-NEXT + RECOVERY +
   spec progress log)
4. Queue mặc định: **M1b (B1-B3) → M2 → M3** — M3 đóng produce loop =
   lần đầu test thesis harness end-to-end (agent tự produce → tự critique →
   tự fix)

## Vận hành

```powershell
# Composer UI (persistent, đã chạy)
# Agent :2025 (persistent, PYTHONUTF8=1)
# Verify nhanh: dispatch verify agent (task tool, subagent_type "verify")
# UI audit: node remotion-composer/scripts/ui-audit.mjs --url "http://localhost:5174/editor?project=ai-dialogue-therapy" --click "Voiceover"
# Voice regen 1 beat: POST /api/project/audio-regen {projectId, clipId, providerText, voiceSettings:{modelId:"eleven_v3"}}
```
