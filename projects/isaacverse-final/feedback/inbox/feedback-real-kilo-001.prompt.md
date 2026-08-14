# Kilo Review Request

Read the structured request at:
C:\DevWork\social-media\projects\isaacverse-final\feedback\inbox\feedback-real-kilo-001.json

Project: isaacverse-final
Version: v004
Selection: isaacverse-final:final-beat-03:motion-phase:final-beat-03:phase-focus (7.000-9.800s)
Modality: motion
Category: motion-too-flat
Requested action: diagnose_and_patch

Required workflow:
1. Read the request, project state, current EditDoc, QA evidence, transcript, and audio/treatment context.
2. Inspect only the selected range and modality first.
3. Diagnose the root cause.
4. Create a canonical EditPatch scoped to the selected range/target.
5. Render only the affected window when evidence is needed.
6. Write diagnosis, patch, and artifact paths back to the project.
7. Update the request status to previewed, applied, rejected, or blocked.
8. Do not mutate unrelated beats or global rules without explicit approval.
9. Put the result in the request JSON under result: {diagnosis, patch, beforePath, afterPath, evidencePaths, completedAt} so Composer can reload it.

User note:
Keep the proof readable while adding a restrained movement phase.

