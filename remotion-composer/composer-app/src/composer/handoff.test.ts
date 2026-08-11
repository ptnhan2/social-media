import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FeedbackRequest } from "../../../shared/isaacverse/review";
import { createKiloHandoff, listKiloHandoffs, updateKiloHandoff } from "../../../shared/isaacverse/handoff";
import type { EditPatch } from "../../../shared/isaacverse/schema";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe("Kilo file handoff", () => {
  it("writes a structured request and an actionable Kilo prompt", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kilo-handoff-"));
    roots.push(root);
    const request: FeedbackRequest = {
      id: "feedback-001",
      projectId: "final-project",
      version: "v004",
      slice: { id: "slice-001", videoId: "final-project", source: "motion-phase", label: "push", target: { beatId: "beat-01", motionPhaseId: "phase-01", startSec: 2, endSec: 3 }, startSec: 2, endSec: 3, modalities: ["motion"], status: "unreviewed" },
      category: "motion-too-flat",
      modality: "motion",
      note: "Keep the screen readable.",
      requestedAction: "diagnose_and_patch",
      status: "pending",
      createdAt: "2026-08-12T00:00:00.000Z",
    };
    const result = createKiloHandoff(root, request);
    const files = listKiloHandoffs(root);

    expect(fs.existsSync(result.requestPath)).toBe(true);
    expect(fs.readFileSync(result.promptPath, "utf8")).toContain("diagnose_and_patch");
    expect(files).toHaveLength(1);
    expect(files[0].slice.target.motionPhaseId).toBe("phase-01");
  });

  it("persists a Kilo diagnosis result and patch for Composer polling", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kilo-handoff-result-"));
    roots.push(root);
    const request: FeedbackRequest = {
      id: "feedback-002",
      projectId: "final-project",
      version: "v004",
      slice: { id: "slice-002", videoId: "final-project", source: "element", label: "title", target: { beatId: "beat-01", elementId: "beat-01:title", startSec: 2, endSec: 3 }, startSec: 2, endSec: 3, modalities: ["caption"], status: "unreviewed" },
      category: "text-unreadable",
      modality: "caption",
      requestedAction: "diagnose_and_patch",
      status: "pending",
      createdAt: "2026-08-12T00:00:00.000Z",
    };
    createKiloHandoff(root, request);
    const patch: EditPatch = { id: "patch-002", videoId: "final-project", baseVersion: "v004", reason: "Increase contrast.", operations: [{ op: "updateElement", beatId: "beat-01", elementId: "beat-01:title", path: "metadata.color", value: "#ffffff" }], affectedRange: { startSec: 2, endSec: 3 }, status: "draft" };
    updateKiloHandoff(root, request.id, { status: "previewed", result: { diagnosis: "Increase title contrast.", patch, afterPath: "renders/windows/feedback-002-after.mp4" } });

    const result = listKiloHandoffs(root)[0];

    expect(result.status).toBe("previewed");
    expect(result.result?.patch?.id).toBe("patch-002");
    expect(result.result?.afterPath).toContain("feedback-002-after.mp4");
  });
});
