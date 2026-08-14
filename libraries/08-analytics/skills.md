# Mined Skills — 08-analytics

> Knowledge curated for the current production pipeline (2026-08-12).
> Source: skills/ (164 files mined, 2 relevant to this branch).

## long-form
**Summary:** 8-15 min video structure: hook by 0:30, chapters 2-4 min each (max 5-6), re-hook at 2:00, pattern interrupts every 45-90s, and retention curve management with burst sequences and open loops. Contains 2025-2026 retention benchmarks by duration and the 2-3 min retention valley survival tactics. Hard warnings on AI-generated content retention penalties (70% lower) driving TTS quality requirements. Audio must stay consistent (-14 LUFS, <2 LUFS chapter variation) with continuous ducked music bed.
**Key numbers/params:**
- Sweet spot 8-15 min; retention target 40-60% AVD; chapters 2-4 min; narration 150-160 WPM
- Retention benchmarks: 1-3min good 60%/excellent 75%; 10-20min 40%/55%; 20-60min 35%/50%
- Platform average AVD 23.7%; only 16.8% exceed 50% retention; only 16% reach final 10s; +10pp retention ≈ +25% impressions
- AI video retention ~70% lower; AI narration → 35% drop-off in first 45s
- 55%+ leave in first 60s; retention valley at 2:00-3:00 (first payoff before 2:00, interrupt at 1:45)
- Pattern interrupts: major every 60-90s, minor every 20-30s; bursts of 5-10 cuts for 10-15s every 2-3 min; interrupts in first 5s = +23% retention
- Music: duck -18 to -20 dB under speech, ±10 BPM consistency, 2-3s crossfades; LUFS variation <2 per chapter; limiter -1.5 dBTP
- Cut intervals: hook 3-5s, early body 10-15s, mid body 15-25s; B-roll clip 5-8s, B-roll 35-50% of video (+15-25% watch time); max 15s without change
- End screen last 5-20s (no critical content); max 1 info card per 2 min
- Chapter lengths: simple 2-3min, complex 3-4min, demo 2-3min, story 3-5min
**Actionable rules:**
- Complete hook + tension by 0:30; deliver first major payoff before 2:00
- Re-hook every 3-4 min with verbal signposts ("But that's not even the interesting part...")
- Plant open loops in the first 60s; resolve them late
- If retention <30% at any section, that section needs a pattern interrupt
- Reserve last 20 seconds for end screen; never put critical content there
- Prioritize natural-sounding TTS + sound-design processing chain to fight AI-content retention penalty

## video-understand-usage
**Summary:** `video_understand` has 4 modes: describe, qa, quality, classify — quality mode numerically measures blur/brightness/contrast for automated post-render gating. Use `clip` model for fast batch checks, `blip2` for detailed description/QA, `llava` only for deepest analysis. Sample strategically (default 5 frames; quality review needs first/middle/last minimum) — never run on every frame of a long video.
**Key numbers/params:**
- Quality thresholds (PASS): blur_score > 100 (Laplacian variance), brightness 50-200, contrast > 30 (pixel stddev)
- Bad indicators: blur < 100, brightness < 50 or > 200, contrast < 30
- Default max_frames 5; pre-edit review uses ~10, highlight selection ~20
- Models: `clip` fast, `blip2` medium, `llava` slow
**Actionable rules:**
- Do: run `quality` mode as a post-render gate in compose; combine with reviewer rubric
- Do: validate generated assets with qa ("Does this image show X?")
- Do: check talking-head face visibility before lip-sync/face-restore
- Don't: run video_understand on every frame of long video

---
