# Workflow Audit — CRUD holes, workflow gaps, system coherence

> Date: 2026-08-30 18:00 · Method: browser-driven walkthrough (project
> `workflow-audit`) + system-level analysis. Continues the UX walkthrough
> from the same day — this pass focuses on **workflow logic, CRUD
> completeness, and system coherence**, not visual polish.

## 1. CRUD HOLES — operations a user expects but cannot do

### Project-level (picker + studio)

| Operation | Status | Impact |
|---|---|---|
| **DELETE project** | ✗ MISSING | User creates test projects, makes mistakes, wants to clean up — impossible. Projects accumulate forever (already 7 in the picker, 1 orphaned "devlogs" with no edit doc). |
| **DUPLICATE project** | ✗ MISSING | Common workflow: "make a variation of this video" — no way to clone. |
| **ARCHIVE project** | ✗ MISSING | Completed projects clutter the picker; no way to hide them. |
| **RENAME project** | ✗ MISSING | Slug is the ID; changing it would break references. But a display title could be editable. |
| **Cancel running Generate** | ✗ MISSING | Generate runs 3-10 min; if user realizes they made a mistake, they must wait. No cancel button. |

### Script beat-level (studio)

| Operation | Status | Impact |
|---|---|---|
| **DELETE beat** | ✗ MISSING | User wants to remove a beat after script generation — no delete button. Must go through agent. |
| **ADD beat** | ✗ MISSING | User wants to add a 4th beat — no add button. Must go through agent. |
| **REORDER beats** | ✗ MISSING | User wants to swap beat 2 and 3 — no drag/reorder. Must go through agent. |
| **Change treatment** | ✗ MISSING | Treatment chip is read-only ("CHAPTER-CARD"). No way to switch to semantic-diagram etc. from the studio. |
| **Change duration** | ✗ MISSING | Duration shows "4.0s" but is not editable. |
| **Edit direction pre-voice** | ✗ MISSING | Direction textarea disabled when no voice clip. User wants to set direction tags BEFORE generating, not after. |

### Story-level

| Operation | Status | Impact |
|---|---|---|
| **Un-approve story** | ✗ MISSING | Once approved, fields lock permanently. User must go through agent to change story. |
| **Edit story after script exists** | ✗ MISSING | Story fields disabled after approval; no path back to story stage. |

## 2. WORKFLOW GAPS — the journey has no way back

### One-way journey trap

The journey stepper shows progress: idea → story → script → voice → video →
approved. But there is **no way to go BACK**:

- Story approved + script generated → user realizes the story was wrong →
  must use agent to re-do everything
- Video generated → user wants to change a script line → must re-run
  Generate (full TTS re-bill, no partial regen)
- No "version history" UI — the .bak files exist on disk but are invisible

### Story Draft vs Story Final divergence

The story-draft (qa/story-draft.json) and the story in the videoDoc
(04-video-doc.json) can diverge because `write_edit_doc` receives the story
as a separate input — there is no mechanism that guarantees the agent copies
from the approved story draft. In testing, I used two different story texts
and both ended up in the system simultaneously.

### Generate is all-or-nothing

`produce.mjs` runs: voice (TTS for ALL beats) → timeline → render. If the
render fails, the voice clips are already generated (and billed). Re-running
Generate re-does ALL voice generation. No partial recovery, no "skip voice,
just re-render".

### History section doesn't refresh (bug)

The HistoryCard component fetches trace events only once on mount
(`useEffect` with `[projectId]` dependency). When SSE fires (agent writes a
file), the main page refreshes but HistoryCard does NOT re-fetch — the user
sees stale/empty history until a full page reload. (Identified as cold-diff
review issue #9, deferred — now confirmed as a real user-facing bug.)

### Orphaned projects

The picker shows "devlogs" with "No edit doc" — this project is dead weight.
Without a delete function, it sits there forever, confusing users.

## 3. SYSTEM COHERENCE ISSUES

### Studio ↔ Editor data flow confusion

The studio reads beats from BOTH the edit-doc (05-edit-doc.json) and the
editor doc (editor/current.json):

- Script text: from edit-doc beats (correct — the script source)
- Voice metadata (QC, takes): from editor doc clips (correct — timeline
  projection)
- Duration display: from edit-doc beats (planned) vs editor doc beats
  (actual after retime) — inconsistent

When voice retime changes beat durations, the studio shows the EDIT-DOC
durations (pre-retime), not the actual post-retime durations from the
timeline. The user sees "4.0s" but the actual voice clip is 4.7s.

### Editor accessible at wrong stages

"Mở editor ↗" is always enabled. At the idea stage, it opens a blank editor
with a placeholder "NEW PROJECT" beat — confusing dead-end. Should be
disabled until the script stage.

### Agent drawer context confusion

The agent drawer's quick actions (Timeline, Render ±2s, Critique, Improve)
are shown for ALL projects, including brand-new ones with no script. They
would fail or produce meaningless results. Should be contextually hidden.

### SSE refresh is inconsistent

- Story draft changes → SSE fires → StoryCard updates ✓
- Script written → SSE fires → ScriptCard updates ✓
- Trace events written → SSE fires → HistoryCard does NOT update ✗ (fetch
  only on mount)
- Generate completes → SSE fires → stepper updates ✓ (via refresh callback)

## 4. PRIORITIZED FIX RECOMMENDATIONS

### P0 — Fix now (blocks real usage)

1. **History refresh bug** — make HistoryCard re-fetch when refresh triggers
2. **Editor button: disable before script stage** — prevent dead-end
3. **Delete project** — at minimum a "delete" on the picker (with confirm)

### P1 — Fix next session (workflow completeness)

4. **Add/Delete beat** — CRUD on script beats (the studio is the script
   editor; these are table stakes)
5. **Edit direction pre-voice** — allow direction input before voice
   generation (store in edit-doc, apply on generate)
6. **Partial generate** — allow "re-render only" or "re-voice beat X only"
7. **Story draft → write_edit_doc consistency** — the agent should read
   from the approved story draft, not receive it as a separate input

### P2 — Design decisions needed

8. **Go-back in journey** — should the stepper allow going back? At minimum,
   story should be re-editable after script exists (or a "revise story"
   button that resets downstream)
9. **Project archive/duplicate** — lifecycle management
10. **Version history UI** — surface the .bak files
11. **Treatment editing in studio** — per-beat treatment selector
12. **Duration editing** — per-beat duration control
