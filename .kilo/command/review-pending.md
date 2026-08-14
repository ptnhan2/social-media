---
description: Process the oldest pending Composer request through the current Kilo session
---

# Review Pending Composer Requests

Read the current project state first:

```powershell
python tools/project/project_store.py resume --project projects/isaacverse-final
```

Then inspect the oldest `status: "pending"` request under:

```text
projects/<projectId>/feedback/inbox/*.json
```

Read its paired `.prompt.md` file and follow the requested workflow. The request
contains the exact `ReviewSlice`, time range, modality, target element/audio
event, category, and user note. Do not ask the user to repeat IDs or timecodes.

Required behavior:

1. Mark the request `claimed` and write `claimedAt`.
2. Time-box this request to one focused slice. Do not audit the entire repository or redesign the pipeline.
3. Read only the selected range's EditDoc beat/shot/element, transcript, relevant asset, motion phase, audio cue, and existing QA evidence.
4. Diagnose the root cause for the requested modality, not only the visual layer.
5. Create a canonical `EditPatch` scoped to the request range and target.
6. Render only the affected window when a concrete before/after artifact is needed.
7. Write diagnosis, patch ID, render paths, and evidence paths into the request or its result JSON.
8. Set status to `previewed` and stop before applying unless the request explicitly authorizes apply.
9. If a safe patch or evidence cannot be produced within this slice, set status to `blocked` with a concise reason. Do not continue speculative analysis.
10. Never mutate unrelated beats, assets, global treatments, or future rules silently.
11. Put the result in the request JSON under `result: { diagnosis, patch, beforePath, afterPath, evidencePaths, completedAt }` so Composer can reload it.

Use the existing project store, canonical patch contract, and render-window
scripts. Keep the handoff file as the audit record so Composer can reload the
result after this session.
