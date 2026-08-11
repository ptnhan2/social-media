# Composer Evidence Audit

## Purpose

This document records what was verified before the next Composer implementation
phase. It prevents the editor from being designed from memory or from treating
an unverified integration as available.

## Verified From Canva Sources

Sources:

- https://www.canva.com/help/creating-and-editing-videos/
- https://www.canva.com/video-editor/
- https://www.canva.com/video-editor/ai/
- https://www.canva.com/design-school/resources/video-timeline

Observed capabilities:

- A media-first, multi-track video timeline is the editing workspace.
- The timeline has a playhead, time ruler, track area, play/pause controls, scrubbing, jumping, and timeline zoom.
- Main, upper, text/graphics, music, sound-effect, and voiceover tracks can be layered and edited.
- Visual audio waveforms are used for synchronizing audio and video.
- Element timing can be edited independently from the page/design.
- Elements, text, graphics, clips, transitions, and audio can be edited directly in the timeline/canvas.
- Animation can be applied to an element or a whole frame, with controls such as intensity and timing.
- AI tools can identify highlights, style/cut/sequence clips, generate video, and improve voice, while the result remains editable in the timeline.

## Verified In This Repository

- `@remotion/player` exposes `Player` with `seekTo`, `inFrame`, and `outFrame` support.
- `@remotion/player` exposes `Thumbnail` with `frameToDisplay`, but a thumbnail is a static overview aid, not the primary approval unit.
- `IsaacVerseEditVideo` is a browser-renderable React/Remotion composition with audio and motion.
- `render-window.mjs` can encode a selected affected range, but this is slower evidence generation and must not be used for every interaction.
- The current Composer contains a Player and beat seek, but does not yet constrain playback to the selected beat range.
- The current Composer beat thumbnail is an asset/glyph preview, not a `Thumbnail` frame strip.
- The current waveform is CSS placeholder data, not a waveform derived from audio.
- The current `/api/agent/operate` endpoint is a local deterministic operation bridge, not a live Kilo conversation bridge.

## Kilo Integration Status

- The browser cannot assume that the currently open Kilo conversation is an HTTP endpoint.
- Local `kilo --help` was initially blocked by an unrecognized `web_search` key in global config; that obsolete key was removed and the CLI now starts.
- No verified local API for injecting a browser message into the current Kilo chat was found during this audit.
- Phase-one integration therefore uses a filesystem handoff: Composer writes a structured request and generated prompt; the user invokes `/review-pending` in the Kilo session; Kilo writes diagnosis/patch/render results back to the same project.

## Design Consequences

- The primary review unit is a playable live range, not a thumbnail.
- A beat is a narrative grouping. The atomic target is a `ReviewSlice` derived from shot, sentence, treatment phase, motion phase, element, voice, music, SFX, transition, or custom range boundaries.
- Direct canvas editing and Kilo-assisted editing share the same selection context and patch contract.
- Every AI-generated or AI-assembled modality needs a revision operation: story, VO, captions, assets, treatment, layout, motion, transition, music, ambience, SFX, mix, grade, and retiming.
- MP4 rendering is reserved for affected-window evidence and the final master.

## Unknowns That Must Stay Explicit

- Whether a stable Kilo process/session API becomes available after fixing the local config.
- Whether every treatment can expose reliable DOM hit zones for direct element selection without adding semantic render metadata.
- Whether audio waveform extraction should be FFmpeg PNG evidence or a browser WebAudio waveform for live interaction.
- Which Canva-specific behaviors are product-specific and should not be copied into the IsaacVerse semantic editor.
