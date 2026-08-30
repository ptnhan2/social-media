# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-30 21:30 (pre-compact). Master list công việc:
> `docs/TODO-NEXT.md` — đọc file ĐÓ trước, file này chỉ là bối cảnh + gotchas.

---

## 🌅 VIỆC TIẾP THEO (session mới — sau compact)

1. **Đọc `docs/TODO-NEXT.md`** — queue: P1 (beat CRUD + partial generate) →
   P2 (treatment selector, storyboard preview) → A3 (agent cycle trọn vòng)
2. **3 walkthrough audits đã xong** — findings trong
   `docs/WALKTHROUGH-AUDIT-3.md` + `docs/WORKFLOW-AUDIT.md` + spec §7
3. **Research pipeline SHIPPED** — Tavily + DeepSeek hoạt động E2E,
   TAVILY_API_KEY trong .env

## 🌙 TÓM TẮT SESSION 30/08 (09:00–21:30, full day)

- **Agent lên cấp app**: AgentDrawer mount trên router, conversation sống qua
  navigation, FAB 🤖 mọi trang, click-outside đóng
- **Creation Flow shipped**: picker → slug → create mode (idea + shape) →
  story checkpoint → script → Generate → approval. JourneyStepper 7 stages
- **Research pipeline shipped**: research_topic (Tavily + DeepSeek) →
  Research review card → draft_story informed by research
- **Content Studio v4**: app visual language (user: "làm như editor + asset
  studio"), token discipline, design-audit.mjs
- **3 walkthrough audits**: UX bugs → workflow gaps → user needs (20 findings)
- **P0 fixes**: Generate confirm, total duration, shape info, delete project,
  history refresh, editor button disable
- **Server Runbook** trong AGENTS.md (sau user correction về lỗi lặp)

## ⚠️ GOTCHAS TÍCH LUỸ

1. **Tavily API**: key trong .env (TAVILY_API_KEY). Free tier 1000 credits/mo
2. **DeepSeek chat vs VLM**: `_chat_completion` dùng `deepseek-chat` (text),
   KHÔNG dùng `deepseek-v4-flash-vision-exp` (VLM) cho planning tasks
3. **LangGraph boot ~80s** — đợi đủ 180s, UnicodeEncodeError là noise
4. **spawnSync python bridge đóng băng API 20s** — op nhẹ làm native JS
5. **Drawer conversation sống chỉ khi navigation là CLIENT-SIDE**
6. **Máy 100% CPU = đừng kết luận chết — đợi thêm**
7. **render --output resolve theo WORKSPACE root** — "projects/x/y.mp4"
8. **design-audit.mjs**: palette/type/spacing phải map vào app language
9. **Scribe không đọc punctuation** — normalize trước khi so sánh WER
10. **Project mới cần scaffold + generate-timeline** (không chỉ write_edit_doc)
    — nếu không voice clips không tồn tại (sync drop clips không có user marks)

## 📌 GHI NHỚ

- Check CI sau MỖI push
- Chain thesis: produce ✅ · approve ✅ · research ✅ · fix 🟡 · learn 🟡
- Style store v74; design-audit phải 0 violations trước commit
- Composer: localhost:5174 | Agent: localhost:2025/ok
- Studio journey: idea → research → story → script → voice → video → approved

## 🌙 SESSION BAN NGÀY 29/08 (09:19–14:17)

- **reviews/ convention** (user yêu cầu): HTML user-facing chỉ ở `reviews/`
  (YYYY-MM-DD-<kebab>.html), cũ → `reviews/archive/`; rule trong AGENTS.md
  Document Hygiene + handoff step 3
- **Agent lên cấp app** (user chỉ ra agent bị nhốt trong editor trong khi
  vai trò là idea→research→script→produce→critique): AgentDrawer mount trên
  router, FAB 🤖 mọi trang, conversation sống qua navigation, context tự
  truyền; tab Agent trong editor đã tháo; picker→editor chuyển client-side
- **Bugs bắt được qua probe**: (1) drawer toggle stall — FAB bị drawer đè,
  close không bao giờ ăn → FAB ẩn khi mở + AgentPanel always-mounted (CSS
  toggle) + playhead qua module ref; (2) editor kẹt loading ~20s — python
  bridge spawnSync đóng băng API → /api/assets/poses native (19.3s→35ms);
  (3) click-outside đóng drawer (backdrop)
- **Ops RCA**: langgraph boot 80s (memory cũ "PYTHONUTF8 crash" SAI — logging
  errors là noise); server "degraded" trưa nay thực ra là MÁY 100% CPU/90%
  RAM (League client + Edge) — đo hệ thống trước khi đổ lỗi code
- CI xanh toàn bộ: 522afa6 (drawer) · b6917e7 (toggle fix) · 19cef2a
  (backdrop) · 7f882e6 (reviews/)

---

## 🌙 TÓM TẮT OVERNIGHT 29/08 (00:45–05:45, user ngủ, full autonomy)

**M1b**: take switcher (voice_take.py + endpoint + UI rows play/select),
QC badge đỏ trên clip khi qc.pass=false (probe-verified fail/revert),
breathPadSec live retime + voice-first ripple (applyVoiceTake grows beat +
end-aligned overlays + shifts downstream, never shrinks; retimeVoiceClip
user path per-field marked).

**M2**: image query cards — Image tab (query + Re-search Unsplash + grid 12
candidates + select download + provenance + upload own), manifest per beat,
2 endpoint (agent + UI chung).

**M3**: generate_timeline — validateEditDocTimeline (pure, contiguity/cues/
params), generate-timeline.mjs (pre-flight → generate → voice post-check →
report JSON), Timeline QA tab (checklist + Generate), harness tool đăng ký.

**ZERO-MANUAL E2E (thesis test PASSED)**: mini-loop-test 13.7s —
scaffold-voice-plan → generate-timeline → render. Audio -16.5dB đúng
target, frames thật (37-42KB không phải black).

**Verify agent 8/8 PASS** + 194/194 vitest + 34/34 harness + ui-audit 0.

## ⚠️ GOTCHAS TÍCH LUỸ (quan trọng nhất)

1. **ElevenLabs v3 là chuẩn** — audio tags [assertive]... + CAPS; KHÔNG break
   tags; WER normalizer strip [tags]
2. **render-window --output resolve theo WORKSPACE root** — "projects/x/y.mp4",
   KHÔNG "../projects/..." (thoát workspace)
3. **Project mới cần đăng ký composition trong Root.tsx tay** (TODO A2)
4. **Sync refresh providerText nếu machine-set** — user edits (qua UI/metadata
   op) mới override-marked; restore demo state phải đi đường USER
5. **LangGraph boot ~80s** — graph import chậm, probe phải đợi 90-120s trước
   khi kết luận chết; các `UnicodeEncodeError` emoji trong log là NOISE không
   fatal (memory cũ "PYTHONUTF8=1 crash" là chẩn đoán sai). Agent server :2025
   (AgentPanel đã fix từ :2024)
5b. **spawnSync python bridge ĐÓNG BĂNG toàn bộ vite API** trong lúc chạy
   (list-poses từng 19.3s → editor kẹt loading). Op nhẹ (readdir) phải làm
   native JS endpoint — `/api/assets/poses`; không route qua bridge
5c. **Drawer conversation sống chỉ khi navigation là CLIENT-SIDE** —
   `window.location.assign` = full reload = mất thread; picker đã sửa dùng
   `navigate()`
5d. **Máy quá tải ≠ code bug**: đo CPU/RAM toàn hệ thống trước khi đi tìm
   lỗi trong code (trưa 29/08: 100% CPU + 90% RAM vì League client + Edge —
   mọi request chậm 50-100×, probe dưới load vẫn 100% chức năng)
6. **PowerShell 5.1**: không ternary; JSON args có quote nhúng bị mangle →
   truyền JSON qua file
7. **Vite publicDir** = remotion-composer/public — media fetch từ đó;
   sync-project-public.mjs sau mọi artifact mới
8. **Audit UI phải cover STATE** (--click "label#N" chọn nth element)
9. **Scribe không đọc punctuation** — normalize trước khi so sánh WER

## 📌 GHI NHỚ

- Check CI sau MỖI push (đang xanh trên ebc3363)
- Ma trận verify V1-V8 trong `.kilo/agent/verify.md`
- Style store v74; mini-loop-test = project M3 E2E vehicle
- beat-05 đang giữ bản [assertive] + CAPS (USER-marked, sống sót sync)
- Composer: localhost:5174/editor?project=mini-loop-test | ai-dialogue-therapy
