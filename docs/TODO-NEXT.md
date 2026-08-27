# TODO NEXT — SESSION 2026-08-27 SÁNG — CRITICAL DIRECTION CORRECTION

> User correction sáng 27/08 (quan trọng nhất từ trước đến nay): flow
> "produce → nhường user review" là SAI. Flow đúng: **produce → TỰ critique
> → TỰ fix → TỰ re-render → LẶP → chỉ show user khi quality ổn**.
> Harness có đủ tools (VLM critique, agent protocol, style knobs) — dùng chúng.
> User KHÔNG phải QA department của hệ thống mình build.

---

## 🚨 BÀI HỌC CHỐT (từ user, 27/08 sáng)

1. **Tự đặt mình vào user position**: Trước khi đề xuất user làm gì, tự hỏi
   "nếu tôi là user, tôi có muốn làm việc này thủ công không khi hệ thống
   có tools để tự động?"
2. **User feedback = raw material cho learning loop, KHÔNG phải QA step**.
   Video tệ → agent tự critique → tự fix. User chỉ thấy kết quả cuối.
3. **Đừng hỏi permission những thứ không cần permission** (flip master render
   là ví dụ — gate pass + tests pass + CI xanh = tự quyết).

## Trạng thái hiện tại

### Video #1 "Why AI Dialogue Sounds Like Therapy"
- `projects/ai-dialogue-therapy/renders/draft_v2.mp4` — 31s, voice + stock images
- **User verdict: TỆ** — và đó là đúng (chưa chạy critique loop lần nào)
- **CHƯA TỰ CRITIQUE**: tôi produce xong là nhảy sang "user review" — sai flow
- VLM critique đang chạy dở (beat-by-beat self-critique)

### Đã flip (không cần hỏi)
- Master render: `npm run render:master` giờ dùng `--path editor`
- Commit: `aad6e8a` (pushed)

### Đã config (đêm 26-27)
- Model: `openai:glm-5.3-flash` qua Zhipu coding endpoint
- VLM: `deepseek-v4-flash-vision-exp` (frontier, ~$0.22/1M)
- VLM pipeline: WHERE/WHAT split, SoM, natural-language prompts
- visual_critique refactored cho DeepSeek

## VIỆC TIẾP THEO (sau compact)

### 1. HOÀN TẤT self-critique loop cho video #1 (ưu tiên #1)
```
a. Chạy beat-by-beat VLM critique (8 beats, score + problems)
b. Agent đọc critiques → extract principles
c. Agent fix treatments/style knobs
d. Re-render → critique lại → lặp
e. CHỈ show user khi score ổn (≥3.5/5 hoặc user thấy ổn)
```
Script critique đang dở — chạy lại từ đầu.

### 2. Fix các vấn đề mà VLM critique sẽ phơi ra
Dự kiến (từ visual_critique ban đầu):
- Text quá nhỏ trong candidate-comparison
- Chapter-card có thể đơn điệu
- Cinematic-metaphor image content chưa match
- Timing/pacing cần điều chỉnh

### 3. E6 agent loop: dùng CHO video #1
Thay vì chỉ chạy E6 test fixture — dùng agent protocol v5 THẬT:
critique → principle → fix → qa_gate → request_keep (user chỉ duyệt kết quả)

## Còn lại (backlog)

- Parity residuals (sub-pixel — sau khi video #1 chất lượng ổn)
- Per-field ledger cho trim/move/nudge
- Playwright batch 3
- repurpose pipeline (user: "hệ thống còn chưa chất lượng đâu" — đúng)
- Multi-doc Studio + anchor editor (session sau)

## Servers đang chạy
- Composer UI: http://localhost:5174 (vite, persistent)
- LangGraph agent: port 2025 (persistent)
