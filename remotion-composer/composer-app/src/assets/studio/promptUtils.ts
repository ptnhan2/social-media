/**
 * Client-side recipe prompt resolution — mirrors the server-side logic in
 * asset_api.py op_generate, so what the user SEES is exactly what gets sent.
 *
 * Options carry their OWN prompt text (not just a label): selecting
 * "comic ink" substitutes its style description into {{style}}.
 */

export interface FieldOption {
  label: string;
  prompt: string;
}

export interface RecipeField {
  name: string;
  label: string;
  type: string;
  options: (string | FieldOption)[];
  optional?: boolean;
}

export interface Recipe {
  label: string;
  description: string;
  enabled?: boolean;
  fields: RecipeField[];
  promptTemplate?: string;
  /** Legacy flat user preset (prompt without placeholders) — treated as a template with no fields. */
  prompt?: string;
  user?: boolean;
  /** Saved field selections (user recipes). */
  defaults?: Record<string, string>;
}

export function optionLabel(option: string | FieldOption): string {
  return typeof option === "string" ? option : option.label;
}

export function optionPrompt(option: string | FieldOption): string {
  return typeof option === "string" ? option : option.prompt || option.label;
}

/** Normalize any options shape to {label, prompt} objects. */
export function normalizeOptions(options: (string | FieldOption)[]): FieldOption[] {
  return options.map((o) => (typeof o === "string" ? { label: o, prompt: o } : { label: o.label, prompt: o.prompt || o.label }));
}

/**
 * Build the substitution map: each field's SELECTED OPTION LABEL maps to that
 * option's prompt text (falls back to the raw selection when unknown).
 */
export function buildSubstitutions(selections: Record<string, string>, fields: RecipeField[]): Record<string, string> {
  const out: Record<string, string> = { ...selections };
  for (const def of fields) {
    const selected = selections[def.name];
    if (selected == null) continue;
    const opt = normalizeOptions(def.options).find((o) => o.label === selected);
    out[def.name] = opt ? opt.prompt : selected;
  }
  return out;
}

/** Resolve {{field}} substitutions + {{#field}}...{{/field}} optional blocks. */
export function resolvePrompt(template: string, substitutions: Record<string, string>): string {
  let p = template;
  // optional blocks: keep inner content only when the field is set and not "none"
  p = p.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, name: string, inner: string) => {
    const v = substitutions[name];
    return v && v !== "none" ? inner : "";
  });
  for (const [k, v] of Object.entries(substitutions)) {
    p = p.split(`{{${k}}}`).join(v);
  }
  return p
    .replace(/\bWearing none\.\s*/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s*\./g, ".")
    .trim();
}

/** Default field values: saved defaults ?? first option label. */
export function defaultFields(recipe: Recipe): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const f of recipe.fields) {
    defaults[f.name] = recipe.defaults?.[f.name] ?? optionLabel(f.options[0]);
  }
  return defaults;
}
