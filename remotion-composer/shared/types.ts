// 04-visual/types.ts — shared types for layouts + scene data
// Every layout component accepts a Scene; every video's scene data conforms.

export type Item = {
  at: number;       // absolute seconds — when the item appears
  text: string;
  color?: string;   // hex accent (resolved per-chapter palette)
  size?: number;    // px at 1080p
  sub?: string;     // optional: "highlight" for chat emphasis
};

export type Scene = {
  start: number;
  end: number;
  kind: string;            // layout id (must match registry)
  img?: string[];          // image filenames (with .png)
  dark?: boolean;
  items: Item[];
  caption?: string;
  chips?: string[];
  motion?: string;         // "slideL" | "slideR" | ...
  push?: { from?: number; to?: number };
};

export type Palette = {
  dark: boolean;
  a0: string;  // primary accent
  a1: string;  // secondary accent
  a2: string;  // tertiary accent
  bg: string;  // chapter backdrop image
};
