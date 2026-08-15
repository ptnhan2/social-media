const seedStyle = {
  colors: { amber: "#f2b84b", cyan: "#61d7e8", paper: "#f4e8cf", black: "#07090d" },
  treatments: {
    "semantic-diagram": {
      edge: {
        stroke: {
          mode: "solid" as const,
          color: "rgba(242,184,75,0.58)",
          width: 2,
          linecap: "round",
          gradientStops: ["#7fd8e8", "#f2d58a"],
          brushDasharray: "3 1 5 2",
        },
      },
    },
    "chapter-card": {
      title: { fontSizeLong: 82, fontSizeShort: 96, lineHeight: 1.08, fontWeight: 900 },
      accentLine: { height: 5, maxWidth: 190 },
      reveal: { inDurationSec: 0.45, lineStartSec: 0.15, lineEndSec: 0.8 },
    },
  },
};

let activeStyle: Record<string, unknown> = seedStyle as unknown as Record<string, unknown>;

export function getStyle<T>(path: string, fallback: T): T {
  const parts = path.split(".");
  let val: unknown = activeStyle;
  for (const p of parts) {
    if (val == null || typeof val !== "object") return fallback;
    val = (val as Record<string, unknown>)[p];
  }
  return (val ?? fallback) as T;
}

export function setActiveStyle(style: Record<string, unknown>): void {
  activeStyle = style;
}

export type StrokeStyle = {
  mode: "solid" | "gradient" | "brush";
  color: string;
  width: number;
  linecap: string;
  gradientStops: string[];
  brushDasharray: string;
};

export const defaultStroke: StrokeStyle = {
  mode: "solid",
  color: "rgba(242,184,75,0.58)",
  width: 2,
  linecap: "round",
  gradientStops: ["#7fd8e8", "#f2d58a"],
  brushDasharray: "3 1 5 2",
};
