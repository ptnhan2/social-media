import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EditPatch, FeedbackRecord, QAReport } from "../../../shared/isaacverse/schema";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import { createProjectStore } from "../../../shared/isaacverse/store";

const temporaryRoots: string[] = [];

const editDoc = (): IsaacVerseEditDoc => ({
  id: "final-edit",
  width: 1920,
  height: 1080,
  fps: 30,
  version: "v000",
  beats: [{
    id: "beat-01",
    journeySlot: "call",
    startSec: 0,
    durationSec: 4,
    transcript: "A new edit starts here.",
    narrativeFunction: "hook",
    treatment: { id: "chapter-card", params: { title: "A new edit" }, assets: [] },
    audioCues: [],
  }],
});

const patch = (): EditPatch => ({
  id: "patch-01",
  videoId: "final-project",
  baseVersion: "v001",
  reason: "Tighten the hook.",
  operations: [{ op: "updateBeat", beatId: "beat-01", changes: { durationSec: 3.5 } }],
  affectedRange: { startSec: 0, endSec: 4 },
  status: "draft",
});

afterEach(() => temporaryRoots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe("durable IsaacVerse project store", () => {
  it("writes and reloads versions, feedback, patches, and QA reports", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "isaacverse-store-"));
    temporaryRoots.push(root);
    const store = createProjectStore(root);
    store.ensureProject("final-project");
    const saved = store.saveVersion("final-project", editDoc(), "v000");
    const feedback: FeedbackRecord = { id: "feedback-01", videoId: "final-project", version: saved.version, scope: "beat", target: { beatId: "beat-01", startSec: 0, endSec: 4 }, category: "too-slow", status: "open", applyScope: "this_instance", createdAt: "2026-08-11T00:00:00.000Z" };
    const report: QAReport = { id: "diagnosis-01", videoId: "final-project", version: saved.version, mode: "draft", status: "pass_with_review", findings: [], metrics: { durationSec: 4 }, createdAt: "2026-08-11T00:00:00.000Z" };
    store.saveFeedback("final-project", feedback);
    store.savePatch("final-project", patch());
    store.saveQA("final-project", report);

    const loaded = store.load("final-project");

    expect(loaded.state.currentVersion).toBe("v001");
    expect(loaded.editDoc?.id).toBe("final-edit");
    expect(loaded.feedback).toHaveLength(1);
    expect(loaded.patches).toHaveLength(1);
    expect(loaded.qaReports).toHaveLength(1);
    expect(loaded.versions.map((item) => item.version)).toEqual(["v001"]);
  });

  it("rejects stale writes and path traversal", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "isaacverse-store-"));
    temporaryRoots.push(root);
    const store = createProjectStore(root);
    store.ensureProject("final-project");
    store.saveVersion("final-project", editDoc(), "v000");

    expect(() => store.saveVersion("final-project", editDoc(), "v000")).toThrow("Stale project version");
    expect(() => store.ensureProject("../outside")).toThrow("Unsafe project identifier");
  });

  it("applies a patch as a new durable version", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "isaacverse-store-"));
    temporaryRoots.push(root);
    const store = createProjectStore(root);
    store.ensureProject("final-project");
    store.saveVersion("final-project", editDoc(), "v000");
    const saved = store.applyPatch("final-project", patch(), "v001");

    expect(saved.version).toBe("v002");
    expect(saved.editDoc.beats[0].durationSec).toBe(3.5);
    expect(store.load("final-project").state.currentVersion).toBe("v002");
  });
});
