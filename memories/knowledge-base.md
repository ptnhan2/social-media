### Experiment: chapter-card.reveal.inDurationSec 0.45 → 0.3
- Date: 2025-06-18
- Segment: isaacverse-final 0-3.5s (chapter-card treatment)
- Pixel-diff gate: max mean=1.054 (PASS)
- Pairwise verdict: ORACLE UNAVAILABLE (control call failed due to VLM API timeout)
- Keep gate: NOT CALLED (oracle unavailable)
- Result: REVERTED (oracle unavailable - fail-safe)
- Learning: The change reached the render successfully, but VLM oracle failed due to timeout. In future cycles, need to retry when oracle is available. The pacing improvement attempt (faster fade-in) showed promise but cannot be confirmed without proper oracle validation.