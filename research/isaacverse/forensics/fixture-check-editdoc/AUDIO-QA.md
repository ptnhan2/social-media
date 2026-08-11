# EditDoc audio fixture QA

Output: `remotion-composer/renders/isaacverse-edit-doc-fixture.mp4`

## Verified

- MP4 contains H.264 video and AAC audio streams.
- Audio duration: `14.058667s`; video duration: `14.000000s`.
- Waveform shows the real enhanced reference voice segment, music bed regions and transient cue events.
- Music duck zones are applied through frame-driven volume curves.
- Whoosh cue is scheduled at the proof transition.
- Impact cue is scheduled at the reflection emphasis.
- Integrated loudness: `-18.2 LUFS`.
- Loudness range: `12.4 LU`.
- True peak: `-1.0 dBFS`.

## Scope

The voice and SFX are real local audio fixtures. The music bed is still a plumbing fixture, not a final IsaacVerse music selection. This pass verifies the `AudioPlan`/`AudioMixer` contract and timing; it does not claim final sound design quality.
