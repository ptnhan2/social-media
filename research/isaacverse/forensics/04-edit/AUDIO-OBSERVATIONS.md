# Video 04 — first 60s audio evidence

Artifacts:
- `audio/first60-spectrogram.png`
- `audio/first60-waveform.png`

## Observed evidence

- The waveform is not a flat continuous VO line. It contains deliberate low-energy gaps and separated phrase blocks.
- The first ~15 seconds are dense and layered, consistent with an intro built from voice plus music/transition activity.
- The middle part contains sparse sections and isolated transient spikes rather than uninterrupted loudness.
- The later 30–60s region is denser again, with repeated broadband vertical events over a continuous lower-frequency bed.
- The spectrum contains sustained lower-frequency energy plus repeated transient broadband events. This is consistent with a music bed plus impact/transition/SFX events, but the mixed source alone cannot identify each event with certainty.
- Overall integrated loudness for the full video is `-22.3 LUFS`, LRA `4.7 LU`, true peak `-2.7 dBFS` from the deterministic audit. This is a technical baseline, not a quality judgment.

## Implication

The edit system needs event-level audio timing and ducking, not only one background-music volume value. The next pass must align waveform/spectrogram events with exact visual cut/beat timestamps and transcript phrases before defining SFX placement rules.
