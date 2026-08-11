import type { EditPatch, FeedbackRecord } from "../../../shared/isaacverse/schema";
import type { OperationRequest, OperationResult } from "../../../shared/isaacverse/operations";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import type { FeedbackRequest, ReviewQueue, ReviewQueueEntry } from "../../../shared/isaacverse/review";

export type ProjectSnapshot = {
  projectId: string;
  state: { currentVersion: string; [key: string]: unknown };
  editDoc?: IsaacVerseEditDoc;
  feedback: FeedbackRecord[];
  patches: EditPatch[];
  qaReports: unknown[];
  versions: { version: string; editDoc: IsaacVerseEditDoc }[];
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload as T;
};

export const loadProject = (projectId: string) => requestJson<ProjectSnapshot>(`/api/project/load?projectId=${encodeURIComponent(projectId)}`);

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

export const saveReviewQueue = (projectId: string, entries: ReviewQueueEntry[]) => requestJson<ReviewQueue>("/api/project/review-queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, entries }) });
