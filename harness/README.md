# IsaacVerse Harness

Self-improving video agent built on Deep Agents, integrated into the Composer video editor.

## Quick Start

```powershell
# 1. Start LangGraph server (port 2024)
$env:PYTHONIOENCODING='utf-8'
& "harness\.venv\Scripts\python.exe" -m langgraph_cli dev --port 2024 --host 127.0.0.1

# 2. Start Composer (port 5174)
cd remotion-composer\composer-app; npx vite --port 5174

# 3. Open browser
# http://localhost:5174/?project=isaacverse-final → tab AGENT
```

## Architecture

```
Composer (remotion-composer/composer-app/)
  └─ VideoEditor.tsx → right panel: Properties | Agent tab
       └─ AgentPanel.tsx (chat + todos + subagent cards + approval + before/after + score chart)
            ↕ useStream
LangGraph Server (:2024)
  └─ agent.py (create_deep_agent)
       ├─ model: deepseek:deepseek-chat
       ├─ tools: render_window, visual_critique, think, update_style
       ├─ memory: AGENTS.md, taste-standard.md, knowledge-base.md
       ├─ skills: editing-craft, style-knobs, visual-critique
       ├─ subagents: critic (GLM-4V-Flash, response_format=CritiqueResult)
       ├─ permissions: interrupt on style+memory, deny on treatment code
       ├─ middleware: TodoList, ModelRetry, ToolCallLimit(30)
       └─ backend: CompositeBackend (workspace, memories, skills)
```

## Files

| File | Purpose |
|------|---------|
| `agent.py` | Deep Agents assembly (create_deep_agent config) |
| `harness_tools.py` | Domain tools: render_window, visual_critique, think, update_style |
| `subagents.py` | Critic subagent spec + CritiqueResult model |
| `memories/AGENTS.md` | Agent behavior (loaded via MemoryMiddleware) |
| `memories/taste-standard.md` | Accumulated taste principles |
| `memories/knowledge-base.md` | Experiment results |
| `skills/style-knobs/SKILL.md` | Aspect→knob mapping |
| `skills/editing-craft/SKILL.md` | Murch Rule of Six, pacing, continuity |
| `skills/visual-critique/SKILL.md` | How to judge video frames |
| `eval.py` | LangSmith dataset + evaluators + experiment runner |

## Evals

```powershell
# Run LangSmith eval (requires server running on :2024)
& "harness\.venv\Scripts\python.exe" harness\eval.py

# Run unit tests (domain tools)
& "harness\.venv\Scripts\python.exe" harness\test_unit.py
```

View results: https://smith.langchain.com → project "isaacverse-harness"
