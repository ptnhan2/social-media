import React from "react";

/**
 * ASSET STUDIO V3 — layer-based canvas editor (Photoshop-style).
 * Canvas-first: large editing surface, tool palette, layers, contextual properties.
 * No step wizard — all tools always available, select layer + tool and work.
 */

type StockResult = { id: string; source: string; thumb: string; large: string; alt: string; photographer: string };
type PoseEntry = { name: string; anchor: Record<string, unknown> };
type Pt = { x: number; y: number };
type Tool = "move" | "lasso" | "line";

type Layer = {
  id: string;
  name: string;
  src: string;         // display URL
  path: string;        // server path
  x: number;           // position on canvas
  y: number;
  scale: number;
  rotation: number;
  visible: boolean;
  width: number;       // natural width after scale
  height: number;
};

const CANVAS_W = 800;
const CANVAS_H = 600;

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

const SEARCH_PRESETS = [
  { label: "👉", title: "Chỉ tay", query: "man pointing hand gesture isolated white background" },
  { label: "🤔", title: "Suy nghĩ", query: "man thinking hand on chin isolated white background" },
  { label: "🎉", title: "Ăn mừng", query: "man celebrating arms raised isolated white background" },
  { label: "🤷", title: "Xõe tay", query: "man shrugging shoulders isolated white background" },
  { label: "🎤", title: "Trình bày", query: "man presenting gesture isolated white background" },
  { label: "😤", title: "Tự tin", query: "confident man arms crossed isolated white background" },
  { label: "😱", title: "Ngạc nhiên", query: "man surprised shocked expression isolated" },
  { label: "😌", title: "Thư giãn", query: "person leaning casual pose isolated studio" },
];

type Recipe = {
  label: string; description: string; enabled?: boolean;
  fields: { name: string; label: string; type: string; options: string[]; optional?: boolean }[];
};

export const AssetStudio: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => {
  // --- core editor state ---
  const [layers, setLayers] = React.useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<Tool>("move");
  const [status, setStatus] = React.useState("Import body → tách nền → thêm head → ghép");
  const [busy, setBusy] = React.useState(false);

  // lasso state
  const [polygon, setPolygon] = React.useState<Pt[]>([]);
  const [polygonClosed, setPolygonClosed] = React.useState(false);
  const [mousePos, setMousePos] = React.useState<Pt | null>(null);

  // drag state
  const [dragging, setDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ mx: number; my: number; lx: number; ly: number } | null>(null);

  // history
  const [undoStack, setUndoStack] = React.useState<Layer[][]>([]);
  const [redoStack, setRedoStack] = React.useState<Layer[][]>([]);

  // panels
  const [showImport, setShowImport] = React.useState(true);
  const [showGen, setShowGen] = React.useState(false);
  const [stockQuery, setStockQuery] = React.useState("");
  const [stockResults, setStockResults] = React.useState<StockResult[]>([]);
  const [poses, setPoses] = React.useState<PoseEntry[]>([]);
  const [poseName, setPoseName] = React.useState("");

  // gen AI
  const [recipes, setRecipes] = React.useState<Record<string, Recipe>>({});
  const [selectedRecipe, setSelectedRecipe] = React.useState("");
  const [recipeFields, setRecipeFields] = React.useState<Record<string, string>>({});
  const [genResults, setGenResults] = React.useState<{ url: string; path: string }[]>([]);

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const activeLayer = layers.find((l) => l.id === activeLayerId) || null;

  // --- history ---
  const pushHistory = (newLayers: Layer[]) => {
    setUndoStack((prev) => [...prev, layers]);
    setRedoStack([]);
  };
  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((prevStack) => prevStack.slice(0, -1));
    setRedoStack((prev) => [layers, ...prev]);
    setLayers(prev);
  };
  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setUndoStack((prev) => [...prev, layers]);
    setLayers(next);
  };

  // --- helpers ---
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true); setStatus(label);
    try { await fn(); } catch (e) { setStatus(`❌ ${String((e as Error).message || e)}`); }
    finally { setBusy(false); }
  };

  const addLayer = (name: string, path: string, src: string, img?: HTMLImageElement) => {
    pushHistory(layers);
    const w = img?.naturalWidth || 300;
    const h = img?.naturalHeight || 300;
    const scale = Math.min(CANVAS_W / w, CANVAS_H / h, 1);
    const layer: Layer = {
      id: `layer-${Date.now()}`,
      name,
      path, src,
      x: (CANVAS_W - w * scale) / 2,
      y: name === "body" ? CANVAS_H - h * scale : 20,
      scale,
      rotation: 0,
      visible: true,
      width: w * scale,
      height: h * scale,
    };
    setLayers((prev) => [...prev, layer]);
    setActiveLayerId(layer.id);
    return layer;
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  };

  // --- load data ---
  const refreshPoses = React.useCallback(async () => {
    try {
      const data = await bridge({ op: "list-poses", project: projectId });
      setPoses((data.poses as PoseEntry[]) || []);
    } catch { /* */ }
  }, [projectId]);

  React.useEffect(() => {
    void refreshPoses();
    bridge({ op: "list-recipes" }).then((data) => {
      const r = (data.recipes as Record<string, Recipe>) || {};
      setRecipes(r);
      const first = Object.keys(r)[0];
      if (first) {
        setSelectedRecipe(first);
        const defaults: Record<string, string> = {};
        for (const f of r[first].fields) defaults[f.name] = f.options[0];
        setRecipeFields(defaults);
      }
    }).catch(() => {});
  }, [refreshPoses]);

  // --- import body ---
  const importImage = (path: string, name: string) => {
    const src = fileUrl(path);
    const img = new Image();
    img.onload = () => addLayer(name, path, src, img);
    img.src = src;
    setStatus(`${name} layer added — select tool và edit`);
  };

  const importStock = (item: StockResult) => run("Đang tải…", async () => {
    const r = await fetch("/api/assets/body", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, url: item.large }),
    });
    const data = await r.json();
    importImage(data.path, "body");
    setShowImport(false);
  });

  const onFileUpload = (file: File) => run("Đang upload…", async () => {
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
    importImage(data.path, file.name.split(".")[0].slice(0, 15));
  });

  // --- bg removal ---
  const removeBg = () => run("Đang tách nền…", async () => {
    if (!activeLayer) return;
    const out = activeLayer.path.replace(/\.[^.]+$/, "-cutout.png");
    const data = await bridge({ op: "remove-bg", in: activeLayer.path, out, algo: "auto" });
    updateLayer(activeLayer.id, { path: String(data.out), src: fileUrl(String(data.out)) });
    setStatus(`✓ Tách nền xong (${data.algoUsed})`);
  });

  // --- gen AI ---
  const doGenerate = () => run("Đang generate…", async () => {
    const data = await bridge({ op: "generate", recipe: selectedRecipe, fields: recipeFields, project: projectId });
    setGenResults((prev) => [{ url: fileUrl(String(data.out)), path: String(data.out) }, ...prev].slice(0, 6));
    setStatus("✓ Generated — click ảnh để thêm vào canvas");
  });

  const selectGenResult = (item: { url: string; path: string }) => {
    importImage(item.path, "head");
    setShowGen(false);
  };

  // --- lasso cut ---
  const applyLassoCut = () => run("Đang cắt…", async () => {
    if (!activeLayer || polygon.length < 3) return;
    const out = activeLayer.path.replace(/\.[^.]+$/, "-cut.png");
    // convert canvas coords to image coords
    const imgPolygon = polygon.map((p) => ({
      x: (p.x - activeLayer.x) / activeLayer.scale,
      y: (p.y - activeLayer.y) / activeLayer.scale,
    }));
    const data = await bridge({
      op: "polygon-mask", in: activeLayer.path,
      polygon: imgPolygon, mode: "keep", out,
    });
    updateLayer(activeLayer.id, { path: String(data.out), src: fileUrl(String(data.out)) });
    setPolygon([]); setPolygonClosed(false);
    setTool("move");
    setStatus("✓ Đã cắt layer");
  });

  // --- canvas mouse ---
  const getCoords = (e: React.MouseEvent): Pt => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (pt: Pt): Layer | null => {
    // topmost layer that contains the point
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible) continue;
      if (pt.x >= l.x && pt.x <= l.x + l.width && pt.y >= l.y && pt.y <= l.y + l.height) return l;
    }
    return null;
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    const pt = getCoords(e);
    if (tool === "lasso") {
      if (!activeLayer) { setStatus("Chọn layer trước khi cắt"); return; }
      setPolygon((prev) => [...prev, pt]);
    } else if (tool === "move") {
      const hit = hitTest(pt);
      if (hit) setActiveLayerId(hit.id);
      else setActiveLayerId(null);
    }
  };

  const onCanvasDown = (e: React.MouseEvent) => {
    const pt = getCoords(e);
    if (tool === "move") {
      const hit = hitTest(pt);
      if (hit) {
        setActiveLayerId(hit.id);
        setDragging(true);
        setDragStart({ mx: pt.x, my: pt.y, lx: hit.x, ly: hit.y });
      }
    }
  };

  const onCanvasMove = (e: React.MouseEvent) => {
    const pt = getCoords(e);
    setMousePos(pt);
    if (tool === "move" && dragging && dragStart && activeLayer) {
      updateLayer(activeLayer.id, {
        x: dragStart.lx + (pt.x - dragStart.mx),
        y: dragStart.ly + (pt.y - dragStart.my),
      });
    }
  };

  const onCanvasUp = () => { setDragging(false); setDragStart(null); };

  // --- save pose ---
  const savePose = () => run("Đang lưu…", async () => {
    const body = layers.find((l) => l.name === "body");
    const head = layers.find((l) => l.name === "head" || l.name.includes("head") || l.name.includes("gen"));
    if (!body || !head || !poseName.trim()) {
      setStatus("Cần layer body + layer head + tên pose");
      return;
    }
    // flatten: composite head onto body
    const out = body.path.replace(/\.[^.]+$/, `-pose-${poseName}.png`);
    const comp = await bridge({
      op: "composite", body: body.path, head: head.path,
      anchor: { neckX: head.x + head.width / 2, neckY: head.y, neckWidth: 100, headWidthRatio: head.scale },
      out,
    });
    await bridge({ op: "save-pose", project: projectId, name: poseName, from: String(comp.out), anchor: {} });
    await refreshPoses();
    setStatus(`✓ Pose "${poseName}" đã lưu`);
  });

  // --- render ---
  return (
    <div className="asset-studio">
      {/* Top bar */}
      <header className="as-header">
        <button type="button" className="ve-back-btn" onClick={onBack}>←</button>
        <h1>Asset Studio</h1>
        <small>{projectId}</small>
        <div style={{ flex: 1 }} />
        <button type="button" className="as-btn ghost" onClick={undo} disabled={undoStack.length === 0}>↶</button>
        <button type="button" className="as-btn ghost" onClick={redo} disabled={redoStack.length === 0}>↷</button>
        {busy ? <span className="as-busy">●</span> : null}
      </header>

      <div className="as-body">
        {/* LEFT: tool palette + layers + import */}
        <aside className="as-tools">
          {/* Tools */}
          <div className="as-tool-palette">
            <button type="button" className={`as-tool-btn ${tool === "move" ? "active" : ""}`}
              onClick={() => setTool("move")} title="Move (V)">
              🖱
            </button>
            <button type="button" className={`as-tool-btn ${tool === "lasso" ? "active" : ""}`}
              onClick={() => { setTool("lasso"); setPolygon([]); setPolygonClosed(false); }} title="Lasso cut (L)">
              ✂️
            </button>
            <button type="button" className="as-tool-btn" onClick={removeBg}
              disabled={!activeLayer || busy} title="Remove background">
              🪄
            </button>
          </div>

          {/* Layers */}
          <div className="as-layers-panel">
            <h4>Layers</h4>
            {layers.map((layer) => (
              <div key={layer.id}
                className={`as-layer-item ${layer.id === activeLayerId ? "active" : ""}`}
                onClick={() => setActiveLayerId(layer.id)}>
                <input type="checkbox" checked={layer.visible}
                  onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })} />
                <span>{layer.name}</span>
              </div>
            ))}
            {layers.length === 0 && <p className="as-hint">No layers yet</p>}
          </div>

          {/* Import buttons */}
          <div className="as-import-panel">
            <button type="button" className="as-btn ghost" onClick={() => { setShowImport(!showImport); setShowGen(false); }}>
              📁 Import Body
            </button>
            <button type="button" className="as-btn ghost" onClick={() => { setShowGen(!showGen); setShowImport(false); }}>
              🤖 Gen Head
            </button>

            {showImport && (
              <div className="as-panel" style={{ marginTop: 8 }}>
                <div className="as-presets">
                  {SEARCH_PRESETS.map((p) => (
                    <button key={p.label} type="button" className="as-preset-btn"
                      onClick={() => run("Đang tìm…", async () => {
                        const r = await fetch(`/api/assets/search-stock?q=${encodeURIComponent(p.query)}`);
                        const data = await r.json();
                        setStockResults(data.results || []);
                      })} title={p.title}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="as-search-row">
                  <input value={stockQuery} onChange={(e) => setStockQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && stockQuery.trim()) {
                        run("Đang tìm…", async () => {
                          const r = await fetch(`/api/assets/search-stock?q=${encodeURIComponent(stockQuery)}`);
                          const data = await r.json();
                          setStockResults(data.results || []);
                        });
                      }
                    }} placeholder="từ khoá…" />
                </div>
                <label className="as-upload">📁 Upload
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])} />
                </label>
                <div className="as-stock-grid" style={{ maxHeight: 200, overflowY: "auto" }}>
                  {stockResults.map((item) => (
                    <button key={item.id} type="button" className="as-stock-item" onClick={() => importStock(item)}>
                      <img src={item.thumb} alt={item.alt} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showGen && (
              <div className="as-panel" style={{ marginTop: 8 }}>
                <select value={selectedRecipe}
                  onChange={(e) => {
                    setSelectedRecipe(e.target.value);
                    const r = recipes[e.target.value];
                    const defaults: Record<string, string> = {};
                    if (r) for (const f of r.fields) defaults[f.name] = f.options[0];
                    setRecipeFields(defaults);
                  }}
                  style={{ width: "100%", marginBottom: 6, background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#e8edf2", padding: "4px 6px", fontSize: 11 }}>
                  {Object.entries(recipes).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
                </select>
                {selectedRecipe && recipes[selectedRecipe]?.fields.map((f) => (
                  <div key={f.name} style={{ marginBottom: 4 }}>
                    <label style={{ fontSize: 9, color: "#8b949e" }}>{f.label}</label>
                    <select value={recipeFields[f.name] || f.options[0]}
                      onChange={(e) => setRecipeFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
                      style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, color: "#e8edf2", padding: "3px 4px", fontSize: 10 }}>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <button type="button" className="as-btn primary" onClick={doGenerate} disabled={busy}
                  style={{ width: "100%", textAlign: "center" }}>✨ Generate</button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6 }}>
                  {genResults.map((item, i) => (
                    <button key={i} type="button" onClick={() => selectGenResult(item)}
                      style={{ padding: 0, border: "1px solid #30363d", borderRadius: 4, overflow: "hidden", background: "none", cursor: "pointer" }}>
                      <img src={item.url} style={{ width: "100%", display: "block" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: canvas */}
        <main className="as-canvas-wrap">
          <div ref={canvasRef} className="as-canvas"
            style={{
              width: CANVAS_W, height: CANVAS_H,
              cursor: tool === "lasso" ? "crosshair" : "default",
            }}
            onClick={onCanvasClick}
            onMouseDown={onCanvasDown}
            onMouseMove={onCanvasMove}
            onMouseUp={onCanvasUp}
            onMouseLeave={onCanvasUp}
          >
            {layers.length === 0 && (
              <div className="as-empty">
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🎨</div>
                  <div style={{ fontSize: 14, color: "#8b949e" }}>Import body hoặc Generate head để bắt đầu</div>
                </div>
              </div>
            )}

            {/* render layers bottom-to-top */}
            {layers.filter((l) => l.visible).map((layer) => (
              <img key={layer.id} src={layer.src} alt={layer.name} draggable={false}
                style={{
                  position: "absolute",
                  left: layer.x, top: layer.y,
                  width: layer.width, height: layer.height,
                  transform: `rotate(${layer.rotation}deg)`,
                  opacity: 1,
                  outline: layer.id === activeLayerId ? "2px dashed #f0883e" : "none",
                  outlineOffset: 2,
                  pointerEvents: "none",
                }} />
            ))}

            {/* lasso polygon overlay */}
            {tool === "lasso" && polygon.length > 0 && (
              <svg className="as-polygon-overlay" width={CANVAS_W} height={CANVAS_H}>
                {polygonClosed && polygon.length >= 3 && (
                  <polygon points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(0,255,100,0.12)" stroke="#00ff64" strokeWidth={2} />
                )}
                {!polygonClosed && (
                  <polyline points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none" stroke="#00ff64" strokeWidth={2} />
                )}
                {!polygonClosed && mousePos && polygon.length > 0 && (
                  <line x1={polygon[polygon.length - 1].x} y1={polygon[polygon.length - 1].y}
                    x2={mousePos.x} y2={mousePos.y} stroke="#00ff64" strokeWidth={1} strokeDasharray="6,4" />
                )}
                {polygon.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4}
                    fill={i === 0 ? "#ff6600" : "#00ff64"} stroke="white" strokeWidth={1} />
                ))}
              </svg>
            )}
          </div>
          <div className="as-status">{status}</div>

          {/* lasso controls below canvas */}
          {tool === "lasso" && activeLayer && (
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "#8b949e", alignSelf: "center" }}>
                Lasso trên "{activeLayer.name}" — {polygon.length} điểm
              </span>
              <button type="button" className="as-btn ghost" onClick={() => setPolygon((p) => p.slice(0, -1))}
                disabled={polygon.length === 0}>↶</button>
              <button type="button" className="as-btn ghost" onClick={() => { setPolygon([]); setPolygonClosed(false); }}
                disabled={polygon.length === 0}>🗑</button>
              <button type="button" className="as-btn ghost" onClick={() => setPolygonClosed(!polygonClosed)}
                disabled={polygon.length < 3}>{polygonClosed ? "Mở" : "Khép"}</button>
              <button type="button" className="as-btn primary" onClick={applyLassoCut}
                disabled={polygon.length < 3 || busy}>✂️ Cut</button>
              <button type="button" className="as-btn ghost" onClick={() => { setTool("move"); setPolygon([]); }}>Done</button>
            </div>
          )}
        </main>

        {/* RIGHT: properties */}
        <aside className="as-right">
          {activeLayer ? (
            <section className="as-panel">
              <h3>{activeLayer.name}</h3>
              <label className="as-slider">X: {Math.round(activeLayer.x)}
                <input type="range" min={-200} max={CANVAS_W} value={activeLayer.x}
                  onChange={(e) => updateLayer(activeLayer.id, { x: Number(e.target.value) })} />
              </label>
              <label className="as-slider">Y: {Math.round(activeLayer.y)}
                <input type="range" min={-200} max={CANVAS_H} value={activeLayer.y}
                  onChange={(e) => updateLayer(activeLayer.id, { y: Number(e.target.value) })} />
              </label>
              <label className="as-slider">Scale: {activeLayer.scale.toFixed(2)}
                <input type="range" min={0.1} max={3} step={0.05} value={activeLayer.scale}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    updateLayer(activeLayer.id, { scale: s });
                  }} />
              </label>
              <label className="as-slider">Rotate: {activeLayer.rotation}°
                <input type="range" min={-45} max={45} value={activeLayer.rotation}
                  onChange={(e) => updateLayer(activeLayer.id, { rotation: Number(e.target.value) })} />
              </label>
              <button type="button" className="as-btn ghost" onClick={removeBg} disabled={busy}
                style={{ width: "100%", textAlign: "center", marginTop: 8 }}>
                🪄 Tách nền layer này
              </button>
            </section>
          ) : (
            <section className="as-panel">
              <h3>Properties</h3>
              <p className="as-hint">Click vào layer trên canvas để chọn và chỉnh</p>
            </section>
          )}

          {/* Save */}
          <section className="as-panel" style={{ marginTop: 8 }}>
            <h3>Export</h3>
            <input value={poseName} onChange={(e) => setPoseName(e.target.value)} placeholder="tên-pose" />
            <button type="button" className="as-btn primary" onClick={savePose}
              disabled={busy || !poseName.trim()} style={{ textAlign: "center" }}>
              💾 Lưu pose
            </button>
          </section>

          {/* Library */}
          <section className="as-panel" style={{ marginTop: 8 }}>
            <h3>Library</h3>
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
      </div>
    </div>
  );
};
