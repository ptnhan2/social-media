import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, watch } from "fs";
import { resolve, sep } from "path";
import { fileURLToPath } from "url";
import { spawn, spawnSync } from "child_process";
import { createProjectStore } from "../shared/isaacverse/store";
import { dispatchLocalOperation } from "../shared/isaacverse/operations";
import { createKiloHandoff, listKiloHandoffs, updateKiloHandoff } from "../shared/isaacverse/handoff";

// Portable workspace layout: this config lives at
// <workspace>/remotion-composer/composer-app/vite.config.ts — derive every
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
  // python exits 1 for {ok: false} results too — surface that JSON instead of
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
        // Upload an image (base64) → save to public/uploads → return its URL.
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

        // Python processing bridge: forwards {op, ...} to tools/assets/asset_api.py
        server.middlewares.use("/api/assets/bridge", (req, res) => {
          if (req.method !== "POST") { sendJson(res, 405, { error: "POST required" }); return; }
          readBody(req, res, (cmd) => {
            try { sendJson(res, 200, runAssetBridge(cmd)); }
            catch (e) { sendJson(res, 500, { error: String((e as Error).message || e) }); }
          });
        });

        // Serve studio files (inbox/poses/head) — path-restricted
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
