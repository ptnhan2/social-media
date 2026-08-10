# Phase 3 — Repurpose

> **REFERENCE — consult on-demand khi thực thi step phase 3.** Essential rules đã INLINE trong `.kilo/agent/content-manager-agent.md`. File này chứa DETAIL (output templates, spacing rules, step-by-step). Nếu xung đột, agent body là chuẩn. Làm việc từ TRANSCRIPT, KHÔNG rewatch video.
> **Gate vào:** transcript available (user upload YouTube Private → copy từ Studio → Subtitles). Nếu đã publish: AVD check (retention gate).
> **Gate ra:** tất cả output đã save theo cấu trúc folder.

---

## Step 3.1 — Get transcript
Ask user: "Upload video lên YouTube as Private chưa? Vào YouTube Studio → Subtitles → copy transcript paste vào đây. Hoặc paste script outline."

## Step 3.2 — Retention gate (nếu video đã publish + có analytics)
- AVD > 50%? → ✅ Repurpose.
- AVD < 50% nhưng views > channel median? → ✅ Repurpose.
- Cả hai dưới? → ❌ Đừng repurpose, note "weak topic, tránh similar".

## Step 3.3 — Generate outputs từ transcript

**X Thread (5-8 tweets):**
- Tweet 1 = same hook as video.
- Mỗi tweet < 280 chars.
- Mỗi tweet MUST stand alone (không earn được quote-tweet → cut).
- Tweet cuối = CTA + video link.

**Newsletter section:**
- Lead = insight DIDN'T make video (cut content is gold).
- Structure: 1 paragraph hook (cut insight) → 3-5 bullets → 1 paragraph "what I'd do differently".
- End với video link.

**Blog post (1500-3000 words):**
- Same title as video.
- Expand outline thành paragraphs. H2/H3 cho SEO + keywords từ validation.
- Add internal links.

**Reddit post:**
- Genuine value, NO product link (first 3 months).
- Share insight, ask community for take.

**Shorts notes (nếu chưa cut):**
- List 3-5 timestamp moments từ transcript.
- Suggest hook line cho mỗi cái.

## Step 3.4 — Save all
```
repurpose/x-threads/YYYY-MM-DD-short-name.md
repurpose/blog-posts/YYYY-MM-DD-short-name.md
repurpose/reddit-posts/YYYY-MM-DD-short-name.md
repurpose/newsletters/YYYY-MM-DD.md
repurpose/shorts-notes/YYYY-MM-DD-short-name.md
```

## Step 3.5 — Output publish schedule
```
## 📦 Repurposing Complete — [Video Title]
| Platform | File | Publish when |
|----------|------|--------------|
| X Thread | repurpose/x-threads/... | Thu (same week as video) |
| Newsletter | repurpose/newsletters/... | Fri |
| Blog | repurpose/blog-posts/... | Sat |
| Reddit | repurpose/reddit-posts/... | Sat |
| Shorts 1-3 | (already cut) | Tue, Wed, Fri (spaced 5-7 days) |
```

## Phase-3 decision rules (áp dụng tại đây)
- **Transcript-first**: mọi repurpose output từ transcript, KHÔNG rewatch video.
- **Shorts spacing**: 5-7 days apart, KHÔNG cùng ngày. (Short 1: Day+1, Short 2: Day+4, Short 3: Day+7. Cùng file → YouTube Shorts + TikTok + IG Reels.)
- **Newsletter = cut content**: lead với insight không có trong video.
- **Retention gate**: chỉ repurpose video >50% AVD hoặc trên median views.
- **Reddit**: KHÔNG link product trong 3 tháng đầu.
- **Each X tweet standalone**: không earn được quote-tweet alone → cut.

## Khi xong
Cập nhật `00-state.md`: gate phase-3 ✅, `status: done`, `next action` = "publish theo schedule. Cuối tháng gõ `review`."
