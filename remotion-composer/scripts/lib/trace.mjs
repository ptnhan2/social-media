/**
 * PIPELINE TRACE (2026-08-29 — the process-recording layer).
 *
 * The project page shows HOW a video was made: idea → plan → voice →
 * timeline → render → approval. That story only exists if every stage
 * RECORDS itself when it runs. Each event appends to
 * projects/<slug>/qa/pipeline-log.jsonl — one line, one stage run.
 *
 * Event shape: { ts, stage, title, data }
 *   stage: "plan" | "voice" | "timeline" | "render" | "approval" | "note"
 *   data:  the stage's key facts (inputs submitted, rules applied, outputs,
 *          QC numbers) — small, human-readable, what the page renders.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export const tracePath = (workspaceRoot, slug) => path.join(workspaceRoot, "projects", slug, "qa", "pipeline-log.jsonl");

/**
 * Append one pipeline event. Never throws — a trace failure must not break
 * the pipeline itself; the worst case is a missing line on the page.
 */
export const appendTrace = (workspaceRoot, slug, stage, title, data = {}) => {
  try {
    const file = tracePath(workspaceRoot, slug);
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify({ ts: new Date().toISOString(), stage, title, data })}\n`, "utf-8");
  } catch {
    /* trace is best-effort */
  }
};
