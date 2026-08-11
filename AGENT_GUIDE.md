# AGENT_GUIDE.md — IsaacVerse Production Guide

## Mission

Build an agent-operated video production system that can reproduce the quality grammar observed in IsaacVerse:

- story-driven hero journey;
- humanized AI voice;
- semantic visual treatments;
- cinematic host/world continuity;
- UI and metric proof staged as scenes;
- disciplined motion and transitions;
- sound design as a primary layer;
- anti-soulless value guardrail.

Vox is not an alternate style. It is retired from the active pipeline.

The local acceptance project is `projects/isaacverse-final/`. Its persisted state,
master render, QA reports, patch history, and publish dry-run are the reference
for continuing this pipeline. Read `docs/FINAL-RUNBOOK-ISAACVERSE.md` before
resuming work.

## Read First

1. `AGENTS.md`
2. `docs/PIPELINE-ISAACVERSE.md`
3. `docs/GAP-B-RESOLUTION.md`
4. `research/isaacverse/SYSTEM-SPEC.md`
5. `research/isaacverse/FORENSIC-GRAMMAR.md`
6. `research/isaacverse/REPLICATION-SPEC.md`
7. `skills/INDEX.md`
8. `libraries/README.md`

## Canonical Architecture

```text
VideoDoc
  → SemanticBeat[]
    → SemanticTreatment
      → asset orchestration
        → Remotion EditVideo timeline
          → AudioPlan / AudioMixer
            → quality gate
              → Composer review + patch loop
```

### VideoDoc

The story contract. It contains idea, common goal, surface problem, deeper problem, audience avatars, transformation, grand-story link and journey beats.

### SemanticBeat

The smallest narrative production unit. It contains transcript, journey slot, duration, narrative function, treatment instance, assets, voice segment and audio cues.

### SemanticTreatment

A complete shot sequence such as `audience-demand-proof`, `screen-proof-in-world`, `semantic-diagram`, `host-reflection-cinematic`, `cinematic-metaphor`, `candidate-comparison` or `process-timeline`.

It is not a layout card and not an isolated effect. It exposes:

- semantic purpose;
- input slots;
- shot phases;
- text roles;
- motion choreography;
- audio cues;
- asset requirements;
- agent capability boundary;
- failure modes;
- acceptance checks.

## Production Phases

### Phase 0 — Reference Forensics

Download source references. Extract transcript, frames, cuts, waveform and spectrogram. Align visual changes to spoken meaning. Classify editorial cuts, flash transitions, held-shot animation and camera changes.

Do not promote a treatment from a generic visual impression. Store evidence in `research/isaacverse/forensics/`.

### Phase 1 — Story / VideoDoc

Run the IsaacVerse script process:

1. idea/outlier;
2. common goal;
3. surface + deeper problem;
4. thumbnail promise;
5. audience avatars;
6. research gap;
7. outline and transformation;
8. hero's journey;
9. grand-story link;
10. draft;
11. simple-to-complex, but/therefore, rhythm, viewer deduction and edit notes;
12. AI roast outline, never generic AI rewrite;
13. refine.

### Phase 2 — Voice

Generate short sentence batches, create multiple takes, select/chop/combine natural sections, apply EQ and prepare dubbing stems. Store sentence-level timing as source of truth.

### Phase 3 — Asset Orchestration

The agent may autonomously call configured providers for:

- character and line-art consistency;
- screenshots and browser capture;
- image/video generation;
- footage search/download/trim;
- background removal and image editing;
- music, SFX and voice;
- provenance and licensing metadata.

Do not call this manual work merely because a provider is external.

### Phase 4 — Treatment Planning

For every beat:

1. identify narrative function;
2. retrieve relevant treatment candidates;
3. validate input slots;
4. resolve/generate assets;
5. assign shot phases, text roles, motion and audio density;
6. produce `SemanticBeat`.

Retrieve by semantic purpose and constraints. Do not expose a giant undifferentiated catalog to the agent.

### Phase 5 — Edit Assembly

Build `EditDoc` from beats:

- VO defines timing;
- music is placed early and beat grid is detected;
- assets are layered by semantic treatment;
- transitions connect visual worlds;
- focus point is preserved across cuts;
- text roles remain distinct;
- motion follows treatment phases;
- color grade is applied as a controlled pass;
- intentional pauses remain.

### Phase 6 — Audio

Use `AudioPlan` and `AudioMixer`:

- VO anchor;
- music bed with duck zones;
- SFX on narrative events;
- ambience only when it supports the world;
- density budget per beat;
- loudness/true-peak validation;
- solo/mute bus review in Composer.

### Phase 7 — Thumbnail / Dubbing / Publish

Thumbnail uses rule-of-thirds, channel palette, controlled type combinations and homepage-scale validation. Dubbing uses separated VO and music/SFX stems, re-aligns timing and uploads audio tracks.

### Phase 8 — Quality Gate

Check:

- story structure and transformation;
- deeper-problem setup/resolution;
- treatment matches transcript meaning;
- visual grammar and focal continuity;
- voice naturalness and pause/emphasis behavior;
- music/SFX density and ducking;
- pacing/space;
- anti-soulless value;
- thumbnail readability;
- asset provenance/compliance.

## Composer Feedback Loop

The Composer is UI-first, not chat-first:

```text
select beat/shot/element
→ choose feedback category or write note
→ agent diagnoses with frame/transcript/audio evidence
→ local patch
→ render affected window
→ before/after diff
→ apply or rollback
```

Only an explicit `Apply as future rule` promotes a local fix into a treatment rule.

## Validation Rules

- Every treatment has evidence references.
- Every treatment has a deterministic Remotion fixture.
- Every generated asset has provenance.
- Every beat has stable IDs.
- Every patch has a base version and rollback path.
- Every draft render is bounded to a review window.
- Never use a scene-global effect as a substitute for semantic beat planning.

## Active Code Locations

- `remotion-composer/shared/isaacverse/types.ts` — render-time beat contract.
- `remotion-composer/shared/isaacverse/treatments.tsx` — Remotion treatments.
- `remotion-composer/shared/isaacverse/EditVideo.tsx` — beat timeline resolver.
- `remotion-composer/shared/isaacverse/audio.tsx` — AudioPlan/AudioMixer.
- `remotion-composer/projects/isaacverse/` — fixture compositions.
- `docs/FEEDBACK-UI-SPEC.md` — Composer review/auto-fix UI.
- `research/isaacverse/` — reference evidence and forensic maps.

## Retired

Do not use as active guidance:

- `docs/vox-pipeline/`;
- `gate_vox.py`;
- `shared/primitives.tsx` Vox primitives;
- legacy spatial layout components and variant-pool workflow;
- raw popularity or use count as the primary creative selection mechanism.
