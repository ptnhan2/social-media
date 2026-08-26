# TODO NEXT — NIGHT RUN 2026-08-26/27 — VLM DEEPSEEK + VIDEO #1 PRODUCED

> Night run hoàn tất (user ngủ ~23:40 → ~05:00). 6 hours autonomous.
> Commits: 048e9ca..f9b936f. CI xanh 3 workflows trên commit cuối.

---

## 🌅 MORNING REMINDERS — NHẮC USER NGAY LÚC SÁNG

1. **Flip blessing master render**: E2 gate đạt, default render-window đã là
   editor — nhưng `npm run render:master` vẫn path cũ. Chốt 1 lệnh.
2. **Review video #1 draft**: `projects/ai-dialogue-therapy/renders/draft_360p.mp4`
   — mở trong Composer (`/editor?project=ai-dialogue-therapy`) hoặc xem mp4
   trực tiếp. Feedback qua UI hoặc chat.
3. **Voice TTS cho video #1**: script có sẵn trong `02-story/story.md` — cần
   ElevenLabs TTS (paid, ~75 words). Bạn duyệt thì tôi generate.
4. **`repurpose` pipeline approval**: transcript → X/blog/shorts.
5. **Multi-doc Studio + anchor editor kéo thả**: cần design session.

## Kết quả đêm

### Phase 0 — Model & VLM setup ✅
- HARNESS_MODEL=openai:glm-5.3-flash qua Zhipu CODING endpoint
  (`open.bigmodel.cn/api/coding/paas/v4` — coding plan của user)
- VLM_PROVIDER=deepseek, VLM_MODEL=deepseek-v4-flash-vision-exp
  (ra 21/08/2026: beats Opus 4.8 trên 3/11 agent benchmarks, ảnh ≤384 tokens)
- Smoke test: agent đọc memory đúng (24 ACTIVE principles), VLM trả lời
  ảnh đúng ("Red")

### Phase 1 — VLM QA pipeline redesign ✅
- **WHERE/WHAT split**: pixel-diff cho WHERE (deterministic), VLM cho WHAT
  (semantic). KHÔNG hỏi VLM bbox (TimeCatch proved unreliable — và DeepSeek
  trả EMPTY trên JSON-structured prompts)
- DeepSeek nhận diện ĐÚNG content thật: "person head", "Text CHOICE",
  "Text CHANGE" — KHÔNG hallucination (glm-4v-flash thấy "owl mask")
- Pipeline: 640×360 native (no upscale), short prompt, natural language
  response parsing, heuristic element_type classification

### Phase 2 — Video #1 "Why AI Dialogue Sounds Like Therapy" ✅
- **ĐÂY LÀ LẦN ĐẦU pipeline chạy full cho video mới** (8 beats, 30s)
- Story + script + EditDoc (8 treatments, style store v73)
- Cold projection: 108 clips, schemaVersion 3, validate PASS
- Cả 2 path render thành công (treatment + editor, draft 360p)
- VLM QA so sánh 2 path: 7/7 regions TRUSTED

### Blockers phát hiện + fix (từ production run thật)
1. **--output relative path**: resolve theo composerRoot thay vì
   workspaceRoot → renders rơi vào `remotion-composer/projects/`. FIXED.
2. **styleLoader delayRender timeout**: default 28s quá ngắn cho render
   30s ở draft quality (multi-tab render queue). FIXED → 300s.

## Còn lại (backlog, không block)

1. **Voice TTS** cho video #1 — chờ user duyệt (ElevenLabs paid)
2. **visual_critique refactor** → vlm_qa pipeline (score-based prompt không
   work với DeepSeek — test skip với NOTE)
3. Parity residuals 4 treatment (2.28-6.3 — sub-pixel nuances)
4. Per-field ledger cho trim/move/nudge (hiện default ['all'])
5. Playwright batch 3
6. Assets cho video #1: hiện dùng character poses có sẵn — cần stock
   images cho treatment host-reflection/cinematic (từ Pexels/Unsplash)
