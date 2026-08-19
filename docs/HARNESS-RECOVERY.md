# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-19. Honest state after full audit + testing.

## 1. PROJECT

Video Agent Harness on Deep Agents, integrated into Composer (video editor).
- LLM: GLM-4-Flash (Zhipu, free) — DeepSeek hết balance (402), đã switch
- VLM: GLM-4V-Flash (Zhipu) — visual critique qua frame pairs
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

## 5. KEY FILES (16 files, ~1600 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `harness/agent.py` | 100 | create_deep_agent assembly, model switch (DeepSeek→GLM-4-Flash) |
| `harness/harness_tools.py` | 231 | render_window, visual_critique (frame pairs), think, update_style |
| `harness/subagents.py` | 44 | critic spec + CritiqueResult (Pydantic) |
| `harness/eval.py` | 157 | LangSmith 10 cases + 6 evaluators (code + LLM-as-judge) |
| `harness/optimize.py` | 143 | outer-loop optimization (better-harness pattern) |
| `harness/setup_langsmith.py` | 61 | annotation queue setup |
| `harness/test_unit.py` | 68 | domain tool unit tests |
| `harness/test_ab_direct.py` | 85 | A/B test (direct, bypass agent) — USE THIS to verify improvements |
| `harness/memories/AGENTS.md` | 122 | 18 rules, 11-step loop, segment selection guide |
| `harness/memories/taste-standard.md` | 35 | taste principles |
| `harness/memories/knowledge-base.md` | 49 | experiment results (1 failed, 1 "success" but unverified) |
| `harness/skills/style-knobs/SKILL.md` | 140 | aspect→knob mapping, per-treatment detail |
| `harness/skills/editing-craft/SKILL.md` | 30 | Murch Rule of Six |
| `harness/skills/visual-critique/SKILL.md` | 57 | how to judge frames |
| `AgentPanel.tsx` | 382 | frontend UI in Composer |
| `.github/workflows/ci.yml` | 45 | 3 CI jobs |

## 6. MODEL CONFIG

```
.env:
  DEEPSEEK_API_KEY=... (hết balance — 402 Payment Required)
  ZHIPU_API_KEY=... (đang dùng — GLM-4-Flash + GLM-4V-Flash, free)
  LANGSMITH_API_KEY=... (tracing + evals)
  LANGSMITH_TRACING=true
  LANGSMITH_PROJECT=isaacverse-harness
  HARNESS_MODEL=openai:glm-4-flash
  OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
  OPENAI_API_KEY=<ZHIPU_API_KEY value>
```

agent.py detects OpenAI-compatible providers (OPENAI_BASE_URL set) → creates ChatOpenAI with `use_responses_api=False` (Zhipu chỉ hỗ trợ /chat/completions, không hỗ trợ /responses).

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
| ToolCallLimitMiddleware (30 max) | eval.py (LangSmith dataset + evaluators) |
| LangSmith (tracing, datasets, experiments) | optimize.py (outer-loop) |

## 11. NEXT STEPS (priority order)

1. **Verify VLM sensitivity** — render 2 videos drastically khác (damping=2 vs damping=50), critique cả 2, xem scores có khác không. Nếu không → VLM không phù hợp làm thước đo.
2. **Nếu VLM OK** — chạy full improvement loop, verify scores cải thiện
3. **Fix loop repetition** — agent re-reads file sau interrupt (rule 10 trong AGENTS.md chưa đủ)
4. **Fix render qua agent** — render đôi khi fail khi gọi qua LangGraph server
5. **DeepSeek balance** — nạp credit nếu muốn dùng DeepSeek thay GLM-4-Flash
6. **Docker production** — code sẵn, build OK, cần VPS/domain để deploy

## 12. GIT

```
Repo: https://github.com/ptnhan2/social-media.git
Branch: master
Latest commit: 5aa0e59 (docs: record successful experiment in knowledge-base.md)
```

30+ commits session này. Key commits:
- `705bf9f` MILESTONE: agent successfully improves video (SAI — A/B test bác bỏ)
- `f111251` Switch to GLM-4-Flash (DeepSeek out of balance)
- `98e0db3` Clean up: remove custom infra (-4137 lines), use LangSmith evals
- `2a2baa7` Simplify to Deep Agents example pattern
- `01bfa11` Agent integrated into Composer
