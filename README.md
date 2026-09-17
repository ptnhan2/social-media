# 🎬 Video Agent Harness

> A self-improving AI agent that plans, edits, and QA-produces faceless videos — and learns from every review cycle.
> **Status: Work in Progress** — production pipeline hardened (shipped 2026-08-27), harness loop verified end-to-end, pattern-learning in active development.

[🇻🇳 Tiếng Việt bên dưới ↓](#-video-agent-harness--hệ-thống-agent-tự-cải-thiện-dựng-video)

---

## What This Is

This project started as a content system for a faceless YouTube channel. It evolved into its own product: a **video agent harness** — an AI agent (LangChain Deep Agents, self-hosted, model-agnostic) that operates a real video editor through tools, produces complete videos, gets scored, and **improves its own editing taste over time**.

Unlike a one-shot "text-to-video" generator, this harness:

1. **Plans** content from topic → framework → script → visual treatment
2. **Edits** a real timeline through a bridge API (`editor_op` — the *only* write path to the editor document)
3. **Self-checks** with a QA gate + VLM (vision-language) verification before anything ships
4. **Learns** from human review votes, tutorial ingestion, and VLM calibration — writing structured "taste principles" into its own memory files

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  HARNESS (Python · LangChain Deep Agents · DeepSeek)     │
│  agent.py → 7 tools: render · style · compare ·          │
│  qa_gate · request_keep · editor_op · …                  │
│  governance: write-gate + minSupport                     │
│  memory: taste-standard · knowledge-base · oracle-trust  │
├──────────────────────────────────────────────────────────┤
│  EDITOR SURFACE (Remotion renderer + Composer UI)        │
│  Vite + React + Konva editor: clip-first timeline,       │
│  InteractiveCanvas (select/move/resize/snap/keyframes),  │
│  7-tab asset rail, export via /api/render                │
├──────────────────────────────────────────────────────────┤
│  DOMAIN (shared/isaacverse/)                             │
│  9 treatments · editor doc model · style store ·         │
│  motion · character presence · review/feedback           │
├──────────────────────────────────────────────────────────┤
│  INFRA: docker-compose (frontend · langgraph · postgres  │
│  · nginx · backup) · LangSmith eval + tracing            │
└──────────────────────────────────────────────────────────┘
```

### The learning loop (the interesting part)

- `pattern_extractor.py` / `tally_principles.py` / `validate_principles.py` — mine feedback into candidate taste principles
- `ingest_tutorial.py` / `apply_tutorial_learning.py` — ingest editing tutorials, extract principles, apply them
- `eval.py` / `online_evaluators.py` / `calibrate.py` — LangSmith eval + VLM oracle calibration (trust zones: AUTO / ASK per aspect)
- Agent brain lives in `harness/memories/` — principle files are **gate-governed**, never hand-edited mid-session

## Production Results

- Full acceptance baseline shipped: `projects/isaacverse-final/` — final master render at `renders/master_1080p.mp4`
- All 8→9 treatments evolvable via style knobs
- Pipeline hardening (silent-failure fixes: schema sync, KEEP gate, VLM prompts, style rollback, concurrency) — shipped in 3 waves, 2026-08-27
- Production pipelines spec (voice / image / timeline / validate / scaffold) with QC gates + provenance — drafted

## Repository Map

| Path | Purpose |
|---|---|
| `harness/` | The Python Deep Agents harness — the product |
| `harness/memories/` | Agent brain: taste standard, knowledge base, oracle trust zones |
| `remotion-composer/` | Remotion renderer + the editor UI (Vite + React + Konva) |
| `remotion-composer/shared/isaacverse/` | The domain: treatments, editor doc model, style store |
| `libraries/` | Content pipeline: 01-topic → … → 08-analytics + asset-studio |
| `projects/isaacverse-final/` | Final acceptance baseline + master render |
| `docs/` | Active specs (architecture map, pipeline specs, eval design) |

## Getting Started

```bash
docker compose up          # full stack: frontend, langgraph, postgres, nginx

# run the agent cycle
python harness/run_cycle.py

# harness unit tests (CI)
python harness/test_unit.py
```

## 🇻🇳 Video Agent Harness — Hệ thống agent tự cải thiện dựng video

Bắt đầu là hệ thống nội dung cho một kênh YouTube faceless (quy trình tuân thủ — compliance-first). Dần tiến hóa thành sản phẩm riêng: **agent harness tự cải thiện** — agent AI (LangChain Deep Agents, self-host) điều khiển một trình editor video thật qua công cụ, dựng video hoàn chỉnh, tự kiểm tra bằng QA gate + VLM, và **học để nâng gu chỉnh sửa qua từng vòng review**:

- **7 tool cho agent**: render, style, compare, qa_gate, request_keep, editor_op… — mọi sửa đổi timeline đều qua bridge API có kiểm soát (write-gate)
- **Bộ nhớ agent** (`harness/memories/`): chuẩn gu dạng nguyên tắc (ACTIVE/CANDIDATE), nhật ký thí nghiệm, vùng tin cậy VLM — được quản trị bằng gate, không sửa tay giữa chừng
- **Vòng học**: trích pattern từ feedback → đề xuất nguyên tắc → đo lường → xác thực → áp dụng; ingest tutorial để học từ người
- **Editor thật**: UI editor Vite + React + Konva (timeline clip-first, canvas tương tác, keyframes, xuất video qua `/api/render`)
- **Kết quả**: đã có baseline nghiệm thu hoàn chỉnh + render master 1080p; pipeline đã qua 3 đợt hardening

Trạng thái: **đang phát triển** — vòng harness đã chạy end-to-end, đang hoàn thiện pattern-learning và các production pipeline.

---

Proprietary — all rights reserved. © 2026
