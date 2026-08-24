import { describe, expect, it } from "vitest";
import { CONTEXT_PRESENCE, resolveCharacterPresence } from "../../../shared/isaacverse/characterPresence";

describe("resolveCharacterPresence — nar-002 variety rotation", () => {
  it("consecutive beats with the same context get DIFFERENT framing (variant rotation by seed)", () => {
    const a = resolveCharacterPresence("process-timeline", {}, "give a repeatable process", undefined, 3.5);
    const b = resolveCharacterPresence("process-timeline", {}, "repeatable workflow steps", undefined, 7.2);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const differs = a!.position !== b!.position || a!.motion !== b!.motion || a!.size !== b!.size;
    expect(differs).toBe(true);
  });

  it("same seed + same context → identical config (deterministic across both render paths)", () => {
    const a = resolveCharacterPresence("semantic-diagram", {}, "reframe the unit of editing", undefined, 3.5);
    const b = resolveCharacterPresence("semantic-diagram", {}, "reframe the unit of editing", undefined, 3.5);
    expect(a).toEqual(b);
  });

  it("explicit params.characterPresence override wins over rotation", () => {
    const cfg = resolveCharacterPresence(
      "process-timeline",
      { characterPresence: { pose: "celebrate", position: "center", size: "half" } },
      "give a repeatable process",
      undefined,
      3.5,
    );
    expect(cfg).toMatchObject({ pose: "celebrate", position: "center", size: "half" });
  });

  it("every context entry has 2-3 variants, all fully specified (pose+position+motion+size)", () => {
    expect(CONTEXT_PRESENCE.length).toBeGreaterThanOrEqual(7);
    for (const entry of CONTEXT_PRESENCE) {
      expect(entry.variants.length).toBeGreaterThanOrEqual(2);
      expect(entry.variants.length).toBeLessThanOrEqual(3);
      for (const v of entry.variants) {
        expect(v.pose).toBeTruthy();
        expect(v.position).toBeTruthy();
        expect(v.motion).toBeTruthy();
        expect(v.size).toBeTruthy();
      }
    }
  });

  it("variants within an entry are pairwise distinct (no duplicate framings)", () => {
    for (const entry of CONTEXT_PRESENCE) {
      const keys = entry.variants.map((v) => `${v.pose}|${v.position}|${v.motion}|${v.size}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("store gate disabled → null regardless of context/seed", () => {
    const cfg = resolveCharacterPresence("semantic-diagram", {}, "reframe", () => ({ enabled: false }), 3.5);
    expect(cfg).toBeNull();
  });
});
