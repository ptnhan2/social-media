/**
 * Client-side recipe prompt resolution — mirrors the server-side logic in
 * asset_api.py op_generate, so what the user SEES in the prompt box is
 * exactly what gets sent (WYSIWYG).
 */

export interface RecipeField {
  name: string;
  label: string;
  type: string;
  options: string[];
  optional?: boolean;
}

export interface Recipe {
  label: string;
  description: string;
  enabled?: boolean;
  fields: RecipeField[];
  promptTemplate?: string;
  /** User preset: fixed prompt, no fields. */
  prompt?: string;
  user?: boolean;
}

/** Resolve {{field}} substitutions + {{#field}}...{{/field}} optional blocks. */
export function resolvePrompt(template: string, fields: Record<string, string>): string {
  let p = template;
  // optional blocks: keep inner content only when the field is set and not "none"
  p = p.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, name: string, inner: string) => {
    const v = fields[name];
    return v && v !== "none" ? inner : "";
  });
  for (const [k, v] of Object.entries(fields)) {
    p = p.split(`{{${k}}}`).join(v);
  }
  return p
    .replace(/\bWearing none\.\s*/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s*\./g, ".")
    .trim();
}

/** Default field values (first option) for a recipe. */
export function defaultFields(recipe: Recipe): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const f of recipe.fields) defaults[f.name] = f.options[0];
  return defaults;
}
