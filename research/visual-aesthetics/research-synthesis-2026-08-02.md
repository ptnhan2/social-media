# Visual Language Upgrade — Research Synthesis (2026-08-02)

> 5 subagents researched in parallel: shape/cutout, palette, layout, motion/curve, paper craft.
> Full source lists live in the subagent outputs (60+ cited sources). This file is the
> actionable synthesis + implementation proposal for the vox pipeline.

## 1. SHAPE & CUTOUT (12 patterns found — top 5 for us)

| Pattern | Effort | Why |
|---|---|---|
| **Halftone Sun Halo** | 2 | Circle of 1950s dots behind cutout head — signature Vox motif, kills "bare cutout on cream" |
| **Curved Text + Flourish** | 2 | textPath arc + hand-drawn swash underlines — THE literature fit (quotes, ink gestures) |
| **Scrap Scatter** | 1 | seeded geometric paper scraps (triangles/quarter-circles/starbursts) fill dead background |
| **Arch Portal** | 1 | Roman-arch colored backing behind cutout — doorway/window metaphor |
| **Torn Banner + Red Seal** | 2 | torn banner holds headline + serrated red seal stamp |
| Blob backing, polaroid scatter, rotated pile/fan, circle badge ring, 2.5D parallax | 1-3 | honorable mentions |

## 2. PALETTE (9 researched palettes; rules + chapter-shift strategies)

**Harmony rules (why current beige+4 accents reads generic):**
- R1 One loud accent per frame (Vox rule) — muted base + ONE bold color
- R2 Saturation budget: max 2-3 fully saturated, rest muted; yellow perceptually louder than blue at same saturation
- R3 Temperature balance: one temp dominates, other accents
- R4 60-30-10 + real value spread (dark ink + light cream always present)
- R5 Neutrals are structural — paper tones do the quiet 60%

**Palettes (hex sets in subagent output):** P1 Ink & Signal (upgrade of current), P2 Grand Budapest (plum/pink/gold), P3 Memphis (hot pink/canary/teal/grape), P4 Kurzgesagt Cosmos (deep blue + warm), P5 Asteroid Desert (sand/teal/orange), P6 Lichtenstein Comic (CMYK + halftone), P7 Vivid Editorial (coral/violet/gold), P8 Solar Flare dark, P9 Tenenbaum (archive + one red).

**Chapter-shift strategy (recommended):** Strategy C — Anchor-constant: ONE immutable anchor color (karaoke highlight) across all 8 sections, bg + accents rotate per section; swap bg at sentence boundary; anchor appears in first element of new section.

**8-section mapping example:** Hook→P9 Tenenbaum · Claim→P4 Kurzgesagt · Analysis→P1 Ink & Signal · Subtext→P3 Memphis · Examples→P6 Lichtenstein · Dark turn→P8 Solar Flare · Craft→P5 Asteroid Desert · Synthesis→P2 Grand Budapest dark.

## 3. LAYOUT & SPACE (12 patterns)

Thirds-Offset · Phi Split (61.8/38.2) · Asymmetric Seesaw · Gutenberg Diagonal · Z-Pattern Anchors · **S-Curve Cascade (Hogarth line of beauty)** · Radial Orbit · Central Figure (Kogonada stillness) · Frame-within-Frame (letter/manuscript!) · Triangle Cluster · Bottom-Band Dock · Full-Bleed Evidence.

Rules: negative space 30-40%; one "air scene" per 5-7 scenes; no 3 consecutive scenes same layout (gate-able via `layout` field); anchor corner rotates.

## 4. MOTION & CURVES (12 patterns)

| Pattern | Effort | Use |
|---|---|---|
| **P1 Ink Draw-On** (stroke-dashoffset pen flourish) | cheap | annotations, underlines — literary #1 |
| **P4 Stamp Slam** (1.35x→1.0 + sine shake) | cheap | headlines, punches |
| **P5 Cutout Toss & Sway** (on-twos stepping + breath) | cheap | subject cutouts — the "living paper" signature |
| **P8 Letterpress Word Reveal** (on-twos per word) | cheap | quotes |
| P2 Swash Arc Glide (de Casteljau bezier path) | medium | connecting ideas |
| P9 Paper Tear transition, P10 Marginalia Toss (tape follow-through), P11 Living Paper Parallax, P12 Word Match-Cut | medium | special occasions |

Easing: handmade = back-out/expo overshoot 10-30% (damping 8-14, stiffness 120-220); corporate curves = avoid. On-twos stepping = cheapest "Vox character" upgrade. Pacing: change something every 3-5s; no static poster >8s; stillness reserved for quotes.

## 5. PAPER CRAFT (14 techniques — craft kit to build first)

1. **Colored Paper Palette Engine** (PAPER_KIT: base/cardstock/pastel; 1-2 accent papers per scene) — kills beige
2. **Lit Paper Texture** (feTurbulence + feDiffuseLighting instead of flat noise)
3. **Marker Highlight + Hand-Drawn Circles** (rough rect highlight; circle draw-on)
4. **Multi-Seed Torn Edge** (parameterized feDisplacementMap per scene)
5. **Risograph Ink Layers** (2-3 spot colors, misregistration offset 1-3px, grain)
6. **Patterned Paper Inserts** (gingham/dots patches)
+ Vellum overlay, rubber stamp ink, stitch/thread connectors, ticket stub/polaroid frames
+ Handwriting fonts (local woff2): Caveat, Playpen Sans (VI support), Permanent Marker

---

## IMPLEMENTATION PROPOSAL

**Phase A — Craft Kit core (voxKit additions, applied to ai-dialogue + future videos):**
1. `PaperPalette` system — per-scene palette (light/dark bg + accents + paper kit), anchor karaoke color constant; gate: palette contrast safety (no yellow-on-light, text contrast)
2. `LitPaper` — replace flat noise with lit fractal-noise paper
3. `ShapeBackdrop` — halftone-sun / blob / arch / starburst behind cutouts (per scene choice)
4. `ScrapScatter` — seeded geometric scraps (deterministic)
5. `InkDrawOn` + `WaveUnderline` — flourish annotations (superset of PenArrow)
6. Cutout on-twos + sway (P5) — motion upgrade
7. `layout` field per scene + gate `layout-repeat` (no 3 same in a row)
8. Marker highlight + hand-drawn circle annotation primitive

**Phase B — after A approved:** Paper Tear transition, Marginalia Toss, Polaroid scatter, 2.5D parallax, Risograph, full chapter-palette mapping for ai-dialogue.

**Gate additions (v9):** palette-contrast (per-scene bg vs text colors), layout-repeat, paper-kit enforcement (all paper colors from kit).
