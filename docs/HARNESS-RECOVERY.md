# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-22 ~01:30 (KẾT THÚC SESSION ĐÊM 21-22/08 — mọi việc tự
> làm được đã làm xong). Previous: 2026-08-21 tối (batch A+B+C).
>
> ## ĐỌC PHẦN NÀY TRƯỚC — việc chờ USER buổi sáng
> 1. **Duyệt tutorial candidates**: mở `docs/TUTORIAL-CANDIDATES-REVIEW.md`
>    (41 candidates / 7 nhóm, kèm khuyến nghị + số đo) → nói Kilo duyệt nhóm
>    nào → Kito ghi CANDIDATE vào taste-standard.md.
> 2. **Vote 1080p**: chạy `harness\.venv\Scripts\python.exe
>    harness\vote_session.py --port 8765` → mở http://localhost:8765 (2 cặp
>    hr3 1080p — test giả thuyết "motion/global tie ở 360p là do resolution").
>    Verdict cache đã seed sẵn qua đêm.
> 3. **F4 (nếu rảnh)**: cấp key DashScope quốc tế — CRITICAL PATH của toàn bộ
>    hướng tiến hóa treatment (oracle montage mù thay đổi toàn-cục — đã
>    chứng minh bằng evidence chain trong knowledge-base).
>
> ## ĐÊM 21-22/08 đã xong (tất cả committed + CI xanh)
> - **D1**: ingest 3 video Isaac (04/02/06) → 41 candidates;
>   `ingest_tutorial.py` fix merge multi-video (từng ghi đè mất data —
>   recover từ git); gap-fill loop recover hết moments lỗi VLM.
> - **D2-prep/D3-prep**: review doc tự sinh + đo PIL deterministic
>   (accent 0.26-4.7% — xa dưới caps của Isaac; node/detail 1.43x fail
>   marginal so với candidate ≥1.5x).
> - **11 dead knobs WIRED** (path mismatch subtitle + 10 hardcode trong
>   SemanticDiagram/CandidateComparison) — QA: identity 0.0/0.0 + bump
>   1.654/2.375 + build + 79/79 tests. Audit script: audit_knob_paths.py.
> - **Amber mystery GIẢI QUYẾT**: #f2b84b→#ffb84b chỉ lệch R-channel 13 units
>   → grayscale ~3.9 < threshold 8 — KHÔNG phải unwired (KB entry đã sửa).
> - **E1**: `docs/GENERATOR-SPEC.md` — spec đầy đủ, grounded trong audit
>   (projectEditDocToEditor đã tồn tại nhưng chỉ là runtime fallback).
>   E2-E6 để session code riêng theo §4 của spec.
> - **F2**: pairwise structured output (JSON-first parse + fallback) —
>   unit 11/11 + live verify khớp verdict buổi sáng.
> - **F3**: eval re-run XANH — response_quality 10/10 sau fix 3 tầng
>   (prompt {inputs}/{outputs}, use_reasoning=False, env-loader override
>   empty-string vars — background processes mang OPENAI_API_KEY='' là
>   nguyên nhân judge chết trước đây).
> - **F5**: optimize.py ĐÃ XÓA (stub; taste flywheel là outer loop thật).
> - **F6**: Docker Postgres persistence PASS — và fix gap: image thiếu
>   langgraph-checkpoint-postgres + psycopg[binary] (agent.py trong Docker
>   fallback im lặng sang MemorySaver). Image harness-langgraph build sẵn.
> - **1080p renders** cho 2 cặp C3 (hr3_1080_*.mp4) — chờ vote buổi sáng.
>
> ## Vận hành buổi sáng
> - langgraph dev (:2024) + vite (:5174) vẫn đang chạy; refresh page =
>   thread UI mới (reset cycle cap 3). Thread UI cuối hôm qua bị kẹt model
>   glitch — bỏ qua.
> - DashScope tối hay timeout — nếu VLM call treo, chạy lại (retry pattern
>   có sẵn trong seed_1080_verdicts.py / f2_retry.py).
> - Style store: verify 8/8 baseline thật; mọi experiment đêm đều restore.
>
> **Audit lần 2 (21:00-23:00 2026-08-20) đã sửa thêm**: CI đỏ cả ngày (4 gốc:
> styleLoader test brittle, test_unit cần điều kiện không có trên CI,
> package-lock hỏng vì vitest@4→vite@8, thiếu langchain-openai + OPENAI_API_KEY
> dummy) → **CI XANH** từ commit fdc3940. BOM bug trong preferences/feedback
> jsonl (PowerShell ghi BOM → json.loads chết dòng 1) → files reset sạch +
> đọc bằng utf-8-sig. Pillow + langchain-openai khai báo tường minh ở
> pyproject/ci.yml/Dockerfile. fontSizeShort=130 sót (agent claim revert
> nhưng không revert) → reset 96. Test data bẩn trong jsonl (2 entries không
> phải user thật) → cleaned. Broken .cmd files xóa; last_cycle.log
> gitignore. Vitest pin ^2 (dùng vite 5 chung với root). CI đỏ dấu hiệu:
> luôn `gh run list` sau push.

## 0. SESSION 2026-08-20 — PROTOCOL v4 SHIPPED END-TO-END ✅

Everything in TASTE-AND-LEARNING-ROADMAP P1 + P5 + P2-phase1 is done and verified:

- **Full protocol v4 cycle ran through the REAL agent** (glm-4-plus):
  read memories → render baseline (copy_render) → critic critique → think →
  revealDurationSec 0.65→2 (real knob from knowledge-base pending list) →
  re-render → compare_renders PASS (0.896) → pairwise "WINNER: second"
  (control passed) → request_keep KEEP gate (vote + note recorded) →
  knowledge-base entry → report. Style store now: damping=2,
  revealDurationSec=2.
- **Multi-segment (P5)**: chapter-card runs exercised the protocol's
  self-protection — two changes failed the pixel-diff gate (too-small /
  wrong-knob-for-28char-title) and the agent auto-reverted + recorded.
- **KEEP-gate UI verified in browser** (vite + langgraph): resume MUST use
  `stream.respond({type, note})` NOT submit(undefined, {command}) — the v1
  commands transport drops the resume (sdk docs + network capture proof).
- **THE INVISIBLE-ACCENT BUG (P2.1 session find)**: EditVideo passed
  `accent={asString(params.accent, undefined)}` — explicit undefined triggers
  asString's fallback default `""` → every treatment got accent="" →
  component defaults (accent = AMBER()) bypassed → ALL accent elements
  (title bars/glows/borders) invisible in treatment renders since the
  BeatContent fix. Fixed with `|| undefined` at 9 call sites. Diagnosed via
  brute-force red-bar render.
- **New knobs (P2.1)**: colors.* (palette — wired via getters; module-load
  freeze fixed), semantic-diagram.node.glow/padding, chapter-card
  .title.fontWeight/.accentLine.glow, spring configs ×3 treatments. All
  pixel-diff verified (amber 0.52, glow 0.92). SKILL.md updated.
- **Model**: main LLM = glm-4-plus (paid, user-approved: ~6k VND/cycle;
  free fallback glm-4-flash — non-deterministic path invention; qwen-plus
  24s/call too slow). VLM: qwen3-vl-plus (pairwise) / flash (critique).
- **TextOnlyContentMiddleware**: strips deepagents media-preview blocks.
- **calibrate.py** (Wilson zones → oracle-trust.md), **ingest_tutorial.py**
  (P3 pipeline written, NOT yet run — Isaac videos in
  research/isaacverse/source/), **run_cycle.py** (python driver; cmd.exe
  breaks on Vietnamese/parens; log: harness/last_cycle.log).

REMAINING (next session):
1. Run ingest_tutorial.py on an Isaac video + human review of candidates
2. Accumulate calibration votes (real usage) → calibrate.py → zones activate
3. P2 phase-2: generator architecture (EditorDoc as truth, treatments as
   generators, editorOperations as agent tools)
4. P4: Composer feedback door (KEEP gate is in AgentPanel already)
5. Wishlist entries will accumulate from feedback notes

Commits this session: 0306cd6 → 74aefbb → f9bc742 → 92b3e7c → 15b318d → f283a0e.

## 1. PROJECT

Video Agent Harness on Deep Agents, integrated into Composer (video editor).
- LLM: glm-4-plus (Zhipu, paid — ~6k VND/cycle; free fallback glm-4-flash)
- VLM: Qwen3-VL (DashScope — plus cho pairwise, flash cho critique)
- LangSmith tracing + evals (project: isaacverse-harness)
- Agent ↔ user = Vietnamese. Code/schema = English.

## 2. CURRENT STATE — THẬN THẮNG

### ✅ RESOLVED (2026-08-19 evening): style→render chain fixed, first verified improvement

The full root-cause chain (4 bugs) was found and fixed in one day:
1. **getStyle path prefix** (treatments.tsx lines 60,61,114-117): missing
   `"treatments."` prefix → always returned hardcoded fallbacks. FIXED.
2. **BeatContent stub regression (THE BIG ONE)**: Composer v2 commit (17bf79c)
   replaced `<BeatTreatment/>` with an empty `<BeatContent/>` stub in every
   beat Sequence — treatments were NEVER rendered. The video's visuals came
   from editor overlay clips (`editor/current.json` element clips), which
   don't read the style store at all. FIXED: EditVideo.tsx renders the
   treatment path when no editor doc is passed (CLI/harness renders =
   the accepted v009 master path); the editor path remains for the Composer
   preview (which mounts IsaacVerseEditVideo with its own editor prop).
3. **Style JSON webpack-bundling staleness**: styleLoader.ts now fetches the
   JSON at RUNTIME from `public/isaacverse-style.json` (same pattern as the
   edit doc) — never bundled, never cached by webpack.
4. **Test methodology bug**: A/B renders write the same deterministic output
   path — render B overwrites render A and you end up diffing B with B.
   ALWAYS copy the before-render aside first.

Verification (all through the agent's own render_window tool):
- damping 18→2 → 0.2-1.7% pixels change (deterministic PIL diff), peaking in
  the entrance window — change verifiably reaches the render.
- fontSizeLong 82→150 → 47.7% pixels change.
- render-window.mjs: bundle rebuild gated on a TS/TSX source hash (style-only
  changes reuse the bundle + sync runtime JSONs → ~19s/render vs ~52s).
- **First verified improvement cycle**: baseline critique (motion=2 weakest)
  → damping 18→2 → pixel-diff gate PASS → pairwise control (A-vs-A =
  "Identical") → pairwise verdict "WINNER: second" → KEPT (damping=2 in the
  style store). See knowledge-base.md "FIRST VERIFIED IMPROVEMENT".

Oracle protocol v3 (use for ALL experiments): pixel-diff gate → premise-neutral
pairwise with A-vs-A control → trust only WINNER/identical verdicts, never the
VLM's narrated details (they confabulate).

### Agent hoạt động được gì
- ✅ Agent nhúng trong Composer (tab Properties|Agent)
- ✅ Agent dùng native Deep Agents (filesystem, memory, skills, subagents, permissions, HITL)
- ✅ Agent dùng `read_file` (built-in), `think`, `update_style`, `render_window`, `visual_critique`
- ✅ Agent delegate to critic subagent → VLM → structured CritiqueResult
- ✅ LangSmith tracing active, eval chạy 10 cases × 6 evaluators
- ✅ Docker build + run thành công (Postgres + LangGraph + nginx)
- ✅ VLM provider chain with auto-fallback (Qwen3-VL DashScope → GLM → OpenRouter)

### Agent CHƯA chứng minh được gì
- ❌ **Improvement loop chưa verify được** — vì style changes chưa đến render (xem trên)
- ❌ VLM oracle chưa validate được — pairwise test với prompt dẫn dắt → Qwen3-VL
  confabulate (thấy "khác biệt" ở 2 video giống hệt nhau). Cần prompt trung lập
  + deterministic pixel-diff làm lớp 1 (xem docs/HARNESS-ANALYSIS.md §3)
- ❌ Bug #3 (style JSON không đến render) chưa giải quyết

## 4. ARCHITECTURE (native Deep Agents)

```
Composer (remotion-composer/composer-app/)
  └─ VideoEditor.tsx → right panel: Properties | Agent tab
       └─ AgentPanel.tsx (chat + todos + subagent cards + approval + before/after + score chart)
            ↕ useStream (streamSubgraphs, recursionLimit=50)
LangGraph Server (:2024)
  └─ agent.py (create_deep_agent — 100 lines)
       ├─ model: GLM-4-Flash (via OpenAI-compatible endpoint, use_responses_api=False)
       ├─ tools: render_window, visual_critique, think, update_style (harness_tools.py)
       ├─ memory: AGENTS.md, taste-standard.md, knowledge-base.md
       ├─ skills: editing-craft, style-knobs, visual-critique
       ├─ subagents: critic (GLM-4V-Flash, response_format=CritiqueResult)
       ├─ permissions: interrupt on style+memory, deny on treatment code
       ├─ middleware: TodoList, ModelRetry, ToolCallLimit(30)
       ├─ context_schema: AgentContext (project_id, current_sec)
       └─ backend: CompositeBackend (workspace, memories, skills = FilesystemBackend)
```

## 5. KEY FILES

| File | Purpose |
|------|---------|
| `harness/agent.py` | create_deep_agent assembly + TextOnlyContentMiddleware + CLI (keep_gate resume) |
| `harness/harness_tools.py` | render_window, visual_critique, think, update_style, copy_render, **compare_renders, pairwise_verdict, request_keep** |
| `harness/subagents.py` | critic subagent (CritiqueResult) |
| `harness/run_cycle.py` | **python driver cho scripted cycles** (dùng cái này, KHÔNG dùng .cmd — cmd.exe chết với tiếng Việt/parens) |
| `harness/calibrate.py` | Wilson zones → memories/oracle-trust.md |
| `harness/ingest_tutorial.py` | P3 tutorial ingestion (chưa chạy) |
| `harness/memories/AGENTS.md` | protocol v4 (não agent) |
| `harness/memories/knowledge-base.md` | sổ tay thí nghiệm (2 IMPROVED thật) |
| `harness/memories/preferences.jsonl` + `feedback.jsonl` | votes + notes tại KEEP gate (hiện RỖNG — cần Batch A) |
| `harness/memories/wishlist.md` | feedback không biểu đạt được |
| `remotion-composer/composer-app/src/agent/AgentPanel.tsx` | KeepGate UI (resume qua `stream.respond`, KHÔNG `submit`) |
| `docs/TODO-NEXT.md` | **VIỆC CÒN LẠI — batch A-F** |
| `docs/TASTE-AND-LEARNING-ROADMAP.md` | thiết kế nền (rev 3) |
## 6. MODEL CONFIG (hiện tại 2026-08-20)

- Main LLM: `HARNESS_MODEL=openai:glm-4-plus` (Zhipu, TRẢ PHÍ ~6k VND/vòng —
  user duyệt 2026-08-20). Free fallback: `openai:glm-4-flash` (thỉnh thoảng
  bịa path). qwen-plus đáng tin nhưng 24s/call (route China chậm).
- VLM: `VLM_PROVIDER=dashscope` (Qwen3-VL) — pairwise verdict dùng
  `qwen3-vl-plus` (VLM_PAIRWISE_MODEL), absolute critique dùng
  `qwen3-vl-flash`. Endpoint CHINA (giới hạn POST body ~64KB — montage
  3-frame thay video). DashScope key có tiền.
- File thật: `.env` (đừng tin tóm tắt này hơn file).
## 7. TREATMENTS.TSX FIX

`entrance.damping/stiffness/mass/durationSec` đã được wire to style store (trước đó hardcoded). Fix tại `remotion-composer/shared/isaacverse/treatments.tsx` line 113-119.

## 8. HOW TO RUN

```powershell
# LangGraph server (port 2024)
$env:PYTHONIOENCODING='utf-8'
& "harness\.venv\Scripts\python.exe" -m langgraph_cli dev --port 2024 --host 127.0.0.1

# Composer (port 5174)
cd remotion-composer\composer-app; npx vite --port 5174

# Browser: http://localhost:5174/?project=isaacverse-final → tab AGENT
```

## 9. HOW TO TEST

```powershell
# A/B test (direct, bypass agent) — verify if style change produces score change
& "harness\.venv\Scripts\python.exe" harness\test_ab_direct.py

# LangSmith eval
& "harness\.venv\Scripts\python.exe" harness\eval.py

# Unit tests
& "harness\.venv\Scripts\python.exe" harness\test_unit.py
```

## 10. WHAT FRAMEWORK PROVIDES vs WHAT WE BUILT

| Framework (ta dùng) | Tự build (domain-specific) |
|---|---|
| FilesystemMiddleware (read_file, edit_file, ls, grep) | render_window (spawn Remotion) |
| SubAgentMiddleware (task tool) | visual_critique (GLM-4V-Flash API, frame pairs) |
| MemoryMiddleware (AGENTS.md, learn via edit_file) | think (strategic reflection) |
| SkillsMiddleware (progressive disclosure) | update_style (JSON path navigation) |
| SummarizationMiddleware (auto context) | CritiqueResult (Pydantic model) |
| HumanInTheLoopMiddleware (interrupts) | AgentPanel.tsx (frontend UI) |
| FilesystemPermission (interrupt/deny) | AGENTS.md (18 rules, 11-step loop) |
| TodoListMiddleware (planning) | knowledge-base.md (experiment results) |
| ModelRetryMiddleware (retry) | style-knobs SKILL.md (aspect→knob map) |
| ToolCallLimitMiddleware (60 max) | eval.py (LangSmith dataset + evaluators) |
| LangSmith (tracing, datasets, experiments) | taste flywheel (vote → calibrate → KEEP gate) |

## 11. NEXT STEPS

→ **TẤT CẢ việc còn lại nằm trong `docs/TODO-NEXT.md`** (batch A-F với done
criteria). Đọc file đó, không dùng danh sách cũ.

## 12. GIT

Repo: https://github.com/ptnhan2/social-media.git — branch master.
Session 2026-08-20 commits: 0306cd6 → 74aefbb → f9bc742 → 92b3e7c →
15b318d → f283a0e → 4f53956 → 9fa8881 (+ doc fixes cuối session).
