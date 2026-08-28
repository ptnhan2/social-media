# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-29 00:30 (sau session 28/08 toàn ngày). Master list công
> việc: `docs/TODO-NEXT.md` — đọc file ĐÓ trước, file này chỉ là bối cảnh +
> gotchas vận hành.

---

## 🌅 VIỆC TIẾP THEO (session mới)

1. **Đọc `docs/TODO-NEXT.md`** — đầy đủ inventory: 6 quyết user (A1-A6),
   M1b (B1-B3), M2-M4 (C), tech debt (D)
2. Queue mặc định: user quyết A1-A6 → làm M1b (take switcher + QC badge +
   breathPad/ripple)
3. AGENTS.md slim-down đã unblocked (agents verify/ui-probe proven) — D3

## 🌙 TÓM TẮT SESSION 28/08 (cả ngày — nhiều chủ đề)

**Sáng**: máy restart → mở lại servers (langgraph cần PYTHONUTF8=1, crash
emoji logging). Rule #19 (background process). Thành thật về checklist
"PRE-VERIFIED" chưa verify UI → chrome-devtools click-through thật.

**Chiều**: UI verification layers (L0-L5) → rule #20 (DOM oracle, không VLM
cho thứ DOM đo được). ui-audit.mjs (9 checks + multi-viewport + state
navigation + dead-class — từng bắt: marker 2×9px, clip label tràn, Asset
Studio button, contrast hint, transport overflow 768px). Rules #17-18.
Custom agents verify + ui-probe + /handoff + 5 skills. Design-parity skill
(đóng gap rule #16 không trigger). Verify agent dispatch test PASS.

**Tối**: user bắt bug voice panel layout (grid-in-grid) → fix + audit state
gaps. Async-button contract (ImportPanel busy states). Text↔audio consistency
(7/7 match word-level). User regen không nghe khác → điều tra tìm 2 bug:
regen race (text field không gửi đi) + stale public sync → fix cả hai.
**v3 migration** (user directive: v3 là chuẩn, v2 là fossil từ SDK language
kworg bug cũ) — break tags retired, audio tags + CAPS passthrough, WER
normalizer strip tags. Demo A/B: user confirmed "[assertive] + CAPS nghe ra
khác biệt rõ".

## ⚠️ GOTCHAS TÍCH LUỸ (quan trọng nhất)

1. **ElevenLabs v3 là chuẩn** — v2 chỉ khi user yêu cầu. v3 KHÔNG hỗ trợ
   break tags; pause = "..." hoặc [pause]; CAPS nhẹ, **audio tags mạnh**
   ([whisper] [assertive] [excited]...). WER normalizer phải strip [tags].
2. **Regen flow**: UI gửi draftProvider trong POST body (fix race); endpoint
   sync public sau apply (fix stale audio). Luôn verify public mtime.
3. **LangGraph trên Windows**: cần env PYTHONUTF8=1 (crash emoji logging).
4. **Skills/agents mới cần reload window** mới vào registry (hot-load báo
   "No context found for instance" — quirk, không phải lỗi file).
5. **Audit UI phải cover STATE**: dùng --click "<aria-label>" — bug layout
   thường chỉ render trong state tương tác (bài học voice panel).
6. **Vite publicDir = remotion-composer/public** — preview fetch mọi media
   từ đó; audio/voice/assets sync qua sync-project-public.mjs.
7. **Scribe transcribe không đọc punctuation** — so sánh word-level sau khi
   strip (norm) nếu không muốn false mismatch.

## 📌 GHI NHỚ

- Check CI sau MỖI push (đang xanh trên b389a52)
- Ma trận verify V1-V8 nằm trong agent `.kilo/agent/verify.md`
- Style store v74 (fonts Anton/Inter/Lora), editor doc rev cao (voice regens)
- Beat-05 đang giữ bản [assertive] + CAPS trên timeline (demo state)
- Composer: http://localhost:5174/editor?project=ai-dialogue-therapy
