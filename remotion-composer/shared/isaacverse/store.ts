import fs from "node:fs";
import path from "node:path";
import type { AssetManifest, EditPatch, FeedbackRecord, QAReport, VideoDoc } from "./schema";
import type { IsaacVerseEditDoc } from "./types";
import type { EditorDoc } from "./editor";
import { deriveReviewSlices, reviewRollup, type ReviewQueue, type ReviewQueueEntry } from "./review";
import { applyPatch } from "./feedback";
import { assertValidEditDoc, assertValidEditorDoc, assertValidFeedback, assertValidPatch, assertValidVideoDoc } from "./validate";

export type ProjectState = {
  projectId: string;
  pipelineVersion: string;
  stage: string;
  status: string;
  completedStages: string[];
  currentVersion: string;
  lastSuccessfulCommand?: string | null;
  lastSuccessfulAt?: string | null;
  nextAction?: string;
  [key: string]: unknown;
};

export type ProjectSnapshot = {
  projectId: string;
  state: ProjectState;
  videoDoc?: VideoDoc;
  editDoc?: IsaacVerseEditDoc;
  assetManifest?: AssetManifest;
  editorDoc?: EditorDoc;
  feedback: FeedbackRecord[];
  patches: EditPatch[];
  qaReports: QAReport[];
  reviewQueue?: ReviewQueue;
  versions: { version: string; editDoc: IsaacVerseEditDoc }[];
};

export type SaveVersionResult = { version: string; editDoc: IsaacVerseEditDoc; state: ProjectState };

const JSON_INDENT = 2;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const safeId = (value: string) => {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error(`Unsafe project identifier: ${value}`);
  return value;
};

const nextVersion = (version: string) => `v${String(Number(version.replace(/^v/, "")) + 1).padStart(3, "0")}`;

const readJson = <T>(file: string): T | undefined => {
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
};

const writeJsonAtomic = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, JSON_INDENT)}\n`, "utf8");
  try {
    fs.renameSync(temporary, file);
  } catch (error) {
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    fs.renameSync(temporary, file);
    if (!fs.existsSync(file)) throw error;
  }
};

const listJson = <T>(directory: string): T[] => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((name) => name.endsWith(".json")).sort().map((name) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")) as T);
};

export class ProjectStore {
  readonly rootDir: string;
  readonly publicRoot?: string;

  constructor(rootDir: string, publicRoot?: string) {
    this.rootDir = path.resolve(rootDir);
    this.publicRoot = publicRoot ? path.resolve(publicRoot) : undefined;
  }

  private syncPublicEditDoc(projectId: string, editDoc: IsaacVerseEditDoc) {
    if (!this.publicRoot) return;
    const destination = path.resolve(this.publicRoot, safeId(projectId), "05-edit-doc.json");
    if (destination !== this.publicRoot && !destination.startsWith(`${this.publicRoot}${path.sep}`)) throw new Error("Public project path escapes store root");
    writeJsonAtomic(destination, editDoc);
  }

  private syncPublicEditorDoc(projectId: string, editorDoc: EditorDoc) {
    if (!this.publicRoot) return;
    const destination = path.resolve(this.publicRoot, safeId(projectId), "editor", "current.json");
    if (destination !== this.publicRoot && !destination.startsWith(`${this.publicRoot}${path.sep}`)) throw new Error("Public editor path escapes store root");
    writeJsonAtomic(destination, editorDoc);
  }

  projectDir(projectId: string) {
    const safeProjectId = safeId(projectId);
    const project = path.resolve(this.rootDir, safeProjectId);
    if (project !== this.rootDir && !project.startsWith(`${this.rootDir}${path.sep}`)) throw new Error("Project path escapes store root");
    return project;
  }

  listProjects(): { id: string; title: string; stage: string; version: string; hasEditDoc: boolean; hasVideoDoc: boolean; updatedAt: string }[] {
    if (!fs.existsSync(this.rootDir)) return [];
    return fs.readdirSync(this.rootDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^[a-zA-Z0-9._-]+$/.test(entry.name))
      .map((entry) => {
        const dir = path.join(this.rootDir, entry.name);
        const state = readJson<ProjectState>(path.join(dir, "00-state.json"));
        const editDoc = readJson<IsaacVerseEditDoc>(path.join(dir, "05-edit-doc.json"));
        const videoDoc = readJson<VideoDoc>(path.join(dir, "04-video-doc.json"));
        const editorFile = path.join(dir, "editor", "current.json");
        const editorMtime = fs.existsSync(editorFile) ? fs.statSync(editorFile).mtime.toISOString() : undefined;
        const editMtime = fs.existsSync(path.join(dir, "05-edit-doc.json")) ? fs.statSync(path.join(dir, "05-edit-doc.json")).mtime.toISOString() : undefined;
        return {
          id: entry.name,
          title: videoDoc?.idea || editDoc?.videoId || entry.name,
          stage: state?.stage || "unknown",
          version: state?.currentVersion || "v000",
          hasEditDoc: Boolean(editDoc),
          hasVideoDoc: Boolean(videoDoc),
          updatedAt: editorMtime || editMtime || state?.lastSuccessfulAt || new Date(0).toISOString(),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createBlankProject(projectId: string): ProjectSnapshot {
    const safeProjectId = safeId(projectId);
    const project = this.ensureProject(safeProjectId);
    const editDocPath = path.join(project, "05-edit-doc.json");
    if (!fs.existsSync(editDocPath)) {
      const blankEditDoc: IsaacVerseEditDoc = {
        id: `${safeProjectId}-edit`,
        videoId: safeProjectId,
        version: "v001",
        width: 1920,
        height: 1080,
        fps: 30,
        beats: [{
          id: `${safeProjectId}-beat-01`,
          journeySlot: "call",
          startSec: 0,
          durationSec: 5,
          transcript: "",
          narrativeFunction: "New beat",
          treatment: { id: "chapter-card", params: { title: "New Project" }, assets: [] },
          audioCues: [],
        }],
        assets: [],
        shots: [],
        scenes: [],
        audioPlan: { voice: [], music: [], ambience: [], beats: [], master: { limiter: true } },
        transitions: [],
        colorGrade: { preset: "none", intensity: 0 },
      };
      writeJsonAtomic(editDocPath, blankEditDoc);
      writeJsonAtomic(path.join(project, "edit", "current.json"), blankEditDoc);
      writeJsonAtomic(path.join(project, "edit", "versions", "v001.json"), { ...blankEditDoc, version: "v001" });
      this.syncPublicEditDoc(safeProjectId, blankEditDoc);
    }
    const state = readJson<ProjectState>(path.join(project, "00-state.json"));
    if (state) {
      writeJsonAtomic(path.join(project, "00-state.json"), { ...state, stage: "edit", currentVersion: "v001", nextAction: "Edit the timeline in Composer." });
    }
    return this.load(safeProjectId);
  }

  ensureProject(projectId: string) {
    const project = this.projectDir(projectId);
    for (const relative of ["edit/versions", "editor/versions", "feedback/inbox", "patches", "qa", "renders/windows", "assets", "thumbnail", "dubbing", "publish"]) fs.mkdirSync(path.join(project, relative), { recursive: true });
    if (!fs.existsSync(path.join(project, "00-state.json"))) {
      writeJsonAtomic(path.join(project, "00-state.json"), {
        projectId,
        pipelineVersion: "2026-08-11-isaacverse-v1",
        stage: "scaffold",
        status: "in_progress",
        completedStages: [],
        currentVersion: "v000",
        nextAction: "Create the source VideoDoc and EditDoc.",
      } satisfies ProjectState);
    }
    const sourceEdit = path.join(project, "05-edit-doc.json");
    const initialVersion = path.join(project, "edit/versions/v001.json");
    if (fs.existsSync(sourceEdit) && !fs.existsSync(initialVersion)) {
      const source = JSON.parse(fs.readFileSync(sourceEdit, "utf8"));
      const versioned = { ...source, version: "v001" };
      writeJsonAtomic(initialVersion, versioned);
      writeJsonAtomic(path.join(project, "edit/current.json"), versioned);
    }
    return project;
  }

  load(projectId: string): ProjectSnapshot {
    const project = this.ensureProject(projectId);
    const state = readJson<ProjectState>(path.join(project, "00-state.json"));
    if (!state) throw new Error(`Missing project state: ${projectId}`);
    const versions = fs.existsSync(path.join(project, "edit/versions"))
      ? fs.readdirSync(path.join(project, "edit/versions")).filter((name) => name.endsWith(".json")).sort().map((name) => ({ version: path.basename(name, ".json"), editDoc: JSON.parse(fs.readFileSync(path.join(project, "edit/versions", name), "utf8")) as IsaacVerseEditDoc }))
      : [];
    return {
      projectId,
      state,
      videoDoc: readJson<VideoDoc>(path.join(project, "04-video-doc.json")),
      editDoc: readJson<IsaacVerseEditDoc>(path.join(project, "edit/current.json")) ?? readJson<IsaacVerseEditDoc>(path.join(project, "05-edit-doc.json")),
      assetManifest: readJson<AssetManifest>(path.join(project, "assets/asset-manifest.json")),
      editorDoc: readJson<EditorDoc>(path.join(project, "editor/current.json")),
      feedback: listJson<FeedbackRecord>(path.join(project, "feedback")),
      patches: listJson<EditPatch>(path.join(project, "patches")),
      qaReports: listJson<QAReport>(path.join(project, "qa")),
      reviewQueue: readJson<ReviewQueue>(path.join(project, "qa/review-queue.json")),
      versions,
    };
  }

  saveSourceDocs(projectId: string, videoDoc: VideoDoc, editDoc: IsaacVerseEditDoc, assetManifest?: AssetManifest) {
    const project = this.ensureProject(projectId);
    assertValidVideoDoc(videoDoc);
    assertValidEditDoc(editDoc);
    if (assetManifest) writeJsonAtomic(path.join(project, "assets/asset-manifest.json"), assetManifest);
    writeJsonAtomic(path.join(project, "04-video-doc.json"), videoDoc);
    writeJsonAtomic(path.join(project, "05-edit-doc.json"), editDoc);
    writeJsonAtomic(path.join(project, "edit/current.json"), editDoc);
    this.syncPublicEditDoc(projectId, editDoc);
    return this.load(projectId);
  }

  saveEditor(projectId: string, editorDoc: EditorDoc, expectedEditVersion?: string) {
    const project = this.ensureProject(projectId);
    assertValidEditorDoc(editorDoc);
    const state = readJson<ProjectState>(path.join(project, "00-state.json"));
    if (!state) throw new Error(`Missing project state: ${projectId}`);
    if (expectedEditVersion && state.currentVersion !== expectedEditVersion) throw new Error(`Stale editor base version: expected ${expectedEditVersion}, current ${state.currentVersion}`);
    const updated = { ...editorDoc, projectId, revision: { ...editorDoc.revision, updatedAt: new Date().toISOString() } };
    writeJsonAtomic(path.join(project, "editor/versions", `r${String(updated.revision.revision).padStart(3, "0")}.json`), updated);
    writeJsonAtomic(path.join(project, "editor/current.json"), updated);
    this.syncPublicEditorDoc(projectId, updated);
    return updated;
  }

  saveVersion(projectId: string, editDoc: IsaacVerseEditDoc, expectedBaseVersion?: string): SaveVersionResult {
    const project = this.ensureProject(projectId);
    assertValidEditDoc(editDoc);
    const currentState = readJson<ProjectState>(path.join(project, "00-state.json"));
    if (!currentState) throw new Error(`Missing project state: ${projectId}`);
    const currentVersion = currentState.currentVersion || "v000";
    if (expectedBaseVersion && currentVersion !== expectedBaseVersion) throw new Error(`Stale project version: expected ${expectedBaseVersion}, current ${currentVersion}`);
    const version = nextVersion(currentVersion);
    const versioned = { ...editDoc, version };
    const state = { ...currentState, currentVersion: version, status: "in_progress", lastSuccessfulAt: new Date().toISOString() };
    writeJsonAtomic(path.join(project, "edit/versions", `${version}.json`), versioned);
    writeJsonAtomic(path.join(project, "edit/current.json"), versioned);
    writeJsonAtomic(path.join(project, "05-edit-doc.json"), versioned);
    writeJsonAtomic(path.join(project, "00-state.json"), state);
    this.syncPublicEditDoc(projectId, versioned);
    return { version, editDoc: versioned, state };
  }

  saveFeedback(projectId: string, feedback: FeedbackRecord) {
    const project = this.ensureProject(projectId);
    assertValidFeedback(feedback);
    writeJsonAtomic(path.join(project, "feedback", `${safeId(feedback.id)}.json`), feedback);
    return feedback;
  }

  savePatch(projectId: string, patch: EditPatch) {
    const project = this.ensureProject(projectId);
    assertValidPatch(patch);
    writeJsonAtomic(path.join(project, "patches", `${safeId(patch.id)}.json`), patch);
    return patch;
  }

  saveQA(projectId: string, report: QAReport) {
    const project = this.ensureProject(projectId);
    writeJsonAtomic(path.join(project, "qa", `${safeId(report.id)}.json`), report);
    return report;
  }

  saveReviewQueue(projectId: string, entries: ReviewQueueEntry[]) {
    const project = this.ensureProject(projectId);
    const snapshot = this.load(projectId);
    if (!snapshot.editDoc) throw new Error(`Project has no edit document: ${projectId}`);
    const slices = deriveReviewSlices(snapshot.editDoc);
    const queue: ReviewQueue = { projectId, version: snapshot.state.currentVersion, entries, rollup: reviewRollup(slices, entries), updatedAt: new Date().toISOString() };
    writeJsonAtomic(path.join(project, "qa/review-queue.json"), queue);
    return queue;
  }

  getReviewQueue(projectId: string): ReviewQueue {
    const project = this.projectDir(projectId);
    if (!fs.existsSync(path.join(project, "00-state.json"))) throw new Error(`Unknown project: ${projectId}`);
    const snapshot = this.load(projectId);
    if (snapshot.reviewQueue) return snapshot.reviewQueue;
    const slices = snapshot.editDoc ? deriveReviewSlices(snapshot.editDoc) : [];
    return { projectId, version: snapshot.state.currentVersion, entries: [], rollup: reviewRollup(slices, []), updatedAt: new Date().toISOString() };
  }

  applyPatch(projectId: string, patch: EditPatch, expectedBaseVersion: string) {
    const snapshot = this.load(projectId);
    if (!snapshot.editDoc) throw new Error(`Project has no edit document: ${projectId}`);
    if (snapshot.state.currentVersion !== expectedBaseVersion) throw new Error(`Stale project version: expected ${expectedBaseVersion}, current ${snapshot.state.currentVersion}`);
    const updated = applyPatch(snapshot.editDoc, patch);
    const saved = this.saveVersion(projectId, updated, expectedBaseVersion);
    this.savePatch(projectId, { ...patch, status: "applied", baseVersion: expectedBaseVersion, videoId: projectId, render: patch.render });
    return saved;
  }

  rollbackVersion(projectId: string, targetVersion: string, expectedBaseVersion: string) {
    const snapshot = this.load(projectId);
    const target = snapshot.versions.find((entry) => entry.version === targetVersion);
    if (!target) throw new Error(`Unknown version: ${targetVersion}`);
    if (snapshot.state.currentVersion !== expectedBaseVersion) throw new Error(`Stale project version: expected ${expectedBaseVersion}, current ${snapshot.state.currentVersion}`);
    return this.saveVersion(projectId, target.editDoc, expectedBaseVersion);
  }
}

export const createProjectStore = (rootDir: string, publicRoot?: string) => new ProjectStore(rootDir, publicRoot);
