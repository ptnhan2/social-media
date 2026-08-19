import { delayRender, continueRender, staticFile } from "remotion";

// The style store is loaded at RUNTIME via fetch (not webpack-bundled) so that
// style-knob edits always take effect on the next render. Bundling the JSON
// (the previous `import externalStyle from "./isaacverse-style.json"`) let
// webpack's persistent cache serve a stale module, so edits silently never
// reached the render. Fetching from public/ at render time bypasses that cache.
// render-window.mjs / render_window copy the current style JSON to
// remotion-composer/public/isaacverse-style.json before each render.

let activeStyle: Record<string, unknown> = {};
let loaded = false;
let loadError: string | null = null;
const handle = delayRender("Loading isaacverse-style.json");

fetch(staticFile("isaacverse-style.json"))
  .then((r) => {
    if (!r.ok) throw new Error(`style fetch failed: ${r.status}`);
    return r.json();
  })
  .then((s: Record<string, unknown>) => {
    activeStyle = s;
    loaded = true;
    console.log("[STYLE] loaded ok, fontSizeShort=" + getStyle("treatments.chapter-card.title.fontSizeShort", -1) + " damping=" + getStyle("treatments.semantic-diagram.entrance.damping", -1));
    continueRender(handle);
  })
  .catch((e: unknown) => {
    loadError = e instanceof Error ? e.message : String(e);
    console.error("[STYLE] LOAD FAILED: " + loadError);
    continueRender(handle); // proceed with empty style (fallbacks apply)
  });

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

export const isStyleLoaded = () => loaded;
export const styleLoadError = () => loadError;

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
