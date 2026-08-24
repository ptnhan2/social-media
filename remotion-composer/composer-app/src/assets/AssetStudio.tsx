import React from "react";

/**
 * ASSET STUDIO V2 — full workflow: search presets → body → cut head → composite → save.
 *
 * Smart features:
 * - Stock search: preset pose keywords matching our pose library
 * - Cut tool: polygon lasso + horizontal line + auto-suggest head position
 * - Composite: drag head, snap guides, auto-detect body top
 * - Stepper UI: always shows current step + what's next
 */

type StockResult = { id: string; source: string; thumb: string; large: string; alt: string; photographer: string };
type PoseEntry = { name: string; anchor: Record<string, unknown> };
type Pt = { x: number; y: number };
type Mode = "idle" | "body" | "cut" | "composite";
type CutTool = "polygon" | "horizontal";

const DISPLAY_W = 560;
const DISPLAY_H = 720;

const bridge = (cmd: Record<string, unknown>) =>
  fetch("/api/assets/bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cmd) })
    .then(async (r) => {
      const data = await r.json();
      if (!r.ok || data.ok === false) throw new Error(data.error || `bridge ${r.status}`);
      return data as Record<string, unknown>;
    });

const fileUrl = (p: string) => {
  let rel = p.replace(/\\/g, "/").replace(/^C:\/?/i, "");
  rel = rel.replace(/^DevWork\/social-media\//i, "");
  return `/api/assets/file?p=${encodeURIComponent(rel)}`;
};

// Preset search queries matching our pose library needs
const SEARCH_PRESETS = [
  { label: "👉 Chỉ tay", query: "man pointing hand gesture isolated white background" },
  { label: "🤔 Suy nghĩ", query: "man thinking hand on chin isolated white background" },
  { label: "🎉 Ăn mừng", query: "man celebrating arms raised isolated white background" },
  { label: "🤷 Xõe tay", query: "man shrugging shoulders isolated white background" },
  { label: "🎤 Trình bày", query: "man presenting gesture isolated white background" },
  { label: "😌 Thư giãn", query: "person leaning casual pose isolated studio" },
  { label: "😱 Ngạc nhiên", query: "man surprised shocked expression isolated" },
  { label: "😤 Tự tin", query: "confident man arms crossed isolated white background" },
];

export const AssetStudio: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => {
  // --- state ---
  const [stockQuery, setStockQuery] = React.useState("");
  const [stockResults, setStockResults] = React.useState<StockResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const [mode, setMode] = React.useState<Mode>("idle");
  const [bodyPath, setBodyPath] = React.useState<string | null>(null);
  const [bodyDisplayUrl, setBodyDisplayUrl] = React.useState<string | null>(null);

  const [cutImagePath, setCutImagePath] = React.useState<string | null>(null);
  const [cutDisplayUrl, setCutDisplayUrl] = React.useState<string | null>(null);

  const [polygon, setPolygon] = React.useState<Pt[]>([]);
  const [polygonClosed, setPolygonClosed] = React.useState(false);
  const [mousePos, setMousePos] = React.useState<Pt | null>(null);
  const [cutModeKeep, setCutModeKeep] = React.useState(true);
  const [cutTool, setCutTool] = React.useState<CutTool>("polygon");
  const [hLineY, setHLineY] = React.useState(200);

  const [headPath, setHeadPath] = React.useState<string | null>(null);
  const [headUrl, setHeadUrl] = React.useState<string | null>(null);

  const [headX, setHeadX] = React.useState(140);
  const [headY, setHeadY] = React.useState(20);
  const [headScale, setHeadScale] = React.useState(1.0);
  const [headRotation, setHeadRotation] = React.useState(0);

  const [poses, setPoses] = React.useState<PoseEntry[]>([]);
  const [poseName, setPoseName] = React.useState("");
  const [status, setStatus] = React.useState("Bắt đầu: tìm ảnh stock hoặc generate head");
  const [busy, setBusy] = React.useState(false);

  // Gen AI state
  type Recipe = {
    label: string; description: string; enabled?: boolean;
    fields: { name: string; label: string; type: string; options: string[]; optional?: boolean }[];
  };
  const [recipes, setRecipes] = React.useState<Record<string, Recipe>>({});
  const [selectedRecipe, setSelectedRecipe] = React.useState("");
  const [recipeFields, setRecipeFields] = React.useState<Record<string, string>>({});
  const [genResults, setGenResults] = React.useState<{ url: string; path: string }[]>([]);

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ mx: number; my: number; hx: number; hy: number } | null>(null);
  const [draggingLine, setDraggingLine] = React.useState(false);

  // --- helpers ---
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true); setStatus(label);
    try { await fn(); } catch (e) { setStatus(`❌ ${String((e as Error).message || e)}`); }
    finally { setBusy(false); }
  };

  const refreshPoses = React.useCallback(async () => {
    try {
      const data = await bridge({ op: "list-poses", project: projectId });
      setPoses((data.poses as PoseEntry[]) || []);
    } catch { /* ignore */ }
  }, [projectId]);

  const loadRecipes = React.useCallback(async () => {
    try {
      const data = await bridge({ op: "list-recipes" });
      const r = (data.recipes as Record<string, Recipe>) || {};
      setRecipes(r);
      const first = Object.keys(r)[0];
      if (first) {
        setSelectedRecipe(first);
        const defaults: Record<string, string> = {};
        for (const f of r[first].fields) defaults[f.name] = f.options[0];
        setRecipeFields(defaults);
      }
    } catch { /* ignore */ }
  }, []);

  React.useEffect(() => { void refreshPoses(); void loadRecipes(); }, [refreshPoses, loadRecipes]);

  // --- stock search ---
  const doSearch = (q?: string) => {
    const query = q || stockQuery;
    if (q) setStockQuery(q);
    return run("Đang tìm ảnh…", async () => {
      const r = await fetch(`/api/assets/search-stock?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      setStockResults(data.results || []);
      setStatus(`${(data.results || []).length} kết quả — click ảnh để import.`);
    });
  };

  const importStock = (item: StockResult) => run("Đang tải ảnh…", async () => {
    const r = await fetch("/api/assets/body", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, url: item.large }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "import failed");
    setBodyPath(data.path);
    setBodyDisplayUrl(fileUrl(data.path));
    setMode("body");
    setStatus("Body đã import → bấm 'Tách nền (AI)'");
  });

  const onUploadBody = (file: File) => run("Đang upload…", async () => {
    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result));
      reader.readAsDataURL(file);
    });
    const r = await fetch("/api/assets/body", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, data: dataUrl }),
    });
    const data = await r.json();
    setBodyPath(data.path);
    setBodyDisplayUrl(fileUrl(data.path));
    setMode("body");
    setStatus("Body đã upload → bấm 'Tách nền (AI)'");
  });

  // --- Gen AI ---
  const doGenerate = () => run("Đang generate (AI ~30s)…", async () => {
    const data = await bridge({ op: "generate", recipe: selectedRecipe, fields: recipeFields, project: projectId });
    setGenResults((prev) => [{ url: fileUrl(String(data.out)), path: String(data.out) }, ...prev].slice(0, 6));
    setStatus("✓ Generated — click ảnh để dùng làm head");
  });

  const selectGenResult = (item: { url: string; path: string }) => {
    setCutImagePath(item.path);
    setCutDisplayUrl(item.url);
    setHeadPath(item.path);
    setHeadUrl(item.url);
    setPolygon([]); setPolygonClosed(false);
    setMode("cut");
    setStatus("Head từ AI — cắt bằng polygon tool hoặc bấm 'Bỏ qua cắt' nếu đã sạch");
  };

  const uploadHead = (file: File) => run("Đang upload head…", async () => {
    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result));
      reader.readAsDataURL(file);
    });
    const r = await fetch("/api/assets/body", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, data: dataUrl }),
    });
    const data = await r.json();
    setCutImagePath(data.path);
    setCutDisplayUrl(fileUrl(data.path));
    setPolygon([]); setPolygonClosed(false);
    setMode("cut");
    setStatus("Click quanh viền đầu để vẽ polygon → 'Áp dụng cắt'");
  });

  // --- bg removal ---
  const removeBg = () => run("Đang tách nền (AI)…", async () => {
    if (!bodyPath) return;
    const out = bodyPath.replace(/\.[^.]+$/, "-cutout.png");
    const data = await bridge({ op: "remove-bg", in: bodyPath, out, algo: "auto" });
    setBodyPath(String(data.out));
    setBodyDisplayUrl(fileUrl(String(data.out)));
    setStatus(`✓ Tách nền xong (${data.algoUsed}) → chuẩn bị head (upload hoặc Gen AI)`);
  });

  // --- polygon cut ---
  const applyCut = () => run("Đang áp dụng cắt…", async () => {
    if (!cutImagePath) return;
    const out = cutImagePath.replace(/\.[^.]+$/, "-cut.png");
    const data = await bridge({
      op: "polygon-mask",
      in: cutImagePath,
      polygon: cutTool === "polygon" ? polygon : [{ x: 0, y: hLineY }, { x: DISPLAY_W, y: hLineY }, { x: DISPLAY_W, y: 0 }, { x: 0, y: 0 }],
      mode: cutModeKeep ? "keep" : "remove",
      out,
      normalize: true,
    });
    setHeadPath(String(data.out));
    setHeadUrl(fileUrl(String(data.out)));
    setMode("composite");
    setStatus("✓ Head đã cắt! Kéo vào vị trí trên body → 'Lưu pose'");
  });

  const skipCut = () => {
    if (!cutImagePath) return;
    setHeadPath(cutImagePath);
    setHeadUrl(cutDisplayUrl);
    setMode("composite");
    setStatus("Bỏ qua cắt — kéo head vào vị trí → 'Lưu pose'");
  };

  // --- auto-position head ---
  const autoPosition = () => {
    // Place head at top-center of canvas (where a head would naturally go)
    setHeadX(DISPLAY_W / 2 - 150);
    setHeadY(-30);
    setHeadScale(1.2);
    setStatus("Đã tự động đặt head ở vị trí gợi ý — kéo để tinh chỉnh");
  };

  // --- save pose ---
  const savePose = () => run("Đang lưu pose…", async () => {
    if (!bodyPath || !headPath || !poseName.trim()) {
      setStatus("Cần: body + head + tên pose");
      return;
    }
    const out = bodyPath.replace(/-cutout\.png$/, `-pose-${poseName}.png`).replace(/\.[^.]+$/, `-pose-${poseName}.png`);
    const comp = await bridge({
      op: "composite",
      body: bodyPath,
      head: headPath,
      anchor: { neckX: headX + 150 * headScale, neckY: headY, neckWidth: 100, headWidthRatio: headScale },
      out,
    });
    await bridge({ op: "save-pose", project: projectId, name: poseName, from: String(comp.out), anchor: {} });
    await refreshPoses();
    setStatus(`✓ Đã lưu pose "${poseName}"`);
  });

  // --- canvas mouse ---
  const getCoords = (e: React.MouseEvent): Pt => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (mode !== "cut" || polygonClosed) return;
    if (cutTool !== "polygon") return;
    const pt = getCoords(e);
    setPolygon((prev) => [...prev, pt]);
  };

  const onCanvasMove = (e: React.MouseEvent) => {
    const pt = getCoords(e);
    if (mode === "cut") {
      setMousePos(pt);
      if (cutTool === "horizontal" && draggingLine) {
        setHLineY(pt.y);
      }
    } else if (mode === "composite" && dragging && dragStart) {
      setHeadX(dragStart.hx + (pt.x - dragStart.mx));
      setHeadY(dragStart.hy + (pt.y - dragStart.my));
    }
  };

  const onCanvasDown = (e: React.MouseEvent) => {
    const pt = getCoords(e);
    if (mode === "composite") {
      setDragging(true);
      setDragStart({ mx: pt.x, my: pt.y, hx: headX, hy: headY });
    } else if (mode === "cut" && cutTool === "horizontal") {
      setDraggingLine(true);
      setHLineY(pt.y);
    }
  };

  const onCanvasUp = () => { setDragging(false); setDragStart(null); setDraggingLine(false); };

  // --- render helpers ---
  const displayImage = mode === "cut" ? cutDisplayUrl : bodyDisplayUrl;
  const stepNum = mode === "idle" ? 0 : mode === "body" ? 1 : mode === "cut" ? 2 : 3;

  return (
    <div className="asset-studio">
      <header className="as-header">
        <button type="button" className="ve-back-btn" onClick={onBack}>←</button>
        <h1>Asset Studio</h1>
        <small>{projectId}</small>
        <div style={{ flex: 1 }} />
        <div className="as-steps">
          {[ "Body", "Tách nền", "Cắt head", "Ghép" ].map((label, i) => (
            <span key={i} className={`as-step ${i < stepNum ? "done" : i === stepNum ? "active" : ""}`}>
              {i + 1}. {label}
            </span>
          ))}
        </div>
        {busy ? <span className="as-busy">●</span> : null}
      </header>

      <div className="as-body">
        {/* LEFT PANEL */}
        <aside className="as-left">
          {/* Stock search with presets */}
          <section className="as-panel">
            <h3>📸 Tìm ảnh stock</h3>
            <div className="as-presets">
              {SEARCH_PRESETS.map((preset) => (
                <button key={preset.label} type="button" className="as-preset-btn"
                  onClick={() => doSearch(preset.query)} disabled={busy}
                  title={preset.query}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="as-search-row">
              <input value={stockQuery} onChange={(e) => setStockQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="hoặc gõ từ khoá riêng…" />
              <button type="button" onClick={() => doSearch()} disabled={busy || !stockQuery.trim()}>Tìm</button>
            </div>
            <label className="as-upload">📁 Upload body
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUploadBody(e.target.files[0])} />
            </label>
            {stockResults.length > 0 && (
              <div className="as-stock-grid">
                {stockResults.map((item) => (
                  <button key={item.id} type="button" className="as-stock-item" onClick={() => importStock(item)}
                    title={`${item.alt} — ${item.photographer} (${item.source})`}>
                    <img src={item.thumb} alt={item.alt} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Gen AI */}
          <section className="as-panel">
            <h3>🤖 Gen AI Head</h3>
            {Object.keys(recipes).length > 0 ? (
              <>
                <select value={selectedRecipe}
                  onChange={(e) => {
                    setSelectedRecipe(e.target.value);
                    const r = recipes[e.target.value];
                    const defaults: Record<string, string> = {};
                    if (r) for (const f of r.fields) defaults[f.name] = f.options[0];
                    setRecipeFields(defaults);
                  }}
                  style={{ width: "100%", marginBottom: 8, background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#e8edf2", padding: "6px 8px", fontSize: 12 }}>
                  {Object.entries(recipes).map(([key, r]) => (
                    <option key={key} value={key}>{r.label}</option>
                  ))}
                </select>
                {selectedRecipe && recipes[selectedRecipe]?.fields.map((field) => (
                  <div key={field.name} style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 10, color: "#8b949e", display: "block", marginBottom: 2 }}>{field.label}</label>
                    <select value={recipeFields[field.name] || field.options[0]}
                      onChange={(e) => setRecipeFields((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, color: "#e8edf2", padding: "4px 6px", fontSize: 11 }}>
                      {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
                <button type="button" className="as-btn primary" onClick={doGenerate}
                  disabled={busy || !selectedRecipe} style={{ textAlign: "center", marginTop: 4 }}>
                  ✨ Generate
                </button>
                {genResults.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 4 }}>Kết quả (click để cắt):</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                      {genResults.map((item, i) => (
                        <button key={i} type="button" onClick={() => selectGenResult(item)}
                          style={{ padding: 0, border: "1px solid #30363d", borderRadius: 6, overflow: "hidden", background: "none", cursor: "pointer" }}>
                          <img src={item.url} alt={`gen-${i}`} style={{ width: "100%", aspectRatio: "1", objectFit: "contain", display: "block" }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="as-hint">Loading recipes…</p>
            )}
          </section>

          {/* Upload head */}
          <section className="as-panel">
            <h3>✂️ Head của bạn</h3>
            <label className="as-upload">📁 Upload head image
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadHead(e.target.files[0])} />
            </label>
            {headUrl && <div className="as-head-preview"><img src={headUrl} alt="head" /></div>}
          </section>

          {/* Pose library */}
          <section className="as-panel">
            <h3>📚 Pose Library</h3>
            <div className="as-pose-grid">
              {poses.map((pose) => (
                <div key={pose.name} className="as-pose-item" title={pose.name}>
                  <img src={`/${projectId}/character/poses/${pose.name}.png`} alt={pose.name} />
                  <small>{pose.name}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* CENTER: canvas */}
        <main className="as-canvas-wrap">
          <div
            ref={canvasRef}
            className="as-canvas"
            style={{
              width: DISPLAY_W, height: DISPLAY_H,
              cursor: mode === "cut" ? (cutTool === "polygon" ? "crosshair" : "ns-resize") : mode === "composite" ? "grab" : "default",
            }}
            onClick={onCanvasClick}
            onMouseMove={onCanvasMove}
            onMouseDown={onCanvasDown}
            onMouseUp={onCanvasUp}
            onMouseLeave={onCanvasUp}
          >
            {displayImage ? (
              <img className="as-stage-img" src={displayImage} alt="" draggable={false} />
            ) : (
              <div className="as-empty">
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                  <div>Tìm ảnh stock (preset bên trái)</div>
                  <div style={{ fontSize: 11, color: "#484f58", marginTop: 4 }}>hoặc Gen AI head / Upload</div>
                </div>
              </div>
            )}

            {/* polygon overlay */}
            {mode === "cut" && cutTool === "polygon" && polygon.length > 0 && (
              <svg className="as-polygon-overlay" width={DISPLAY_W} height={DISPLAY_H}>
                {polygonClosed && polygon.length >= 3 && (
                  <polygon points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill={cutModeKeep ? "rgba(0,255,100,0.15)" : "rgba(255,0,100,0.15)"}
                    stroke={cutModeKeep ? "#00ff64" : "#ff0064"} strokeWidth={2} />
                )}
                {!polygonClosed && (
                  <polyline points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none" stroke="#00ff64" strokeWidth={2} />
                )}
                {!polygonClosed && mousePos && polygon.length > 0 && (
                  <>
                    <line x1={polygon[polygon.length - 1].x} y1={polygon[polygon.length - 1].y}
                      x2={mousePos.x} y2={mousePos.y} stroke="#00ff64" strokeWidth={1} strokeDasharray="6,4" />
                    <line x1={mousePos.x} y1={mousePos.y}
                      x2={polygon[0].x} y2={polygon[0].y} stroke="#ffaa00" strokeWidth={1} strokeDasharray="4,4" />
                  </>
                )}
                {polygon.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={5}
                    fill={i === 0 ? "#ff6600" : "#00ff64"} stroke="white" strokeWidth={1.5} />
                ))}
              </svg>
            )}

            {/* horizontal line overlay */}
            {mode === "cut" && cutTool === "horizontal" && (
              <div className="as-hline" style={{ top: hLineY }}>
                <span>CUT at y={hLineY}px — drag to adjust</span>
              </div>
            )}

            {/* head overlay (composite) */}
            {mode === "composite" && headUrl && (
              <img src={headUrl} alt="head" draggable={false}
                style={{
                  position: "absolute", left: headX, top: headY,
                  width: 300 * headScale,
                  transform: `rotate(${headRotation}deg)`,
                  cursor: dragging ? "grabbing" : "grab",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                }} />
            )}
          </div>
          <div className="as-status">{status}</div>
        </main>

        {/* RIGHT: inspector */}
        <aside className="as-right">
          {mode === "body" && (
            <section className="as-panel">
              <h3>Step 1: Body</h3>
              <button type="button" className="as-btn primary" disabled={busy} onClick={removeBg}>
                🪄 Tách nền (AI)
              </button>
              <p className="as-hint">Tách nền xong → upload head hoặc Gen AI → sẽ vào cutting mode</p>
            </section>
          )}

          {mode === "cut" && (
            <section className="as-panel">
              <h3>Step 2: Cắt head</h3>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                <button type="button" className={`as-btn ${cutTool === "polygon" ? "primary" : "ghost"}`}
                  onClick={() => setCutTool("polygon")} style={{ flex: 1, textAlign: "center" }}>Polygon</button>
                <button type="button" className={`as-btn ${cutTool === "horizontal" ? "primary" : "ghost"}`}
                  onClick={() => setCutTool("horizontal")} style={{ flex: 1, textAlign: "center" }}>Đường thẳng</button>
              </div>

              {cutTool === "polygon" ? (
                <>
                  <p className="as-hint">Click từng điểm quanh viền phần muốn giữ. Điểm cam = điểm đầu.</p>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    <button type="button" className="as-btn ghost" onClick={() => setPolygon((p) => p.slice(0, -1))}
                      disabled={polygon.length === 0} style={{ flex: 1, textAlign: "center" }}>↶ Undo</button>
                    <button type="button" className="as-btn ghost" onClick={() => { setPolygon([]); setPolygonClosed(false); }}
                      disabled={polygon.length === 0} style={{ flex: 1, textAlign: "center" }}>🗑 Xoá</button>
                  </div>
                  <button type="button" className="as-btn ghost" onClick={() => setPolygonClosed(!polygonClosed)}
                    disabled={polygon.length < 3} style={{ width: "100%", textAlign: "center", marginBottom: 6 }}>
                    {polygonClosed ? "Mở lại" : "Khép polygon"}
                  </button>
                </>
              ) : (
                <p className="as-hint">Kéo đường vàng lên/xuống đến vị trí muốn cắt. Mọi thứ bên TRÊN đường được giữ.</p>
              )}

              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <button type="button" className={`as-btn ${cutModeKeep ? "primary" : "ghost"}`}
                  onClick={() => setCutModeKeep(true)} style={{ flex: 1, textAlign: "center" }}>Giữ trong</button>
                <button type="button" className={`as-btn ${!cutModeKeep ? "primary" : "ghost"}`}
                  onClick={() => setCutModeKeep(false)} style={{ flex: 1, textAlign: "center" }}>Xoá trong</button>
              </div>

              <button type="button" className="as-btn primary" onClick={applyCut}
                disabled={busy || (cutTool === "polygon" && polygon.length < 3)}
                style={{ width: "100%", textAlign: "center" }}>
                ✂️ Áp dụng cắt
              </button>
              <button type="button" className="as-btn ghost" onClick={skipCut}
                style={{ width: "100%", textAlign: "center" }}>
                Bỏ qua cắt (dùng nguyên)
              </button>
            </section>
          )}

          {mode === "composite" && (
            <section className="as-panel">
              <h3>Step 3: Ghép & Lưu</h3>
              <button type="button" className="as-btn ghost" onClick={autoPosition}
                style={{ width: "100%", textAlign: "center", marginBottom: 8 }}>
                🎯 Tự động đặt vị trí
              </button>
              <label className="as-slider">Scale ×{headScale.toFixed(2)}
                <input type="range" min={0.2} max={3.0} step={0.05} value={headScale}
                  onChange={(e) => setHeadScale(Number(e.target.value))} />
              </label>
              <label className="as-slider">Rotate {headRotation}°
                <input type="range" min={-45} max={45} step={1} value={headRotation}
                  onChange={(e) => setHeadRotation(Number(e.target.value))} />
              </label>
              <label className="as-slider">X: {headX}px
                <input type="range" min={-200} max={DISPLAY_W} step={5} value={headX}
                  onChange={(e) => setHeadX(Number(e.target.value))} />
              </label>
              <label className="as-slider">Y: {headY}px
                <input type="range" min={-200} max={DISPLAY_H} step={5} value={headY}
                  onChange={(e) => setHeadY(Number(e.target.value))} />
              </label>
              <div style={{ height: 12 }} />
              <input value={poseName} onChange={(e) => setPoseName(e.target.value)}
                placeholder="tên-pose (vd: shrug)" />
              <button type="button" className="as-btn primary" onClick={savePose}
                disabled={busy || !poseName.trim()} style={{ textAlign: "center" }}>
                💾 Lưu pose
              </button>
              <button type="button" className="as-btn ghost" onClick={() => { setMode("cut"); setPolygon([]); setPolygonClosed(false); }}
                style={{ textAlign: "center" }}>
                ← Cắt lại head
              </button>
            </section>
          )}

          {mode === "idle" && (
            <section className="as-panel">
              <h3>Hướng dẫn</h3>
              <div style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.8 }}>
                <div><strong>1.</strong> Tìm ảnh stock (preset hoặc gõ từ khoá)</div>
                <div><strong>2.</strong> Tách nền bằng AI</div>
                <div><strong>3.</strong> Gen AI head hoặc upload head</div>
                <div><strong>4.</strong> Cắt head (polygon hoặc đường thẳng)</div>
                <div><strong>5.</strong> Kéo head lên body → chỉnh → Lưu pose</div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
