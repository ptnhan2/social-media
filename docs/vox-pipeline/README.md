# Vox Pipeline — Vox-style editorial explainer production

> THE entry point for all Vox-style video work in this workspace.
> Read this file first; it routes to everything else. One folder, one gate, one skill.
>
> **PIPELINE_VERSION: `2026-08-03-v10`** — must match playbook.md / gate_vox.py / skill / AGENTS.md.
> When updating the pipeline: edit `playbook.md` FIRST, propagate, bump this marker everywhere,
> then run `python docs/vox-pipeline/gate_vox.py --doc-sync` (0 FAIL required).

## What this folder is

Reusable production pipeline for **Vox-style editorial explainers** (paper-collage world,
kinetic typography, yellow highlight sweeps, subject-cutout archival photos, karaoke
subtitles). Built and user-approved on "AI Can't Write Subtext" (2026-08-01→02, ~30h of
iteration). **This is the engine — video projects are data-driven scenes on top of it.**

## Files

| File | Purpose |
|---|---|
| **`playbook.md`** | The HOW: architecture, 6-step pipeline, audio pipeline, asset provenance/license rules (MANDATORY), user-approved visual rules, 10 lessons learned. READ BEFORE ANY WORK. |
| **`gate_vox.py`** | Automated quality gate. 15 checks on SCENES data (+ audio/frame checks with `--video`), incl. anti-regression: kind-repeat, yellow-light-guard, margin-guard. **0 FAIL required before every delivery.** |
| **`license_gate.py`** | License/provenance gate — run AFTER assets, BEFORE compose: `python docs/vox-pipeline/license_gate.py --project <id>`. **Re-run until 0 FAIL** (license+provider on every asset, original_url+author on images, banned tags: ai_generated/model/celebrity). |
| `README.md` | You are here — the entry point. |

**Standing user rules (2026-08-02, do not re-ask):** (1) every stock asset records author+page_url+license in asset_manifest — never grab blindly; (2) copyrighted film stills/celebrity photos are OFF-LIMITS — use concept/symbolic stock; (3) every TTS/music call records params + cost_usd (TTS `chars×0.0003`, music `duration/30×0.05`); (4) music: Pixabay free first, else short 2-3 min compose looped at 0.05 volume; (5) **asset density**: 5+ min video needs ≥25-35 stock images (~1 img/10-13s) — 10 images for 400s+ was rejected; (6) **anti-slideshow**: images appear at content beats as paper-collage cards (rotate/washi tape/torn edge + overlay text), NEVER equal-interval fullscreen slides; (7) **subject-rich**: >=8 human/statue images per 5+ min video, landscape/interior <=1/3 of total (playbook 5c.4).

## How the pieces are wired (so nothing is lost)

```
AGENTS.md (root, auto-loaded every session)
  └─ says: Vox work → read docs/vox-pipeline/playbook.md + run gate

openmontage/AGENT_GUIDE.md (mandatory read for every OpenMontage session)
  └─ routes Vox-style briefs → skills/meta/vox-editorial-pipeline.md
       └─ that skill → this folder + component map + visual rules + workflow

remotion-composer/projects/ai-cant-write-subtext/   ← the working code
  ├─ voxKit.tsx    (reusable primitives — the engine)
  ├─ VoxScenes.tsx (SCENES[] data + pattern views — edit HERE per video)
  └─ timeline.json (sentence timings — SOURCE OF TRUTH)
```

A future agent only needs to: read AGENTS.md (auto) → read this README → read playbook →
open the project → edit SCENES data → bundle → run gate → render. No research, no guessing.

## Quick workflow

```powershell
# 0. Gate (before ANY deliverable)
python docs/vox-pipeline/gate_vox.py --project <project-id>
python docs/vox-pipeline/gate_vox.py --project <project-id> --video out.mp4

# 1. Bundle after code edits
cd remotion-composer
npx remotion bundle projects/ai-cant-write-subtext/index.tsx

# 2. Draft fast (~4 min / 308s) — review content only
npx remotion render build VoxFull renders\draft.mp4 --every-nth-frame=3 --scale=0.2 --concurrency=8 --x264-preset=ultrafast --crf=32 --image-format=jpeg --jpeg-quality=45 --gl=angle

# 3. Master 1080p (~40 min)
npx remotion render build VoxFull renders\master.mp4 --scale=1 --concurrency=8 --x264-preset=medium --crf=18 --image-format=jpeg --jpeg-quality=95 --gl=angle
```

## New video? (scaling to 10-100 videos)

1. **Copy nothing from `research/`** — that folder is raw research notes, not pipeline.
2. Reuse this engine: copy the project folder as a template OR (preferred) parameterize —
   `voxKit.tsx` is generic; `VoxScenes.tsx` SCENES[] is per-video data.
3. Each video lives in its own `projects/<slug>/` (OpenMontage convention —
   artifacts/, assets/, renders/).
4. Deliverables go to `videos/<slug>/` at workspace root (see root AGENTS.md).
5. Run the gate for every video. The gate is generic — it reads whatever SCENES[] exists.
