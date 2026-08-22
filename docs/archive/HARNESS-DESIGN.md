# Harness Design Doc — Full Product Spec

> Based on: Deep Agents docs (HITL, permissions, context-engineering, memory, backends, tools),
> DeepSeek API research (text-only, no vision), LangGraph self-host (Postgres),
> harness governance research (SSGM, SkillAudit, VaG, VFLM, design-lab).

## Critical Gap Discovered

**DeepSeek V4 = text-only.** No image/video input. Agent CANNOT "see" rendered videos.
→ Must use a separate VLM (Gemini 3.6 Flash / Qwen-VL) for visual judgment.
→ Architecture: DeepSeek (reasoning + tool calling) + VLM (visual critique via API call).

## Architecture (Full Product)

```
┌─────────────────────────────────────────────────┐
│ FRONTEND (React + useStream)                     │
│  Chat │ Video Preview │ Style Inspector │ Diff   │
│  Approval Bar │ Subagent Cards │ Todo List       │
└────────────────────┬────────────────────────────┘
                     │ WebSocket (useStream)
┌────────────────────▼────────────────────────────┐
│ LANGGRAPH SERVER (self-host, Postgres)           │
│  ┌──────────────────────────────────────────┐   │
│  │ Deep Agent (DeepSeek v4 — reasoning)      │   │
│  │  ├─ render_window (Remotion subprocess)   │   │
│  │  ├─ read_style / list_style_knobs         │   │
│  │  ├─ update_style (interrupt-gated)         │   │
│  │  ├─ render_compare (before/after)          │   │
│  │  ├─ visual_critique (VLM API call)  ← NEW  │   │
│  │  ├─ ingest_tutorial (ffmpeg keyframes)     │   │
│  │  ├─ capture_feedback                       │   │
│  │  ├─ run_structural_qa                      │   │
│  │  └─ propose_improvement  ← NEW (agent init) │   │
│  ├─ Governance Middleware (PolicyWrapper)      │   │
│  │  ├─ Write gate (contradiction + minSupport) │   │
│  │  ├─ QA gate (JSON schema + render test)     │   │
│  │  └─ Event log (append-only)                 │   │
│  ├─ Memory (StoreBackend, Postgres)            │   │
│  │  ├─ /memories/taste-standard.md             │   │
│  │  ├─ /memories/lessons-learned.md            │   │
│  │  └─ /memories/feedback-log.jsonl            │   │
│  ├─ Skills (/skills/)                          │   │
│  │  ├─ editing-craft (Murch, pacing, sound)    │   │
│  │  ├─ style-knobs (full reference)            │   │
│  │  └─ visual-critique (how to judge frames)   │   │
│  └─ Consolidation Agent (cron, background)     │   │
├─────────────────────────────────────────────────┤
│ DATA LAYER                                       │
│  Postgres (checkpointer + store)                 │
│  Style JSON (libraries/04-visual/)               │
│  Remotion renderer (Node.js subprocess)          │
│  VLM API (Gemini/Qwen for visual judgment)       │
└─────────────────────────────────────────────────┘
```

## Phase Breakdown

### Phase A: Fix Critical Gaps (BE)
- A1. Add visual_critique tool — calls VLM API (Gemini) with rendered video frames, returns text critique
- A2. Fix governance as real PolicyWrapper backend (not just in update_style tool)
- A3. Fix memory — use Postgres store (not InMemoryStore), taste-standard.md accumulates real principles
- A4. Add propose_improvement tool — agent proactively suggests style changes after render+critique
- A5. Wire consolidation agent into main loop (not standalone script)

### Phase B: Deepen Style Knobs (BE + Domain)
- B1. Refactor remaining hardcoded visuals in treatments.tsx (composition, color curves, motion easing)
- B2. Add style schema validation (JSON Schema, not just key existence)
- B3. Add style diff tool (show what changed between versions)

### Phase C: Frontend Product (FE)
- C1. Video preview panel (embed rendered .mp4 in UI)
- C2. Before/after visual diff (side-by-side video comparison)
- C3. Style inspector (live read of all knobs, highlight pending changes)
- C4. Subagent streaming cards (show delegation progress)
- C5. Todo list UI (agent task progress)
- C6. Error boundary + loading states
- C7. Responsive layout (mobile-friendly)

### Phase D: Testing (QA)
- D1. Unit tests: each tool (render_window, visual_critique, update_style, governance)
- D2. Integration tests: full learning loop (feedback → critique → propose → approve → persist → re-render → verify)
- D3. E2E tests: frontend UI (chat → approval → style change → visual diff)
- D4. Governance tests: contradiction, minSupport, drift, replay
- D5. Load tests: concurrent renders, multiple style changes
- D6. CI pipeline (GitHub Actions: lint + typecheck + test on push)

### Phase E: Environment (DevOps)
- E1. Dockerfile (LangGraph server + frontend build)
- E2. docker-compose.yml (Postgres + LangGraph + nginx)
- E3. Postgres setup script (schema, TTL, connection pool)
- E4. Nginx config (reverse proxy, WebSocket, SSL)
- E5. .env.example (all required env vars documented)
- E6. Health check endpoints
- E7. Logging + monitoring (structlog, OpenTelemetry)

### Phase F: Deployment
- F1. Deploy to VPS (Docker compose up)
- F2. SSL via Let's Encrypt
- F3. Domain DNS setup
- F4. Cron job for consolidation agent
- F5. Backup strategy (Postgres dump + style JSON git)
- F6. Verify production: full loop on real domain
