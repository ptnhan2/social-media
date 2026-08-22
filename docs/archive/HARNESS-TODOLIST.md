# Harness Build Todo List

> Based on Deep Agents docs (overview, customization, going-to-production, quickstart, backends, tools, memory).
> Each task: research → design → code → verify → test.

## Phase 0: Foundation

### P0.1 ✅ Direction doc (docs/EVOLUTION-HARNESS-ISAACVERSE.md)
### P0.2 ✅ Python harness project (harness/ dir, pyproject.toml)
### P0.3 ✅ DeepAgents installed in dedicated venv (harness/.venv)
### P0.4 ✅ langchain-deepseek installed (DeepSeek support)
### P0.5 ✅ AGENTS.md pivot + workflow discipline

### P0.6 Fix agent.py: configure CompositeBackend
- Research: backends doc — CompositeBackend routes `/workspace/` → FilesystemBackend, default → StateBackend
- Code: `backend=CompositeBackend(default=StateBackend(), routes={"/workspace/": FilesystemBackend(root_dir=PROJECT_ROOT, virtual_mode=True)})`
- Also route `/memories/` → StoreBackend(namespace=("harness",)) with InMemoryStore
- Verify: agent can `read_file("/workspace/libraries/04-visual/isaacverse-style.json")`
- Test: invoke agent, ask it to list files under /workspace/

### P0.7 Fix agent.py: configure store
- Code: `store=InMemoryStore()` passed to create_deep_agent
- Verify: StoreBackend route works (agent can write to /memories/ and read back)
- Test: write a test file to /memories/, read it back in a new thread

### P0.8 Fix agent.py: configure memory
- Code: `memory=["/memories/AGENTS.md"]` — loads harness persona at startup
- Seed: write initial AGENTS.md to the store (use create_file_data)
- Verify: agent loads memory at startup (check system prompt includes AGENTS.md content)
- Test: invoke agent in thread 1, update memory, invoke in thread 2, verify memory persists

### P0.9 Remove redundant read_video tool
- Research: built-in `read_file` supports video (.mp4) as multimodal — agent can read rendered videos directly
- Code: remove `read_video` from tools.py (or keep as convenience wrapper that returns path)
- Update: system_prompt to tell agent "use read_file to view rendered videos at /workspace/projects/.../renders/"
- Verify: agent can `read_file("/workspace/projects/isaacverse-final/renders/draft_360p.mp4")` and see frames
- Test: invoke agent, ask it to read a rendered video

### P0.10 Fix update_style tool: use /workspace/ path
- Code: update_style reads/writes `/workspace/libraries/04-visual/isaacverse-style.json` (via FilesystemBackend)
- Or: use built-in `edit_file` on the style JSON + keep update_style for governed writes
- Verify: update_style modifies the real file on disk
- Test: call update_style, check file changed on disk

## Phase 1: Style Knob Layer (domain — Remotion/TS)

### P1.1 ✅ Catalog hardcoded constants in treatments.tsx
### P1.2 ✅ Design style schema JSON
### P1.3 ✅ Create isaacverse-style.json (libraries/04-visual/)
### P1.4 ✅ Create styleLoader.ts (getStyle path traversal)
### P1.5 ✅ Refactor SemanticDiagram.Edge (solid/gradient/brush)
### P1.6 ✅ Refactor ChapterCard (fontSize, accentLine, reveal)
### P1.7 ✅ Refactor HostReflectionShot (filter, letterbox, subtitle)
### P1.8 ✅ Verify Vite compiles + no runtime errors

### P1.9 Refactor ScreenProofInWorld to style knobs
- Research: read ScreenProofInWorld component, catalog hardcoded values (camera, focus, entrance, positions)
- Design: add screen-proof defaults to styleLoader + isaacverse-style.json
- Code: refactor component to read from getStyle()
- Verify: Vite compiles, no errors
- Test: visual check (render a beat using this treatment)

### P1.10 Refactor AudienceDemandProof to style knobs
- Research: catalog hardcoded values (comment stagger, rotation, contextIn/responseIn timing, fontSize)
- Design: add audience-demand defaults
- Code: refactor component
- Verify + Test

### P1.11 Refactor ProcessTimeline to style knobs
- Research: catalog hardcoded values (titleIn, progress, step stagger, node spring config)
- Design: add process-timeline defaults
- Code: refactor component
- Verify + Test

### P1.12 Refactor CandidateComparison to style knobs
- Research: catalog hardcoded values (titleIn, candidate stagger, grid, border)
- Design: add candidate-comparison defaults
- Code: refactor component
- Verify + Test

### P1.13 Refactor CinematicMetaphor to style knobs
- Research: catalog hardcoded values (entrance, push, filter modes)
- Design: add cinematic-metaphor defaults
- Code: refactor component
- Verify + Test

### P1.14 Refactor SceneTransition to style knobs
- Research: catalog hardcoded values (progress, blend modes, accent)
- Design: add scene-transition defaults
- Code: refactor component
- Verify + Test

### P1.15 Write TS test: style change alters Edge render
- Code: test that changing edge.stroke.mode from "solid" to "gradient" produces different SVG output
- Use: render Edge component with different style settings, compare output
- Verify: test passes
- Test: run `npm test` in composer-app

### P1.16 Sync step: copy style JSON to Remotion public before render
- Research: existing sync-project-public.mjs copies edit-doc to public — follow same pattern
- Code: add style JSON sync to sync-project-public.mjs (or new sync step)
- Verify: after sync, Remotion can read updated style from public dir
- Test: change style, sync, render, verify visual change

### P1.17 Style loader: read from public copy at runtime
- Code: styleLoader.ts tries to fetch from `/isaacverse-style.json` (public) with fallback to embedded seed
- Verify: changing public copy changes render
- Test: change public style JSON, reload, verify visual change

## Phase 2: Harness Tools (Python)

### P2.1 ✅ Design tool contract
### P2.2 ✅ render_window tool (calls render-window.mjs)
### P2.3 ✅ read_edit_doc tool
### P2.4 ✅ update_style tool
### P2.5 ✅ read_video tool (will be removed per P0.9)
### P2.6 ✅ run_structural_qa tool
### P2.7 ✅ capture_feedback tool

### P2.8 Fix tools: use /workspace/ paths
- Code: all tools that read/write project files use /workspace/ prefix (maps to FilesystemBackend)
- update_style: writes to /workspace/libraries/04-visual/isaacverse-style.json
- render_window: returns /workspace/projects/.../renders/ path
- read_edit_doc: reads /workspace/projects/.../05-edit-doc.json
- Verify: tools work with CompositeBackend filesystem routing
- Test: call each tool, verify correct file access

### P2.9 Add render_compare tool
- Code: renders before (current style) + after (proposed style), returns both video paths
- Implementation: save current style → apply proposed → render → restore → render → return both paths
- Verify: tool produces 2 video files
- Test: call render_compare, verify 2 outputs

### P2.10 Add list_style_knobs tool
- Code: reads isaacverse-style.json, returns all available knobs with current values
- Purpose: help agent know what it can change
- Verify: returns structured list of knobs
- Test: call list_style_knobs, verify output

### P2.11 Add read_style tool
- Code: reads current style JSON, returns it
- Verify: returns the style JSON content
- Test: call read_style, verify matches file on disk

## Phase 3: Deep Agent Configuration

### P3.1 ✅ Create agent.py (create_deep_agent)
### P3.2 Fix: configure CompositeBackend (P0.6)
### P3.3 Fix: configure store + memory (P0.7, P0.8)
### P3.4 ✅ Configure interrupt_on for update_style
### P3.5 ✅ Configure HARNESS_MODEL (configurable)

### P3.6 Configure permissions
- Research: permissions doc — FilesystemPermission(operations, paths, mode)
- Code: deny agent direct writes to /memories/ (only update_style tool can write there)
- Code: allow reads from /workspace/**, deny writes to /workspace/remotion-composer/** (treatment code)
- Verify: agent can't write_file to /memories/ directly
- Test: try direct write, verify blocked

### P3.7 Configure skills
- Research: skills doc — SKILL.md with frontmatter, progressive disclosure
- Code: create harness/skills/editing-craft/SKILL.md (editing principles: Murch Rule of Six, pacing, continuity)
- Code: create harness/skills/style-knobs/SKILL.md (reference for all style knobs + how to change them)
- Code: pass skills=["/skills/"] to create_deep_agent
- Verify: agent loads skill descriptions at startup, full content on demand
- Test: ask agent about style knobs, verify it loads the skill

### P3.8 Write harness AGENTS.md (memory seed)
- Code: write /memories/AGENTS.md with harness persona, taste/standard instructions, style knob reference
- Seed: use create_file_data + store.put() to initialize the memory file
- Verify: agent loads AGENTS.md at startup
- Test: invoke agent, verify it knows about style knobs from memory

### P3.9 Verify agent end-to-end (needs API key)
- Prerequisite: DEEPSEEK_API_KEY or GOOGLE_API_KEY set
- Test 1: invoke agent, ask "what tools do you have?" — verify all tools listed
- Test 2: ask agent to read_style — verify it returns current style
- Test 3: ask agent to render_window isaacverse-final 0 7 — verify it renders
- Test 4: ask agent to read_file the rendered video — verify it sees frames
- Test 5: ask agent to list_style_knobs — verify it returns knob list

## Phase 4: Memory Governance

### P4.1 ✅ governance.py standalone module (write-gate, minSupport, event log, replay)
### P4.2 ✅ Governance tests (6/6 pass)

### P4.3 Implement governance as backend PolicyWrapper
- Research: backends doc — PolicyWrapper wraps any backend, intercepts write/edit
- Code: wrap StoreBackend for /memories/ with validation (contradiction check, minSupport, approval)
- Code: PolicyWrapper.__init__(inner=StoreBackend(...), validator=governance.validate_style_change)
- Verify: direct write_file to /memories/ is blocked by policy
- Test: try write to /memories/, verify blocked; try via update_style, verify allowed (after approval)

### P4.4 Wire governance into update_style tool
- Code: update_style calls governance.validate_style_change before writing
- Code: if validation fails, return error message to agent
- Code: if validation passes, proceed (interrupt_on gates for user approval)
- Verify: update_style with valid change passes, invalid change blocked
- Test: call update_style with contradictory value, verify blocked

### P4.5 Implement event log as memory file
- Code: instead of harness/logs/events.jsonl, write events to /memories/events.jsonl (StoreBackend, cross-thread)
- Code: governance.log_event writes to the store-backed path
- Verify: events persist across threads
- Test: log event in thread 1, read in thread 2

### P4.6 Implement replay from store
- Code: governance.replay_from_log reads /memories/events.jsonl from store
- Code: can rebuild style store from event log
- Verify: replay produces correct style
- Test: apply changes, replay, verify matches

### P4.7 Test governance end-to-end
- Test 1: agent tries update_style with valid change → interrupt → user approves → persists
- Test 2: agent tries update_style with contradictory value → blocked by governance
- Test 3: agent tries direct write_file to /memories/ → blocked by permissions
- Test 4: replay from log rebuilds correct style

## Phase 5: Learning Loop (PoC)

### P5.1 ✅ capture_feedback tool
### P5.2 Design learning loop protocol
- Research: ILF (feedback → refine → learn), render-compare-refine pattern
- Design: the exact sequence of tool calls the agent makes for one learning cycle
- Document: write the loop protocol in harness/AGENTS.md (so the agent knows the steps)
- Protocol:
  1. User gives feedback ("edge too plain")
  2. Agent captures_feedback(dimension="edge-stroke", verdict="dislike", note="...")
  3. Agent read_style → knows current edge.stroke.mode = "solid"
  4. Agent proposes change: update_style("treatments.semantic-diagram.edge.stroke.mode", '"gradient"')
  5. interrupt_on pauses → user sees proposed change → approves
  6. Agent render_window (with new style) → gets video path
  7. Agent read_file(video) → sees rendered video with gradient edges
  8. Agent reports: "I changed edge stroke to gradient. Here's the result."
  9. Style persists in /memories/ + on disk → all future renders use gradient

### P5.3 Implement render_compare tool (P2.9)
### P5.4 Write learning loop instructions in system_prompt
- Code: update SYSTEM_PROMPT with explicit step-by-step learning loop protocol
- Code: include the edge gradient example as a worked example
- Verify: agent follows the protocol when given feedback

### P5.5 Run PoC: edge gradient example
- Prerequisite: API key set + agent configured (P3.x done)
- Test: tell agent "the edge lines in the diagram look too plain, make them more beautiful"
- Verify: agent captures feedback, proposes gradient, renders, shows result, persists
- Verify: style JSON on disk now has mode="gradient"
- Verify: re-rendering produces gradient edges

### P5.6 Run PoC: chapter card font size
- Test: tell agent "the chapter card title is too small"
- Verify: agent proposes larger fontSize, renders, shows, persists
- Verify: style JSON updated, future renders use new size

### P5.7 Test: style persists across threads
- Test: run learning loop in thread 1 (change edge to gradient)
- Test: start new thread 2, ask agent to render — verify gradient edges (style persisted via StoreBackend)
- Verify: /memories/ store has the updated style

## Phase 6: Deterministic QA Gates

### P6.1 Design QA gate
- Research: Reason-Less-Verify-More (deterministic pre-execution gates), Deep Agents middleware
- Design: before update_style persists, run: (a) JSON schema validation, (b) render test (does it still render?), (c) structural QA
- Code: implement as part of update_style tool (or as custom middleware)

### P6.2 Implement JSON schema validation
- Code: validate the style JSON structure (required keys, types, valid enum values)
- Code: if invalid, block the write and return error
- Verify: invalid JSON blocked, valid JSON passes
- Test: pass malformed style, verify blocked

### P6.3 Implement render test gate
- Code: after style change, run a quick render_window (draft, 1-2 seconds)
- Code: if render fails (exit code != 0), revert style change and return error
- Verify: style that breaks rendering is caught and reverted
- Test: change style to invalid value, verify render fails, verify style reverted

### P6.4 Wire QA gate into update_style
- Code: update_style flow: validate JSON → render test → if both pass → persist (with interrupt approval)
- Verify: full flow works end-to-end
- Test: valid change passes all gates; invalid change blocked at appropriate gate

### P6.5 Test QA gates
- Test 1: valid style change → all gates pass → persisted
- Test 2: invalid JSON → blocked at schema validation
- Test 3: valid JSON but breaks render → blocked at render test, style reverted
- Test 4: valid JSON, renders OK → passes all gates

## Phase 7: Polish & Docs

### P7.1 ✅ harness/README.md (needs update after P0.6-P0.8 fixes)
### P7.2 Update README with corrected setup
- Code: update run instructions (venv, API key, backend config)
- Code: add troubleshooting section
- Verify: following README from scratch works

### P7.3 Update docs/EVOLUTION-HARNESS-ISAACVERSE.md
- Code: update Build Progress with all completed tasks
- Code: update Remaining with accurate list
- Verify: doc matches reality

### P7.4 Update AGENTS.md Current Status
- Code: add harness build progress to Current Status section
- Verify: status is accurate

### P7.5 Write harness/CHANGELOG.md
- Code: record what was built, in what order, with what decisions
- Purpose: session continuity — next session reads this to know where things stand

### P7.6 Final commit + push
- Code: stage all changes, commit with clear message
- Code: push to GitHub
- Verify: git status clean, all commits pushed

## Phase 8: Future (post-PoC)

### P8.1 Tutorial ingestion loop
- Research: MaterialApprentice (video → process trace), StyleRef extraction, OpenMontage visual-style.md
- Design: "watch this tutorial" → extract technique → propose style change → same learning loop
- Code: tutorial_ingest tool (transcribe + frame analyze + extract technique)
- Code: wire into the same governance + approval flow

### P8.2 Segment attribution for video
- Research: Crayotter GRPB (task-local ordinal preference → segment credit)
- Design: when feedback is on a specific beat/segment, attribute to the specific treatment/knob
- Code: feedback tool accepts beat_id, maps to treatment + style knob

### P8.3 Background consolidation agent
- Research: Deep Agents memory doc — background consolidation pattern
- Code: second deep agent reviews recent feedback, proposes batch style refinements
- Code: cron schedule (or manual trigger)

### P8.4 Product UI (useStream frontend)
- Research: Deep Agents frontend doc — useStream hook (React)
- Code: web UI for the harness (chat interface + video preview + style inspector)
- Code: deploy via langgraph deploy (self-host) or custom server

### P8.5 Self-host deployment
- Research: going-to-production doc — langgraph.json, langgraph deploy, self-host store/checkpointer
- Code: configure langgraph.json with the harness agent
- Code: deploy to a server (Postgres store, checkpointer)
- Code: rent domain + publish website

### P8.6 Refactor remaining 2 treatments
- SceneTransition (P1.14) — if not done
- Any remaining treatments with hardcoded constants

### P8.7 Multi-user support
- Research: going-to-production — multi-tenancy, auth, RBAC
- Code: user-scoped memory (namespace by user_id)
- Code: authentication layer
- Code: per-user style stores
