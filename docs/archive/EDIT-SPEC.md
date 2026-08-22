# Edit Spec: IsaacVerse Composer

## Purpose

`EditDoc` is the render contract consumed by Remotion. It is not a spatial
layout registry. A video is an ordered set of semantic beats, scenes, shots,
assets, motion phases, audio cues, transitions, and a color-grade plan.
The Composer also persists an `EditorDoc` timeline projection. `EditorDoc` is
the non-linear editing surface: it owns tracks, clip ranges, playhead-oriented
operations, track state, and editor revisions while preserving source IDs back
to `EditDoc`.

## Canonical Model

```ts
type IsaacVerseEditDoc = {
  id: string;
  videoId?: string;
  version?: string;
  width: number;
  height: number;
  fps: number;
  beats: SemanticBeat[];
  scenes?: SemanticScene[];
  shots?: SemanticShot[];
  assets?: AssetRef[];
  audioPlan?: AudioPlan;
  transitions?: EditTransition[];
  colorGrade?: ColorGradePlan;
};

type SemanticBeat = {
  id: string;
  sceneId?: string;
  shotIds?: string[];
  journeySlot: string;
  startSec: number;
  durationSec: number;
  transcript: string;
  narrativeFunction: string;
  treatment: TreatmentInstance;
  elements?: SemanticElement[];
  motionPhases?: MotionPhase[];
  audioCues: AudioCue[];
  voiceSegment?: { src: string; startSec: number; endSec: number };
};
```

Source: `remotion-composer/shared/isaacverse/types.ts`.

Editor surface: `remotion-composer/shared/isaacverse/editor.ts` and
`remotion-composer/shared/isaacverse/editorProjection.ts`.

Track rules:

- A primary timeline row must be non-empty and source-bound; empty phantom rows
  are rejected by `validateEditorDoc`.
- Visual rows accept image/video sources, expose canvas/fit/trim/split behavior,
  and do not expose audio-only controls.
- Text rows accept generated text or text assets, expose timing/style behavior,
  and remain separate from visual media rows.
- Audio rows accept audio sources, expose waveform/trim/gain/fade/mute/solo,
  and never expose canvas geometry controls.
- Uploaded/project assets are the source registry for asset-bound tracks. A
  track cannot be created with an unknown asset ID.
- Beats, shots, motion phases, and transitions are markers or edit-point context,
  not duplicate primary timeline clips.

## Renderer

```text
ProjectLoader
  → IsaacVerseEditVideo
    → optional EditorDoc timeline ranges and audio overrides
    → AudioMixer
    → Sequence per EditorDoc video clip when present
      → SemanticBeat source treatment
    → fallback Sequence per SemanticBeat
      → semantic treatment component
      → BeatCamera motion phases
      → semantic element override layer
    → transition sequences
    → color grade
```

Files:

- `remotion-composer/shared/isaacverse/ProjectLoader.tsx`
- `remotion-composer/shared/isaacverse/EditVideo.tsx`
- `remotion-composer/shared/isaacverse/treatments.tsx`
- `remotion-composer/shared/isaacverse/audio.tsx`
- `remotion-composer/shared/isaacverse/assemble.ts`

## Composer Review Model

The user-facing review unit is `ReviewSlice`, not necessarily a whole beat.
Slices derive from:

- beat narrative range;
- shot range;
- motion phase;
- semantic element;
- voice segment;
- music range;
- SFX/audio event;
- transition;
- custom range.

Each slice carries a stable target, exact start/end seconds, supported
modalities, transcript context, and review status. The Composer uses the same
`EditDoc` and patch contract as the renderer.

## Live Editing

The Composer uses Remotion `Player` for real-time browser preview. It supports:

- full-video playback;
- beat/context in/out playback;
- timeline seeking and zoom;
- editable track rows with source-linked clip blocks;
- playhead keyboard stepping;
- trim preview for beat/element clips;
- split and ripple operations persisted as `EditorDoc` revisions;
- mute, solo, lock, hide, reorder, and undo/redo for editor tracks;
- audio waveform, gain, fade, and mute controls;
- transition type/duration controls;
- direct semantic canvas editing;
- voice/music/visual/text/SFX tracks;
- patch preview without MP4 encoding.

## Workspace Shell

The Composer presents one conventional video-editor workspace rather than a
review dashboard:

- a compact project toolbar stays at the top;
- the live 16:9 Remotion preview and the fixed bottom timeline share one
  viewport, with no page scroll on desktop or mobile;
- scenes remain available as a compact left rail on wide screens;
- the inspector is a separately scrollable selection panel and never pushes the
  timeline below the workspace;
- `Fix` and `Ask agent` are available beside the current selection, while
  review context, batch actions, chat, inbox, and version history stay behind
  collapsed details;
- direct canvas editing overlays the live preview instead of replacing the
  editor workspace with a second page.

`render-window.mjs` is reserved for evidence clips after a live preview is
accepted. Full master render is the final export step.

## Patches

All edits use canonical `EditPatch` operations:

- `updateBeat`;
- `replaceTreatment`;
- `addElement`;
- `addAsset`;
- `updateElement`;
- `replaceAsset`;
- `updateAudioCue`;
- `removeAudioCue`.

Duration changes carry cascade metadata and reflow downstream beat/transition
timing. Apply and rollback are versioned and persisted by the project store.

## AI Handoff

The Composer does not embed a second LLM backend in phase one. It writes a
structured `FeedbackRequest` and prompt into:

```text
projects/<slug>/feedback/inbox/
```

The current Kilo session reads the request through `/review-pending`, writes a
diagnosis/patch/evidence result, and Composer polls the result. Direct browser
injection into a Kilo conversation is not assumed without a verified API.

## Quality Boundary

- Browser Player preview checks live motion and audio interaction.
- Affected-window render checks encoded before/after evidence.
- Structural/media QA checks the project and artifact.
- Human approval decides taste, story support, licensing, and compliance.
