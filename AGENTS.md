# AGENTS.md — IsaacVerse Content Production Agent

> Read `AGENT_GUIDE.md` for full detail.
> **PIPELINE_VERSION: `2026-08-11-isaacverse-v1`**
> Target: IsaacVerse-quality story-driven videos. Vox is retired.

## Current Status

- IsaacVerse reference audit and treatment fixtures exist under `research/isaacverse/`.
- Final local acceptance project is complete with human-review status: `projects/isaacverse-final/`.
- Final persisted version: `v004`; acceptance report: `projects/isaacverse-final/FINAL-REPORT.json`.
- Final master: `projects/isaacverse-final/renders/master_1080p.mp4`.
- Composer loads the persisted project and supports surgical feedback, window render, apply, rollback, canvas beat editing, alternatives, similar batches, and future rules.
- Current Composer revamp: range-first live review, multimodal `ReviewSlice` targets, and Kilo filesystem handoff are implemented; a real `/review-pending` model run is the next external acceptance step.
- Canonical pipeline: `docs/PIPELINE-ISAACVERSE.md`.
- Final runbook: `docs/FINAL-RUNBOOK-ISAACVERSE.md`.
- Gap B resolution: `docs/GAP-B-RESOLUTION.md`.
- Replication contract: `research/isaacverse/REPLICATION-SPEC.md`.
- Feedback UI contract: `docs/FEEDBACK-UI-SPEC.md`.

## Core Concepts

- `VideoDoc`: story, audience, deeper problem, transformation, journey beats.
- `SemanticBeat`: one narrative moment with transcript, treatment, assets and audio cues.
- `SemanticTreatment`: reusable shot sequence with purpose, phases, assets, motion, text and audio.
- `EditDoc`: timeline-ready beats and audio plan consumed by Remotion.
- `Composer`: production UI for full multi-scene videos and surgical fixes.
- `Treatment Lab`: internal evidence/review surface; not the production unit.

## Trigger Routing

| User says | Phase | Action |
|---|---|---|
| `lên content` | Story | research → audience/goal → deeper problem → hero journey → script |
| `produce` | Production | VideoDoc → voice → assets → treatments → edit/audio → gate → draft |
| `audit isaacverse` | Research | download/source audit → frame/audio/transcript evidence → grammar |
| `review` | Composer | show scenes/beats/shots → feedback UI → patch → draft diff |
| `repurpose` | Repurpose | transcript → X/blog/Reddit/shorts |
| `tiếp tục` | Resume | read project state and current todo; continue without restarting |
| `check` | Utility | list projects, renders, gates and current state |

## Non-negotiable Rules

1. **Story before effects**: every video has a transformation, surface problem, deeper problem and beat structure.
2. **Semantic treatments, not generic effect catalogs**: never select `glow`/`zoom` without narrative purpose.
3. **Audio is a first-class plan**: VO, music, SFX and ambience use event cues and density; no automatic one-SFX-per-element.
4. **Agent orchestration**: configured agents may generate/capture/resolve/edit assets through external providers; record provenance and validate outputs.
5. **Human gate only where necessary**: approval, taste, licensing and compliance. Do not delegate ordinary asset work to the user.
6. **Feedback is UI-first**: users select scene/beat/shot/element in Composer; agent diagnoses and patches the selected scope. Chat is optional.
7. **Surgical edits**: patch stable IDs and render the affected window; do not rebuild the whole video for a local complaint.
8. **Draft loop**: plan full video, render only a 30s window at 360–540p → vision/audio QA → patch → repeat → master after approval.
9. **Evidence before catalog**: a treatment becomes approved only after frame/audio evidence, deterministic fixture render and acceptance checks.
10. **Compliance first**: disclosure and the 14-rule YouTube checklist remain mandatory.
11. **Read skills before tools**: check `skills/INDEX.md` and read the relevant `skills/<name>/SKILL.md` before TTS, image, music, video, FFmpeg or browser APIs.
12. **Vox is retired**: do not use Vox primitives, Vox layouts, `variant_pools`, `gate_vox.py` or Vox style as active production guidance.

## Canonical Commands

```powershell
# New-project local draft, exact 640x360
cd remotion-composer
npm run produce:pilot

# Surgical affected-window render
node scripts/render-window.mjs --project isaacverse-final --start 7 --end 10.5 --quality draft

# Local Remotion master (only after draft approval and QA)
npm run render:master

# Persisted resume/check
cd ..
python tools/project/project_store.py resume --project projects/isaacverse-final
```

## Project Structure

```text
projects/<slug>/
├── 00-state.json
├── 01-research/
├── 02-story/
├── 03-script/
├── 04-video-doc.json
├── 05-edit-doc.json
├── assets/
├── feedback/
├── patches/
├── qa/
└── renders/
```

## Language

Agent ↔ user = Vietnamese. Scripts, code-facing schemas and video content = English unless explicitly requested otherwise.

## Operational Learnings

- Remotion frame ranges are inclusive: a 30-second 30fps composition uses `0-899`; window end uses `ceil(endSec * fps) - 1`.
- The draft preset must use exact `0.3333333333333333`; `0.3333` produces a non-integer 359.964px height and Remotion rejects it.
- JSON patches update `projects/<slug>/05-edit-doc.json`; run `node remotion-composer/scripts/sync-project-public.mjs <slug>` before Remotion renders because `ProjectLoader` fetches the public copy.
- Shared Remotion modules live above `composer-app`; Vite must dedupe `react`, `react-dom`, `remotion`, and `@remotion/media` or Player/Audio contexts split at runtime.
