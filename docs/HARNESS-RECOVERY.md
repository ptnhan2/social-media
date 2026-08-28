# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-29 03:20 (sau overnight autonomous session). Master list
> công việc: `docs/TODO-NEXT.md` — đọc file ĐÓ trước, file này chỉ là bối
> cảnh + gotchas vận hành.

---

## 🌅 VIỆC TIẾP THEO (session mới)

1. **Đọc `docs/TODO-NEXT.md`** — overnight 29/08 shipped M1b+M2+M3+zero-manual
   E2E (verify 8/8). Queue: A (produce loop mở rộng: A1 agent viết edit-doc,
   A2 auto-register compositions, A3 critique loop trên mini-loop = learning
   thật)
2. **Morning checklist**: `docs/MORNING-CHECKLIST-29-08-OVERNIGHT.html` —
   mọi mục đã pre-verified (rule #18), user chỉ việc check
3. Deep-links sẵn: Composer mini-loop-test + ai-dialogue-therapy (đã mở tab)

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
5. **LangGraph Windows cần PYTHONUTF8=1**; agent server :2025 (AgentPanel đã
   fix từ :2024)
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
