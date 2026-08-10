# Vox Pipeline Playbook — "AI Can't Write Subtext"

> Reusable build pipeline + lessons from ~30h of iteration (2026-08-01 → 08-02).
> Read this BEFORE changing anything. AGENTS.md has the fast-path summary; this file has the WHY.

**PIPELINE_VERSION: `2026-08-03-v10`** — this marker must be identical in ALL pipeline files
(see "Updating the pipeline" below).

## Updating the pipeline (MANDATORY — prevents partial updates)

Pipeline knowledge lives in **6 files**. `playbook.md` is the **canonical source** — every
other file is a *summary or pointer* derived from it. When you change the pipeline:

1. **Edit `docs/vox-pipeline/playbook.md` FIRST** (the canonical truth).
2. **Propagate to the 5 derived files** — update any fact/rule that changed:
   | File | Role | What it mirrors |
   |---|---|---|
   | `docs/vox-pipeline/README.md` | entry point | file list, wiring diagram, quick workflow |
   | `docs/vox-pipeline/gate_vox.py` | automated gate | the *checks* must match rules in playbook (pacing, colors, counts…) |
   | `AGENTS.md` (root) | auto-load summary | status, continue instructions, render commands, gate criteria table |
   | `skills/meta/vox-editorial-pipeline.md` | OpenMontage skill | visual rules table, workflow, pitfalls |
   | `.kilo/agent/content-manager-agent.md` | content agent (always-loaded) | Phase 2V section: flow + non-negotiable rules + gate |
   | `openmontage/AGENT_GUIDE.md` | routing (read-only) | only the routing line — change only if skill path moves |
3. **Bump `PIPELINE_VERSION`** to a new value in ALL files that carry it (playbook, README, skill, AGENTS.md, content agent, gate).
4. **Verify with the gate** — it must pass the doc-sync check:
   ```powershell
   python docs/vox-pipeline/gate_vox.py --doc-sync
   ```
   FAIL means some file still carries the old version or a stale path — fix before continuing.
5. Add the change to the "Lessons learned" section if it was a lesson.

> If a rule lives in only ONE of the 5 files, that is a bug — it will drift. Keep the
> canonical text in playbook.md, summaries everywhere else.

## 1. The 4-layer reuse stack

| Layer | File | Purpose |
|---|---|---|
| 1. Auto-load | `AGENTS.md` (root) | State + continue-instructions, loaded every session |
| 2. This playbook | `docs/vox-pipeline/playbook.md` | Full pipeline, decisions, lessons |
| 3. Code truth | `VoxScenes.tsx` + `voxKit.tsx` + `timeline.json` | Architecture is data-driven; edit scenes, not engine |
| 4. Memory | kilo_memory_recall (project) | Every decision recorded as `video.vox_*` records |

**New session flow:** read AGENTS.md → read this playbook → `kilo_memory_recall mode=search query="vox"` → inspect current SCENES → make change → bundle → draft render → user review → master.

## 2. Architecture (as-built)

```
remotion-composer/projects/ai-cant-write-subtext/
├── voxKit.tsx        # primitives (no scene logic)
├── VoxScenes.tsx     # VoxFull: SCENES[] + pattern views + audio
├── VoxSceneOne.tsx   # 12s cold open (approved standalone; ALSO scene 1 of VoxFull)
├── timeline.json     # sentence timings (copy of sentence_timeline.json)
├── Root.tsx          # registers compositions
└── index.tsx         # entry
```

### voxKit.tsx primitives
- `TornFrame` — paper element: 5 shapes (rect/circle/tri/hex/blob), feDisplacementMap scale=6 torn edge, 2-layer drop shadow, entrance spring + settle jitter then HOLD
- `SubjectCutout` — rembg PNG alpha as shape; white sticker border via double drop-shadow; follows subject silhouette
- `Animated` — motion library: slideL/R/Up/Down, dropBounce, rotateIn, zoomBurst, zoomInSlow, flipX, popIn, fadeUp, swingIn
- `StampText` — kinetic Archivo Black, backdrop chip for contrast, resolveAccent
- `KaraokeSubtitle` — zIndex 30 bottom layer, word-level highlight (current word #fff200)
- `HighlightSweep` — 2 overlapping curved strokes (marker feel)
- `PenArrow` — trim-path draw + label with labelStart/labelEnd (hold 2.5s+)
- `ImperfectionOverlay` — film grain 12% + flicker + chromatic aberration edges
- `resolveAccent(color, onDark)` — #fff200 → #C77F00 amber on light backgrounds

### VoxScenes.tsx structure
- `SCENES[]` — 33 scenes, each: {start, end, kind, img[], dark, items[{at, text, color, size}]}
- `items[].at` = ABSOLUTE seconds (from timeline.json sentence starts) — items appear gradually inside a stable visual
- `SECTIONS[]` — 8 narration mp3 in Sequence at section starts
- `SFX[]` — 23 timings; `CUTOUT_OK[]` — 26 images that cut cleanly
- Pattern views: Photo, Text, Chips, Chat, Collage, Counter, Iceberg, Stat, Bubbles, Cta

## 3. The pipeline (do in this order)

0. **GATE**: run `python docs/vox-pipeline/gate_vox.py --project <id>` (+ `--video <mp4>`) before EVERY delivery. **0 FAIL required** — gate is the automated review, not the agent's judgment. Criteria table in AGENTS.md. Anti-regression checks (v8): `kind-repeat` (no 3+ same-kind scenes in a row), `yellow-light-guard` (every VOX_YELLOW usage in engine code must resolveAccent per background — karaoke word, sweep stroke, bubbles connector, chips caption), `margin-guard` (illustration text keeps >=14% from frame edges), plus 5 light-scene yellow frame samples.
1. **Script/timeline**: sentence_timeline.json is SOURCE OF TRUTH. Never invent timings.
2. **Scene design**: group sentences into 4-10s scenes (1 visual stays, items appear per sentence). NO rapid scene cuts. Keep dead tail ≤4s (add a closing item if the sentence runs long).
3. **Assets**: images in `assets/images/` (34 originals, Pixabay/Wikimedia PD). Run rembg cutout → `public/ai-subtext/cutouts/`. Update CUTOUT_OK list.
4. **LICENSE GATE (MANDATORY — do not skip)**: after ALL assets are gathered (images + music +
   sfx), run `python docs/vox-pipeline/license_gate.py --project <project-id>`. **0 FAIL required** —
   if FAIL, fix the flagged assets and RE-RUN until 0 FAIL. Assets stage is NOT complete until
   this gate passes. The gate checks: license + provider on every asset, original_url + author on
   every image, and bans tags `ai generated` / `model` / `celebrity` / `famous` / `personality` /
   `trademark` (Pixabay first hits are not trustworthy — playbook §5b.1).
5. **Compose**: edit SCENES + patterns. Bundle. Draft render 45s segment (~40s) for fast check, then full draft (~4 min).
6. **Gate + user review** → fix → repeat. Only after approval: master 1080p (~40 min).

### Adding a new scene (checklist)
- start/end copied from timeline.json sentence boundaries (±0.3s)
- kind from the 10 pattern types; img in CUTOUT_OK if subject-cuttable
- items staggered across duration; colors: amber #C77F00 on light scenes, #fff200 only on dark
- last item within 4s of scene end
- ≥3 accent colors across the video (red/blue/green/yellow)
- then run the gate — it will tell you what broke

## 4. Rembg cutout (one-time setup done)

```powershell
# python = hermes venv (no pip). Use Python 3.13:
uv pip install --python "C:\Users\DELL\AppData\Local\Programs\Python\Python313\python.exe" rembg onnxruntime
# script: C:\Users\DELL\AppData\Local\Temp\kilo\cutout_all.py (adapt paths)
```

## 5. Audio pipeline

- **Narration**: 8 section mp3s (ElevenLabs eleven_v3), placed at section starts.
- **SFX**: 11 files in public/ai-subtext/sfx/ (keyboard_tap, pen_tick, deep_whoosh, warm_chime, dull_click, low_thud, paper_rustle, soft_bell, page_flip, ping_pop, ting_chime). Timed to beats.
- **Music**: background_music_final.mp3 (ElevenLabs compose, 340s) — **volume 0.05** (0.12 was too loud, user complaint). Old background_music.mp3 was BROKEN (324/340s silence — verify new tracks with `ffmpeg -af volumedetect`).

## 5b. Asset provenance, license & audio param recording (MANDATORY — user rule 2026-08-02)

Every external asset and every generated audio call MUST be traceable. No exceptions.

1. **Stock images/music (Pixabay/Pexels)**: never grab blindly. The API responses carry metadata —
   `pixabay_image` returns `user`, `tags`, `page_url`, `license`; `pexels_image` returns `photographer`,
   `photographer_url`, `alt`, `pexels_url`, `license`; `pixabay_music` returns `license` + author.
   **Record ALL of these fields per asset into the project's `asset_manifest.json`** (provenance:
   author + page URL + license + tool + search query). Both licenses allow commercial use without
   attribution, but the record is the appeal evidence if the channel is ever flagged.
   **The FIRST hit is NOT trustworthy** (2026-08-02 lesson: dog photo for 'businessman', orca for
   'iceberg', 3D key for 'closed door'): always audit `tags` before accepting — skip
   `ai_generated`, skip `model`/celebrity/personality tags, prefer real photos over illustrations,
   and prefer hits with a clear cuttable subject (see §5c.4). Re-search when the hit mismatches.
2. **Copyrighted content is OFF-LIMITS from stock**: film stills (Social Network, Tarantino, GoT),
   book covers, celebrity photos. Use CONCEPT/symbolic stock instead (arguing couple, medieval
   silhouettes, typewriter) — same as video 1 did. This is a compliance rule, not a style rule.
3. **Generated audio (TTS/music)**: record per call — provider, model_id, voice_id, ALL voice
   settings (stability/similarity/style/speed), text used, output path, duration, and
   **cost_usd** (TTS tool estimate: `chars × 0.0003`; music tool estimate: `duration/30 × 0.05`).
   TTS per-sentence params go into `sentence_tts_meta.json` (text/params/path/duration/ok per
   sentence); music prompt+params go into the asset_manifest entry. "Save the params you used" is
   a standing user requirement — do not skip it for speed.

## 5c. Asset density & anti-slideshow (MANDATORY — user rule 2026-08-02)

1. **Enough images, period.** A vox video ≥5 minutes needs **≥25-35 stock images** (video 1 =
   34 images / 308s ≈ 1 img / 9s). Fewer than ~15 images for a 400s+ video is a FAIL — user
   explicitly rejected 10 images for a 408s video ("quá ít"). Roughly: 1 image per 10-13s of
   runtime, NEVER less than ~0.8 per 10s.
2. **Images are NOT a slideshow.** Do NOT slice the video into equal 9s chunks and show one
   image each. Images appear at CONTENT beats: counterexamples (Hemingway desk, door slam,
   iceberg), hero punches (fingerprint), emotional scenes (couple arguing). Text punches, chip
   stacks, chat windows, counters stay image-free. Interleave pattern views (photo / text /
   chips / chat / collage / counter / bubbles) — no two same-kind scenes back-to-back when avoidable.
3. **Every image is a paper-collage element**, not a fullscreen slide: PhotoCard or
   SubjectCutout with rotation ±1-2°, washi tape, torn edge (feDisplacementMap), drop shadow,
   and text items overlaid on the paper background. NEVER a bare fullscreen photo sequence
   (that is the slideshow look the user rejected).
4. **Subject-rich images (MANDATORY)** — the soul of the vox look is the rembg cutout following
   a real silhouette (human, statue, animal, or a concrete object). Photo scenes MUST prefer
   images with a clear cuttable subject:
   - A 5+ minute video needs **≥8 human/statue images** (portraits, silhouettes, hands,
     statues, puppets, people acting) — spread across the video, not clustered in one chapter.
   - Landscape / texture / interior shots are allowed but **≤ 1/3 of total images** — they are
     breathing room, not the main diet.
   - When a stock hit is a bare landscape or a fuzzy texture, re-search for a subject version
     (e.g. "man at desk" instead of "desk", "hand holding pen" instead of "pen").
   - The gate's cutout check (≥60% of photo scenes) is the FLOOR; the target is ~2/3+ of photo
     scenes with a subject cutout that visibly follows the shape.

## 6. User-approved visual language (DO NOT regress)

| Element | Rule |
|---|---|
| Paper bg | cream #F5F0E8 / dark #171A1C, noise+fibers+halftone+vignette |
| Yellow | #fff200 ONLY on dark. Light bg → amber #C77F00 |
| Accents | red #D64541, blue #2E74B5, green #2E7D32 for variety |
| Cutouts | subject silhouette (rembg), never geometric frames for people/objects |
| Motion | spring entrance, settle, HOLD STILL. On-twos. No perpetual boil |
| Subtitle | fixed bottom zIndex 30, karaoke word highlight; illustration text top/middle |
| Text size | 26px labels → 150px hero (NEITHER/NO.) |
| Scenes | 4-10s, items staggered; annotation labels hold 2.5s+ |

## 7. Lessons learned (paid in hours)

1. **@remotion/google-fonts FAILS in headless render** (18s network timeout → fallback font). Fix: download woff2 → public/fonts/ + @font-face via staticFile. URLs from `getInfo()` in cjs modules.
2. **feDisplacementMap DOES render** in real scenes — my EdgeTest said otherwise (measurement artifact). User's eyes are ground truth.
3. **Ctrl-C on npx remotion leaves children running** (chrome-headless keeps rendering, CPU hog). Kill: `Get-Process | Where-Object { $_.ProcessName -match "chrome-headless" } | Stop-Process -Force`.
4. **Permission denied on render** = target file open in player. Render to new filename.
5. **Draft render speed** (~7.2fps ceiling, CPU-bound): bundle once → `--every-nth-frame=3 --scale=0.2 --concurrency=8 --gl=angle --image-format=jpeg`. Full 308s ≈ 4 min.
6. **Scene pacing**: single-sentence scenes = rapid cuts user can't read. Group into 4-10s scenes with in-scene item stagger.
7. **Vox yellow on light paper = glaring**. Always resolveAccent.
8. **Music track may be silently broken** (ElevenLabs compose can return near-silent). Always volumedetect after generation.
9. **License/provenance is not optional** (2026-08-02): record author+page_url+license per stock asset in asset_manifest; record params+cost per TTS/music call. Skipping it = future flagged-content risk with no appeal evidence.
10. **Free first for music** (user 2026-08-02): Pixabay music before ElevenLabs compose; if composing, short 2-3 min track looped at volume 0.05 (full-length compose costs ~$0.90 for 9 min — only when user explicitly wants it).
11. **Image count is a review criterion** (user 2026-08-02): ≥25-35 stock images for 5+ min videos; 10 images for a 408s video was rejected. But images are content-beat collage cards, NEVER an equal-interval slideshow (playbook §5c).
12. **Subject-rich is non-negotiable** (user 2026-08-02): vox cutouts need real silhouettes — ≥8 human/statue images per 5+ min video; landscape/interior ≤1/3 of total images. Re-search for subject versions when the hit is a bare landscape (playbook §5c.4).
13. **License gate is automatic** (user 2026-08-02): after assets, run `license_gate.py --project <id>` and re-run until 0 FAIL — never eyeball-check licenses "by memory".
14. **"Phèn/xấu" is measurable, not a feeling** (user 2026-08-03, reference study vs Johnny Harris / Gemini Omni / Vox / Claude+Remotion videos): our master measured sharpness 0.0075 (ref 0.010-0.014), edge density 0.032 (ref 0.047-0.098), hue bins 2.25/frame (ref 2.75-4.9), saturated-px 0.037 (ref 0.06-0.31), grain 0.0125 (ref 0.021-0.043), frozen 99% of runtime (ref 21-84%). Full numbers + spec: `research/vox-reference-study-2026-08-03.md` Part 3.
15. **Numeric spec, not adjectives** (user 2026-08-03): every visual rule has a number + a gate check. Vox v2 targets: sharpness ≥0.012, edges ≥0.055, hues ≥3.5, saturated-px ≥0.12, grain ≥0.020, freeze ≤55%, max-freeze ≤6.0s, SFX ≥100 with max gap ≤8.0s, photo scenes ≥60% continuous zoom, scene avg 6.5-7.5s. Gate checks in `gate_vox.py` (runtime beauty gate + static sfx-gap/motion-zoom/push-drift).
16. **3-layer scene architecture + chapter-locked backdrop** (from Claude+Remotion vox video, same stack): one shared background per act (full-bleed, toned, reused across act scenes) + midground B&W halftone cutout + foreground text/annotation = "one continuous shot" instead of cut slideshow. Implemented: `ChapterBackdrop` + `ACT_BG` in VoxScenes.tsx.
17. **Red offset stroke behind cutouts** (Johnny Harris signature): 8px red (#D64541) silhouette duplicate behind the subject — cheap 3D illusion + the exact vox marker look. Implemented in `SubjectCutout offsetStroke`. Also: **B&W halftone treatment on cutouts** (magazine/paper feel, "doesn't look digital") — `SubjectCutout halftone` (SVG pattern masked to the subject alpha).
18. **Continuous motion on every held scene** (Vox editors hold 5-6s — slow is correct, static is not): `PushIn` (scale 1.0→1.12 linear across scene) + `PaperBg drift` (paper texture translating 0.35%/s) + karaoke/items on-twos. This is what took frozen 99% → target ≤55%.
19. **SFX motivates every event** (Vox producer Nate Krieger: "not have anything happen on screen without a sound effect"): 1 SFX per item entrance + per scene transition (104 events for 308s, max gap 6.67s) — generated programmatically, kept as a literal array so the gate can parse it.

## 8. Cleanup rules (user complaint: workspace was full of test media)

- Deliverables ONLY in `videos/YYYY-MM/NN-slug/` (master + approved draft + 00-state.md)
- Working renders ONLY in `projects/<slug>/renders/` — keep master + latest draft only
- Workspace root: NO media files, ever
- `public/<slug>/`: only files referenced by code; delete intermediates (music_new, *_boosted, old tracks)
- End-of-session sweep: list root media + renders/, delete everything not in the keep-list
- Per-video state doc: `videos/YYYY-MM/NN-slug/00-state.md` (status, deliverable paths, how to continue)

## 9. Current file map (what's where)

- Workspace deliverables: `subtext_VOX_FULL_v5_draft.mp4` (approved draft), `subtext_VOX_FULL_master.mp4` (TBD)
- Project renders: `projects/ai-cant-write-subtext/renders/`
- Research: `research/vox-style-research-deep.md`, `vox-style-research.md`, `vox-layout-composition-deep.md`, `vox-motion-deep.md`, `vox-asset-sourcing-deep.md`, `vox-photo-treatment-deep.md`, `vox-type-color-texture-deep.md`
