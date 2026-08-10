# Phase 2 — Production (Faceless via OpenMontage)

> **REFERENCE — consult on-demand khi thực thi step phase 2.** Essential rules đã INLINE trong `.kilo/agent/content-manager-agent.md`. File này chứa DETAIL (OpenMontage protocol, step-by-step). Nếu xung đột, agent body là chuẩn. AI handles PRODUCTION; HUMAN handles CONTENT (xong ở phase 1).
> **ARCHITECTURE 2026-08-04**: production dùng `libraries/04-visual/` (Visual Template Library) — primitives + layouts + registry. Video **import** từ `remotion-composer/shared/primitives.tsx` (engine chung, sửa 1 lần = fix mọi video). Layout templates = file riêng trong `libraries/04-visual/layouts/`. Vòng lặp: render 30s @ 360-540p → gate → user duyệt → master.
> **Gate vào:** phase-1 hoàn tất (framework designed + documented in `02-brief.md` + script finalized in `03-script.md` + humanize pass + "exist w/o AI?"=yes).
> **Gate ra:** OpenMontage `final_review` PASS + video 1080p + disclosure toggle set + ≥1 non-AI visual element + 14-rule compliance pass.

---

## Điều kiện trước (phải ✅ trong `00-state.md`)
- [ ] phase-1 script finalized (`03-script.md` tồn tại, đã humanize)
- [ ] framework documented trong `02-brief.md`
- [ ] "Would this exist without AI?" = yes

Nếu thiếu → STOP, quay phase 1.

## Production pipeline (per video — OpenMontage tự chạy, bạn duyệt gate)

> **Nguồn sự thật về cách chạy = `openmontage/AGENT_GUIDE.md`** (Rule Zero, gates, checkpoints, escalation). Đọc trước khi làm gì.

### Step 2.1 — Đọc contract + Preflight
- Đọc `openmontage/AGENT_GUIDE.md` + chọn pipeline phù hợp content type trong `openmontage/pipeline_defs/` (animated-explainer / cinematic / animation / documentary-montage / clip-factory / hybrid...).
- Preflight: `python -c "from tools.tool_registry import registry; import json; registry.discover(); print(json.dumps(registry.provider_menu_summary(), indent=2))"` (chạy trong `openmontage/`, dùng `.venv\Scripts\python.exe`).
- Trình user capability menu "X of Y configured" (bằng tiếng Việt) + chi phí ước tính TRƯỚC khi tốn tiền.

### Step 2.2 — Init project + seed script
- `python -c "from lib.checkpoint import init_project; init_project('<project-id>', title='<Title>', pipeline_type='<pipeline>')"` — project-id = kebab-case từ slug video.
- Seed `brief` + `script` artifacts (theo `openmontage/schemas/artifacts/`) từ `02-brief.md` + `03-script.md`. KHÔNG research lại (phase 0-1 đã xong).

### Step 2.3 — Execute pipeline stage-by-stage
- Mỗi stage: đọc director skill `skills/pipelines/<pipeline>/<stage>-director.md` TRƯỚC → dùng tools (registry discover) → self-review → checkpoint qua `lib/checkpoint.py`.
- **Gate approval**: stage có `human_approval_default: true` → viết checkpoint `awaiting_human`, trình summary + review + cost, END TURN chờ user.
- **Render runtime**: Remotion (engine chính, import từ shared/primitives). Render 30s @ 360-540p cho iteration; master 1080p khi user duyệt.
- **Escalate blocker**: nếu provider fail/auth/tool bug → trình user 5 cấu phần (attempted/failed/cause/options/recommend), KHÔNG tự đổi path khi chưa approve.

### Step 2.4 — Post-render final review (bắt buộc)
- Chạy `final_review` (ffprobe + frame extract + audio analysis + delivery promise + subtitle check — OpenMontage contract ép).
- Chỉ trình user video khi review PASS. Video nằm ở `projects/<project-id>/renders/final.mp4`.
- (Tuỳ chọn) Backlot board: `python -m backlot open <project-id>` — xem storyboard live + approval gate trực quan.

### Step 2.5 — Pre-publish compliance check
Chạy 14-rule checklist (`docs/YOUTUBE-AI-COMPLIANCE.md`). Đặc biệt:
- [ ] **Disclosure**: toggle "altered content" + "AI-assisted content" trong description.
- [ ] **Original visuals**: OpenMontage provider selector (7-dim scoring) — ưu tiên visual custom, tránh stock rập khuôn.
- [ ] **Brand check**: follow DESIGN.md (literary tone, no tech-bro). Map brand → custom playbook `openmontage/styles/` hoặc dùng atelier mode nếu cần giữ identity.
- [ ] **Format variation**: không trùng emotional journey với video ngay trước.

> "We want content that we know what channel it comes from. It couldn't be on a hundred other channels." — YouTube official

## Phase-2 decision rules (áp dụng tại đây)
- **Original visuals**: custom per scene. Shared stock = risk. ≥1 non-AI element.
- **Disclosure**: mọi video AI voice/visuals → toggle + "AI-assisted content" trong description.
- **Document everything**: OpenMontage tự lưu decision_log + artifacts (audit trail). Ghi pointer vào `00-state.md`.
- **Budget**: OpenMontage cost_tracker (observe/warn/cap — config `openmontage/config.yaml`). Trình user estimate trước khi render.
- **If flagged**: remediate, KHÔNG mass-delete. 21-day appeal process.

## Khi xong
Cập nhật `00-state.md`: gate phase-2 ✅, ghi 1 dòng pointer: "final: `projects/<project-id>/renders/final.mp4` (render_report + final_review PASS)", step log, `next action` = "**Phase 4 (Publish) — user manual**: upload video lên YouTube (Private để phase 3 lấy transcript, hoặc Public). Sau đó gõ `repurpose`."
