# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-17. Final state after full audit + cleanup.

## 1. PROJECT

Video Agent Harness on Deep Agents, integrated into Composer (video editor).
- LLM: DeepSeek V4 (`deepseek:deepseek-chat`)
- VLM: GLM-4V-Flash via ZHIPU_API_KEY (frame pairs for motion detection)
- LangSmith tracing + evals (project: isaacverse-harness)
- Agent ↔ user = Vietnamese. Code/schema = English.

## 2. ARCHITECTURE (native Deep Agents — no custom infra)

```
Composer (remotion-composer/composer-app/)
  └─ VideoEditor.tsx → right panel: Properties | Agent tab
       └─ AgentPanel.tsx (chat + todos + subagent cards + approval + before/after + score chart)
            ↕ useStream (streamSubgraphs, recursionLimit=50)
LangGraph Server (:2024)
  └─ agent.py (create_deep_agent — 98 lines)
       ├─ model: deepseek:deepseek-chat
       ├─ tools: render_window, visual_critique, think, update_style (harness_tools.py)
       ├─ memory: AGENTS.md, taste-standard.md, knowledge-base.md (memories/)
       ├─ skills: editing-craft, style-knobs, visual-critique (skills/)
       ├─ subagents: critic (GLM-4V-Flash, response_format=CritiqueResult)
       ├─ permissions: interrupt on style+memory, deny on treatment code
       ├─ middleware: TodoList, ModelRetry, ToolCallLimit(30)
       ├─ context_schema: AgentContext (project_id, current_sec)
       └─ backend: CompositeBackend (workspace=Filesystem, memories=Filesystem, skills=Filesystem)
```

## 3. KEY FILES (15 files total)

| File | Lines | Purpose |
|------|-------|---------|
| `agent.py` | 98 | create_deep_agent assembly |
| `harness_tools.py` | 231 | render_window, visual_critique, think, update_style |
| `subagents.py` | 44 | critic spec + CritiqueResult |
| `eval.py` | 130 | LangSmith dataset (10 cases) + evaluators (code + LLM-as-judge) |
| `test_unit.py` | 68 | Domain tool unit tests |
| `memories/AGENTS.md` | 120 | Agent behavior (18 rules, 11-step loop, segment selection) |
| `memories/taste-standard.md` | 35 | Accumulated taste principles |
| `memories/knowledge-base.md` | 50 | Experiment results (failed + pending) |
| `skills/style-knobs/SKILL.md` | 140 | Aspect→knob mapping, per-treatment detail |
| `skills/editing-craft/SKILL.md` | 30 | Murch Rule of Six |
| `skills/visual-critique/SKILL.md` | 57 | How to judge frames |
| `AgentPanel.tsx` | 382 | Frontend UI in Composer |
| `langgraph.json` | 7 | Agent graph config |
| `.env` | — | API keys + LangSmith tracing |
| `.github/workflows/ci.yml` | 45 | 3 CI jobs |

## 4. HOW TO RUN

```powershell
# LangGraph server (port 2024)
$env:PYTHONIOENCODING='utf-8'
& "harness\.venv\Scripts\python.exe" -m langgraph_cli dev --port 2024 --host 127.0.0.1

# Composer (port 5174)
cd remotion-composer\composer-app; npx vite --port 5174

# Browser: http://localhost:5174/?project=isaacverse-final → tab AGENT
```

## 5. EVALS

```powershell
# LangSmith eval (requires server running)
& "harness\.venv\Scripts\python.exe" harness\eval.py

# Unit tests (domain tools)
& "harness\.venv\Scripts\python.exe" harness\test_unit.py
```

View results: https://smith.langchain.com → project "isaacverse-harness"

## 6. WHAT THE FRAMEWORK PROVIDES (we use)

- FilesystemMiddleware: read_file, write_file, edit_file, ls, glob, grep (built-in)
- SubAgentMiddleware: task tool + critic subagent (built-in)
- MemoryMiddleware: AGENTS.md + taste-standard.md loaded, agent learns via edit_file (built-in)
- SkillsMiddleware: progressive disclosure (built-in)
- SummarizationMiddleware: auto context management (built-in)
- HumanInTheLoopMiddleware: permission interrupts (built-in)
- TodoListMiddleware: write_todos planning (langchain)
- ModelRetryMiddleware: API retry (langchain)
- ToolCallLimitMiddleware: max 30 tool calls (langchain)
- FilesystemPermission: interrupt on style+memory, deny on treatment code (built-in)
- LangSmith: tracing, datasets, experiments, evaluators, annotation queues

## 7. WHAT WE BUILT (domain-specific only)

- `render_window`: spawns Remotion (Node.js subprocess)
- `visual_critique`: extracts frame pairs → GLM-4V-Flash API → structured critique
- `think`: strategic reflection (from deep_research example pattern)
- `update_style`: JSON path navigation for style store (avoids edit_file indentation issues)
- `CritiqueResult`: Pydantic model for structured critique
- `AgentPanel.tsx`: frontend UI (chat, todos, subagent cards, before/after, score chart)
- `AGENTS.md`: 18 rules, 11-step improvement loop, segment selection guide
- `knowledge-base.md`: experiment results with format
- `style-knobs SKILL.md`: aspect→knob mapping, per-treatment detail

## 8. PENDING (needs user input)

- Browser test: click "Improve" → verify scores improve
- LangSmith: check traces + experiment results
- VPS + domain for production deployment
