# Video 04 — full edit timeline map (preliminary)

Source: `04 - How I Actually Edit Viral Videos.mp4`.
Evidence: 30-second frame sheets + VTT alignment + detailed 0:00–2:00 frame pairs.
The ranges below are chapter-level treatment maps, not exact cut lists.

## Timeline chapters

| Range | Transcript/narrative cue | Visual treatment evidence | Reproduction contract |
|---|---|---|---|
| 00:00–00:30 | Audience asks for an editing tutorial; reveal that it took 9 months and started a year ago | Comments → layered comment montage → Premiere/character reveal → yellow flash into backstory | `audience-demand-proof` → `screen-proof-in-world` → `transition:flash` |
| 00:30–02:00 | Isaac explains insecurity and comparison with editing wizards | Amber line-art world, monitor/YouTube evidence, character close-ups, shot/reverse-shot; subtitles integrated in letterbox | `host-reflection-cinematic` + `screen-proof-in-world` + `cinematic-metaphor` |
| 02:00–03:30 | “You don't need to be an editing wizard”; choose the style that fits the audience | Host reassurance and visual examples alternate; evidence is answered by character emotion | `host-reflection` → `candidate-comparison` → `host-reflection` |
| 03:30–05:00 | Improve idea/script before editing; edit cannot save a bad idea | Browser/doc/analytics proof, black semantic cards, line-art host and example clips | `metric-proof`/`screen-proof` + `chapter-card` + `semantic-diagram` |
| 05:00–06:30 | Secondary story and structure | Isaac/Steven story framing, diagrams and highlighted planning material | `semantic-diagram` with `process`/`story` variant + `host-reflection` |
| 06:30–08:00 | Filming/footage; watch movies with editor's eye | Movie/stock cinematic inserts, dark character/scene shots, visual metaphor for inspiration | `cinematic-metaphor` + `film-insert` + `host-reflection` |
| 08:00–09:30 | Assets: music, SFX, overlays, presets | Asset graph/branch diagram, highlighted script/doc, Premiere/audio/timeline screens | `semantic-diagram` + `process-timeline` + `screen-proof` |
| 09:30–11:00 | Open Premiere; import VO; build workspace; add music early | Premiere workspace, timeline close-ups, browser/audio screens; multiple tracks visible | `process-timeline` + `screen-proof-in-world`; audio density starts here |
| 11:00–12:30 | Layer footage/images/screen recordings; add animation | Timeline and asset montage; colored process blocks; “animation” chapter treatment; diagrams of boxes/flows | `semantic-diagram` → `process-timeline` → `animation-treatment` |
| 12:30–14:00 | Canva vs After Effects; sketch/create/animate | Black semantic cards (`Guides`, `Glow`, `The Editing`), AE/Canva UI, neon nodes, colored tracks | `chapter-card` + `screen-proof` + `semantic-diagram` |
| 14:00–15:30 | Rough cut, rewatch, cut useless parts, preserve space | Timeline states, host reaction, black reset cards, cinematic “2 months later” turn | `process-timeline` → `host-reflection` → `chapter-card` |
| 15:30–17:00 | Zooms, focus consistency, text roles | Timeline/shot examples, text demonstrations, rule-of-thirds/focus diagrams, host/film inserts | `screen-proof` + `semantic-diagram` + `text-treatment` |
| 17:00–18:30 | Text pop, character, overlays, light leaks | Text/character examples, glow/line effects, light/texture transitions, timeline construction | `text-pop-treatment` + `character-shot` + `overlay-transition` |
| 18:30–20:00 | Sound design, color, learning a new technique | Audio/timeline/UI proof, host/character scenes, visual emphasis on effect learning | `sound-design-pass` + `process-timeline` + `host-reflection` |
| 20:00–21:00 | Perfectionism loop; 2 months later | Black title card, amber split-face close-ups, dialogue/reverse shots, emotional hold | `host-reflection-cinematic` + `chapter-card` |
| 21:00–22:06 | “Good enough”, press publish, no secret technique; keep learning | Resolution cards, warm character world, final reflective line-art/host frame | `chapter-card` → `host-reflection` → `resolution-card` |

## What this map says about the agent

The agent should generate a **chapter sequence** first, then fill it with treatments. It should not choose an effect for every sentence independently.

```text
chapter purpose
→ treatment sequence
→ shot roles
→ asset slots
→ motion/audio phases
→ exact beat timing
```

The same `screen-proof` treatment is not reused identically. Its semantic role changes:

- audience proof;
- skill comparison;
- process evidence;
- tool demonstration;
- audio/timeline proof;
- final result proof.

The component therefore needs a role/variant parameter, not a single fixed layout.

## Reproduction priorities from this video

1. `HostReflectionShot` with recurring world/grade/subtitle rules.
2. `ScreenProofInWorld` with role-specific screen treatment.
3. `SemanticDiagram` with journey/process/comparison variants.
4. `ProcessTimeline` for Premiere/audio/asset workflows.
5. `ChapterCard` for semantic resets, not decoration.
6. `TextTreatment` with source-UI, cinematic-subtitle, diagram-label and emphasis roles.
7. `SoundDesignPass` with density changes by chapter, not one global BGM level.

The exact micro-cut map remains a later pass; the chapter-level structure is now grounded in both transcript and visual samples.
