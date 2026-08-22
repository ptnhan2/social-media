# Pipeline IsaacVerse — canonical (vox retired)

> Hệ thống mới: AI-agent pipeline tạo video chất lượng IsaacVerse. **Vox retire hoàn toàn.**
> Nguồn spec: `research/isaacverse/SYSTEM-SPEC.md` (8 stage vận hành trích từ 8 transcript).
> Nguồn mechanism: semantic treatment registry + Composer evidence gates (retrieval + recipe + quality-gate).

## 0. Nguyên tắc (không thoả hiệp)
1. **Story-driven**: hero's journey 12-point trong MỌI video + grand story liên video.
2. **Trojan horse**: knowledge bọc entertainment ở mọi layer.
3. **Anti-soulless**: value > retention; refuse optimizer; "good enough" > perfectionism; giữ phần có giá trị.
4. **Humanized AI voice**: chop-combine few-sentence, tone-variance, pauses on emphasis.
5. **Sound design = half video**: whoosh/riser/impact + combo, mute-then-add.
6. **Fancy disciplined editing**: complement script (không max effects), focus-consistency, space/pacing.
7. **Transformation not topic** + format series.

## 1. Vox retire (dẹp hoàn toàn)
- ❌ vox primitives: PaperBg, TornFrame, SubjectCutout, accent-plaque ItemText, on-twos, grain/vignette, VOX_YELLOW.
- ❌ vox registry: 7 researched layouts (triptych/quote-card/...).
- ❌ gate_vox criteria → thay bằng quality gate mới (giữ cơ chế runtime-check tool).
- ✅ GIỮ: Composer semantic canvas editor, mechanism research, skills/, tools/ infrastructure.
- Retired reference material is not part of the active pipeline.

## 2. Core reframe: BEAT-driven, không layout-driven
Vox = layout (sắp xếp không gian) per scene. IsaacVerse = **beat** (narrative moment) per edit-unit. Video = chuỗi beat. Mỗi beat gộp: narrative role + script + voice directive + edit category + motion + sfx + asset. Pipeline compose beat → timeline → render.

## 3. Data model
```ts
type JourneySlot = "status_quo"|"call"|"assistance"|"departure"|"trials"|"approach"|"crisis"|"reward"|"result"|"return"|"new_life"|"resolution";

interface Beat {
  id: string; order: number;
  journey_slot: JourneySlot;          // hero's journey 12-point
  script: string;                      // line(s) spoken
  deeper_problem_touch?: boolean;      // beat có chạm deeper problem?
  voice: {
    emphasis_words?: string[];         // CAPS
    pause_before?: boolean;            // "..." intentional pause
    emotion?: "excited"|"disappointed"|"confused"|"neutral";
    takes: number;                     // N generations for chop-combine
  };
  edit_category: "screen_record"|"image"|"video"|"animation"|"text"|"sfx";  // color-code 6
  motion: string[];                    // motion_token ids: zoom, text_pop, glow, 3d_transform, blur, mosaic, beat_cut
  sfx: string[];                       // sfx ids: whoosh, riser, impact, click, meme...
  asset?: { src?: string; type?: string };
  duration_s: number;
}

interface VideoDoc {
  id: string; series_id?: string;      // format series + grand story
  idea: string;
  common_goal: { viewer: string; creator: string };  // must align
  surface_problem: string;
  deeper_problem: string;              // emotional struggle — REQUIRED
  thumbnail_promise: string;           // script delivers this
  audience_avatars: { persona: string; level: string }[];
  grand_story_link: string;            // pillar nào của truyện lớn
  beats: Beat[];                       // 12 (hoặc gộp) — hero's journey
  transformation: { start: string; end: string };    // start→end
  thumbnail: ThumbnailSpec;
  dubs: { lang: string; audio: string }[];
}
```

## 4. Pipeline stages (AI-agent flow)
```
Idea → Script(VideoDoc) → Voice → Edit assembly → Sound → Thumbnail → Quality gate → Render → Publish+Dub
```

**S1 Idea**: outlier video retrieval (10-100x) → analyze why → adapt. Common-goal align check. Trojan-horse framing.
**S2 Script**: AI agent chạy 13-step foundation → xuất `VideoDoc` (beats[12], deeper_problem, grand_story_link, transformation). AI **roast outline** (missed/boring/add/remove/plot twist), KHÔNG viết thay. Anti-soulless rule-check (block strip-value-for-retention). Human steer grand story.
**S3 Voice**: per-beat (per-sentence) ElevenLabs V2 gen + N takes → **programmatic chop-combine** (metric: tone/speed variance, pick best section mỗi take) → EQ preset chain → assembled VO track. Punctuation→voice (`...`/`!`/CAPS). Dubbing: split VO/SFX → dub → re-align per lang.
**S4 Edit assembly**: auto color-code script (tag mỗi beat edit_category) → layer asset per category → **beat-cut to music** → animation templates placed per beat → **text-pop preset** (70%→110%(+7f)→100%(+5f)+glow) → overlays (light-leak transitions, screen blend) → **focus-consistency** (focal point same spot across cuts) → Lumetri color per clip. SPACE guardrail (không cắt mọi silence).
**S5 Sound**: SFX catalog → AI place by rule-set (whoosh=transition, riser=build, impact=reveal/emphasis, click=UI, meme=beat) — "mute-then-add feel" heuristic. Combine SFX. Lower volume. = half video.
**S6 Thumbnail**: template system (rule-of-thirds + palette: main+black+white+mid+highlight + font) → 10-type combo (shock/big-number/simple-weird/social-hacking/header-comparison/blur-reveal/branded) → AI gen → thumbsup.tv-style contrast test.
**S7 Quality gate** (post-gen, thay gate_vox): xem §6.
**S8 Render + Publish**: Remotion render master → YouTube → dub audio tracks → translate title/desc.

## 5. Catalog (vocabulary tái sử dụng, thay vox registry)
Mỗi entry = retrieval-optimized metadata (`description` + `when_to_use` + `when_not` + `params`). AI retrieve theo narrative beat.
- **Motion tokens**: `zoom` (transform scale+position, smooth curves), `text_pop` (70→110+7f→100+5f, glow), `glow`, `3d_transform`, `blur`, `mosaic`, `beat_cut`, `light_leak_transition`.
- **SFX**: `whoosh`(transition), `riser`(build), `impact`(reveal/emphasis), `click`(UI), `keyboard`, `gears`, `meme`, `bomb`, `clock`.
- **Edit categories** (color-code 6): screen_record, image, video, animation, text, sfx.
- **Voice techniques**: `chop_combine`, `emphasis`(CAPS), `pause`(...), `excited`(!), `eq_preset`.
- **Thumbnail templates**: 10 types + rule-of-thirds + palette + cross-niche inspo.
- **Animation templates**: canva-style (shapes/text) + ae-style (typewriter, trim_path, glow) as Remotion comps.
- **Story templates**: hero's journey 12-slot (the spine), grand-story continuity state.

## 6. Quality gate (thay gate_vox)
Post-generation, trước render master. FAIL = quay lại stage lỗi.
- **Structural**: hero's journey 12-slot đầy đủ; `deeper_problem` có + được resolve ở crisis/reward; `grand_story_link` có; `common_goal` align; `transformation` start→end rõ.
- **Voice humanization**: tone-variance across takes ≥ threshold (không monotone); pauses on emphasis; không "uncanny pattern" (chop-combine verified).
- **Sound coverage**: transitions/reveals/impacts có SFX; không flat; volume không annoying.
- **Edit**: focus-consistency (focal point ổn định qua cuts); effects complement script (không max); SPACE (không cắt mọi silence — "make the stop worth waiting for").
- **Anti-soulless**: value retained (no strip-for-retention); useful parts kept; "good enough" (không perfectionism-loop).
- **Thumbnail**: rule-of-thirds + contrast + type-combo + readable on homepage mockup.

## 7. Project structure reorient
- `libraries/04-visual/` → repurpose thành **catalog** (motion tokens, sfx, edit categories, thumbnail templates, animation templates) với semantic metadata. KHÔNG còn vox layouts.
- `tools/` → voice (chop-combine), edit-assembly, sound-placement, thumbnail, quality-gate.
- `skills/` → giữ (ElevenLabs TTS, image gen, ffmpeg...) — đã align.
- `projects/<slug>/` → `script.json` (VideoDoc) + `voice/` + `edit/` + `renders/` + `master_1080p.mp4`.
- `docs/PIPELINE-ISAACVERSE.md` → doc này (canonical).
- `remotion-composer/` → renderer + animation templates (Remotion comps) + Composer live review/editor.

## 8. Build phases
- **P1 Data model + VideoDoc schema**: `types.ts` (Beat, VideoDoc, catalog entries). Nền.
- **P2 Script agent (S2)**: 13-step → VideoDoc, hero's-journey 12-slot filler, deeper-problem, grand-story state, anti-soulless check, AI roast. (Core — story là spine.)
- **P3 Voice (S3)**: per-sentence gen + N takes + chop-combine metric + EQ preset + dubbing.
- **P4 Catalog + retrieval**: motion/sfx/edit/thumb templates với metadata, AI retrieve per beat.
- **P5 Edit assembly + sound (S4+S5)**: color-code → layer → beat-cut → animation/text-pop/overlay → focus-consistency → SFX placement → Lumetri. (Renderer = Remotion comps.)
- **P6 Quality gate (S7)**: structural + voice + sound + edit + anti-soulless checks.
- **P7 Thumbnail (S6)** + render/publish/dub (S8).
- Composer live editor — direct manipulation and Kilo handoff operate on semantic beat elements.

## Local Final Acceptance

The reproducible local acceptance project is `projects/isaacverse-final/`. It is
JSON-driven and intentionally separate from the old Composer fixture. Use
`docs/FINAL-RUNBOOK-ISAACVERSE.md` for the exact resume, Composer, window-render,
QA, master, dubbing, thumbnail, and publish-dry-run commands.
