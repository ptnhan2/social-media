import fs from "node:fs";
import path from "node:path";

const workspace = path.resolve(import.meta.dirname, "..", "..");
const project = path.join(workspace, "projects", "isaacverse-final");
const files = [path.join(project, "05-edit-doc.json"), path.join(project, "edit/current.json"), ...fs.readdirSync(path.join(project, "edit/versions")).filter((name) => name.endsWith(".json")).map((name) => path.join(project, "edit/versions", name)), path.join(workspace, "remotion-composer/public/isaacverse-final/05-edit-doc.json")];

const migrate = (doc) => ({
  ...doc,
  beats: doc.beats.map((beat) => ({
    ...beat,
    elements: (beat.elements || []).map((element, index) => ({
      ...element,
      geometry: element.metadata?.canvasOverride === true && element.geometry ? element.geometry : geometryFor(beat, element, index),
      metadata: { ...(element.metadata || {}), canvasGeometryVersion: "semantic-v2", canvasOverride: element.metadata?.canvasOverride === true },
    })),
  })),
});

function geometryFor(beat, element, index) {
  const path = element.sourcePath || "";
  const nodeIndex = path.match(/nodes\[(\d+)\]/)?.[1];
  const node = nodeIndex === undefined ? null : beat.treatment.params.nodes?.[Number(nodeIndex)];
  if (node && typeof node.x === "number" && typeof node.y === "number") return { x: node.x / 100 * 960 - 110, y: node.y / 100 * 540 - 45, width: 220, height: 90, rotation: 0 };
  if (element.role === "proof-screen") return { x: 125, y: 65, width: 650, height: 370, rotation: -2 };
  if (element.role === "observer" || element.role === "host") return { x: 700, y: 245, width: 210, height: 250, rotation: 0 };
  if (element.role === "metaphor") return { x: 80, y: 80, width: 800, height: 390, rotation: 0 };
  if (element.role === "title") return { x: 120, y: 90, width: 700, height: 110, rotation: 0 };
  return { x: 100 + (index % 3) * 260, y: 100 + Math.floor(index / 3) * 135, width: 220, height: 80, rotation: 0 };
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const doc = migrate(JSON.parse(fs.readFileSync(file, "utf8")));
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify({ migrated: files.filter((file) => fs.existsSync(file)) }, null, 2));
