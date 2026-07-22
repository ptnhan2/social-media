# Execution Checklist — Làm theo thứ tự

> Mọi decision đã chốt. Đây chỉ là execute. Làm từng bước.

## Phase 1: Test agent (text-only, không cần stack)

- [ ] **1.1** Restart KiloCode: Ctrl+Shift+P → "Kilo: Reload"
- [ ] **1.2** Switch agent: `/agents` → chọn "Content Manager Agent"
- [ ] **1.3** Test: gõ `run devlog` → agent đọc git log → sinh devlog → lưu vào `drafts/`
- [ ] **1.4** Check: mở `C:\DevWork\social-media\drafts\` → xem file devlog
- [ ] **1.5** Test thêm: gõ `validate [topic]` → agent runs 5-stage validation → scorecard output
- [ ] **1.6** Test thêm: gõ `check` → agent reports content status

→ Nếu agent chạy OK → Phase 2. Nếu lỗi → đọc error, fix prompt trong `.kilo/agent/content-manager-agent.md`.

## Phase 2: Setup faceless production tools

- [ ] **2.1** **ElevenLabs** — voiceover TTS. Settings: stability 35-45%, similarity 75-80%, style 0-15% (see `AUTHENTICITY-PIPELINE.md`). Consistent voice = brand identity
- [ ] **2.2** **Open Design** — custom visuals + DESIGN.md brand contract (see `AUTHENTICITY-PIPELINE.md`). Voice-led: audio first → visuals match duration
- [ ] **2.3** **CapCut** — video assembly + auto-captions (Montserrat Bold, stroke 15px) + film grain overlay + 90% hard cuts + music -22dB + normalize -14 LUFS (see `AUTHENTICITY-PIPELINE.md`)
- [ ] **2.4** **Canva** — thumbnails, quote graphics (free): https://www.canva.com
- [ ] **2.5** **Pexels** — stock footage (free, ONLY heavily transformed): https://www.pexels.com
- [ ] **2.6** Tạo **Google Sheets** content tracking + compliance audit log
- [ ] **2.7** Setup newsletter (Beehiiv/Substack) — owned audience
- [ ] **2.8** Setup blog (Hashnode/Dev.to)
- [ ] **2.9** Write **channel thesis** in YouTube About + Description [Compliance #9]
- [ ] **2.10** Lock **Visual DNA** (palette + typography + thumbnail skeleton in DESIGN.md) [Compliance #11]
- [ ] **2.11** Read **YOUTUBE-AI-COMPLIANCE.md** — understand 14 rules before producing

## Phase 3: Setup Open Design (video/image layer)

- [ ] **3.1** Download Open Design Windows installer: https://github.com/nexu-io/open-design/releases
- [ ] **3.2** Install (chạy .exe, SmartScreen → "Run anyway")
- [ ] **3.3** Mở Open Design → setup → sign in (BYOK hoặc Open Design Cloud)
- [ ] **3.4** Wire MCP vào KiloCode: mở terminal → `od mcp install opencode` (hoặc agent KiloCode tương ứng)
- [ ] **3.5** Copy DESIGN.md vào Open Design:
  ```
  copy C:\DevWork\social-media\DESIGN.md [Open Design path]\design-systems\literary\DESIGN.md
  ```
- [ ] **3.6** Restart KiloCode → verify Open Design MCP available

## Phase 4: Batch content workflow setup

- [ ] **4.1** Đọc `BATCH-CONTENT-WORKFLOW.md` → hiểu 3-layer system (Quarterly → Monthly → Weekly/Daily)
- [ ] **4.2** Plan Quarter hiện tại: chọn 6 video topics (2/tháng × 3 tháng), viết titles theo HFM formula
- [ ] **4.3** Tạo file `content-plan-Q[X]-2026.md` (template trong workflow)
- [ ] **4.4** Schedule batch production days (2-3 ngày/tháng, VD: cuối tuần)
- [ ] **4.5** Check 3 drafts có sẵn trong `drafts/` → finish + record

## Phase 5: Voice + full pipeline test

- [ ] **5.1** Cung cấp style samples: thu thập ~20 bài FB/X của bạn → save vào `~/.agents/skills/social-post/style_profile.md`
- [ ] **5.2** Restart KiloCode (lần cuối — pick up tất cả MCP + skills + agent)
- [ ] **5.3** Switch to Content Manager Agent
- [ ] **5.4** Test full: gõ `run all`
  - Agent tự: discovery → draft → save vào `drafts/`
- [ ] **5.5** Review: mở `drafts/` → xem → fix → publish thủ công lên từng platform
- [ ] **5.6** Verify: check social platforms (YouTube/X) → post đã đăng

## Phase 6: Routine (hằng ngày/tuần/tháng)

- [ ] **Daily**: mở KiloCode → Content Manager Agent → `devlog` → review draft → post lên X/Threads
- [ ] **Daily**: Reddit engagement (30 min — r/writing, r/Worldbuilding, r/nanowrimo)
- [ ] **3x/week (Mon/Wed/Fri)**: Publish long-form video + repurposed content (X thread, blog, Reddit)
- [ ] **Tue/Thu/Sat**: Publish Shorts (spaced 3-5 days apart)
- [ ] **Weekly (Fri)**: Newsletter
- [ ] **Monthly (cuối tháng)**: Batch production cho 8 videos tháng sau (theo `BATCH-CONTENT-WORKFLOW.md`)
- [ ] **Monthly**: Review analytics + retention gate
- [ ] **Quarterly**: Review + plan next quarter

## Files reference
| File | Vai trò |
|---|---|
| `.kilo/agent/content-manager-agent.md` | Agent runbook (3 pillar, chi tiết) |
| `CONTENT-STRATEGY.md` | Strategy (positioning, 3 pillar, monetize, etc.) |
| `CONTENT-CALENDAR.md` | 30-day plan + title bank |
| `BATCH-CONTENT-WORKFLOW.md` | Batch production workflow (Quarterly → Monthly → Weekly) |
| `DESIGN.md` | Literary brand system (9-section, cho Open Design) |
| `STACK-DECISIONS.md` | Toàn bộ chốt + decisions |
| `kilo.json` | KiloCode project config |
| `drafts/` | Agent lưu draft ở đây |
