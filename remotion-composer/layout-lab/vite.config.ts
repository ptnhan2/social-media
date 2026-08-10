import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const REGISTRY = resolve("C:/DevWork/social-media/libraries/04-visual/registry.json");
const PREVIEWS = resolve("C:/DevWork/social-media/libraries/04-visual/previews");
const PUBLIC_DIR = resolve("C:/DevWork/social-media/remotion-composer/public");

export default defineConfig({
  // Serve remotion-composer/public (fonts, images, cutouts) as static assets
  publicDir: PUBLIC_DIR,
  plugins: [
    react(),
    {
      name: "layout-lab-api",
      configureServer(server) {
        server.middlewares.use("/api/registry", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(readFileSync(REGISTRY, "utf-8"));
        });
        server.middlewares.use("/api/vote", (req, res) => {
          if (req.method !== "POST") { res.statusCode = 405; res.end("405"); return; }
          let body = ""; req.on("data", c => body += c);
          req.on("end", () => {
            const { id, vote } = JSON.parse(body);
            const reg = JSON.parse(readFileSync(REGISTRY, "utf-8"));
            const item = reg.items.find(i => i.id === id);
            if (!item) { res.statusCode = 404; res.end("404"); return; }
            if (vote === "up") { item.use_count = (item.use_count||0)+1; item.status = "approved"; }
            else { item.reject_count = (item.reject_count||0)+1; if (item.reject_count >= 2) item.status = "demoted"; }
            writeFileSync(REGISTRY, JSON.stringify(reg, null, 2));
            res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(reg));
          });
        });
        // NEW: select variant within a layout
        server.middlewares.use("/api/select", (req, res) => {
          if (req.method !== "POST") { res.statusCode = 405; res.end("405"); return; }
          let body = ""; req.on("data", c => body += c);
          req.on("end", () => {
            const { layoutId, pool, variantId } = JSON.parse(body);
            const reg = JSON.parse(readFileSync(REGISTRY, "utf-8"));
            const item = reg.items.find(i => i.id === layoutId);
            if (!item || !item.variant_pools?.[pool]) { res.statusCode = 404; res.end("404"); return; }
            item.variant_pools[pool].selected = variantId;
            writeFileSync(REGISTRY, JSON.stringify(reg, null, 2));
            res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(reg));
          });
        });
        server.middlewares.use("/previews", (req, res) => {
          const file = resolve(PREVIEWS, req.url.replace(/^\//, ""));
          try { res.setHeader("Content-Type", "image/png"); res.end(readFileSync(file)); }
          catch { res.statusCode = 404; res.end("404"); }
        });
      },
    },
  ],
});
