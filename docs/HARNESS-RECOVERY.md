# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-27 ~13:50. Previous: night run 26-27.
> **CRITICAL DIRECTION: user đã chỉnh flow — produce → TỰ critique → TỰ fix
→ TỰ re-render → lặp → CHỈ show user khi quality ổn. User KHÔNG phải QA.**
> Chi tiết: `docs/TODO-NEXT.md` (file này đọc sau TODO-NEXT).

---

## 🌅 VIỆC TIẾP THEO (session sau — NGAY SAU COMPACT)

1. **HOÀN TẤT self-critique loop cho video #1** — script đang dở, chạy lại:
   - Beat-by-beat VLM critique (8 beats × score + problems)
   - Agent đọc critiques → extract principles
   - Agent fix treatments/style knobs
   - Re-render → critique → lặp đến khi ổn
   - CHỈ show user khi score ≥3.5/5 hoặc ổn

2. **Dùng E6 agent loop THẬT** cho video #1 (không chỉ fixture test):
   critique → principle → fix → qa_gate → request_keep

3. Fix mọi gap mà self-critique phơi ra

## 🌙 TÓM TẮT ĐÊM 26-27 + SÁNG 27/08

- **Video #1 "Why AI Dialogue Sounds Like Therapy" PRODUCED**: 31s, voice
  (ElevenLabs), stock images (Unsplash), 8 beats × 8 treatments
- **User verdict: TỆ** — đúng, vì chưa chạy critique loop lần nào
- **Flow bị user chỉnh**: produce xong không nhường user QA — TỰ critique
  bằng harness tools, tự fix, chỉ show khi ổn
- Master render flipped to editor path (`aad6e8a`)
- Model: glm-5.3-flash (coding endpoint), VLM: DeepSeek-V4-Flash-Vision-Exp
- VLM pipeline: WHERE/WHAT split, SoM, natural-language — ZERO hallucination
- visual_critique refactored cho DeepSeek
- CI xanh 3 workflows trên commit cuối

## 🔧 VẬN HÀNH

```powershell
# Composer UI (:5174 — đang chạy persistent)
cd remotion-composer\composer-app; npx vite --port 5174 --strictPort

# LangGraph agent (:2025 — đang chạy persistent)
harness\.venv\Scripts\python.exe -m langgraph_cli dev --port 2025 --host 127.0.0.1

# Self-critique một video (VLM beat-by-beat)
# → dùng visual_critique tool + vlm_qa pipeline (harness/vlm_qa.py)

# Render (default giờ là EDITOR path)
node remotion-composer\scripts\render-window.mjs --project ai-dialogue-therapy --start 0 --end 31 --quality draft

# Parity measurement
node remotion-composer\scripts\parity-measure.mjs --project ai-dialogue-therapy --start 3.5 --end 7
```

## ⚠️ GOTCHAS MỚI

1. **DeepSeek VLM**: trả EMPTY trên complex JSON prompts — dùng natural
   language short prompts (đã refactor visual_critique + vlm_qa)
2. **eleven_v3 SDK**: chưa support `language` kwarg → fallback multilingual_v2
3. **--output relative path**: resolve workspaceRoot (đã fix)
4. **styleLoader delayRender**: 300s timeout (đã fix)
5. **Pexels API**: 401 Unauthorized (key expired?) — dùng Unsplash thay thế
6. **Vite port 5174**: Test-NetConnection có thể báo False nhưng HTTP 200 OK

## 📌 GHI NHỚ

- Check CI sau MỖI push
- E6 protocol hoạt động (PASS 7/7 với glm-5.3-flash)
- Style store v73, 40 principles, schemaVersion 3
- Video #1 parity: 4/7 PASS (sub-pixel residuals)
