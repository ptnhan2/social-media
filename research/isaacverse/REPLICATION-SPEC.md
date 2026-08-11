# IsaacVerse replication layer (evidence → Remotion/agent)

> This is the bridge between forensic observation and a reproducible editor. It is intentionally **not** the final technique catalog yet. A treatment becomes catalog-approved only after recurrence and implementation tests.

## 1. Reproduction hierarchy

The agent should not select isolated effects. It should generate this hierarchy:

```text
VideoDoc beat
  -> narrative function
    -> semantic treatment
      -> shot sequence / composition component
        -> motion phases + text roles + audio cues
          -> asset slots + parameters
            -> Remotion code + deterministic render
```

The visual unit is a **Treatment**, not a `glow` or `zoom` atom.

## 2. TreatmentSpec contract

Every reproducible treatment must provide:

```ts
interface TreatmentSpec {
  id: string;
  status: "forensic-provisional" | "validated" | "catalog-approved";
  evidence: { videoId: string; timestamps: string[]; observationFile: string }[];
  narrativeFunctions: string[];
  inputSlots: {
    role: string;
    type: "text" | "image" | "video" | "screen" | "character" | "diagram" | "audio";
    required: boolean;
    constraints?: Record<string, unknown>;
  }[];
  component: string;                 // Remotion component id
  parameters: Record<string, unknown>;
  phases: {
    name: string;
    start: "relative" | "beat";
    duration: number | "content";
    properties: Record<string, unknown>;
  }[];
  textRoles: string[];
  audioCues: { event: string; sfx?: string; music?: string; duck?: number }[];
  assetRequirements: { kind: string; mode: "agent_generated" | "agent_orchestrated_external" | "human_gate"; provider?: string; required: boolean }[];
  agentCanGenerate: string[];
  agentOrchestratesExternal: string[];
  humanGate: string[];
  failureModes: string[];
  acceptanceChecks: string[];
}
```

### Why the contract is necessary

- `component` tells the agent what code to call or generate.
- `inputSlots` makes semantic content transfer explicit.
- `phases` captures choreography, not just an effect name.
- `textRoles` prevents cinematic subtitles, UI text, diagram labels and emphasis text becoming one generic overlay.
- `audioCues` keeps sound attached to narrative events.
- `assetRequirements` distinguishes code/asset generation, agent-orchestrated providers and the genuinely human-only gate. An external provider is not automatically a manual step.
- `humanGate` is reserved for approval/taste/licensing decisions, not ordinary asset creation or tool operation.
- `evidence` prevents a speculative technique from silently becoming a rule.

## 3. Provisional treatment contracts

### `audience-demand-proof`

Evidence: video 04 `00:05–00:20`; video 01 comments/metrics opening.

- Narrative function: establish demand, social proof, or audience pressure.
- Component: `AudienceDemandProof`.
- Input slots: `comment[]`, optional `channelMetric`, optional `hostReaction`.
- Phases:
  1. `isolated-comment`: one comment on black, large crop, hold for reading.
  2. `accumulate`: staggered comments with depth/blur/rotation; keep one readable focal comment.
  3. `context`: reveal dashboard/channel/thumbnail behind the comments.
  4. `response`: cut to host or next narrative state.
- Motion: stagger, scale/pan, perspective tilt, blur depth, focal hold. `glow` is only a style parameter inside a phase.
- Audio: click/pop per comment if audible; riser during accumulation; cut or whoosh into response.
- Agent can generate: comment cards, stacking, crop, blur, timing, text hierarchy, transitions.
- Agent orchestrates external: authentic comments, source UI screenshots, host/character art.
- Failure modes: unreadable text, every comment same scale, random stacking without narrative escalation, UI pasted flat.

### `screen-proof-in-world`

Evidence: video 04 `00:20`, `00:45`; video 02 browser/dashboard sections; video 05 tool UI.

- Narrative function: make a claim credible by showing the actual interface/process.
- Component: `ScreenProofInWorld`.
- Input slots: `screen` (Premiere/YouTube/browser/tool), optional `character`, optional `environment`.
- Phases: establish environment → reveal screen → highlight target → host/character reaction or zoom into evidence.
- Parameters: screen crop, perspective, device/frame, focus rect, camera scale, highlight color, blur background, letterbox.
- Audio: UI click for highlight; subtle whoosh on focus shift; no constant SFX.
- Agent can generate: screen frame, crop/mask, highlight, camera move, character overlay, text callout.
- Agent orchestrates external: actual screen recording/screenshot; believable UI source.
- Failure modes: raw screen recording full-frame; no focus target; highlight not synchronized with words; screen text too small.

### `semantic-diagram`

Evidence: video 02 hero journey ring; video 05 storyboard/prompt/reference diagrams; video 06 thumbnail logic.

- Narrative function: explain relationships, process, sequence, comparison, or mental model.
- Component: `SemanticDiagram`.
- Input slots: `nodes[]`, `edges[]`, `labels`, optional `centralSubject`, optional `exampleAsset`.
- Diagram variants: `journey-ring`, `process-graph`, `comparison-board`, `branching-map`, `timeline`.
- Phases: draw/introduce structure → reveal nodes in causal order → focus current node → zoom/example → return to whole structure.
- Parameters: node geometry, edge routing, reveal order, active node, blur inactive nodes, color semantics, camera zoom.
- Audio: tick per node/edge; riser before central reveal; impact only at important state change.
- Agent can generate: SVG nodes/edges, labels, reveal choreography, camera focus, layout constraints.
- Agent orchestrates external: bespoke icons/illustrations if not SVG primitives.
- Failure modes: nodes treated as independent cards; edge meaning lost; all nodes animate equally; diagram exists without mapping to spoken logic.

### `host-reflection-cinematic`

Evidence: video 03 `00:20–01:00`; video 04 `00:40–01:00`; video 01/02/07 recurring amber host world.

- Narrative function: vulnerability, doubt, identity turn, humor, or emotional explanation.
- Component: `HostReflectionShot`.
- Input slots: `character`, optional `environment`, `subtitle`, optional `prop`.
- Phases: establish/medium → close-up or profile → emotional hold → subtitle/response → exit/return.
- Parameters: shot scale, camera angle, focal point, light direction, rim light, grade, letterbox, subtitle style, subtle push-in.
- Audio: preserve intentional pause; music duck; sparse SFX or none; emotional beat should not be buried under effects.
- Agent can generate: camera crop, grade, letterbox, subtitle, push-in, light sweep if character asset supports it.
- Agent orchestrates external: consistent Isaac character/world assets; bespoke line-art or generated art.
- Failure modes: generic talking-head card; same shot every time; subtitles as UI boxes; excessive SFX during vulnerable line.

### `cinematic-metaphor`

Evidence: video 04 house/monitor/desk; video 03 books/audio props; video 01/07 film metaphors.

- Narrative function: turn an abstract idea into a memorable visual object/world.
- Component: `CinematicMetaphor`.
- Input slots: `metaphorAsset`, optional `character`, optional `prop`, `subtitle`.
- Phases: establish world → reveal metaphor object → camera/lighting emphasis → connect back to spoken concept.
- Parameters: asset treatment, line-art/film mode, grade, haze, practical lights, focal anchor, crop, subtitle role.
- Audio: music texture/transition; riser or impact only when metaphor resolves.
- Agent can generate: crop, grade, camera move, overlays, subtitles, compositing.
- Agent orchestrates external: metaphor asset or generated scene; character/world consistency.
- Failure modes: literal stock image with no semantic transformation; random cinematic clip; grade mismatch; metaphor not connected to line.

### `chapter-card`

Evidence: video 04 isolated words; video 02/06 large chapter typography; video 01/07 black-stage words.

- Narrative function: reset attention, name a phase, or create a beat boundary.
- Component: `ChapterCard`.
- Input slots: `title`, optional `subline`, optional `diagramMark`.
- Phases: black/negative-space hold → word reveal → optional scale/flash → cut to next treatment.
- Parameters: type family, size, alignment, accent color, reveal mode, hold duration, transition.
- Audio: short hit/whoosh only if boundary needs reinforcement.
- Agent can generate: all visual and timing code.
- Agent resolves/setup: font asset/brand token.
- Failure modes: used every few seconds; title carries no narrative function; decorative effects overpower word.

### `candidate-comparison`

Evidence: video 03 voice options; video 05 tool/output comparisons; video 06 thumbnail examples.

- Narrative function: show alternatives, failure, selection, or learning.
- Component: `CandidateComparison`.
- Input slots: `candidates[]`, `criteria[]`, `selectedIndex`, optional `hostReaction`.
- Phases: grid/stack introduce → candidates reveal → compare/mark → selected candidate emphasis → consequence.
- Parameters: grid geometry, labels, crop, selected border/glow, rejected blur/desaturate, timing order.
- Audio: ticks per candidate; impact/chime on selected result; optional comedic SFX for failure.
- Agent can generate: grid, labels, selection logic, transitions, comparison text.
- Agent orchestrates external: candidate media/results.
- Failure modes: gallery without decision; all candidates equally prominent; no spoken criterion; too much UI noise.

### `process-timeline`

Evidence: video 04 Premiere timeline; video 05 AI production timeline; video 03 voice-generation workflow.

- Narrative function: show work, progress, iteration, or technical credibility.
- Component: `ProcessTimeline`.
- Input slots: `steps[]`, `tracks[]`, `currentStep`, optional `beforeAfter`.
- Phases: full process overview → current step focus → action/progress → result/next step.
- Parameters: track colors, cursor position, active step, zoom, labels, waveform/thumbnail strip.
- Audio: UI ticks, subtle key sounds, riser at completion; music duck under explanation.
- Agent can generate: timeline/track visualization, labels, cursor animation, focus zoom.
- Agent orchestrates external: authentic timeline screenshot/recording when authenticity matters.
- Failure modes: fake timeline with no relation to actual process; too-small labels; no current-step focus.

## 4. Revised agent capability boundary

The earlier wording "requires assets or manual/external" was too conservative. With a prepared agent environment (providers, capture tools, background removal, image/video generation, compositing tools, skills, prompts, validation and feedback loops), the agent can autonomously create and orchestrate much more than pure Remotion code.

### Agent-generated in code / Remotion
- SVG diagrams, nodes, connectors, labels and reveal order.
- Screen-card crops, masks, focus rectangles, blur and camera transforms.
- Chapter cards, subtitles, text roles, letterbox.
- Shot sequencing and transition choreography.
- Camera push/scale/pan, image treatment, grade and overlay timing.
- Audio event scheduling, duck envelopes and deterministic mix.
- Candidate grids, analytics boards and timeline illustrations.

### Agent-orchestrated external generation/capture (no human operation required)
- Consistent Isaac character/line-art world generation through configured image models, reference images and character sheets.
- Authentic screenshots and screen recordings through browser/capture tools with deterministic source URLs and timestamps.
- Bespoke cinematic metaphors through image/video generation, compositing and iterative frame QA.
- Film/stock footage search, licensing metadata, download, trim and treatment through media tools.
- Background removal, image editing, upscaling, style matching, color treatment and asset variants.
- Voice, music and SFX generation/selection/mixing through configured providers.

### Human gate (the actual boundary)
- Approve or reject a generated creative direction when multiple candidates are semantically valid.
- Confirm licensing/brand/compliance decisions that cannot be delegated safely.
- Optional final taste approval for a new treatment; this is a product gate, not a required production step.

The agent must still declare every dependency and record provenance. It should not claim an asset exists when a provider failed, but it may autonomously resolve the dependency by calling the configured provider/tool and then validate the result.

## 5. Implementation order

1. Freeze these provisional treatment contracts as data, with evidence references.
2. Build `SemanticBeat`/`TreatmentSpec` types in the existing Remotion infrastructure (do not create a disconnected editor).
3. Implement two pure-code treatments first: `SemanticDiagram` and `ChapterCard`.
4. Implement `ScreenProofInWorld` and `HostReflectionShot` using a small real asset fixture.
5. Implement audio event scheduling and transcript alignment for the same fixtures.
6. Render a 30–60 second reference-like test and compare frame/audio maps.
7. Only then promote recurring treatments into the agent catalog.
