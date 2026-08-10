# Phase 1 — Pre-Production (Research → Framework → Script)

> **REFERENCE — consult on-demand khi thực thi step phase 1.** Essential rules đã INLINE trong `.kilo/agent/content-manager-agent.md` (auto-load mọi session). File này chứa DETAIL (research angles, competitor table, hook types, framework gate, 12 KTTV techniques, humanize CLI, step-by-step). Nếu xung đột, agent body là chuẩn. Đây là phase lớn nhất + compliance nặng nhất.
> **Gate vào:** phase-0 validate ✅ (scorecard ≥ 25). Nếu chưa → "Chưa validate. Gõ `validate [topic]` hoặc `plan quý` trước."
> **Gate ra:** research done (20+ sources) + framework designed (USER) + documented in `02-brief.md` + script draft + humanize pass + "would exist w/o AI?"=yes.
> **Trigger:** `lên content` / `tháng này`.

---

## Step 1.0 — Setup: quarterly plan + folder + `00-state.md`
1. Check `content-plan-Q[X]-2026.md` tồn tại. Không → "Chưa có quarterly plan. Gõ `plan quý` trước." → STOP.
2. Đọc plan, extract 8 topics tháng hiện tại (2/tuần, rotating pillars).
3. Check `videos/YYYY-MM/` — skip topic đã drafted (đọc `00-state.md` của nó).
4. Với topic mới: tạo folder `videos/YYYY-MM/NN-short-name/` + copy `docs/phase-rules/STATE-TEMPLATE.md` → `00-state.md` (file đầu tiên, đánh số 00) — điền video/title/pillar.
5. Cập nhật `00-state.md`: `phase: 1-preproduction`, `step: 1.1-research`, `status: in_progress`.

## Step 1.1 — Research (sub-agents song song — 20+ sources minimum)
> **CRITICAL**: Trước khi viết ANY script, launch 3-5 sub-agents song song research khác hướng. Mỗi sub-agent 20+ query, nhiều bài/query. Total 100+ sources/video.

**5 research angles (chạy parallel sub-agents):**
1. **Craft theory**: expert nói gì về craft principle này? (Sanderson lectures, writing books, Hello Future Me, academic literary theory)
2. **AI behavior**: AI thực sự xử lý thế nào? (ACL papers, arXiv, NC Bench, model docs, community tests)
3. **Community pain points**: writer thật nói gì? (Reddit r/WritingWithAI, r/writing, forums, YouTube comments — exact quotes + upvote counts)
4. **Existing content**: YouTube video nào tồn tại? Views, gaps, thiếu gì?
5. **Real examples**: ví dụ cụ thể từ books, AI outputs, comparisons — concrete evidence.

**Mỗi sub-agent return:**
- Key findings + exact quotes + named sources.
- Specific data points (numbers, %, study results).
- Contradictions giữa sources (tension = script material).
- Gaps: nguồn NÀO cũng không cover.

**Agent compile** thành 1-page research brief → save `01-research.md` (hoặc `01-research-*.md` nếu split theo angle) → RỒI mới sang script.
Cập nhật `00-state.md`: gate "research 20+ sources" ✅.

## Step 1.2 — Competitor Research (20 min/video)
Browser (Playwright) search YouTube topic. 5-7 competitor videos. Mỗi cái note:

| Video | Views | Channel subs | Outlier score | Why it worked | Gap we can beat |
|-------|-------|-------------|---------------|---------------|-----------------|

- **Channel subs**: bắt buộc — view counts vô nghĩa nếu không biết channel size.
- **Outlier = Video views ÷ Channel median views** (median). 3-5x = strong signal, 10x+ = deep analysis.
- **Why it worked**: format? title? thumbnail? timing? personality?
- Analyze channels 2-3x your size — mega-channels không dạy gì works ở scale của bạn.
- Tìm outliers: small channels breakout = gap tồn tại ở scale bạn.

## Step 1.3 — Comment Mining (10 min/video)
Đọc comments top 3-5 competitor video. Tìm:
- Repeated questions → video opportunity.
- Complaints thiếu detail → your gap.
- "Does this work for [X]?" → niche demand.
- "This is outdated" → make updated version.

## Step 1.4 — Hook Design (10 min/video)
Chọn 1 hook type:

| Type | Example |
|------|---------|
| Result-first | "This AI tool wrote 10,000 words of coherent fiction. Here's how." |
| Mistake-first | "Most novelists use AI writing tools completely wrong." |
| Contrast | "Two authors used Sudowrite. One got garbage. One got a bestseller." |
| Countdown | "5 features that make or break AI writing tools. #3 is the killer." |
| Proof | "After testing 7 AI tools, the same problem kept showing up." |
| Story | "Three months ago, I thought AI couldn't write fiction. Then I tried [X]." |

Hook phải: (1) confirm title/thumbnail promise, (2) create open loop, (3) show proof early.

## Step 1.5 — Script Outline (emotional journey, KHÔNG template)
Dùng assigned mechanism từ Step 0 + emotional journey:

> ❌ BANNED: Academic templates (Myth→Reality→Proof→Takeaway...).
> ✅ REQUIRED: Emotional journey dùng storytelling techniques từ `docs/AUTHENTICITY-PIPELINE.md` (12 KTTV techniques).

```
TITLE: [≤60 chars]
MECHANISM: [# from docs/CONTENT-CREATION-MECHANISMS.md]
EMOTIONAL JOB: [What should viewer FEEL?]
THE ONE THING: [Single belief viewer leaves with]
HOOK: [3-beat: Pull in → Flip → Seal]

[Organic flow — NO section headers, NO "firstly/secondly"]

CTA: "Building an AI agent for novelists. Follow for updates."
```

## Step 1.6 — Design Analytical Framework [COMPLIANCE CRITICAL]
> **Đây là step khiến content không thể interchange.** Human contribution = framework design, KHÔNG phải "hot take."
> AI can generate opinions. AI CANNOT design a unique analytical framework producing logical, consistent, objective analysis.

**GATE BẮT BUỘC — USER phải làm (agent KHÔNG làm thay):**
1. **Design the analytical framework** — choose evaluation criteria, define scoring, decide synthesis logic (từ research `docs/RESEARCH-FRAMEWORKS.md`, KHÔNG intuition).
2. **Review the logic** — ensure framework produces objective, consistent analysis.
3. **Verify unique angle** — không channel nào dùng framework cụ thể này.

> ⚠️ Agent STOP tại đây. Trình bày framework đề xuất (TIẾNG VIỆT cho mô tả/reasoning, giữ tiếng Anh cho tên concept/keyword chuyên ngành) → đợi user confirm/edit. **Sau khi user confirm, agent PHẢI viết framework vào `02-brief.md` (artifact bắt buộc).** KHÔNG viết script trước khi gate "framework designed" ✅ trong `00-state.md` VÀ `02-brief.md` đã tài liệu hoá framework.

**Sau khi user confirm + `02-brief.md` có framework, agent:**
1. Research evidence cho mỗi criterion/dimension (docs, reviews, community, academic — KHÔNG test tool).
2. Fill framework với data từ public sources.
3. Draft voiceover text **first-person analytical voice** (confident, experiential, KHÔNG secondhand).

**Writing voice — first-person analytical:**
- NO: "According to Reddit users, Sudowrite loses context after chapter 5"
- YES: "Sudowrite's context retention breaks down around chapter 5 — the story bible compresses too much, and the AI starts forgetting early character details"

**Content approach**: Pure analysis từ docs/reviews/public info — KHÔNG test tool. Review viết AS IF user has used it (first-person, confident), nhưng actual research từ internet sources.

**Language**: Content = English (RPM, global audience). Agent ↔ User = Vietnamese. Mỗi script draft kèm Vietnamese summary per section để user check logic. Hook: user draft Vietnamese → agent translate English giữ voice.

Cập nhật `00-state.md`: gate "framework designed (USER)" ✅ CHỈ KHI `02-brief.md` đã chứa framework.

## Step 1.7 — Script Draft (authenticity requirements)
> ⚠️ Script must FEEL alive, KHÔNG chỉ pass compliance. Mechanical/soulless content = failed.
> See `docs/AUTHENTICITY-PIPELINE.md` full details.

**⚠️ Stance [MOST IMPORTANT — check FIRST, trước mọi kỹ thuật bên dưới]:**
Host đứng BÊN TRONG trải nghiệm — "I" là fellow-struggler, "we/you" kéo viewer vào companion (stance model = KTTV/web5ngay "mình/chúng mình/chúng ta"). KHÔNG essayist-about-it ("The AI does X / The model was trained to Y" làm move chính). Content English nên "mình"→"I", "chúng mình"→"we/you".

| | KTTV (TARGET) | Essayist (AVOID) |
|---|---|---|
| Vị trí host | BÊN TRONG struggle | BÊN NGOÀI, giải thích |
| Chủ ngữ chính | I / We / You | The AI / The model / It |
| Viewer | companion | audience |
| Discovery | cá nhân, vừa trải qua | phân tích người khác |

**Stance diagnostic (BẮT BUỘC trước save):** đọc 3 đoạn ngẫu nhiên, đếm chủ ngữ main clause. Đa số phải "I/We/You" (inside). Nếu đa số "The AI/It/This" (outside) → FAIL → rewrite. BAN essay markers làm move chính: "Most people think X", "The AI does Y", "Here's why", "The model was trained to Z" → thay bằng lived moment của host.

**VD:**
- ❌ Essay: "Most people think the AI is just bad at dialogue. It's not. That therapy voice is a fingerprint."
- ✅ Inside: "I deleted the same line three times. 'I feel hurt.' I'd cut it, the AI handed me back 'I feel hurt.' Third time I stopped editing and asked why it always lands there."

**Anti-mechanical rules (từ web5ngay 4.24M, Vui Vẻ 1.2M, Kurzgesagt 23M research):**
- ❌ NO section headers as openers ("Section 1: Myth") → ✅ Open with a SCENE.
- ❌ NO explaining framework before showing problem → ✅ Show suffering first.
- ❌ NO Wikipedia definitions → ✅ Storytelling with tension.
- ❌ NO "In conclusion..." → ✅ Snap-back to viewer's life.
- ❌ NO smooth/frictionless → ✅ Admit uncertainty, leave rough edges.

**Required techniques:**
- 3-beat hook: Pull in (viewer's experience) → Flip (surprising contrast) → Seal (open loop).
- Show suffering before solution — viewer FEELS problem trước khi explain.
- Include yourself in problem: "I've made this mistake too."
- Snap-back close: connect topic to viewer's life.
- 1-3-1 sentence rhythm: short punch → longer flow → short close.
- Conversational openers: "Here's the thing...", "Look..."
- Define emotional job BEFORE writing: what should viewer FEEL?
- Remove 7 AI-script tells: fake specificity, cliché hooks, uniform rhythm, filler, no visual direction, unearned authority, missing open loops.
- "Therefore/But" between sections (không "and then...").
- 130-150 wpm, contractions, <20 words/sentence, 4.2 "you" per 100 words.
- Read aloud trước khi generate → fix stumbling.
- Show visible reasoning: "Here's what I expected → Here's what I found."
- Vietnamese summary per section cho user verify logic.

Save `03-script.md`. Cập nhật `00-state.md`: gate "script draft" ✅.

## Step 1.8 — Humanize pass (local skill)
> Dùng `humanizer` skill tại `skills/humanizer/` (local, no API key, MIT license) — KHÔNG dùng paid humanizer API. Chạy trực tiếp CLI:
> `node skills/humanizer/src/cli.js score -f 03-script.md`
> `node skills/humanizer/src/cli.js humanize --autofix -f 03-script.md`

- Run `node skills/humanizer/src/cli.js score -f 03-script.md` → check AI-likeness score (baseline).
- Run `humanize --autofix -f 03-script.md` (từ skill dir, hoặc full path `src/cli.js` mà skill cung cấp) → auto-remove AI patterns. Nếu autofix không tự apply, manually fix theo suggestions (VD em dash overuse, AI vocab).
- Re-score → verify giảm. Target < 30.
- 28 pattern detectors: significance inflation, AI vocabulary (delve/tapestry/vibrant/crucial/seamless...), vague attributions, filler phrases, low burstiness, sentence uniformity.
- 560+ AI vocabulary terms across 3 tiers → flagged + replaced.
- Sau humanize: read aloud, verify vẫn sounds natural.

Cập nhật `00-state.md`: gate "humanize pass" ✅ (ghi score before → after).

## Step 1.9 — "Would this exist without AI?" Test [COMPLIANCE]
"If I couldn't use AI for anything, would I still make this video?"
- YES → save brief.
- NO → rethink angle.

Cập nhật `00-state.md`: gate "compliance would-exist" ✅.

## Step 1.10 — Save production brief + document process [COMPLIANCE]
Save vào `videos/YYYY-MM/NN-short-name/` (tên file đánh số theo thứ tự tạo):
- `02-brief.md` — tóm tắt tiếng Việt + English outline + hook + **analytical framework (bắt buộc)**.
- `01-research.md` (hoặc `01-research-*.md`) — research notes + sources.
- `03-script.md` — final English script (sau approval + humanize).

> Đây là appeal evidence nếu flag.

## Step 1.11 — Report + Guide Production
Output:
```
## 📋 Pre-Production Complete — [Month YYYY]

### [N] Production Briefs ready:
1. [Video title] → videos/YYYY-MM/NN-short-name/02-brief.md
   - Hook: [type]
   - Angle: [1 sentence]
   - Gap: [1 sentence]
   - Emotional journey: [anxiety→relief / curiosity→discovery / contrarian→reveal / etc.]
   - Framework: [analytical framework summary]
   - Commentary type: [commentary/critique/narrative/teaching/synthesis]

### ✅ Compliance check passed:
- [ ] Each video has unique structure (no 2 consecutive same)
- [ ] Each video has analytical framework documented in 02-brief.md
- [ ] Draft before/after saved for appeal evidence
- [ ] "Would this exist without AI?" = yes for all
- [ ] Stance check passed: host inside ('I/we/you'), not essay ('The AI/It') — 3-paragraph subject test

### 🎬 Next: Production (Phase 2 — Faceless)
Gõ `produce` → tôi consult phase-2 rules.
```

Cập nhật `00-state.md`: `phase: 2-production`, `status: not_started`, `next action` = "produce (hoặc `tiếp tục`)".

## Phase-1 decision rules (áp dụng tại đây)
- **Framework design required + documented**: không video nào vào production thiếu user-designed framework ĐƯỢC LƯU trong `02-brief.md`. AI drafts = starting point, KHÔNG final script. See `docs/RESEARCH-FRAMEWORKS.md`.
- **Format variation**: không 2 video liên tiếp trùng emotional journey. ≥3/5 element khác (emotional journey, thesis, footage mix, storytelling rhythm, length).
- **Validate before script**: KHÔNG script chưa check demand.
- **Packaging before script**: title + thumbnail + hook quyết TRƯỚC outline.
- **Compliance first**: mọi video pass 14-rule checklist (`docs/YOUTUBE-AI-COMPLIANCE.md`). Fail → fix trước produce.
- **"Would this exist without AI?"**: no → don't produce.
- Dùng sub-agents song song cho research nặng (20+ query, mỗi query nhiều bài).
