# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-27 ~18:00. Phase 1 (foundation) SHIPPED — fonts live.
> **CRITICAL DIRECTION (sáng 27/08): produce → TỰ critique → TỰ fix → TỰ
> re-render → lặp → CHỈ show user khi quality ổn. User KHÔNG phải QA.**
> Chi tiết: `docs/TODO-NEXT.md` (file này đọc sau TODO-NEXT).

---

## 🌅 VIỆC TIẾP THEO (session sau)

1. **User taste gate fonts**: user xem font-candidate-anton vs -archivo →
   chốt display font (Anton là default). Nếu đổi → update knob + recalibrate
   displayCharEm + parity chapter-card.
2. **Phase 1残余**: asset cohesion (unified grade), type tokens nếu cần.
3. **Phase 2 — production tools** (xem TODO-NEXT §3): new_project,
   source_image, generate_voice, generate_timeline, validate_edit_doc.
4. **Phase 3 — loop thật**: agent tự produce từ zero → tự critique → tự fix
   → user review MỘT lần.

## 🌙 TÓM TẮT 27/08

- **Sáng — 2 corrections từ user**: (1) flow "produce → nhường user QA" SAI;
    tự critique bằng harness tools. (2) Đừng hỏi permission cho decisions đã
    có gate. Video #1 "TỆ" vì nền xấu (Arial + glow + stock).
- **Trưa — phân tích nền**: 47 chỗ font hardcode, không fonts section trong
    store, CSS-glow idiom, stock dán full-frame. Harness = refinement-only
    (zero production tools) — video #1 do Kilo làm tay.
- **Chiều — Phase 1 SHIPPED**: Anton/Inter/Lora qua `fontFaces.ts` role-based
    (display/body/editorial = knobs, store v74). Legacy clip metadata live-adopt.
    Explicit lineHeight mọi top-anchored stacks. Parity PASS + cải thiện
    (sd 1.064, pt 0.964). Fonts proven loading. VLM verify "punchy".
- **Incident + fix**: test_unit.py restore bằng `git checkout` WIPE store chưa
    commit (v74 fonts biến mất giữa session) → root cause: tests chạy trên
    state thật + git-checkout restore. FIX: byte-exact save/restore + snapshot
    cleanup; verified non-destructive (34/34, files+snapshots unchanged).
- **Reviewer subagent**: 1 MAJOR (BeatElementOverlay raw fontFamily — canvas
    override path) + 6 MINOR — all fixed (lineHeight emission, Lora weight
    range 100 900, charEm 0.63 consistency, rollback test editor-doc restore).

## 🔧 VẬN HÀNH

```powershell
# Composer UI (:5174 — persistent)
cd remotion-composer\composer-app; npx vite --port 5174 --strictPort

# LangGraph agent (:2025 — persistent)
harness\.venv\Scripts\python.exe -m langgraph_cli dev --port 2025 --host 127.0.0.1

# Render (default editor path)
node remotion-composer\scripts\render-window.mjs --project ai-dialogue-therapy --start 0 --end 31 --quality draft

# Parity measurement (windows chuẩn: sd 3.5-7, pt 10.5-14)
node remotion-composer\scripts\parity-measure.mjs --project isaacverse-final --start 3.5 --end 7 --label semantic-diagram
```

## ⚠️ GOTCHAS MỚI

1. **Fonts là knobs**: đổi font qua `update_style "fonts.display" ...` —
   KHÔNG sửa code. Đổi display font ⇒ recalibrate `fonts.displayCharEm`
   (Anton 0.56 / Archivo ~0.68 / Arial Black 0.65) + parity re-run.
2. **⚠️ KHÔNG BAO GIỜ restore bằng `git checkout` trong tests/scripts** khi
   working tree có thể dirty — đã wipe store v74 một lần (27/08). Dùng
   byte-exact save/restore.
3. **DeepSeek VLM**: trả EMPTY trên complex JSON prompts — SHORT natural
   language prompts.
4. **7-10.5 window là host-reflection** (label "process-timeline" sai từ
   trước) — residual 5.9-6.3 pre-existing, không phải regression.
5. **`--output` relative**: resolve workspaceRoot — KHÔNG dùng `../`.
6. **Vite publicDir = remotion-composer/public** (không phải composer-app/
   public) — fonts/styles serve từ đó trong preview.
7. **Pexels API 401** — dùng Unsplash. **eleven_v3 SDK** thiếu language kwarg
   — dùng multilingual_v2.

## 📌 GHI NHỚ

- Check CI sau MỖI push
- Style store v74 (fonts section), schemaVersion 3, E6 PASS 7/7
- Parity chuẩn: sd 1.064 / pt 0.964 / host-reflection 6.3 (pre-existing)
- Video #1 nền mới: `projects/ai-dialogue-therapy/renders/draft_v3_fonts.mp4`
