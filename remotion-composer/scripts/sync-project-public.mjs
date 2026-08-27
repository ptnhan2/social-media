import fs from "node:fs";
import path from "node:path";

const [, , slug = "isaacverse-final"] = process.argv;
const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");
const projectDir = path.join(workspaceRoot, "projects", slug);
const publicDir = path.join(workspaceRoot, "remotion-composer", "public", slug);

// edit-doc: the generator + renderer fetch this at runtime
const docSource = path.join(projectDir, "05-edit-doc.json");
const docDestination = path.join(publicDir, "05-edit-doc.json");
fs.mkdirSync(path.dirname(docDestination), { recursive: true });
fs.copyFileSync(docSource, docDestination);

// media dirs the UI preview and renders resolve via staticFile — synced
// wholesale so new artifacts (voice stems, audio, images) are available
// without a manual copy step (the old #1 render-failure cause).
const MEDIA_DIRS = ["audio", "voice", "assets"];
const copyRecursive = (from, to) => {
  if (!fs.existsSync(from)) return 0;
  let copied = 0;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copied += copyRecursive(source, target);
    else { fs.copyFileSync(source, target); copied += 1; }
  }
  return copied;
};

const copied = MEDIA_DIRS.map((dir) => copyRecursive(path.join(projectDir, dir), path.join(publicDir, dir))).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ source: docSource, destination: docDestination, mediaFilesSynced: copied }, null, 2));
