import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { extname, join, resolve, normalize } from "path";

// Serve project files (videos, images) for preview in the frontend
function projectFileServer(projectRoot: string) {
  return {
    name: "project-file-server",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req.url?.startsWith("/video/")) return next();
        // /video/projects/xxx/renders/y.mp4 -> projectRoot/projects/xxx/renders/y.mp4
        const relPath = decodeURIComponent(req.url.replace("/video/", ""));
        const absPath = normalize(join(projectRoot, relPath));
        // Security: ensure path is within project root
        if (!absPath.startsWith(resolve(projectRoot))) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }
        try {
          const ext = extname(absPath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
          };
          const mime = mimeTypes[ext] || "application/octet-stream";
          const data = readFileSync(absPath);
          res.setHeader("Content-Type", mime);
          res.setHeader("Content-Length", data.length);
          res.end(data);
        } catch {
          res.statusCode = 404;
          res.end("File not found");
        }
      });
    },
  };
}

const PROJECT_ROOT = resolve(__dirname, "..", "..");

export default defineConfig({
  plugins: [react(), projectFileServer(PROJECT_ROOT)],
  server: {
    proxy: {
      "/api": "http://localhost:2024",
    },
  },
});
