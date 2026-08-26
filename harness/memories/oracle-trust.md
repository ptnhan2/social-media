# Oracle Trust — AUTO/ASK zones + VLM task routing

> Updated 2026-08-26 (PIPELINE-HARDENING-SPEC §3.4 — research-backed redesign).
> Previous: calibrate.py auto-generated zones (limited data, all ASK).
> Citations: TimeCatch (arXiv 2608.23474), TimeBlind (arXiv 2602.00288),
> REVEAL (arXiv 2602.11244), SoM (arXiv 2310.11441), GCoT (CVPR 2026),
> Visual Thoughts (NeurIPS 2025).

## Task routing — cái gì VLM làm, cái gì KHÔNG

| Task | Hỏi VLM? | Tool | Auto? |
|---|---|---|---|
| Element có/không trong vùng (presence) | ✓ SoM + bbox | VLM + IoU verify | AUTO được |
| Nội dung text (OCR) | ✓ | VLM + IoU verify | AUTO được |
| Màu / hình dạng / loại element | ✓ | VLM + IoU verify | AUTO được |
| Vùng nào khác nhau (localization) | ✗ | pixel-diff region-block (vlm_qa._region_block_diff) | AUTO |
| Có thay đổi motion không (detection) | ✗ | temporal frame-diff profile (compare_renders) | AUTO |
| Motion đẹp/xấu (temporal judgment) | ✗ — VLM gần random (TimeCatch: 57% max; TimeBlind: 48% vs 98% human) | HUMAN | ASK luôn |
| Composition đẹp/xấu (aesthetic) | ✗ | HUMAN | ASK luôn |
| "Hai frame khác gì?" (spot-the-diff) | ✗ TUYỆT ĐỐI KHÔNG | deterministic + SoM→semantic | — |

**Nguyên tắc cốt lõi:** VLM mạnh ở FRAME-LEVEL semantic (nhận diện có/không,
OCR, màu, hình dạng) và YẾU ở TEMPORAL (so sánh thứ tự, motion, spot-the-diff).
Đừng hỏi VLM câu mà nó đã biết yếu rồi đổ lỗi "VLM nhiễu" — lỗi nằm ở prompt
design, không phải model.

## VLM prompt template (grounded + structured — KHÔNG free-form)

```
System: "You are a precise visual QA analyst. You MUST ground every claim
in a bounding box. If you cannot locate an element, output 'not_found'. Never guess."

User: [marked_image with numbered regions]
"I numbered the N regions with the largest pixel differences between
these two frames (LEFT = version A, RIGHT = version B). For EACH numbered
region, output JSON on one line:
{"region": <number>, "element_type": "text|image|shape|character|empty",
 "present_in": "left_only|right_only|both",
 "bbox": [x1, y1, x2, y2],
 "semantic_note": "<1 short sentence>"}
Rules:
- bbox in pixels of the frame (1920x1080)
- If you cannot see the element in a region, bbox = null + semantic_note = 'not_found'
- Do NOT describe regions that were not numbered"
```

**Kỹ thuật:**
1. **Set-of-Mark** (SoM): overlay SỐ lên các vùng thay đổi (từ pixel-diff)
   → tham chiếu rời rạc thay vì mơ hồ (GPT-4V+SoM vượt fine-tuned specialist)
2. **Grounded CoT**: bắt buộc bbox trong output → hallucination lộ (GCoT:
   answer-grounding consistency chỉ 15-36% nếu không grounding-first)
3. **Structured visual thoughts**: JSON fields > free-form; concise > verbose
4. **IoU verification**: compare VLM bbox với pixel-diff region → IoU > 0.3
   mới tin; thấp → flag unreliable → defer human

## VLM config

- **Frontier API** (GPT-5 / Gemini-3-Pro / Claude Opus 4.5) qua OpenRouter —
  KHÔNG chạy model local ( kém hơn frontier nhiều, không lý do chạy local)
- glm-4v-flash (Zhipu) — fallback rẻ cho task presence đơn giản
- Provider chain: _call_vlm trong harness_tools.py (auto-fallback)

## Pipeline implementation

`harness/vlm_qa.py` — module đầy đủ:
1. _extract_frame: ffmpeg trích frame tại sampled time
2. _region_block_diff: PIL numpy chia ô 64×36, tính % đổi
3. _som_overlay: PIL draw số + rectangle lên vùng thay đổi (×3 upscale)
4. _build_prompt: grounded structured prompt template
5. _parse_response: parse JSON-per-line → attach regions
6. _iou: intersection-over-union VLM bbox vs diff region
7. vlm_qa: orchestrate toàn pipeline → structured report

## AUTO/ASK zones (từ calibrate.py — giữ cho reference)

| Aspect | Votes | Agreement | Wilson 95% | Zone |
|---|---|---|---|---|
| color | 1 (+2 ties) | 0/1 (0%) | [0%, 79%] | ASK |
| motion | 0 (+4 ties) | 0/0 (0%) | [0%, 0%] | ASK (PROVISIONAL) |
| text | 1 (+0 ties) | 0/1 (0%) | [0%, 79%] | ASK |

## Rules

- AUTO requires N >= 10 votes AND lower Wilson bound >= 80%.
- Recalibrate: every 20 cycles, on VLM model change, or when a spot check disagrees.
- Every 5th AUTO decision still surfaces as a spot-check vote (keeps data flowing).
- Never trust cross-call absolute scores; pairwise verdicts only.
- **VLM pipeline (vlm_qa.py)**: only trusted when IoU > 0.3; untrusted → defer human.
- **NEVER ask VLM spot-the-diff** — use the pipeline (deterministic detect → SoM → semantic ask).
