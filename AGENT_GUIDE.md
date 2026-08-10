# AGENT_GUIDE.md — Content Production Pipeline Guide

> Comprehensive reference. AGENTS.md (auto-load) has the summary; this has the DETAIL.
> Consult on-demand when executing a specific phase.

## On First Activation

Read these in order:
1. `AGENTS.md` (auto-loaded — project status + trigger routing + essential rules)
2. This file (phase detail, libraries, tools, gates)
3. `libraries/README.md` (8-branch library architecture + protocol)
4. `libraries/04-visual/registry.json` (visual templates — layouts, variants, status)

## Rule Zero — All Production Goes Through Libraries

Every video production request MUST use `libraries/04-visual/` for visual templates.
- Layouts: import from `remotion-composer/shared/layouts/<id>.tsx`
- Primitives: import from `remotion-composer/shared/primitives.tsx`
- Registry: `libraries/04-visual/registry.json` (status, variants, use_count)
- **Only `approved` layouts are used** — draft/demoted are skipped.
- **Sort by use_count ascending** — least-used layouts first (avoid repetition).

## Trigger Routing

| User says | Phase | Action |
|---|---|---|
| `lên content` / `tháng này` | 1 | research → framework (USER) → script → humanize |
| `produce` | 2 | libraries/04-visual → compose → gate → render |
| `produce vox` | 2V | Vox editorial variant (gate_vox.py) |
| `repurpose` | 3 | transcript → X/blog/Reddit/shorts |
| `tiếp tục` | resume | read 00-state.md → continue current phase |
| `plan quý` | 0 | validate demand (autocomplete + competitor + trends) |
| `validate [topic]` | 0 quick | quick demand check |
| `devlog` | utility | git log → devlog post |
| `check` / `status` | utility | list all videos + state |
| `review` | 5 | monthly analytics + retention |

## Phase Map + Gates

| Phase | Detail file | Gate to PASS |
|---|---|---|
| 0 Validate | `docs/phase-rules/phase-0-validate.md` | scorecard ≥ 25 |
| 1 Pre-production | `docs/phase-rules/phase-1-preproduction.md` | research 20+ + framework (USER) + script + humanize + "exist w/o AI?"=yes |
| 2 Production | `docs/phase-rules/phase-2-production.md` | gate 0 FAIL + 14-rule compliance + disclosure |
| 2V Vox | inline below | `gate_vox.py` = 0 FAIL + 14-rule + disclosure |
| 3 Repurpose | `docs/phase-rules/phase-3-repurpose.md` | transcript + AVD gate |
| 5 Review | `docs/phase-rules/phase-5-review.md` | monthly |

## Phase 0 — Validate

5-stage: YouTube autocomplete (BROWSER) + competitor (outlier = views ÷ channel median) + Google Trends (YouTube Search mode) + content gap (4 types) + scorecard 0-50.
- ≥25 = Produce. <25 = Kill/Save.
- Save to `content-plan-Q[X]-2026.md`.

## Phase 1 — Pre-production [COMPLIANCE HEAVY]

Step order: setup folder + `00-state.md` → research (`01-research*.md`) → competitor → comment mining → hook → outline → **framework design (USER)** → script draft (`03-script.md`) → humanize → "exist w/o AI?" → save → report.

- **Research**: 3-5 sub-agents PARALLEL, 20+ query each, 100+ sources/video.
- **Framework gate [CRITICAL]**: USER designs analytical framework. Agent STOPS, presents proposal in VIETNAMESE, WAITS for confirm, writes to `02-brief.md`. **NO script before this gate ✅.**
- **Script** [STANCE-CRITICAL]: host INSIDE experience ("I/we/you" = fellow-struggler). Vietnamese summary per section.
- **Humanize pass**: run `skills/humanizer/src/cli.js` → score → autofix on `03-script.md`. Target ≤ 30/100.
- **"Would this exist without AI?"** = must be YES.

## Phase 2 — Production via Libraries

**Gate in**: phase-1 ✅ + `03-script.md` exists.

### Production protocol:
1. **TTS**: split script → sentences → ElevenLabs (per-sentence, tag open/norm/punch/question) → `sentence_timeline.json` (SOURCE OF TRUTH for timings). Record params + cost per sentence.
2. **Assets**: Pixabay images (subject-rich, license_gate 0 FAIL) → rembg cutouts → Pixabay music (free first).
3. **Scene data**: group sentences → scenes (6-7.5s avg, ≤2 accent colors/frame). Scene `kind` = layout ID from registry (approved only).
4. **Compose**: import layouts from `remotion-composer/shared/layouts/` + primitives from `shared/primitives.tsx`. Each scene = 1 layout component + variant selections (motion/texture/palette/renderer/sfx).
5. **Jitter**: each param has `base ± range` → random per scene (anti YouTube mass-produced flag).
6. **Render loop**: plan full video, **render only 30s @ 360-540p** → gate → user review → fix → repeat. Master 1080p only after user approves.
7. **Gate**: `gate_vox.py` (static + runtime) → 0 FAIL required.
8. **Compliance**: 14-rule check + disclosure toggle + "AI-assisted content" in description.

### Render commands:
```powershell
# Gate (before EVERY delivery)
python docs\vox-pipeline\gate_vox.py
python docs\vox-pipeline\gate_vox.py --video <mp4> --no-duration

# Bundle (after code edit)
cd remotion-composer
npx remotion bundle projects/<project>/index.tsx

# Draft 30s @ 540p
npx remotion render build <CompId> renders\<name>_seg30s.mp4 --frames=0-900 --scale=0.5 --concurrency=8 --x264-preset=ultrafast --crf=32 --image-format=jpeg --jpeg-quality=50 --gl=angle

# Master 1080p
npx remotion render build <CompId> renders\<name>_master.mp4 --scale=1 --concurrency=8 --x264-preset=medium --crf=18 --image-format=jpeg --jpeg-quality=95 --gl=angle
```

## Phase 2V — Vox Editorial variant

For Vox-style briefs (paper-collage, kinetic typography, cutout photos, karaoke subtitle).
1. Read `docs/vox-pipeline/playbook.md` (canonical) + `gate_vox.py`.
2. TTS → `sentence_timeline.json` (SOURCE OF TRUTH).
3. Scene data: kind = layout ID from `libraries/04-visual/registry.json` (approved).
4. Compose: import from `shared/layouts/` — DO NOT copy voxKit.
5. Render 30s @ 360-540p → gate (0 FAIL) → user approve → master 1080p.

## Phase 3 — Repurpose

Gate in: transcript available (from `remotion-composer/renders/final.mp4` via transcriber).
- X thread (5-8 tweets, each <280 chars, last=CTA+link).
- Newsletter (lead = insight CUT from video).
- Blog 1500-3000 words (H2/H3 + SEO).
- Reddit (NO product link first 3 months).
- Shorts (3-5 timestamps + hook). Spacing 5-7 days apart.

## Libraries Architecture

```
libraries/                          # 8 branches, 1 protocol
├── README.md                       # architecture overview
├── library-protocol.md             # registry/lifecycle/preview/provenance
├── 01-topic/                       # validated topics + scorecards
├── 02-framework/                   # user-approved analytical frameworks
├── 03-script/                      # hook patterns, outlines, stance models
├── 04-visual/                      # Visual Template Library (metadata only)
│   ├── registry.json               # layouts + variant pools + use_count + jitter
│   ├── previews/                   # PNG per layout
│   └── README.md                   # code lives at remotion-composer/shared/
├── 05-audio/                       # voices + music + SFX
├── 06-assets/                      # stock images + cutouts + provenance
├── 07-repurpose/                   # platform templates + engagement data
└── 08-analytics/                   # retention/AVD + golden episodes
```

**Protocol**: draft → approved (user ✅) → demoted (❌ 2x). Production only uses `approved`. Each item: id, name, status, use_count, reject_count, variants, jitter, preview, used_in, provenance.

## Visual Template Library (04-visual)

- **Code**: `remotion-composer/shared/primitives.tsx` (engine) + `shared/layouts/*.tsx` (each layout = 1 file).
- **Metadata**: `libraries/04-visual/registry.json` (24 layouts, each with 5 variant pools).
- **Variant pools**: motion (6), texture (5), palette (8), image_renderer (3), sfx (4).
- **LayoutLab web app**: `remotion-composer/layout-lab/` (Vite + React, port 5174) — preview, vote, select variants.
- **Jitter**: each param has `base ± range` → random per scene.

## Gate System

`docs/vox-pipeline/gate_vox.py` — automated quality gate. Run before EVERY delivery.

**Static checks**: pacing (3.5-11s scenes), dead-screen (tail ≤4s), color-variety (≥3 accents), yellow-amber (yellow only on dark), cutout (≥60% photo scenes), text-size (min ≤40 + max ≥100), timeline-sync (±0.3s), narration (8 sections), sfx-count (≥100), sfx-gap (≤8s), motion-zoom, push-drift.

**Runtime checks** (--video): freeze-ratio (≤55%), max-freeze (≤6s), sharpness (≥0.012), edge-density (≥0.055), saturation (≥0.12), hue-variety (≥3.5), grain (≥0.020), audio (audible + not clipping).

## Tools

Project-local tool registry at `tools/`. Each tool declares `agent_skills` — the wire to `skills/`.

**Before calling any tool**: `registry.get_info("tool_name")` → see `agent_skills` → read `skills/<name>/SKILL.md` → then `registry.execute("tool_name", params)`.

```python
import sys; sys.path.insert(0, ".")
from tools.registry import registry
registry.discover()

# Check which skills to read first
info = registry.get_info("elevenlabs_tts")
print(info["agent_skills"])  # → ['elevenlabs', 'text-to-speech']
# → Read skills/elevenlabs/SKILL.md + skills/text-to-speech/SKILL.md

# Then execute
result = registry.execute("elevenlabs_tts", {"text": "...", "voice_id": "..."})
```

**18 tools** available (15 configured):
- `elevenlabs_tts` (tts) — agent_skills: elevenlabs, text-to-speech
- `pixabay_image` (image_generation) — free stock images
- `pixabay_music` + `pixabay_music_search` (music_generation) — free stock music
- `transcriber` (analysis) — Whisper speech-to-text
- `audio_mixer` (audio_processing) — final mix narration+music+SFX
- `bg_remove` (enhancement) — rembg cutout
- `video_analyzer` (analysis) — duration, volume, freeze, frame extract
- `frame_sampler` (analysis) — storyboard frames
- `scene_detect` (analysis) — scene boundaries
- `video_downloader` (analysis) — yt-dlp
- `video_trimmer` / `silence_cutter` / `video_stitch` (video) — editing
- `upscale` / `color_grade` (enhancement) — post-processing
- `subtitle_gen` (subtitle) — SRT/VTT generation
- `diagram_gen` (graphics) — Mermaid charts

**API keys** loaded from `.env` at project root (ELEVENLABS_API_KEY, PIXABAY_API_KEY).

## Compliance (always)

1. Every video passes 14-rule checklist (see `docs/YOUTUBE-AI-COMPLIANCE.md`).
2. Disclosure toggle "altered content" + "AI-assisted content" in description.
3. ≥1 non-AI visual element per video.
4. "Would this exist without AI?" = YES.

## Migration Status (2026-08-04)

**Migration complete** (2026-08-04): fully standalone — no openmontage dependency.
- ✅ Libraries/ created (8 branches + protocol + mined skills)
- ✅ shared/primitives.tsx + shared/layouts/ (code, single source of truth)
- ✅ LayoutLab web app (preview + vote + variants)
- ✅ gate_vox.py v10 (0 FAIL on sanderson segment)
- ✅ Agent docs: AGENTS.md + AGENT_GUIDE.md (consolidated, no openmontage refs)
- ✅ Tools: standalone registry at tools/ (18 tools + agent_skills wire)
- ✅ Skills: 84 skills at skills/ (project-local, portable)
- ✅ openmontage archived → `archive/openmontage/`

## What Not To Do

- Do NOT copy voxKit/primitives per-video — import from `shared/`.
- Do NOT use layouts with status `draft` or `demoted`.
- Do NOT render full video before user approves 30s segment.
- Do NOT skip gate (0 FAIL required before delivery).
- Do NOT learn from old videos (01-subtext, 02-ai-dialogue — user said "phèn").
- Do NOT put code in `libraries/` — libraries = metadata only; code = `remotion-composer/shared/`.
- Do NOT follow archive/ docs — follow THIS guide.
- Do NOT use vague adjectives — quantify with numbers (px, %, seconds, hex).
