# Vox Style — Concrete Implementation Guide (research 2026-08-03)

> Source of truth for the VOX look, distilled from concrete guides (not thumbnails):
> 1) vox-director prompt-guide + local-engine (https://github.com/Alisa0808/vox-director)
> 2) PremiumBeat "5 Breakdowns on Replicating the VOX Motion Graphic Look" (2021-03-08)
> 3) Vox transcripts + Storybench producer interview (rounded frames, 2.5D, texture-first)
> Applies to the vox pipeline (Remotion engine). Every rule below is actionable in code.

## A. The common Vox constraints (NEVER drop these)
torn/scissor-cut paper edges · tape · halftone dots · newspaper clippings · paper-stencil
shapes · real paper drop-shadows · **bold flat color** · PRINTED/illustrated cut-outs ·
**NOT 3D / NOT CGI / NOT photoreal** · keep print grain · headline text baked in "quotes".

## B. Image / scene structure (5 parts per beat)
1. STYLE BLOCK — identical every beat (paper collage, torn edges, halftone, grain)
2. SCENE as SEPARATE cut-out pieces — each with clear edges + its own drop shadow
   (→ enables parallax layers; a blended scene can only be panned as one plane)
3. BACKGROUND — ONE bold flat color per beat (busy bg kills cut-out punch)
4. HEADLINE — short (2-3 words), bold, in "quotes" (never long sentences on screen)
5. Composition vocab: strong negative space · off-center focal · hero+subhead hierarchy ·
   foreground–midground–background depth · full-bleed · stacked bands

## C. Color rules (from prompt-guide palette axis + thumbnails analysis)
- **Limited 2-3 colors per beat**, or monochrome + 1 accent. NOT 4-5 accents everywhere.
- Duotone / riso 2-color / Bauhaus primaries / cream-kraft base are the Vox palette families.
- Bold FLAT background — no muddy gradients behind cut-outs.
- Palette travels across beats to carry mood (aged sepia → bold pop → gold).

## D. Motion rules (PremiumBeat + local-engine)
1. **Graphics at 12fps (on-twos)** — stuttered paper character; graphics comp 12fps in a
   24/30fps edit. → Remotion: `Math.floor(frame/2)*2` on graphics layers (already have onTwos).
2. **One move per shot, continuous** — no jump cuts inside a shot. Amplitude small.
3. **Camera**: slow zoom + **impact shake** (exp-decay sine) on entrances + **whip between
   beats** (overscan + directional blur at the cut). Never affine-translate revealing edges.
4. **Element entrances** (local-engine helpers → Remotion spring equivalents):
   - `fly_in` — off-screen fly + back-overshoot (paper snap)
   - `slap` — enlarged → snap in
   - `drop` — bounce down
   - `pop_settle` — focus-pop in place: opaque, scale 1.35→1.0, no off-screen travel
   - After settle: **sway + pulse** (low-freq wobble + scale breath) — never dead-still
5. **Confetti / scraps drift** — geometric scraps drifting throughout = tactile energy
   (→ animate ScrapScatter slowly, not static).
6. **Motion background** — when a shot holds 5s+, cycle 2-3 paper textures per second behind
   the static element (or slow breath/parallax) — never a static solid hold.
7. **Lens feel on 2D**: chromatic aberration + slight blur ONLY near frame edges (center
   mask, feather 50) — gives flat paper a photographed feel. (ImperfectionOverlay exists —
   verify it is edge-only + subtle.)

## E. Step-by-step reveal (PremiumBeat lower-third)
Torn/jagged mask path grows progressively (skipping frames), TEXT delayed a few frames
behind the shape. → PaperTear chapter dividers already do the torn reveal; apply the same
"shape first, text delayed" timing to lower-third-style labels.

## F. Layering (why Vox looks assembled)
Distinct pieces with visible edges + shadows → video model/engine can drift them at
different depths (parallax). Push layering: background shape drifts slower than cutout,
foreground silhouette drifts faster. 2.5D = 3 planes at different speeds (Johnny Harris /
storybench "2.5D situation").

## G. Text discipline (anti "text wall")
- Headline on screen: 2-3 words, bold, 60-120px, often in "quotes" or a torn banner + seal.
- Full sentences live in the VO + karaoke only. Illustration text is a label, not a caption.
- Every on-screen text has a PURPOSE (label the thing / the punch) — never decoration.

## H. Theme presets (combine axes) — pick for literature/AI essay
`newsprint-editorial` (cream #F2EFE6 / deep red / mustard / charcoal, bold condensed
headline, aged paper, heavy halftone) — THE fit for AI/writing editorial.
Other usable: `swiss-modern` (2-color + red), `riso` (fluorescent pink + federal blue),
`atomic-age` (teal/orange/cream). Keep ONE preset per video; palette can travel per chapter
within the preset's family.
