# Content Studio Spec — script-centric working surface

> Status: CHỐT với user 2026-08-29 (3 vòng design). Đây là quyết định kiến trúc
> LỚN — mọi surface mới phải tuân layering này.
> Trigger: user correction × 3 — trang review/report không phải thứ họ muốn;
> họ muốn CONTENT STUDIO quanh script.

## 1. Kiến trúc 3 tầng (session decisions — đã chốt)

**Nguyên tắc gốc:** script là document sống — nơi agent và human cùng làm
việc; video/audio là derivative sinh theo yêu cầu. Không phải timeline là
trung tâm như trước.

### Tầng 1 — Content Studio (`/project?project=<slug>`) — nơi SINH
- **Script**: beat cards editable trực tiếp (sửa chữ tại chỗ)
- **Prompt layer**: prompt sinh ra script version hiện tại hiển thị cạnh
  script + re-run (sửa prompt → agent regen). Script và công thức sinh nó
  là MỘT thứ (pattern v0/Lovable)
- **Voice panel ĐẦY ĐỦ trong beat**: voice settings, providerText (direction
  tags), regen, nghe + chọn takes, QC readout — DỜI từ editor Audio tab
  (agent edit được thì user phải sửa được NGAY TẠI CHỖ content)
- **Approval gate**: Keep/Redo + note (đã có)
- **History**: process trace (đã có)
- **KHÔNG có video player trong edit loop** — không build editor thứ hai

### Tầng 2 — Editor (Remotion) — nơi DỰNG
- Live preview (chỗ XEM duy nhất khi làm việc)
- Audio tab SLIM DOWN: chỉ còn timing/mix (breathPad, gain/fade, mute/solo,
  trim/ripple) — MẤT hết fields direction (dời lên studio)
- Visuals + treatments (sửa sâu)

### Tầng 3 — Artifact (mp4) — chỉ render khi approval/export
- Editor render live → không cần mp4 trong edit loop
- Candidate mp4 sinh 1 lần mỗi agent cycle → approval card hiển thị

### Ranh giới SINH vs DỰNG (câu hỏi "vì sao tách audio")
- SINH audio chỉ cần BEAT: casting + đạo diễn (voice, settings, direction,
  takes, QC) → studio
- DỰNG audio cần timeline + hàng xóm: breathPad, trim, ripple, mix với
  music/SFX → editor
- Đây là ranh thật, không phải "từ vs cách nói" (lần tách đầu sai)

## 2. Parity audit (rule #16 — chạy design-parity skill trước implement)

| Stage/Artifact | Agent làm gì | User XEM | User SỬA | Single truth | Learning hook |
|---|---|---|---|---|---|
| Script (beats) | write_edit_doc (story+beats qua saveSourceDocs) | studio beat cards | sửa chữ inline (clip-metadata → sentenceText) | voice clip sentenceText trong editor doc (một truth với Audio tab cũ) | **GAP BẮT ĐƯỢC: hook feedback.jsonl cho sentenceText edits trong clip-metadata endpoint** |
| Prompt (instruction) | truyền instruction vào write_edit_doc | studio prompt bar | re-run = sửa prompt prefill trong drawer rồi gửi (edit trực tiếp instruction không có nghĩa — instruction mô tả script HIỆN TẠI được sinh thế nào) | edit-doc root `instruction` + trace event | re-run với prompt sửa = signal (chat-level capture = gap known, sau) |
| Voice birth (settings/direction/takes/QC) | regen qua audio-regen, set settings | studio voice panel | providerText + voiceSettings (clip-metadata), regen, take switch (audio-take) | voice clip metadata | take-switch ✓ có; **GAP BẮT ĐƯỢC: hook cho providerText edits** |
| Voice dựng (timing/mix) | editor_op (trim/ripple) | editor timeline + Audio tab slim | breathPad/gain/fade ✓ | editor doc | timing edits chưa hook (giá trị thấp, known) |
| Generate on-demand | tools (scaffold/generate/render) | per-beat regen button (studio) + Timeline QA tab (editor) | retry per beat ✓ | pipeline artifacts | regen mang providerText hiện tại (đã hook ở take-switch) |
| Approval | request_approval/check_approval | studio approval card | Keep/Redo + note ✓ | qa/approval.json | ✓ có |
| Treatment params | write_edit_doc | beat card chip | **GAP (chấp nhận): agent-side + Phase 3 — user sửa treatment qua agent hoặc editor** | edit-doc beats | — |

**Hai gap BẮT ĐƯỢC nhờ audit → vào plan:** feedback hooks cho sentenceText +
providerText edits trong `/api/project/clip-metadata` (human edit script/
direction = learning signal — đúng kiểu take-switch hook đã có).

## 3. Implementation plan (lean — bite-sized, mỗi task có verify + commit)

Đang dở: B1 (clip-metadata endpoint) + B2 (instruction) đã viết code, chưa
test/commit — gộp vào Task 1-2, hoàn thiện theo TDD.

### Task 1: Write-path studio — `/api/project/clip-metadata`
- Files: `vite.config.ts` (đã viết), test bằng curl live
- [x] Viết endpoint (field allowlist: sentenceText, providerText, voiceSettings, transcript)
- [ ] Test E2E: sửa sentenceText 1 clip agent-loop-test → verify editor doc
  update + revision bump + **feedback.jsonl có record sentenceText edit**
- [ ] Thêm feedback hook (gap từ parity audit) nếu chưa
- [ ] Commit

### Task 2: Prompt layer — write_edit_doc instruction
- Files: `write-edit-doc.mjs` (đã viết), `scaffold-voice-plan.mjs` (takes —
  đã viết), `harness_tools.py` (đã viết)
- [ ] Test: chạy bridge với --instruction-file → edit-doc có `instruction`
  + trace event có instruction + scaffold chạy xong segment có `takes`
- [ ] Re-run pipeline agent-loop-test (story+beats+instruction) → verify cả
  3 tầng data
- [ ] Commit

### Task 3: Studio rework — beat editor + prompt bar + voice panel
- Files: `src/project/ProjectPage.tsx`, `styles.css`, `api.ts`
  (setClipMetadata helper), `AgentDrawer.tsx` (draftPrompt prefill)
- [ ] Beat editor: script textarea (save onBlur → clip-metadata), direction
  textarea, voice settings row, takes list + play + switch + regen (reuse
  logic từ PropertiesPanel VoiceSection), QC collapsible
- [ ] Prompt bar: hiện instruction + [↻ chạy lại] → setDraftPrompt + mở
  drawer (user xem/sửa prompt rồi gửi cho agent)
- [ ] BỎ player khỏi edit loop (chỉ approval card hiển thị candidate mp4
  khi pending)
- [ ] Probe L3/L4: render đủ fields, save flow, regen flow E2E
- [ ] Commit

### Task 4: Editor Audio tab slim-down
- Files: `PropertiesPanel.tsx` (VoiceSection → timing-only), `styles.css`
- [ ] VoiceSection: bỏ providerText/sentenceText/settings/takes/regen/QC;
  giữ breathPad + gain/fades + mute + hint "direction đã dời sang Content
  Studio"
- [ ] Probe: chọn voice clip → Audio tab chỉ còn timing fields
- [ ] Commit

### Task 5: Verify toàn diện (lean gate #8)
- [ ] typecheck + vitest full + harness tests
- [ ] ui-audit: /project + /editor (voice clip selected state)
- [ ] Dispatch **verify subagent** (V1-V8)
- [ ] Diff >200 dòng → dispatch **general subagent cold-diff review**
- [ ] Fix findings → commit

### Task 6: Docs + handoff
- [ ] Update spec progress log (section dưới), TODO-NEXT, RECOVERY
- [ ] Push + CI check
- [ ] Mở studio deep-link cho user

## 5. Creation Flow — "Video mới từ ý tưởng" (CHỐT 30/08 03:23)

> User correction gốc: app là bộ công cụ power-user, không phải HÀNH TRÌNH
> user. Pipeline `lên content` (research → audience → deeper problem → hero
> journey → script) đã có trong AGENTS.md từ đầu — UI mới bắt đầu giữa chừng.

### Journey (stage derived từ artifacts, không lưu state thừa)

```
idea → story (review checkpoint #1) → script (checkpoint #2, sửa trực tiếp)
     → voice → video → approved (gate cuối)
```

- **idea**: chưa có story-draft, chưa có edit-doc beats
- **story**: `qa/story-draft.json` tồn tại (pending = chờ duyệt, approved = xong)
- **script**: edit-doc có beats
- **voice**: audioPlan.voice không rỗng
- **video**: có render
- **approved**: approval.json status = approved

### Flow chi tiết (v1 — agent làm phần sáng tạo, UI làm phần deterministic)

1. Picker: [🎬 Video mới từ ý tưởng] → studio create mode → "Video của bạn
   về gì?" input + context tuỳ chọn
2. [Bắt đầu] → prefill agent drawer: idea + yêu cầu draft_story
3. Agent `draft_story(slug, idea, context)` → POST /api/project/story-draft
   (status pending) → studio refresh (SSE) → STORY card hiện
4. User sửa story fields inline (cùng endpoint) → [Duyệt story] → approved →
   [Viết script] prefill drawer → agent `write_edit_doc` (story đã duyệt làm
   input, instruction = idea)
5. Script hiện trong studio (sửa trực tiếp như đã có)
6. [🎬 Generate] → POST /api/project/produce (job: scaffold-voice --regen →
   generate-timeline → render draft) — deterministic, không cần agent
7. Approval gate (đã có)

### Parity audit — stages mới (rule #16)

| Stage | Agent làm gì | User XEM | User SỬA | Learning hook |
|---|---|---|---|---|
| Story draft | draft_story (POST story-draft, status pending) | STORY card trong studio | sửa fields inline (cùng endpoint) + duyệt | **user sửa story fields → feedback.jsonl (gap phải đóng, như clip-metadata)** |
| Story gate | check_story_review (đọc status ở cycle sau) | status trên card + stepper | [Duyệt story] / sửa rồi duyệt | duyệt = signal (trace event) |
| Produce | tools riêng (nếu chạy agent-side) | progress job + stepper | [Generate] button = CÙNG endpoint | — (deterministic) |
| Stage stepper | — (derived) | journey stage luôn thấy | — | — |

## 4. PROGRESS LOG

- **2026-08-29 22:40 — SHIPPED (T1-T6 hoàn tất, 566450c)**: Content Studio
  live theo đúng 3 tầng. T1: `/api/project/clip-metadata` write-path + feedback
  hooks (parity gaps đóng). T2: prompt layer — `instruction` đi cùng script
  version (edit-doc root + trace), scaffold ghi takes kèm path. T3: beat
  editors đầy đủ (script + direction + settings + takes + regen + QC), prompt
  bar + re-run prefill drawer, KHÔNG player trong edit loop. T4: editor Audio
  tab slim — chỉ timing/mix. T5: verify agent 8/8 (V8 PARTIAL = files chưa
  commit, đã xử lý) + cold-diff review độc lập → fix 1 MAJOR (settings
  per-keystroke commit) + 4 MINOR (type validation, regen commit direction
  trước, no-VO guard, temp leak) + takes path + BOM. .bak sweep guard vào
  .gitignore. 194/194 vitest, probe studio + editor slim xanh, ui-audit 0.
- 2026-08-29 21:10: spec + parity audit viết xong (sau user correction về
  quy trình — bỏ qua design-parity + plan là sai). Code B1/B2 đang dở trong
  working tree, hoàn thiện theo Task 1-2.
