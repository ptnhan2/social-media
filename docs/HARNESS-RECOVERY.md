# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-23 05:30 (overnight session). Previous: 2026-08-23 00:25.
> **TRẠNG THÁI: spec A1→D3 HOÀN TẤT TOÀN BỘ. Pattern Learning + Eval chạy
> end-to-end. Còn 4 việc USER INPUT (xem cuối file).**

---

## 🌅 USER MORNING CHECKLIST (làm 4 việc này)

1. **U3 — Xem renders sau-principles**: mở `http://localhost:5174/?project=isaacverse-final`
   (vite :5174 đang chạy) → xem 4 segments. Toàn bộ treatments đã transform:
   chữ 900+ bold + shadows, gradient titles, curved bezier edges, màu rực.
   → Nếu đúng hướng: nói "confirm" → principles được promote hẳn.
   → Nếu sai: 1 góp ý → agent extract principle mới → apply lại (protocol v5).
2. **U2 — Review tutorial candidates**: `docs/TUTORIAL-CANDIDATES-REVIEW.md`
   (51 Isaac candidates, chọn cái nào promote thành CANDIDATE thật).
3. **U1 — LangSmith annotation queue**: UI → Annotation Queues → `render-review`
   (runs thấp điểm <0.7 được auto-route; có thể trống nếu mọi run đạt chuẩn).
4. **U4 — Narrative direction** (nar-001): muốn host/character xuất hiện trong
   SemanticDiagram + ProcessTimeline kiểu nào? (silhouette? cutaway? voice?)
   Hiện đang đánh dấu requires-design-session.

---

## ✅ ĐÃ XONG ĐÊM QUA (tóm tắt cho session mới)

### 1. Principle schema + taste-standard.md (A1)
- 71 principles có cấu trúc (20 ACTIVE, 51 CANDIDATE tutorial) — schema:
  id/principle/scope/category/direction/source/confidence/verified/rejected/promoted/status
- 5 user design directives = HIGH ACTIVE (typo-001, col-001, col-002, comp-001, nar-001)
- `harness/validate_principles.py` — schema validator (exit 1 nếu lỗi)

### 2. Protocol v5 trong AGENTS.md (A2)
- Principle-based loop: read memory → extract principle → scan violations →
  fix treatments → qa_gate → user review 1 lần → record
- Feedback classification (global/treatment:/one-time × 6 categories)
- 3-phase learning progression + self-check checklist usage

### 3. QA gate tool (A3)
- `qa_gate(project, start, end, video_before)` = build+render+pixel-diff 1 call
- Agent gọi sau MỌI edit treatment code. Permissions: shared/** = interrupt (đã có)

### 4. Pattern Learning system (B1-B3)
- `harness/pattern_extractor.py` → `memories/feedback-patterns.json` (5 patterns,
  4 HIGH) + `memories/self-check.md` (checklist tự sinh, HIGH đầu)
- 5 seed patterns từ design review 2026-08-22 + evidence merge từ feedback.jsonl
- Agent memory list: AGENTS.md + taste-standard.md + self-check.md
- Verified live: agent reports patterns + phase đúng

### 5. Eval extension (C1-C4) — LangSmith native
- Dataset 14 cases (10 structural/behavioral + 4 design_quality), `--filter` flag
- 3 evaluators mới: principle_compliance (repo state vs principles),
  code_quality (hardcoded tunables), aesthetic_quality (gemini-3.6-flash judge)
- `harness/online_evaluators.py`: tool_discipline + response_quality_online
  feedback trên traces mới (native create_feedback), watermark idempotent,
  auto-route runs <0.7 vào annotation queue `render-review`

### 6. 5 principles APPLIED to ALL treatments (E1-E3)
- typo-001: mọi explicit fontWeight = 900 + text shadows (9 treatments)
- col-001: filters de-washed (host-reflection saturate 1.05/brightness .9,
  cinematic-metaphor saturate 1.08/brightness .9)
- col-002: gradient titles (ProcessTimeline, CandidateComparison), gradient
  curved progress bar, gradient center circle, radial step dots
- comp-001: SemanticDiagram edges = quadratic bezier (curvature knob 0.12),
  curved progress bar, organic step-dot shapes
- nar-001: requires-design-session (đợi U4)
- ~20 style knobs mới wired; QA 4/4 PASS (diffs 1.4-5.8); 79/79 tests

### 7. Eval trend CHỨNG MINH (D1-D3) — 4 experiments trong LangSmith
| Experiment | principle_compliance | Ý nghĩa |
|---|---|---|
| D1a baseline (4626481a) | 0/14 | violations trước khi fix |
| D1b after (7a9dc319) | 14/14 | principles applied |
| D2 broken (db191690) | 10/14 (design 0/4) | regression BỊ BẮT |
| D3 restored (0f937467) | 14/14 | recovery confirmed |
- code_quality: 0/14 → 14/14 (36 → 5 hardcoded values)
- Trả lời "agent thông minh lên?": LangSmith comparison view cho 4 runs

---

## ⚠️ GOTCHAS MỚI HỌC ĐÊM QUA

1. **Eval case "Change edge stroke mode to gradient" MUTATES store thật** —
   agent chạy update_style thật trong eval. Sau mỗi full eval run: reset
   `stroke.mode=solid` (đã reset 2 lần đêm qua). Cần đổi case này sang scratch store.
2. **Gemini judge**: model prefix phải là `google_genai:` (không phải `gemini:`)
   + model `gemini-3.6-flash` (2.0-flash đã retire). Baseline D1a aesthetic
   scores = 0 do judge misconfig — không phải điểm thật.
3. **LangSmith SDK 0.11**: `runs.query` async-only; dùng `list_runs` sync
   (deprecated 2027) như pull_eval_scores.py. `create_feedback` cần session_id
   để không warning.
4. **Ox Alpha chậm trong eval**: ~8min case đầu (cold), sau đó 40s-6min/case.
   Full 14-case eval ≈ 36-42 phút. Dùng `--filter design_quality` (4 cases ≈ 8-10 phút).
5. **code_quality evaluator**: chỉ đếm numeric literals + fontWeight<900 —
   identifiers tham chiếu getStyle vars (audit_knob_paths.py lo path wiring).

---

## 🔧 VẬN HÀNH

### Servers (đang chạy như background processes)
```powershell
# LangGraph server (:2024) — agent runtime
harness\.venv\Scripts\python.exe -m langgraph_cli dev --port 2024 --host 127.0.0.1
# Composer (:5174) — editor + AgentPanel
cd remotion-composer\composer-app; npx vite --port 5174
# Browser: http://localhost:5174/?project=isaacverse-final → tab AGENT
```

### Key commands
```powershell
# Eval full (36-42 phút) / design-only (8-10 phút)
& "harness\.venv\Scripts\python.exe" harness\eval.py
& "harness\.venv\Scripts\python.exe" harness\eval.py --filter design_quality

# Pull scores mới nhất từ LangSmith
& "harness\.venv\Scripts\python.exe" harness\pull_eval_scores.py

# Online evaluators (score traces mới + route queue)
& "harness\.venv\Scripts\python.exe" harness\online_evaluators.py

# Regenerate patterns + self-check (chạy sau khi feedback mới)
& "harness\.venv\Scripts\python.exe" harness\pattern_extractor.py

# Validate taste-standard schema
& "harness\.venv\Scripts\python.exe" harness\validate_principles.py

# Offline principle/code scores (không cần agent)
& "harness\.venv\Scripts\python.exe" harness\e_phase.py scores

# QA gates 4 windows (baseline renders nằm trong renders/windows/e_base_*.mp4)
& "harness\.venv\Scripts\python.exe" harness\e_phase.py qa
```

### Style store state (version 72)
- Palette VIBRANT (#ff6b35, #00d4ff, #ffffff, #050508 + gradientStart/End, accent2)
- Verified baseline: damping=2, reveal=2, durationSec=0.75, stroke=solid/2,
  pt spring 18/150, hr filter saturate(1.05)/brightness(.9), pushDurationSec=4
- Knobs mới đêm qua: node.fontWeight 900, edge.curvature 0.12, kicker weights 900,
  pt/cc/ad/cm title+kicker+step font knobs, subtitle.fontWeight, candidate.fontSize
- **LUÔN verify store sau eval run** (case mutation) — stroke.mode phải = solid

### .env (không đổi)
HARNESS_MODEL=openrouter:stealth/ox-alpha | OPENROUTER_API_KEY (user) |
VLM_PROVIDER=dashscope | DASHSCOPE_API_KEY (China, hay timeout) | ZHIPU_API_KEY |
GOOGLE_API_KEY (gemini judge) | OPENAI_API_KEY+BASE_URL (Zhipu, eval judge glm-4-flash)

---

## 📚 THỨ TỰ ĐỌC SESSION MỚI

1. File này (HARNESS-RECOVERY.md)
2. `docs/PATTERN-LEARNING-AND-EVAL-SPEC.md` — spec (đã implement hết, đọc khi cần context)
3. `docs/TODO-NEXT.md` — chỉ còn user-input tasks + history
4. `harness/memories/knowledge-base.md` — experiments + findings (đọc TRƯỚC khi thay đổi gì)

## 0. PROJECT

Video Agent Harness trên Deep Agents, tích hợp vào Composer (video editor).
- Main LLM: Ox Alpha (free, OpenRouter, 1M ctx) — KHÔNG gửi ảnh (vision unverified)
- VLM: DashScope/Zhipu (local high-contrast changes only — mù global changes)
- Eval judge: gemini-3.6-flash (aesthetic) + glm-4-flash (response quality)
- LangSmith: isaacverse-harness (traces) + isaacverse-harness-evals (experiments)
- Agent ↔ user = Vietnamese. Code/schema = English.

## 1. LEARNING PHASE HIỆN TẠI: 3 (self-evaluating)

4 HIGH categories + 5 verified principles → phase 3 theo spec §3.4.
Agent tự fix theo checklist HIGH; user chỉ review kết quả cuối. Sau U3 confirm,
promoted=true cho principles verified ≥2.

## 2. GIT

Repo: https://github.com/ptnhan2/social-media.git — branch master.
Commits đêm qua: taste-standard schema → AGENTS v5 → qa_gate → pattern system
→ eval extension → judge fix → E-phase transformation → D2 proof (+ docs).
CI: xanh trước đêm; verify `gh run list` sau push cuối.
