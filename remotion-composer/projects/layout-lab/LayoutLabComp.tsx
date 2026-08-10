// LayoutLabComp — renders a layout by id with dummy scene data
import React from "react";
import { AbsoluteFill } from "remotion";
import { PhotoLeft } from "../../shared/layouts/photo-left";
import { FullBleed } from "../../shared/layouts/full-bleed";
import { Asymmetric6040 } from "../../shared/layouts/asymmetric-6040";
import type { Scene } from "../../shared/types";

const DUMMY: Record<string, Scene> = {
  "photo-left": {
    start: 0, end: 6, kind: "photo-left", dark: false,
    img: ["scene-4.png"], motion: "slideL",
    items: [
      { at: 0.5, text: "MAGIC RUNS ON METALS", size: 64, color: "#4FC3F7" },
      { at: 2.5, text: "each one costs something", size: 46, color: "#B0BEC5" },
      { at: 4.0, text: "that's the point", size: 52, color: "#FF5252" },
    ],
  },
  "full-bleed": {
    start: 0, end: 6, kind: "full-bleed", dark: true,
    img: ["scene-21.png"],
    items: [
      { at: 0.5, text: "STORMLIGHT LEAKS", size: 64, color: "#A8D8FF" },
      { at: 2.5, text: "the weeping comes", size: 46, color: "#fff200" },
    ],
  },
  "asymmetric-6040": {
    start: 0, end: 6, kind: "asymmetric-6040", dark: false,
    img: ["scene-17.png"], motion: "slideL",
    items: [
      { at: 0.5, text: "AON DOR", size: 72, color: "#E3B341" },
      { at: 2.0, text: "draw it wrong", size: 46, color: "#2E74B5" },
      { at: 3.5, text: "the spell breaks", size: 46, color: "#D64541" },
    ],
  },
};

export const LayoutLabComp: React.FC<{ layoutId: string; dark?: boolean }> = ({ layoutId }) => {
  const scene = DUMMY[layoutId] ?? DUMMY["photo-left"];
  switch (layoutId) {
    case "photo-left": return <PhotoLeft s={scene} />;
    case "full-bleed": return <FullBleed s={scene} />;
    case "asymmetric-6040": return <Asymmetric6040 s={scene} />;
    default: return <AbsoluteFill style={{ background: "#333", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>Layout "{layoutId}" not found</AbsoluteFill>;
  }
};
