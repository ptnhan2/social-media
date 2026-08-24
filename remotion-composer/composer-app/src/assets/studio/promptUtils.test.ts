import { describe, expect, it } from "vitest";
import { buildSubstitutions, defaultFields, normalizeOptions, optionLabel, optionPrompt, resolvePrompt } from "./promptUtils";
import type { Recipe, RecipeField } from "./promptUtils";

const recipe: Recipe = {
  label: "Character Head",
  description: "",
  fields: [
    { name: "style", label: "Style", type: "choice", options: ["comic ink", "flat vector"] },
    { name: "expression", label: "Expression", type: "choice", options: ["friendly", "confident"] },
    { name: "accessory", label: "Accessory", type: "choice", options: ["none", "glasses", "cap"], optional: true },
    { name: "angle", label: "Angle", type: "choice", options: ["front facing"] },
  ],
  promptTemplate:
    "A {{style}} head, {{expression}} expression, {{angle}}. {{#accessory}}Wearing {{accessory}}. {{/accessory}}Bold outlines.",
};

describe("resolvePrompt", () => {
  it("substitutes fields", () => {
    const p = resolvePrompt("A {{style}} head, {{expression}}.", { style: "comic ink", expression: "friendly" });
    expect(p).toBe("A comic ink head, friendly.");
  });

  it("keeps optional block when field is set", () => {
    const fields = { ...defaultFields(recipe), accessory: "glasses" };
    const p = resolvePrompt(recipe.promptTemplate!, fields);
    expect(p).toContain("Wearing glasses.");
    expect(p).toContain("A comic ink head");
  });

  it("drops optional block when field is none", () => {
    const fields = defaultFields(recipe); // accessory = none
    const p = resolvePrompt(recipe.promptTemplate!, fields);
    expect(p).not.toContain("Wearing");
    expect(p).toBe("A comic ink head, friendly expression, front facing. Bold outlines.");
  });

  it("matches server output shape for the real character-head template", () => {
    const tpl =
      "A {{style}} cartoon character head of a young man, {{expression}} expression, {{angle}}. {{#accessory}}Wearing {{accessory}}. {{/accessory}}Short dark hair, big expressive eyes. Bold outlines, cel shading, warm orange and amber color palette. Floating on pure white background. ONLY the head — nothing below the jawline. Like an emoji or avatar icon.";
    const withCap = resolvePrompt(tpl, { style: "comic ink", expression: "friendly", accessory: "cap", angle: "front facing" });
    expect(withCap).toContain("Wearing cap.");
    const noAccessory = resolvePrompt(tpl, { style: "comic ink", expression: "friendly", accessory: "none", angle: "front facing" });
    expect(noAccessory).not.toContain("Wearing");
    expect(noAccessory).toContain("ONLY the head");
  });
});

describe("defaultFields", () => {
  it("picks first option per field", () => {
    const d = defaultFields(recipe);
    expect(d).toEqual({ style: "comic ink", expression: "friendly", accessory: "none", angle: "front facing" });
  });
});

describe("option prompts", () => {
  const field: RecipeField = {
    name: "style",
    label: "Art Style",
    type: "choice",
    options: [
      { label: "comic ink", prompt: "bold black ink outlines, cel shading" },
      { label: "flat vector", prompt: "flat vector illustration, solid colors" },
    ],
  };

  it("optionLabel/optionPrompt read both shapes", () => {
    expect(optionLabel("watercolor")).toBe("watercolor");
    expect(optionPrompt("watercolor")).toBe("watercolor");
    expect(optionLabel(field.options[0])).toBe("comic ink");
    expect(optionPrompt(field.options[0])).toBe("bold black ink outlines, cel shading");
  });

  it("normalizeOptions converts plain strings", () => {
    expect(normalizeOptions(["a", { label: "b", prompt: "bp" }])).toEqual([
      { label: "a", prompt: "a" },
      { label: "b", prompt: "bp" },
    ]);
  });

  it("buildSubstitutions maps selected label → option prompt", () => {
    const subs = buildSubstitutions({ style: "comic ink" }, [field]);
    expect(subs.style).toBe("bold black ink outlines, cel shading");
    // unknown selection falls back to raw value
    const subs2 = buildSubstitutions({ style: "watercolor" }, [field]);
    expect(subs2.style).toBe("watercolor");
  });

  it("resolved prompt uses the option's prompt text", () => {
    const resolved = resolvePrompt("A {{style}} head.", buildSubstitutions({ style: "comic ink" }, [field]));
    expect(resolved).toBe("A bold black ink outlines, cel shading head.");
  });
});
