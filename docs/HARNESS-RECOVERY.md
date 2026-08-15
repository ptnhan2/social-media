# SESSION RECOVERY FILE — Read this first after compact

> Updated 2026-08-15 after Phase A-E completion.

## 1. PROJECT

Video Agent Harness (own product) on LangChain Deep Agents.
- LLM: DeepSeek V4 (text-only, `deepseek:deepseek-chat`)
- VLM: GLM-4V-Flash via ZHIPU_API_KEY (primary), Gemini/OpenAI/OpenRouter (fallback)
- Agent ↔ user = Vietnamese. Code/schema = English.

## 2. COMPLETED PHASES

### Phase A (Critical Gaps) — COMPLETE
- A1+A8: visual_critique tool — GLM-4V-Flash verified end-to-end
- A2: GovernedBackend — write-gate on all paths (25/25 tests)
- A3: FileBackedStore — persistent memory, taste-standard.md seeded
- A4: propose_improvement tool — parses critique, maps to style knobs
- A5: run_consolidation tool — wired into agent
- A6: visual-critique skill — how to judge frames
- A7: system_prompt with VLM critique + proactive improvement loop

### Phase B (Style Knobs) — B2+B3 COMPLETE, B1 pending
- B2: JSON Schema validation (style_schema.py) — types, ranges, enums
- B3: style_diff tool — reads event log, shows changes between versions
- B1: PENDING — deepen knobs in treatments.tsx (composition, color, easing)

### Phase C (Frontend) — C1-C3,C6-C7 COMPLETE, C4-C5 pending
- C1: Video preview panel (Vite middleware serves /video/*)
- C2: Before/after visual diff (inline in tool messages)
- C3: Style inspector (live knobs parsed from messages)
- C6: Error boundary + loading states
- C7: Responsive layout (mobile < 768px)
- C4-C5: PENDING — subagent cards, todo list UI

### Phase D (Testing) — D1,D2,D4,D6 COMPLETE
- D1: 22 unit tests (8 tools) — ALL PASS
- D2: 12 integration tests (full VLM loop) — ALL PASS
- D4: 25 governance backend tests — ALL PASS
- D6: GitHub Actions CI (3 jobs: python, frontend, ts)
- D3: PENDING — E2E Playwright tests
- D5: PENDING — load tests
- Total: 65 tests pass (6 governance + 25 backend + 22 unit + 12 integration)

### Phase E (Environment) — COMPLETE
- E1: Dockerfile.langgraph (Python 3.13 + ffmpeg + node)
- E2: Dockerfile.frontend (Node 20 → nginx)
- E3: docker-compose.yml (Postgres 16 + LangGraph + nginx)
- E4: postgres-init.sql
- E5: nginx-frontend.conf (SPA + API proxy + video proxy)
- E6: .env.example
- E7: health.py (health_check + log_tool_call)

### Phase F (Deployment) — F4+F5 done, F1-F3+F6 pending
- F4: cron_consolidation.py — scheduled consolidation
- F5: backup.sh — nightly Postgres dump + style JSON git + logs tar
- F1-F3: PENDING — needs VPS + domain from user
- F6: PENDING — production verification

## 3. KEY FILES (modified/created this session)

### Harness Python
- `harness/agent.py` — 12 tools, GovernedBackend, FileBackedStore, VLM loop in system_prompt
- `harness/tools.py` — 12 tools: render_window, read_style, list_style_knobs, update_style,
  capture_feedback, run_structural_qa, render_compare, propose_improvement, run_consolidation,
  style_diff (+ tutorial_tools: ingest_tutorial, render_compare)
- `harness/visual_critique.py` — multi-backend VLM (GLM-4V-Flash > Gemini > OpenAI > OpenRouter)
- `harness/governed_backend.py` — GovernedBackend wrapper (write-gate enforcement)
- `harness/file_store.py` — FileBackedStore (persistent, same interface as InMemoryStore)
- `harness/style_schema.py` — JSON Schema validation for style store
- `harness/governance.py` — write-gate (contradiction + minSupport + event log + replay)
- `harness/health.py` — health_check() + log_tool_call()
- `harness/cron_consolidation.py` — scheduled consolidation
- `harness/memories/taste-standard.md` — seeded taste principles
- `harness/skills/visual-critique/SKILL.md` — how to judge frames

### Tests (65 total, all pass)
- `harness/test_governance.py` — 6 tests
- `harness/test_governed_backend.py` — 25 tests
- `harness/test_unit_tools.py` — 22 tests
- `harness/test_integration_loop.py` — 12 tests (full VLM loop)
- `remotion-composer/shared/isaacverse/styleLoader.test.ts` — 6 tests

### Frontend
- `harness/frontend/src/App.tsx` — video preview, style inspector, error boundary, responsive
- `harness/frontend/src/index.css` — dark theme, video styling, responsive
- `harness/frontend/vite.config.ts` — project file server middleware (/video/*)

### Docker/CI
- `.github/workflows/ci.yml` — 3 CI jobs
- `docker/Dockerfile.langgraph` — backend container
- `docker/Dockerfile.frontend` — frontend container
- `docker/nginx-frontend.conf` — nginx config
- `docker/postgres-init.sql` — DB init
- `docker/backup.sh` — nightly backup
- `docker-compose.yml` — full stack
- `.env.example` — documented env vars

## 4. HOW TO RUN

### Standalone CLI
```powershell
.\harness\run.ps1 "list style knobs"
```

### LangGraph server + Frontend
```powershell
# Backend (port 2024)
$env:PYTHONIOENCODING='utf-8'
& "harness\.venv\Scripts\python.exe" -m langgraph_cli dev --port 2024 --host 127.0.0.1

# Frontend (port 3000)
cd harness\frontend; npx vite --port 3000
```

### Docker (production)
```bash
cp .env.example .env  # Fill in API keys
docker compose up -d  # Postgres + LangGraph + frontend
# Access at http://localhost
```

### Tests
```powershell
$py = "harness\.venv\Scripts\python.exe"
& $py harness\test_governance.py
& $py harness\test_governed_backend.py
& $py harness\test_unit_tools.py
& $py harness\test_integration_loop.py
cd remotion-composer; npx vitest run shared/isaacverse/styleLoader.test.ts
```

## 5. PENDING WORK

1. **B1**: Deepen style knobs in treatments.tsx (composition, color, easing)
2. **C4-C5**: Frontend subagent cards + todo list UI
3. **D3**: E2E Playwright tests
4. **D5**: Load tests
5. **F1-F3**: Deploy to VPS (needs user's VPS + domain)
6. **F6**: Production verification

## 6. KEY DECISIONS

1. Harness = own product on Deep Agents, self-host
2. DeepSeek text-only → VLM (GLM-4V-Flash) for visual critique
3. Style store = libraries/04-visual/isaacverse-style.json (versioned JSON)
4. Governance: GovernedBackend intercepts ALL write paths (write/edit/delete/execute)
5. Memory: FileBackedStore (dev) → PostgresStore (prod, same interface)
6. Schema validation: JSON Schema (types, ranges, enums) in update_style + GovernedBackend
7. Frontend: React + useStream, video preview via Vite middleware
8. .env parser strips inline comments (bug fix: was loading comment text as key value)
