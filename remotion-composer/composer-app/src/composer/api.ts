import type { EditPatch, FeedbackRecord, VideoDoc } from "../../../shared/isaacverse/schema";
import type { OperationRequest, OperationResult } from "../../../shared/isaacverse/operations";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import type { EditorDoc } from "../../../shared/isaacverse/editor";
import type { FeedbackRequest, ReviewQueue, ReviewQueueEntry } from "../../../shared/isaacverse/review";

export type ProjectSnapshot = {
  projectId: string;
  state: { currentVersion: string; [key: string]: unknown };
  videoDoc?: VideoDoc;
  editDoc?: IsaacVerseEditDoc;
  editorDoc?: EditorDoc;
  feedback: FeedbackRecord[];
  patches: EditPatch[];
  qaReports: unknown[];
  versions: { version: string; editDoc: IsaacVerseEditDoc }[];
};

export type ProjectRender = { path: string; name: string; sizeBytes: number; mtimeIso: string };
export type ProjectApproval = { status: "none" | "pending" | "changes_requested" | "approved"; note?: string; summary?: string; updatedAt?: string };

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload as T;
};

export const loadProject = (projectId: string) => requestJson<ProjectSnapshot>(`/api/project/load?projectId=${encodeURIComponent(projectId)}`);

export const saveEditor = (projectId: string, editorDoc: EditorDoc, expectedEditVersion: string) => requestJson<EditorDoc>("/api/project/editor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, editorDoc, expectedEditVersion }) });

export const operate = (request: OperationRequest) => requestJson<OperationResult>("/api/agent/operate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });

export const saveFeedback = (projectId: string, feedback: FeedbackRecord) => requestJson<FeedbackRecord>("/api/project/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, feedback }) });

export const savePatch = (projectId: string, patch: EditPatch) => requestJson<EditPatch>("/api/project/patch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, patch }) });

export const applyPatch = (projectId: string, patch: EditPatch, expectedBaseVersion: string) => requestJson<{ version: string; editDoc: IsaacVerseEditDoc }>("/api/agent/operate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "apply_patch", projectId, patch, expectedBaseVersion }) });

export const rollbackVersion = (projectId: string, targetVersion: string, expectedBaseVersion: string) => requestJson<{ version: string; editDoc: IsaacVerseEditDoc }>("/api/agent/operate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "rollback_patch", projectId, targetVersion, expectedBaseVersion }) });

export const handoffToKilo = (projectId: string, request: FeedbackRequest) => requestJson<{ request: FeedbackRequest; requestPath: string; promptPath: string }>("/api/kilo/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, request }) });

export const updateKiloHandoff = (projectId: string, requestId: string, changes: Partial<FeedbackRequest>) => requestJson<FeedbackRequest>("/api/kilo/handoff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, requestId, changes }) });

export const loadKiloInbox = (projectId: string) => requestJson<FeedbackRequest[]>(`/api/kilo/inbox?projectId=${encodeURIComponent(projectId)}`);

export const artifactUrl = (projectId: string, relativePath: string) => `/api/project/artifact?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(relativePath.replace(/\\/g, "/"))}`;

export const loadReviewQueue = (projectId: string) => requestJson<ReviewQueue>(`/api/project/review-queue?projectId=${encodeURIComponent(projectId)}`);

export const fetchRenders = (projectId: string) => requestJson<{ renders: ProjectRender[] }>(`/api/project/renders?projectId=${encodeURIComponent(projectId)}`);

export const fetchApproval = (projectId: string) => requestJson<ProjectApproval>(`/api/project/approval?projectId=${encodeURIComponent(projectId)}`);

export const setApproval = (projectId: string, status: "pending" | "changes_requested" | "approved", note = "") => requestJson<{ ok: true; approval: ProjectApproval }>(`/api/project/approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, status, note }) });

export type ClipMetadataChanges = { sentenceText?: string; providerText?: string; voiceSettings?: Record<string, unknown>; transcript?: string };

export const setClipMetadata = (projectId: string, clipId: string, changes: ClipMetadataChanges) => requestJson<{ ok: true; clipId: string }>(`/api/project/clip-metadata`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, clipId, changes }) });

export const saveReviewQueue = (projectId: string, entries: ReviewQueueEntry[]) => requestJson<ReviewQueue>("/api/project/review-queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, entries }) });

export type ProjectListItem = {
  id: string;
  title: string;
  stage: string;
  version: string;
  hasEditDoc: boolean;
  hasVideoDoc: boolean;
  updatedAt: string;
};

export const listProjects = () => requestJson<ProjectListItem[]>(`/api/projects/list`);

export const createProject = (projectId: string) => requestJson<{ projectId: string; state: Record<string, unknown> }>("/api/projects/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });

export const subscribeToChanges = (onProjectChanged: (projectId: string) => void): (() => void) => {
  const es = new EventSource("/api/sse");
  es.onmessage = (event) => {
    const match = String(event.data).match(/^change:(.+)$/);
    if (match) onProjectChanged(match[1]);
  };
  return () => es.close();
};
