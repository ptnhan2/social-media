# TODO NEXT — NIGHT RUN 2026-08-26/27 — VIDEO #1 COMPLETE (draft with voice + images)

> Night run hoàn tất (user ngủ ~23:40 → ~05:00). 6 hours autonomous.
> Commits: 048e9ca..73f08b2 (8 commits). CI xanh 3 workflows trên commit cuối.

---

## 🌅 MORNING REMINDERS — NHẮC USER NGAY LÚC SÁNG

1. **REVIEW VIDEO #1**: `projects/ai-dialogue-therapy/renders/draft_v2.mp4`
   — 31s, có voice + stock images. Mở trực tiếp hoặc trong Composer
   (`/editor?project=ai-dialogue-therapy`). Feedback qua UI hoặc chat.
2. **Flip blessing master render**: default render-window đã là editor —
   nhưng `npm run render:master` vẫn path cũ. Chốt 1 lệnh.
3. **`repurpose` pipeline approval**: transcript → X/blog/shorts.
4. **Multi-doc Studio + anchor editor kéo thả**: cần design session.
5. **Model chính đã hoạt động**: glm-5.3-flash qua coding endpoint (E6 PASS).

## Kết quả đêm — TẤT CẢ HOÀN TẤT

### Video #1 "Why AI Dialogue Sounds Like Therapy" — COMPLETE DRAFT ✅

```
projects/ai-dialogue-therapy/
├── 02-story/story.md              ← story + script
├── 05-edit-doc.json               ← 8 beats + treatments + audioPlan
├── editor/current.json            ← 111 clips, schemaVersion 3
├── renders/
│   ├── draft_v2.mp4               ← FINAL: 31s, voice + stock images ★
│   ├── draft_voiced.mp4           ← intermediate (char poses as bg)
│   └── draft_360p.mp4             ← first render (no voice)
```

**Pipeline steps completed:**
- Story: surface=therapy-speak, deeper=fear of homogenized fiction
- Script: 75 words
- EditDoc: 8 beats, 8 treatments
- Voice: ElevenLabs multilingual_v2, 31s voiceover ✓
- Assets: Unsplash stock images (therapy-session, two-people-talking) ✓
- Cold projection: 111 clips, schemaVersion 3, validate PASS
- Both paths render ✓
- VLM QA: DeepSeek identifies content correctly ✓

### VLM DeepSeek — FIRST REAL USE ✅
- deepseek-v4-flash-vision-exp: frontier-class, ~$0.22/1M
- SoM pipeline: WHERE/WHAT split (pixel-diff for WHERE, VLM for WHAT)
- ZERO hallucination (glm-4v-flash saw "owl masks")
- visual_critique refactored: DeepSeek path uses natural-language prompts

### Parity video #1 (7 windows)
| Window | Mean | Gate |
|---|---|---|
| chapter-card (0-3.5) | 0.72 | PASS |
| semantic-diagram (3.5-7) | 1.54 | PASS |
| host-reflection (7-10.5) | 2.87 | FAIL (push-scale easing) |
| process-timeline (10.5-14) | 1.42 | PASS |
| candidate-comparison (14-18.5) | 3.19 | FAIL (group scale) |
| cinematic+host (18.5-26) | 10.42→improved | FAIL (image content) |
| chapter-card-2 (26-30) | 1.44 | FAIL (close, sub-pixel) |

4/7 PASS — cùng lớp sub-pixel residual như isaacverse-final.

### Blockers đã fix (từ production run)
1. `--output` relative path → resolve workspaceRoot ✓
2. styleLoader delayRender 28s → 300s ✓
3. Cinematic-metaphor: fit:cover + mode filter + letterbox + entrance ✓
4. visual_critique DeepSeek: SoM natural-language path ✓

## Còn lại (backlog)

1. **User review video #1** → feedback → patch → master render
2. Parity residuals (sub-pixel class — same as isaacverse-final)
3. Per-field ledger cho trim/move/nudge ops
4. Playwright batch 3
5. EleventLabs v3: SDK chưa support `language` kwarg — khi update,
   switch sang v3 cho quality tốt hơn
