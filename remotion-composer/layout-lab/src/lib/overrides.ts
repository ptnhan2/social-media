// lib/overrides.ts — element geometry overrides + element registration (no circular deps)
import React from "react";

export type Overrides = {
  img?: { x?: number; y?: number; width?: number; rotate?: number };
  items?: { y?: number; size?: number; color?: string }[];
};

// Layouts register their RENDERED geometry so the editor can draw exact handles.
export type ElementGeom = { key: string; x: number; y: number; w: number; h: number };

type CtxValue = {
  overrides: Overrides;
  register: (el: ElementGeom) => void;
};

const OverridesCtx = React.createContext<CtxValue>({ overrides: {}, register: () => {} });
export const OverridesProvider = OverridesCtx.Provider;
export const useOverrides = (): Overrides => React.useContext(OverridesCtx).overrides;
export const useRegister = () => React.useContext(OverridesCtx).register;

// Helper: apply item overrides to an item
export const applyItemOv = (it: any, ov: Overrides, i: number) => {
  const o = ov.items?.[i];
  if (!o) return it;
  return { ...it, size: o.size ?? it.size, color: o.color ?? it.color };
};
