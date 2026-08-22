# Gap B resolution — from layout library to semantic edit grammar

> Resolution grounded in the IsaacVerse 8-video forensic pass. This replaces the naive model `spatial layout → preview → vote → reuse`.

## 1. The old model is retired

The old idea was:

```text
layout = positions of image + text
→ preview many layouts
→ rate good/bad
→ reuse layout and avoid repetition with use_count
```

This is not the right production unit for IsaacVerse-quality video. The reference videos repeatedly transform the same semantic content through different shot worlds:

```text
comment → UI proof → montage → monitor prop → character reaction → cinematic metaphor
```

The meaningful reusable unit is the **semantic transformation sequence**, not a rectangle arrangement or isolated effect.

## 2. New hierarchy

```text
BrandWorld
  → NarrativeTemplate
    → SemanticTreatment
      → ShotPhases
        → Primitive motion/text/audio
          → Resolved/generated assets
            → Rendered beat
```

### BrandWorld

Global continuity rules:

- black/near-black presentation field;
- amber Isaac line-art/character world;
- subtitle grammar;
- typography families;
- lighting/grade vocabulary;
- audio density principles;
- anti-soulless rules.

BrandWorld is not a fixed visual layout. It is the visual/audio language that lets different compositions feel like the same channel.

### NarrativeTemplate

Story and format structure:

- Hero's Journey 12 slots;
- tutorial format;
- process breakdown format;
- experiment/failure format;
- thumbnail/voice/edit tutorial format;
- grand-story continuity.

NarrativeTemplate defines what the beat must accomplish, not how many pixels each element receives.

### SemanticTreatment

A complete shot treatment with a narrative purpose, for example:

- `audience-demand-proof`;
- `screen-proof-in-world`;
- `semantic-diagram`;
- `host-reflection-cinematic`;
- `cinematic-metaphor`;
- `candidate-comparison`;
- `process-timeline`;
- `chapter-card`.

Each treatment defines:

- input roles;
- shot sequence/phases;
- framing and focal behavior;
- text roles;
- lighting/grade/world;
- motion choreography;
- audio events/density;
- asset requirements;
- agent generation/orchestration capability;
- failure modes and acceptance checks.

### Primitive

Primitives are implementation details inside a treatment:

- glow;
- blur;
- zoom;
- pan;
- TextPop;
- typewriter;
- trim path;
- whoosh;
- impact.

Primitives are not surfaced as the main creative catalog. A treatment can use them, but `glow` alone has no narrative meaning.

## 3. New AI workflow

```text
Transcript + story beat
→ narrative function
→ retrieve SemanticTreatment candidates
→ check required asset roles
→ agent generates/resolves assets
→ fill treatment parameters
→ compose ShotPhases
→ schedule VO/music/SFX
→ render
→ vision/audio QA
→ local patch or candidate ranking
```

The agent retrieves treatments by meaning and constraints:

- “show audience demand” → `audience-demand-proof`;
- “explain a relationship” → `semantic-diagram`;
- “show the actual tool/process” → `screen-proof-in-world`;
- “admit uncertainty / identity turn” → `host-reflection-cinematic`;
- “make an abstract idea memorable” → `cinematic-metaphor`.

## 4. What replaces `use_count`

`use_count` on spatial layouts is no longer the primary signal. Track treatment-level evidence instead:

```text
TreatmentUsage {
  treatmentId,
  narrativeFunction,
  videoId,
  beatId,
  accepted,
  rejected,
  revisionCount,
  failureTags,
  qualityGateResult,
  userFeedbackTags
}
```

Variety is controlled by:

- no identical treatment in adjacent beats unless intentionally repeated;
- avoid same treatment family in consecutive videos when alternatives exist;
- diversify visual worlds and evidence modes;
- preserve brand continuity while varying composition;
- rank by contextual acceptance and revision history, not raw popularity.

## 5. Treatment catalog and Composer

The old spatial layout gallery is removed. The treatment catalog is an internal
agent-readable library, while the user-facing production surface is the single
IsaacVerse Composer:

- review a semantic treatment in context;
- preview its phases and audio cues;
- inspect required asset slots;
- edit parameters;
- compare candidates;
- approve/reject treatment variants;
- record evidence and failure tags;
- expose an agent-readable treatment contract.

The production Composer uses the approved treatment contracts inside a
multi-scene live timeline and its embedded semantic canvas editor.

## 6. What remains reusable

- Canvas/element model for visual objects within a shot;
- Remotion renderer and deterministic fixture tests;
- semantic treatment components;
- asset orchestration tools;
- AudioPlan/AudioMixer;
- feedback UI and surgical patch system;
- quality gate and version history.

What is retired is the assumption that these reusable objects should be called spatial layouts.

## 7. Decision boundary

Do not promote a treatment into the production registry until:

1. it appears in at least two reference contexts or has an explicit intentional uniqueness reason;
2. its narrative purpose is documented;
3. its shot phases can be represented in code/data;
4. its assets can be generated/resolved by the configured agent environment;
5. its audio cues are specified;
6. a Remotion fixture renders deterministically;
7. the treatment has visual/audio acceptance checks.

This is the resolution of Gap B. The next implementation work is no longer “build more layouts”; it is to turn validated SemanticTreatments into an agent-resolvable registry and then build the Composer around beats and treatments.
