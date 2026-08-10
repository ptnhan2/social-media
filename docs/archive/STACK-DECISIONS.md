# Social Media Content Stack — Chốt & Quyết định

> Indie builder, lĩnh vực **viết lách (tiểu thuyết, worldbuilding)**. Mục tiêu: pipeline AI hỗ trợ A→Z, input idea → batch produce → publish thủ công. Ưu tiên free/opensource/BYOK.
> Cập nhật: 2026-08-01 (**PIVOT 2: bỏ HyperFrames-handdraw — video dùng OpenMontage, clone tại `openmontage/`**).

## 1. Stack đã chốt

| Lớp | Tool | Trạng thái |
|---|---|---|
| **Video (production)** | **OpenMontage** (clone `openmontage/`, agentic production system — bên trong dùng HyperFrames + Remotion làm render runtime) | ✅ Chốt 2026-08-01 |
| **Video (composition engines)** | Remotion (data-chart/explainer scenes) + HyperFrames (motion-graphics/GSAP) — do OpenMontage chọn theo brief | ✅ (OpenMontage quản lý) |
| **Voice (TTS)** | ElevenLabs (có key) + Piper (local free fallback) | ✅ Chốt |
| **Publish** | **Manual** (upload trực tiếp từng platform) | ✅ Chốt. Batch produce, đăng theo lịch |
| **Text content (tạo)** | **claude-skill-social-post** (creation-only) | ✅ Chốt. Học voice + 29 công thức viral + 14-day calendar |
| **Idea/research** | LLM + Google Trends + VidIQ | 🟡 Nguyên tắc, chưa setup |
| **Orchestration** | **KiloCode agent (1 agent duy nhất)** — content-manager-agent: research→script (in-project) + production (OpenMontage) | ✅ Chốt. n8n bỏ |
| **Long-form video** | OBS + DaVinci Resolve (free) | ⬜ Khi cần |
| **Content tracking** | Google Sheets | ⬜ Tạo template |

## 2. OpenMontage — production layer (chốt 2026-08-01)

- **Vai trò**: lớp video production duy nhất. Clone thẳng vào project tại `openmontage/` (giữ `.git` riêng, gitignore để cập nhật qua `git -C openmontage pull`). Setup: `.venv` (Python 3.11) + `requirements.txt` + `remotion-composer` npm install + `.env` (user tự nhập key).
- **Kiến trúc**: agent-first. Kilo agent = orchestrator: đọc `openmontage/AGENT_GUIDE.md` → chọn pipeline (`pipeline_defs/*.yaml`) → stage-by-stage (đọc director skill `skills/pipelines/<pipeline>/<stage>-director.md`) → checkpoint qua `lib/checkpoint.py` (gate `human_approval_default` bắt buộc dừng chờ user) → render → final_review (ffprobe + frame + audio).
- **Flow**: 12 pipelines (animated-explainer, cinematic, animation, documentary-montage, clip-factory, talking-head, screen-demo, hybrid, localization-dub, avatar-spokesperson, character-animation, podcast-repurpose). Provider selector scored 7-dim (task fit/quality/control/reliability/cost/latency/continuity). 100+ Python tools, registry discover. Backlot board (storyboard live + approval gate).
- **Input từ project**: research→script (phase 0-1) GIỮ NGUYÊN trong project (`videos/YYYY-MM/NN-slug/0X-*.md`); agent seed `brief` + `script` artifacts từ `02-brief.md` + `03-script.md` vào `projects/<project-id>/`.
- **Output**: `projects/<project-id>/renders/final.mp4` + decision_log (audit trail).
- **Provider/BYOK**: 100% BYOK — `.env` của openmontage, user tự nhập (ElevenLabs, Pexels, Pixabay, FAL, Kling, Google...). Có sẵn free: Piper TTS, Pexels/Pixabay/Unsplash stock, Wikimedia/Archive.org footage, local GPU video (WAN/Hunyuan/LTX), FFmpeg.
- **Budget**: `openmontage/config.yaml` — cost_tracker (observe/warn/cap), single_action_approval_usd 0.50, total cap 10$.
- **ĐÃ XOÁ (2026-08-01)**: `tools/hf/` (gen-scene.js, assemble.js, handdraw.js), `videos/_shared/hf-handdraw/`, `videos/demo-handdraw/`, `videos/test-handdraw/`, `videos/**/hf/` compositions, `docs/HYPERFRAMES-HANDDRAW.md`, `docs/HYPERFRAMES-FEATURES.md`. Lý do: 2 flow edit video xung đột làm rối; OpenMontage cover toàn bộ production (kể cả hand-drawn doodle qua Ink Theater style + `/ink-art` + `/animated-drawing`).
- **Lưu ý**: hand-scribble kiểu VideoScribe (bàn tay cầm bút viết lên ảnh thật) KHÔNG có sẵn trong OpenMontage — nếu sau này cần, port `handdraw.js` (đã xoá, có thể khôi phục từ git history) thành 1 OpenMontage tool. Ink Theater (OpenMontage) = doodle mascot, khác thể loại.

## 3. claude-skill-social-post — text content creation (đã chốt)

- **Vai trò**: tầng tạo text-social content (post/thread/caption) — **chỉ TẠO, KHÔNG đăng** (đăng thủ công).
- **Cài chính thống**: clone + copy `social-post/` → `~/.agents/skills/social-post` (KiloCode) + `~/.claude/skills/social-post` (Claude Code). Repo: Hao0321/claude-skill-social-post, 553⭐, MIT, active.
- **Cơ chế**: học giọng bạn (đọc ~20 bài FB/X → `style_profile.md`) + **29 công thức viral** (F1-F29) + **42 rules** (R1-R42) + 40 case studies + 14-day calendar + performance loop.
- **Dùng phần nào**: voice-learning + formulas + calendar + performance loop = **bộ não content**. **BỎ** browser auto-đăng.
- **Cần làm**: adapt công thức cho niche viết lách/worldbuilding; cung cấp style samples (FB/X).

## 4. Orchestration (đã chốt)

- **Design**: 1 KiloCode agent duy nhất (`content-manager-agent.md`) = orchestrator → PHẦN A: research→script (validate, framework, humanize, compliance — giữ nguyên); PHẦN B: production qua OpenMontage (preflight → pipeline → gate → render → final_review). Không tách 2 agent.
- **Review gate**: agent save draft vào `drafts/` → bạn xem/fix → publish thủ công lên từng platform.
- **KHÔNG dùng MCP / Open Design / HyperFrames CLI trực tiếp.** Agent gọi OpenMontage Python tools qua `.venv`.
- **n8n**: KHÔNG dùng. Batch content workflow = thủ công theo `BATCH-CONTENT-WORKFLOW.md`.

## 5. Nguyên tắc anti-ban (đã chốt)

- **Đăng thủ công** từng platform, KHÔNG scraper/browser-automation.
- **Disclose AI** cho video (HyperFrames) (YouTube/Meta/TikTok yêu cầu).
- **Nội dung nguyên gốc** (script viết của bạn, không stock rập khuôn) → tránh reused/repetitious.
- **Cadence hợp lý** (1-2 post/ngày/platform).

## 6. Còn mở / chưa làm

- [ ] Restart KiloCode session → agent mới (content-manager-agent v2) pick up OpenMontage
- [ ] Nhập key vào `.env` (ElevenLabs đã có ở project .env — cần copy sang; thêm PEXELS_API_KEY free nếu muốn documentary)
- [ ] Test production đầu tiên: chạy 1 video từ script có sẵn (`videos/2026-08/01-subtext/03-script.md`) qua OpenMontage
- [ ] (Tuỳ chọn) Map DESIGN.md brand → custom playbook `openmontage/styles/`
- [ ] Cung cấp style samples (FB/X) cho social-post học giọng + adapt công thức VN/văn học
- [ ] Setup idea/research routine (Google Trends + VidIQ)
- [ ] Tạo Google Sheets content tracking (template trong BATCH-CONTENT-WORKFLOW.md)
- [ ] Analytics feedback loop (YT Studio + X Analytics → review tuần)

## 7. Đã loại / không chọn

- **HyperFrames-handdraw workflow (tự xây)**: **ĐÃ XOÁ 2026-08-01** — chuyển hẳn sang OpenMontage. Đã xoá: `tools/hf/`, `videos/_shared/hf-handdraw/`, demo/test dirs, `videos/**/hf/`, 2 docs HyperFrames. OpenMontage cover toàn bộ production (có sẵn Ink Theater hand-drawn doodle + `/ink-art` + `/animated-drawing` cho nhu cầu hand-drawn; HyperFrames + Remotion là render runtime bên trong).
- **Open Design** (nexu-io/open-design): **ĐÃ BỎ 2026-07-27**. Lý do: (1) OD app = MP4 player, **KHÔNG timeline editor** (timeline editor = HyperFrames Studio riêng qua `hyperframes preview`); (2) MCP wrapper `create_project` hardcoded `skipDiscoveryBrief`, không set `kind:video` (GUI-only) → project thành Prototype; (3) daemon desktop-auth gate chặn write từ outer agent; (4) MCP stale port cần reload Kilo liên tục; (5) glm-5.2 inner-agent qua OD bị timeout 10-min/ACP response. OD ≠ HyperFrames (2 hệ sinh thái riêng, OD chỉ dùng HF làm render backend). Bỏ OD, dùng HyperFrames standalone = đơn giản, không friction.
- **MoneyPrinterTurbo**: all-in-one footage-montage, lane phụ B-roll stock, KHÔNG backbone.
- **n8n**: KHÔNG dùng orchestration. Orchestration = KiloCode agent + skills.
- **Kokoro/whisper/MusicGen**: bỏ (có ElevenLabs).
- **social-auto-upload** (browser automation): risk ban cao, tránh.
- **ALwrity** (1.094⭐): bỏ (không chất lượng).
- **Open-Generative-AI** (23.848⭐): bỏ.

## 8. Strategy v3 (đã chốt — Craft × AI direction, July 2026)

**Positioning**: "I analyze how AI handles writing craft — why it fails, what that reveals about craft, and how to fix it."

**Direction**: Craft × AI Intersection (researched from 300+ sources, scored 30/35 vs 14/35 for tool reviewer). Bridges traditional writing craft (Sanderson, MICE, Save the Cat) with AI-assisted writing. Not tool reviewer (saturated). Not pure craft (no AI). The BRIDGE.

**Content**:
1. **Craft × AI videos** (8/tháng, 2/week) — analytical videos taking craft principle → analyze how AI handles it → why it fails → how to fix. Pure analysis from public sources (docs, Reddit, academic). No tool testing. First-person analytical voice.
2. **Daily buildin-public devlog** (5-7/tuần) — git log → agent → social post → approve (1min).

**Monthly output**: 8 Craft × AI videos + 30 devlogs + 4 newsletters + 16 repurpose pieces = ~58 pieces.
**Time**: ~2h/day = ~54h/month. Per video: ~3-3.5h production + 1.5h repurpose = ~5h.
**Không test tool, không viết tiểu thuyết.** Agent research + draft, user design framework + handwritten hook + rewrite, publish thủ công.
**Monetize**: product (primary, future) + newsletter (primary, immediate) + course (after 3 months) + AdSense (quaternary).
**Files**: `CONTENT-STRATEGY.md` + `CONTENT-CALENDAR.md` + `DESIGN.md` + `BATCH-CONTENT-WORKFLOW.md` + `AUTHENTICITY-PIPELINE.md` + `CONTENT-CREATION-MECHANISMS.md` + `RESEARCH-FRAMEWORKS.md` + `RESEARCH-VALIDATION-METHODOLOGY.md`.
