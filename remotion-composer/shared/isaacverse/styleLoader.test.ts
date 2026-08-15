import { describe, test, expect } from "vitest";
import { getStyle, setActiveStyle, defaultStroke } from "./styleLoader";
import originalStyle from "./isaacverse-style.json";

describe("styleLoader", () => {
  test("getStyle returns value from imported JSON", () => {
    const mode = getStyle<string>("treatments.semantic-diagram.edge.stroke.mode", "solid");
    expect(mode).toBe("solid");
  });

  test("setActiveStyle changes what getStyle returns", () => {
    const original = getStyle<string>("treatments.semantic-diagram.edge.stroke.mode", "solid");
    expect(original).toBe("solid");

    setActiveStyle({
      treatments: {
        "semantic-diagram": { edge: { stroke: { mode: "gradient" } } },
      },
    } as Record<string, unknown>);

    const updated = getStyle<string>("treatments.semantic-diagram.edge.stroke.mode", "solid");
    expect(updated).toBe("gradient");

    // Reset to imported style
    setActiveStyle(originalStyle as Record<string, unknown>);
  });

  test("getStyle returns fallback for missing path", () => {
    const val = getStyle<string>("treatments.nonexistent.knob", "default");
    expect(val).toBe("default");
  });

  test("defaultStroke has correct shape", () => {
    expect(defaultStroke.mode).toBe("solid");
    expect(defaultStroke.gradientStops).toHaveLength(2);
    expect(defaultStroke.brushDasharray).toBeTruthy();
  });

  test("chapter-card knobs are readable", () => {
    const fontSize = getStyle<number>("treatments.chapter-card.title.fontSizeShort", 96);
    expect(fontSize).toBe(96);
  });

  test("host-reflection knobs are readable", () => {
    const filter = getStyle<string>("treatments.host-reflection.filter", "");
    expect(filter).toContain("saturate");
  });
});
