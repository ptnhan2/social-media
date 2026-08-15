# IsaacVerse Video Agent Harness

Self-improving video agent harness built on LangChain Deep Agents.

## Quick start

```bash
cd harness
pip install -e .

# Set your OpenRouter API key
export OPENROUTER_API_KEY="sk-or-..."

# Run the agent
python agent.py "render isaacverse-final 0 to 7 seconds at draft quality"
```

## What it does

The harness agent can:

1. **Render** video segments via Remotion (`render_window`).
2. **Read** the edit doc structure (`read_edit_doc`).
3. **View** rendered videos as multimodal content (built-in `read_file` + `read_video`).
4. **Update** the style store (`update_style` — approval-gated via `interrupt_on`).
5. **Run QA** on projects (`run_structural_qa`).
6. **Capture feedback** (`capture_feedback` — per-aspect verdicts logged).

## The learning loop

```
user feedback on render
  → agent reads current style store
  → agent proposes a style change
  → render before (current) + after (proposed)
  → agent views both videos (read_file multimodal)
  → user approves via interrupt gate
  → update_style persists the change
  → all future renders use the new style
```

## Style store

The style store lives at `libraries/04-visual/isaacverse-style.json`.
It is a versioned JSON with per-treatment style knobs.

Example — change edge stroke from solid to gradient:
```python
update_style(
    style_path="treatments.semantic-diagram.edge.stroke.mode",
    new_value='"gradient"'
)
```

## Architecture

```
harness/
├── agent.py        # Deep Agents entry point (create_deep_agent)
├── tools.py        # Custom tools (render, read, update, QA, feedback)
├── pyproject.toml  # Python dependencies
└── logs/           # Feedback log (feedback.jsonl)
```

The agent runs on LangChain Deep Agents (LangGraph runtime):
- Durable execution (checkpoint, resume, time-travel).
- Virtual filesystem (read_file supports video/audio/image).
- interrupt_on for approval gates.
- Custom middleware for governance (planned: write-gate, QA gate).

## Related docs

- `docs/EVOLUTION-HARNESS-ISAACVERSE.md` — direction + decisions.
- `docs/HARNESS-SPEC.md` — (planned) detailed spec.
