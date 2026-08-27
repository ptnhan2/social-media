import React, { useEffect, useState } from "react";
import { delayRender, continueRender, staticFile } from "remotion";
import { getStyle } from "./styleLoader";

/**
 * Foundation typography (Phase 1 — design foundation, 2026-08-27).
 *
 * Fonts live in remotion-composer/public/fonts/ (render bundle) and
 * composer-app/public/fonts/ (Vite preview). Before this module existed the
 * treatments hardcoded "Arial, sans-serif" / "Arial Black" / "Georgia, serif"
 * in 21+ spots — system fonts were a root cause of the "ugly foundation"
 * (video #1 verdict). Fonts are now ROLE-based knobs in the style store
 * (fonts.display / fonts.body / fonts.editorial) so the agent can learn and
 * swap typefaces without touching code, and every existing editor doc picks
 * up font changes at render time (roles resolve here, never baked as
 * literal families in clip metadata).
 *
 * Registered faces (OFL licensed):
 *   Anton          — display candidate 1 (condensed, YouTube-title energy)
 *   Archivo Black  — display candidate 2 (wide grotesque)
 *   Inter variable — body (400..900 from one file)
 *   Lora italic    — editorial subtitles (variable 400..700)
 */

export type FontRole = "display" | "body" | "editorial";

export const FONT_ROLE_DEFAULTS: Record<FontRole, string> = {
  display: "'Anton', 'Archivo Black', 'Arial Black', sans-serif",
  body: "'Inter', Arial, sans-serif",
  editorial: "'Lora', Georgia, serif",
};

/** Legacy literal families baked into existing editor/current.json clips
 *  before roles existed — mapped to roles so old projects live-adopt the
 *  foundation fonts without regeneration. */
const LEGACY_FONT_ROLES: Record<string, FontRole> = {
  "Arial Black, Arial, sans-serif": "display",
  "Arial, sans-serif": "body",
  "Georgia, serif": "editorial",
};

/** Role -> full font stack, via the style store (live knob). */
export const fontStack = (role: FontRole): string =>
  getStyle<string>(`fonts.${role}`, FONT_ROLE_DEFAULTS[role]);

/** Resolve a clip's fontFamily metadata to a renderable stack.
 *  Accepts a role ("display"), a legacy literal ("Arial, sans-serif"),
 *  or passes through custom user-set families verbatim. */
export const resolveFontFamily = (value: string | undefined): string => {
  if (!value) return fontStack("body");
  if (value === "display" || value === "body" || value === "editorial") return fontStack(value);
  const legacy = LEGACY_FONT_ROLES[value];
  if (legacy) return fontStack(legacy);
  return value;
};

// ---- @font-face registration -------------------------------------------------

/** Static faces declare the full weight range so weight-900 requests use the
 *  file directly instead of applying synthetic bold (faux-bold). */
const FONT_FACE_CSS = `
@font-face {
  font-family: "Anton";
  src: url("${staticFile("fonts/anton-regular.ttf")}") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: "Archivo Black";
  src: url("${staticFile("fonts/archivo-black-latin.woff2")}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: "Inter";
  src: url("${staticFile("fonts/inter-var.ttf")}") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: "Lora";
  src: url("${staticFile("fonts/lora-italic-var.ttf")}") format("truetype");
  font-weight: 100 900;
  font-style: italic;
  font-display: block;
}
`;

/** Faces to explicitly load before first frame capture. Weight/style pairs
 *  mirror how the treatments actually request each family. Variable fonts
 *  clamp requested weights to their axis range (no synthetic bold). */
const FACES_TO_LOAD = [
  "400 20px Anton",
  "900 20px Anton",
  "400 20px 'Archivo Black'",
  "400 20px Inter",
  "700 20px Inter",
  "900 20px Inter",
  "italic 400 20px Lora",
  "italic 700 20px Lora",
  "italic 900 20px Lora",
];

let styleInjected = false;

const injectFontFaceStyle = () => {
  if (styleInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "isaacverse-font-faces";
  style.textContent = FONT_FACE_CSS;
  document.head.appendChild(style);
  styleInjected = true;
};

if (typeof document !== "undefined") injectFontFaceStyle();

/**
 * Mount once at the composition root (IsaacVerseEditVideo). Holds the first
 * frame until every registered face is loaded — without this, Remotion can
 * capture frames before the font files arrive and the first beats render in
 * the fallback system font. Mirrors the styleLoader delayRender pattern.
 * Safe outside a Remotion render (Player preview, jsdom tests): falls back
 * to a no-op when delayRender/fonts are unavailable.
 */
export const FontFaces: React.FC = () => {
  const [handle] = useState(() => {
    try {
      return delayRender("Loading foundation fonts", { timeoutInMilliseconds: 60000 });
    } catch {
      return null;
    }
  });

  useEffect(() => {
    injectFontFaceStyle();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts || handle === null) return;
    let cancelled = false;
    Promise.all(FACES_TO_LOAD.map((face) => fonts.load(face).catch(() => null)))
      .then(() => fonts.ready)
      .then(() => {
        if (!cancelled) continueRender(handle);
      })
      .catch(() => {
        if (!cancelled) continueRender(handle); // proceed with fallbacks
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return null;
};
