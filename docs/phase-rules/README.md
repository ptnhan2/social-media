# Phase Rules — Reference cho Content Production

> **Essential rules + state machine nằm INLINE trong `.kilo/agent/content-manager-agent.md`** (auto-load chắc chắn mọi session — agent không bị "phế"). Các file `phase-*.md` trong folder này là **REFERENCE tra cứu on-demand** (bảng dài, ví dụ, settings, step-by-step) — agent mở khi thực thi step cụ thể. State machine + `00-state.md` mỗi video là fix chính cho "lúc nhớ lúc quên".

## Tại sao kiến trúc này
- Trước đây: toàn bộ rule trong 1 agent đơn khối (589 dòng) → dilution + không ép trình tự → "lúc nhớ lúc quên" + skip bước.
- Kilo KHÔNG có conditional auto-load (xem section "Cơ chế load" cuối file). Auto-load chắc chắn = all-or-nothing; command/Read = on-demand không chắc (và command cần user gõ thủ công — agent không tự gọi được).
- → Giải pháp: essential rules + state machine **inline** (chắc chắn) + chi tiết tham khảo **reference on-demand** + **00-state.md + gate** ép trình tự.

## 5 nguyên tắc (agent tuân theo, đã inline trong agent body)
1. Mỗi video có `00-state.md` trong `videos/YYYY-MM/NN-slug/` — nguồn sự thật duy nhất về tiến độ.
2. Agent **ĐỌC 00-state.md TRƯỚC** khi làm gì. Phase + step hiện tại lấy từ đó, KHÔNG tự đoán.
3. **CONSULT** `phase-{N}-*.md` của phase hiện tại khi cần chi tiết (bảng/ví dụ/settings). Essential rules đã có inline sẵn.
4. Mỗi phase có gate. Gate chưa ✅ → STOP, báo user hoàn thành prerequisite.
5. Hoàn thành step → cập nhật 00-state.md (checklist + step log + next action) **NGAY**, không chờ.

## Phase map
| Phase | File | Trigger vào | Gate để QUA phase này |
|---|---|---|---|
| 0 — Validate | `phase-0-validate.md` | `plan quý`, `validate [topic]` | scorecard ≥ 25 (Produce/Priority) |
| 1 — Pre-production | `phase-1-preproduction.md` | `lên content` | framework designed (user) + "exist w/o AI?" = yes + humanize pass |
| 2 — Production | `phase-2-production.md` | (sau phase-1) | video exported 1080p + disclosure toggle set + ≥1 non-AI visual |
| 3 — Repurpose | `phase-3-repurpose.md` | `repurpose` | transcript available + (nếu đã publish) AVD check |
| 5 — Review | `phase-5-review.md` | `review` | — (monthly, không qua state machine video) |

## File index
- `STATE-TEMPLATE.md` — template cho `00-state.md` mỗi video (copy khi tạo video mới)
- `phase-0-validate.md` — quarterly planning + 5-stage validation + scorecard
- `phase-1-preproduction.md` — research (subagents) + competitor + hook + framework + script + humanize + compliance
- `phase-2-production.md` — voiceover + visuals + assembly + export
- `phase-3-repurpose.md` — X thread + newsletter + blog + Reddit + shorts notes
- `phase-5-review.md` — monthly analytics + retention gate + learnings

## Utility flows (KHÔNG qua state machine)
- `devlog` — daily git log → post (ngắn, không gây dilution → giữ inline trong orchestrator)
- `check` / `status` — đọc tất cả `00-state.md` + report (chính là state reporter)

## Khi 00-state.md chưa tồn tại (video cũ / folder có sẵn)
Nếu folder video đã có file (research.md, brief.md...) nhưng chưa có 00-state.md → agent **suy luận ngược** từ file nào tồn tại, tạo 00-state.md với phase phù hợp, rồi tiếp tục bình thường. Ví dụ: có research.md + brief.md nhưng chưa script.md → phase 1, step "script draft".

## Quan hệ với n8n (tương lai, tuỳ chọn)
Lớp 1-2 này là "state machine thủ công" — rẻ, giải quyết ~70% vấn đề. Nếu sau này cần ép buộc cứng hơn (không thể skip vật lý) + form human-in-the-loop bắt buộc → bọc 3-4 gate cao-leverage (validation / framework form / compliance / repurpose) bằng n8n, gọi các phase-agent focused ở mỗi node. Không cần migrate toàn bộ.

## Cơ chế load (đã verify qua kilo-config — kiến trúc cuối cùng)

> **Kilo KHÔNG có conditional auto-load.** Mọi cơ chế auto-load chắc chắn (agent body, `instructions` glob, AGENTS.md) đều all-or-nothing (load toàn bộ). Command/skill/Read là on-demand — không chắc, và command cần user gõ thủ công (agent KHÔNG tự gọi command được).

**Kiến trúc đã chọn (1 đường duy nhất, không cần manual):**

| Nội dung | Nơi | Auto-load? |
|----------|-----|-----------|
| Essential rules + state machine + gates + utility flows | **INLINE trong `.kilo/agent/content-manager-agent.md`** (agent body) | ✅ Chắc chắn, mọi session |
| Chi tiết tham khảo (bảng dài, ví dụ, settings, step-by-step) | `docs/phase-rules/phase-*.md` | ❌ Agent CONSULT on-demand khi thực thi step |
| Bộ nhớ mỗi video (phase/step/gate) | `videos/.../00-state.md` | ❌ Agent Read đầu tiên theo protocol inline |

→ Agent KHÔNG bị "phế": essential rules + state machine luôn auto-load trong agent body. Phase files là "sách tra" — agent mở khi cần chi tiết cụ thể (bảng scorecard, 12 KTTV techniques, settings ElevenLabs...), đúng lúc thực thi step đó.

**Fix chính cho "lúc nhớ lúc quên"** = state machine + 00-state.md (agent biết đang ở đâu + gate ép trình tự), KHÔNG phải tách file. Tách file từng gây vấn đề load (rule không auto-load) → đã đảo ngược: essentials inline, detail làm reference.

**Đã bỏ:** `.kilo/command/` (user không gõ slash command, agent không tự gọi được) + `instructions` glob trong kilo.json (trùng lặp với inline).
