# Pattern Learning + Eval Implementation Spec

> **STATUS: READY FOR IMPLEMENTATION** — viết 2026-08-22 đêm, cho session
> xuyên đêm sau compact. Đọc file này ĐẦU TIÊN, rồi đọc TODO list ở §6,
> rồi làm tuần tự. Không cần hỏi user — mọi quyết định thiết kế đã chốt.
>
> **Mục tiêu đêm nay**: xây 2 hệ thống (Pattern Learning + Eval) và test
> end-to-end với 1 principle thật. Sáng user dậy thấy kết quả.

---

## 1. CONTEXT — tại sao xây cái này

### Vấn đề đã chứng minh (bằng dữ liệu, không phỏng đoán)

1. **Knob A/B testing là đường chết**: các style knobs chỉ chỉnh thông số vi
   mô (±2px, ±5% brightness) → user không thấy khác biệt → vote là nhiễu →
   không học được gì. Đã test 6+ VLM configs — không cái nào đánh giá được
   global changes (brightness/zoom/motion).

2. **User muốn tiến về Isaac style** — khoảng cách là THIẾT KẾ (typography,
   màu sắc, organic lines, narrative approach), không phải thông số vi mô.

3. **User KHÔNG thể duyệt text principles** — "tôi đọc không hiểu, chả biết
   AI đang học từ cái gì". Quyết định của user phải TRỰC QUAN (A/B renders).

4. **Không có eval** → không biết agent đang thông minh lên hay ngu đi.

### Giải pháp được duyệt (từ chat với user 2026-08-22)

**Pattern Learning (3 phases)**: user góp ý ít lần đầu → agent học PATTERN
góp ý (không chỉ fix đơn lẻ) → agent tự tạo self-check checklist → dần tự
chủ, user can thiệp ít dần.

**Eval qua LangSmith native**: KHÔNG tự build eval script riêng — dùng
datasets + experiments + evaluators + annotation queues có sẵn trong
LangSmith. Mỗi thay đổi = 1 experiment → so sánh experiments → thấy tiến bộ
hay thụt lùi bằng số.

---

## 2. KIẾN TRÚC TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────┐
│                    LEARNING LOOP                             │
│                                                              │
│  INPUT                    AGENT (Ox Alpha)                  │
│  ┌──────────┐            ┌──────────────────────┐           │
│  │ User     │            │ 1. Extract principle │           │
│  │ feedback │───────────▶│ 2. Scan treatments   │           │
│  │ (hiếm)   │            │ 3. Fix violations    │           │
│  └──────────┘            │ 4. QA gates          │           │
│  ┌──────────┐            │ 5. Render            │           │
│  │ Isaac    │───────────▶│ 6. Eval scorecard    │           │
│  │ reference│            └──────────┬───────────┘           │
│  │ (53 cand)│                       │                        │
│  └──────────┘                       ▼                        │
│                            ┌──────────────┐                  │
│                            │ LANGSMITH    │                  │
│                            │ Eval + Trend │                  │
│                            └──────┬───────┘                  │
│                                   │                          │
│                                   ▼                          │
│  ┌──────────────────────────────────────────┐                │
│  │ USER REVIEW (1 lần, tổng thể)             │                │
│  │ "Đúng hướng" → principle CONFIRMED       │                │
│  │ "Chưa đúng"  → 1 góp ý nữa → loop lại    │                │
│  └──────────────────────────────────────────┘                │
│                                                              │
│  PATTERN LEARNING (nền tảng):                                │
│  Phase 1: user drives (2-3 sessions)                        │
│  Phase 2: agent recognizes patterns (5-10 feedbacks)        │
│  Phase 3: agent self-evaluates (autonomous)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. PATTERN LEARNING MECHANISM (3 PHASES)

### 3.1 Principle Schema (mới — thay cho format cũ)

Mỗi principle trong `taste-standard.md` có cấu trúc:

```json
{
  "id": "typo-001",
  "principle": "All text elements use bold weight (900+) with visual effects",
  "scope": "global",              // "global" | "treatment:<name>" | "category:<type>" | "one-time"
  "category": "typography",        // "typography" | "color" | "composition" | "motion" | "pacing" | "narrative"
  "direction": "bolder+effects",   // hướng user muốn (bias direction)
  "source": "user:2026-08-22",    // provenance
  "confidence": "high",            // "high" (≥3 consistent signals) | "medium" (2) | "low" (1)
  "verified": 0,                   // số lần cycle pass với principle này
  "rejected": 0,                   // số lần cycle fail/reject
  "promoted": false                // true khi verified ≥ 2 → thành chuẩn thật
}
```

**Scope levels:**
- `global`: áp dụng MỌI treatment, MỌI video
- `treatment:chapter-card`: chỉ áp dụng ChapterCard
- `category:text`: áp dụng mọi element có chữ (across treatments)
- `one-time`: fix cụ thể, không generalize

### 3.2 Feedback Pattern Store — `memories/feedback-patterns.json`

Agent tự trích xuất meta-patterns từ lịch sử feedback:

```json
{
  "patterns": [
    {
      "category": "typography",
      "mention_count": 4,
      "consistent_direction": "bolder+bigger",
      "bias": "always prefer bold typography, larger sizes",
      "confidence": "high",
      "last_mentioned": "2026-08-22",
      "auto_check": "verify all text elements have fontWeight >= 900 and visual effects"
    },
    {
      "category": "color",
      "mention_count": 3,
      "consistent_direction": "more-vivid+higher-contrast",
      "bias": "always prefer vivid, saturated colors with high contrast",
      "confidence": "high",
      "auto_check": "verify color saturation > 60%, contrast ratio > 4:1"
    },
    {
      "category": "pacing",
      "mention_count": 0,
      "bias": null,
      "confidence": "none",
      "note": "user never mentioned pacing — current pacing meets standard"
    }
  ],
  "last_updated": "2026-08-22",
  "total_feedback_sessions": 3
}
```

### 3.3 Self-Check Checklist — agent tự sinh

Agent tạo checklist từ patterns → chạy trước khi đề xuất bất kỳ thay đổi nào:

```
SELF-CHECK CHECKLIST (auto-generated from feedback patterns):
  [HIGH] Typography: all text bold (900+) with effects? ← from 4 mentions
  [HIGH] Colors: vivid, saturated, high contrast? ← from 3 mentions
  [MED]  Lines: organic curves, not mechanical? ← from 2 mentions
  [LOW]  Narrative: character tells story? ← from 1 mention
  [NONE] Audio: user never mentioned → skip check
```

Agent chạy checklist này:
- Trước khi propose bất kỳ treatment change
- Sau khi apply bất kỳ principle
- Khi tạo treatment mới

### 3.4 Three-Phase Learning Progression

**Phase 1 — User drives (sessions 1-3):**
- User gives explicit feedback on multiple aspects
- Agent extracts principles, stores with scope/category
- Agent applies to all affected treatments
- User reviews result → confirms or adjusts
- Agent records: aspect, direction, element scope, user's exact words

**Phase 2 — Agent recognizes patterns (after 5-10 feedbacks):**
- Agent runs pattern extractor on feedback history
- Identifies: which categories user cares about, which direction, how consistently
- Generates meta-patterns → self-check checklist
- Agent starts PROACTIVELY checking (before user asks)
- User involvement decreases: agent flags violations, proposes fixes, user just confirms

**Phase 3 — Agent self-evaluates (autonomous):**
- Agent runs self-check checklist on EVERY new/modified treatment
- High-confidence patterns → agent fixes automatically, no user needed
- Medium-confidence → agent fixes, flags for user spot-check
- Low-confidence → agent asks user (rare)
- User only sees final renders, not intermediate steps

**Transition between phases:**
- Phase 1 → 2: when total feedback count ≥ 5 AND ≥ 2 categories have consistent direction
- Phase 2 → 3: when ≥ 3 categories have HIGH confidence AND ≥ 2 principles verified

### 3.5 Principle Classification Rules

When user gives feedback, agent classifies it:

| User says | Scope | Category | Generalizes? |
|---|---|---|---|
| "Typography quá mỏng" | global (category:text) | typography | YES — all text |
| "ChapterCard title cần gradient" | treatment:chapter-card | color | YES — all ChapterCard renders |
| "Node thứ 3 đặt sai chỗ" | one-time | composition | NO — specific fix |
| "Màu nhấn cần rực hơn" | global (category:color) | color | YES — all accents |

Rules:
- If user mentions a CATEGORY (typography, color, lines) → scope = global or category
- If user mentions a SPECIFIC treatment → scope = treatment:<name>
- If user mentions a SPECIFIC element/instance → scope = one-time
- Agent declares its classification → user corrects at next review if wrong

---

## 4. EVAL IMPLEMENTATION (LangSmith Native)

### 4.1 Architecture — use LangSmith, NOT custom scripts

**KHÔNG build** eval_style.py hay bất kỳ custom eval script riêng.
**DỰNG TRÊN** LangSmith native infrastructure:

```
LangSmith Project: isaacverse-harness
├── Dataset: isaacverse-design-quality (NEW)
│   ├── Test case: "Apply typography principle → check compliance"
│   ├── Test case: "Apply color principle → check compliance"
│   ├── Test case: "Render segment → verify style properties"
│   └── (grows over time as failures are added)
│
├── Evaluators:
│   ├── Code evaluator: check principle compliance (deterministic)
│   ├── LLM-as-judge: aesthetic quality scoring (uses Gemini free)
│   └── Composite: weighted overall quality score
│
├── Online Evaluators (production monitoring):
│   ├── Auto-score every cycle trace
│   └── Track quality trend over time
│
├── Annotation Queues:
│   ├── Route low-scoring renders to user review
│   └── User feedback → calibrate evaluators + add to dataset
│
└── Comparison View:
    ├── Experiment N-1 vs N → improvement or regression?
    └── Trend chart → agent getting smarter over time?
```

### 4.2 Extend eval.py — add design quality test cases

Add to the existing dataset (isaacverse-harness-evals):

```python
# Design quality test cases (NEW)
examples += [
    {
        "inputs": {
            "query": "Apply the principle 'all text bold with effects' to all treatments. Read taste-standard.md for the principle, scan treatments.tsx for violations, fix them.",
        },
        "outputs": {
            "expected_tools": ["read_file", "edit_file"],
            "category": "design_quality",
            "checks": [
                "all_text_elements_have_fontWeight_900_or_higher",
                "all_text_elements_have_visual_effects (stroke/gradient/shadow)",
            ],
        },
    },
    {
        "inputs": {
            "query": "Check current render compliance with taste-standard principles. Read taste-standard.md, render segment 0-7s, verify style properties.",
        },
        "outputs": {
            "expected_tools": ["read_file", "render_window"],
            "category": "design_quality",
            "checks": [
                "accent_area_percentage <= 10",
                "title_to_subtitle_ratio >= 1.5",
            ],
        },
    },
]
```

### 4.3 Add design quality evaluators

```python
# Code evaluator: check principle compliance from style store
def eval_principle_compliance(inputs, outputs, reference_outputs):
    """Check if the style store values comply with approved principles."""
    style = json.loads(Path("libraries/04-visual/isaacverse-style.json").read_text(encoding="utf-8-sig"))
    violations = []
    
    # Check typography principle
    sd = style["treatments"]["semantic-diagram"]
    if sd["title"]["fontWeight"] < 900:
        violations.append(f"semantic-diagram title fontWeight={sd['title']['fontWeight']} < 900")
    
    # Check accent area (from rendered frame)
    # ... PIL analysis
    
    return {
        "key": "principle_compliance",
        "score": 1 if not violations else 0,
        "comment": f"Violations: {violations}" if violations else "All principles satisfied"
    }

# LLM-as-judge: aesthetic quality (using Gemini 3 Flash free tier)
def eval_aesthetic_quality(inputs, outputs, reference_outputs):
    """LLM judge: does the render match Isaac's aesthetic direction?"""
    # Uses GOOGLE_API_KEY for Gemini 3 Flash (free tier)
    # Sends rendered frame + Isaac reference frame → "which is closer to the reference style?"
    pass
```

### 4.4 Set up online evaluators (LangSmith UI)

Configure in LangSmith UI → isaacverse-harness project → Evaluators tab:

**Online Evaluator 1: Principle Compliance (Code)**
- Type: Code evaluator
- Runs on: every trace (100%)
- Check: after each cycle, verify style store values comply with principles
- Score: 1 if compliant, 0 if violations

**Online Evaluator 2: Render Quality (LLM-as-judge)**
- Type: LLM-as-judge
- Runs on: 50% of traces (sampling to control cost)
- Model: gemini-3-flash-preview (free tier)
- Prompt: "Score this video frame's aesthetic quality 0-1 based on: typography boldness, color vibrancy, contrast, composition"

**Online Evaluator 3: Overall Quality (Composite)**
- Type: Composite
- Components: principle_compliance (weight 0.4) + render_quality (weight 0.6)
- Purpose: single metric for trend dashboard

### 4.5 Annotation queues for user review

Instead of custom HTML pages (learning-browser, vote_session):

1. LangSmith UI → Annotation Queues → Create "render-review" queue
2. Route: renders with quality score < 0.7 → added to queue
3. User reviews in LangSmith UI: sees render, rates, comments
4. Feedback → flows back into eval calibration + principle tallies

This replaces:
- learning-browser.html (browse what AI learned)
- vote_session.py (A/B voting)
- Custom review pages

All user review happens in ONE place: LangSmith UI.

### 4.6 Trend tracking — the "is agent getting smarter?" answer

After each experiment:
1. LangSmith automatically compares with previous experiment
2. Scores shown side-by-side: improved (green) / regressed (red)
3. Trend chart: quality score over time
4. If trend DECREASES → agent is getting worse → investigate
5. If trend INCREASES → agent is learning → confirmed

This answers: "làm sao để biết agent đang thông minh lên hay ngu đi?"

---

## 5. INTEGRATION — how pattern learning + eval work together

```
Pattern Learning System                    Eval System (LangSmith)
─────────────────────────                 ─────────────────────────
User feedback → extract principle    →    Principle becomes test case in dataset
Agent applies principle to code      →    Experiment runs → compliance check
Agent self-checks (from patterns)    →    Online evaluator scores production traces
User reviews result                  →    Annotation queue feedback → calibrate evaluators
Pattern recognized → self-check      →    Eval dataset grows → regression testing improves
```

**The flywheel:**
1. User feedback → principle → applied to code → eval verifies → score recorded
2. Next cycle → agent checks score → if regression → auto-revert → user notified
3. Over time: more principles → higher scores → agent more autonomous
4. Eval trend chart PROVES the system is improving

---

## 6. IMPLEMENTATION TODO LIST (ordered, with dependencies)

### Phase A: Foundation (do first — everything depends on this)

- [ ] **A1. Update taste-standard.md schema** — rewrite CANDIDATE entries with new fields (scope, category, direction, confidence, verified, rejected, promoted). Keep existing content, add structure.
  - File: `harness/memories/taste-standard.md`
  - Depends on: nothing
  - Test: parse with json to verify structure

- [ ] **A2. Update AGENTS.md protocol** — replace the old knob-tweak protocol with the principle-based improvement process. Include:
    - How to extract principles from user feedback
    - How to scan treatments for violations
    - How to apply principles (edit treatment code)
    - How to run QA gates
    - How to use the self-check checklist
    - The 3-phase learning progression
  - File: `harness/memories/AGENTS.md`
  - Depends on: nothing

- [ ] **A3. Change treatment code permissions** — from `deny` to `interrupt` in agent.py
  - File: `harness/agent.py` line ~130
  - Already partially done (the edit was applied earlier but session was interrupted)
  - Verify: agent.py compiles

### Phase B: Pattern Learning System

- [ ] **B1. Build pattern extractor** — script/middleware that reads feedback.jsonl + preferences.jsonl → extracts meta-patterns → writes feedback-patterns.json
  - File: `harness/pattern_extractor.py` (NEW)
  - Input: `harness/memories/feedback.jsonl` + `harness/memories/preferences.jsonl`
  - Output: `harness/memories/feedback-patterns.json`
  - Logic: group by category, count mentions, extract consistent direction, compute confidence
  - Depends on: A1 (schema)

- [ ] **B2. Build self-check generator** — reads feedback-patterns.json → generates checklist for the agent
  - Can be part of pattern_extractor.py or separate
  - Output: appended to AGENTS.md or as a separate file the agent reads
  - Depends on: B1

- [ ] **B3. Wire pattern learning into agent** — agent reads feedback-patterns.json at cycle start, uses self-check checklist
  - File: `harness/agent.py` (add to memory list or system prompt)
  - File: `harness/memories/AGENTS.md` (protocol references the checklist)
  - Depends on: A2, B2

### Phase C: Eval Implementation (LangSmith native)

- [ ] **C1. Extend eval.py dataset** — add design quality test cases to isaacverse-harness-evals
  - File: `harness/eval.py`
  - Add: test cases for principle compliance, render quality
  - Depends on: A1 (schema defines what to test)

- [ ] **C2. Add design quality evaluators** — code evaluator for principle compliance + LLM-as-judge for aesthetic quality
  - File: `harness/eval.py`
  - Code evaluator: reads style store, checks values against principles
  - LLM-as-judge: uses Gemini 3 Flash (free, GOOGLE_API_KEY in .env) to compare renders against Isaac reference
  - Depends on: C1

- [ ] **C3. Set up online evaluators** — configure in LangSmith UI (or via API)
  - LangSmith UI → isaacverse-harness project → Evaluators tab
  - Add: principle compliance (code), render quality (LLM-as-judge), overall quality (composite)
  - Depends on: C2

- [ ] **C4. Set up annotation queue** — for user review of renders
  - LangSmith UI → Annotation Queues → create "render-review"
  - Route: traces with quality score < 0.7
  - Depends on: C3

### Phase D: End-to-End Test

- [ ] **D1. Test with one real principle** — give the agent a real task:
  ```
  Task: "Read taste-standard.md. Apply the principle 'all text elements use bold weight 900+ with visual effects (stroke/gradient/shadow)' to ALL treatments in treatments.tsx. Run QA gates after."
  ```
  - Verify: agent reads principle → scans code → identifies violations → edits → QA passes
  - This tests the ENTIRE pipeline end-to-end
  - Depends on: A1-A3, B1-B3, C1-C2

- [ ] **D2. Verify eval catches regression** — intentionally break a principle, run eval, verify it catches the violation
  - Depends on: D1, C1-C2

- [ ] **D3. Verify trend tracking** — run eval twice (before and after a fix), verify comparison shows improvement
  - Depends on: D1, C1-C2

---

## 7. REFERENCES

### Key files and their roles

| File | Role |
|---|---|
| `harness/agent.py` | Deep Agents assembly — Ox Alpha model, tools, permissions, middleware |
| `harness/harness_tools.py` | All agent tools (render, style, compare, pairwise, request_keep) |
| `harness/memories/AGENTS.md` | Agent's brain — protocol, rules, process |
| `harness/memories/taste-standard.md` | Accumulated principles (CANDIDATE + APPROVED) |
| `harness/memories/knowledge-base.md` | Experiment history (agent reads before cycles) |
| `harness/memories/oracle-trust.md` | VLM trust zones (AUTO/ASK per aspect) |
| `harness/memories/preferences.jsonl` | Raw vote log (immutable) |
| `harness/memories/feedback.jsonl` | User feedback notes |
| `harness/memories/wishlist.md` | Desires not expressible with current knobs |
| `harness/memories/feedback-patterns.json` | Meta-patterns extracted from feedback (NEW — to build) |
| `harness/memories/tutorial-candidates.json` | 53 Isaac principles from 3 videos |
| `harness/eval.py` | LangSmith eval (to be extended with design quality) |
| `harness/calibrate.py` | VLM-vs-user agreement measurement |
| `harness/tally_principles.py` | Vote → principle tallies |
| `libraries/04-visual/isaacverse-style.json` | Style store (all knobs) |
| `remotion-composer/shared/isaacverse/treatments.tsx` | Treatment code (agent can now edit) |
| `docs/GENERATOR-SPEC.md` | Generator architecture spec (E2-E6, separate session) |
| `docs/TASTE-AND-LEARNING-ROADMAP.md` | Overall roadmap (P1-P6) |
| `docs/EVOLUTION-HARNESS-ISAACVERSE.md` | Direction document (chốt 2026-08-15) |

### Model configuration

| Purpose | Model | Endpoint | Key env var |
|---|---|---|---|
| Main agent (reasoning + code) | `stealth/ox-alpha` | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| Visual critique + pairwise | `qwen3-vl-plus` | DashScope China | `DASHSCOPE_API_KEY` |
| Eval judge | `glm-4-flash` | `open.bigmodel.cn` | `OPENAI_API_KEY` |
| Aesthetic comparison (free) | `gemini-3-flash-preview` | Google AI Studio | `GOOGLE_API_KEY` |

⚠️ Ox Alpha vision is UNVERIFIED (test showed "White" for orange square). 
Do NOT send images to Ox Alpha. Use separate VLM for visual tasks.

### Known issues and gotchas

1. **DashScope China endpoint**: frequently times out from Vietnam. If VLM calls fail, retry or switch to Zhipu.
2. **Ox Alpha is a stealth model**: anonymous developer, could disappear. Have fallback (glm-4-plus) ready.
3. **Treatment code edits**: ALWAYS run QA gates (typecheck + render + pixel-diff) after any edit. Never commit without QA passing.
4. **Style store**: verify baseline after any experiment. Known leaked values from dead runs: damping=22, amber=#ffb84b, filter brightness.
5. **LangSmith API**: use `reference_example=[ex.id]` (list, not string) for run queries. Session-based queries need valid session IDs.
6. **Concurrent writes**: NEVER run gap-fill and ingest simultaneously (race condition lost video 06 data once).
7. **eval.py judge**: prompt must use `{inputs}`/`{outputs}` (NOT `{inputs[query]}`) + `use_reasoning=False` for glm models.

### User's 5 design feedback points (the wishlist driving this work)

1. Typography quá mỏng → cần dày + hiệu ứng chữ (stroke, gradient, shadow)
2. Lines vuông vức → cần organic curves, brush strokes
3. Màu đơn sắc → cần gradients, color transitions
4. Show information → cần narrative (character tells story)
5. Màu mờ mờ nhợt nhạt → cần high contrast, vivid, eye-catching

These 5 points = the FIRST principles the agent should implement via the new process.

---

## 8. SUCCESS CRITERIA (how to know it works)

After tonight's implementation, the following should be TRUE:

1. Agent can edit treatments.tsx (permission changed from deny to interrupt)
2. Agent can extract a principle from user feedback text
3. Agent can scan all treatments and find violations of that principle
4. Agent can write code fixes for all violations
5. QA gates catch any breakage
6. Eval scorecard shows: N principles satisfied / M total
7. Trend tracking shows: improvement or regression vs previous state
8. All of this happens WITHOUT the user reviewing each step

If any of these fail → document what failed → leave for morning discussion.

---

## 7. REFERENCE: How LangSmith eval works (quick summary)

```
DATASET (test cases)
  ├── Example 1: {inputs: {...}, outputs: {expected: ...}}
  ├── Example 2: ...
  └── Example N: ...

EXPERIMENT (one run of agent against dataset)
  ├── Run 1: agent processes example 1 → output → evaluator scores
  ├── Run 2: ...
  └── Run N: ...

EVALUATORS (scoring functions)
  ├── Code evaluator: deterministic checks (Python/JS)
  ├── LLM-as-judge: model scores output against rubric
  ├── Pairwise: human compares two outputs
  └── Composite: weighted combination

COMPARISON (across experiments)
  ├── Experiment v1 vs v2 → side-by-side scores
  ├── Regression detection: score dropped → red flag
  └── Trend chart: quality over time

ONLINE EVALUATORS (production monitoring)
  ├── Auto-run on every production trace
  ├── Code: deterministic safety/quality checks
  ├── LLM-as-judge: reference-free quality scoring
  └── Composite: dashboard metric

ANNOTATION QUEUES (human review)
  ├── Route low-scoring traces to human
  ├── Human rates/comments → feedback data
  └── Calibrates evaluators + builds ground truth
```

Full docs: https://docs.langchain.com/langsmith/evaluation
Deep Agents eval examples: https://github.com/langchain-ai/deepagents/tree/main/libs/evals
LangSmith guided tour: https://github.com/langchain-samples/langsmith-guided-tour
