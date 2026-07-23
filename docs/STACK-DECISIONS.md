# Social Media Content Stack — Chốt & Quyết định

> Indie builder, lĩnh vực **viết lách (tiểu thuyết, worldbuilding)**. Mục tiêu: pipeline AI hỗ trợ A→Z, input idea → batch produce → publish thủ công. Ưu tiên free/opensource/BYOK.
> Cập nhật: 2026-07-20 (publish thủ công, batch workflow).

## 1. Stack đã chốt

| Lớp | Tool | Trạng thái |
|---|---|---|
| **Video (tạo + edit)** | **Open Design** (chứa HyperFrames) | ✅ Chốt gộp. HTML→video, hợp content văn học |
| **Voice (TTS)** | **ElevenLabs** (có key) | ✅ Chốt. Bỏ Kokoro (không cần) |
| **Publish** | **Manual** (upload trực tiếp từng platform) | ✅ Chốt. Batch produce, đăng theo lịch |
| **Text content (tạo)** | **claude-skill-social-post** (creation-only) | ✅ Chốt. Học voice + 29 công thức viral + 14-day calendar |
| **Idea/research** | LLM + Google Trends + VidIQ | 🟡 Nguyên tắc, chưa setup |
| **Image + Brand** | **Open Design** (Image studio + DESIGN.md) | ✅ Chốt gộp. gpt-image-2 + 93 prompts + 150 brand systems |
| **Orchestration** | **KiloCode agent + MCP (Open Design) + custom skill** | ✅ Chốt. n8n bỏ |
| **Long-form video** | OBS + DaVinci Resolve (free) | ⬜ Khi cần |
| **Content tracking** | Google Sheets | ⬜ Tạo template |

## 2. Open Design — video + image + brand (gộp, đã chốt)

- **Vai trò**: NỀN TẢNG THIẾT KẾ thống nhất — video + image + deck + prototype + brand system. **Chứa HyperFrames** (heygen) làm lớp video (cùng engine đã cài). Gộp thay standalone HyperFrames + tool ảnh riêng.
- **Repo**: nexu-io/open-design, **79.283⭐**, Apache-2.0, TypeScript, tạo 2026-04 (non ~3 tháng nhưng verified thật), push hôm qua.
- **Image studio (verified)**: `gpt-image-2` / ImageRouter / custom API (cloud, BYOK, **không GPU**). 93 prompt template sẵn. Ví dụ thật editorial/cinematic/illustrated → hợp literary.
- **DESIGN.md (verified)**: brand system 9-section (color/typography/spacing/layout/components/motion/voice/brand/anti-patterns). **150 brand systems ship sẵn**. Mọi render đọc DESIGN.md → consistency across video+image+deck. = BRAND.md mình cần.
- **Video = HyperFrames (heygen) tích hợp**: agent viết HTML+CSS+GSAP → MP4 (headless Chrome+FFmpeg). 11 HyperFrames templates + 39 Seedance prompts. Standalone HyperFrames skills đã cài vẫn OK, nhưng Open Design là primary.
- **Agent-native**: skills + CLI + **MCP** (`od mcp install <agent>`), chạy 22+ agent (Claude Code/Cursor/...) ← fit KiloCode. Desktop app macOS/Windows, BYOK mọi layer (OpenAI/Anthropic/Google/Ollama).
- **Mode video**: Companion + Storyboard (tay-to, craft văn học) — giữ nguyên như HyperFrames.
- **Linh vật**: PNG theo trạng thái → agent pick theo kịch bản + GSAP in/out. Giới hạn: flat motion (ảnh lướt/bay), không rigged.
- **Edit/preview**: sandboxed iframe preview, sửa realtime; render ~5 phút/60s. Không phải timeline kéo-thả CapCut.
- **Caveat**: non 3 tháng (verified thật, không vaporware); chi phí ảnh qua gpt-image-2 (OpenAI paid BYOK); cần adapt DESIGN.md cho phong cách văn học (viết 1 brand system literary).
- **Cần làm**: cài Open Design desktop (Windows) + viết DESIGN.md literary + restart session KiloCode để MCP/skill nhận.

## 3. claude-skill-social-post — text content creation (đã chốt)

- **Vai trò**: tầng tạo text-social content (post/thread/caption) — **chỉ TẠO, KHÔNG đăng** (đăng thủ công).
- **Cài chính thống**: clone + copy `social-post/` → `~/.agents/skills/social-post` (KiloCode) + `~/.claude/skills/social-post` (Claude Code). Đã rename `style_profile.md` + `content_plan.md`. Repo: Hao0321/claude-skill-social-post, 553⭐, MIT, active (push hôm qua).
- **Cơ chế**: học giọng bạn (đọc ~20 bài FB/X → `style_profile.md`) + **29 công thức viral** (F1-F29, validated small-creator <5K follower) + **42 rules** (R1-R42) + 40 case studies + 14-day calendar + performance loop (track 2h, review 2 tuần).
- **Validation thật**: tác giả mega-viral 80K view / 94% non-follower; F19 proven portable trên 3 account độc lập (+4-8.6K follower). Có fail postmortem.
- **Dùng phần nào**: voice-learning + formulas + calendar + performance loop = **bộ não content**. **BỎ** phần browser auto-đăng.
- **Caveat**: Đài Loan-centric (cần adapt VN/văn học); cần ≥20 bài public để học giọng; công thức từ Taiwan AI/dev circle.
- **Cần làm**: restart session KiloCode để `skill` nhận `/social-post`; adapt công thức cho niche viết lách/worldbuilding; cung cấp style samples (FB/X của bạn).

## 4. Orchestration (đã chốt)

- **Design**: KiloCode agent (mình) = orchestrator → gọi **MCP** (Open Design) + load **social-post skill** + ElevenLabs. Flow: idea → tạo (video/ảnh/text) → save draft → bạn review/fix → publish thủ công.
- **Review gate**: agent save draft vào `drafts/` → bạn xem/fix → publish thủ công lên từng platform.
- **MCP glue**: `od mcp install <agent>` (Open Design) → wire vào KiloCode. Agent gọi trực tiếp, không middleware.
- **Custom orchestration skill**: tự viết 1 `SKILL.md` encode flow + brand rules. (Chưa viết.)
- **n8n**: KHÔNG dùng. Batch content workflow = thủ công theo `BATCH-CONTENT-WORKFLOW.md`.

## 5. Nguyên tắc anti-ban (đã chốt)

- **Đăng thủ công** từng platform, KHÔNG scraper/browser-automation.
- **Disclose AI** cho video (Open Design/HyperFrames) (YouTube/Meta/TikTok yêu cầu).
- **Nội dung nguyên gốc** (script viết của bạn, không stock rập khuôn) → tránh reused/repetitious.
- **Cadence hợp lý** (1-2 post/ngày/platform).

## 6. Còn mở / chưa làm

- [ ] Cài Open Design desktop (Windows) + viết DESIGN.md literary (brand văn học)
- [ ] Install MCP vào KiloCode: `od mcp install <agent>`
- [ ] Viết custom orchestration skill (SKILL.md: flow + brand rules)
- [ ] Restart KiloCode session → MCP/skill nhận Open Design + `/social-post`
- [ ] Cung cấp style samples (FB/X) cho social-post học giọng + adapt công thức VN/văn học
- [ ] Setup idea/research routine (Google Trends + VidIQ)
- [ ] Tạo Google Sheets content tracking (template trong BATCH-CONTENT-WORKFLOW.md)
- [ ] Analytics feedback loop (YT Studio + X Analytics → review tuần)

## 7. Đã loại / không chọn

- **MoneyPrinterTurbo**: all-in-one footage-montage, giữ lane phụ (B-roll stock volume), KHÔNG backbone — Open Design (chứa HyperFrames) chốt cho content văn học.
- **n8n**: KHÔNG dùng orchestration. Orchestration = KiloCode agent + MCP.
- **Kokoro/whisper/MusicGen**: bỏ (có ElevenLabs).
- **social-auto-upload** (browser automation): risk ban cao, tránh cho đăng bài chính.
- **ALwrity** (1.094⭐): đánh giá rồi — user thấy không chất lượng; bỏ.
- **Open-Generative-AI** (23.848⭐): verified ready flow (cloud, 200+ models), nhưng **Open Design chốt thay** vì gộp được video + image + DESIGN.md brand trong 1 platform.
- **Standalone HyperFrames** (đã cài): giờ **subsumed by Open Design** (cùng engine heygen). Giữ skills đã cài làm engine, nhưng primary = Open Design.

## 8. Strategy v3 (đã chốt — Craft × AI direction, July 2026)

**Positioning**: "I analyze how AI handles writing craft — why it fails, what that reveals about craft, and how to fix it."

**Direction**: Craft × AI Intersection (researched from 300+ sources, scored 30/35 vs 14/35 for tool reviewer). Bridges traditional writing craft (Sanderson, MICE, Save the Cat) with AI-assisted writing. Not tool reviewer (saturated). Not pure craft (no AI). The BRIDGE.

**Content**:
1. **Craft × AI videos** (8/tháng, 2/week) — analytical videos taking craft principle → analyze how AI handles it → why it fails → how to fix. Pure analysis from public sources (docs, Reddit, academic). No tool testing. First-person analytical voice.
2. **Daily build-in-public devlog** (5-7/tuần) — git log → agent → social post → approve (1min).

**Monthly output**: 8 Craft × AI videos + 30 devlogs + 4 newsletters + 16 repurpose pieces = ~58 pieces.
**Time**: ~2h/day = ~54h/month. Per video: ~3-3.5h production + 1.5h repurpose = ~5h.
**Không test tool, không viết tiểu thuyết.** Agent research + draft, user design framework + handwritten hook + rewrite, publish thủ công.
**Monetize**: product (primary, future) + newsletter (primary, immediate) + course (after 3 months) + AdSense (quaternary).
**Files**: `CONTENT-STRATEGY.md` + `CONTENT-CALENDAR.md` + `DESIGN.md` + `BATCH-CONTENT-WORKFLOW.md` + `AUTHENTICITY-PIPELINE.md` + `CONTENT-CREATION-MECHANISMS.md` + `RESEARCH-FRAMEWORKS.md` + `RESEARCH-VALIDATION-METHODOLOGY.md`.
