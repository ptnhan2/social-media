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
2. Read `04-video-doc.json`, `05-edit-doc.json`, QA evidence, transcript, assets, motion, and audio context for the selected slice.
3. Diagnose the root cause for the requested modality, not only the visual layer.
4. Create a canonical `EditPatch` scoped to the request range and target.
5. Render only the affected window when a concrete before/after artifact is needed.
6. Write diagnosis, patch ID, render paths, and evidence paths into the request or its result JSON.
7. Set status to `previewed` and stop before applying unless the request explicitly authorizes apply.
8. Never mutate unrelated beats, assets, global treatments, or future rules silently.

Use the existing project store, canonical patch contract, and render-window
scripts. Keep the handoff file as the audit record so Composer can reload the
result after this session.
