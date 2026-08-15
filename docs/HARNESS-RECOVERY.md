# SESSION RECOVERY FILE — Read this first after compact

> **Mục đích**: File này chứa toàn bộ context cần thiết để phục hồi session sau compact.
> Đọc file này + các file nó nhắc đến → nhớ lại mọi thứ → tiếp tục code.
> Cuối file có todolist đầy đủ để recreate bằng `todowrite` tool.

## 1. PROJECT LÀ GÌ

Project = **Video Agent Harness** (product riêng, không phải sản xuất video bằng Kilocode).
- Hướng: `docs/EVOLUTION-HARNESS-ISAACVERSE.md`
- Design spec: `docs/HARNESS-DESIGN.md`
- Nền tảng: LangChain Deep Agents (self-host, không LangSmith managed)
- LLM: DeepSeek V4 (text-only, `deepseek:deepseek-chat`) qua `.env`
- VLM: GPT-4o qua OpenRouter (cho visual_critique) — `OPENROUTER_API_KEY` trong `.env`
- Agent ↔ user = Vietnamese. Code/schema = English.

## 2. ĐÃ BUILD GÌ (verified)

### Style Knob Layer (Remotion/TS)
- `libraries/04-visual/isaacverse-style.json` — style store (versioned JSON, 8 treatments)
- `remotion-composer/shared/isaacverse/styleLoader.ts` — imports JSON, `getStyle(path, fallback)`
- `remotion-composer/shared/isaacverse/isaacverse-style.json` — copy cho Vite import
- `remotion-composer/shared/isaacverse/treatments.tsx` — 8/8 treatments refactored đọc style knobs
- `remotion-composer/shared/isaacverse/styleLoader.test.ts` — 6/6 tests pass (vitest)
- Render sync: `harness/tools.py` render_window copies style JSON to shared/ before render

### Python Harness (`harness/`)
- `harness/.venv/` — dedicated venv (deepagents, langchain-deepseek, langgraph-cli[inmem])
- `harness/agent.py` — `create_deep_agent` với:
  - model = `deepseek:deepseek-chat` (configurable via `HARNESS_MODEL`)
  - CompositeBackend: `/workspace/` → FilesystemBackend, `/memories/` → StoreBackend, `/skills/` → FilesystemBackend
  - permissions: deny writes to /memories/, treatment code, style file
  - interrupt_on: `{"update_style": True}` — approval gate
  - Module-level agent = no checkpointer/store (langgraph server compatible)
  - main() creates separate agent WITH MemorySaver+store for standalone CLI
  - .env auto-loaded at top
  - system_prompt includes VLM critique loop + proactive improvement instructions
- `harness/tools.py` — 7 tools: render_window, read_style, list_style_knobs, update_style (governance+QA gate), capture_feedback, run_structural_qa
- `harness/tutorial_tools.py` — ingest_tutorial (ffmpeg keyframes), render_compare (beat-scoped)
- `harness/visual_critique.py` — visual_critique tool (GPT-4o via OpenRouter, keyframe extraction → VLM API → structured critique)
- `harness/governance.py` — write-gate (contradiction + minSupport≥2), event log, replay_from_log
- `harness/consolidation_agent.py` — background agent (reads feedback, proposes batch refinements)
- `harness/test_governance.py` — 6/6 tests pass
- `harness/test_integration.py` — 6/6 tests pass
- `harness/run.ps1` — convenience runner (uses harness/.venv)
- `harness/AGENTS.md` — agent memory (persona + knob reference + rules)
- `harness/skills/editing-craft/SKILL.md` — Murch Rule of Six, pacing, continuity, sound
- `harness/skills/style-knobs/SKILL.md` — full reference for all 8 treatments' knobs
- `harness/README.md` — setup + architecture + learning loop diagram
- `harness/DEPLOY.md` — deployment guide (Postgres, nginx, SSL, cron)
- `harness/frontend/` — React + Vite + @langchain/react (useStream)
  - `App.tsx` — chat + style knob panel + approval bar (stream.respond for interrupts)
  - `index.css` — dark theme (amber accent)
  - `vite.config.ts` — proxy /api to localhost:2024

### Config
- `langgraph.json` — agent + consolidation graphs
- `.env` — DEEPSEEK_API_KEY (set), OPENROUTER_API_KEY (user just filled), ZHIPU_API_KEY (set)
- `.gitignore` — **/dist/, **/.venv/, *.png, *.mp4, *.wav, .env, node_modules/

## 3. ĐÃ VERIFY GÌ (chạy thật)

| Test | Result |
|---|---|
| CLI: list style knobs | ✅ DeepSeek returns all knobs |
| CLI: read style | ✅ Returns correct mode=solid |
| CLI: change edge→gradient + approve | ✅ Disk: solid→gradient v1→v2 |
| CLI: change font size→110 + approve | ✅ Disk: 96→110 v1→v2 |
| LangGraph server (port 2024) | ✅ Starts, API responds |
| Frontend UI (port 3000) | ✅ Renders, chat works |
| Frontend: list style knobs | ✅ Agent responds in chat |
| Frontend: change edge→gradient + Approve | ✅ Disk: solid→gradient v1→v2 |
| render_window | ✅ .mp4 212KB created, path parsed |
| Style sync | ✅ Change JSON → Remotion reads updated |
| Governance tests | ✅ 6/6 pass |
| Integration tests | ✅ 6/6 pass |
| styleLoader TS tests | ✅ 6/6 pass |
| Tutorial ingest | ✅ 4 keyframes from real video |
| Consolidation agent | ✅ Proposes refinements from feedback |
| visual_critique keyframe extraction | ✅ 2 frames, 57KB base64 each |
| visual_critique API flow | ✅ Correctly errors without key (flow correct) |

## 4. CÒN PHẢI LÀM (33 tasks)

### Phase A: Fix Critical Gaps (BE) — 3 remaining
- A2. Governance as PolicyWrapper backend (subclass FilesystemBackend, intercept writes to /memories/ + style file). Hiện governance chỉ trong update_style tool — agent có thể bypass qua write_file. Docs: `deepagents/backends#add-policy-hooks`
- A3. Memory — switch InMemoryStore → Postgres-compatible store. taste-standard.md should accumulate real principles (not just version bumps). Docs: `deepagents/memory`
- A4. propose_improvement tool — after render+visual_critique, agent proactively suggests style changes. Hiện agent chỉ user-directed.
- A5. Wire consolidation into main loop (not standalone script)
- A6. visual_critique skill (how to judge frames: composition, color, motion, text, pacing)

### Phase B: Deepen Style Knobs — 3 tasks
- B1. Refactor composition, color curves, motion easing in treatments.tsx (not just timing)
- B2. JSON Schema validation for style store (types, ranges, enums)
- B3. style_diff tool (show changes between versions)

### Phase C: Frontend Product — 7 tasks
- C1. Video preview panel (<video> tag with rendered .mp4)
- C2. Before/after visual diff (side-by-side when render_compare used)
- C3. Style inspector (live knob read, highlight pending changes)
- C4. Subagent streaming cards (stream.subagents)
- C5. Todo list UI (stream.values.todos)
- C6. Error boundary + loading + empty states
- C7. Responsive layout (mobile-friendly)

### Phase D: Testing — 6 tasks
- D1. Unit tests: each tool (render_window, visual_critique, update_style, governance, render_compare)
- D2. Integration tests: full loop (feedback → visual_critique → propose → approve → persist → re-render → VLM verify)
- D3. E2E tests: frontend UI (type → respond → approval → click → verify disk + UI)
- D4. Governance tests: PolicyWrapper, drift, replay, bypass block
- D5. Load tests: concurrent renders, Postgres pool
- D6. CI: GitHub Actions (lint + typecheck + pytest + vitest)

### Phase E: Environment — 7 tasks
- E1. Dockerfile LangGraph server (Python + harness deps)
- E2. Dockerfile frontend (Node build → nginx static)
- E3. docker-compose.yml (Postgres + LangGraph + frontend nginx)
- E4. Postgres init script (schema, TTL, connection pool)
- E5. Nginx config (reverse proxy :2024, WebSocket, SSL-ready)
- E6. .env.example (all required vars documented)
- E7. Health check + logging (structlog, /health, OpenTelemetry)

### Phase F: Deployment — 6 tasks
- F1. Deploy to VPS: docker compose up, verify services
- F2. SSL via Let's Encrypt (certbot --nginx)
- F3. Domain DNS setup (A record → VPS IP)
- F4. Cron for consolidation (every 6h)
- F5. Backup (nightly Postgres dump + style JSON git)
- F6. Production verification: full loop on real domain

## 5. KEY DECISIONS (đã chốt)

1. Harness = product riêng, không phải Kilocode plugin. Build trên Deep Agents, self-host.
2. DeepSeek V4 = text-only → cần VLM riêng (GPT-4o via OpenRouter) cho visual_critique.
3. Style store = `libraries/04-visual/isaacverse-style.json` (versioned JSON, 8 treatments).
4. Agent sửa style JSON (qua update_style tool, approval-gated), KHÔNG sửa treatment code.
5. Governance: contradiction check + minSupport≥2 + QA gate (JSON schema + render test).
6. Frontend: React + useStream, stream.respond() for interrupt approval.
7. Module-level agent = no checkpointer/store (langgraph compatible); main() = with MemorySaver+store.
8. .env auto-loaded by agent.py (parse manually, không dùng python-dotenv).

## 6. FILES ĐỌC ĐỂ PHỤC HỒI CONTEXT

Sau compact, đọc theo thứ tự:
1. `docs/HARNESS-RECOVERY.md` (file này)
2. `docs/HARNESS-DESIGN.md` — architecture + 6 phases
3. `docs/EVOLUTION-HARNESS-ISAACVERSE.md` — direction + decisions + build progress
4. `harness/agent.py` — current agent config (model, tools, backend, permissions, system_prompt)
5. `harness/tools.py` — 7 tools implementation
6. `harness/visual_critique.py` — VLM critique tool
7. `harness/governance.py` — governance module
8. `libraries/04-visual/isaacverse-style.json` — style store
9. `remotion-composer/shared/isaacverse/styleLoader.ts` — style loader
10. `harness/frontend/src/App.tsx` — frontend UI
11. `langgraph.json` — deployment config
12. `AGENTS.md` — project constitution (pivot + workflow discipline + rules)

## 7. CÁCH CHẠY

### Standalone CLI (test nhanh)
```powershell
.\harness\run.ps1 "list style knobs"
```

### LangGraph server + Frontend (full UI)
```powershell
# Terminal 1: Backend
$env:PYTHONIOENCODING='utf-8'
& "harness\.venv\Scripts\python.exe" -m langgraph_cli dev --port 2024 --host 127.0.0.1

# Terminal 2: Frontend
cd harness\frontend; npx vite --port 3000

# Browser: http://localhost:3000
```

### Tests
```powershell
# Governance tests
& "harness\.venv\Scripts\python.exe" harness\test_governance.py

# Integration tests
& "harness\.venv\Scripts\python.exe" harness\test_integration.py

# styleLoader TS tests
cd remotion-composer; npx vitest run shared/isaacverse/styleLoader.test.ts
```

## 8. TODOLIST ĐỂ RECREATE BẰNG TOOL

Sau khi đọc xong, dùng `todowrite` tool với nội dung sau:

```
A1 ✅ visual_critique tool — VLM (GPT-4o via OpenRouter), keyframe extraction verified
A2. Governance as PolicyWrapper backend (subclass FilesystemBackend, intercept writes to /memories/ + style file)
A3. Memory — Postgres-compatible store, taste-standard.md accumulates principles
A4. propose_improvement tool — agent proactively suggests after render+critique
A5. Wire consolidation into main loop
A6. visual_critique skill (how to judge frames)
A7 ✅ system_prompt with VLM critique loop
A8 ✅ Test visual_critique: keyframe extraction verified
B1. Deepen style knobs (composition, color, easing in treatments.tsx)
B2. JSON Schema validation for style store
B3. style_diff tool
C1. Frontend: video preview panel (<video> tag)
C2. Frontend: before/after visual diff (side-by-side)
C3. Frontend: style inspector (live knobs, highlight pending)
C4. Frontend: subagent streaming cards
C5. Frontend: todo list UI
C6. Frontend: error boundary + loading + empty states
C7. Frontend: responsive layout
D1. Unit tests: each tool
D2. Integration tests: full learning loop with VLM
D3. E2E tests: frontend UI flow
D4. Governance tests: PolicyWrapper, drift, replay
D5. Load tests: concurrent renders
D6. CI pipeline: GitHub Actions
E1. Dockerfile LangGraph server
E2. Dockerfile frontend
E3. docker-compose.yml
E4. Postgres init script
E5. Nginx config
E6. .env.example
E7. Health check + logging
F1. Deploy to VPS
F2. SSL Let's Encrypt
F3. Domain DNS
F4. Cron consolidation
F5. Backup strategy
F6. Production verification
```

## 9. LƯU Ý QUAN TRỌNG

- **OPENROUTER_API_KEY đã được user điền vào .env** — visual_critique giờ có thể gọi VLM thật.
- **Test A8 full (visual_critique với key thật) là việc ĐẦU TIÊN sau compact.**
- **A2 (PolicyWrapper) là việc thứ 2** — governance hiện chỉ trong update_style tool, agent có thể bypass.
- **A3 (Postgres memory) cần thiết cho production** — InMemoryStore mất khi restart.
- **Frontend (C1-C7) cần `@langchain/react` đã cài** — check `harness/frontend/node_modules`.
- **LangGraph server cần `langgraph-cli[inmem]` đã cài** — check `harness/.venv`.
- **.env có non-ASCII chars đã được fix** — không sửa .env bằng editor có encoding lạ.
- **Git remote**: `origin = https://github.com/ptnanh2/social-media.git`, branch `master`.
- **Workflow discipline**: mỗi task phải research → code → verify → test → commit → push.
