# Architecture Map — folder→purpose + start-here

> Low-overhead hygiene rule §3 (AGENTS.md). Read this BEFORE hunting through files.
> Source of truth = the code. This map orients; it does not replace reading code.
> Updated 2026-08-25. If structure drifts, update this map (doc-sync).

## Start-here path (new session)

1. `AGENTS.md` — constitution (direction, non-negotiable rules, workflow discipline, hygiene).
2. `docs/HARNESS-RECOVERY.md` → `docs/PATTERN-LEARNING-AND-EVAL-SPEC.md` → `docs/TODO-NEXT.md` (reading order, per Document Hygiene).
3. This file (`docs/ARCHITECTURE-MAP.md`) for where things live.
4. `harness/memories/AGENTS.md` for the agent's own protocol (v5 principle-based loop).

## Top-level

| Path | Purpose |
|---|---|
| `AGENTS.md` | Project constitution: direction, non-negotiable rules, workflow discipline, hygiene rules. Read every session. |
| `AGENT_GUIDE.md` | Full detail companion to AGENTS.md. |
| `kilo.json` / `langgraph.json` | Kilo + LangGraph runtime config. |
| `docker-compose.yml` + `docker/` | Containerized stack (frontend, langgraph, postgres, nginx, backup). |
| `content-plan-Q3-Q4-2026.md` | Content roadmap (human-facing). |
| `archive/` | Superseded AGENT_GUIDE/AGENTS from old (openmontage) — do not use. |
| `.kilo/command/` | Kilo slash commands (project-level). |

## `docs/` — active specs only (superseded → `docs/archive/`)

| File | Purpose |
|---|---|
| `HARNESS-RECOVERY.md` | Session recovery file — read first after compact. |
| `TODO-NEXT.md` | Current backlog + last night-run phase status. |
| `PATTERN-LEARNING-AND-EVAL-SPEC.md` | Pattern learning + LangSmith eval design (READY FOR IMPLEMENTATION). |
| `EVOLUTION-HARNESS-ISAACVERSE.md` | Direction doc (chốt 2026-08-15): harness as own product. |
| `ASSET-STUDIO-SPEC.md` | Asset studio design + per-option recipes. |
| `CHARACTER-PRESENCE-SPEC.md` | Character presence wiring in editor. |
| `GENERATOR-SPEC.md` | Generator architecture (E2-E6). |
| `PIPELINE-HARDENING-SPEC.md` | 6 điểm yếu silent-failure + giải pháp research-backed (sync/schema/KEEP gate/VLM prompts/style rollback/concurrency) + 3-đợt roadmap. SHIPPED (3 đợt, 27/08). |
| `PIPELINE-PRODUCTION-SPEC.md` | Phase 2: 5 production pipelines (voice/image/timeline/validate/scaffold) — stages + QC gates + provenance + learning hooks. DRAFT v1 — chờ duyệt. |
| `TASTE-AND-LEARNING-ROADMAP.md` | Overall roadmap (P1-P6). |
| `AUTO-CUT-ATTEMPT-LOG.md` | Auto-cut experiment log. |
| `TUTORIAL-CANDIDATES-REVIEW.md` | Isaac principle review surface. |
| `ARCHITECTURE-MAP.md` | This file. |

## `harness/` — Python Deep Agents harness (the product)

| Path | Purpose |
|---|---|
| `agent.py` | Deep Agents assembly — model, tools, permissions, middleware. |
| `harness_tools.py` | All agent tools (render, style, compare, qa_gate, request_keep, editor_op...). |
| `subagents.py` | Critic/clip-editor subagents. |
| `run_cycle.py` / `e6_e2e.py` / `e_phase.py` / `f6_probe.py` | Cycle runner + E2E/phase probes. |
| `eval.py` / `online_evaluators.py` / `calibrate.py` | LangSmith eval + VLM calibration. |
| `pattern_extractor.py` / `tally_principles.py` / `validate_principles.py` | Pattern learning pipeline. |
| `ingest_tutorial.py` / `gap_fill_tutorial.py` / `apply_tutorial_learning.py` | Tutorial ingest + learning. |
| `test_unit.py` + `test_*.py` | Unit tests (run in CI: `python harness/test_unit.py`). |
| `pyproject.toml` | Harness deps. |
| `memories/` | **Agent brain** (see below). |
| `skills/` | Harness skills (editing-craft, style-knobs). |

### `harness/memories/` — agent brain (DO NOT hand-edit; gate-governed)

| File | Role |
|---|---|
| `AGENTS.md` | Agent protocol v5 (principle-based improvement loop). |
| `taste-standard.md` | Structured principles (ACTIVE/CANDIDATE). |
| `knowledge-base.md` | Experiment log — read before any change (avoid repeating failures). |
| `oracle-trust.md` | VLM trust zones (AUTO/ASK per aspect). |
| `self-check.md` | Auto-generated checklist from feedback patterns. |
| `feedback-patterns.json` | Meta-patterns extracted from feedback. |
| `feedback.jsonl` / `preferences.jsonl` / `vote_verdicts.json` | Raw immutable feedback/vote logs. |
| `tutorial-candidates.json` | Isaac principles from 3 videos. |
| `wishlist.md` | Desires not expressible with current knobs. |

## `remotion-composer/` — Remotion renderer + editor UI (the domain surface)

| Path | Purpose |
|---|---|
| `package.json` | Root: `produce:pilot`, `render:window`, `render:master`, `test`, `qa:pilot`. |
| `scripts/` | render-window.mjs, render-project.mjs, sync-project-public.mjs, generate-editor.mjs. |
| `composer-app/` | The editor app (Vite + React + Konva). |
| `shared/` | Domain shared between renderer + composer (see below). |

### `remotion-composer/composer-app/src/`

| Subpath | Purpose |
|---|---|
| `main.tsx` / `App.tsx` | Entry + routing. |
| `composer/` | Clip-first editor workspace: `VideoEditor`, `LeftRail` (7 tabs), `PropertiesPanel`, `model`, `store`, `api`. |
| `editor/` | Timeline logic: `editorOperations` (clip ops, the ONLY way to edit editor/current.json), `editorReducer`, `editorProjection`, `characterPresence`, `time`, `userEditedLedger`. |
| `canvas/` | Edit surface: `InteractiveCanvas` (select/move/resize/rotate/marquee/snap), `EditSurface`, `CanvasStage`, `beatAdapter`. |
| `assets/studio/` | Asset Studio: `Toolbar`, `LayersPanel`, `HistoryPanel`, `ImportPanel`, `ToolOptionsBar`, `store`, `geometry`, `imageOps`, `promptUtils`. |
| `agent/` | `AgentPanel` (agent features stripped, rebuild later). |

### `remotion-composer/shared/isaacverse/` — the DOMAIN

| File | Purpose |
|---|---|
| `treatments.tsx` | 9 treatments code (agent may edit, approval-gated, qa_gate after). |
| `treatmentElements.ts` / `clipStyle.ts` | Elements + interpolation/presets. |
| `styleLoader.ts` | Style store → runtime. |
| `editor.ts` / `editorProjection.ts` / `editorTime.ts` / `characterPresence.ts` | Editor doc model + projection + timing + character presence. |
| `operations.ts` / `assemble.ts` / `motion.ts` | Ops, assembly, motion. |
| `ProjectLoader.tsx` / `EditVideo.tsx` | Project load + edit video composition. |
| `audio.tsx` / `voice.ts` | Audio + VO. |
| `schema.ts` / `types.ts` / `validate.ts` | Schema + types + validation. |
| `review.ts` / `feedback.ts` / `handoff.ts` | Review + feedback + handoff. |
| `store.ts` | Shared store. |

## `libraries/` — domain content library (08 slots + asset-studio)

`01-topic` → `02-framework` → `03-script` → `04-visual` (isaacverse-style.json style store lives here) → `05-audio` → `06-assets` → `07-repurpose` → `08-analytics` → `asset-studio`. See `libraries/README.md`.

## `projects/` — project instances

`isaacverse-final/` = final acceptance baseline (`00-state.json` → `05-edit-doc.json` + `assets/` + `qa/` + `renders/` + `feedback/` + `patches/`). `devlogs/`, `test-blank-project/` for dev.

## Key invariants (gotchas)

- Editor timeline = `editor/current.json` — edit ONLY via `editor_op` (bridge bumps revision + userEdited ledger); NEVER `edit_file` it directly.
- Style-store knob changes → `node scripts/generate-editor.mjs --project <slug> --beat <beatId>` to refresh clips (unmodified only; userEdited flagged stale).
- Before Remotion render: `node remotion-composer/scripts/sync-project-public.mjs <slug>` (ProjectLoader fetches public copy).
- `@types/react` must pin `^18` (Konva/react-konva pull v19 → `npm ci` lock drift → CI red). See corrections.
- Vite must dedupe `react`/`react-dom`/`remotion`/`@remotion/media` or Player/Audio contexts split at runtime.
