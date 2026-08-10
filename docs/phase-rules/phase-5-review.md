# Phase 5 — Monthly Review

> **REFERENCE — consult on-demand khi trigger `review`.** Essential rules đã INLINE trong `.kilo/agent/content-manager-agent.md`. File này chứa DETAIL (review template, retention gate, step-by-step). Nếu xung đột, agent body là chuẩn. Monthly, không qua state machine video cụ thể.
> **Mục tiêu:** đo lường + học + điều chỉnh tháng sau. KHÔNG produce content ở đây.

---

## Step 5.1 — Ask for analytics
"Check YouTube Analytics cho 2 videos tháng trước. Report: views, avg view duration %, CTR %, top traffic source."

## Step 5.2 — Retention gate (per video)
- AVD > 50%? → ✅ Repurpose (nếu chưa).
- AVD < 50% nhưng views > channel median? → ✅ Repurpose.
- Cả hai dưới? → ❌ Đừng repurpose, note "weak topic, avoid similar".

## Step 5.3 — Compliance audit (tuỳ chọn, định kỳ)
Audit 30 video gần nhất against 14 rules (`docs/YOUTUBE-AI-COMPLIANCE.md`). Đánh giá rủi ro reused/inauthentic content.

## Step 5.4 — Learnings
```
## 📈 Monthly Review — [Month YYYY]

### Video 1: [title]
- Views: [N] | AVD: [N]% | CTR: [N]%
- Verdict: [performed well / average / underperformed]
- Learning: [what to repeat/avoid]

### Video 2: [title]
- Views: [N] | AVD: [N]% | CTR: [N]%
- Verdict: [...]
- Learning: [...]

### Next month adjustments:
- [adjustment 1]
- [adjustment 2]
```

Save to: `repurpose/newsletters/review-YYYY-MM.md`.

## Khi xong
Báo user: "Review saved. Điều chỉnh tháng sau: [1-2 điểm]. Gõ `plan quý` nếu cần cập nhật plan, hoặc `lên content` cho tháng mới."
