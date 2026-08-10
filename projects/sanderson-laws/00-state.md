# State — 03-sanderson-laws

video: 2026-08/03-sanderson-laws
title: "Sanderson's 2nd Law + AI: Why AI Magic Systems Have No Limitations"
pillar: P3 craft-analysis
mechanism: "#1 Framework"
script pattern: The Deep Dive
emotional journey: Awe → limitation
created: 2026-08-03

## Current position
phase: 2-production (sanderson-laws compose v10)
step: segment 30s render #2 — flat-bg version, gate 0 FAIL — chờ USER xem mắt
status: TTS ✅ assets ✅ compose v10 ✅ gate runtime 0 FAIL (71 checks)

## Iteration log (vòng lặp 30s @ 360-540p — user rule 2026-08-03)
- 2026-08-04 iter#2 "flat-bg" (vision audit qua text-mosaic, không cần vision model):
  BỎ backdrop xuyên giấy (nền 1 màu phẳng #2D3234, theo ref remotion_vox/JH),
  BỎ accent bar + auto PenArrow, cutout to 56-60% + giữ màu ảnh (saturate 1.2),
  items ≤2 accent/frame. Kết quả gate runtime: freeze 16%, max-freeze 0.7s,
  sharpness 0.018, edge 0.072, saturation 0.123, hue 3.5, grain 0.026, cutout 90% — 0 FAIL.
  Mosaic xác nhận: nền đồng nhất, cutout to giữa, edge tập trung (đúng cấu trúc ref).
- 2026-08-04 iter#1 "8 palette + 3-layer": user chê tệ hơn ai-dialogue — chẩn đoán:
  backdrop translucent = nền bẩn, accent bar to, màu hỗn loạn 4-5/frame, cutout tone
  tím hồng lạ. → iter#2 sửa.
- 2026-08-03: TTS 116 câu $2.12 (497.38s), assets 34 ảnh license 0 FAIL + 15 cutout +
  music 82.55s, compose v10 (70 scenes, 8 palettes, SFX 176 gap 6.89s).

## Phase gates (điều kiện chuyển phase — KHÔNG skip)
- [x] **phase-0** validate → scorecard ≥ 25: demand đã có trong content-plan-Q3-Q4-2026.md (Sanderson 875K subs, zero AI crossover) + research-demand confirm (r/fantasywriters 410↑/181 comments "Have Sanderson's Laws Helped or Hurt New Writers?"; r/WritingWithAI "AI novels start lying to themselves ch.15-20"). Gap: zero video kết hợp Laws × AI (chỉ Nanhara 16 subs về AI art ethics keynote).
- [x] **phase-1** research 20+ sources: DONE — 3 subagents song song (craft / AI behavior / demand), 44+ queries, lưu 01-research-*.md
- [x] **phase-1** analytical framework designed (USER): DONE — user "Duyệt" 2026-08-03; khung "5 chiều Limitation" trong 02-brief.md
- [x] **phase-1** script draft: DONE → 03-script.md (~1000 words, ~7 min @145wpm, host INSIDE)
- [x] **phase-1** humanize pass: DONE — humanizer skill: VO-only score 40 → 2/100 (em dash 29 → ~0, bỏ "here's the thing")
- [x] **phase-1** stance check: DONE — diagnostic 3 đoạn: chủ ngữ chính I/we/you, AI = đối tượng bị test không phải essayist move
- [x] **phase-1** compliance "would exist w/o AI?"=yes: YES — framework user-designed, thesis genuine, AI assist production only
- [ ] **phase-2** TTS batch: pending (8 sections, ElevenLabs, ~$2)
- [ ] **phase-2** timeline + scene plan + compose v10: pending
- [ ] **phase-3** repurpose: pending

## Vòng lặp production (user rule 2026-08-03)
- Viết/plan TOÀN BỘ video (script + timeline + scenes), nhưng **render iteration chỉ 30s @ 360p**
- Gate chạy trên segment 360p (cùng phương pháp đo tham chiếu); master 1080p chỉ khi user duyệt

## Framework proposal (gửi user 2026-08-03 — chờ duyệt)
**Thesis:** "AI magic systems không có limitation — không phải AI dốt, mà vì cơ chế sinh text: mô tả quyền năng nhưng không có gì ENFORCE giới hạn; khi plot cần, luật bị phá (context drift + deus ex machina)."

**5 chiều (mỗi chiều: AI sample ↔ Sanderson canonical ↔ LLM cause ↔ counterexample):**
1. Fuel/Cost — Allomancy đốt kim loại, Awakening rút màu thế giới ↔ AI liệt kê cost rồi quên (ConStory-Bench contradiction @24%→@39%)
2. Weakness/Exploit — Atium shadows cancel, Pewter hết → chấn thương dồn ↔ AI không có weakness bền, kẻ thù không khai thác luật
3. Skill/Knowledge — AonDor vẽ sai 1 nét = hỏng, xa Elantris yếu ↔ AI mọi nhân vật dùng magic ngang nhau
4. Moral/Contract — Surgebinding thề Ideals, phá lời thề = spren chết ↔ AI không bao giờ bị hệ thống phạt vì phá luật
5. Scarcity/Logistics — Atium độc quyền, Stormlight hết trong Weeping ↔ AI tài nguyên vô hạn khi plot cần

Scoring: mỗi chiều 0-5 (mức độ AI "không limitation"), total /25 → chẩn đoán cơ chế.

## Outputs (đánh số theo thứ tự tạo)
- 00-state:     projects/sanderson-laws/00-state.md
- 01-research:  01-research-craft.md + 01-research-ai.md + 01-research-demand.md (3 subagents)
- 02-brief:     (pending — sau framework gate)
- 03-script:    (pending)
