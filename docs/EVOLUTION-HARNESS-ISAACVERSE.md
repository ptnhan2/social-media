# Evolution Harness — cơ chế tiến hoá treatment (agent harness tự-cải-thiện)

> **Trạng thái: QUYẾT ĐỊNH HƯỚNG (chốt 2026-08-15). Chưa implement.**
> Doc này lưu lại toàn bộ quyết định đã chốt giữa user và agent trong phiên research, để không mất context khi session đổi/tràn. Đây là hướng dẫn cho các session sau — đọc trước khi tiếp tục.

## 1. Vấn đề

- Treatment hiện tại = **8 treatment tĩnh**, mọi cái `status: "forensic-provisional"` đóng băng, reuse y nguyên qua mọi video. `TreatmentSpec` lifecycle trong `schema.ts` là dead code; catalog JSON (`libraries/04-visual/isaacverse-treatments.json`) không được code load; `promote_feedback_rule` chết. **Không học, không đẹp dần.**
- Mục tiêu: từ "treatment theo kiểu layout dùng lại" → **cơ chế tiến hoá** học được từ (a) feedback của user và (b) video tutorial, tiến dần tới **1 tiêu chuẩn cái đẹp + kỹ năng edit video xuất sắc**, **có thể lệch khỏi house style Isaac theo thời gian** (không bị khóa trong style Isaac).
- Ví dụ cụ thể làm mốc: `SemanticDiagram.Edge` (`remotion-composer/shared/isaacverse/treatments.tsx:49-85`) hardcode `stroke="rgba(242,184,75,0.58)"`, `strokeWidth={2}`. User nhận ra đẹp hơn nếu thành **gradient xanh-nhạt → vàng-nhạt + nét cọ không đều** → phải có cơ chế cho agent HỌC được cái đẹp này và áp dụng mọi render sau.

## 2. Reframe: đây là bài toán **agent harness cho video editor**

- KHÔNG phải train model, KHÔNG phải "thêm file md".
- Là xây **agent harness tự-cải-thiện quanh Remotion editor**: loop + memory + governance + visual feedback.
- "Học" = harness tích luỹ kinh nghiệm (feedback/tutorial → refine → persist → apply). Agent **sửa code/data treatment trong repo** (`treatments.tsx` và/hoặc style JSON mà code đọc) — file thật, có git version. `.md`/`.json` metadata chỉ là hướng dẫn agent, không tự đổi render.
- **Tài sản thật = dữ liệu + domain logic + standard tích luỹ (portable)** — KHÔNG phải harness shell. Giữ domain portable (code thuần + JSON + MCP) thì đổi harness nào cũng không mất tài sản.

## 3. Lựa chọn nền tảng (CHỐT 2026-08-15)

- Mục tiêu sản phẩm: **build product RIÊNG của user** (web, tự sở hữu, kiếm tiền sau) — không phải làm thuê, không phải tool nội bộ tạm.
- **CHỌN: LangChain Deep Agents** (`create_deep_agent`, Python, MIT, `langchain-ai/deepagents`) làm nền harness:
  - Open-source + **self-host được** (đường `langgraph.json` + `langgraph deploy` + self-host store/checkpointer). **KHÔNG đi LangSmith Managed/Deployments** (cloud của LangChain = "đất thuê" hạ tầng product) — giữ quyền sở hữu.
  - **Model-agnostic**: `openrouter:z-ai/glm-5.2` dùng được thẳng — đúng family model project đang dùng.
  - **`read_file` đọc được video/audio/image** (`.mp4`, `.wav`, `.png`...) → agent "nhìn" được render thật → nền cho visual critique / render-compare-refine.
  - **`interrupt_on`** = approval gates (pause trước tool call, user approve/edit/reject). **`permissions`** = path-level allow/deny. **Custom middleware** = deterministic gates (Reason-Less-Verify-More).
  - **Memory**: virtual filesystem + `StoreBackend`/`CompositeBackend` (cross-thread, agent tự cập nhật từ feedback) → nền cho taste/standard store. CẢNH BÁO docs: shared memory là vector prompt-injection → governance ghi là của ta.
  - Subagents (cô lập context), context management (summarize/offload/prompt caching), durable execution (LangGraph checkpoint, time-travel), `useStream` frontend (React).
- **KHÔNG chọn**: OpenClaw (product assistant 1 operator, không phải engine sản phẩm), OpenHands SDK (thiên coding-agent), CheetahClaws (research), build web harness từ zero ngay (tốn nhất + build nhầm thứ khi domain còn chuyển động).
- Chiến lược: **bây giờ build domain portable + research spec; khi cần rời Kilo/ra web → self-host Deep Agents**, không rebuild từ zero.

## 4. Kiến trúc (blueprint đã research)

```
5 tầng harness: Execution runtime → Context system → Capability surface → Governance layer → Surface adapters
Loop: ORIENT → DECIDE → ACT → OBSERVE → REFLECT (PAL)
```

| Tầng | Deep Agents cho sẵn | Ta phải build |
|---|---|---|
| Runtime + loop + durability | LangGraph (checkpoint/resume/time-travel) | — |
| Context | skills, memory (AGENTS.md + agent-updatable), summarize/offload, prompt caching | Nội dung standard seed từ forensic Isaac |
| Capability | tools + MCP + virtual filesystem (đọc video/audio) | MCP bridge tới Remotion renderer; refactor treatments → style knobs |
| Governance | `interrupt_on`, `permissions`, custom middleware, PII, fault tolerance | **Memory governance** (write gate + minSupport + approval); deterministic QA gates trước commit treatment edits |
| Delegation | subagents, task planning, dynamic subagents | — |
| Product path | useStream frontend, multi-tenancy (thread/context/user), self-host deploy | UI/product wrapper của riêng user |

## 5. Phải tự build (domain + governance — Deep Agents KHÔNG có)

1. **Treatments → style knobs**: refactor `treatments.tsx` để visual micro-decision (stroke mode, gradient stops, texture, motion curve, glow...) đọc từ style layer (JSON) thay vì hardcode. Ví dụ: `edge.stroke = { mode: "gradient", stops: ["#7fd8e8", "#f2d58a"], texture: "brush" }`. Đây là tiền đề — không có knob thì không có gì để học.
2. **Memory governance cho taste/standard store**: write gate (contradiction check vs facts đã duyệt + **minSupport=2** + approval), read gate (chỉ approved vào context, có provenance + recency), reversible (append-only log + mutable store). Cắm vào StoreBackend + custom middleware / backend policy hooks.
3. **Learning loop**: feedback (per-aspect verdict trên render) và tutorial (demonstrations → lessons) → refine code/style → approve → persist → apply. ILF-style: feedback ngôn ngữ → refine → học; tutorials = demonstrations (PREFIL). Attribution segment cho video (đẹp/dở ở render cuối, nguyên nhân ở treatment giữa).
4. **Deterministic QA gates** trước mọi commit treatment/style edit: typecheck + render deterministic + structural QA pass (custom middleware, không đặt trong prompt).
5. **Remotion integration**: Python harness ↔ Node/TS renderer hiện có (MCP server hoặc CLI) — `read_file(video)` để visual critique.
6. **Nội dung standard seed**: forensic Isaac grammar + Murch Rule of Six + catalog hiện có.

## 6. Research foundation (nguồn chính, 2024-2026)

- Harness: UNU "Engineering and Governing the Agent Harness"; Modern Agent Harness Blueprint 2026; "Scaling the Harness" (arXiv 2605.26112); PAL (clawRxiv 2604.01045).
- Memory governance: SSGM (arXiv 2603.11768), MemArchitect (2603.18330), ReMe, AutoMem (memory-as-skill ~2-4x), Scaling-the-Harness 3 trục lỗi memory (drift/over-generalization/pollution).
- Safety khi agent tự sửa code: "Reason Less, Verify More" (deterministic pre-execution gates, arXiv 2607.07405), SICA (self-improving coding agent).
- Video-editing agents: Crayotter/GRPB (ordinal preference cho editing), VideoAgent, X-Cut (Remotion + recipe skills), GLANCE, VIVA/Edit-GRPO.
- Visual feedback / render-compare-refine: VFLM (CVPR 2026), VisRefiner, CITL (vision-guided frontend refinement), UI2Code^N, frontier-bench layout-recreation oracle.
- Taste memory: design-lab (vault + per-aspect verdict + approval-gated distill, ADR-0004/0005).
- Learning từ feedback: ILF (arXiv 2303.16749 — feedback > demonstrations, +38%), PREFIL, Experience Distillation.
- Deep Agents docs: docs.langchain.com/oss/python/deepagents/ (overview, customization, going-to-production, memory).

## 7. Next steps / build order

1. Viết spec chi tiết: schema style/taste store, middleware gates, memory governance (write/read gate), MCP bridge Remotion, learning loop protocol.
2. PoC: Deep Agents (self-host local) + MCP renderer + 1 style knob (edge stroke) qua đủ vòng feedback → refine → approve → persist → apply.
3. Rồi mới mở rộng: tutorials ingest, segment attribution, product UI (useStream).

## Liên quan

- `docs/PIPELINE-ISAACVERSE.md` — pipeline hiện tại (treatment tĩnh).
- `docs/FEEDBACK-UI-SPEC.md` — feedback UI (có seed: FeedbackRecord, promote_feedback_rule).
- `docs/GAP-B-RESOLUTION.md` — đã retire "layout reuse" → semantic treatment; `TreatmentUsage` doc-only.
- `remotion-composer/shared/isaacverse/treatments.tsx` — code treatment cần refactor thành style knobs.

## Build Progress (2026-08-15 session)

### Done
- **Style layer**: `libraries/04-visual/isaacverse-style.json` (versioned style store seed).
- **Style loader**: `remotion-composer/shared/isaacverse/styleLoader.ts` (`getStyle` path traversal + `setActiveStyle` override).
- **Edge refactor**: `SemanticDiagram.Edge` reads stroke from style layer — supports `solid | gradient | brush` modes (the user's gradient+brush example is now a style knob change, not a code edit).
- **Python harness scaffold**: `harness/` directory with `pyproject.toml`, `agent.py` (Deep Agents `create_deep_agent` with `openrouter:z-ai/glm-5.2`), `tools.py` (6 tools: render_window, read_edit_doc, update_style, read_video, run_structural_qa, capture_feedback), `governance.py` (write-gate + minSupport + event log + replay), `AGENTS.md` (harness memory), `README.md`.
- **Approval gate**: `interrupt_on={"update_style": True}` — every style change requires user approval.
- **Feedback logging**: `capture_feedback` tool logs per-aspect verdicts to `harness/logs/feedback.jsonl`.
- **Event log**: `harness/logs/events.jsonl` — append-only log of all style changes with provenance.
- **Governance**: `governance.py` — `validate_style_change` (contradiction check + minSupport ≥ 2), `apply_approved_change`, `replay_from_log` (reversible reconciliation).

### Remaining (next sessions)
- P0.3: Verify Deep Agents installs + hello-world run.
- P1.5-P1.6: Refactor more treatments (ChapterCard, HostReflectionShot) to style knobs.
- P1.8-P1.9: Verify render with style layer + test style change alters output.
- P3.2: Configure CompositeBackend (cross-thread style store).
- P3.6: Verify agent invokes tools in a test run.
- P4.1-P4.2: Wire governance as custom Deep Agents middleware (currently standalone module).
- P5.2-P5.7: Full learning loop PoC (refine → render-compare → approve → persist).
- P6.1-P6.5: Deterministic QA gate middleware (typecheck + render before commit).
- P7.1: harness/README.md (done, needs update with run instructions after install verified).
