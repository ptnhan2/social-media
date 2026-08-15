import externalStyle from "./isaacverse-style.json";

let activeStyle: Record<string, unknown> = externalStyle as unknown as Record<string, unknown>;

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
