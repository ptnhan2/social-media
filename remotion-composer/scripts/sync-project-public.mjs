import fs from "node:fs";
import path from "node:path";

const [, , slug = "isaacverse-final"] = process.argv;
const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");
const source = path.join(workspaceRoot, "projects", slug, "05-edit-doc.json");
const destination = path.join(workspaceRoot, "remotion-composer", "public", slug, "05-edit-doc.json");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
console.log(JSON.stringify({ source, destination }, null, 2));
