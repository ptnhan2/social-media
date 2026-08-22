# IsaacVerse Audio Design

> Design trước implementation. Mục tiêu là tái tạo audio choreography quan sát được ở video 03/04, không biến audio thành một danh sách SFX gắn máy móc vào element.

## 1. Audio model

Audio được tổ chức thành bốn bus:

```text
VOICE      — narration, pauses, emphasis, per-segment takes
MUSIC      — continuous bed, section density, ducking under voice
SFX        — event cues tied to visual/narrative events
AMBIENCE   — room tone, world texture, optional cinematic bed
```

`Element` có thể phát sinh một event, nhưng SFX decision thuộc **beat/treatment audio plan**, không mặc định mỗi element một sound. Một scene có 20 elements không được tự động thành 20 tiếng click.

## 2. Runtime data contract

```ts
type AudioDensity = "sparse" | "normal" | "dense";
type AudioReason =
  | "hook"
  | "pause"
  | "transition"
  | "build"
  | "reveal"
  | "emphasis"
  | "ui"
  | "comedy"
  | "world";

interface VoiceSegment {
  id: string;
  src: string;
  startSec: number;
  endSec: number;
  transcript: string;
  pauseBeforeSec?: number;
  emphasisWords?: string[];
}

interface MusicBed {
  id: string;
  src: string;
  startSec: number;
  endSec: number;
  gainDb: number;
  bpm?: number;
  beatGrid?: number[];
  density: AudioDensity;
}

interface SfxCue {
  id: string;
  src: string;
  atSec: number;
  durationSec?: number;
  gainDb: number;
  reason: AudioReason;
  anchor?: string; // treatment event or element/beat id
  fadeInSec?: number;
  fadeOutSec?: number;
}

interface DuckZone {
  startSec: number;
  endSec: number;
  bus: "music" | "ambience";
  gainDb: number;
  attackSec: number;
  releaseSec: number;
}

interface BeatAudioPlan {
  beatId: string;
  density: AudioDensity;
  voice?: VoiceSegment;
  sfx: SfxCue[];
  duckZones: DuckZone[];
  preservePauses: boolean;
}

interface AudioPlan {
  voice: VoiceSegment[];
  music: MusicBed[];
  ambience: MusicBed[];
  beats: BeatAudioPlan[];
  master: {
    targetLufs?: number;
    maxTruePeakDbfs?: number;
    limiter: boolean;
  };
}
```

Store gains in dB in the JSON contract. Convert to Remotion's `0..1` volume values only in the renderer. This makes review and agent reasoning understandable.

## 3. Density choreography

The audit shows section-level density changes:

```text
hook                  → dense
comedic exchange       → sparse / pause room
explanation            → normal
build                  → rising density
reveal/emphasis        → dense transient event
reflection             → sparse, voice-forward
transition             → short event burst
```

The agent assigns density to a beat before choosing individual cues. Density is a budget, not a cue count:

- `sparse`: voice + bed, no automatic SFX unless semantically necessary;
- `normal`: one or two event cues where the visual changes;
- `dense`: layered transient/texture allowed, but still capped by overlap and loudness checks.

## 4. Event rules

| Event | Default sound behavior | Do not do |
|---|---|---|
| `hook` | music/texture can enter with one controlled accent | do not stack three loud hits on the first sentence |
| `pause` | preserve silence or reduce bed | do not fill every pause with a whoosh |
| `transition` | short whoosh or designed transition sound | do not use the same whoosh at every cut |
| `build` | riser or increasing bed energy | do not place impact before the reveal |
| `reveal` | impact/chime only when the visual/state changes | do not attach impact to every text entrance |
| `emphasis` | short accent, often paired with TextPop/diagram focus | do not overpower the narration |
| `ui` | click/keyboard/switch sounds when a UI action is visible | do not use UI SFX for abstract concepts |
| `comedy` | selected meme/stop/pop cue | do not make every joke a meme sound |
| `world` | ambience/room texture, optional | do not turn ambience into a constant music bed |

## 5. Mix rules

- VO is the anchor. Music and ambience duck around active narration and recover after a short release.
- A pause marked by the script/voice plan is intentional content, not dead air.
- SFX are placed after the visual treatment is timed, not before.
- SFX can overlap visually but must not mask the first consonants of the next VO phrase.
- Mix is normalized after assembly using `ebur128`/loudnorm evidence; no arbitrary “volume = 0.12” as the only rule.
- The preview must expose bus solo/mute: VO only, music only, SFX only, full mix.

## 6. Agent workflow

```text
transcript + beat treatment
→ identify events and pauses
→ assign density budget
→ retrieve/generate music and SFX candidates
→ schedule cues against visual phases
→ create duck zones
→ validate overlaps and loudness
→ render review window
→ show waveform + cue markers + before/after
```

The agent can orchestrate external audio providers, generate SFX/music, normalize them and retry failed assets. A human gate is only needed for approval, licensing and taste when candidates are equally valid.

## 7. Remotion implementation boundary

- Use `Audio` from `@remotion/media`.
- Delay tracks with `Sequence`.
- Trim voice segments with frame-based `trimBefore`/`trimAfter` or pre-trimmed assets.
- Use frame-driven `volume` callbacks for duck curves.
- Keep all audio assets frozen before rendering; never generate audio inside a render frame.
- Render a local review window before a master render.
- The editor UI displays waveform, voice transcript, music bed, SFX markers and duck zones on the same timeline.

## 8. Validation

Audio pass fails when:

- VO is masked by music/SFX;
- SFX density exceeds the beat budget;
- a cue has no corresponding visual/narrative event;
- intentional pauses are removed;
- music does not recover after voice;
- true peak/loudness exceeds the project target;
- the same SFX pattern repeats mechanically across adjacent beats.

## 9. Next implementation step

Implement `AudioPlan` types + `AudioMixer`/`BeatAudio` renderer with a fixture containing:

- one voice segment;
- one continuous music bed;
- one sparse pause;
- one transition whoosh;
- one reveal impact;
- one duck zone;
- waveform/cue markers for UI review.

Do not add a large SFX catalog until this fixture passes the audio review loop.
