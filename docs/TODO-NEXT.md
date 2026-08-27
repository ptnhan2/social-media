# TODO NEXT — SESSION 2026-08-27 — PHASE 1 SHIPPED, PHASE 2 SPEC READY

> **Phase 1 (lấp nền) HOÀN TẤT 27/08**: typography foundation live — Anton/
> Inter/Lora thay 47 chỗ hardcode. Font là KNOB (store v74). Parity PASS +
> cải thiện. **Font A/B chạy qua agent loop LẦN ĐẦU** (run_task.py, KEEP gate
> thật): Anton giữ, agent tự diagnose candidate-B confound → rule mới trong KB.
>
> **Phase 2 SPEC VIẾT XONG chiều 27/08**: `docs/PIPELINE-PRODUCTION-SPEC.md`
> (DRAFT v1) — 5 production pipelines dạng stages + QC gates + provenance +
> learning hooks (không phải 1-hàm-1-tool — user correction). Chờ user duyệt
> spec → implement M1 (voice core) trước vì VO là đồng hồ của video.

---

## 🚨 BÀI HỌC CHỐT (từ user, 27/08)

1. **Tự đặt mình vào user position**: trước khi đề xuất user làm gì thủ công,
   tự hỏi "hệ thống có tool tự động việc này chưa?"
2. **User feedback = raw material cho learning loop, KHÔNG phải QA step**
3. **Đừng hỏi permission những thứ đã có gate pass**
4. **Nền phải đẹp trước khi improve** — video #1 "TỆ" vì nền xấu (Arial +
   CSS glow + stock), không phải vì thiếu critique loop
5. **Harness = refinement-only** (11 tool critique/fix, zero tool produce) —
   video #1 do Kilo làm tay. Phase 2 = lấp production capability.

## Đã ship — Phase 1 foundation (27/08 chiều)

| Việc | Bằng chứng |
|---|---|
| Font files (OFL): Anton, Inter variable, Lora italic | `remotion-composer/public/fonts/` |
| `fontFaces.ts` — @font-face + FontFaces (delayRender) + fontStack/resolveFontFamily | role-based: display/body/editorial |
| 47 chỗ Arial/Georgia → role fonts (2 render paths) | treatments.tsx + treatmentElements.ts |
| Fonts là KNOB: `fonts.display/body/editorial` + charEm calibration | style store v74 + snapshot |
| Legacy clip metadata live-adopt new fonts (không cần regenerate) | resolveFontFamily map "Arial..." → role |
| Explicit lineHeight mọi top-anchored stacks (font-independent layout) | kicker 1.4222, title 1.4087/1.4222, label 1.44... |
| Parity gates | sd 1.064 PASS (baseline 1.222), pt 0.964 PASS (baseline 1.266) |
| Fonts proven loading | Anton vs Archivo render diff 17.98 |
| VLM verify | "condensed, bold, legible, punchy" trên video #1 |
| **FIX test_unit.py destructive restore** | tests dùng `git checkout` đã WIPE store chưa commit → giờ byte-exact restore, verified non-destructive |
| Reviewer subagent | 1 MAJOR (BeatElementOverlay raw font) + 6 MINOR — ALL fixed |

**Video #1 re-render với nền mới**: `projects/ai-dialogue-therapy/renders/draft_v3_fonts.mp4`
**Font candidates cho user taste gate**: `projects/isaacverse-final/renders/windows/font-candidate-{anton,archivo}.mp4`

## VIỆC TIẾP THEO

### 0. Phase 2 — duyệt spec + implement
Spec: `docs/PIPELINE-PRODUCTION-SPEC.md` (DRAFT v1, có progress log traceability).
- M1 voice pipeline (batch-per-beat, direction→text-prep, sample gate,
  QC WER/clip/duration, timing coupling, post 2-pass loudnorm)
- M2 image sourcing → M3 timeline/validate/scaffold → M4 mix-plan
- Phát hiện: `tools/audio/isaacverse_voice.py` TỒN TẠI (plan/generate/
  assemble/score) — spec EXTEND, không rebuild. Bugs: directive extract
  nhưng KHÔNG áp vào text; batch không theo beat; thiếu QC/timestamps/
  timing-coupling.

### 1. User taste gate (MỘT lần duy nhất — legitimate)
User xem 2 candidates (Anton vs Archivo Black) → chốt display font.
Anton là default hiện tại. Nếu đổi: update `fonts.display` knob + recalibrate
`fonts.displayCharEm` (Anton 0.56, Archivo ~0.68) + parity re-run chapter-card.

### 2. Phase 1 phần còn lại (design tokens + asset cohesion)
- Type scale / spacing tokens hoá (nếu cần)
- Unified grade cho stock images (một hệ filter duy nhất)
- Backlog: PropertiesPanel font select hiển thị role strings (UI polish)

### 3. Phase 2 — Production capability (session tiếp)
Tools mới vào harness_tools.py: `new_project`, `source_image` (Unsplash +
provenance), `generate_voice` (ElevenLabs), `generate_timeline` (wrap
generate-editor cold), `validate_edit_doc`. Protocol v5 thêm production loop.
Acceptance: agent produce mini video 10-15s từ topic prompt, zero bước tay.

### 4. Phase 3 — Loop thật
Agent tự produce video từ zero trên nền mới → tự critique → tự fix → iterate
→ user review MỘT lần. Video #1 cũ thành throwaway bootstrap.

## Backlog

- Parity residuals (host-reflection 6.3 — pre-existing, mixBlendMode class)
- Per-field ledger cho trim/move/nudge
- PropertiesPanel fontFamily select (role-aware)
- repurpose pipeline, Multi-doc Studio — sau Phase 2-3

## Vận hành mới

```powershell
# Đổi display font (knob, live-propagate mọi project):
#   update_style "fonts.display" "'Archivo Black', sans-serif"
#   + recalibrate fonts.displayCharEm + parity chapter-card re-run

# Font candidates đã render:
#   projects/isaacverse-final/renders/windows/font-candidate-anton.mp4
#   projects/isaacverse-final/renders/windows/font-candidate-archivo.mp4

# Video #1 với nền mới:
#   projects/ai-dialogue-therapy/renders/draft_v3_fonts.mp4
```

## Servers
- Composer UI: http://localhost:5174 (persistent)
- LangGraph agent: port 2025 (persistent)
