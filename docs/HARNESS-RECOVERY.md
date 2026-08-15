# HARNESS RECOVERY FILE — Read this first after compact

> Updated 2026-08-16 after full refactor + testing.

## 1. PROJECT

Video Agent Harness on Deep Agents, integrated into Composer (video editor).
- LLM: DeepSeek V4 (text-only, `deepseek:deepseek-chat`)
- VLM: GLM-4V-Flash via ZHIPU_API_KEY (for visual critique)
- LangSmith tracing enabled (project: isaacverse-harness)
- Agent ↔ user = Vietnamese. Code/schema = English.

## 2. ARCHITECTURE (Deep Agents native assembly)

```
Composer (remotion-composer/composer-app/)
  └─ VideoEditor.tsx
       └─ Right panel: Properties | Agent tab
            └─ AgentPanel.tsx (chat + todos + subagent cards + approval)
                 ↕ useStream (WebSocket)
LangGraph Server (:2024)
  └─ agent.py (create_deep_agent)
       ├─ model: deepseek:deepseek-chat
       ├─ tools: render_window, visual_critique, think
       ├─ memory: /memories/AGENTS.md, /memories/taste-standard.md
       ├─ skills: /skills/ (editing-craft, style-knobs, visual-critique)
       ├─ subagents: critic (GLM-4V-Flash, response_format=CritiqueResult)
       ├─ permissions: interrupt on style+memory, deny on treatment code
       ├─ middleware: TodoListMiddleware, ModelRetryMiddleware
       ├─ context_schema: AgentContext (project_id, current_sec)
       └─ backend: CompositeBackend (workspace, memories, skills)
```

## 3. KEY FILES

### Agent (3 Python files + config)
- `harness/agent.py` (92 lines) — create_deep_agent assembly
- `harness/harness_tools.py` (180 lines) — render_window, visual_critique, think
- `harness/subagents.py` (36 lines) — critic spec + CritiqueResult
- `harness/memories/AGENTS.md` — behavior instructions (system prompt via memory)
- `harness/memories/taste-standard.md` — accumulated taste principles

### Frontend
- `remotion-composer/composer-app/src/agent/AgentPanel.tsx` — chat UI in editor
- `remotion-composer/composer-app/src/styles.css` — agent panel CSS
- `remotion-composer/composer-app/src/composer/VideoEditor.tsx` — Properties|Agent toggle

### Tests
- `harness/test_evals.py` — 8 evals (agent responds, read_file native, think, memory read, no phantom tools)
- `harness/test_unit.py` — 7 unit tests (think, visual_critique, render_window)
- `harness/test_full_loop.py` — full improvement loop test (render→critique→think→edit→approve→revert→learn)

### Config
- `langgraph.json` — agent graph
- `.env` — DEEPSEEK_API_KEY, ZHIPU_API_KEY, LANGSMITH_API_KEY, LANGSMITH_TRACING=true
- `.github/workflows/ci.yml` — 3 CI jobs (python, frontend, ts)

## 4. HOW TO RUN

### Start servers
```powershell
# LangGraph server (port 2024)
$env:PYTHONIOENCODING='utf-8'
& "harness\.venv\Scripts\python.exe" -m langgraph_cli dev --port 2024 --host 127.0.0.1

# Composer (port 5174)
cd remotion-composer\composer-app; npx vite --port 5174
```

### Open in browser
`http://localhost:5174/?project=isaacverse-final` → tab AGENT

### Run tests
```powershell
$py = "harness\.venv\Scripts\python.exe"
& $py harness\test_evals.py      # 8 evals
& $py harness\test_unit.py       # 7 unit tests
```

### Check LangSmith traces
`https://smith.langchain.com` → project "isaacverse-harness"

## 5. VERIFIED

| Test | Result |
|---|---|
| Agent compiles (create_deep_agent) | ✅ |
| read_file native (not phantom read_style) | ✅ |
| think tool used for strategic reflection | ✅ |
| Memory read before planning | ✅ |
| No phantom tools | ✅ |
| visual_critique (GLM-4V-Flash) | ✅ |
| render_window (Remotion) | ✅ |
| Full loop: render→critique→think→edit→approve→revert→learn | ✅ 58 msgs, 8 interrupts |
| Frontend: quick actions, tool cards, status | ✅ |
| 8 evals + 7 unit tests | ✅ all pass |
| LangSmith tracing | ✅ configured |

## 6. SMART PATTERNS (from examples)

- **think_tool** (from deep_research): agent pauses to reason before acting
- **Hard limits**: max 3 cycles, 1 change/cycle, revert if worse, stop when scores ≥ 4
- **Quality checklist**: 9-item verify before reporting "done"
- **Strategic decomposition**: read memory → render → critique → think → change → verify → learn
- **edit_file tip**: use grep first to find exact string, don't guess indentation

## 7. NOT YET DONE (future)

- Async subagents (background rendering, needs Agent Protocol server)
- Code execution (sandbox, needs sandbox backend)
- Outer-loop optimization (better-harness pattern, meta-agent improves harness)
- Production deployment (Docker verified locally, needs VPS)
- More eval cases (improvement quality, score tracking over time)
