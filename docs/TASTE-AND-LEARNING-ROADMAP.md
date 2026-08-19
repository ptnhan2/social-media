# Taste Calibration & Learning Roadmap — concrete proposals (rev 2)

> Written 2026-08-19, reviewed same day. Rev 2 fixes a critical flaw found in
> the review pass (blind votes), plus 4 hidden problems and 3 better methods.
> Review findings are marked REVIEW. Vietnamese explanation lives in the
> session chat; this doc is the implementation reference.

## REVIEW PASS — what changed and why

1. **CRITICAL (P1a):** the approval interrupt on `update_style` fires BEFORE
   the after-render exists — the user would vote without ever seeing the
   "after" video (a blind vote). Fix: restructure the protocol (v4) so the
   human gate moves from the CHANGE step to the KEEP decision, where both
   videos exist. This also reduces approval fatigue and keeps the write
   protection where it matters (persistence).
2. **Rubber-stamp / stale-zone risk (P1d):** AUTO zones stop asking → stop
   generating calibration data → go stale. Fix: 1-in-5 spot checks.
3. **Small-sample statistics (P1c):** 3/6 agreement proves nothing. Fix:
   N >= 10 before a zone may become AUTO; report Wilson intervals; weight
   recent votes higher (taste drifts).
4. **Disagreements over-generalize (P1e):** a single disagreement resolved by
   the user is a CASE, not a global principle. Fix: principles require
   minSupport >= 2 concordant cases (concept already in EVOLUTION doc).
5. **Prompt-conditioning unverified (P1b):** injecting taste-standard into the
   judge prompt may not move Qwen3-VL's preferences. Fix: measure it as an
   explicit experiment; better method = principles + few-shot exemplar
   verdicts (pairs the user already judged).
6. **Hidden dependency made explicit (P1c):** per-aspect attribution only
   works because each cycle changes exactly ONE knob. One-knob-per-cycle is
   not just good science — it is what makes calibration attribution possible.
7. **Motion calibrated on a weak instrument (P1):** pairwise montages (3
   frames) are a weak proxy for motion. Motion zone is PROVISIONAL until
   native video input works (international DashScope key).
8. **New knobs must ship with pixel-diff verification (P2 ph1):** lesson of
   the 4-day style-never-reached-render saga. No knob is trusted because the
   code "looks right".
9. **Generator must emit clip provenance (P2 ph2):** record which style knob
   produced each clip property (`clip.metadata.styleSource`) at generation
   time — cheap now, impossible to reconstruct later; enables restyle +
   attribution.
10. **Tutorial principles: provenance + divergence cap (P3):** Isaac-derived
    principles are one school, not gospel (the EVOLUTION doc requires the
    ability to diverge). Tag provenance; cap the share of Isaac-derived
    principles.
11. **optimize.py demoted (P6):** auto-editing AGENTS.md compliance rules is
    low-value and fragile; the taste flywheel (P1) is the real outer loop.
    Keep optimize.py as optional.

## P1. Taste calibration — align the oracle with the USER's taste

Problem: the pairwise oracle is Qwen3-VL's taste, unverified against the
user's. An uncalibrated oracle makes the agent learn the VLM's dream.

### Protocol v4 (prerequisite restructure — REVIEW fix #1)

Move the human gate from the change to the KEEP decision:

1. Read memory (knowledge-base, oracle-trust zones)
2. Render baseline, copy aside
3. Critique → weakest aspect (mapped through oracle-trust zones)
4. think (hypothesis: knob K → aspect Z)
5. update_style — NO approval interrupt during the experiment. Safety: the
   style store is a JSON file, instantly revertible and git-tracked; the cycle
   auto-reverts on any failed gate. (Note: the Composer UI reads the live
   store, so a mid-experiment value may briefly appear there — acceptable.)
   The DENY on treatment code stays absolute.
6. Re-render + pixel-diff gate (unchanged)
7. Pairwise control + verdict (unchanged)
8. KEEP decision — the human gate lives HERE:
   - AUTO zone + control passed + verdict says after → keep, no interrupt;
     log the cycle (this is where approval fatigue is avoided).
   - ASK zone, or control failed, or VLM is unavailable → interrupt WITH BOTH
     VIDEOS + the VLM verdict attached. The user's approve/reject is now an
     INFORMED pairwise vote and calibration data.
9. Record: cycle result + (if human voted) preference pair
10. Revert on any failed gate or losing verdict (auto-revert, no interrupt)

### 1a. Collect informed votes — `harness/memories/preferences.jsonl`

```json
{"ts":"...","segment":"3.5-7s","knob":"entrance.damping","a":18,"b":2,
 "user_verdict":"b","vlm_verdict":"b","aspect":"motion","zone":"ask",
 "model":"qwen3-vl-flash","agreement":true}
```

- Votes come from protocol v4 step 8 (informed) — never from blind
  mid-experiment approvals.
- The AGENT records the vote (it receives the resume decision); the file lives
  under /workspace/ (data, not taste standard → no extra write gate).
- Because each cycle changes exactly ONE knob, a vote attributes cleanly to
  that knob's aspect (REVIEW fix #6 — this coupling is why one-knob-per-cycle
  must never be relaxed for calibration runs).

### 1b. Condition the judge — principles + few-shot exemplars (REVIEW fix #5)

Judge system prompt = taste-standard.md principles + 2-3 exemplar pairs the
user already judged ("you previously judged A>B when X"). Few-shot verdicts
steer VLMs more reliably than abstract prose alone.

- Verify conditioning actually improves agreement: run the same historical
  pairs judged with vs without conditioning; keep whichever configuration
  agrees with the user more. This is itself a measurable experiment.
- Injection surface: principles enter taste-standard only via the write gate;
  every principle carries provenance + date and can be invalidated (the
  lifecycle established after the memory-pollution incident).

### 1c. Measure agreement per aspect — `harness/calibrate.py`

- Reads preferences.jsonl, computes per-aspect agreement with Wilson 95%
  intervals, weights recent votes higher (recency decay).
- Zone rules (REVIEW fix #2/#3): AUTO requires N >= 10 votes AND lower
  Wilson bound >= 80%. Below that: ASK. Motion zone is PROVISIONAL until
  native video input (montages are a weak motion instrument — REVIEW fix #7).
- Output: `harness/memories/oracle-trust.md` (zones + stats + last-calibrated).

### 1d. Gate decisions by trust zone + spot checks (REVIEW fix #2)

- AUTO zones: agent auto-keeps winning verdicts (no interrupt).
- Every 5th AUTO decision surfaces as a spot-check vote anyway — keeps
  calibration data flowing and detects drift/staleness.
- Recalibrate: every 20 cycles, on VLM_MODEL change, or when a spot check
  disagrees.

### 1e. Disagreements are CASES; principles need support (REVIEW fix #4)

- Each human-vs-VLM disagreement → recorded as a CASE in
  `harness/memories/disagreements.md` (context, the pair, the user's reason).
- A principle is distilled into taste-standard.md only when minSupport >= 2
  concordant cases point the same way (reuses the EVOLUTION-doc governance
  concept) — single-case rules are how over-generalization pollutes a
  standard.

Effort: protocol v4 + 1a + 1b + 1c = ~1 session. Zones + spot checks + 1e
distillation = ~1 more session.

## P2. Expand the action space (the "hands")

- **Phase 1 — more knobs (cheap, now):** add ~15 styleable params across
  treatments (stroke width, glow, padding, kicker sizes, letterbox, palette
  slots). REVIEW fix #8: every new knob lands WITH a pixel-diff verification
  test (test_style_read pattern) proving it moves pixels — no knob trusted
  because the code "looks right".
- **Phase 2 — generator architecture:** unify render on EditorDoc; treatments
  become generators; wrap editorOperations.ts as agent tools. REVIEW fix #9:
  the generator records provenance on every clip property
  (`clip.metadata.styleSource: "semantic-diagram.entrance.damping"`) — this
  enables restyle, attribution, and feedback mapping later; it is nearly free
  at generation time and impossible to reconstruct afterward.
- **Phase 3 — treatment code evolution:** agent writes new treatment variants
  behind deterministic QA gates (typecheck + render + structural QA). The
  "gradient brush stroke" dream lives here. Requires Phase 2 stable.

## P3. Learn from tutorials (Isaac reference videos)

Discipline: tutorials generate HYPOTHESES, never direct standards; every
candidate passes the same A/B + gate loop.

`harness/ingest_tutorial.py` (new):
1. Input: reference video (research/isaacverse/)
2. ffmpeg segmentation → per-beat montages
3. VLM describes VISUAL GRAMMAR per beat (not content)
4. Output: candidates.json (principles with provenance)
5. Human approves → taste-standard as CANDIDATE
6. Verify each candidate via a standard cycle on a test segment

REVIEW fix #10: tag provenance on all Isaac-derived principles and cap their
share of the standard — the EVOLUTION doc requires the ability to DIVERGE from
Isaac; the standard must stay "one school among others", not gospel.
VLM descriptions of reference videos confabulate like any VLM narration —
which is why step 6 (verification) is mandatory and candidate principles never
skip it.

## P4. Learn from user feedback

- **Reject-path wiring (now):** a REJECT at the protocol-v4 KEEP gate is both
  a calibration vote (against) and a knowledge-base failure entry. One data
  channel, two records.
- **Free-text feedback (next):** FEEDBACK-UI-SPEC box in AgentPanel → agent
  task "diagnose this complaint" → hypothesis → standard cycle → principle if
  confirmed.
- **Attribution:** clip provenance (P2 ph2) maps complaints to concrete clips.

## P5. Generalization — multi-segment verification

Run the cycle on chapter-card (0-3.5s), process-timeline (10.5-14s),
host-reflection (7-10.5s). Each = test_cycle_v1 with a different window + the
treatment's knob map. Respect rule 15 (some treatments have no knob for the
weakest aspect — report honestly, don't force unrelated knobs). Track
per-treatment win rates; zones may need per-treatment recalibration.

## P6. Small repairs

- **Agent smoke test (promoted):** run one improvement task through the REAL
  LangGraph agent; verify protocol v4 adherence from the LangSmith trace. The
  tools and memory are ready — this validates the assembly.
- **VLM structured output:** pairwise judge → response_format JSON with a
  strict verdict field (qwen3-vl supports structured output).
- **Network upgrade:** international DashScope key unlocks native video input
  (removes the 64KB montage limit) — a prerequisite for de-provisionalizing
  the motion trust zone.
- **optimize.py (demoted — REVIEW fix #11):** optional. Auto-editing AGENTS.md
  compliance rules is low-value/fragile; the taste flywheel is the real outer
  loop. If kept: timestamped experiments, compare pass rates, keep if no
  regression.

## Sequencing (rev 2)

1. **Protocol v4 restructure + P1a/1b/1c** — the flywheel; everything inherits
   its correctness. Includes the agent smoke test (P6) since v4 changes the
   loop the agent must follow.
2. **P5 multi-segment** — validates generality while calibration data
   accumulates.
3. **P2 Phase 1 knobs** (with per-knob pixel-diff tests).
4. **P3 tutorial ingest.**
5. **P2 Phase 2 generator + clip tools.**
6. **P4 feedback box + P6 remainder.**
