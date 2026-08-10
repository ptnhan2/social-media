# Skills Index — Project-Local

84 skills, 986 files. **Read the relevant SKILL.md before calling any tool.**

## By pipeline phase

### Phase 1 — Script
| Skill | File | When |
|---|---|---|
| humanizer | `skills/humanizer/SKILL.md` | Before script save — AI pattern detection + autofix |
| storytelling | mined → `libraries/03-script/skills.md` | Script structure, arc, hooks |

### Phase 2 — TTS
| Skill | File | When |
|---|---|---|
| elevenlabs | `skills/elevenlabs/SKILL.md` | Before TTS batch — voice params, delivery cues |
| text-to-speech | `skills/text-to-speech/SKILL.md` | General TTS guidance |
| doubao-tts | `skills/doubao-tts/SKILL.md` | Alternative TTS provider |

### Phase 2 — Assets
| Skill | File | When |
|---|---|---|
| flux-best-practices | `skills/flux-best-practices/SKILL.md` | Before AI image generation |
| bfl-api | `skills/bfl-api/SKILL.md` | BFL/FAL image API |
| video-download | `skills/video-download/SKILL.md` | Download reference videos |
| setup-api-key | `skills/setup-api-key/SKILL.md` | When configuring API keys |

### Phase 2 — Audio
| Skill | File | When |
|---|---|---|
| music | `skills/music/SKILL.md` | Music selection, licensing, mood |
| sound-effects | `skills/sound-effects/SKILL.md` | SFX placement, layering |
| acestep | `skills/acestep/SKILL.md` | AI music generation |
| lyria | `skills/lyria/SKILL.md` | Google Lyria music gen |

### Phase 2 — Compose
| Skill | File | When |
|---|---|---|
| remotion | `skills/remotion/SKILL.md` | Composition, spring, interpolate |
| remotion-best-practices | `skills/remotion-best-practices/SKILL.md` | Remotion patterns |
| ffmpeg | `skills/ffmpeg/SKILL.md` | Gate metrics, frame extract, audio detect |
| visual-style | `skills/visual-style/SKILL.md` | Design direction, palette, aesthetic |

### Phase 2 — Video Gen (if needed)
| Skill | File | When |
|---|---|---|
| ai-video-gen | `skills/ai-video-gen/SKILL.md` | General AI video guidance |
| seedance-2-0 | `skills/seedance-2-0/SKILL.md` | Seedance video gen |
| gemini-omni | `skills/gemini-omni/SKILL.md` | Gemini Omni video |
| kling-official | `skills/kling-official/SKILL.md` | Kling video/avatar |
| ltx2 | `skills/ltx2/SKILL.md` | LTX video (local) |
| grok-media | `skills/grok-media/SKILL.md` | Grok image/video |

### Phase 2 — Animation (if needed)
| Skill | File | When |
|---|---|---|
| gsap-core | `skills/gsap-core/SKILL.md` | GSAP timeline basics |
| gsap-plugins | `skills/gsap-plugins/SKILL.md` | SplitText, MorphSVG, DrawSVG |
| framer-motion | `skills/framer-motion/SKILL.md` | Disney 12 principles |
| lottie-bodymovin | `skills/lottie-bodymovin/SKILL.md` | Lottie export |
| manim-composer | `skills/manim-composer/SKILL.md` | Math animation |
| d3-viz | `skills/d3-viz/SKILL.md` | Data visualization |
| beautiful-mermaid | `skills/beautiful-mermaid/SKILL.md` | Mermaid diagrams |

### Phase 2 — Character (if needed)
| Skill | File | When |
|---|---|---|
| character-rigging | `skills/character-rigging/SKILL.md` | Bone rigs |
| svg-character-animation | `skills/svg-character-animation/SKILL.md` | SVG character motion |
| pose-library-design | `skills/pose-library-design/SKILL.md` | Pose libraries |

### Phase 2 — Enhancement
| Skill | File | When |
|---|---|---|
| media-use | `skills/media-use/SKILL.md` | Media asset resolution |
| motion-graphics | `skills/motion-graphics/SKILL.md` | Motion design principles |

### Phase 3 — Repurpose
| Skill | File | When |
|---|---|---|
| speech-to-text | `skills/speech-to-text/SKILL.md` | Whisper transcription |
| azure-speech-to-text | `skills/azure-speech-to-text/SKILL.md` | Azure STT (cloud) |
| video-edit | `skills/video-edit/SKILL.md` | Trimming, cutting |
| video-toolkit | `skills/video-toolkit/SKILL.md` | Video manipulation |
| video-understand | `skills/video-understand/SKILL.md` | Video content analysis |

### 3D (if needed)
| Skill | File | When |
|---|---|---|
| threejs-fundamentals | `skills/threejs-fundamentals/SKILL.md` | Three.js basics |
| threejs-animation | `skills/threejs-animation/SKILL.md` | 3D animation |
| threejs-geometry ... | `skills/threejs-*.SKILL.md` (10 files) | 3D sub-topics |

### Other
| Skill | File | When |
|---|---|---|
| synthetic-screen-recording | `skills/synthetic-screen-recording/SKILL.md` | Terminal/UI demos |
| playwright-recording | `skills/playwright-recording/SKILL.md` | Browser flow capture |
| canvas-procedural-animation | `skills/canvas-procedural-animation/SKILL.md` | Canvas animation |
| comfyui | `skills/comfyui/SKILL.md` | ComfyUI integration |
| agents | `skills/agents/SKILL.md` | Agent configuration |

## How to use

```
Before calling elevenlabs_tts → read skills/elevenlabs/SKILL.md
Before composing in Remotion → read skills/remotion/SKILL.md
Before running gate → read skills/ffmpeg/SKILL.md
Before humanize → run skills/humanizer/src/cli.js
```

**Rule**: AGENT_GUIDE.md §"Skills" mandates reading the relevant skill before calling any tool. AGENTS.md §"Essential Rules" item 10 enforces this.
