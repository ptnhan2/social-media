# Whiteboard / Hand-Scribble Video — Landscape (researched 2026-07-27)

> 5 sub-agents, ~120 queries, ~80 sources deep-read. Bổ sung cho `HYPERFRAMES-FEATURES.md` (HyperFrames-only). Pattern: **bàn tay cầm bút scribble, content hiện ở đầu bút** (VideoScribe/Doodly style).

## TL;DR
- **OSS KHÔNG trống** (sai khi bảo "commercial-dominated, không có tool") — 7+ project mới May-Jul 2026. Real + working.
- **Tool tốt nhất OSS**: `gnipbao/whiteboard-video-engine` (51-164★ Python, neural line-art + hand cursor), `YangAgent/whiteboard-animation-skill` (63★ OpenCV), `FelttipAI` (full prompt→video), `Inkplainer-OS` (browser GUI).
- **API-native tốt nhất**: Golpo AI ($2/min, MCP+SDK), Thinking Lines (free 4/mo + REST).
- **Technique chuẩn**: serpentine mask reveal (pro) > SVG stroke-draw (chỉ uniform width). HyperFrames làm được, deterministic seek-safe.
- **CRITICAL cho niche của tôi (Craft×AI literary analytical)**: hand-scribble KHÔNG hợp — 0 kênh writing-craft lớn dùng (Sanderson/Hello Future Me/LFTS/Just Write đều talking-head hoặc motion-graphics). Nó fight tone analytical. → bỏ làm primary; kinetic-typography + data-viz (HyperFrames đang có) hợp hơn.

## 1. OSS tools (cross-platform, ranked)

### Tier A — hand-scribble MP4 thật (hand cursor + output)
| Tool | ★ | Stack | Ghi chú |
|---|---|---|---|
| gnipbao/whiteboard-video-engine | 51-164 | Python | Đầy đủ nhất: neural line-art (Informative Drawings/Anime2Sketch) + skeleton trace + hand cursor (4 kiểu: asian/black/children/white) + contour color fill + FFmpeg. CLI. |
| YangAgent/whiteboard-animation-skill | 63 | Python/OpenCV | Color image → 2-phase (line-art draw + contour color fill) + hand cursor. `--no-hand` toggle. Batch. Apache-2.0. |
| Inkplainer-OS (NadirWeb-App) | 7 | HTML/JS | Browser GUI: upload image → pick style → hand draws → MP4/WebM. 5 hand styles, 12 anim styles. |
| FelttipAI (shahnoormujawar) | 0 (new) | Node/TS | Full pipeline: PDF/DOC/MD → LLM plan → SVG icons → Edge TTS → pen-leads-narration → MP4. ~$0.001/video. Remotion fallback. |
| chalkboard (Atharva-Kanherkar) | 2 | TS | Prompt → narrated hand-drawn diagram. RoughJS + Graphviz + Playwright + FFmpeg. `--draw` flag. |
| GuigsEvt/claude-skill-whiteboard | ~1 | Python | GitHub repo → narrated whiteboard MP4. Kokoro TTS, hand cursor, pencil foley. |
| brandonvant/claude-skill-whiteboard-explainer | ~1 | HyperFrames/JS | Serpentine mask reveal + photo hand + Whisper sync. Premium approach, WIP. |
| Alexander-Kz/video-layer-skill | ~5 | Python | VO MP3 → full whiteboard episode. Production-grade, 23 scripts, vision review. |
| zkbys/whiteboard | 49 | Python/JS | Topic → whiteboard infographic, HyperFrames render. |

### Tier B — stroke animation (no hand cursor, hoặc partial)
storyboard-ai (146★ SAM3 segmentation+stroke), diafram (8★ Remotion stroke-dasharray), rough-remotion (~5★ Rough+Remotion), HandDraw-Skill (~3★), excalimate (45★ Excalidraw→keyframe MP4/Lottie), image-to-animation-offline (29★ Kivy), subroy13/handanim (46★ Python programmatic), OpenDoodler (61★ WPF stale).

### Tier C — building blocks (libs, không phải tool)
Vivus.js (15K★ SVG draw, no hand), Rough.js (20K★ hand-drawn render), Walkway (4.4K★ archived), Manim (39.7K★ — rejected hand-cursor #3381, chỉ text cursor), Remotion (26K★ framework), Motion Canvas (16K★), Excalidraw (127K★ whiteboard UI, no video export), tldraw (40K★).

## 2. Commercial (pricing / free / API)

### Classic editors (no API)
VideoScribe ($12.50-23/mo, 7-day trial), Doodly ($39-69/mo, no free), Voomly ($49/mo bundle), Mango ($99 perpetual), Explaindio (~$479 lifetime), CreateStudio ($67 lifetime), DoodleMaker ($47-69 one-time).

### API-native (automation-ready) ⭐
| Tool | Cost | API |
|---|---|---|
| Golpo AI | $2/min ($200 min) | REST v2 + MCP + Python/Node SDK. Golpo Sketch engine (stylus/marker/pen). Best programmatic quality. |
| Thinking Lines | free 4/mo, $29/mo Pro | REST v1 + WebSocket. POST /v1/videos/generate. |
| Whiteframes AI | 30 free credits | Python SDK `pip install whiteframes`. `create_video(video_type="whiteboard")`. |
| Renderforest | $14.99/mo + API | REST + Node/PHP SDK. Template-based. |
| InVideo | $30/mo, $0.15/min | REST + MCP + Node/Python SDK. Whiteboard minor. |
| FlexClip | $9.99/mo | REST + JS/TS SDK. Whiteboard templates limited. |
| Biteable/Moovly/Animaker/Vyond | various | REST hoặc Zapier. Whiteboard không primary. |

### Lifetime deals
DoodleMaker $47-69, CreateStudio $67, Mango WM $99, Explaindio ~$479, Motionvid AI (AppSumo) $49-389.

## 3. Engineering — 4 techniques

- **A. Serpentine mask reveal (PRO standard)**: artwork hoàn chỉnh bị mask serpentine che, animate stroke-dashoffset reveal + hand PNG cưỡi đầu mask (`getPointAtLength(progress*len)`). Hoạt động với bất kỳ artwork (photo/illustration/calligraphy). Đây là cách VideoScribe/Doodly/brandonvant.
- **B. SVG stroke-draw**: animate nét của chính SVG path + hand theo. Chỉ uniform-width line-art. Dễ, hạn chế.
- **C. Clip-path/mask cho variable-width**: calligraphy/brush — cắt non-overlapping pieces, mask riêng từng cái. Khó.
- **D. Asset compositing**: pre-rendered hand video loops + reveal. After Effects, frame-by-frame. Extreme effort.

**Gotchas (10)**: mask width calibration (per-element), crossover bleed (1 image/element), scallop cap gaps, nib offset calibration, hand rotation sync (tangent via atan2), Chrome mask+blend-mode bugs (`mix-blend-mode:multiply` ở WRAPPER không image), pathLength Safari bug, Doodly memory-only bottleneck (7-10h render), closed-path direction ambiguity, audio sync cần Whisper word timestamps.

**Stack recommended deterministic**: HyperFrames (HTML+GSAP+Puppeteer beginFrame+FFmpeg) + Technique A — seek-safe, frame-accurate, brandonvant skill đã debug.

## 4. AI-native generators — verdict

12 tools, tất cả <200★, tất cả <6 tháng tuổi. **Category đang ấp, chưa mature** — không có 1 tool nào `prompt → full narrative whiteboard MP4` hoàn chỉnh một bước. Top 3: gnipbao (engine render tốt nhất), chalkboard (architecture end-to-end tốt nhất), Golpo AI (cloud API mature nhất). Expect convergence mid-2027.

## 5. Assets

- **Hand PNG poses (pro)**: SVG Doodle Whiteboard (Piers Baker, svgdoodlewhiteboard.com/hands) — £0.10-0.50/each, ~100 poses, cùng artist → consistent. **Best source.**
- **Hand PNG (free)**: Vecteezy, Freepik, Icons8 (doodle style), PNGTree, LovePik.
- **Illustrations (content)**: Rough.js (programmatic, 20K★ MIT, sinh sketchy shapes từ code — scalable nhất), dddoodle/fffuel (120+ SVG CC), SVG Repo, Doodle Icons (Khushmeen).
- **Fonts (Google, free commercial)**: Patrick Hand (body), Caveat (script), Permanent Marker (headline), Kalam, Architects Daughter.
- **AI gen hand**: KHÔNG recommend — consistency kém. Dùng stock/Rough.js.
- **Hand spec**: 8 poses tối thiểu (draw-right/down/up, point, open-palm, hold, start, exit), forearm off-frame (crop mid-forearm, entry consistent edge, wrist bend 15-30°), nib calibration pixel-perfect.

## 6. NICHE VERDICT — Craft×AI literary analytical

**Hand-scribble KHÔNG hợp niche này.**
- 0 kênh writing-craft lớn dùng whiteboard: Brandon Sanderson (lecture cam), Hello Future Me / LFTS / Just Write (film clips + motion graphics), Abbie Emmons / Ellen Brock / Alexa Donne (talking head), Tale Foundry (motion comic), Terrible Writing Advice (satire anim). RSA Animate/AsapSCIENCE dùng whiteboard nhưng cho science/philosophy, không literary.
- Tone fight: "AI analytical" = modern/data/precision; hand-scribble = analog/imprecise. Literary analysis cần text chính xác (quote passages) — whiteboard sketch không render text đẹp.
- Audience perceives whiteboard = corporate training / 2012 explainer / cheap Udemy.
- Engagement data: whiteboard tốt hơn text/audio (Türkay 2016) NHƯNG không có study so whiteboard vs motion-graphics cho literary niche.

**Recommendation cho niche**: bỏ hand-scribble làm primary. Dùng polished 2D motion graphics + kinetic typography + data viz (HyperFrames đang có, fit "analytical"). Nếu muốn accent hand-drawn → Rough.js programmatic sketches cho structural diagrams (plot arcs/Freytag/character maps), 10-20% video, không phải visual language chính.

## 7. Decision matrix (nếu VẪN muốn hand-scribble)

| Trường hợp | Tool |
|---|---|
| Self-host BYOK, render engine mạnh nhất | gnipbao/whiteboard-video-engine (Python) |
| Prompt→video 1 lệnh, rẻ | FelttipAI (~$0.001/video) hoặc chalkboard ($0 local) |
| Browser GUI (không code) | Inkplainer-OS |
| API cloud, chất lượng pro | Golpo AI ($2/min) hoặc Thinking Lines (free 4/mo) |
| Trong HyperFrames (stack hiện tại) | brandonvant skill (Technique A, serpentine mask) — WIP |
| Lifetime 1 lần, manual | DoodleMaker $47-69 hoặc CreateStudio $67 |
