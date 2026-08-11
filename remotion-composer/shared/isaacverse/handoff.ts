import fs from "node:fs";
import path from "node:path";
import type { FeedbackRequest } from "./review";

const safeId = (value: string) => {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error(`Unsafe handoff id: ${value}`);
  return value;
};

const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const handoffPaths = (projectRoot: string, requestId: string) => {
  const id = safeId(requestId);
  const inbox = path.join(projectRoot, "feedback", "inbox");
  return { inbox, requestPath: path.join(inbox, `${id}.json`), promptPath: path.join(inbox, `${id}.prompt.md`) };
};

export const createKiloHandoff = (projectRoot: string, request: FeedbackRequest) => {
  const paths = handoffPaths(projectRoot, request.id);
  const prompt = [
    "# Kilo Review Request",
    "",
    "Read the structured request at:",
    paths.requestPath,
    "",
    `Project: ${request.projectId}`,
    `Version: ${request.version}`,
    `Selection: ${request.slice.id} (${request.slice.startSec.toFixed(3)}-${request.slice.endSec.toFixed(3)}s)`,
    `Modality: ${request.modality}`,
    `Category: ${request.category}`,
    `Requested action: ${request.requestedAction}`,
    "",
    "Required workflow:",
    "1. Read the request, project state, current EditDoc, QA evidence, transcript, and audio/treatment context.",
    "2. Inspect only the selected range and modality first.",
    "3. Diagnose the root cause.",
    "4. Create a canonical EditPatch scoped to the selected range/target.",
    "5. Render only the affected window when evidence is needed.",
    "6. Write diagnosis, patch, and artifact paths back to the project.",
    "7. Update the request status to previewed, applied, rejected, or blocked.",
    "8. Do not mutate unrelated beats or global rules without explicit approval.",
    "9. Put the result in the request JSON under result: {diagnosis, patch, beforePath, afterPath, evidencePaths, completedAt} so Composer can reload it.",
    "",
    "User note:",
    request.note || "(none)",
    "",
  ].join("\\n");
  writeJson(paths.requestPath, request);
  fs.writeFileSync(paths.promptPath, `${prompt}\n`, "utf8");
  return { request, ...paths };
};

export const listKiloHandoffs = (projectRoot: string): FeedbackRequest[] => {
  const inbox = path.join(projectRoot, "feedback", "inbox");
  if (!fs.existsSync(inbox)) return [];
  return fs.readdirSync(inbox).filter((name) => name.endsWith(".json")).sort().flatMap((name) => {
    try { return [JSON.parse(fs.readFileSync(path.join(inbox, name), "utf8")) as FeedbackRequest]; }
    catch { return []; }
  });
};

export const updateKiloHandoff = (projectRoot: string, requestId: string, changes: Partial<FeedbackRequest>) => {
  const paths = handoffPaths(projectRoot, requestId);
  if (!fs.existsSync(paths.requestPath)) throw new Error(`Unknown Kilo handoff: ${requestId}`);
  const current = JSON.parse(fs.readFileSync(paths.requestPath, "utf8")) as FeedbackRequest;
  const updated = { ...current, ...changes };
  writeJson(paths.requestPath, updated);
  return updated;
};
