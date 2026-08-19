# Harness Analysis — Eval Mechanism, Agent-Video Interaction, Aesthetic Learning

> Written 2026-08-19 after full code audit + Qwen3-VL integration.
> Vietnamese summary in chat; this doc is the durable English reference.

## 0. CRITICAL UPDATE (end of 2026-08-19 session) — the real blocker

While validating the VLM oracle, a deterministic pixel-diff exposed that **style
changes never reached the render at all**. damping 18→2, revealDurationSec
0.65→5.0, fontSizeShort 96→200, and even a hardcoded red square in the node
component ALL produced pixel-identical renders. So every prior "the VLM can't
detect the change" result was because there was no change to detect.

Three compounding bugs:
1. getStyle path prefix (FIXED in treatments.tsx)
2. Remotion render-time bundle cache (PARTIALLY FIXED — cache clearing + explicit bundle)
3. style JSON still not loaded by render even after a runtime-fetch styleLoader
   rewrite (UNRESOLVED — the served bundle doesn't pick up styleLoader.ts edits)

This re-prioritizes everything below: **fixing the style→render path is the
prerequisite for ALL improvement work.** The eval/oracle/aesthetic-learning
analysis remains valid as the design target, but none of it can be exercised
until a style change demonstrably alters the render (verify with
`harness/test_style_read.py`).

The rest of this doc was written before this discovery and analyzes the
mechanisms as designed.

## 1. The self-improvement mechanism — what actually exists today

There are THREE loops, and they measure different things. Conflating them caused
the false "agent improves video" claim (see knowledge-base.md invalidation).

### Loop A — Agent behavior eval (LangSmith) — measures COMPLIANCE, not quality

`harness/eval.py` runs 10 test cases against the running LangGraph server:

| Evaluator | What it checks | Validity |
|---|---|---|
| `used_expected_tools` | Did the agent call the expected tools (read_file, think, update_style...)? | Valid for behavior |
| `no_phantom_tools` | Did it avoid removed tools (read_style, propose_improvement...)? | Valid for behavior |
| `used_think` | Did it call `think`? | Valid for behavior |
| `read_memory` | Did the response mention memory files? | Weak proxy |
| `response_not_empty` | Non-empty answer | Trivial |
| `response_quality` | LLM-as-judge (DeepSeek) | **BROKEN** — DeepSeek is out of balance, silently scores 0 on error |

**What this loop can prove:** the agent follows the improvement-loop protocol
(reads memory, thinks, uses the right tools).
**What it cannot prove:** videos get better. No evaluator looks at a video.

### Loop B — Outer optimization (optimize.py) — currently non-functional

`harness/optimize.py` reads LangSmith evaluator scores → proposes AGENTS.md
rule additions (e.g. "stronger think requirement") → re-runs eval → reverts.
Broken parts (acknowledged in its own comments):
- `apply_and_test` calls `get_experiment_scores` twice and compares nothing —
  there is no real before/after comparison.
- It always reverts the proposal, so no change is ever kept.
- It optimizes AGENT COMPLIANCE, not video quality — a local maximum.

### Loop C — Video quality loop (the improvement cycle) — oracle unproven

The 11-step loop in memories/AGENTS.md: render → critique → change one knob →
re-render → critique → keep/revert → record in knowledge-base.

- The PROCESS is sound (controlled A/B, single-variable change, revert-on-worse).
- The ORACLE was GLM-4V-Flash judging 4 static keyframes with absolute 1-5 scores.
  Controlled test (2026-08-19): damping 18→10 → zero score delta. The oracle
  cannot measure what we change.
- Cross-session score comparisons are invalid (VLM non-determinism) — this
  produced the false SUCCESS entry now struck from knowledge-base.md.

### Conclusion

"Self-improving" today means: the agent *behaves* correctly (Loop A passes) and
*records* experiments correctly. Whether videos IMPROVE is unproven because the
measurement instrument was inadequate. Fixing the oracle is prerequisite to
everything else. Qwen3-VL integration (below) is that fix, with pairwise
comparison as the primary instrument.

## 2. Agent ↔ video interaction — what the agent can and cannot touch

### Current capability surface (exact)

| Surface | Mechanism | Granularity |
|---|---|---|
| Render a segment | `render_window` → render-window.mjs → reads `05-edit-doc.json` + style | whole window |
| Change global style | `update_style` → `libraries/04-visual/isaacverse-style.json` | per-treatment scalar knobs |
| Read/critique video | `visual_critique` → VLM (Qwen3-VL → GLM fallback) | per-render |
| Memory/skills | filesystem tools on /memories/, /skills/ | text |

That is ALL. The agent is a **global-look colorist/motion-tuner**, not an editor.

### The two-document gap

```
Composer UI (VideoEditor.tsx)
  edits EditorDoc (tracks/clips/keyframes — the NLE timeline)
  saves via POST /api/project/editor  →  PROJECT_STORE.saveEditor
  renders via POST /api/render (uses editorDoc.durationSec, but
  the RENDER itself reads 05-edit-doc.json + projects/<slug>/index.tsx)

Agent (LangGraph)
  renders via render-window.mjs → same 05-edit-doc.json pipeline
  styles  via isaacverse-style.json → getStyle() inside treatments.tsx
  NEVER touches EditorDoc. NEVER touches 05-edit-doc.json either (read-only via read_file).
```

- `05-edit-doc.json` (IsaacVerseEditDoc) = the semantic document: beats with
  treatments, assets, audio cues. This is what rendering consumes.
- `EditorDoc` = the NLE projection of that document: tracks, clips, trims,
  keyframes. This is what the user edits in the timeline UI.
- The style store = per-treatment parameters (the "knobs") read by treatment
  components at render time.

So when the agent "improves the video", it changes GLOBAL parameters of
treatments (spring damping, stroke mode, font sizes). It cannot:
- retime a clip, split/trim/ripple (EditorDoc operations exist as pure functions
  in `composer-app/src/editor/editorOperations.ts` — splitEditorClip,
  trimEditorClip, rippleEditorDoc — but are not exposed to the agent)
- change text/content of a beat (05-edit-doc.json is only read)
- swap assets, add audio events, change transitions
- act on the selected clip the user is looking at (AgentPanel passes only
  projectId + currentSec as context)

### What full agent-video interaction would require (design options)

1. **Semantic-level editing (recommended first step)**: agent tools that patch
   `05-edit-doc.json` (beat text, timing, asset refs, audio cues) with the same
   approval-gate pattern as update_style. Low risk — the render pipeline
   already consumes this document. Gives the agent content/timing control.
2. **NLE-level editing**: expose editorOperations via an HTTP endpoint or MCP
   server; agent submits operations (split/trim/move), server applies to
   EditorDoc, UI re-syncs. Needed for "fix this cut the user pointed at".
3. **Selection-scoped feedback**: pass EditorSelection (trackId/clipId/range)
   from the UI into the agent context so critiques target what the user sees.
   Currently only currentSec is passed — weak scoping.

The EVOLUTION doc's endgame (agent edits treatment CODE with deterministic QA
gates) sits above all of these.

## 3. Aesthetic learning — deep dive

### Definition (working)

The system accumulates (a) *taste* — verifiable principles about what looks
good — and (b) *skill* — parameter/code changes that achieve it — from
feedback, such that output quality improves over time and can diverge from the
seed (Isaac) style.

### The three required components

1. **A preference signal (oracle)** — what "better" means.
   - Today: GLM-4V-Flash absolute scores — proven insensitive (A/B delta 0).
   - Fix in progress: Qwen3-VL + **pairwise comparison**. VLMs are much more
     reliable at relative judgments ("which of these two is better?") than
     absolute 1-5 scoring: same-call comparison cancels inter-call variance.
   - Calibration: human verdicts (annotation queue "harness-quality-review")
     must periodically validate the VLM's pairwise verdicts. An oracle nobody
     calibrates is an echo chamber.
2. **An expressive action space** — what the system can change.
   - Today: ~20 scalar knobs (timings, sizes, colors, spring params). This
     supports parameter tuning, i.e. hill-climbing within the seed aesthetic.
   - The motivating example ("edge becomes gradient brush stroke with irregular
     texture") is NOT expressible in current knobs — stroke mode exists but
     brush texture/width variation doesn't.
   - Ladder: scalars → structured params (gradient stops, curves) → layouts →
     treatment code generation behind deterministic QA gates (typecheck +
     render + structural QA, per the Non-negotiable rules).
3. **An accumulation mechanism** — how learning persists.
   - Today: knowledge-base.md (experiment records) + taste-standard.md
     (principles), approval-gated writes. Structurally correct — this is the
     design-lab "vault + per-aspect verdict + gated distill" pattern.
   - Failure mode observed: pollution (the false SUCCESS entry survived 3 days
     and would have caused the agent to repeat a useless experiment forever).
     Governance must include INVALIDATION, not just approval.

### The honest current assessment

With a working oracle, the current system performs **knob hill-climbing with
memory** — genuine but narrow. Each cycle: change 1 knob → pairwise verdict →
keep/revert → record. With ~20 knobs and ~3 cycles/session, the agent explores
a tiny slice of parameter space and accumulates a small fact table
("damping 18→2 improved motion pairwise verdicts on semantic-diagram").

True aesthetic learning (learning new principles, diverging from seed style)
requires all three components upgraded: calibrated pairwise oracle + richer
action space + governed distillation of verdicts into principles. The
architecture (Deep Agents, filesystem memory, approval gates, LangSmith) is
the right chassis for it. What's missing is (1) a proven oracle and (2) an
action space that can express the aesthetic moves we want to learn.

### Recommended learning protocol (v2 — replaces absolute-score loop)

```
For each candidate change:
  1. Render BEFORE and AFTER (same session, same segment)
  2. Pairwise verdict: both renders in ONE VLM call → "which is better + why"
  3. N=1 verdict is weak → repeat the call k=3 times (or 3 frame-sampling
     variants); majority verdict wins; near-tie = NO CHANGE (revert)
  4. Record verdict + reasoning in knowledge-base.md
  5. Periodically: human validates a sample of verdicts via the annotation
     queue; disagreement rate is the oracle's accuracy score
  6. Distill stable wins into taste-standard.md principles (write gate)
```

This is the same shape as RLHF's reward-model-plus-verification loop, scaled
down to a filesystem-governed agent.

## 4. Qwen integration — state and constraints (2026-08-19)

### Implemented

- `harness_tools.py`: VLM provider chain `VLM_PROVIDER` = dashscope | zhipu |
  openrouter with automatic fallback on auth/billing/network failure.
  - dashscope (default): Qwen3-VL. Native video input (`video_url` base64)
    when payload ≤ `VLM_MAX_BODY_KB` (default 60KB), else compressed JPEG
    frame pairs (512px, q55, 52KB budget).
  - zhipu: GLM-4V-Flash keyframe pairs (working fallback).
  - openrouter: needs credit; `qwen/qwen3-vl-235b-a22b-instruct` available.
- `agent.py`: main LLM switchable via `HARNESS_MODEL=dashscope:<model>`
  (e.g. qwen-plus) — DASHSCOPE_BASE_URL respected.
- `.env`: `VLM_PROVIDER=dashscope`, `VLM_MODEL=qwen3-vl-flash`,
  `DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`
  (China endpoint — the funded key is China-region).

### Network constraint (measured)

From this network, POST bodies > ~64KB to dashscope.aliyuncs.com
(China endpoint) are connection-reset — 46KB OK, 97KB+ reset (both text and
image payloads; curl, urllib, and the dashscope SDK all affected; the intl
endpoint and zhipu are unaffected). Consequences:
- Native video input (350KB+) unusable on this route → compressed-frame path.
- **Upgrade path A (full video input): international DashScope key**
  (alibabacloud.com Model Studio, Singapore region) → set
  `DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
  and `VLM_MAX_BODY_KB=0`. Vietnam→Singapore route is clean.
- **Upgrade path B: OpenRouter credit** → Qwen3-VL via US endpoint, but
  image-frames only (OpenRouter does not relay video_url content).

### Qwen3-VL model options (DashScope)

| Model | Input/1M | Output/1M | Notes |
|---|---|---|---|
| qwen3-vl-flash | $0.05 | $0.40 | default; fast, cheap |
| qwen3-vl-plus | $0.20 | $1.60 | stronger reasoning |
| qwen3-vl-235b-a22b-* | ~$0.20+ | ~$0.88+ | flagship, open weights (on OpenRouter) |

A 4-frame critique ≈ 3-5k tokens ≈ under $0.001 with flash — cost is
negligible; pairwise doubles it.

### VLM oracle validation result (2026-08-19) — pairwise confabulates

Tested Qwen3-VL-flash pairwise comparison with a CONTROL (A vs A, identical
videos):
- With a premise-leading prompt ("the two videos differ only in spring
  damping"), Qwen3-VL **confabulated detailed differences for IDENTICAL videos**
  ("glow ripples", "motion halos") and declared them "not identical". Invalid.
- With a premise-NEUTRAL prompt ("are these identical or different? they might
  be the same"), the A-vs-A control correctly said "identical". But the A-vs-B
  test ALSO said "identical" — which was actually CORRECT, because (unknown at
  the time) the renders were genuinely identical (the style-never-reaches-render
  bug, §0).

Lesson for the oracle design: **(a) never presuppose a difference in the
prompt; (b) use a deterministic pixel-diff as layer 1** so the VLM is only asked
about changes that demonstrably exist; **(c) keep control trials (A-vs-A) as
standing calibration** of the VLM's false-positive rate. Until the
style→render bug is fixed, no VLM verdict can be trusted (there is no signal).
