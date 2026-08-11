# IsaacVerse Composer Revamp Plan

This is the active implementation checklist. The product has one user-facing
web app: `remotion-composer/composer-app/`. Legacy spatial-layout tooling has
been removed.

## Evidence Gates

- [x] Verify Canva's media-first multi-track timeline, playhead, scrubbing, audio waveform, element timing, animation, and AI-editing behavior from official sources.
- [x] Verify installed Remotion `Player` supports playable browser preview and selected in/out frame ranges.
- [x] Verify Kilo direct browser-session injection is not available from the current CLI/config; choose filesystem handoff instead.
- [x] Record verified, inferred, and unknown facts in `docs/COMPOSER-EVIDENCE-AUDIT.md`.

## Core Model

- [x] Add `ReviewSlice` with stable IDs, range, parent beat/shot, target element/audio/motion IDs, modality, and status.
- [x] Derive slices from beats, shots, motion phases, elements, voice, music, SFX, and transitions.
- [x] Add inclusive frame-range conversion tests.
- [x] Add canonical multimodal feedback target fields.
- [x] Add cascade metadata and downstream timing reflow for duration changes.

## Live Composer

- [x] Use one full-video Remotion Player as the primary preview.
- [x] Add beat lane and atomic event/slice lane above the tracks.
- [x] Add `Full video`, `Play beat`, and `Play with context` controls.
- [x] Select and loop an in/out range without encoding an MP4.
- [x] Add VO, music, visual, text, and SFX track labels.
- [x] Persist ReviewSlice approval rollups.
- [x] Verify click beat, click event slice, range playback, approval, reload persistence in browser.

## Kilo Handoff

- [x] Write `FeedbackRequest` JSON and paired prompt under `feedback/inbox/`.
- [x] Add `/review-pending` project command for the current Kilo session.
- [x] Add Kilo inbox API and Composer polling.
- [x] Define result contract containing diagnosis, patch, before/after paths, and evidence paths.
- [x] Load returned patches into Composer live preview and serve persisted artifacts.
- [ ] Run one real Kilo `/review-pending` request after the user triggers it; do not simulate model output.

## Semantic Canvas

- [x] Keep direct canvas editing inside Composer's `Edit beat` mode.
- [x] Keep stable `sourceElementId/sourcePath` on canvas elements.
- [x] Convert canvas geometry/text edits into beat-scoped canonical patches.
- [x] Verify unrelated beats remain unchanged.
- [ ] Extend every treatment renderer to consume semantic element geometry, timing, and typography instead of only storing metadata.

## Legacy Removal

- [x] Move executable app to `composer-app`.
- [x] Remove old spatial registry routes and APIs.
- [x] Remove legacy spatial catalog and components.
- [x] Remove old app, demo composition, and legacy canvas panels not used by Composer.
- [x] Audit source/docs/JSON for zero legacy editor references.

## Final Acceptance

- [ ] Run one real Kilo-assisted multimodal fix through inbox, diagnosis, patch, live preview, evidence range, apply, and rollback.
- [ ] Run direct canvas edit and verify persisted reload.
- [ ] Run draft/master render and structural/media QA without changing thresholds to hide failures.
- [ ] Refresh `FINAL-REPORT.json` only after the real Kilo flow is evidenced.
