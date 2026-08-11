# Video 03 — full voice tutorial timeline map (preliminary)

Evidence: 30-second frame sheets, transcript alignment, first-60-second frame/audio pass.

| Range | Transcript/narrative cue | Visual/audio treatment | Reproduction contract |
|---|---|---|---|
| 00:00–01:30 | Failed takes; “that sounds terrible”; why human voice feels real | Gold microphone/face line-art, `REALISTIC VOICE` title, comedic/movie insert, then recurring host world | `hook-failure-to-question` → `host-reflection` → `chapter-card` |
| 01:30–03:00 | Four elements: tone, pauses, emphasis, human writing | Black semantic cards, colored bars/labels, close-up face and microphone metaphor | `semantic-diagram` + `cinematic-metaphor` |
| 03:00–05:00 | Choose software; ElevenLabs as recurring tool | ElevenLabs UI, dark panels, voice library/cards, host avatar in UI context | `screen-proof-in-world` + `candidate-comparison` |
| 05:00–07:00 | Choose voice; clone/custom voice/design | Voice library, create-voice UI, prompt/settings panels, examples and reaction shots | `process-timeline` + `screen-proof` + `host-reflection` |
| 07:00–09:00 | First generation feels uncanny; V2/V3 settings | UI settings, model comparison, sample playback, character/face close-ups, gold microphone return | `candidate-comparison` → `host-reflection` → `screen-proof` |
| 09:00–11:00 | Punctuation, pauses, emphasis; before/after voice | Text/settings UI, before/after bars, examples, waveform/timeline evidence | `before-after-audio` + `process-timeline` |
| 11:00–13:00 | Generate a few sentences at a time; tone changes between takes | File downloads, colored version bars, Premiere timeline with multiple audio layers | `process-timeline` + `candidate-comparison` + `audio-layer-proof` |
| 13:00–15:00 | Chop best sections, cut pauses, fix speed/EQ | Premiere timeline close-ups, waveform/audio tracks, settings/preset UI | `screen-proof-in-world` + `process-timeline` |
| 15:00–17:00 | AI voice/authenticity/fraud emotional turn | Film insert, red/black graphic state, amber host close-ups and line-art microphone | `cinematic-metaphor` + `host-reflection-cinematic` |
| 17:00–19:00 | Dubbing is the real opportunity | Audience/language graph, gameplay/live-action examples, timeline of dubbed tracks | `metric-proof` + `candidate-comparison` + `process-timeline` |
| 19:00–20:00 | Separate VO/music/SFX, align and upload | Premiere multi-track timeline, YouTube Studio language/audio UI | `screen-proof-in-world` + `audio-layer-proof` |
| 20:00–end | Results by audio track; reach new countries | Analytics dashboard, gold microphone/host world, final reflective subtitle | `metric-proof` → `host-reflection` → `resolution-card` |

## Audio-specific evidence

- The opening intentionally alternates dense intro energy and sparse comedic pauses.
- Settings/tutorial sections use waveform and UI proof rather than only narration.
- The emotional authenticity section becomes sparse and character-led; it does not keep the same SFX density as the technical explanation.
- Dubbing section introduces a new audio-track concept visually before showing the upload mechanics.

## Agent implementation implication

The voice tutorial needs a **process + emotional arc**, not a linear UI walkthrough. The agent must be able to switch treatment families based on the narrative phase:

```text
failed attempt → explanation diagram → UI proof → candidate comparison
→ audio-layer proof → emotional reflection → metric opportunity → resolution
```

Each phase can use the same components as video 04, but with different semantic roles, parameters and audio density.
