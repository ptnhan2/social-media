// lib/registry.ts — types + API client for registry.json
export type VariantOption = {
  id: string; name: string; status: string;
  use_count: number; reject_count: number;
  sub_variants?: { id: string; params: Record<string, unknown> }[];
  params?: Record<string, unknown>;
};
export type VariantPool = { selected: string; options: VariantOption[] };
export type LayoutItem = {
  id: string; name: string; element_count: number | string;
  composition_type: string; narrative_role: string; tags: string[];
  status: string; use_count: number; reject_count: number;
  used_in: string[]; preview: string | null; jitter: Record<string, any>;
  variant_pools: Record<string, VariantPool>;
};
export type Registry = { version: string; items: LayoutItem[]; stats: Record<string, number> };

export async function getRegistry(): Promise<Registry> {
  return (await fetch("/api/registry")).json();
}
export async function vote(id: string, dir: "up" | "down"): Promise<Registry> {
  return (await fetch("/api/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, vote: dir }) })).json();
}
export async function selectVariant(layoutId: string, pool: string, variantId: string): Promise<Registry> {
  return (await fetch("/api/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layoutId, pool, variantId }) })).json();
}
