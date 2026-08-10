# AGENTS.md — Content Production Agent (auto-load)

> **Read `AGENT_GUIDE.md` for full detail.** This file = summary, loaded every session.
> **PIPELINE_VERSION: `2026-08-04-v3`** — fully standalone workflow (openmontage archived).

## Project Status (2026-08-04)

**Active:** "Sanderson's 2nd Law + AI" — Vox-style explainer (~497s), v10 design system.
- Phase 1 ✅ (research + framework + script + humanize 2/100)
- Phase 2: gate 0 FAIL on 30s@540p segment (freeze 16%, sat 0.123, sharpness 0.018)
- Architecture: `libraries/` (8 branches) + `remotion-composer/shared/` (engine + layouts) + `layout-lab/` (web app)

**Frozen (do NOT learn from — user said "phèn"):** 01-subtext, 02-ai-dialogue.

**Render loop:** plan full video, render only 30s @ 360-540p → gate → user → master.

## How to Continue

1. Read this file (you are).
2. Read `AGENT_GUIDE.md` (phase detail, libraries, tools, gates, migration).
3. Read `AGENT_GUIDE.md` (phase detail, libraries, tools, gates, migration).
4. Read `skills/INDEX.md` (84 project-local skills — read relevant one before calling any tool).
5. Read `libraries/README.md` (8-branch architecture + protocol).
6. For Vox work: read `docs/vox-pipeline/playbook.md` + run `gate_vox.py`.
7. Before calling ANY API tool: check `skills/INDEX.md` → read `skills/<name>/SKILL.md` first.

## Trigger Routing

| User says | Phase | Key action |
|---|---|---|
| `lên content` | 1 | research → framework (USER gate) → script → humanize |
| `produce` | 2 | libraries/04-visual → compose → gate → render 30s |
| `produce vox` | 2V | Vox editorial (gate_vox.py 0 FAIL) |
| `repurpose` | 3 | transcript → X/blog/Reddit/shorts |
| `tiếp tục` | resume | read `00-state.md` → continue |
| `check` | utility | list all videos + state |
| `devlog` | utility | git log → post |

## Phase Gates (must ✅ before next phase)

- **Phase 0**: scorecard ≥ 25
- **Phase 1**: research 20+ + framework (USER) + script + humanize ≤30 + "exist w/o AI?"=yes
- **Phase 2**: gate 0 FAIL + 14-rule compliance + disclosure
- **Phase 3**: transcript available

## Essential Rules

1. **Compliance first**: 14-rule checklist + disclosure toggle + "AI-assisted content".
2. **Libraries**: import from `remotion-composer/shared/` — do NOT copy code per-video.
3. **Only approved layouts**: registry status = `approved` (not draft/demoted).
4. **Sort by use_count**: least-used layouts first (avoid repetition).
5. **Jitter**: params have `base ± range` → random per scene (anti mass-produced).
6. **Render loop**: 30s @ 360-540p → gate → user → master. Never full render before approval.
7. **Stance**: host INSIDE ("I/we/you"), not essayist ("The AI/It").
8. **Framework**: USER designs — agent stops, presents, waits.
9. **Do NOT follow archive/openmontage-AGENT_GUIDE.md** — follow root `AGENT_GUIDE.md`.
10. **Read skill before calling tool**: check `skills/INDEX.md` → read the matching `skills/<name>/SKILL.md` BEFORE calling any API tool (TTS, image gen, music, ffmpeg, etc.). The skill has vendor-specific prompting guidance that dramatically improves output quality.

## Render Commands

```powershell
# Gate
python docs\vox-pipeline\gate_vox.py
python docs\vox-pipeline\gate_vox.py --video <mp4> --no-duration

# Bundle
cd remotion-composer && npx remotion bundle projects/<project>/index.tsx

# Draft 30s
npx remotion render build <CompId> renders\draft_seg30s.mp4 --frames=0-900 --scale=0.5 --concurrency=8 --x264-preset=ultrafast --crf=32 --gl=angle

# Master
npx remotion render build <CompId> renders\master_1080p.mp4 --scale=1 --concurrency=8 --x264-preset=medium --crf=18 --gl=angle
```

## File Naming

Each project `projects/<slug>/` (video) or `projects/devlogs/` (devlog posts):
- Video: `00-state.md` → `01-research*.md` → `02-brief.md` → `03-script.md` → `artifacts/` → `assets/` → `master_1080p.mp4`
- Devlog: `YYYY-MM-DD.md` per post (pipeline TBD — git log → commit → write → save)

**Before web research**: read `research/INDEX.md` → check if topic already researched → skip if current → follow chain if superseded → research + add to INDEX if not found.

## Language

Agent ↔ User = **Vietnamese**. Content (scripts, videos) = **English**. Keep English for framework/concept names + technical keywords.
