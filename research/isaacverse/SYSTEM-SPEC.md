# IsaacVerse — System Spec (vận hành, để pipeline tái tạo chất lượng)

> Mục tiêu: hệ thống mình thiết kế tạo ra video chất lượng như IsaacVerse. Dẹp vox.
> Doc này = spec vận hành trích từ 8 transcript, organise theo stage sản xuất + map sang AI-agent pipeline.
> Không phải summary — là spec: bước, tham số, rule, guardrail.

## Stage 0 — Channel system (container)
- **Transformation, không topic**: "take people making robotic soulless videos → teach them to make videos like a human." Khác biệt = transformation viewer walk away with.
- **Format series** ("How I actually X") → binge → avg views/viewer ↑ → exponential. Format > 1 viral.
- **Persona + grand story**: Isaac (hero) + Steven (wise guide). Mỗi video = pillar của 1 grand story (Marvel: standalone→Endgame). Story scenes/charts/reason-teaching đều leading somewhere. Continuity state liên video.
- **Anti-soulless guardrail** (chạy xuyên): value > retention; refuse "retention optimizer" (strip soul); "good enough" > perfectionism; giữ phần có giá trị dù giảm retention.
- **Consistency core**: palette (main+black+white+mid+highlight), font (Eastman), rule-of-thirds — nhận diện trên homepage.

## Stage 1 — Idea
- **Outlier video** (perform 10-100x normal channel) = nguồn. Analyze WHY: thumbnail? intro? story? transformation? (vd pre-diabetes→Ironman 100 days + philosophical self-reflection). Write down + adapt.
- **Common goal**: align viewer goal + your goal. Mismatch (guru: learn money vs sell course) = feels fake, viewer senses.
- **Trojan horse**: pure knowledge không ai muốn → bọc trong entertainment ở MỌI layer.

## Stage 2 — Script (foundation, ordered pipeline)
1. Idea + outlier analysis.
2. Common goal (viewer↔you).
3. **Surface problem + DEEPER problem** — emotional struggle dưới technical. VD: shorts→patience, editing→perfectionism, shorts-channel→determination. Deeper problem = cái làm nổi bật, subconsciously.
4. **Thumbnail-first**: script phải deliver promise thumbnail. Packaging = first impression.
5. **Audience avatars** (1-2 persona: trình độ, mục tiêu) → complexity level không mất viewer.
6. **Research → GAP**: cái người khác chưa giải thích. Gap = cơ hội.
7. **Outline**: sequence điểm logic; state **START→END transformation** rõ (vd "Isaac wanting perfect tutorial → realizes it's about process not perfection").
8. **Story = Hero's Journey 12-point** (MỌI video, kể cả tutorial):
   - status quo (intro character, something's off)
   - call to adventure (why this video / teaser what's to come)
   - assistance (wise man / source knowledge — character KHÔNG biết hết từ đầu)
   - departure (breaking point → unknown → challenge bắt đầu)
   - trials (barriers, spice/action — main part of video, all points/mistakes/wins/losses/maps/breakdown)
   - approach (teaser biggest threat)
   - **crisis** (điểm thấp nhất, defeated bad, THEN tìm treasure = new idea/motivation/friend support; identity change; vulnerability — "show you don't know everything")
   - reward/treasure (what learned from crisis)
   - result (overcome crisis, achieve goal)
   - return (về ordinary world, bring/lose treasure)
   - new life (transformation: poor→rich, unhealthy→fit)
   - resolution (value realized) → status quo (new normal, cycle continues)
9. **Grand story connection**: video này = pillar nào của truyện lớn.
10. **Draft**: set timer, không care grammar/wording, chỉ get thoughts ra, expand outline.
11. **Writing tactics**:
    - simple→complex dần (không mở advanced).
    - **make-them-figure-out**: thay tell, hỏi viewer suy luận (tease deeper problem → reveal end). 2-teacher analogy (teacher cho hints/questions vs lecture).
    - **but/therefore** (South Park) không "and then" — causal.
    - **rhythm**: đổi độ dài câu.
    - **edit notes inline** (music, footage, match cut).
12. **AI roast outline** (missed/boring/add/remove/plot twist) — KHÔNG viết thay (generic, no soul).
13. **Refine**: reorder, cut, flow.

## Stage 3 — Voice (AI, humanized)
**4 elements realistic**: (1) tone variation (ups/downs, sudden mono→excited); (2) intentional pauses on important points (không cắt hết — "lifeless robot controlled by algorithms"); (3) emphasis; (4) **human-written script** (ChatGPT script → robotic dù voice tốt; "we know").
- **ElevenLabs custom voice** (voice design: describe "young man 20s, American, quirky charismatic, lots of emotion"). Model **V2** (V3 alpha unstable, đổi voice). Settings: speed↑, stability↓, similarity ~70%, style exaggeration↑.
- **SECRET SAUCE (replicable)**: sinh **FEW SENTENCES/batch** (không cả script). Lý do: (a) bad take → regen không waste credit; (b) **mỗi gen tone/speed hơi khác dù cùng text** → download 2 free regens → trong edit **chop best section mỗi take + combine** → như human (tone/speed biến thiên) → hết uncanny. Hundreds of gens. "Small changes huge difference."
- **Script punctuation → voice**: `...`=disappointed/confused; `!`=excited (more ! if not); CAPS=emphasis; commas/`...`=pauses.
- **Post**: parametric EQ + high-pass filter (↑H) + find/remove echoey freqs (preset pack). Speed adjust: preserve pitch (Premiere distort → tự làm).
- **DUBBING (superpower)**: split track — mute all except VO → export MP3; mute VO → export music+SFX MP3. ElevenLabs dubbing: original→target, upload VO, generate, download. Premiere: top=original (timing guide), mid=dubbed, bottom=music+SFX → align → mute original → preset dubbed → export audio. YouTube Studio: Languages → delete auto-dub (Google Translate voice) → select lang → upload audio. Translate title+desc (ChatGPT). English <20% YouTube; top 6 lang ~half → triple audience.

## Stage 4 — Assets
- **Music**: Epidemic Sound (paste Spotify song → similar). **SFX**: Epidemic + YouTube. **Overlays**: electric/dust/light-leaks = video black-bg → screen blend transparent. **Presets**: save + reuse.
- **Footage**: from internet; **watch MOVIES with editor's eye** (transitions/montage/camera angles "not implemented on YouTube yet") — không chỉ YouTube.
- **Character**: AI image head/logo trên stock image.

## Stage 5 — Edit (assembly)
Pre: script phải tốt (edit không save bad script/idea). Secondary story (short-film chạy song song).
**Color-code script 6 category** → collect elements per category. (category VD: screen-record / image / video / animation / text / sfx — adjust theo style.)
Sequence: 1920×1080, 60fps.
**Track/order**:
1. **VO** → cut by script, remove awkward pauses.
2. **MUSIC EARLY** (không cuối) → vibe clarity + **beat cuts** + fun. Volume adjust to VO.
3. **Layer video/image/screen-record** per color-code highlights. Beat cuts optional.
4. Plain text on black bg (placeholder).
5. **Animations**: sketch giấy trước (boxes+arrows flowchart, blurred headings, zoom→reveal text). Easy: Canva (shapes/text/graphics+anim, **export hi-res** để zoom không pixelate). Hard: After Effects (text/shapes/pen base, **typewriter text**, **trim paths** move shapes, **glow** pop). Sketch→create→animate.
6. **Rough cut rewatch**: add anim/screen-record/meme, maybe rewrite script parts. **Cut boring lines/bad jokes** ("only keep good jokes").
7. **SPACE**: KHÔNG cắt mọi silence. "People don't have shorter attention spans, they have higher standards; make the stop worth waiting for." Cắt space = có thể cắt story.
**Effects**:
- **Discipline**: complement what's said, KHÔNG max effects. Resist urge. "Just because you can doesn't mean you should."
- **Zoom**: transform effect, scale+position keyframes start→end, smooth curves.
- **Focus consistency**: focal point GIỮ NGUYÊN vị trí qua cuts (rule of thirds / center / eyeline — favorite rule-of-thirds).
- **Go-to effects**: glow, 3D transform, blur, mosaic.
**Text 3 types**:
- captions (chỉ phần quan trọng, KHÔNG mỗi giây — irritating)
- center text (own color/glow/pop)
- scene-attached (trên screen/wall)
- **Pop anim (Finzar)**: transform on text, scale keyframe **70%** → (+7 frames) **110%** → (+5 frames) **100%**, smooth, +glow/glitch. **Save preset** (right-click→save).
**Overlays**: light leaks (screen blend) cho transitions; packs slide/shake/zoom/rotation. Don't go heavy.
**Character**: AI head on stock, keyframe move, smooth, preset.
**Color**: Lumetri per clip (exposure/contrast/saturation).

## Stage 6 — Sound design (= HALF the video)
- **3 main SFX**: whoosh, riser, impact. + keyboard/gears/meme/click/bomb/clock/anything.
- **Technique**: **MUTE hết audio track, xem video, add SFX bằng cảm giác** (not with VO+music on). **Combine SFX**. Lower volume (không annoying).
- Invisible nhưng felt. "Sound design is literally half the video."

## Stage 7 — Thumbnail
- **Rule of thirds** guide lines.
- **Palette**: main color (Isaac: yellow) + black + white + mid + 1 **highlight** (đổi highlight/video = fresh + recognizable).
- **Font**: Eastman (basic, không overused).
- **10 types** (shock / big-numbers / simple-weird-object / social-hacking(famous face niche) / header-comparison(before-after, cheap-vs-expensive) / blur-reveal / branded / ...) → **COMBINE 2-3**. Stick ~5 video rồi evolve (không lặp 100x).
- **Inspiration**: KHÔNG copy niche mình (= copycat vs 100K competitor) → **cross-niche**, adapt. Giữ core consistent.
- **Word**: big-number / bold-contrarian / representative-title / blank.
- **Photoshop**: sketch → lines/character/text/bg → layer style (inner+outer glow, save style) → warp → blur/mosaic bg → darken behind text (big soft brush, 5% flow, new layer) → hue/sat recolor → light reflection (overlay blend) → phone Lightroom color → test **thumbsup.tv** (homepage mockup).

## Stage 8 — Publish + Dub
- YouTube Studio, audio tracks (dub per lang), translate title/desc.

## Cross-cutting guardrails (soul)
- **Anti-soulless**: value > retention; refuse optimizer; "good enough" > perfectionism; giữ useful parts.
- **1-new-thing-per-video** (learning loop): vid1 Canva anim, vid2 electricity, vid3 AE storyline... "3h học 5s effect → 1h → 30m → ordinary."
- **Trojan horse** mọi layer.
- **Story every video + grand story**.
- **Honest guide** (learning out loud, few steps ahead, friend not professor).

---

## Map sang AI-agent pipeline của mình (cách hệ thống tái tạo chất lượng này)
Đây là cầu: IsaacVerse = human manual; mình = AI-agent. Map từng stage:

| Stage | IsaacVerse (human) | Pipeline AI-agent của mình |
|---|---|---|
| Script | 13-step foundation, hero's journey, deeper problem, grand story | AI agent chạy 13-step; hero's journey = structured template (12 slot); **deeper_problem = required field**; **grand_story = continuity state liên video**; AI roast outline (không viết); anti-soulless = rule-check (block strip-value-for-retention) |
| Voice | chop-combine few-sentence, hundreds gens, EQ | **per-sentence gen + N takes + programmatic chop-combine** (select best sections by tone-variance metric) + EQ preset chain; dubbing auto per target lang |
| Edit | color-code 6 cat → manual layer | **auto color-code** (tag mỗi sentence by category) → **auto-layer assets** → beat-cut to music → **animation templates** (= scene-recipe/variant system từ DESIGN-MECHANISM) → **focus-consistency auto** (giữ focal point) → text-pop preset → overlay placement |
| Sound | mute-then-add by feel, whoosh/riser/impact | **SFX catalog** (whoosh/riser/impact + ...) với `when_to_use` metadata → AI place by heuristic (on cuts/reveals/impacts) — "feel" = rule set |
| Thumbnail | rule-of-thirds + palette + type-combo + Photoshop | **thumbnail template system** (rule-of-thirds + palette + 10-type-combo) → AI gen per video |
| Quality | human taste | **quality gate** (gate_vox evolve): check story-structure (12-point), voice humanization (tone-variance), sound-design coverage, focus-consistency, anti-soulless |
| Soul | human refusal | **guardrail rules**: value>retention, keep-useful-parts, good-enough |

## Cần lưu ý (khó tự động hoá)
- **Chop-combine voice**: cần metric chọn "best section" per take (tone/speed variance) — khả thi nhưng cần tune.
- **"Feel" sound design**: mute-then-add là human intuition; AI cần rule set (SFX on cut/reveal/impact/emphasis) + catalog metadata — xấp xỉ, không hoàn toàn.
- **Grand story**: cần state liên video + human steer (AI không tự bịa grand story tốt).
- **1-new-thing-per-video**: là growth loop của human creator, không phải feature pipeline (nhưng pipeline có thể gợi ý "try new technique X" cho video sau).
- **Transcript chỉ reveal process**; chính xác visual (composition/motion/grade) + audio (EQ curve, SFX timing) cần xem video để trích thêm.
