# IsaacVerse Video Agent Harness

Self-improving video agent harness built on LangChain Deep Agents.

## Quick start

```powershell
# 1. Create venv + install deps (first time only)
& "C:\Users\DELL\AppData\Local\Programs\Python\Python313\python.exe" -m venv harness/.venv
harness/.venv/Scripts/pip install deepagents langchain-deepseek

# 2. Set API key (or use .env which is auto-loaded)
$env:DEEPSEEK_API_KEY = "your-key"
$env:HARNESS_MODEL = "deepseek:deepseek-chat"

# 3. Run the agent
.\harness\run.ps1 "read the style store and tell me what the edge stroke mode is"
```

## The learning loop (verified end-to-end)

```
user: "the edge lines look too plain. Change to gradient."
  → agent reads style (read_style)
  → agent lists knobs (list_style_knobs)
  → agent proposes change (update_style mode → gradient)
  → INTERRUPT: user approves
  → governance check (contradiction + minSupport)
  → QA gate (JSON + schema validation)
  → style persists to disk (solid → gradient, v1 → v2)
  → event logged + feedback captured
  → agent confirms
  → all future renders use gradient edges
```

## What the agent can do

| Tool | Purpose |
|---|---|
| `render_window` | Render a video segment (draft 360p or master 1080p) |
| `read_style` | Read the current style store JSON |
| `list_style_knobs` | List all available style knobs with current values |
| `update_style` | Change a style knob (APPROVAL-GATED via interrupt) |
| `render_compare` | Render before/after a style change for visual comparison |
| `capture_feedback` | Log a per-aspect verdict (like/dislike + note) |
| `run_structural_qa` | Run structural QA on a project |
| `read_file` (built-in) | Read ANY file including rendered .mp4 videos (multimodal) |

## Architecture

```
harness/
├── agent.py          # Deep Agents entry point (create_deep_agent)
├── tools.py          # 7 custom tools (render, read, update, QA, feedback, compare)
├── governance.py     # Write-gate (contradiction + minSupport ≥ 2 + event log + replay)
├── test_governance.py # 6 governance tests (all pass)
├── AGENTS.md         # Agent memory (persona + style knob reference + rules)
├── run.ps1           # Convenience runner (checks API key, calls agent.py)
├── pyproject.toml    # Python dependencies
├── .venv/            # Dedicated venv (no Hermes dependency)
├── skills/
│   ├── editing-craft/SKILL.md   # Murch Rule of Six, pacing, continuity, sound
│   └── style-knobs/SKILL.md     # Full reference for all 8 treatments' knobs
└── logs/             # Event log + feedback log (runtime)
```

## Deep Agents configuration

- **Backend**: CompositeBackend
  - `/workspace/` → FilesystemBackend (read real project files + videos)
  - `/memories/` → StoreBackend (cross-thread memory, InMemoryStore)
  - `/skills/` → FilesystemBackend (editing-craft + style-knobs)
- **Checkpointer**: MemorySaver (enables interrupt resume)
- **Permissions**: deny writes to /memories/, treatment code, style JSON (must use update_style)
- **interrupt_on**: `{"update_style": True}` — every style change requires user approval
- **Model**: configurable via `HARNESS_MODEL` env (default: `deepseek:deepseek-chat`)

## Style store

`libraries/04-visual/isaacverse-style.json` — versioned JSON with per-treatment style knobs.
All 8 treatments are evolvable: SemanticDiagram, ChapterCard, HostReflectionShot,
ScreenProofInWorld, AudienceDemandProof, ProcessTimeline, CandidateComparison, CinematicMetaphor.

## Governance

- **Write gate**: contradiction check (block identical values) + minSupport ≥ 2 (new knobs need 2+ feedback entries)
- **QA gate**: JSON + schema validation after write (revert if invalid)
- **Event log**: append-only `harness/logs/events.jsonl` (every style change with provenance)
- **Feedback log**: `harness/logs/feedback.jsonl` (per-aspect verdicts)
- **Replay**: `governance.replay_from_log()` reconstructs style from event log

## Related docs

- `docs/EVOLUTION-HARNESS-ISAACVERSE.md` — direction + decisions + build progress
- `docs/HARNESS-TODOLIST.md` — full 79-task todo list with status
