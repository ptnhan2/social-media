# Mined Skills — 05-audio

> Knowledge extracted from openmontage skills (2026-08-04).
> Source: skills/ (164 files mined, 11 relevant to this branch).

## sound-design
**Summary:** Full loudness/ducking spec for video mixes: dialogue at -12dB peak, music 18-20dB below speech, SFX between, target -14 LUFS integrated (YouTube/TikTok/IG) with true peak ≤ -1.5 dBTP. Music BPM selection by content mood, SFX placement with audio-leads-visual timing, and a complete AI TTS (ElevenLabs) processing chain (HPF → EQ → compression → de-esser → limiter). Ducking rules favor aggressive ducking for educational content.
**Key numbers/params:**
- Dialogue -12 dB peak / -16 to -14 LUFS; music bed -30 to -20 dB (18-20 dB under dialogue); SFX -18 to -12 dB
- Music BPM: calm 60-80, standard 90-110, upbeat 120-140, action 140-200
- Whoosh: start 10-20ms before visual, 400-500ms duration; SFX levels: pop <200ms -15/-12dB, click <100ms -20/-15dB, riser 1-3s, impact <300ms -12/-6dB
- Duck music 6-12 dB during narration; up to 22 dB for complex educational topics; W3C: music 20 dB under speech; BBC: extra 4 dB lower
- LUFS targets: YouTube/TikTok/IG/Spotify -14 LUFS; Apple Podcasts -16 LUFS; true peak -1.5 dBTP (Spotify -2)
- Tech: 48 kHz / 24-bit / ≥192 kbps / noise floor < -60 dB / ≥ -6 dB headroom
- TTS chain: HPF 80-100Hz (24dB/oct), cut ~500Hz, boost 2-5kHz (+2-3dB), cut 6-8kHz; comp 3:1 (2:1-4:1), attack 1-5ms, release 10-20ms (30ms if pumping), threshold -26dB, output +6dB; limiter ceiling -1.5 dBTP
**Actionable rules:**
- Always instrumental music under voiceover; choose dynamically even tracks (no crescendos/beat drops)
- EQ trick: cut 2-4 kHz on music bed to clear the speech intelligibility band; test on phone speakers
- Sidechain music to voiceover for automatic ducking; fine-tune sync in 1-frame increments
- For AI TTS, compression is more critical than for human speech (inconsistent dynamics); notch-cut 4-6 kHz artifacts if present

## whisperx
**Summary:** The `transcriber` tool (faster-whisper + WhisperX alignment) is the entry point for every transcript-dependent workflow: subtitles, edit decisions, scene analysis. Word-level timestamps are always enabled and feed `subtitle_gen` directly; VAD removes silence. Diarization is optional (pyannote, requires `HF_TOKEN`) and should only be enabled for multi-speaker content. Model size is chosen by the quality/speed tradeoff, with `large-v3` for final production.

**Key numbers/params:**
- Models: `tiny` ~1GB/10x realtime, `base` ~1GB/5x (default for dev), `small` ~2GB/3x, `medium` ~5GB/1.5x, `large-v3` ~10GB/0.5x (best quality, production)
- Diarization requires `whisperx` + `HF_TOKEN`; skipped gracefully if unavailable
- `language: null` auto-detects (adds ~1s overhead); pass explicit ISO 639-1 code (`en`, `es`, `ja`) when known
- Word timestamps include `probability` confidence scores (0-1)

**Actionable rules:**
- Skip diarization for single-speaker content — adds latency with no benefit; enable only for interviews/podcasts
- Spot-check 3-5 transcript segments for accuracy; verify timestamps align with actual speech

---

## cinematic
**Summary:** "Cinematic" and "epic" are banned adjectives — translate mood into concrete choices (aspect ratio, lens, grade, shot duration, audio layer count). Pacing follows a breathing rhythm with varied shot lengths, never the same length 3x. Audio is 4 layers (dialogue/music/ambient/Foley), music at 60-90 BPM dynamic not loop-based. Cinematic grading keeps lifted shadows and rolled-off highlights with one consistent LUT.
**Key numbers/params:**
- Aspect ratios: 2.39:1 → 1920x803 (138px bars), 2.35:1 → 1920x817, 1.85:1 → 1920x1038, 16:9 flat
- FPS 24; shot duration 4-8s standard (action 2-4s, documentary 6-12s, contemplative 10-20s, montage 1-3s)
- Cuts/min: cinematic 8-15, montage 20-40
- Audio layers (peak): dialogue -12dB, music -24 to -18dB, ambient -30 to -24dB, Foley -18 to -12dB
- Music 60-90 BPM; silence 3-5s at key reveals; room tone at -35dB
- Grades: `cinematic_warm` 0.85, `cinematic_cool` 0.7, `moody_dark` 0.6, `vintage_film` 0.7
- Narration 140-150 WPM (slower than standard 155)
- Murch rule priority: emotion → story → rhythm → eye trace → 2D plane → 3D space
**Actionable rules:**
- Do: replace "moody"/"epic" with lighting+grade+shot-duration combos
- Do: layer min 3 audio layers; remove music 3-5s at reveals
- Do: letterbox only when framing genuinely benefits (never for screen recording/talking head)
- Don't: repeat the same shot length 3 times; pure black/pure white in grade

---

## short-form
**Summary:** Short-form (9:16, 1080x1920) requires a frame-1 hook (70% decide within 3s), mandatory captions (80% watch muted, +12% retention with captions), and a visual change every 1-3 seconds. Universal safe zone is 900x1400 centered; bottom 300-320px is dead (platform UI). 3-second retention drives algorithm multipliers — target 70%+ at 3s, 60% at 15s, 50% at 30s. Algorithm rewards total watch time over completion rate.
**Key numbers/params:**
- Safe zone: universal 900x1400 centered; TikTok 900x1492, Reels 996x1400, Shorts 984x1500
- Durations: 15s (92% completion), 30s (84%), 60s (68%), 60s+ (48%)
- Retention→view multiplier: <60% = 1.0x, 60-70% = 1.6x, 70-85% = 2.2x, 85%+ = 2.8x
- Upload: H.264 High Profile L4.2, 8-15 Mbps VBR, max 500MB/287.6MB/72MB (desktop/iOS/Android)
- Captions: 42px+ bold sans-serif, 75% black bg or 3px stroke, max 30 chars/line, max 2 lines
- Pacing: visual change every 1-3s, 20-40 cuts/min, text 2-4s per block, no hold >3s, speed ramp 1.2-1.5x
- Word counts: 15s→35-40, 30s→70-80, 60s→125-150
- Audio: VO -12/-14 dB, music -22/-26 dB, target -14 LUFS, true peak -1 dBTP; VO at 180-200 WPM
- Music: 120-140 BPM energetic, 90-110 explainer
**Actionable rules:**
- Do: text on screen frame 1 (within 0.5s), voice starts immediately, movement in frame 1
- Do: keep important content above the bottom 300-320px dead zone
- Do: end 60s tutorials with a loop back to the hook
- Don't: static openings, blank intros, logos before the hook, silent buildup

---

## music-gen-usage
**Summary:** Music generation for video: `music_v1` model, always `force_instrumental=true`, always include "background"/"underscore" in prompt. BPM must match content type (explicit in prompt, never left to genre). Prefer generating at exact video duration (up to 10 min per generation) over looping; for loops use FFmpeg + 2-3s crossfade. Music sits 18-20 dB below narration, with 2-4 kHz cut to clear the speech intelligibility band.
**Key numbers/params:**
- Model `music_v1`; min 3,000ms; max 600,000ms; cost ~$0.05/30s (3-min video ≈ $0.30)
- BPM by type: explainer 80-100, corporate 100-120, epic 60-80, montage 120-140, calm 50-70, comedy 100-130, sad 60-80, hype 140-170
- Key/mood mapping: happy=C/G major, serious=D/A minor, mysterious=E/B minor, triumphant=D/Bb major, melancholic=F/C minor
- Duck music 18-20 dB below narration; cut 2-4 kHz on music bed
- Section-mapped music: intro 8-10s, main 90-120s, reveal 20-30s, outro 10-15s
- Loop strategy: generate track 30-60% of video length, `ffmpeg -stream_loop`, crossfade 2-3s
**Actionable rules:**
- Do: specify BPM, key, energy direction ("steady" vs "building gradually") explicitly
- Do: one track per video unless a clear narrative shift
- Do: test on phone speakers — duck more aggressively if narration disappears
- Don't: use lyrics/vocals under narration; "bright hi-hats" or "prominent vocals" in prompts (2-4 kHz band)

---

## enhancement-strategy
**Summary:** Enhancement is a fixed chain: subtitle burn → face enhance → color grade → audio enhance → final encode, each step optional and gracefully skipped. Face/color/audio presets are matched to footage condition (good footage = polish; degraded = restore elsewhere). Overlay density scales inversely with video length. Placement rules protect the speaker's face and keep subtitles in the bottom 20%.
**Key numbers/params:**
- Face presets: `talking_head_standard` default, `soft_skin`, `sharpen`, `brighten`, `denoise`
- Grade intensities: `cinematic_warm` 0.85, `cinematic_cool` 0.7, `bright_clean` 0.8, `moody_dark` 0.6, `neutral` 1.0
- Audio presets all target -16 LUFS: `clean_speech`, `voice_clarity` (3k/5kHz boost), `podcast`, `noise_reduce`, `normalize_only`
- Overlay density: short-form every 3-5s (subtitles mandatory), medium every 10-20s, long-form every 30-60s
- Subtitles bottom 20% (margin_v 50 vertical, 40 horizontal); text overlays 2-5s on screen
**Actionable rules:**
- Do: apply in the order subtitle → face → grade → audio → encode
- Do: consider overlay/B-roll if speaker on camera >30s straight
- Do: keep overlay position consistent once placed
- Don't: cover the speaker's eyes/nose/mouth; add decoration-only overlays

---

## screen-recording
**Summary:** Record at 4K and deliver at 1080p to enable 2x zoom headroom into code. Enlarge the cursor 1.5-2x with highlight ring, move deliberately, pause 0.5s before clicking. Speed-ramp boring parts (2-4x for installs/builds), keep key code at 1.0x, remove all dead air >1.5s with jump cuts masked by a subtle zoom shift. IDE font must be 18-22px+ for readability at delivery.
**Key numbers/params:**
- Record 3840x2160 → deliver 1920x1080; 60fps for UI/scrolling, 30fps for static code
- Cursor: 1.5-2x size, ring/glow ~50px radius, click flash, hold 0.5s before click
- Zoom: code focus 1.5-2x, UI highlight 2.0-2.5x, terminal 1.5x, transitions 0.6-0.8s ease-in-out
- Hold pan position ≥3s; jump-cut mask zoom shift 1.0→1.02x
- Speed: typing 2-3x, navigation 1.5-2x, installs/build 2-4x or cut, key code 1.0x
- Audio: HPF 80Hz, 3:1 compression, target -16 LUFS
- IDE: font 18-22px, zoom 150-175%, line numbers ON, minimap OFF
**Actionable rules:**
- Do: use `scene_detect` content/30/2.0s to find natural segments
- Do: hide cursor when not needed; announce what you're zooming into
- Do: dark theme, subtitles recommended
- Don't: circle the cursor; wander randomly; leave pauses >1.5s

---

## voice-performance-director
**Summary:** Generated narration must sound directed, not merely read. Every narration-led script carries a top-level `voice_performance` object (intent, pacing profile, energy curve, pause policy, provider notes) plus section-level `delivery_cues` (pace, energy, emphasis_words, pause timing, provider_text with SSML/break tags). Write spoken language, use silence as structure, one delivery idea per section. Provider mapping: OpenAI `gpt-4o-mini-tts` with `instructions` (never tts-1/tts-1-hd), Google SSML with break tags within supported ranges, ElevenLabs lower stability + moderate style + speed 0.7-1.2.
**Key numbers/params:**
- OpenAI: `model: "gpt-4o-mini-tts"` carries `instructions`; do NOT send instructions to `tts-1`/`tts-1-hd`
- Google TTS: `input_type: "ssml"`; `speaking_rate` in 0.25-2.0, pitch in -20..20
- ElevenLabs: lower stability (more variation), moderate style, `speed` 0.7-1.2, high similarity_boost
- Sample gate: pause_before_seconds 0.2 / pause_after_seconds 0.7 example; sample from the most performance-sensitive section, not necessarily the first
- Failure conditions: no voice_performance plan; generic "read naturally"/"expressive" only; provider/voice/speed change after sample approval without new sample
**Actionable rules:**
- Do: carry the voice performance plan from script to asset generation and verify with a sample
- Do: one delivery idea per section — split sections that need three emotional turns
- Do: record approved sample path + provider settings in the asset manifest
- Don't: use generic directions without concrete pace/emphasis/pause/energy cues; overuse pause tags (theatrical/slow)

---

*Source: `skills/creative/*` + `skills/meta/*` (24 files). Research-only extract — no library files modified.*

## explainer/asset-director
**Summary:** Produces every asset from the scene plan (narration, images, diagrams, code, music) and verifies each file exists with quality checks. Mandates budget check before generation, sample-preview approval per expensive asset type (TTS/image/music) to prevent wasted spend, and a CHAI-style 3-pass prompt self-review (pre-caption → critique against 5-aspects → post-caption). Music failure must be reported, never silently deferred.
**Rules we should adopt:**
- Inventory asset tasks from scene plan (scene_id, type, tool, estimated_cost) + narration (per section), music (1 track), optional SFX.
- Check budget BEFORE generating: sum estimated costs vs remaining; if over, route to cheaper providers, reduce image count, or skip optional assets.
- Sample preview to prevent wasted spend: TTS sample (from most demanding section), image sample (most representative scene), music sample — max 3 iterations per type before escalating; costs ~$0.03-0.08 to prevent $1-3 waste.
- TTS generation: apply delivery_cues/provider_text; map cues to provider params (OpenAI: instructions only w/ gpt-4o-mini-tts; Google: ssml + speaking_rate 0.25-2.0; ElevenLabs: stability/similarity_boost/style/speed); verify duration ±15%.
- Flat-voice failure rule: if approved voice sounds monotone/rushed/ignores pauses, do NOT batch — fix voice_performance params and regenerate sample.
- Image prompts built from scene purpose (shot language + adapted visual anchor + concrete subject), consistency anchors applied but NOT identical phrasing per image (same prefix everywhere = machine-made feel).
- Music priority: user-selected library track → user music_library → generation API (check registry status first, skip immediately if unavailable) → log `music_status: "unavailable"` with reason. Never produce video silently without music.
- CHAI 3-step prompt self-review before every generation prompt: draft → critique (5-aspects: specified? confusable terms disambiguated? emotional adjectives replaced with visual causes? consistency anchors verbatim across shots?) → rewrite. Log pre/critique/post triplet.
- Mid-production fact verification: web-search actual appearance of real places/people/objects before generating images — don't trust model training data.
- Verify every asset exists on disk + narration durations ±15% + sample settings match batch + visual consistency + budget.
- Never AI-generate images with verbatim text (CTA, names, contact, legal) — use text_card.
**What we already do differently:**
- We already do per-sentence TTS with open/norm/punch/question tagging + cost per sentence, Pixabay-first assets with license gates, and rembg cutouts. We don't do the sample-preview approval loop or the CHAI 3-pass prompt review — both are cheap adoptions. Music priority + explicit failure reporting aligns with our Pixabay-free-first path.

## longform-educational/asset-director
**Summary:** Voice consistency is THE #1 longform rule: all 12 chapters of narration must use the identical voice identity — pass exactly the same provider settings to every TTS call, verify programmatically, no per-chapter tuning. Narration timing is probed per chapter and fed back to the EP (narration > planned ×1.05 → rewrite chapter). Asset volume is managed per chapter with checkpoints; cheap assets (Pixabay over AI) preferred for filler.
**Rules we should adopt:**
- Voice consistency enforcement: read voice_identity from script metadata; identical provider_settings on EVERY TTS call; compare programmatically (don't eyeball); record `voice_consistency.identical_settings = true`; mismatch = revise assets.
- Language param: ALWAYS set `language` (e.g. `"vi"`) with eleven_v3 for non-English; never auto-detect; verify voice supports it before committing.
- Per-chapter timing: probe EVERY narration file duration; compute per-chapter totals; flag chapters where narration > planned ×1.05 (EP sends back for rewrite); re-gen a chapter's narration requires re-probing duration (re-gen changes the slot, cascades to edit).
- Sample preview for longform: ONE sample from the opening chapter's hook section (most performance-sensitive); approve once; then batch all chapters with identical settings — don't re-ask per chapter.
- Asset volume (12 chapters): 36-60 images, 48-96 narration files; generate/verify/checkpoint per chapter (partial_progress).
- Style consistency across batches: same visual anchors in every prompt; chapters generated on different days must not look like different videos.
- Prefer cheap: stock (Pixabay/Pexels) over AI for filler scenes, diagrams over generated images for data scenes.
**What we already do differently:**
- We already use per-sentence ElevenLabs TTS with recorded params + Pixabay-first assets; the identical-settings-across-all-chapters verification and per-chapter duration feedback loop are the longform additions to adopt.

## animation/asset-director
**Summary:** Prefers deterministic assets over high-variance generation (diagram_gen before generic images, math_animate for real math, provided art first). For image-based animation, generates 2-3 images per scene using a reusable VISUAL SYSTEM (anchors kept in metadata) + nearby seed values for natural crossfade, tests one image first, then batches idempotently, and COPIES assets to Remotion's public/ directory (the #1 render-failure cause). Builds reusable systems (typography, lower-thirds, motifs) once.
**Rules we should adopt:**
- Deterministic-first: diagram_gen before generic image gen, code_snippet for code scenes, math_animate for real math motion, provided artwork before new generation.
- Sample preview: TTS sample (strongest pacing/emotional section) + one visual sample before batching; max 3 iterations; don't batch until approved.
- Multi-image generation workflow (image_animation): define a VISUAL SYSTEM (reusable anchors, e.g. "hand-painted nature fantasy, warm moss-and-amber palette, soft diffused light") → adapt per scene (wide establishing / close beat / abstract reveal) → use nearby seeds (100, 101) for A/B variants of the same prompt = subtle differences = natural crossfade → generate ONE test image at final res first → batch (skip existing = idempotent) → copy to `remotion-composer/public/<project>/`.
- Reusable systems built once: typography treatments, lower-third/label styles, repeated motif assets, background containers.
- Narration optional but the plan must be explicit: narration-led / text-led / music-led stated in metadata; narration-led applies voice_performance + delivery cues.
- Consistency ≠ same prompt every time: keep a recognizable world while letting each beat feel fresh.
- Pitfalls: high-variance gen when deterministic works, rebuilding the same title/label system repeatedly, hiding failed asset paths, treating TTS as raw text-to-audio (needs pauses/emphasis cues).
**What we already do differently:**
- We already enforce "copy vs import" discipline via `shared/layouts/` + `shared/primitives.tsx`. The public/ staging + seed-management crossfade recipe is new and applies if we adopt anime_scene.
