# Composer Feedback UI — segment review and auto-fix

> UI-first feedback loop. Chat is optional; the user must not remember IDs, timestamps, or context.

## 1. Main workspace

The Composer displays the full video as reviewable units:

```text
Video overview
├── Scene 01
│   ├── Beat 01  [thumbnail] [transcript] [treatment] [motion] [SFX]
│   ├── Beat 02  [thumbnail] [transcript] [treatment] [motion] [SFX]
│   └── Beat 03  [thumbnail] [transcript] [treatment] [motion] [SFX]
├── Transition
└── Scene 02
```

Each beat card shows:

- start/end time;
- thumbnail or frame strip;
- transcript text;
- narrative role;
- treatment name;
- asset slots;
- motion phases;
- SFX/music cues;
- QA status;
- existing comments and revision count.

Clicking a card seeks the player to that segment and selects the corresponding timeline range. Clicking a frame or element anchors feedback to the exact time/element.

## 2. Feedback controls

The user can select a beat/shot/element and choose:

- Too busy;
- Too slow;
- Wrong visual for the sentence;
- Weak transition;
- Motion too strong;
- Motion too flat;
- Text unreadable;
- Wrong typography;
- SFX too loud;
- SFX missing;
- Music covers voice;
- Asset feels generic;
- Does not feel cinematic;
- Does not support the story;
- Custom note.

The UI captures the target automatically. The user never needs to type `beatId`, timestamp, treatment ID, or element ID.

## 3. Fix actions

### Fix this segment

Agent only changes the selected beat/shot/element. It keeps the rest of the video immutable.

Flow:

```text
selected segment
→ inspect frames + transcript + audio
→ diagnose root cause
→ generate local patch
→ render affected window at draft quality
→ show before/after
→ Apply or Rollback
```

### Try alternatives

Agent generates 2–3 local candidates using different treatments/assets, then displays them side-by-side. User selects one; unselected candidates are discarded.

### Fix all similar

Only available after an explicit user action. Agent finds beats with the same treatment/failure signature, generates a batch preview, and applies only after approval.

### Apply as future rule

Promotes a correction into a treatment or style rule. A single local correction must never silently mutate the global catalog.

## 4. Persisted feedback state

```ts
interface FeedbackRecord {
  id: string;
  videoId: string;
  version: string;
  scope: "element" | "shot" | "beat" | "scene" | "audio" | "video";
  target: { beatId?: string; shotId?: string; elementId?: string; startSec: number; endSec: number };
  category: string;
  note?: string;
  diagnosis?: string;
  patchId?: string;
  status: "open" | "previewed" | "applied" | "rejected" | "rolled_back";
  applyScope: "this_instance" | "similar_instances" | "future_rule";
  createdAt: string;
}
```

Saved project state:

```text
projects/<slug>/
├── edit/current.json
├── edit/versions/v001.json
├── feedback/feedback-001.json
├── patches/patch-001.json
├── renders/draft-window-001.mp4
└── qa/diagnosis-001.json
```

## 5. UI layout

- Top: video player with current segment marker and before/after toggle.
- Center: beat/shot timeline with thumbnails, transcript and audio waveform.
- Right: selected segment inspector and feedback panel.
- Bottom: full tracks for VO, music, visual, text, SFX and overlays.
- Optional agent chat: operates on the current selection, so context is already known.

## 6. Agent contract

The UI calls structured operations, not a free-form rebuild:

```text
inspect_segment
diagnose_feedback
patch_beat
replace_treatment
replace_asset
update_motion_phase
update_audio_cue
render_preview_window
compare_preview
apply_patch
rollback_patch
promote_feedback_rule
```

The renderer consumes the same `IsaacVerseEditDoc` and `SemanticBeat` contract used for agent generation. The UI and agent therefore edit the same state rather than maintaining separate representations.

## 7. Build order

1. Persist stable `videoId`, `sceneId`, `beatId`, `shotId`, `elementId`.
2. Render beat cards from `IsaacVerseEditDoc`.
3. Add timeline seeking and frame/element anchoring.
4. Add feedback records and patch preview.
5. Add local-window render and before/after diff.
6. Add Apply/Rollback and version history.
7. Add direct Canva-style canvas editing on the selected beat.
8. Add optional chat scoped to current selection.
