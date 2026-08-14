# Mined Skills — 07-repurpose

> Knowledge curated for the current production pipeline (2026-08-12).
> Source: skills/ (164 files mined, 3 relevant to this branch).

## explainer/publish-director
**Summary:** Prepares distribution: SEO metadata (title/description/tags/hashtags), thumbnail concept, chapter markers from script sections, and a deterministic export bundle. Metadata must be specific and platform-fit — generic titles and missing chapters are the top failure modes.
**Rules we should adopt:**
- Title ≤60 chars, lead with hook or number, primary keyword from proposal, avoid clickbait but be compelling.
- Description: first 150 chars critical (shown in search); opening line restates hook + value proposition; body covers key topics with natural keywords; chapters as timestamp markers from script sections; CTA at end; resource links.
- Tags: 5-10 specific, mix broad + specific; include topic + format ("explainer") + related terms. Hashtags 3-5, mix trending + niche.
- Thumbnail concept: playbook style, core concept visually, 3-5 words of text (hook or key stat), high contrast, readable small, accent colors for text.
- Chapters from script sections' start_seconds; YouTube rewards chapters.
- Pitfalls: "Video About X" loses to "X Explained in 60 Seconds"; keyword stuffing (humans first, SEO second); forgetting CTA; platform-specific format differences.
**What we already do differently:**
- Our Phase 3 repurpose set (X thread, newsletter, blog, Reddit, shorts) is broader than this packaging step. The thumbnail-concept + chapter-marker + metadata discipline maps to our publish step for future videos.

---

# LONGFORM-EDUCATIONAL PIPELINE

## longform-educational/publish-director
**Summary:** Longform metadata must signal value AND length; chapter timestamps in the description are MANDATORY (YouTube rewards them heavily, and 10-15 min video is unwatchable without navigation). Tags get more room (8-12, broad + per-chapter subtopic + longtail); thumbnail signals a deep-dive.
**Rules we should adopt:**
- Title signals value + length: "X: The Complete Guide (12 min)" / "Why X Actually Happens — Full Breakdown"; don't clickbait a 15-min video with a 60s-video title.
- Chapter timestamps in description from `script.metadata.chapters[]` (map start_seconds) — the #1 longform metadata miss.
- Tags 8-12: umbrella topic + each major chapter subtopic + format tags ("longform", "documentary", "educational").
- Thumbnail: clear value proposition ("The FULL Story", "10 min deep dive"), chapter-count hint or breadth signal.
- Export bundle passes chapters, description with timestamps, full-video SRT, longform thumbnail concept.
**What we already do differently:**
- Our Phase 3 is repurpose-first (X/blog/Reddit/shorts). Chapter-timestamp discipline applies when we publish longform videos.

---

# ANIMATION PIPELINE

## animation/publish-director
**Summary:** Packaging must match the actual animation mode: diagram-heavy videos package structured/legible, kinetic-type pieces package around copy, illustrative animation packages around hero imagery. Preserves visual-system truth (animation_mode, hero_frame_notes, thumbnail concept) in publish metadata so the thumbnail matches final frames.
**Rules we should adopt:**
- Match packaging to animation mode (structured for diagrams, copy-led for kinetic type, hero-image-led for illustration).
- Store in publish_log.metadata: animation_mode, hero_frame_notes, thumbnail_concept, platform_notes.
- Thumbnail concept must match the final visual system — generic metadata ignoring animation style and thumbnails unrelated to final frames are failures.
- Exports labeled by purpose and platform; package usable without extra manual work.
**What we already do differently:**
- Repurposed packaging must preserve the source beat/slice meaning and use the Composer's persisted captions, audio, and provenance metadata.

---

# CROSS-PIPELINE TAKEAWAYS (highest-value adoptions for our pipeline)

1. **Post-render audio transcription check** (explainer compose): transcribe the RENDERED file, not the source — 0 words = silent video, <80% script words = cut off. Our gate checks audibility, not narration coverage.
2. **Sample-preview approval loop** (asset directors): one TTS + one image + one music sample approved before batch generation (~$0.03-0.08 to prevent $1-3 waste). Prevents our per-sentence TTS batch from burning money on a rejected voice.
3. **CHAI 3-pass prompt self-review** (asset director): pre-caption → 5-aspect critique → post-caption, logged as a triplet. Directly improves our Pixabay/rembg/generated-asset prompting.
4. **Voice identity locked once, identical everywhere** (longform): single provider_settings object on every TTS call, verified programmatically. Scales our per-sentence TTS to multi-chapter videos.
5. **Segment isolation = chapter isolation** (longform): render per segment, re-render ONLY affected segments, log rerenders; full re-render requires explicit approval. Scales our 30s-draft discipline to longform.
6. **Proposal-time honesty**: preflight tools before promising, itemized costs with budget cap + headroom, tradeoff matrices, explicit music plan, never silently downgrade. Mirrors our framework USER gate philosophy.
7. **5-aspect scene checklist + explicit N/A** (scene directors): Subject/Motion/Scene/Framing/Camera, overlays separate, silent omission = defect. Feeds our layout/variant development and gate.
8. **Motion minimums per chapter/segment** (scene directors): ≥2 motion scenes + ≥2 distinct techniques per unit, ≤60% static cuts, no hold >6s — prevents slideshow output at any length.
9. **AI text hallucination rule**: never generate images where text must be verbatim (CTA/names/legal) — render exact text natively (text_card/Remotion). Already partially covered by our text layouts.
10. **Animation mode classification + reuse strategy** (animation pipeline): classify mode, decide tool path early, define recurring motifs/layout/transition/typography — the blueprint for expanding `04-visual/` beyond current layouts.
