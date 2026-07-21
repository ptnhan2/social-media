# DESIGN.md — Literary Brand System

> For Open Design. 9-section schema (color/typography/spacing/layout/components/motion/voice/brand/anti-patterns).
> Aesthetic: "trang sách sống động" — giấy ngà, mực, serif, grain, chuyển động chậm có hồn. Mascot = linh vật kênh.
> Niche: AI agent cho tác giả tiểu thuyết. Audience = author. Tone = author-first, không tech-bro.

---

## 1. Color

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#F5F0E0` (cream/parchment) | Nền chính, mọi surface |
| `--bg-secondary` | `#EBE4D1` (warm beige) | Cards, panels, sections |
| `--bg-dark` | `#2C2825` (ink black) | Dark mode / video bg |
| `--text-primary` | `#2C2825` (ink) | Body text |
| `--text-secondary` | `#6B5D4F` (sepia) | Captions, meta |
| `--accent-primary` | `#3B5E3A` (forest green) | CTAs, highlights, mascot accent |
| `--accent-secondary` | `#CC8832` (ochre/gold) | Links, emphasis, underline |
| `--accent-tertiary` | `#C45D3E` (terracotta) | Warnings, errors, "AI" tag |
| `--grain-overlay` | `rgba(0,0,0,0.03)` | Paper texture overlay (subtle) |

**Palette mood**: ấm, giấy cũ, mực, vàng son + xanh rừng. Không neon, không gradient sặc sỡ. Inspired by: old book pages, HFM warm-grain template, editorial magazine.

---

## 2. Typography

| Token | Font | Usage |
|---|---|---|
| `--font-heading` | `"Cormorant Garamond", serif` | Titles, headings (drop cap optional) |
| `--font-body` | `"EB Garamond", serif` | Body text, descriptions |
| `--font-mono` | `"JetBrains Mono", monospace` | Code snippets, "AI output" blocks, technical |
| `--font-caption` | `"Inter", sans-serif` | Captions, UI labels, timestamps |

**Scale**:
- H1: 72px / weight 600 / line-height 1.1 / letter-spacing -2px
- H2: 48px / weight 600 / line-height 1.2
- H3: 32px / weight 500 / line-height 1.3
- Body: 24px / weight 400 / line-height 1.6
- Caption: 16px / weight 400 / line-height 1.4

**Drop cap**: first letter of first paragraph = 120px, float left, accent-primary color. (Editorial/literary touch.)

---

## 3. Spacing

| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 32px |
| `--space-xl` | 64px |
| `--space-2xl` | 128px |

**Rhythm**: generous whitespace (literary = breathing room). Sections separated by `--space-2xl`. No cramped layouts.

---

## 4. Layout

| Context | Dimensions |
|---|---|
| YouTube long-form (landscape) | 1920×1080 |
| Shorts/Reels/TikTok (portrait) | 1080×1920 |
| Thumbnail | 1280×720 (16:9) |
| IG carousel slide | 1080×1080 (square) |
| X/Thread image | 1200×675 (16:9) |

**Grid**: 12-column, 64px gutter. Content max-width 1200px (centered). Safe margins 80px.

**Composition principles**:
- Rule of thirds for focal points.
- Mascot: bottom-right or left-third (not center, không che text).
- Text hierarchy: title (H1) → subtitle (H3) → body → CTA.
- Negative space = luxury (literary feel).

---

## 5. Components

| Component | Style |
|---|---|
| **Title card** | Cream bg, H1 serif, accent underline, mascot in-out (GSAP slide) |
| **Stat/number hit** | Large numeral (120px), accent color, scale-in animation |
| **Quote block** | Italic serif, left border accent-primary (4px), sepia text |
| **AI output block** | Mono font, bg-secondary, border-left accent-tertiary (the "AI" tag) |
| **Franchise image** | Centered, border-radius 16px, shadow soft, caption below |
| **CTA card** | Accent-primary bg, cream text, rounded 24px, "→ Waitlist" |
| **Lower-third** | Semi-transparent ink bg, cream text, mascot mini (left) |
| **Chapter divider** | Decorative ornament (❦ or ✦), centered, accent-secondary |

---

## 6. Motion

| Element | Animation | Duration | Ease |
|---|---|---|---|
| Title in | Fade + slide up (y: 40→0) | 0.8s | power2.out |
| Mascot in | Slide from edge + scale (0.8→1) | 0.6s | back.out(1.4) |
| Mascot out | Fade + slide off | 0.4s | power2.in |
| Text reveal | Stagger fade (per word/line) | 0.05s/word | power2.out |
| Stat counter | Count 0→number | 1.2s | power2.out |
| Quote in | Italic + fade + border grow | 0.6s | power2.out |
| CTA pulse | Scale 1→1.03→1 (loop) | 2s | sine.inOut |
| Grain | Step translate (steps(1)) | 0.5s loop | linear |
| Transition | Crossfade + grain flash | 0.3s | power2.inOut |

**Motion philosophy**: chậm, có nhịp, "mực thấm" — không fast/jerky. Inspire: HFM video essay pacing, editorial. GSAP timelines paused, registered on `window.__timelines`.

---

## 7. Voice

| Dimension | Guideline |
|---|---|
| **Tone** | Author-first, thoughtful, slightly literary. Not tech-bro, not hype. |
| **Person** | "I" (first person, personal). "You" (addressing the author viewer). |
| **Rhythm** | Vary sentence length. Short punchy + long flowing. Avoid uniform cadence. |
| **Vocabulary** | Literary but accessible. "Prose" not "content output". "Manuscript" not "document". |
| **AI mention** | Natural, not forced. "The agent suggested..." not "Utilizing our proprietary AI...". |
| **Failures** | Show them openly. "This AI output was terrible. Here's why." (Sanderson principle) |
| **CTA** | Soft, not aggressive. "If you want to try the agent → [link]" not "BUY NOW!!!" |
| **Humor** | Dry, self-deprecating, author-relatable. Not meme-y. |

---

## 8. Brand

| Element | Spec |
|---|---|
| **Channel name** | [TBD by you] — suggestion: "The AI Novelist" or "[Your Name] Writes with AI" |
| **Mascot** | [Your PNG library] — states: curious, thinking, surprised, happy, writing, presenting |
| **Mascot usage** | In/out per scene (GSAP), bottom-third or left-third, NOT center (don't block text) |
| **Logo** | Wordmark in Cormorant Garamond, accent-primary, with small mascot icon |
| **Tagline** | "AI for novelists who write, not robots who replace." (or similar) |
| **Series branding** | "On AI-Writing: [Topic]" — consistent intro card per series |
| **Disclosure** | "This video uses AI-generated visuals. Script + craft by [you]." (anti-ban, platform compliance) |

---

## 9. Anti-patterns (KHÔNG làm)

- ❌ Neon colors, gradient backgrounds, "tech startup" aesthetic
- ❌ Fast/jerky motion (unless intentional comedic effect)
- ❌ Generic AI stock imagery (Pexels montage = demonetization risk)
- ❌ Tech-bro vocabulary ("leverage", "utilize", "synergy", "scale")
- ❌ Hype CTAs ("ACT NOW", "LIMITED TIME", "EXCLUSIVE")
- ❌ Mascot blocking text or center-screen during dense info
- ❌ Sans-serif body text (breaks literary feel; use serif body)
- ❌ No grain/texture (flat = generic; grain = literary)
- ❌ Hidden AI disclosure (platform compliance + trust)
- ❌ Overproduced/slick (authenticity > polish; Sanderson: show failures)
