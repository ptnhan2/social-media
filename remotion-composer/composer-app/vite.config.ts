import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, watch, appendFileSync } from "fs";
import * as fs from "fs";
import { resolve, sep, join as pathJoin, dirname as pathDirname } from "path";
import { fileURLToPath } from "url";
import { spawn, spawnSync } from "child_process";
import { createProjectStore } from "../shared/isaacverse/store";
import { dispatchLocalOperation } from "../shared/isaacverse/operations";
import { createKiloHandoff, listKiloHandoffs, updateKiloHandoff } from "../shared/isaacverse/handoff";

// Portable workspace layout: this config lives at
// <workspace>/remotion-composer/composer-app/vite.config.ts â€” derive every
// path from it instead of hardcoding absolute machine paths (CI + other
// checkouts must boot the dev server with the same middleware).
const APP_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const COMPOSER_ROOT = resolve(APP_ROOT, "..");
const WORKSPACE_ROOT = resolve(COMPOSER_ROOT, "..");
const PUBLIC_DIR = resolve(COMPOSER_ROOT, "public");
const UPLOADS = resolve(PUBLIC_DIR, "uploads");
const PROJECTS_ROOT = resolve(WORKSPACE_ROOT, "projects");
const PROJECT_STORE = createProjectStore(PROJECTS_ROOT, PUBLIC_DIR);
const RULES_ROOT = resolve(WORKSPACE_ROOT, "libraries/04-visual/feedback-rules");
mkdirSync(UPLOADS, { recursive: true });

const sendJson = (res: any, status: number, value: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(value));
};

const PY = (() => {
  const candidates = [
    resolve(WORKSPACE_ROOT, "harness", ".venv", "Scripts", "python.exe"), // Windows
    resolve(WORKSPACE_ROOT, "harness", ".venv", "bin", "python"), // linux/macos
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
})();
const ASSET_API = resolve(WORKSPACE_ROOT, "tools/assets/asset_api.py");
const STUDIO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IsaacVerseComposer/1.0";

// .env keys needed by the asset studio (stock search)
const ENV_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const envFile = resolve(WORKSPACE_ROOT, ".env");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && m[2].trim()) map[m[1]] = m[2].split("#")[0].trim().replace(/^["']|["']$/g, "");
    }
  }
  return map;
})();
const PEXELS_API_KEY = ENV_MAP.PEXELS_API_KEY || process.env.PEXELS_API_KEY || "";
const UNSPLASH_ACCESS_KEY = ENV_MAP.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY || "";

const runAssetBridge = (cmd: Record<string, unknown>): Record<string, unknown> => {
  const proc = spawnSync(PY, [ASSET_API], {
    cwd: WORKSPACE_ROOT, windowsHide: true, encoding: "utf-8",
    input: JSON.stringify(cmd), timeout: 300000, maxBuffer: 64 * 1024 * 1024,
  });
  // python exits 1 for {ok: false} results too â€” surface that JSON instead of
  // a generic crash message when stdout is parseable.
  if (proc.stdout && proc.stdout.trim().startsWith("{")) {
    try {
      return JSON.parse(proc.stdout.trim());
    } catch {
      /* fall through to error path */
    }
  }
  if (proc.status !== 0 || !proc.stdout) {
    throw new Error(String(proc.stderr || "asset bridge failed").slice(0, 400));
  }
  return JSON.parse(proc.stdout.trim());
};
const renderJobs = new Map<string, { status: "rendering" | "done" | "error"; startedAt: number; outputPath: string; message?: string }>();

const readBody = (req: any, res: any, done: (body: any) => void) => {
  let body = "";
  req.on("data", (chunk: Buffer) => body += chunk.toString());
  req.on("end", () => {
    try { done(JSON.parse(body || "{}")); }
    catch { sendJson(res, 400, { error: "Request body must be valid JSON" }); }
  });
};

export default defineConfig({
  // vitest: unit tests live in src/**/*.test.ts; e2e/ holds the Playwright
  // suite (its *.spec.ts files must NOT be collected by vitest)
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
  // Shared IsaacVerse components live one directory above this app. Force all
  // Remotion imports through the app copy so Player and Audio share one context.
  resolve: { dedupe: ["react", "react-dom", "remotion", "@remotion/media"] },
  // Serve remotion-composer/public (fonts, images, cutouts) as static assets
  publicDir: PUBLIC_DIR,
  plugins: [
    react(),
    {
      name: "isaacverse-composer-api",
      configureServer(server) {
        server.middlewares.use("/api/project/load", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const projectId = url.searchParams.get("projectId") || "isaacverse-final";
          try { sendJson(res, 200, PROJECT_STORE.load(projectId)); }
          catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
        });
        server.middlewares.use("/api/project/save", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try { sendJson(res, 200, PROJECT_STORE.saveSourceDocs(body.projectId, body.videoDoc, body.editDoc, body.assetManifest)); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/editor", (req, res) => {
          if (req.method === "GET") {
            const url = new URL(req.url || "/", "http://composer.local");
            const projectId = url.searchParams.get("projectId") || "isaacverse-final";
            try { sendJson(res, 200, PROJECT_STORE.load(projectId).editorDoc || null); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
            return;
          }
          if (req.method !== "POST") { sendJson(res, 405, { error: "GET or POST required" }); return; }
          readBody(req, res, (body) => {
            try { sendJson(res, 200, PROJECT_STORE.saveEditor(body.projectId, body.editorDoc, body.expectedEditVersion)); }
            catch (error) { sendJson(res, 409, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/feedback", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try { sendJson(res, 200, PROJECT_STORE.saveFeedback(body.projectId, body.feedback)); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/patch", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try { sendJson(res, 200, PROJECT_STORE.savePatch(body.projectId, body.patch)); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/qa", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try { sendJson(res, 200, PROJECT_STORE.saveQA(body.projectId, body.report)); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/review-queue", (req, res) => {
          if (req.method === "GET") {
            const url = new URL(req.url || "/", "http://composer.local");
            const projectId = url.searchParams.get("projectId") || "isaacverse-final";
            try { sendJson(res, 200, PROJECT_STORE.getReviewQueue(projectId)); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
            return;
          }
          if (req.method !== "POST") { sendJson(res, 405, { error: "GET or POST required" }); return; }
          readBody(req, res, (body) => {
            try { sendJson(res, 200, PROJECT_STORE.saveReviewQueue(body.projectId, body.entries || [])); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/version", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const result = body.action === "rollback"
                ? PROJECT_STORE.rollbackVersion(body.projectId, body.targetVersion, body.expectedBaseVersion)
                : PROJECT_STORE.saveVersion(body.projectId, body.editDoc, body.expectedBaseVersion);
              sendJson(res, 200, result);
            } catch (error) { sendJson(res, 409, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/kilo/inbox", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const projectId = url.searchParams.get("projectId") || "isaacverse-final";
          try { sendJson(res, 200, listKiloHandoffs(PROJECT_STORE.projectDir(projectId))); }
          catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
        });
        server.middlewares.use("/api/kilo/handoff", (req, res) => {
          if (req.method === "PATCH") {
            readBody(req, res, (body) => {
              try { sendJson(res, 200, updateKiloHandoff(PROJECT_STORE.projectDir(body.projectId), body.requestId, body.changes || {})); }
              catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
            });
            return;
          }
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST or PATCH required" }); return; }
          readBody(req, res, (body) => {
            try { sendJson(res, 200, createKiloHandoff(PROJECT_STORE.projectDir(body.projectId), body.request)); }
            catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/artifact", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const projectId = url.searchParams.get("projectId") || "isaacverse-final";
          const relative = url.searchParams.get("path") || "";
          try {
            if (!relative || relative.includes("..") || /^[a-zA-Z]:/.test(relative)) throw new Error("Artifact path must be project-relative");
            const project = PROJECT_STORE.projectDir(projectId);
            const file = resolve(project, relative);
            if (!file.startsWith(`${project}${sep}`)) throw new Error("Artifact path escapes project");
            const extension = file.toLowerCase().split(".").pop();
            const contentType = extension === "mp4" ? "video/mp4" : extension === "wav" ? "audio/wav" : extension === "png" ? "image/png" : "application/octet-stream";
            res.setHeader("Content-Type", contentType);
            res.end(readFileSync(file));
          } catch (error) { sendJson(res, 404, { error: error instanceof Error ? error.message : String(error) }); }
        });
        server.middlewares.use("/api/agent/operate", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const snapshot = PROJECT_STORE.load(body.projectId);
              if (!snapshot.editDoc) { sendJson(res, 400, { error: "Project has no edit document" }); return; }
              if (body.operation === "apply_patch") {
                const saved = PROJECT_STORE.applyPatch(body.projectId, body.patch, body.expectedBaseVersion || snapshot.state.currentVersion);
                sendJson(res, 200, { operation: body.operation, status: "ok", projectId: body.projectId, version: saved.version, editDoc: saved.editDoc });
                return;
              }
              if (body.operation === "rollback_patch") {
                const saved = PROJECT_STORE.rollbackVersion(body.projectId, body.targetVersion, body.expectedBaseVersion || snapshot.state.currentVersion);
                sendJson(res, 200, { operation: body.operation, status: "ok", projectId: body.projectId, version: saved.version, editDoc: saved.editDoc });
                return;
              }
              if (body.operation === "promote_feedback_rule") {
                if (body.confirm !== true) { sendJson(res, 400, { error: "Explicit confirm=true is required to promote a future rule" }); return; }
                mkdirSync(RULES_ROOT, { recursive: true });
                const ruleId = `${String(body.projectId)}-${String(body.category || "custom")}-${String(body.treatmentId || "treatment")}`.replace(/[^a-zA-Z0-9._-]/g, "_");
                const rule = { id: ruleId, videoId: body.projectId, category: body.category || "custom", treatmentId: body.treatmentId, note: body.note || "", createdAt: new Date().toISOString(), status: "active", scope: "future_rule" };
                writeFileSync(resolve(RULES_ROOT, `${ruleId}.json`), `${JSON.stringify(rule, null, 2)}\n`, "utf8");
                sendJson(res, 200, { operation: body.operation, status: "ok", projectId: body.projectId, rule });
                return;
              }
              const result = dispatchLocalOperation(snapshot.editDoc, body);
              if (result.patch) PROJECT_STORE.savePatch(body.projectId, result.patch);
              sendJson(res, result.status === "rejected" ? 400 : 200, result);
            } catch (error) { sendJson(res, 409, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        // Upload an image (base64) â†’ save to public/uploads â†’ return its URL.
        // Review-tool only: lets you drop a test image onto the canvas without a build step.
        server.middlewares.use("/api/upload", (req, res) => {
          if (req.method !== "POST") { res.statusCode = 405; res.end("405"); return; }
          let body = ""; req.on("data", c => body += c);
          req.on("end", () => {
            try {
              const { name, data } = JSON.parse(body);
              const base64 = String(data).replace(/^data:[^;]+;base64,/, "");
              const safe = String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
              writeFileSync(resolve(UPLOADS, safe), Buffer.from(base64, "base64"));
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ url: `/uploads/${safe}` }));
            } catch (e) {
              res.statusCode = 500; res.end("500");
            }
          });
        });
        // ============ ASSET STUDIO ============
        // Stock photo search (Pexels + Unsplash, keys from .env)
        server.middlewares.use("/api/assets/search-stock", async (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const q = url.searchParams.get("q") || "";
          const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
          if (!q) { sendJson(res, 400, { error: "q required" }); return; }
          const results: unknown[] = [];
          try {
            const px = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=12&page=${page}&orientation=portrait`, { headers: { Authorization: PEXELS_API_KEY, "User-Agent": STUDIO_UA } });
            if (px.ok) {
              const data = await px.json() as any;
              for (const p of data.photos || []) results.push({ id: `pexels-${p.id}`, source: "pexels", thumb: p.src?.medium, large: p.src?.large2x || p.src?.large, alt: p.alt || "", photographer: p.photographer });
            }
          } catch { /* pexels down -> unsplash still returns */ }
          try {
            const us = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&page=${page}&orientation=portrait`, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
            if (us.ok) {
              const data = await us.json() as any;
              for (const p of data.results || []) results.push({ id: `unsplash-${p.id}`, source: "unsplash", thumb: p.urls?.small, large: p.urls?.regular, alt: p.alt_description || "", photographer: p.user?.name });
            }
          } catch { /* ignore */ }
          sendJson(res, 200, { results, page });
        });

        // Import a body photo: {projectId, url} (stock) or {projectId, data} (base64 upload)
        server.middlewares.use("/api/assets/body", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, async (body) => {
            try {
              const project = String(body.projectId || "isaacverse-final");
              const inbox = resolve(WORKSPACE_ROOT, "projects", project, "assets", "character", "bodies", "inbox");
              mkdirSync(inbox, { recursive: true });
              let fileName = "";
              if (body.url) {
                fileName = `stock-${Date.now()}.jpg`;
                const resp = await fetch(String(body.url), { headers: { "User-Agent": STUDIO_UA } });
                if (!resp.ok) throw new Error(`download failed: ${resp.status}`);
                writeFileSync(resolve(inbox, fileName), Buffer.from(await resp.arrayBuffer()));
              } else if (body.data) {
                fileName = `upload-${Date.now()}.png`;
                writeFileSync(resolve(inbox, fileName), Buffer.from(String(body.data).replace(/^data:[^;]+;base64,/, ""), "base64"));
              } else throw new Error("url or data required");
              const abs = resolve(inbox, fileName);
              sendJson(res, 200, { path: abs, rel: abs.slice(WORKSPACE_ROOT.length + 1).replace(/\\/g, "/") });
            } catch (e) { sendJson(res, 500, { error: String((e as Error).message || e) }); }
          });
        });

        // Pose list — NATIVE readdir (no python spawn). The python bridge
        // (spawnSync) blocks the whole event loop ~20s per cold call, which
        // froze every API request — including the editor's project load —
        // whenever the editor mounted. Light ops must never hit the bridge.
        server.middlewares.use("/api/assets/poses", (req, res) => {
          try {
            const url = new URL(req.url || "/", "http://composer.local");
            const project = url.searchParams.get("project") || "isaacverse-final";
            const posesDir = resolve(PUBLIC_DIR, project, "character", "poses");
            const poses: { name: string; anchor: Record<string, unknown> }[] = [];
            if (existsSync(posesDir)) {
              for (const file of readdirSync(posesDir).filter((f) => f.toLowerCase().endsWith(".png")).sort()) {
                const anchorPath = resolve(posesDir, file.replace(/\.png$/i, ".json"));
                let anchor: Record<string, unknown> = {};
                try { anchor = JSON.parse(readFileSync(anchorPath, "utf-8")); } catch { /* pose without anchor */ }
                poses.push({ name: file.replace(/\.png$/i, ""), anchor });
              }
            }
            sendJson(res, 200, { ok: true, poses });
          } catch (error) { sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) }); }
        });

        // Python processing bridge: forwards {op, ...} to tools/assets/asset_api.py
        server.middlewares.use("/api/assets/bridge", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (cmd) => {
            try { sendJson(res, 200, runAssetBridge(cmd)); }
            catch (e) { sendJson(res, 500, { error: String((e as Error).message || e) }); }
          });
        });

        // Serve studio files (inbox/poses/head) â€” path-restricted
        server.middlewares.use("/api/assets/file", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const rel = url.searchParams.get("p") || "";
          const abs = resolve(WORKSPACE_ROOT, rel);
          const allowed = [
            resolve(WORKSPACE_ROOT, "projects"),
            resolve(PUBLIC_DIR, "isaacverse-final", "character"),
          ].some((prefix) => abs.startsWith(prefix));
          if (!allowed || !existsSync(abs)) { res.statusCode = 404; res.end("404"); return; }
          const type = abs.endsWith(".png") ? "image/png" : abs.endsWith(".jpg") || abs.endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream";
          res.setHeader("Content-Type", type);
          res.end(readFileSync(abs));
        });

        server.middlewares.use("/api/render/status", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const jobId = url.searchParams.get("jobId") || "";
          const projectId = url.searchParams.get("projectId") || "isaacverse-final";
          const job = renderJobs.get(jobId);
          if (!job) { sendJson(res, 404, { error: "Unknown render job" }); return; }
          sendJson(res, 200, {
            status: job.status,
            elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
            message: job.message,
            outputUrl: job.status === "done" ? `/api/project/artifact?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(job.outputPath)}` : undefined,
          });
        });
        // Delete project — the CRUD gap every user hits: projects accumulate
        // forever (WORKFLOW-AUDIT P0). Guard: confirm=true required.
        server.middlewares.use("/api/projects/delete", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              const confirm = body.confirm === true;
              if (!projectId) throw new Error("projectId required");
              if (!confirm) throw new Error("confirm=true required — deletion is irreversible");
              const projectDir = PROJECT_STORE.projectDir(projectId);
              const publicDir = resolve(PUBLIC_DIR, projectId);
              // validate the project exists
              if (!existsSync(resolve(projectDir, "00-state.json"))) throw new Error(`Project not found: ${projectId}`);
              // delete both the project dir and the public copy
              fs.rmSync(projectDir, { recursive: true, force: true });
              if (existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true });
              sendJson(res, 200, { ok: true, deleted: projectId });
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        // RESEARCH (CONTENT-STUDIO-SPEC §6 — the critical quality step):
        // agent research_topic tool writes structured findings; user reviews
        // in the studio BEFORE story drafting. Same pattern as story-draft.
        server.middlewares.use("/api/project/research", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const projectId = url.searchParams.get("projectId") || "";
          if (req.method === "GET") {
            try {
              if (!projectId) { sendJson(res, 400, { error: "projectId required" }); return; }
              const researchPath = resolve(PROJECT_STORE.projectDir(projectId), "qa", "research.json");
              if (!existsSync(researchPath)) { sendJson(res, 200, { status: "none" }); return; }
              sendJson(res, 200, JSON.parse(readFileSync(researchPath, "utf-8")));
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
            return;
          }
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const pid = String(body.projectId || projectId || "");
              if (!pid) throw new Error("projectId required");
              // Two modes: (1) agent writes full research object; (2) user approves
              if (body.research && typeof body.research === "object") {
                const researchPath = resolve(PROJECT_STORE.projectDir(pid), "qa", "research.json");
                mkdirSync(pathDirname(researchPath), { recursive: true });
                writeFileSync(researchPath, JSON.stringify(body.research, null, 2), "utf-8");
                try {
                  const traceFile = resolve(PROJECT_STORE.projectDir(pid), "qa", "pipeline-log.jsonl");
                  mkdirSync(pathDirname(traceFile), { recursive: true });
                  appendFileSync(traceFile, `${JSON.stringify({ ts: new Date().toISOString(), stage: "research", title: `Research: ${body.research.subQuestions?.length ?? 0} sub-questions, ${body.research.sources?.length ?? 0} sources`, data: { status: body.research.status } })}\n`, "utf-8");
                } catch { /* trace best-effort */ }
                sendJson(res, 200, { ok: true });
              } else if (body.status === "approved") {
                // user approves the research
                const researchPath = resolve(PROJECT_STORE.projectDir(pid), "qa", "research.json");
                if (!existsSync(researchPath)) throw new Error("No research to approve");
                const research = JSON.parse(readFileSync(researchPath, "utf-8"));
                research.status = "approved";
                research.updatedAt = new Date().toISOString();
                writeFileSync(researchPath, JSON.stringify(research, null, 2), "utf-8");
                try {
                  const traceFile = resolve(PROJECT_STORE.projectDir(pid), "qa", "pipeline-log.jsonl");
                  appendFileSync(traceFile, `${JSON.stringify({ ts: new Date().toISOString(), stage: "research", title: "Research approved", data: { status: "approved" } })}\n`, "utf-8");
                } catch { /* trace best-effort */ }
                sendJson(res, 200, { ok: true });
              } else {
                throw new Error("Either `research` (object) or `status: 'approved'` required");
              }
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        // ============ CREATION FLOW (CONTENT-STUDIO-SPEC §5) ============
        // Story draft: the FIRST artifact of the journey (idea -> story review
        // -> script). ONE write-path (this endpoint) for agent (draft_story
        // tool) AND user (inline edits + approve); human story edits land in
        // feedback.jsonl like every other override.
        server.middlewares.use("/api/project/story-draft", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const projectId = url.searchParams.get("projectId") || "";
          if (req.method === "GET") {
            try {
              if (!projectId) { sendJson(res, 400, { error: "projectId required" }); return; }
              const draftPath = resolve(PROJECT_STORE.projectDir(projectId), "qa", "story-draft.json");
              if (!existsSync(draftPath)) { sendJson(res, 200, { status: "none" }); return; }
              sendJson(res, 200, JSON.parse(readFileSync(draftPath, "utf-8")));
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
            return;
          }
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const pid = String(body.projectId || projectId || "");
              if (!pid) throw new Error("projectId required");
              const status = String(body.status || "");
              if (!["pending", "approved", "changes_requested"].includes(status)) throw new Error("status must be pending | approved | changes_requested");
              const story = body.story as Record<string, unknown> | undefined;
              if (status === "pending" && (!story || typeof story !== "object")) throw new Error("story object required when drafting");
              for (const key of ["idea", "surfaceProblem", "deeperProblem", "thumbnailPromise"]) {
                if (story && key in story && typeof story[key] !== "string") throw new Error(`story.${key} must be a string`);
              }
              const draftPath = resolve(PROJECT_STORE.projectDir(pid), "qa", "story-draft.json");
              let previous: Record<string, unknown> = { status: "none" };
              try { previous = JSON.parse(readFileSync(draftPath, "utf-8")); } catch { /* first draft */ }
              const draft = {
                status,
                idea: String(story?.idea ?? previous.idea ?? ""),
                surfaceProblem: String(story?.surfaceProblem ?? previous.surfaceProblem ?? ""),
                deeperProblem: String(story?.deeperProblem ?? previous.deeperProblem ?? ""),
                thumbnailPromise: String(story?.thumbnailPromise ?? previous.thumbnailPromise ?? ""),
                commonGoal: (story?.commonGoal as Record<string, unknown>) ?? (previous.commonGoal as Record<string, unknown>) ?? {},
                originalIdea: String(body.originalIdea ?? previous.originalIdea ?? ""),
                note: String(body.note ?? ""),
                updatedAt: new Date().toISOString(),
              };
              mkdirSync(pathDirname(draftPath), { recursive: true });
              writeFileSync(draftPath, JSON.stringify(draft, null, 2), "utf-8");
              // learning hook: human story edits are training signals
              if (story && previous.status !== "none") {
                for (const key of ["idea", "surfaceProblem", "deeperProblem", "thumbnailPromise"]) {
                  if (typeof story[key] === "string" && story[key] !== previous[key]) {
                    appendFeedback({ knob: `story.${pid}.${key}`, from: String(previous[key] ?? ""), to: story[key], projectId: pid });
                  }
                }
              }
              try {
                const traceFile = resolve(PROJECT_STORE.projectDir(pid), "qa", "pipeline-log.jsonl");
                mkdirSync(pathDirname(traceFile), { recursive: true });
                appendFileSync(traceFile, `${JSON.stringify({ ts: new Date().toISOString(), stage: "story", title: `Story ${status === "approved" ? "approved" : status === "pending" ? "drafted — chờ duyệt" : status}`, data: { status, originalIdea: draft.originalIdea } })}\n`, "utf-8");
              } catch { /* trace is best-effort */ }
              sendJson(res, 200, { ok: true, draft });
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        // Produce: the deterministic back-half in ONE job — voice (TTS takes +
        // QC + retime) -> timeline (validate + generate) -> draft render. The
        // studio's [Generate] button and any agent flow call the SAME job.
        const produceJobs = new Map<string, { status: "producing" | "done" | "error"; startedAt: number; step?: string; message?: string; result?: unknown }>();
        server.middlewares.use("/api/project/produce/status", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const job = produceJobs.get(url.searchParams.get("jobId") || "");
          if (!job) { sendJson(res, 404, { error: "Unknown produce job" }); return; }
          const detail = (job as { detail?: string }).detail;
          sendJson(res, 200, { status: job.status, step: job.step, detail, elapsedSec: Math.round((Date.now() - job.startedAt) / 1000), message: job.message, result: job.status === "done" ? job.result : undefined });
        });
        server.middlewares.use("/api/project/produce", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              if (!projectId) throw new Error("projectId required");
              const snapshot = PROJECT_STORE.load(projectId);
              if (!snapshot.editDoc) throw new Error("Project has no edit document — write a script first");
              // guard: a beat with a transcript is REQUIRED (empty-beat TTS is
              // billable garbage — cold-diff review MINOR #7)
              if (!(snapshot.editDoc.beats ?? []).some((beat) => String(beat.transcript ?? "").trim())) {
                throw new Error("No beat has a transcript — write the script first");
              }
              // in-flight guard: ONE produce job per project (a retry during a
              // running job would double-bill TTS and race the writes —
              // cold-diff review MAJOR #2)
              for (const [existingId, existing] of produceJobs) {
                if (existing.status === "producing" && (existing as { projectId?: string }).projectId === projectId) {
                  sendJson(res, 200, { jobId: existingId, projectId, alreadyRunning: true });
                  return;
                }
              }
              const jobId = `produce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              const jobEntry: { status: "producing" | "done" | "error"; startedAt: number; step?: string; message?: string; result?: unknown; projectId?: string } = { status: "producing", startedAt: Date.now(), step: "voice", projectId };
              produceJobs.set(jobId, jobEntry);
              // partial generate: the studio sends only=<beatIds|changed> when
              // the script changed after a previous generate — stale beats only
              const only = typeof body.only === "string" && body.only ? body.only : null;
              if (only !== null) {
                // validate: "changed" OR a comma list of REAL beat ids — a
                // garbage list would silently regenerate nothing while marking
                // every segment "kept" (stale audio recorded as fresh)
                if (only !== "changed") {
                  const beatIds = new Set((snapshot.editDoc.beats ?? []).map((beat) => String(beat.id)));
                  const unknown = only.split(",").map((id) => id.trim()).filter((id) => id && !beatIds.has(id));
                  if (unknown.length) throw new Error(`only: unknown beat id(s): ${unknown.join(", ")}`);
                  if (!only.split(",").some((id) => id.trim())) throw new Error('only: no beat ids (use "changed" or comma-separated ids)');
                }
              }
              const child = spawn(process.execPath, ["scripts/produce.mjs", "--project", projectId, ...(only ? ["--only", only] : [])], {
                cwd: COMPOSER_ROOT, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
              });
              let stdout = ""; let stderr = "";
              child.stdout.on("data", (c: Buffer) => {
                stdout += c.toString();
                // live step progress: produce.mjs prints {"step":...} lines —
                // voice steps carry per-beat detail ("index/total") for the
                // Generate button's live feedback
                const job = produceJobs.get(jobId);
                if (job) {
                  for (const line of c.toString().split(/\r?\n/)) {
                    try {
                      const parsed = JSON.parse(line.trim());
                      if (parsed.step) {
                        job.step = parsed.step;
                        if (typeof parsed.index === "number" && typeof parsed.total === "number") job.detail = `${parsed.index}/${parsed.total}`;
                        else if (parsed.step !== "voice") job.detail = undefined;
                      }
                    } catch { /* not a step line */ }
                  }
                }
              });
              child.stderr.on("data", (c: Buffer) => { stderr += c.toString(); });
              child.on("error", (error) => { produceJobs.set(jobId, { status: "error", startedAt: Date.now(), message: error.message }); });
              child.on("exit", (code) => {
                const job = produceJobs.get(jobId);
                if (!job) return;
                try {
                  // produce emits ONE JSON LINE PER STEP + a final result —
                  // take the LAST parseable line (the result), not a span
                  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().startsWith("{"));
                  let result = null;
                  for (const line of lines) {
                    try { const parsed = JSON.parse(line.trim()); if (parsed && typeof parsed === "object") result = parsed; } catch { /* skip */ }
                  }
                  if (!result) throw new Error("no JSON result line in output");
                  if (code !== 0 && !result.ok) {
                    job.status = "error";
                    job.message = result.error || `produce exited ${code}: ${(stderr || stdout).slice(0, 300)}`;
                    return;
                  }
                  job.status = "done";
                  job.result = result;
                } catch {
                  job.status = "error";
                  job.message = `unparseable produce output (exit ${code}): ${(stderr || stdout).slice(0, 200)}`;
                }
              });
              sendJson(res, 200, { jobId, projectId });
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        // ============ PROJECT PAGE (stage-surface, PIPELINE-PRODUCTION-SPEC v3) ============
        // The presentation/approval surface reads the SAME files the agent
        // reads (rule #16 parity): renders listing, timeline report, and the
        // approval gate. Approval status is a first-class artifact (HeyGen
        // pattern: pending -> changes_requested -> approved) and every
        // transition lands in feedback.jsonl as a learning signal.
        const APPROVAL_STATUSES = new Set(["pending", "changes_requested", "approved"]);
        server.middlewares.use("/api/project/trace", (req, res) => {
          try {
            const url = new URL(req.url || "/", "http://composer.local");
            const projectId = url.searchParams.get("projectId") || "";
            if (!projectId) { sendJson(res, 400, { error: "projectId required" }); return; }
            const traceFile = resolve(PROJECT_STORE.projectDir(projectId), "qa", "pipeline-log.jsonl");
            const events: unknown[] = [];
            if (existsSync(traceFile)) {
              for (const line of readFileSync(traceFile, "utf-8").split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try { events.push(JSON.parse(trimmed)); } catch { /* skip torn line */ }
              }
            }
            sendJson(res, 200, { events });
          } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
        });
        server.middlewares.use("/api/project/approval", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const projectId = url.searchParams.get("projectId") || "";
          if (req.method === "GET") {
            try {
              if (!projectId) { sendJson(res, 400, { error: "projectId required" }); return; }
              const approvalPath = resolve(PROJECT_STORE.projectDir(projectId), "qa", "approval.json");
              if (!existsSync(approvalPath)) { sendJson(res, 200, { status: "none" }); return; }
              sendJson(res, 200, JSON.parse(readFileSync(approvalPath, "utf-8")));
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
            return;
          }
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              const status = String(body.status || "");
              const note = String(body.note || "").trim();
              const summary = String(body.summary || "").trim();
              if (!projectId) throw new Error("projectId required");
              if (!APPROVAL_STATUSES.has(status)) throw new Error(`status must be one of ${[...APPROVAL_STATUSES].join(", ")}`);
              if (status === "changes_requested" && !note) throw new Error("changes_requested requires a note (what to fix)");
              const approval = { status, note, summary, updatedAt: new Date().toISOString() };
              const approvalPath = resolve(PROJECT_STORE.projectDir(projectId), "qa", "approval.json");
              mkdirSync(pathDirname(approvalPath), { recursive: true });
              writeFileSync(approvalPath, JSON.stringify(approval, null, 2), "utf-8");
              appendFeedback({ knob: "approval", from: "", to: status, projectId, note, summary });
              // process trace — the page's "how this video was made" timeline
              try {
                const traceFile = resolve(PROJECT_STORE.projectDir(projectId), "qa", "pipeline-log.jsonl");
                mkdirSync(pathDirname(traceFile), { recursive: true });
                appendFileSync(traceFile, `${JSON.stringify({ ts: new Date().toISOString(), stage: "approval", title: `Approval: ${status}`, data: { status, note, summary } })}\n`, "utf-8");
              } catch { /* trace is best-effort */ }
              sendJson(res, 200, { ok: true, approval });
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        server.middlewares.use("/api/project/renders", (req, res) => {
          try {
            const url = new URL(req.url || "/", "http://composer.local");
            const projectId = url.searchParams.get("projectId") || "";
            if (!projectId) { sendJson(res, 400, { error: "projectId required" }); return; }
            const rendersDir = resolve(PROJECT_STORE.projectDir(projectId), "renders");
            const renders: { path: string; name: string; sizeBytes: number; mtimeIso: string }[] = [];
            const scan = (dir: string, prefix: string) => {
              if (!existsSync(dir)) return;
              for (const entry of readdirSync(dir, { withFileTypes: true })) {
                if (entry.name.startsWith(".")) continue;
                const full = pathJoin(dir, entry.name);
                if (entry.isDirectory()) scan(full, `${prefix}${entry.name}/`);
                else if (entry.name.toLowerCase().endsWith(".mp4")) {
                  const stat = statSync(full);
                  renders.push({ path: `renders/${prefix}${entry.name}`, name: entry.name, sizeBytes: stat.size, mtimeIso: stat.mtime.toISOString() });
                }
              }
            };
            scan(rendersDir, "");
            renders.sort((a, b) => b.mtimeIso.localeCompare(a.mtimeIso));
            sendJson(res, 200, { renders });
          } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
        });
        // ============ IMAGE SOURCING (PIPELINE-PRODUCTION-SPEC v3, M2) ============
        // Learning hooks (spec §7): every human override on a clip IS a
        // training signal — append to harness/memories/feedback.jsonl (the
        // file pattern_extractor mines for principle candidates). Same shape
        // as the KEEP-gate verdicts: { ts, kind, knob, from, to, projectId }.
        const appendFeedback = (record: Record<string, unknown>) => {
          try {
            appendFileSync(resolve(WORKSPACE_ROOT, "harness", "memories", "feedback.jsonl"), `${JSON.stringify({ ts: new Date().toISOString(), kind: "clip_edit", ...record })}\n`, "utf-8");
          } catch { /* feedback logging must never break the pipeline */ }
        };
        // Query cards: one search = one query -> candidates recorded on the
        // image clip (query + queryHistory + candidates metadata) AND in the
        // per-beat manifest. The UI Image tab and the agent requery tool call
        // the SAME endpoint — parity by construction.
        const stockSearch = async (q: string): Promise<unknown[]> => {
          const results: unknown[] = [];
          try {
            const us = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&orientation=landscape`, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
            if (us.ok) {
              const data = await us.json() as any;
              for (const p of data.results || []) results.push({ id: `unsplash-${p.id}`, source: "unsplash", thumb: p.urls?.small, large: p.urls?.regular, alt: p.alt_description || "", photographer: p.user?.name, url: p.links?.html });
            }
          } catch { /* provider down -> empty grid, error surfaced below */ }
          return results;
        };
        server.middlewares.use("/api/project/image-search", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, async (body) => {
            try {
              const projectId = String(body.projectId || "");
              const clipId = String(body.clipId || "");
              const query = String(body.query || "").trim();
              if (!projectId || !clipId || !query) throw new Error("projectId, clipId and query are required");
              const snapshot = PROJECT_STORE.load(projectId);
              const editorDoc = snapshot.editorDoc;
              if (!editorDoc) throw new Error("Project has no editor document");
              const clip = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
              if (!clip) throw new Error(`Unknown clip: ${clipId}`);
              if (clip.kind !== "element") throw new Error(`Clip ${clipId} is not an image element clip`);
              const candidates = await stockSearch(query);
              if (!candidates.length) throw new Error(`No results for "${query}" (provider down or empty query?)`);
              // manifest: full search history per beat — provenance ledger on disk
              const beatId = clip.source.beatId || "unassigned";
              const manifestDir = resolve(WORKSPACE_ROOT, "projects", projectId, "assets", "images");
              mkdirSync(manifestDir, { recursive: true });
              const manifestPath = resolve(manifestDir, "manifest.json");
              let manifest: Record<string, unknown> = {};
              try { manifest = JSON.parse(readFileSync(manifestPath, "utf-8")); } catch { /* fresh */ }
              const beats = (manifest.beats as Record<string, unknown[]>) || {};
              beats[beatId] = [...(beats[beatId] || []), { query, searchedAt: new Date().toISOString(), candidates }].slice(-20);
              manifest.beats = beats;
              writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
              // clip metadata: query + history + the fresh candidate set (the
              // Image tab grid reads THIS — one source of truth for the UI)
              const md = clip.metadata as Record<string, unknown>;
              const history = [...((md.queryHistory as string[]) || []), (md.query as string) || query].filter(Boolean).slice(-20);
              // learning hook: a REWORDING of the query is the demonstration
              // (ILF) — record only when the query actually changed
              if (typeof md.query === "string" && md.query && md.query !== query) {
                appendFeedback({ knob: `image.${clipId}.query`, from: md.query, to: query, projectId });
              }
              const apply = spawnSync(process.execPath, [
                "scripts/editor-ops.mjs", "--project", projectId, "--op", "metadata",
                "--clipId", clipId, "--changes", JSON.stringify({ query, queryHistory: history, candidates }),
              ], { cwd: COMPOSER_ROOT, windowsHide: true, encoding: "utf-8", timeout: 60000 });
              if (apply.status !== 0) throw new Error(String(apply.stderr || apply.stdout).slice(0, 300));
              sendJson(res, 200, { ok: true, query, candidateCount: candidates.length, candidates });
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            }
          });
        });
        // Select a candidate: download the image into the project, swap the
        // clip src, record provenance. A human selection IS a user edit — the
        // ledger marks src overridden so a later sync keeps the choice.
        server.middlewares.use("/api/project/image-select", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, async (body) => {
            try {
              const projectId = String(body.projectId || "");
              const clipId = String(body.clipId || "");
              const candidateId = String(body.candidateId || "");
              if (!projectId || !clipId || !candidateId) throw new Error("projectId, clipId and candidateId are required");
              const snapshot = PROJECT_STORE.load(projectId);
              const editorDoc = snapshot.editorDoc;
              if (!editorDoc) throw new Error("Project has no editor document");
              const clip = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
              if (!clip) throw new Error(`Unknown clip: ${clipId}`);
              const md = clip.metadata as Record<string, unknown>;
              const candidates = (md.candidates as { id: string; source: string; thumb?: string; large?: string; alt?: string; photographer?: string; url?: string }[]) || [];
              const candidate = candidates.find((c) => c.id === candidateId);
              if (!candidate) throw new Error(`Candidate ${candidateId} not on clip — run a search first`);
              if (!candidate.large) throw new Error("Candidate has no downloadable URL");
              const imagesDir = resolve(WORKSPACE_ROOT, "projects", projectId, "assets", "images");
              mkdirSync(imagesDir, { recursive: true });
              const fileName = `${candidateId.replace(/[^a-zA-Z0-9._-]/g, "_")}.jpg`;
              const resp = await fetch(candidate.large, { headers: { "User-Agent": STUDIO_UA } });
              if (!resp.ok) throw new Error(`download failed: ${resp.status}`);
              writeFileSync(resolve(imagesDir, fileName), Buffer.from(await resp.arrayBuffer()));
              const src = `${projectId}/assets/images/${fileName}`;
              const provenance = { selectedAt: new Date().toISOString(), source: candidate.source, photographer: candidate.photographer || "", alt: candidate.alt || "", url: candidate.url || "" };
              appendFeedback({ knob: `image.${clipId}.src`, from: String(md.src ?? ""), to: src, projectId, provenance: `${candidate.source}/${candidate.photographer || "?"}` });
              const apply = spawnSync(process.execPath, [
                "scripts/editor-ops.mjs", "--project", projectId, "--op", "metadata",
                "--clipId", clipId, "--changes", JSON.stringify({ src, imageProvenance: provenance }),
              ], { cwd: COMPOSER_ROOT, windowsHide: true, encoding: "utf-8", timeout: 60000 });
              if (apply.status !== 0) throw new Error(String(apply.stderr || apply.stdout).slice(0, 300));
              const publicSync = spawnSync(process.execPath, ["scripts/sync-project-public.mjs", projectId], { cwd: COMPOSER_ROOT, windowsHide: true, stdio: "ignore", timeout: 60000 });
              if (publicSync.status !== 0) throw new Error("image applied but public sync failed — preview may be stale");
              sendJson(res, 200, { ok: true, src, provenance });
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            }
          });
        });
        // CONTENT STUDIO write-path (2026-08-29): the studio edits voice-clip
        // fields (script text, direction, voice settings) through the SAME
        // editor-ops bridge the agent uses — one sanctioned write-path, the
        // editor doc stays the single truth. Audio regen/takes keep their
        // existing endpoints.
        server.middlewares.use("/api/project/clip-metadata", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              const clipId = String(body.clipId || "");
              const changes = body.changes;
              if (!projectId || !clipId || !changes || typeof changes !== "object" || Array.isArray(changes)) throw new Error("projectId, clipId and changes (object) are required");
              const allowed = new Set(["sentenceText", "providerText", "voiceSettings", "transcript"]);
              for (const key of Object.keys(changes)) if (!allowed.has(key)) throw new Error(`field "${key}" is not studio-editable (allowed: ${[...allowed].join(", ")})`);
              // value-type gates (cold-diff review MINOR #2: a malformed POST
              // must never corrupt the single-truth editor doc)
              for (const key of ["sentenceText", "providerText", "transcript"]) {
                if (key in changes && typeof changes[key] !== "string") throw new Error(`${key} must be a string`);
              }
              if ("voiceSettings" in changes) {
                const vs = changes.voiceSettings;
                if (typeof vs !== "object" || vs === null || Array.isArray(vs)) throw new Error("voiceSettings must be an object");
                for (const [key, value] of Object.entries(vs as Record<string, unknown>)) {
                  if (["stability", "style", "speed", "similarityBoost"].includes(key) && typeof value !== "number") throw new Error(`voiceSettings.${key} must be a number`);
                  if (["voiceId", "modelId"].includes(key) && typeof value !== "string") throw new Error(`voiceSettings.${key} must be a string`);
                }
              }
              const snapshot = PROJECT_STORE.load(projectId);
              const clip = snapshot.editorDoc?.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
              if (!clip) throw new Error(`Unknown clip: ${clipId}`);
              if (clip.kind !== "voice") throw new Error(`Clip ${clipId} is not a voice clip`);
              const apply = spawnSync(process.execPath, [
                "scripts/editor-ops.mjs", "--project", projectId, "--op", "metadata",
                "--clipId", clipId, "--changes", JSON.stringify(changes),
              ], { cwd: COMPOSER_ROOT, windowsHide: true, encoding: "utf-8", timeout: 60000 });
              if (apply.status !== 0) throw new Error(String(apply.stderr || apply.stdout).slice(0, 300));
              // learning hooks (parity audit gap, CONTENT-STUDIO-SPEC §2): a
              // human edit of the script text or voice direction IS a
              // training signal — same jsonl shape as take-switch hooks
              for (const field of ["sentenceText", "providerText"]) {
                if (typeof changes[field] === "string" && changes[field] !== (clip.metadata as Record<string, unknown>)[field]) {
                  appendFeedback({ knob: `voice.${clipId}.${field}`, from: String((clip.metadata as Record<string, unknown>)[field] ?? ""), to: changes[field], projectId });
                }
              }
              sendJson(res, 200, { ok: true, clipId, changes });
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            }
          });
        });
        // ============ SCRIPT BEAT CRUD (CONTENT-STUDIO-SPEC §5) ============
        // The script is a living document: add/delete/move/edit beats writes
        // through scripts/script-beat.mjs (store-sanctioned, validated,
        // traced) — the edit-doc is the script truth, BEFORE any voice exists.
        server.middlewares.use("/api/project/script-beat", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              const op = String(body.op || "");
              const OPS = new Set(["set-transcript", "set-direction", "add", "delete", "move", "set-treatment", "set-duration"]);
              if (!projectId || !/^[a-zA-Z0-9._-]+$/.test(projectId)) throw new Error("projectId required (safe id)");
              if (!OPS.has(op)) throw new Error(`op must be one of: ${[...OPS].join(", ")}`);
              const needsBeatId = op !== "add";
              const beatId = String(body.beatId || "");
              if (needsBeatId && !beatId) throw new Error("beatId required");
              if (beatId && !/^[a-zA-Z0-9._:-]+$/.test(beatId)) throw new Error("beatId must be a safe id");
              const text = String(body.text ?? "");
              if ((op === "set-transcript" || op === "add") && !text.trim()) throw new Error("text required (non-empty transcript)");
              if (op === "move" && body.dir !== "up" && body.dir !== "down") throw new Error('dir must be "up" or "down"');
              if (op === "set-treatment") {
                const TREATMENTS = new Set(["audience-demand-proof", "screen-proof-in-world", "semantic-diagram", "host-reflection-cinematic", "cinematic-metaphor", "chapter-card", "candidate-comparison", "process-timeline"]);
                if (!TREATMENTS.has(String(body.treatment))) throw new Error(`treatment must be one of: ${[...TREATMENTS].join(", ")}`);
              }
              if (op === "set-duration" && (typeof body.duration !== "number" || body.duration < 1 || body.duration > 600)) throw new Error("duration must be 1-600 seconds");
              const snapshot = PROJECT_STORE.load(projectId);
              if (!snapshot.editDoc) throw new Error("Project has no edit document — write a script first");
              // argv array spawn (no shell) — values with spaces/quotes are
              // safe; the empty-string value for clearing a direction passes
              // through correctly (script-beat's parser accepts it)
              const cmd = ["scripts/script-beat.mjs", "--project", projectId, "--op", op];
              if (beatId) cmd.push("--beatId", beatId);
              if (op === "set-transcript" || op === "set-direction" || op === "add") cmd.push("--text", text);
              if (op === "move") cmd.push("--dir", String(body.dir));
              if (op === "set-treatment") cmd.push("--treatment", String(body.treatment));
              if (op === "set-duration") cmd.push("--duration", String(body.duration));
              if (op === "add" && body.index !== undefined && body.index !== null) cmd.push("--index", String(body.index));
              const apply = spawnSync(process.execPath, cmd, { cwd: COMPOSER_ROOT, windowsHide: true, encoding: "utf-8", timeout: 60000 });
              if (apply.status !== 0) {
                const errorText = String(apply.stderr || apply.stdout).trim();
                try { throw new Error(JSON.parse(errorText).error); } catch { throw new Error(errorText.slice(0, 300) || `script-beat exited ${apply.status}`); }
              }
              const result = JSON.parse(String(apply.stdout).trim().split(/\r?\n/).filter((l) => l.trim().startsWith("{")).pop() || "{}");
              sendJson(res, 200, result);
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            }
          });
        });
        // ============ TIMELINE GENERATION (PIPELINE-PRODUCTION-SPEC v3, M3) ============
        // generate_timeline: pre-flight validate + generate + report. The UI
        // Timeline-QA tab and the agent's generate_timeline tool call the SAME
        // script — the report file is the shared artifact both surfaces read.
        const timelineJobs = new Map<string, { status: "generating" | "done" | "error"; startedAt: number; message?: string; result?: unknown }>();
        server.middlewares.use("/api/project/generate-timeline/status", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const jobId = url.searchParams.get("jobId") || "";
          const job = timelineJobs.get(jobId);
          if (!job) { sendJson(res, 404, { error: "Unknown timeline job" }); return; }
          sendJson(res, 200, { status: job.status, elapsedSec: Math.round((Date.now() - job.startedAt) / 1000), message: job.message, result: job.status === "done" ? job.result : undefined });
        });
        server.middlewares.use("/api/project/timeline-report", (req, res) => {
          try {
            const url = new URL(req.url || "/", "http://composer.local");
            const projectId = url.searchParams.get("projectId") || "";
            if (!projectId) { sendJson(res, 400, { error: "projectId required" }); return; }
            const reportPath = resolve(PROJECT_STORE.projectDir(projectId), "qa", "timeline-report.json");
            if (!existsSync(reportPath)) { sendJson(res, 404, { error: "No timeline report yet — generate first" }); return; }
            sendJson(res, 200, JSON.parse(readFileSync(reportPath, "utf-8")));
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
          }
        });
        server.middlewares.use("/api/project/generate-timeline", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              if (!projectId) throw new Error("projectId is required");
              const mode = body.mode === "cold" ? "cold" : "sync";
              const jobId = `timeline-${Date.now()}`;
              timelineJobs.set(jobId, { status: "generating", startedAt: Date.now() });
              const child = spawn(process.execPath, ["scripts/generate-timeline.mjs", "--project", projectId, "--mode", mode], {
                cwd: COMPOSER_ROOT, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
              });
              let stdout = ""; let stderr = "";
              child.stdout.on("data", (c: Buffer) => stdout += c.toString());
              child.stderr.on("data", (c: Buffer) => stderr += c.toString());
              child.on("error", (error) => {
                timelineJobs.set(jobId, { status: "error", startedAt: Date.now(), message: error.message });
              });
              child.on("exit", (code) => {
                const job = timelineJobs.get(jobId);
                if (!job) return;
                try {
                  const jsonSpan = (text: string) => text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
                  const result = JSON.parse(jsonSpan(stdout) || jsonSpan(stderr) || "{}");
                  if (code !== 0 && !result.generated) {
                    job.status = "error";
                    job.message = result.blocking ? `blocked: ${result.blocking ?? "?"} issue(s) — see report` : `generate-timeline exited ${code}`;
                    job.result = result;
                    return;
                  }
                  job.status = "done";
                  job.result = result;
                } catch {
                  job.status = "error";
                  job.message = `unparseable output (exit ${code}): ${(stderr || stdout).slice(0, 200)}`;
                }
              });
              sendJson(res, 200, { jobId, projectId, mode });
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            }
          });
        });
        // ============ VOICE PIPELINE (PIPELINE-PRODUCTION-SPEC v3) ============
        // Regen ONE voice clip: TTS takes + deterministic QC + post-chain +
        // apply onto the editor doc via the bridge (revision bump, per-field
        // override keeps user-edited providerText). Job pattern mirrors
        // /api/render: the UI and the agent call the SAME endpoint.
        const voiceJobs = new Map<string, { status: "regenerating" | "done" | "error"; startedAt: number; message?: string; result?: unknown }>();
        // Stage F take switcher (M1b): the status poll is shared with regen —
        // both jobs land in the same map, one endpoint to watch.
        server.middlewares.use("/api/project/audio-take/status", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const jobId = url.searchParams.get("jobId") || "";
          const job = voiceJobs.get(jobId);
          if (!job) { sendJson(res, 404, { error: "Unknown voice job" }); return; }
          sendJson(res, 200, {
            status: job.status,
            elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
            message: job.message,
            result: job.status === "done" ? job.result : undefined,
          });
        });
        // Stage F: switch the clip to an EXISTING take (no new TTS calls) —
        // re-run post-chain + QC on the take, apply via the same voice_apply
        // bridge op. UI take switcher and agent tool call the SAME endpoint.
        server.middlewares.use("/api/project/audio-take", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              const clipId = String(body.clipId || "");
              const takeId = String(body.takeId || "");
              if (!projectId || !clipId || !takeId) throw new Error("projectId, clipId and takeId are required");
              const snapshot = PROJECT_STORE.load(projectId);
              const editorDoc = snapshot.editorDoc;
              if (!editorDoc) throw new Error("Project has no editor document");
              const clip = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
              if (!clip) throw new Error(`Unknown clip: ${clipId}`);
              if (clip.kind !== "voice") throw new Error(`Clip ${clipId} is not a voice clip`);
              const md = clip.metadata as Record<string, unknown>;
              const breathPadSec = typeof body.breathPadSec === "number" ? body.breathPadSec : (typeof md.breathPadSec === "number" ? md.breathPadSec : undefined);
              const payload = { projectId, clipId, takeId, ...(breathPadSec !== undefined ? { breathPadSec } : {}) };
              // learning hook (spec §7): a human take override is the
              // STRONGEST voice signal — record the swap for the extractor
              appendFeedback({ knob: `voice.${clipId}.takeId`, from: String(md.takeId ?? ""), to: takeId, projectId });
              const jobId = `voice-take-${Date.now()}`;
              voiceJobs.set(jobId, { status: "regenerating", startedAt: Date.now() });
              const child = spawn(PY, [resolve(WORKSPACE_ROOT, "tools/audio/voice_take.py")], {
                cwd: WORKSPACE_ROOT, windowsHide: true,
                stdio: ["pipe", "pipe", "pipe"],
              });
              let stdout = ""; let stderr = "";
              child.stdout.on("data", (c: Buffer) => stdout += c.toString());
              child.stderr.on("data", (c: Buffer) => stderr += c.toString());
              child.stdin.write(JSON.stringify(payload));
              child.stdin.end();
              child.on("error", (error) => {
                voiceJobs.set(jobId, { status: "error", startedAt: Date.now(), message: error.message });
              });
              child.on("exit", (code) => {
                const job = voiceJobs.get(jobId);
                if (!job) return;
                if (code !== 0) {
                  job.status = "error";
                  job.message = `voice_take exited ${code}: ${(stderr || stdout).slice(0, 300)}`;
                  return;
                }
                try {
                  const jsonSpan = (text: string) => text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
                  const result = JSON.parse(jsonSpan(stdout) || "{}");
                  if (!result.ok) throw new Error(result.error || "voice_take reported failure");
                  const apply = spawnSync(process.execPath, [
                    "scripts/editor-ops.mjs", "--project", projectId, "--op", "voice_apply",
                    "--clipId", clipId, "--result", JSON.stringify(result),
                  ], { cwd: COMPOSER_ROOT, windowsHide: true, encoding: "utf-8", timeout: 60000 });
                  if (apply.status !== 0) throw new Error(String(apply.stderr || apply.stdout).slice(0, 300));
                  const publicSync = spawnSync(process.execPath, ["scripts/sync-project-public.mjs", projectId], { cwd: COMPOSER_ROOT, windowsHide: true, stdio: "ignore", timeout: 60000 });
                  if (publicSync.status !== 0) throw new Error("stem applied but public sync failed — preview audio may be stale");
                  job.status = "done";
                  job.result = { ...result, applied: JSON.parse(jsonSpan(apply.stdout) || "{}") };
                } catch (error) {
                  job.status = "error";
                  job.message = error instanceof Error ? error.message : String(error);
                }
              });
              sendJson(res, 200, { jobId, clipId, takeId });
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            }
          });
        });
        server.middlewares.use("/api/project/audio-regen/status", (req, res) => {
          const url = new URL(req.url || "/", "http://composer.local");
          const jobId = url.searchParams.get("jobId") || "";
          const job = voiceJobs.get(jobId);
          if (!job) { sendJson(res, 404, { error: "Unknown voice job" }); return; }
          sendJson(res, 200, {
            status: job.status,
            elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
            message: job.message,
            result: job.status === "done" ? job.result : undefined,
          });
        });
        server.middlewares.use("/api/project/audio-regen", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "");
              const clipId = String(body.clipId || "");
              if (!projectId || !clipId) throw new Error("projectId and clipId are required");
              const snapshot = PROJECT_STORE.load(projectId);
              const editorDoc = snapshot.editorDoc;
              if (!editorDoc) throw new Error("Project has no editor document");
              const clip = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
              if (!clip) throw new Error(`Unknown clip: ${clipId}`);
              if (clip.kind !== "voice") throw new Error(`Clip ${clipId} is not a voice clip`);
              const md = clip.metadata as Record<string, unknown>;
              // CURRENT state wins (user edits included) — parity: the timeline
              // clip is the single source of truth for what gets spoken.
              const providerText = String(
                body.providerText ?? md.providerText ?? md.sentenceText ?? md.transcript ?? "",
              ).trim();
              if (!providerText) throw new Error("clip has no providerText/sentenceText/transcript to speak");
              const settings = {
                ...(md.voiceSettings as Record<string, unknown> ?? {}),
                ...(body.voiceSettings as Record<string, unknown> ?? {}),
              };
              const payload = {
                projectId, clipId, providerText, voiceSettings: settings,
                expectedSec: typeof body.expectedSec === "number" ? body.expectedSec : undefined,
                takes: typeof body.takes === "number" ? body.takes : 2,
              };
              const jobId = `voice-${Date.now()}`;
              voiceJobs.set(jobId, { status: "regenerating", startedAt: Date.now() });
              const child = spawn(PY, [resolve(WORKSPACE_ROOT, "tools/audio/voice_regen.py")], {
                cwd: WORKSPACE_ROOT, windowsHide: true,
                stdio: ["pipe", "pipe", "pipe"],
              });
              let stdout = ""; let stderr = "";
              child.stdout.on("data", (c: Buffer) => stdout += c.toString());
              child.stderr.on("data", (c: Buffer) => stderr += c.toString());
              child.stdin.write(JSON.stringify(payload));
              child.stdin.end();
              child.on("error", (error) => {
                voiceJobs.set(jobId, { status: "error", startedAt: Date.now(), message: error.message });
              });
              child.on("exit", (code) => {
                const job = voiceJobs.get(jobId);
                if (!job) return;
                if (code !== 0) {
                  job.status = "error";
                  job.message = `voice_regen exited ${code}: ${(stderr || stdout).slice(0, 300)}`;
                  return;
                }
                try {
                  const jsonSpan = (text: string) => text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
                  const result = JSON.parse(jsonSpan(stdout) || "{}");
                  if (!result.ok) throw new Error(result.error || "voice_regen reported failure");
                  // apply onto the editor doc through the BRIDGE (revision +
                  // optimistic locking + validation — never a direct write)
                  const apply = spawnSync(process.execPath, [
                    "scripts/editor-ops.mjs", "--project", projectId, "--op", "voice_apply",
                    "--clipId", clipId, "--result", JSON.stringify(result),
                  ], { cwd: COMPOSER_ROOT, windowsHide: true, encoding: "utf-8", timeout: 60000 });
                  if (apply.status !== 0) throw new Error(String(apply.stderr || apply.stdout).slice(0, 300));
                  // Sync the fresh stem + docs into public/ — the preview
                  // fetches audio from the vite public dir; without this the
                  // browser keeps playing the STALE stem after a regen.
                  const publicSync = spawnSync(process.execPath, ["scripts/sync-project-public.mjs", projectId], { cwd: COMPOSER_ROOT, windowsHide: true, stdio: "ignore", timeout: 60000 });
                  if (publicSync.status !== 0) throw new Error("stem synced to editor doc but public sync failed — preview audio may be stale");
                  // keep the edit-doc's voice segment in lockstep with the
                  // fresh stem: the stale-stem detector compares this segment
                  // against beat.transcript/direction — without this sync a
                  // per-clip regen would look stale forever and the next
                  // partial generate would RE-BILL TTS for a fresh stem
                  try {
                    const fresh = PROJECT_STORE.load(projectId);
                    const voiceClip = fresh.editorDoc?.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
                    const segBeatId = String(clip.source?.beatId ?? "");
                    const seg = fresh.editDoc?.audioPlan?.voice?.find((s) => (s.beatId ?? String(s.id ?? "").split(":").pop()) === segBeatId);
                    if (fresh.editDoc && seg && voiceClip && fresh.videoDoc) {
                      seg.transcript = String(md.sentenceText ?? md.transcript ?? providerText);
                      seg.providerText = providerText;
                      seg.startSec = voiceClip.range.startSec;
                      seg.endSec = voiceClip.range.endSec;
                      if (result.qc) seg.qc = result.qc;
                      if (result.takeId) seg.takeId = result.takeId;
                      if (Array.isArray(result.takes)) seg.takes = result.takes.filter((t: unknown) => t && typeof t === "object").map((t: { id?: string; pass?: boolean; metrics?: { durationSec?: number }; path?: string }) => ({ id: t.id, pass: t.pass === true, durationSec: t.metrics?.durationSec, path: t.path }));
                      PROJECT_STORE.saveSourceDocs(projectId, fresh.videoDoc, fresh.editDoc);
                    }
                  } catch { /* non-fatal: the stem + editor doc are already correct */ }
                  job.status = "done";
                  job.result = { ...result, applied: JSON.parse(jsonSpan(apply.stdout) || "{}") };
                } catch (error) {
                  job.status = "error";
                  job.message = error instanceof Error ? error.message : String(error);
                }
              });
              sendJson(res, 200, { jobId, clipId, providerText });
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            }
          });
        });
        server.middlewares.use("/api/render", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "isaacverse-final");
              const snapshot = PROJECT_STORE.load(projectId);
              const durationSec = typeof snapshot.editorDoc?.durationSec === "number" ? snapshot.editorDoc.durationSec : 0;
              if (durationSec <= 0) throw new Error("Project editor document has no duration");
              const quality = typeof body.quality === "string" ? body.quality : "draft";
              const scale = typeof body.scale === "number" && body.scale > 0 ? body.scale : undefined;
              const sync = spawnSync(process.execPath, ["scripts/sync-project-public.mjs", projectId], { cwd: COMPOSER_ROOT, windowsHide: true, stdio: "ignore" });
              if (sync.status !== 0) throw new Error("Failed to sync project files before render");
              const jobId = `job-${Date.now()}`;
              const outputRel = `renders/exports/${projectId}-${quality}-${jobId}.mp4`;
              const outputPath = resolve(WORKSPACE_ROOT, "projects", projectId, outputRel);
              mkdirSync(resolve(WORKSPACE_ROOT, "projects", projectId, "renders", "exports"), { recursive: true });
              const args = ["scripts/render-window.mjs", "--project", projectId, "--start", "0", "--end", String(durationSec), "--quality", quality, "--padding", "0", "--output", outputPath];
              if (scale !== undefined) args.push("--scale", String(scale));
              const child = spawn(process.execPath, args, { cwd: COMPOSER_ROOT, windowsHide: true, stdio: "ignore" });
              const job = { status: "rendering" as const, startedAt: Date.now(), outputPath: outputRel };
              renderJobs.set(jobId, job);
              child.on("exit", (code) => {
                const current = renderJobs.get(jobId);
                if (current) {
                  current.status = code === 0 ? "done" : "error";
                  if (code !== 0) current.message = `Remotion exited with code ${code}`;
                }
              });
              child.on("error", (error) => {
                const current = renderJobs.get(jobId);
                if (current) { current.status = "error"; current.message = error.message; }
              });
              sendJson(res, 200, { jobId, outputPath: outputRel });
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        // --- Project list ---
        server.middlewares.use("/api/projects/list", (_req, res) => {
          try { sendJson(res, 200, PROJECT_STORE.listProjects()); }
          catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
        });
        // --- Create blank project ---
        server.middlewares.use("/api/projects/create", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (body) => {
            try {
              const projectId = String(body.projectId || "").trim();
              if (!projectId || !/^[a-zA-Z0-9._-]+$/.test(projectId)) { sendJson(res, 400, { error: "Invalid project ID" }); return; }
              const snapshot = PROJECT_STORE.createBlankProject(projectId);
              sendJson(res, 200, { projectId, state: snapshot.state });
            } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
          });
        });
        // --- SSE: file-system change notifications ---
        const sseClients = new Set<import("http").ServerResponse>();
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const changedProjects = new Set<string>();
        try {
          watch(PROJECTS_ROOT, { recursive: true }, (_event, filename) => {
            if (!filename) return;
            const projectId = filename.split(/[\\/]/)[0];
            if (projectId && /^[a-zA-Z0-9._-]+$/.test(projectId)) changedProjects.add(projectId);
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              for (const pid of changedProjects) {
                for (const client of sseClients) {
                  client.write(`data: change:${pid}\n\n`);
                }
              }
              changedProjects.clear();
              debounceTimer = null;
            }, 200);
          });
        } catch { /* fs.watch not available */ }
        server.middlewares.use("/api/sse", (req, res) => {
          if (req.headers.accept !== "text/event-stream") { sendJson(res, 400, { error: "SSE requires Accept: text/event-stream" }); return; }
          res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
          res.write("data: connected\n\n");
          sseClients.add(res);
          req.on("close", () => { sseClients.delete(res); });
        });
      },
    },
  ],
});
