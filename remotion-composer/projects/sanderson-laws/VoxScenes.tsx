import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Animated,
  ARCHIVO,
  FontsAndBase,
  HighlightSweep,
  ImperfectionOverlay,
  INK,
  INTER,
  BackdropCtx,
  KaraokeSubtitle,
  MonoLabel,
  MONO,
  PaperBg,
  PenArrow,
  PhotoCard,
  PushIn,
  StampText,
  SubjectCutout,
  TornFrame,
  VOX_YELLOW,
  WashiTape,
  easeOut,
  onTwos,
  resolveAccent,
} from "../../shared/primitives";
import TIMELINE from "./timeline.json";

// ---------------------------------------------------------------------------
// VoxFull — sanderson-laws (generated 2026-08-03, v10 design system: 8 chapter palettes, 3-layer, halftone, red stroke, PushIn, foley) — scene-level visuals, item-driven text.
// FIXES (user feedback):
//  - scenes are 4-10s (narration sentences GROUPED), items appear gradually
//    INSIDE one stable visual — no more rapid scene cuts between sentences
//  - multi-color accents: yellow/red/blue/green on illustration text
// ---------------------------------------------------------------------------

export const RED = "#D64541";
export const BLUE = "#2E74B5";
export const GREEN = "#2E7D32";

type Item = {
  at: number; // absolute seconds
  text: string;
  color?: string;
  size?: number;
  sub?: string;
};

type Scene = {
  start: number;
  end: number;
  kind: "photo" | "text" | "chips" | "chat" | "ailine" | "collage" | "counter" | "iceberg" | "bubbles" | "stat" | "cta";
  img?: string[];
  img2?: string[];
  dark?: boolean;
  items: Item[];
  caption?: string;
  chips?: string[];
  motion?: string;
  push?: { from?: number; to?: number }; // v10: continuous push-in override (continuation after split)
};

const IMG = (n: string) => staticFile(`sanderson/images/${n}`);

const hexToRgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// ---------------------------------------------------------------------------
// v10 — chapter-locked backdrop (S2: 3-layer depth; "one continuous shot" feel).
// One full-bleed act image reused across every scene of the act, toned down so
// the paper world stays on top. actBgFor() picks by absolute time.
// ---------------------------------------------------------------------------
const ACT_BG: { from: number; img: string }[] = [{"from": 0.0, "img": "scene-4.png"}, {"from": 73.59, "img": "scene-8.png"}, {"from": 128.73, "img": "scene-12.png"}, {"from": 209.44, "img": "scene-13.png"}, {"from": 262.58, "img": "scene-17.png"}, {"from": 304.84, "img": "scene-21.png"}, {"from": 383.97, "img": "scene-25.png"}, {"from": 427.56, "img": "scene-29.png"}];
const actBgFor = (t: number) => {
  let bg = ACT_BG[0];
  for (const a of ACT_BG) if (t >= a.from) bg = a;
  return bg;
};

const ChapterBackdrop: React.FC<{ t: number; dark?: boolean; end?: number }> = ({ t, dark = false, end = t + 8 }) => {
  const frame = useCurrentFrame();
  const bg = actBgFor(t);
  const driftK = interpolate(frame / 30, [t, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ zIndex: 0 }}>
      <Img
        src={IMG(bg.img)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(1.16) translateX(${-1.6 * driftK}%)`,
          filter: dark
            ? "grayscale(0.3) brightness(0.5) contrast(1.1) saturate(1.25)"
            : "grayscale(0.05) sepia(0.18) brightness(0.85) contrast(1.05) saturate(1.35)",
        }}
      />
      <AbsoluteFill style={{ background: dark ? "rgba(23,26,28,0.62)" : "rgba(245,240,232,0.55)" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// SCENES — sentences grouped into stable visuals (times from timeline.json)
// ---------------------------------------------------------------------------
const SCENES: Scene[] = [{"start": 0.0, "end": 4.92, "kind": "text", "dark": true, "items": [{"at": 0.0, "text": "I asked an AI to build me a magic system.", "color": "#4FC3F7", "size": 46}, {"at": 3.07, "text": "Just for fun.", "color": "#4FC3F7", "size": 112}]}, {"start": 5.22, "end": 16.27, "kind": "photo", "dark": true, "items": [{"at": 12.27, "text": "It gave me sixteen metals, three schools of sorcery, a currency made of souls, and a map of rules so detailed it could have been torn out of a fantasy appendix.", "color": "#4FC3F7", "size": 40}], "img": ["scene-4.png"]}, {"start": 16.14, "end": 22.45, "kind": "text", "dark": true, "items": [{"at": 16.14, "text": "I stared at it.", "color": "#4FC3F7", "size": 112}, {"at": 18.21, "text": "It was beautiful.", "color": "#4FC3F7", "size": 112}, {"at": 20.2, "text": "It was also a lie.", "color": "#4FC3F7", "size": 112}]}, {"start": 22.75, "end": 29.4, "kind": "collage", "dark": true, "items": [{"at": 25.4, "text": "Because here's what a hundred thousand words of AI fantasy taught me: any model can hand you powers.", "color": "#4FC3F7", "size": 40}], "img": ["scene-3.png"]}, {"start": 29.27, "end": 37.12, "kind": "photo", "dark": true, "items": [{"at": 33.12, "text": "Fire, lightning, blood magic, time magic, a magic where people trade years off their lives.", "color": "#4FC3F7", "size": 40}], "img": ["scene-4.png"]}, {"start": 36.99, "end": 46.36, "kind": "photo", "dark": true, "items": [{"at": 36.99, "text": "The powers are never the problem.", "color": "#4FC3F7", "size": 46}, {"at": 40.48, "text": "The problem is what the system costs, who it hurts, and what happens when someone cheats.", "color": "#B0BEC5", "size": 46}, {"at": 44.35, "text": "There's an actual name for this.", "color": "#4FC3F7", "size": 46}], "img": ["scene-3.png"]}, {"start": 46.23, "end": 54.88, "kind": "text", "dark": true, "items": [{"at": 50.88, "text": "Brandon Sanderson, the guy who writes Mistborn, calls it the Second Law of Magic: limitations are more interesting than powers.", "color": "#4FC3F7", "size": 40}]}, {"start": 54.75, "end": 62.0, "kind": "photo", "dark": true, "items": [{"at": 54.75, "text": "And once I held my AI magic system next to that law, I couldn't unsee it.", "color": "#4FC3F7", "size": 46}, {"at": 59.51, "text": "Every rule it wrote was decoration.", "color": "#B0BEC5", "size": 46}], "img": ["scene-3.png"]}, {"start": 61.87, "end": 66.16, "kind": "collage", "dark": true, "items": [{"at": 61.87, "text": "Every limit it listed, it forgot.", "color": "#4FC3F7", "size": 46}, {"at": 64.31, "text": "So let me show you what I mean.", "color": "#B0BEC5", "size": 46}], "img": ["scene-4.png"]}, {"start": 66.03, "end": 72.64, "kind": "chat", "dark": true, "items": [{"at": 66.03, "text": "And I promise, this isn't an \"AI is dumb\" video.", "color": "#4FC3F7", "size": 46}, {"at": 69.51, "text": "It's a \"here's exactly which gears grind\" video.", "color": "#B0BEC5", "size": 46}]}, {"start": 73.59, "end": 82.43, "kind": "collage", "dark": true, "items": [{"at": 73.59, "text": "First, the law itself, because it's genuinely beautiful.", "color": "#E3B341", "size": 46}, {"at": 78.43, "text": "In Mistborn, magic runs on sixteen metals, and you drink them like medicine.", "color": "#C77F00", "size": 46}], "img": ["scene-7.png"]}, {"start": 82.3, "end": 88.12, "kind": "text", "dark": true, "items": [{"at": 82.3, "text": "Want to push metal away from you?", "color": "#E3B341", "size": 52}, {"at": 84.44, "text": "Burn steel.", "color": "#E3B341", "size": 112}, {"at": 86.35, "text": "But burning has a price.", "color": "#E3B341", "size": 112}]}, {"start": 88.42, "end": 98.31, "kind": "photo", "dark": true, "items": [{"at": 88.42, "text": "The metal runs out, and if you flare it, it runs out faster.", "color": "#E3B341", "size": 46}, {"at": 94.31, "text": "Sanderson even thought about the physics: if you push on something heavy, it doesn't move.", "color": "#C77F00", "size": 46}], "img": ["scene-7.png"]}, {"start": 98.18, "end": 103.9, "kind": "text", "dark": true, "items": [{"at": 98.18, "text": "You do.", "color": "#E3B341", "size": 112}, {"at": 99.77, "text": "The magic doesn't let you win.", "color": "#C77F00", "size": 46}, {"at": 101.73, "text": "It makes you make choices.", "color": "#E3B341", "size": 112}]}, {"start": 104.2, "end": 108.81, "kind": "text", "dark": true, "items": [{"at": 104.2, "text": "In Warbreaker, magic runs on color.", "color": "#E3B341", "size": 46}, {"at": 107.04, "text": "Literally.", "color": "#E3B341", "size": 112}]}, {"start": 109.11, "end": 120.72, "kind": "photo", "dark": true, "items": [{"at": 116.72, "text": "Every spell drains the color out of the world around you, and there are characters who sold their soul, their Breath, one per person, and now live as hollow shells called Drab.", "color": "#E3B341", "size": 40}], "img": ["scene-7.png"]}, {"start": 120.59, "end": 127.78, "kind": "text", "dark": true, "items": [{"at": 120.59, "text": "A Drab feels less.", "color": "#E3B341", "size": 112}, {"at": 123.3, "text": "That's not a power fantasy.", "color": "#E3B341", "size": 112}, {"at": 125.37, "text": "That's a system where power has a receipt.", "color": "#C77F00", "size": 46}]}, {"start": 128.73, "end": 136.21, "kind": "collage", "dark": false, "items": [{"at": 128.73, "text": "Now watch what AI does with the same assignment.", "color": "#D64541", "size": 46}, {"at": 132.21, "text": "I gave it a prompt: fire magic, and the cost is blood.", "color": "#131313", "size": 46}], "img": ["scene-11.png"]}, {"start": 136.08, "end": 140.61, "kind": "text", "dark": false, "items": [{"at": 136.08, "text": "On page twelve, it remembers.", "color": "#D64541", "size": 46}, {"at": 138.36, "text": "Casting costs blood.", "color": "#D64541", "size": 112}]}, {"start": 140.91, "end": 147.88, "kind": "photo", "dark": false, "items": [{"at": 143.88, "text": "By page two hundred and forty-seven, the hero is throwing fireballs like confetti, and the bill never arrives.", "color": "#D64541", "size": 40}], "img": ["scene-12.png"]}, {"start": 147.75, "end": 165.52, "kind": "chat", "dark": false, "items": [{"at": 161.52, "text": "Sudowrite, an AI writing tool, put it brutally: \"You decided fire magic costs blood on page 12. By page 247, your protagonist is throwing fireballs like confetti at a parade. No blood. No cost. No consequences.\"", "color": "#D64541", "size": 40}]}, {"start": 165.39, "end": 169.94, "kind": "text", "dark": false, "items": [{"at": 165.39, "text": "Why?", "color": "#D64541", "size": 52}, {"at": 167.05, "text": "Because of something called context drift.", "color": "#131313", "size": 46}]}, {"start": 169.81, "end": 179.34, "kind": "photo", "dark": false, "items": [{"at": 175.34, "text": "Researchers at Microsoft and SUTD built a benchmark called Lost in Stories, and it measured exactly when AI breaks its own world rules.", "color": "#D64541", "size": 40}], "img": ["scene-11.png"]}, {"start": 179.21, "end": 186.02, "kind": "stat", "dark": false, "items": [{"at": 182.02, "text": "Facts the story establishes at the twenty-four percent mark get contradicted at the thirty-nine percent mark.", "color": "#D64541", "size": 40}], "img": ["scene-12.png"]}, {"start": 185.89, "end": 189.82, "kind": "stat", "dark": false, "items": [{"at": 185.89, "text": "Twenty-three percent of a story later, the rules start lying.", "color": "#D64541", "size": 46}], "img": ["scene-11.png"]}, {"start": 189.69, "end": 202.1, "kind": "photo", "dark": false, "items": [{"at": 198.1, "text": "And there's an older result that explains it: a model remembers the beginning and end of its context really well, above ninety percent, but in the middle, recall drops to fifty or seventy percent.", "color": "#D64541", "size": 40}], "img": ["scene-12.png"]}, {"start": 201.97, "end": 208.49, "kind": "text", "dark": false, "items": [{"at": 201.97, "text": "Your magic system lives in the middle.", "color": "#D64541", "size": 46}, {"at": 204.01, "text": "That's not a writing flaw.", "color": "#D64541", "size": 112}, {"at": 206.48, "text": "That's the architecture.", "color": "#D64541", "size": 112}]}, {"start": 209.44, "end": 214.52, "kind": "text", "dark": true, "items": [{"at": 209.44, "text": "Second: weakness.", "color": "#A5D6A7", "size": 46}, {"at": 211.55, "text": "Sanderson's systems have exploitable seams.", "color": "#D64541", "size": 46}]}, {"start": 214.39, "end": 223.48, "kind": "photo", "dark": true, "items": [{"at": 214.39, "text": "In Mistborn, atium lets you see a few seconds into the future.", "color": "#A5D6A7", "size": 46}, {"at": 219.48, "text": "It's the most expensive thing in the empire, and a piece burns in about thirty seconds.", "color": "#D64541", "size": 46}], "img": ["scene-15.png"]}, {"start": 223.35, "end": 230.92, "kind": "photo", "dark": true, "items": [{"at": 224.0, "text": "And if two people burn atium at the same time, their futures cancel out.", "color": "#A5D6A7", "size": 46}, {"at": 227.87, "text": "There's a counterplay baked into the god metal itself.", "color": "#A5D6A7", "size": 46}], "img": ["scene-15.png"]}, {"start": 230.79, "end": 241.2, "kind": "text", "dark": true, "items": [{"at": 237.2, "text": "Even pewter, the simplest metal, has a crash: burn it to ignore wounds, and when it runs out, every injury you suppressed hits you at once.", "color": "#A5D6A7", "size": 40}]}, {"start": 241.07, "end": 246.08, "kind": "text", "dark": true, "items": [{"at": 241.07, "text": "Thugs die from wounds they forgot they had.", "color": "#A5D6A7", "size": 46}, {"at": 243.67, "text": "Now ask AI for a weakness.", "color": "#A5D6A7", "size": 112}]}, {"start": 246.38, "end": 250.63, "kind": "collage", "dark": true, "items": [{"at": 246.63, "text": "It'll write you a paragraph about how the magic is draining, or forbidden.", "color": "#A5D6A7", "size": 46}], "img": ["scene-15.png"]}, {"start": 250.5, "end": 257.27, "kind": "text", "dark": true, "items": [{"at": 250.5, "text": "But no enemy ever exploits it, because the enemy doesn't know it either.", "color": "#A5D6A7", "size": 46}, {"at": 255.02, "text": "Each scene is generated fresh.", "color": "#D64541", "size": 46}]}, {"start": 257.14, "end": 261.63, "kind": "photo", "dark": true, "items": [{"at": 257.63, "text": "Nothing in the story holds the weakness in its hands long enough to use it.", "color": "#A5D6A7", "size": 46}], "img": ["scene-15.png"]}, {"start": 262.58, "end": 269.42, "kind": "text", "dark": false, "items": [{"at": 262.58, "text": "Third: skill.", "color": "#E3B341", "size": 46}, {"at": 265.42, "text": "This one breaks my heart, because it's the difference between a system and a prop.", "color": "#2E74B5", "size": 46}]}, {"start": 269.29, "end": 275.14, "kind": "photo", "dark": false, "items": [{"at": 271.14, "text": "In Elantris, magic is drawn as symbols called Aons, and they're maps of the land.", "color": "#E3B341", "size": 46}], "img": ["scene-20.png"]}, {"start": 275.01, "end": 281.66, "kind": "photo", "dark": false, "items": [{"at": 277.66, "text": "One earthquake added a chasm to the country, and every spell in the world stopped working, for ten years.", "color": "#E3B341", "size": 40}], "img": ["scene-17.png"]}, {"start": 281.53, "end": 287.34, "kind": "collage", "dark": false, "items": [{"at": 281.53, "text": "And the closer you are to the source city, the stronger the magic.", "color": "#E3B341", "size": 46}, {"at": 284.93, "text": "A master can do what a novice can't.", "color": "#2E74B5", "size": 46}], "img": ["scene-19.png"]}, {"start": 287.21, "end": 295.85, "kind": "text", "dark": false, "items": [{"at": 287.21, "text": "Now look at AI's characters.", "color": "#E3B341", "size": 112}, {"at": 291.85, "text": "The farm boy, the old scholar, the street thief, they all cast at exactly the same level.", "color": "#2E74B5", "size": 46}]}, {"start": 295.72, "end": 303.89, "kind": "photo", "dark": false, "items": [{"at": 295.72, "text": "Because the model doesn't have a voice for skill.", "color": "#E3B341", "size": 46}, {"at": 298.24, "text": "It has one voice: the helpful assistant.", "color": "#2E74B5", "size": 46}, {"at": 300.84, "text": "Everyone's magic reads like the same tutorial.", "color": "#2E74B5", "size": 46}], "img": ["scene-18.png"]}, {"start": 304.84, "end": 311.48, "kind": "text", "dark": true, "items": [{"at": 304.84, "text": "Fourth: contract.", "color": "#A8D8FF", "size": 46}, {"at": 306.95, "text": "In Stormlight Archive, the power isn't learned.", "color": "#fff200", "size": 46}, {"at": 310.11, "text": "It's sworn.", "color": "#A8D8FF", "size": 112}]}, {"start": 311.78, "end": 318.67, "kind": "photo", "dark": true, "items": [{"at": 314.67, "text": "You bond a spren, you speak oaths, and if you break an oath, the bond snaps and the spren dies.", "color": "#A8D8FF", "size": 40}], "img": ["scene-22.png"]}, {"start": 318.54, "end": 324.91, "kind": "photo", "dark": true, "items": [{"at": 318.54, "text": "There are blades in that world that are literally the corpses of broken promises.", "color": "#A8D8FF", "size": 46}, {"at": 322.9, "text": "That's consequence architecture.", "color": "#fff200", "size": 46}], "img": ["scene-22.png"]}, {"start": 324.78, "end": 331.25, "kind": "text", "dark": true, "items": [{"at": 324.78, "text": "AI, though?", "color": "#A8D8FF", "size": 52}, {"at": 327.25, "text": "I've watched its characters break their own rules and nothing happens.", "color": "#fff200", "size": 46}]}, {"start": 331.12, "end": 336.77, "kind": "text", "dark": true, "items": [{"at": 331.12, "text": "No backlash, no dead spren, no price.", "color": "#A8D8FF", "size": 46}, {"at": 335.0, "text": "The scene just moves on.", "color": "#A8D8FF", "size": 112}]}, {"start": 337.07, "end": 343.08, "kind": "photo", "dark": true, "items": [{"at": 339.08, "text": "Because the model is trained to resolve tension, not to let a broken oath sit on the table and burn.", "color": "#A8D8FF", "size": 40}], "img": ["scene-22.png"]}, {"start": 342.95, "end": 350.19, "kind": "text", "dark": true, "items": [{"at": 342.95, "text": "Fifth: scarcity.", "color": "#A8D8FF", "size": 112}, {"at": 345.5, "text": "The best systems are gated by logistics.", "color": "#fff200", "size": 46}, {"at": 348.1, "text": "Atium is controlled by the emperor.", "color": "#fff200", "size": 46}]}, {"start": 350.06, "end": 356.95, "kind": "photo", "dark": true, "items": [{"at": 352.95, "text": "Stormlight leaks out of your body, and during the Weeping, the weeks of endless rain, it runs out entirely.", "color": "#A8D8FF", "size": 40}], "img": ["scene-22.png"]}, {"start": 356.82, "end": 362.02, "kind": "text", "dark": true, "items": [{"at": 356.82, "text": "Magic has supply chains.", "color": "#A8D8FF", "size": 112}, {"at": 359.13, "text": "But AI magic has an infinite warehouse.", "color": "#fff200", "size": 46}]}, {"start": 361.89, "end": 371.18, "kind": "collage", "dark": true, "items": [{"at": 367.18, "text": "The moment the plot needs an escape, there's a forgotten artifact, a convenient storm, a power that was always there but never mentioned.", "color": "#A8D8FF", "size": 40}], "img": ["scene-22.png"]}, {"start": 371.05, "end": 378.82, "kind": "photo", "dark": true, "items": [{"at": 374.82, "text": "Tools like Sudowrite literally sell a feature that flags scenes where magic solves problems the reader hasn't been prepared for.", "color": "#A8D8FF", "size": 40}], "img": ["scene-21.png"]}, {"start": 378.69, "end": 383.02, "kind": "photo", "dark": true, "items": [{"at": 379.02, "text": "The AI is so good at deus ex machina, it needs a detector.", "color": "#A8D8FF", "size": 46}], "img": ["scene-22.png"]}, {"start": 383.97, "end": 387.82, "kind": "collage", "dark": true, "items": [{"at": 383.97, "text": "So here's the synthesis, and it's the part I actually care about.", "color": "#C9A8E8", "size": 46}], "img": ["scene-25.png"]}, {"start": 387.92, "end": 396.41, "kind": "photo", "dark": true, "items": [{"at": 392.41, "text": "Those five dimensions, cost, weakness, skill, contract, scarcity, aren't five random failures.", "color": "#C9A8E8", "size": 40}], "img": ["scene-28.png"]}, {"start": 396.28, "end": 402.09, "kind": "photo", "dark": true, "items": [{"at": 396.28, "text": "They're five things a language model structurally cannot hold.", "color": "#C9A8E8", "size": 46}, {"at": 399.76, "text": "Cost needs memory of page twelve.", "color": "#E3B341", "size": 46}], "img": ["scene-28.png"]}, {"start": 401.96, "end": 409.61, "kind": "collage", "dark": true, "items": [{"at": 401.96, "text": "Weakness needs a persistent state that survives the scene.", "color": "#C9A8E8", "size": 46}, {"at": 405.61, "text": "Skill needs differentiated voices, and the model has one voice.", "color": "#E3B341", "size": 46}], "img": ["scene-25.png"]}, {"start": 409.48, "end": 414.13, "kind": "photo", "dark": true, "items": [{"at": 410.13, "text": "Contract needs consequences, and it's trained to smooth everything over.", "color": "#C9A8E8", "size": 46}], "img": ["scene-25.png"]}, {"start": 414.0, "end": 418.81, "kind": "photo", "dark": true, "items": [{"at": 414.81, "text": "Scarcity needs restraint, and restraint is the exact opposite of helpful.", "color": "#C9A8E8", "size": 46}], "img": ["scene-28.png"]}, {"start": 418.68, "end": 426.61, "kind": "text", "dark": true, "items": [{"at": 418.68, "text": "Five gears, and they all grind for the same reason.", "color": "#C9A8E8", "size": 46}, {"at": 421.76, "text": "It was never a prompt problem.", "color": "#E3B341", "size": 46}, {"at": 424.04, "text": "No prompt is going to give a model a spine.", "color": "#E3B341", "size": 46}]}, {"start": 427.56, "end": 433.17, "kind": "collage", "dark": false, "items": [{"at": 429.17, "text": "Which brings me to the fix, and I want to end on something useful, not just a diagnosis.", "color": "#131313", "size": 46}], "img": ["scene-30.png"]}, {"start": 433.27, "end": 437.84, "kind": "photo", "dark": false, "items": [{"at": 433.84, "text": "The community already found the workaround, even if nobody framed it this way.", "color": "#131313", "size": 46}], "img": ["scene-29.png"]}, {"start": 437.71, "end": 443.24, "kind": "photo", "dark": false, "items": [{"at": 439.24, "text": "People say AI novels start lying to themselves around chapter fifteen or twenty.", "color": "#131313", "size": 46}], "img": ["scene-30.png"]}, {"start": 443.11, "end": 456.08, "kind": "collage", "dark": false, "items": [{"at": 452.08, "text": "And the fix they keep landing on is a story bible: a document outside the story that holds every rule, every cost, every dead character, and checking the output against it, scene by scene.", "color": "#131313", "size": 40}], "img": ["scene-29.png"]}, {"start": 455.95, "end": 463.71, "kind": "text", "dark": false, "items": [{"at": 455.95, "text": "That's not a hack.", "color": "#131313", "size": 112}, {"at": 459.71, "text": "That's the Second Law, enforced from the outside, because the model can't enforce it from the inside.", "color": "#D64541", "size": 40}]}, {"start": 463.58, "end": 471.67, "kind": "photo", "dark": false, "items": [{"at": 467.67, "text": "So next time an AI hands you a beautiful magic system with sixteen metals and a currency of souls, count the limitations.", "color": "#131313", "size": 40}], "img": ["scene-29.png"]}, {"start": 471.54, "end": 478.35, "kind": "collage", "dark": false, "items": [{"at": 474.35, "text": "Ask what it costs, who can use it, what happens when someone cheats, and where the fuel comes from.", "color": "#131313", "size": 40}], "img": ["scene-30.png"]}, {"start": 478.22, "end": 485.19, "kind": "chat", "dark": false, "items": [{"at": 481.19, "text": "If the answers are \"nothing, everyone, nothing, and anywhere,\" you're not holding a magic system.", "color": "#131313", "size": 40}]}, {"start": 485.06, "end": 489.67, "kind": "photo", "dark": false, "items": [{"at": 485.06, "text": "You're holding a special effect.", "color": "#131313", "size": 46}, {"at": 486.94, "text": "Sanderson spent a career proving the difference.", "color": "#D64541", "size": 46}], "img": ["scene-29.png"]}, {"start": 489.54, "end": 497.63, "kind": "collage", "dark": false, "items": [{"at": 493.63, "text": "And now, for the first time, we get to watch a machine fail the same test, in the same five places, every single time.", "color": "#131313", "size": 40}], "img": ["scene-29.png"]}];
// --- narration sections (audio placement) ---
const SECTIONS: { at: number; file: string }[] = [{"at": 0.0, "file": "sanderson/narration/s1.mp3"}, {"at": 73.59, "file": "sanderson/narration/s2.mp3"}, {"at": 128.73, "file": "sanderson/narration/s3.mp3"}, {"at": 209.44, "file": "sanderson/narration/s4.mp3"}, {"at": 262.58, "file": "sanderson/narration/s5.mp3"}, {"at": 304.84, "file": "sanderson/narration/s6.mp3"}, {"at": 383.97, "file": "sanderson/narration/s7.mp3"}, {"at": 427.56, "file": "sanderson/narration/s8.mp3"}];
// --- SFX timed to events (v10: every item entrance + every scene transition; 104 events, max gap 6.67s) ---
const SFX: { at: number; file: string; vol?: number }[] = [{"at": 0.0, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 3.07, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 5.37, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 8.74, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.36}, {"at": 12.27, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 16.14, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 18.21, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 20.2, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 22.9, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 25.4, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 29.42, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 33.12, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 36.99, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 40.48, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 44.35, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 46.38, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 50.88, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 54.75, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 59.51, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 61.87, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 62.02, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 64.31, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 66.03, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 66.18, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 69.51, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 73.59, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 78.43, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 82.3, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 82.45, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 84.44, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 86.35, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 88.42, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 94.31, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 98.18, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 99.77, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 101.73, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 104.2, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 107.04, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 109.26, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 112.91, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.36}, {"at": 116.72, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 120.59, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 123.3, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 125.37, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 128.73, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 128.88, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 132.21, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 136.08, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 138.36, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 141.06, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 143.88, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 147.9, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 154.63, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.36}, {"at": 161.52, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 165.39, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 165.54, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 167.05, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 169.96, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 175.34, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 179.36, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 182.02, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 185.89, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 186.04, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 189.84, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 193.89, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.36}, {"at": 198.1, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 201.97, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 202.12, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 204.01, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 206.48, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 209.44, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 209.59, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 211.55, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 214.39, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 214.54, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 219.48, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 223.5, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 224.0, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 227.87, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 230.94, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 234.0, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.36}, {"at": 237.2, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 241.07, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 241.22, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 243.67, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 246.53, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 250.5, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 250.65, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 255.02, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 257.29, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 257.63, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 262.58, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 262.73, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 265.42, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 269.44, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 271.14, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 275.16, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 277.66, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 281.53, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 281.68, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 284.93, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 287.21, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 287.36, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 291.85, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 295.72, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 298.24, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 300.84, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 304.84, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 304.99, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 306.95, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 310.11, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 311.93, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 314.67, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 318.54, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 322.9, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 324.78, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 324.93, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 327.25, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 331.12, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 335.0, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 337.22, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 339.08, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 342.95, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 343.1, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 345.5, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 348.1, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 350.21, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 352.95, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 356.82, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 356.97, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 359.13, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 362.04, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 367.18, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 371.2, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 374.82, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 378.84, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 379.02, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 383.97, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 388.07, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 392.41, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 396.28, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 396.43, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 399.76, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 401.96, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 402.11, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 405.61, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 409.63, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 410.13, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 414.15, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 414.81, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 418.68, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 421.76, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 424.04, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 427.71, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 429.17, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 433.42, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 433.84, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 437.86, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 439.24, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 443.26, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 447.6, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.36}, {"at": 452.08, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 455.95, "file": "sanderson/sfx/ping_pop.mp3", "vol": 0.36}, {"at": 456.1, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 459.71, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}, {"at": 463.73, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 467.67, "file": "sanderson/sfx/pen_tick.mp3", "vol": 0.42}, {"at": 471.69, "file": "sanderson/sfx/deep_whoosh.mp3", "vol": 0.32}, {"at": 474.35, "file": "sanderson/sfx/keyboard_tap.mp3", "vol": 0.42}, {"at": 478.37, "file": "sanderson/sfx/page_flip.mp3", "vol": 0.32}, {"at": 481.19, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 485.06, "file": "sanderson/sfx/paper_rustle.mp3", "vol": 0.42}, {"at": 486.94, "file": "sanderson/sfx/dull_click.mp3", "vol": 0.36}, {"at": 489.63, "file": "sanderson/sfx/soft_bell.mp3", "vol": 0.4}, {"at": 492.63, "file": "sanderson/sfx/warm_chime.mp3", "vol": 0.4}, {"at": 493.63, "file": "sanderson/sfx/ting_chime.mp3", "vol": 0.36}];
// images that cut cleanly along the subject (rembg)
const CUTOUT_OK = ["scene-1.png", "scene-3.png", "scene-4.png", "scene-6.png", "scene-7.png", "scene-11.png", "scene-12.png", "scene-13.png", "scene-15.png", "scene-21.png", "scene-22.png", "scene-25.png", "scene-28.png", "scene-29.png", "scene-30.png"];
const FLAT_SENTENCES = Object.values(TIMELINE)
  .flat()
  .map((s: any) => ({ start: s.start, end: s.end, text: s.text }));

// ---------------------------------------------------------------------------
// shared text item renderer
// ---------------------------------------------------------------------------
const ItemText: React.FC<{ item: Item; sceneStart: number; sceneEnd: number; dark?: boolean; y?: number; align?: "center" | "left" | "right" }> = ({
  item,
  sceneStart,
  sceneEnd,
  dark = false,
  y = 40,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame); // v10: item text steps on-twos (12fps editorial)
  const f0 = Math.max(0, vf - item.at * fps);
  if (vf < item.at * fps) return null;
  const appear = easeOut(f0, 7);
  const out = easeOut(vf - (sceneEnd - 0.5) * fps, 6);
  const opacity = Math.min(appear, 1 - Math.max(0, vf - (sceneEnd - 0.5) * fps) / 6);
  // v10: solid accent plaque for hero items (S3/S4 — bold saturated blocks);
  // smaller items keep a translucent accent chip on paper.
  const accent = item.color ? resolveAccent(item.color, dark) : null;
  const isHero = (item.size ?? 56) >= 42 && accent !== null;
  const chipBg = isHero
    ? accent!
    : accent
      ? hexToRgba(accent, dark ? 0.24 : 0.16)
      : dark
        ? "rgba(255,255,255,0.08)"
        : "rgba(247,241,226,0.92)";
  const chipColor = isHero
    ? accent === VOX_YELLOW || accent === "#C77F00"
      ? INK
      : "#FFFFFF"
    : accent ?? (dark ? "#F5F0E8" : INK);
  return (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? "50%" : `${align === "left" ? 14 : 86}%`,
        top: `${y}%`,
        transform: `translate(${align === "center" ? "-50%" : align === "left" ? "0" : "-100%"}, -50%) rotate(${-0.8 + Math.sin(item.at) * 0.4}deg)`,
        opacity,
        zIndex: 6,
        textAlign: align,
      }}
    >
      <span
        style={{
          fontFamily: ARCHIVO,
          fontWeight: 400,
          fontSize: item.size ?? 56,
          color: chipColor,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          display: "block",
          background: chipBg,
          padding: isHero ? "18px 42px" : "6px 16px",
          borderRadius: isHero ? 6 : 3,
          whiteSpace: "pre-wrap",
          textShadow: "none",
          boxShadow: isHero ? "0 4px 14px rgba(0,0,0,0.28)" : "0 2px 8px rgba(60,45,20,0.18)",
        }}
      >
        {item.text}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PATTERN VIEWS
// ---------------------------------------------------------------------------

const PhotoView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const imgName = s.img![0];
  const from = (s.motion as any) === "slideR" ? "right" : "left";
  const isCutout = CUTOUT_OK.includes(imgName);
  const n = s.items.length;
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {isCutout ? (
        <SubjectCutout
          id={`sc-${s.start}`}
          src={staticFile(`sanderson/cutouts/${imgName.replace(/\.(png|jpg|jpeg)$/, ".png")}`)}
          x={from === "right" ? 66 : 34}
          y={47}
          width={s.dark ? 60 : 56}
          rotate={from === "right" ? 2.2 : -2.2}
          entrance={s.start + 0.2}
          from={from}
          tone="saturate(1.2) contrast(1.15) brightness(0.95)"
          offsetStroke
          offset={s.dark ? 6 : 8}
          halftone
          halftoneDark={s.dark}
          z={4}
        />
      ) : (
        <PhotoCard
          id={`ph-${s.start}`}
          src={IMG(imgName)}
          x={from === "right" ? 66 : 34}
          y={47}
          width={s.dark ? 54 : 50}
          rotate={from === "right" ? 1.2 : -1.2}
          seed={5 + Math.round(s.start)}
          entrance={s.start + 0.2}
          from={from}
          aspect={1.3}
        />
      )}
      <WashiTape x={from === "right" ? 88 : 14} y={12} angle={from === "right" ? -24 : 24} seed={7 + Math.round(s.start)} />
      {/* items: first on top-right, rest stacked below it */}
      {s.items.map((it, i) => (
        <ItemText
          key={i}
          item={it}
          sceneStart={s.start}
          sceneEnd={s.end}
          dark={s.dark}
          y={i === 0 ? 16 : 30 + i * 12}
          align={from === "right" ? "left" : "right"}
        />
      ))}
    </AbsoluteFill>
  );
};

const TextView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={Math.min(70, 30 + i * 17)} />
      ))}
      {/* yellow underline sweep under last big item */}
      {s.items.length > 1 ? (
        <HighlightSweep
          start={s.items[s.items.length - 1].at + 0.3}
          end={s.items[s.items.length - 1].at + 1.3}
          x={14}
          y={Math.min(70, 30 + (s.items.length - 1) * 17) + 7}
          width={76}
          height={40}
          rotate={-0.4}
          dark={s.dark}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const ChipsView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      {s.items.map((it, i) => (
        <div key={i} style={{ position: "absolute", left: "50%", top: `${30 + i * 15}%`, transform: "translateX(-50%)", zIndex: 6 }}>
          <ItemText item={it} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={0} />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "120%",
              height: "140%",
              transform: "translate(-50%, -50%) rotate(-0.5deg)",
              background: it.color === VOX_YELLOW ? VOX_YELLOW : s.dark ? "#262B30" : "#FAF7EF",
              opacity: easeOut(Math.max(0, f - it.at * 30), 6) * 0.9,
              zIndex: -1,
              borderRadius: 60,
            }}
          />
        </div>
      ))}
      {s.caption ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "88%",
            transform: "translate(-50%, -50%)",
            opacity: easeOut(Math.max(0, f - (s.start + (s.end - s.start) * 0.6) * 30), 8),
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: resolveAccent(VOX_YELLOW, s.dark ?? false),
            zIndex: 6,
          }}
        >
          → {s.caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const ChatView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const mid = s.start + (s.end - s.start) * 0.5;
  const last = s.items[s.items.length - 1];
  const isHighlight = last?.sub === "highlight";
  return (
    <AbsoluteFill>
      <PaperBg frame={f} />
      {/* human line (first item) */}
      <TornFrame id={`ch1-${s.start}`} x={50} y={34} width={46} aspect={4.4} rotate={-1} seed={3} innerPad={3} entrance={s.start + 0.2} from="left">
        <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 32, color: INK, display: "flex", alignItems: "center", height: "100%", paddingLeft: "4%" }}>
          <span style={{ fontFamily: MONO, fontSize: 16, color: "#8A8F94", marginRight: 14 }}>you</span>
          {s.items[0]?.text}
        </div>
      </TornFrame>
      {/* ai line (last item) */}
      <TornFrame id={`ch2-${s.start}`} x={50} y={60} width={52} aspect={4.4} rotate={1.1} seed={9} innerPad={3} entrance={mid} from="right">
        <div style={{ position: "relative", fontFamily: MONO, fontSize: 26, color: INK, display: "flex", alignItems: "center", height: "100%", paddingLeft: "4%", lineHeight: 1.5 }}>
          <span style={{ fontFamily: MONO, fontSize: 16, color: "#8A8F94", marginRight: 14 }}>ai</span>
          {isHighlight ? <HighlightSweep start={last.at + 0.2} end={last.at + 1.2} x={-4} y={46} width={108} height={40} rotate={-0.4} dark={false} /> : null}
          <span style={{ position: "relative", zIndex: 2 }}>{last.text}</span>
        </div>
      </TornFrame>
      <MonoLabel text="chat window — 3:07 am" x={9} y={86} start={s.start + 0.4} />
    </AbsoluteFill>
  );
};

const CollageView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const main = s.img![0];
  const small = s.img![1];
  const mainCut = CUTOUT_OK.includes(main);
  const smallCut = small ? CUTOUT_OK.includes(small) : false;
  const mainItems = s.items.slice(0, 2);
  const subItems = s.items.slice(2);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} />
      {mainCut ? (
        <SubjectCutout id={`cg1-${s.start}`} src={staticFile(`sanderson/cutouts/${main.replace(/\.(png|jpg|jpeg)$/, ".png")}`)} x={38} y={44} width={42} rotate={-2.4} entrance={s.start + 0.2} from="left" />
      ) : (
        <PhotoCard id={`cg1-${s.start}`} src={IMG(main)} x={38} y={44} width={44} aspect={1.1} rotate={-1.5} seed={19} entrance={s.start + 0.2} from="left" shape="circle" />
      )}
      {small ? (
        smallCut ? (
          <SubjectCutout id={`cg2-${s.start}`} src={staticFile(`sanderson/cutouts/${small.replace(/\.(png|jpg|jpeg)$/, ".png")}`)} x={72} y={64} width={24} rotate={3} entrance={s.start + 1.0} from="right" />
        ) : (
          <PhotoCard id={`cg2-${s.start}`} src={IMG(small)} x={72} y={62} width={28} aspect={1.2} rotate={2} seed={21} entrance={s.start + 1.0} from="right" shape="hex" />
        )
      ) : null}
      <WashiTape x={10} y={16} angle={22} seed={23} />
      {mainItems.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={i === 0 ? 12 : 26} />
      ))}
      {subItems.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={68 + i * 8} align="left" />
      ))}
    </AbsoluteFill>
  );
};

const CounterView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      {s.items.map((it, i) => (
        <TornFrame
          key={i}
          id={`cm-${s.start}-${i}`}
          x={50}
          y={26 + i * 20}
          width={62}
          aspect={5.6}
          rotate={i === 0 ? -1.4 : i === 1 ? 0.6 : -0.4}
          seed={23 + i}
          innerPad={3}
          entrance={it.at - s.start + 0.4}
          from={i % 2 === 0 ? "left" : "right"}
          dark={s.dark}
        >
          <div style={{ display: "flex", alignItems: "center", height: "100%", fontFamily: ARCHIVO, padding: "0 4%" }}>
            <span style={{ fontSize: 40, color: it.color, marginRight: "4%" }}>{it.text.split(" ")[0]}</span>
            <span style={{ fontSize: 30, color: s.dark ? "#F5F0E8" : INK }}>{it.text.split(" ").slice(1).join(" ")}</span>
          </div>
        </TornFrame>
      ))}
      <MonoLabel text="run every session" x={10} y={90} color={s.dark ? "#C9CDD1" : undefined} start={s.start + 1} />
    </AbsoluteFill>
  );
};

const IcebergView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = easeOut(Math.max(0, f - s.start * fps), 2.2 * fps);
  const zoom = 1.3 - reveal * 0.3;
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "60%",
          width: "56%",
          aspectRatio: "1.6",
          transform: `translate(-50%, -50%) scale(${zoom})`,
          opacity: reveal,
          filter: "drop-shadow(0 6px 10px rgba(60,45,20,0.35))",
          zIndex: 4,
        }}
      >
        <Img src={IMG(s.img![0])} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={i === 0 ? 10 : 22 + i * 11} />
      ))}
    </AbsoluteFill>
  );
};

const StatView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} />
      <TornFrame id={`st-${s.start}`} x={50} y={52} width={52} aspect={1.5} rotate={-0.8} seed={17} entrance={s.start + 0.6}>
        <Img src={IMG(s.img![0])} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </TornFrame>
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={i === 0 ? 10 : 24} />
      ))}
    </AbsoluteFill>
  );
};

const BubblesView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const first = s.items[0];
  const rest = s.items.slice(1);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      <ItemText item={first} sceneStart={s.start} sceneEnd={s.end} y={12} />
      <TornFrame id={`bb1-${s.start}`} x={32} y={50} width={34} aspect={1.5} rotate={-1.2} seed={29} entrance={s.start + 0.8} dark={s.dark}>
        <div style={{ fontFamily: INTER, fontSize: 28, color: s.dark ? "#F5F0E8" : INK, padding: "8%", lineHeight: 1.5, textAlign: "center", fontWeight: 700 }}>
          says A
        </div>
      </TornFrame>
      <TornFrame id={`bb2-${s.start}`} x={68} y={50} width={34} aspect={1.5} rotate={1.2} seed={31} entrance={s.start + 1.6} from="right" dark={s.dark}>
        <div style={{ fontFamily: INTER, fontSize: 28, color: s.dark ? "#F5F0E8" : INK, padding: "8%", lineHeight: 1.5, textAlign: "center", fontWeight: 700 }}>
          means B
        </div>
      </TornFrame>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 8,
          height: 70,
          background: resolveAccent(VOX_YELLOW, s.dark ?? false),
          opacity: easeOut(Math.max(0, f - (s.start + 2.2) * 30), 8) * 0.85,
          zIndex: 7,
        }}
      />
      {rest.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={70 + i * 9} />
      ))}
    </AbsoluteFill>
  );
};

const CtaView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={true} />
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} dark={true} y={i === 0 ? 42 : 68} />
      ))}
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ s: Scene }> = ({ s }) => {
  const content = (() => {
    switch (s.kind) {
      case "photo":
        return <PhotoView s={s} />;
      case "text":
        return <TextView s={s} />;
      case "chips":
        return <ChipsView s={s} />;
      case "chat":
        return <ChatView s={s} />;
      case "collage":
        return <CollageView s={s} />;
      case "counter":
        return <CounterView s={s} />;
      case "iceberg":
        return <IcebergView s={s} />;
      case "stat":
        return <StatView s={s} />;
      case "bubbles":
        return <BubblesView s={s} />;
      case "cta":
        return <CtaView s={s} />;
      default:
        return null;
    }
  })();
  // v10: chapter backdrop (shared per act) + continuous push-in on every scene
  const pushTo = s.push?.to ?? (s.kind === "photo" || s.kind === "collage" ? 1.18 : 1.1);
  return (
    <AbsoluteFill>
      <PushIn start={s.start} end={s.end} from={s.push?.from ?? 1.0} to={pushTo}>
        {content}
      </PushIn>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// VoxFull
// ---------------------------------------------------------------------------
export const VoxFull: React.FC<{ narration?: boolean; music?: boolean; sfx?: boolean }> = ({
  narration = true,
  music = true,
  sfx = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const scene = SCENES.find((b) => t >= b.start && t < b.end);

  return (
    <AbsoluteFill style={{ fontFamily: INTER, background: "#131313" }}>
      <FontsAndBase />
      {scene ? <SceneView s={scene} /> : <PaperBg frame={frame} />}
      <KaraokeSubtitle sentences={FLAT_SENTENCES} dark={scene?.dark} />
      <ImperfectionOverlay frame={frame} />
      {narration
        ? SECTIONS.map((sec) => (
            <Sequence key={sec.at} from={Math.round(sec.at * fps)}>
              <Audio src={staticFile(sec.file)} volume={1} />
            </Sequence>
          ))
        : null}
      {music ? <Audio src={staticFile("sanderson/background_music.mp3")} volume={0.05} loop /> : null}
      {sfx
        ? SFX.map((s) => (
            <Sequence key={s.at} from={Math.round(s.at * fps)}>
              <Audio src={staticFile(s.file)} volume={s.vol ?? 0.5} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};

export const VOX_FULL_DURATION = 498;
