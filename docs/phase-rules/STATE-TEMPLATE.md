# STATE-TEMPLATE — Bộ nhớ chính thức mỗi video

> Copy file này vào `videos/YYYY-MM/NN-slug/00-state.md` khi bắt đầu video mới (file `00-state.md` = tạo đầu tiên, step 1.0).
> Agent đọc file này TRƯỚC khi làm gì. Đây là nguồn sự thật duy nhất về tiến độ — KHÔNG tự đoán từ ngữ cảnh hội thoại.
> Cập nhật NGAY sau mỗi step (đánh ✅, ghi step log, cập nhật next action).

---

## Copy template dưới đây:

```markdown
# State — [video slug]

video: YYYY-MM/NN-short-name
title: "[≤60 chars]"
pillar: [P1 tool-review | P3 craft-analysis]
created: YYYY-MM-DD
updated: YYYY-MM-DD

## Current position
phase: [0-validate | 1-preproduction | 2-production | 3-repurpose | 5-review]
step: [ví dụ: 1.3-comment-mining]
status: [not_started | in_progress | blocked | done]

## Phase gates (điều kiện chuyển phase — KHÔNG skip)
- [ ] **phase-0** validate → scorecard ≥ 25          : [n/a | pending | done(N/50)]
- [ ] **phase-1** research 20+ sources               : [pending | done]
- [ ] **phase-1** analytical framework designed (USER): [pending | done] — CHỈ ✅ khi 02-brief.md đã chứa framework
- [ ] **phase-1** script draft                        : [pending | done]
- [ ] **phase-1** humanize pass                       : [pending | done]
- [ ] **phase-1** compliance "would exist w/o AI?"=yes: [pending | done]
- [ ] **phase-2** production (export 1080p + disclosure): [pending | done]
- [ ] **phase-3** repurpose (transcript-first)        : [pending | done]

> Phase 4 (Publish public) = manual user step giữa phase 2 và 3 — không có gate file.

## Step log (mới nhất trên cùng)
- YYYY-MM-DD step [x.y] [tên] — [done | in_progress | blocked] → [file output nếu có]
- YYYY-MM-DD step [x.y] [tên] — [done] → [file]

## Next action
[1 dòng: làm gì tiếp, đang block bởi gì — VD: "đợi user thiết kế framework (5 criteria) trước khi viết script"]

## Outputs (đường dẫn file đã tạo — đánh số theo thứ tự tạo)
- 00-state:    videos/YYYY-MM/NN-slug/00-state.md
- 01-research: videos/YYYY-MM/NN-slug/01-research.md (hoặc 01-research-*.md)
- 02-brief:    videos/YYYY-MM/NN-slug/02-brief.md
- 03-script:   videos/YYYY-MM/NN-slug/03-script.md
- 04-vo-notes: (pending — phase 2)
- 05-visual-prompts: (pending — phase 2)
- transcript: (pending — phase 3)

## Gate block log (ghi khi bị chặn)
- YYYY-MM-DD: không vào phase-1 script vì gate "framework designed" chưa ✅ → đã báo user.
```

---

## Cách agent dùng file này
1. **Đọc đầu tiên** — xác định phase + step + status hiện tại.
2. **Kiểm tra gate** của phase đang được yêu cầu. Gate chưa ✅ → STOP, báo user.
3. **CONSULT** phase rule file tương ứng phase hiện tại (`docs/phase-rules/phase-{N}-*.md`) — on-demand, essential rules đã inline trong agent body.
4. **Thực thi step** hiện tại. Khi tạo file mới, dùng tên số thứ tự (00/01/02/03/04/05) theo quy ước trong agent body.
5. **Cập nhật** ngay: đánh ✅ gate nếu xong (gate "framework designed" chỉ ✅ khi `02-brief.md` đã chứa framework), ghi step log, cập nhật `updated` + `next action`.
6. Nếu phase xong hết → chuyển `phase` + `status`, báo user phase kế + gate cần qua.
