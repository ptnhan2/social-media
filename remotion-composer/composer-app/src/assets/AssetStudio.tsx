import React from "react";

/**
 * ASSET STUDIO V1 — manual head cutting + compositing.
 * Polygon lasso tool: user clicks points around the head → polygon closes →
 * mask applied → clean head. Then drag head onto body → save pose.
 */

type StockResult = { id: string; source: string; thumb: string; large: string; alt: string; photographer: string };
type PoseEntry = { name: string; anchor: Record<string, unknown> };
type Pt = { x: number; y: number };
type Mode = "idle" | "body" | "cut" | "composite";

const DISPLAY_W = 560;
const DISPLAY_H = 720;

const bridge = (cmd: Record<string, unknown>) =>
  fetch("/api/assets/bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cmd) })
    .then(async (r) => {
      const data = await r.json();
      if (!r.ok || data.ok === false) throw new Error(data.error || `bridge ${r.status}`);
      return data as Record<string, unknown>;
    });

const fileUrl = (p: string) => `/api/assets/file?p=${encodeURIComponent(p.replace(/\\/g, "/").replace(/^C:\/?/i, ""))}`;

export const AssetStudio: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => {
  // --- state ---
  const [stockQuery, setStockQuery] = React.useState("");
  const [stockResults, setStockResults] = React.useState<StockResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const [mode, setMode] = React.useState<Mode>("idle");
  const [bodyPath, setBodyPath] = React.useState<string | null>(null); // server path to body (bg removed)
  const [bodyDisplayUrl, setBodyDisplayUrl] = React.useState<string | null>(null);
  const [bodyDims, setBodyDims] = React.useState<{ w: number; h: number } | null>(null);

  const [cutImagePath, setCutImagePath] = React.useState<string | null>(null); // image being cut (head)
  const [cutDisplayUrl, setCutDisplayUrl] = React.useState<string | null>(null);
  const [cutDims, setCutDims] = React.useState<{ w: number; h: number } | null>(null);

  const [polygon, setPolygon] = React.useState<Pt[]>([]);
  const [polygonClosed, setPolygonClosed] = React.useState(false);
  const [mousePos, setMousePos] = React.useState<Pt | null>(null);
  const [cutMode, setCutMode] = React.useState<"keep" | "remove">("keep");

  const [headPath, setHeadPath] = React.useState<string | null>(null);
  const [headUrl, setHeadUrl] = React.useState<string | null>(null);

  const [headX, setHeadX] = React.useState(200);
  const [headY, setHeadY] = React.useState(50);
  const [headScale, setHeadScale] = React.useState(1.0);
  const [headRotation, setHeadRotation] = React.useState(0);

  const [poses, setPoses] = React.useState<PoseEntry[]>([]);
  const [poseName, setPoseName] = React.useState("");
  const [status, setStatus] = React.useState("Sẵn sàng — tìm ảnh stock hoặc upload.");
  const [busy, setBusy] = React.useState(false);

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ mx: number; my: number; hx: number; hy: number } | null>(null);

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

  React.useEffect(() => { void refreshPoses(); }, [refreshPoses]);

  // --- stock search ---
  const doSearch = () => run("Đang tìm ảnh…", async () => {
    const r = await fetch(`/api/assets/search-stock?q=${encodeURIComponent(stockQuery)}`);
    const data = await r.json();
    setStockResults(data.results || []);
    setStatus(`${(data.results || []).length} kết quả.`);
  });

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
    setStatus("Đã import body → bấm 'Tách nền'.");
  });

  const onUpload = (file: File) => run("Đang upload…", async () => {
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
    setStatus("Đã upload → bấm 'Tách nền'.");
  });

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
    setMode("cut");
    setPolygon([]); setPolygonClosed(false);
    setStatus("Head đã load — click từng điểm quanh viền đầu để vẽ polygon, rồi bấm 'Áp dụng cắt'.");
  });

  // --- bg removal ---
  const removeBg = () => run("Đang tách nền (AI)…", async () => {
    if (!bodyPath) return;
    const out = bodyPath.replace(/\.[^.]+$/, "-cutout.png");
    const data = await bridge({ op: "remove-bg", in: bodyPath, out, algo: "auto" });
    setBodyPath(String(data.out));
    setBodyDisplayUrl(fileUrl(String(data.out)));
    setStatus(`Tách nền xong (${data.algoUsed}). → Bấm 'Bắt đầu cắt head' hoặc upload head cần cắt.`);
  });

  // --- polygon cut ---
  const applyPolygonCut = () => run("Đang áp dụng cắt…", async () => {
    if (!cutImagePath || polygon.length < 3) return;
    const out = cutImagePath.replace(/\.[^.]+$/, "-cut.png");
    const data = await bridge({
      op: "polygon-mask",
      in: cutImagePath,
      polygon: polygon,
      mode: cutMode,
      out,
      normalize: true,
    });
    setHeadPath(String(data.out));
    setHeadUrl(fileUrl(String(data.out)));
    setMode("composite");
    setStatus("Head đã cắt xong! Kéo head vào vị trí trên body, chỉnh scale/rotate, rồi 'Lưu pose'.");
  });

  // --- save pose ---
  const savePose = () => run("Đang lưu pose…", async () => {
    if (!bodyPath || !headPath || !poseName.trim()) {
      setStatus("Cần body + head + tên pose.");
      return;
    }
    // composite server-side
    const out = bodyPath.replace(/-cutout\.png$/, `-pose-${poseName}.png`);
    const comp = await bridge({
      op: "composite",
      body: bodyPath,
      head: headPath,
      anchor: { neckX: headX + 150, neckY: headY, neckWidth: 100, headWidthRatio: headScale },
      out,
    });
    await bridge({ op: "save-pose", project: projectId, name: poseName, from: String(comp.out), anchor: {} });
    await refreshPoses();
    setStatus(`✓ Đã lưu pose "${poseName}" vào library.`);
  });

  // --- canvas mouse handlers (polygon drawing) ---
  const getCanvasCoords = (e: React.MouseEvent): Pt => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (mode !== "cut" || polygonClosed) return;
    const pt = getCanvasCoords(e);
    setPolygon((prev) => [...prev, pt]);
  };

  const onCanvasMove = (e: React.MouseEvent) => {
    if (mode === "cut") {
      setMousePos(getCanvasCoords(e));
    } else if (mode === "composite" && dragging && dragStart) {
      const pt = getCanvasCoords(e);
      setHeadX(dragStart.hx + (pt.x - dragStart.mx));
      setHeadY(dragStart.hy + (pt.y - dragStart.my));
    }
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (mode === "composite") {
      const pt = getCanvasCoords(e);
      setDragging(true);
      setDragStart({ mx: pt.x, my: pt.y, hx: headX, hy: headY });
    }
  };

  const onCanvasMouseUp = () => { setDragging(false); setDragStart(null); };

  // --- render ---
  const displayImage = mode === "cut" ? cutDisplayUrl : bodyDisplayUrl;

  return (
    <div className="asset-studio">
      <header className="as-header">
        <button type="button" className="ve-back-btn" onClick={onBack}>←</button>
        <h1>Asset Studio</h1>
        <small>{projectId}</small>
        <div style={{ flex: 1 }} />
        {busy ? <span className="as-busy">●</span> : null}
      </header>

      <div className="as-body">
        {/* LEFT: search + head upload + library */}
        <aside className="as-left">
          <section className="as-panel">
            <h3>Tìm ảnh stock</h3>
            <div className="as-search-row">
              <input value={stockQuery} onChange={(e) => setStockQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="man pointing isolated…" />
              <button type="button" onClick={doSearch} disabled={busy || !stockQuery.trim()}>Tìm</button>
            </div>
            <label className="as-upload">+ Upload body
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </label>
            <div className="as-stock-grid">
              {stockResults.map((item) => (
                <button key={item.id} type="button" className="as-stock-item" onClick={() => importStock(item)}
                  title={`${item.alt} — ${item.photographer}`}>
                  <img src={item.thumb} alt={item.alt} />
                </button>
              ))}
            </div>
          </section>

          <section className="as-panel">
            <h3>Head asset</h3>
            <label className="as-upload">+ Upload head để cắt
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadHead(e.target.files[0])} />
            </label>
            {headUrl ? (
              <div className="as-head-preview"><img src={headUrl} alt="head" /></div>
            ) : (
              <p className="as-hint">Upload head image (cartoon head PNG/JPG) để cắt bằng polygon tool.</p>
            )}
          </section>

          <section className="as-panel">
            <h3>Pose library</h3>
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
            style={{ width: DISPLAY_W, height: DISPLAY_H, cursor: mode === "cut" ? "crosshair" : mode === "composite" ? "grab" : "default" }}
            onClick={onCanvasClick}
            onMouseMove={onCanvasMove}
            onMouseDown={onCanvasMouseDown}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          >
            {displayImage ? (
              <img className="as-stage-img" src={displayImage} alt="" draggable={false} />
            ) : (
              <div className="as-empty">Tìm / upload ảnh để bắt đầu</div>
            )}

            {/* polygon overlay (cut mode) */}
            {mode === "cut" && polygon.length > 0 && (
              <svg className="as-polygon-overlay" width={DISPLAY_W} height={DISPLAY_H}>
                {/* polygon fill when closed */}
                {polygonClosed && polygon.length >= 3 && (
                  <polygon
                    points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill={cutMode === "keep" ? "rgba(0,255,100,0.15)" : "rgba(255,0,100,0.15)"}
                    stroke={cutMode === "keep" ? "#00ff64" : "#ff0064"}
                    strokeWidth={2}
                  />
                )}
                {/* lines */}
                {!polygonClosed && (
                  <polyline
                    points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none" stroke="#00ff64" strokeWidth={2}
                  />
                )}
                {/* preview line to cursor */}
                {!polygonClosed && mousePos && polygon.length > 0 && (
                  <line
                    x1={polygon[polygon.length - 1].x} y1={polygon[polygon.length - 1].y}
                    x2={mousePos.x} y2={mousePos.y}
                    stroke="#00ff64" strokeWidth={1} strokeDasharray="6,4"
                  />
                )}
                {/* closing preview line */}
                {!polygonClosed && mousePos && polygon.length > 1 && (
                  <line
                    x1={mousePos.x} y1={mousePos.y}
                    x2={polygon[0].x} y2={polygon[0].y}
                    stroke="#ffaa00" strokeWidth={1} strokeDasharray="4,4"
                  />
                )}
                {/* points */}
                {polygon.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={5}
                    fill={i === 0 ? "#ff6600" : "#00ff64"} stroke="white" strokeWidth={1.5} />
                ))}
              </svg>
            )}

            {/* head overlay (composite mode) */}
            {mode === "composite" && headUrl && (
              <img
                src={headUrl}
                alt="head"
                draggable={false}
                style={{
                  position: "absolute",
                  left: headX, top: headY,
                  width: 300 * headScale,
                  transform: `rotate(${headRotation}deg)`,
                  cursor: dragging ? "grabbing" : "grab",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                }}
              />
            )}
          </div>

          <div className="as-status">{status}</div>
        </main>

        {/* RIGHT: inspector */}
        <aside className="as-right">
          {mode === "body" && (
            <section className="as-panel">
              <h3>Body</h3>
              <button type="button" className="as-btn primary" disabled={busy} onClick={removeBg}>
                Tách nền (AI)
              </button>
            </section>
          )}

          {mode === "cut" && (
            <section className="as-panel">
              <h3>Cắt head — Polygon tool</h3>
              <p className="as-hint">
                Click từng điểm quanh viền đầu. Điểm cam = điểm đầu (khép polygon).
                Vẽ đủ rồi thì bấm "Áp dụng cắt".
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button type="button" className={`as-btn ${cutMode === "keep" ? "primary" : "ghost"}`}
                  onClick={() => setCutMode("keep")} style={{ flex: 1, textAlign: "center" }}>
                  Giữ trong polygon
                </button>
                <button type="button" className={`as-btn ${cutMode === "remove" ? "primary" : "ghost"}`}
                  onClick={() => setCutMode("remove")} style={{ flex: 1, textAlign: "center" }}>
                  Xoá trong polygon
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 8 }}>
                Đã click: {polygon.length} điểm {polygonClosed ? "(đã khép)" : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button type="button" className="as-btn ghost" onClick={() => { setPolygon([]); setPolygonClosed(false); }}
                  disabled={polygon.length === 0} style={{ flex: 1, textAlign: "center" }}>
                  Xoá hết
                </button>
                <button type="button" className="as-btn ghost" onClick={() => setPolygon((p) => p.slice(0, -1))}
                  disabled={polygon.length === 0} style={{ flex: 1, textAlign: "center" }}>
                  ↶ Undo điểm
                </button>
              </div>
              <button type="button" className="as-btn ghost" onClick={() => setPolygonClosed(!polygonClosed)}
                disabled={polygon.length < 3} style={{ width: "100%", textAlign: "center", marginBottom: 8 }}>
                {polygonClosed ? "Mở lại polygon" : "Khép polygon"}
              </button>
              <button type="button" className="as-btn primary" onClick={applyPolygonCut}
                disabled={busy || polygon.length < 3} style={{ width: "100%", textAlign: "center" }}>
                ✂️ Áp dụng cắt
              </button>
            </section>
          )}

          {mode === "composite" && (
            <section className="as-panel">
              <h3>Composite</h3>
              <label className="as-slider">
                Scale ×{headScale.toFixed(2)}
                <input type="range" min={0.3} max={3.0} step={0.05} value={headScale}
                  onChange={(e) => setHeadScale(Number(e.target.value))} />
              </label>
              <label className="as-slider">
                Rotate {headRotation}°
                <input type="range" min={-45} max={45} step={1} value={headRotation}
                  onChange={(e) => setHeadRotation(Number(e.target.value))} />
              </label>
              <label className="as-slider">
                X: {headX}px
                <input type="range" min={-200} max={DISPLAY_W} step={5} value={headX}
                  onChange={(e) => setHeadX(Number(e.target.value))} />
              </label>
              <label className="as-slider">
                Y: {headY}px
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
        </aside>
      </div>
    </div>
  );
};
