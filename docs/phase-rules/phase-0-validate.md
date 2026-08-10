# Phase 0 — Validate & Quarterly Planning

> **REFERENCE — consult on-demand khi thực thi step phase 0.** Essential rules đã INLINE trong `.kilo/agent/content-manager-agent.md` (auto-load mọi session). File này chứa DETAIL (5-stage validation, scorecard table, title patterns, step-by-step). Nếu xung đột, agent body là chuẩn. Global rules (compliance, ngôn ngữ, self-improve) xem agent body.
> **Gate ra:** scorecard ≥ 25 (Produce/Priority). < 25 → Kill/Save, không cho qua phase 1.
> **Triggers:** `plan quý` (lập quý), `validate [topic]` (check nhanh 1 topic).

---

## FLOW A: Quarterly Planning (`plan quý`)

### Step 0.1 — Ask
"Planning cho quý nào? (VD: Q3 2026 = tháng 7, 8, 9)"
Ask: "Bạn muốn review tool nào / analyze novel nào? Hoặc tôi tự pick từ title bank?"

### Step 0.2 — Pick 8 topics/tháng (×3 tháng = 24, rotating pillars P1+P3)
Read `docs/CONTENT-CALENDAR.md` title bank. Pick topics, ask user confirm. Cadence = 8 videos/tháng (2/tuần) theo `BATCH-CONTENT-WORKFLOW.md`.

### Step 0.3 — Validate demand mỗi topic (20-30 min/topic)
> Research-based, 25+ sources. See `docs/RESEARCH-VALIDATION-METHODOLOGY.md` + `docs/BATCH-CONTENT-WORKFLOW.md` Phase 0.

**5-stage validation:**

**a) Search Demand Verification (5 min)**
- YouTube autocomplete: gõ topic vào YouTube search bar. Topic trong top suggestions = demand thật.
- Wildcard `*` trước/sau keyword để tìm biến thể.
- Alphabet trick: `topic a`, `topic b`, `topic c` để tìm tất cả variants.
- Dùng browser (Playwright) — `webfetch` không works (YouTube render JS).

**b) Competitor Analysis (10 min)**
Search YouTube via browser. 5-10 top results, thu thập:

| Video | Views | Channel subs | Outlier score | Why it worked | Gap |
|-------|-------|-------------|---------------|---------------|-----|

- **Channel subs**: bắt buộc — view counts vô nghĩa nếu không biết channel size.
- **Outlier score = Video views ÷ Channel median views** (median, not average). 2x = chú ý, 3-5x = signal mạnh, 10x+ = deep analysis.
- **Mid-sized channel test**: 10K-100K sub hit 50K+ views thường xuyên = demand thật. Chỉ mega-channels = saturated.
- **Why it worked**: format? title pattern? thumbnail style? timing? personality?

> "A 1M-view video on a 10M-sub channel is NOT an outlier. A 50K-view video on a 5K-sub channel IS a 10x outlier — this is the gold." — OverseerOS

**c) Google Trends — YouTube Search mode (5 min)**
- Switch "Web Search" → "YouTube Search" (critical — most people miss this).
- Timeframe 5 năm để thấy seasonality. Compare 2-5 terms. Check "Rising" related queries.
- Note: chỉ 0-100 relative index, KHÔNG cho absolute volume.

**d) Content Gap Analysis (5 min)**
Identify 1 trong 4 gap types: missing question (comment lặp) / weak comparison / audience segment bị bỏ / format gap (sai format).

**e) Scorecard (2 min)** — score 0-5 mỗi category, total 0-50:

| Category | Question |
|----------|----------|
| Viewer clarity | How specific is the target viewer? |
| Pain/desire strength | How urgent is the problem? |
| Demand evidence | Competitor breakouts + search data |
| Search potential | Search intent + volume match |
| Suggested/browse potential | Curiosity gap + visual click potential |
| Title potential | Can write 5-10 strong title options? |
| Thumbnail potential | Visual tension, mobile readability |
| Retention potential | Natural structure, payoff, rewatch hooks |
| Differentiation | Hard-to-copy angle |
| Channel fit | Pillar alignment, positioning |

| Score | Decision |
|-------|----------|
| 0-15 | Kill |
| 16-24 | Save for later |
| 25-32 | Needs sharper angle |
| 33-40 | Produce |
| 41-50 | Priority |

**Validation Scorecard output:**
```
Topic: [topic]
YouTube autocomplete: ✅/❌
Competitor analysis: top views [N]K | top outlier [N]x on [N]K-sub channel
Google Trends (YouTube Search): rising/flat/declining
Content gap: [1 sentence — which of 4 gap types]
Scorecard: [N]/50 → [Kill/Save/Sharpen/Produce/Priority]
VERDICT: [validated / needs pivot / weak demand]
```

### Step 0.4 — Write title + thumbnail concept
Apply title patterns (study pattern, don't copy):

| Pattern | Template |
|---------|----------|
| Study-based proof | "I Studied [N] [X]. Here's What I Found" |
| Challenge | "I Tried [X] for [Time]" |
| Contrarian | "Why [X] Is [Unexpected]" |
| Mechanism reveal | "The Hidden System Behind [X]" |
| Mistake audit | "[N] [Mistakes] [Keeping You X]" |

Thumbnail concept (1 sentence, NOT design): VD "Before/after: messy AI prose vs polished output".

> "Build packaging BEFORE script. Title + thumbnail = creative target." — overseeros.com

### Step 0.5 — Save plan
Save to: `content-plan-Q[X]-2026.md` (template xem `docs/BATCH-CONTENT-WORKFLOW.md`).
Report: "Quarterly plan saved với [N] validated topics. Gõ `lên content` để bắt đầu pre-production tháng đầu."

> Phase 0 không tạo state.md (chưa có video cụ thể). Khi `lên content` pick 1 topic → tạo folder + state.md ở phase 1.

---

## FLOW B: Quick Validation (`validate [topic]`)
Condensed version của Step 0.3 cho 1 topic:
1. **YouTube autocomplete**: browser search, wildcard + alphabet trick.
2. **Competitor check**: 5-7 results với views + channel subs. Outlier = views ÷ median.
3. **Google Trends**: YouTube Search mode. rising/flat/declining + related queries.
4. **Content gap**: 1 trong 4 gap types.
5. **Scorecard**: 0-50. < 25 = don't produce.

Output:
```
## Validation: [topic]
| Signal | Result |
|--------|--------|
| Autocomplete | ✅/❌ |
| Top competitor views | [N]K on [N]K-sub channel |
| Top outlier score | [N]x (strong/weak) |
| Google Trends (YouTube) | rising/flat/declining |
| Content gap | [type: 1 sentence] |
| Scorecard | [N]/50 → [decision] |
VERDICT: [validated / pivot / weak]
```

## Phase-0 decision rules (áp dụng tại đây)
- **Validate before script**: KHÔNG script video nào chưa check demand (autocomplete + competitors + trends).
- **Packaging before script**: title + thumbnail + hook quyết TRƯỚC khi viết outline.
- Dùng sub-agents song song cho research nặng (20+ query, mỗi query nhiều bài).
