import React from "react";

/**
 * ASSET STUDIO — mini studio tạo character poses (docs/ASSET-STUDIO-SPEC.md v2).
 * Search stock → tách nền → detect/crop cổ → auto/manual ghép head → chỉnh → save.
 * Mọi bước auto đều cho kết quả kéo-thả chỉnh sửa được trên canvas.
 */

type StockResult = { id: string; source: string; thumb: string; large: string; alt: string; photographer: string };
type PoseEntry = { name: string; anchor: Record<string, unknown> };
type Anchor = { neckX: number; neckY: number; neckWidth: number; headWidthRatio: number; headRotate: number; headOverlap: number };
type Stage = "raw" | "cutout" | "cropped";

const CANVAS_W = 800;
const CANVAS_H = 1100;
const DISPLAY_H = 520;

const api = {
  bridge: (cmd: Record<string, unknown>) =>
    fetch("/api/assets/bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cmd) }).then(async (r) => {
      const data = await r.json();
      if (!r.ok || data.ok === false) throw new Error(data.error || `bridge ${r.status}`);
      return data as Record<string, unknown>;
    }),
  searchStock: (q: string) => fetch(`/api/assets/search-stock?q=${encodeURIComponent(q)}`).then((r) => r.json() as Promise<{ results: StockResult[] }>),
  importBody: (payload: { projectId: string; url?: string; data?: string }) =>
    fetch("/api/assets/body", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "import failed");
      return data as { path: string; rel: string };
    }),
  fileUrl: (path: string) => `/api/assets/file?p=${encodeURIComponent(path.replace(/\\/g, "/").replace(/^C:\/?/i, ""))}`,
};

export const AssetStudio: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => {
  const [stockQuery, setStockQuery] = React.useState("");
  const [stockResults, setStockResults] = React.useState<StockResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const [rawPath, setRawPath] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<Stage>("raw");
  const [cutoutPath, setCutoutPath] = React.useState<string | null>(null);
  const [croppedPath, setCroppedPath] = React.useState<string | null>(null);
  const [detect, setDetect] = React.useState<{ neckX: number; neckY: number; neckWidth: number } | null>(null);
  const [anchor, setAnchor] = React.useState<Anchor>({ neckX: CANVAS_W / 2, neckY: 0, neckWidth: 70, headWidthRatio: 2.6, headRotate: 0, headOverlap: 0.18 });
  const [coverage, setCoverage] = React.useState<{ covered: boolean; exposedPx: number } | null>(null);

  const [poses, setPoses] = React.useState<PoseEntry[]>([]);
  const [poseName, setPoseName] = React.useState("");
  const [status, setStatus] = React.useState("Sẵn sàng — tìm ảnh stock hoặc upload.");
  const [busy, setBusy] = React.useState(false);

  const headUrl = `/${projectId}/character/head.png`;
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<{ kind: "head" | "neckline"; startX: number; startY: number; origin: number } | null>(null);

  const displayScale = DISPLAY_H / CANVAS_H;
  const displayW = CANVAS_W * displayScale;

  const refreshPoses = React.useCallback(async () => {
    try {
      const data = await api.bridge({ op: "list-poses", project: projectId });
      setPoses((data.poses as PoseEntry[]) || []);
    } catch { /* ignore */ }
  }, [projectId]);

  React.useEffect(() => { void refreshPoses(); }, [refreshPoses]);

  const setBusyStatus = (msg: string) => { setBusy(true); setStatus(msg); };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusyStatus(label);
    try { await fn(); } catch (e) { setStatus(`Lỗi: ${String((e as Error).message || e)}`); } finally { setBusy(false); }
  };

  const doSearch = () => run("Đang tìm ảnh…", async () => {
    const data = await api.searchStock(stockQuery);
    setStockResults(data.results || []);
    setStatus(`${(data.results || []).length} kết quả từ Pexels + Unsplash.`);
  });

  const importStock = (item: StockResult) => run("Đang tải ảnh…", async () => {
    const data = await api.importBody({ projectId, url: item.large });
    setRawPath(data.path);
    setStage("raw");
    setCutoutPath(null);
    setCroppedPath(null);
    setDetect(null);
    setCoverage(null);
    setPoseName(item.alt ? item.alt.split(" ").slice(0, 3).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "") : "");
    setStatus("Đã import — bấm 'Tách nền'.");
  });

  const onUpload = (file: File) => run("Đang upload…", async () => {
    const dataUrl = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
    const data = await api.importBody({ projectId, data: dataUrl });
    setRawPath(data.path);
    setStage("raw");
    setCutoutPath(null);
    setCroppedPath(null);
    setDetect(null);
    setStatus("Đã upload — bấm 'Tách nền'.");
  });

  const removeBg = () => run("Đang tách nền (AI, lần đầu tải model)…", async () => {
    if (!rawPath) return;
    const out = rawPath.replace(/\.[^.]+$/, "-cutout.png");
    const data = await api.bridge({ op: "remove-bg", in: rawPath, out, algo: "auto" });
    setCutoutPath(String(data.out));
    setStage("cutout");
    setStatus("Tách nền xong — bấm 'Detect cổ' (hoặc kéo line rồi crop).");
  });

  const detectNeck = () => run("Đang detect cổ…", async () => {
    if (!cutoutPath) return;
    const data = await api.bridge({ op: "detect-neck", in: cutoutPath });
    setDetect({ neckX: Number(data.neckX), neckY: Number(data.neckY), neckWidth: Number(data.neckWidth) });
    setStatus(`Cổ detect: x=${data.neckX}, y=${data.neckY} (kéo line để chỉnh) — bấm 'Crop đầu gốc'.`);
  });

  const cropNeck = () => run("Đang crop đầu gốc…", async () => {
    if (!cutoutPath || !detect) return;
    const out = cutoutPath.replace(/-cutout\.png$/, "-cropped.png");
    const data = await api.bridge({ op: "crop-neck", in: cutoutPath, out, neckY: detect.neckY, neckX: detect.neckX, neckWidth: detect.neckWidth });
    setCroppedPath(String(data.out));
    setAnchor((prev) => ({ ...prev, neckX: Number(data.neckX), neckWidth: Number(data.neckWidth) }));
    setStage("cropped");
    setStatus("Đã crop — head tự ghép. Kéo đầu + chỉnh slider, rồi 'Kiểm tra che kín'.");
  });

  const checkCoverage = () => run("Đang kiểm tra…", async () => {
    if (!croppedPath) return;
    const bodyAbs = croppedPath.replace(/^.*projects/, "C:/DevWork/social-media/projects");
    const data = await api.bridge({ op: "coverage", body: bodyAbs, head: `C:/DevWork/social-media/remotion-composer/public/${projectId}/character/head.png`, anchor });
    setCoverage({ covered: Boolean(data.covered), exposedPx: Number(data.exposedPx) });
    setStatus(data.covered ? "Che kín đầu gốc ✓ — sẵn sàng lưu." : `Còn ${data.exposedPx}px lộ — kéo đầu to/hơi xuống.`);
  });

  const savePose = () => run("Đang lưu pose…", async () => {
    if (!croppedPath || !poseName.trim()) { setStatus("Đặt tên pose trước."); return; }
    const bodyAbs = croppedPath.replace(/^.*projects/, "C:/DevWork/social-media/projects");
    const compositeOut = bodyAbs.replace(/-cropped\.png$/, "-composite.png");
    await api.bridge({ op: "composite", body: bodyAbs, head: `C:/DevWork/social-media/remotion-composer/public/${projectId}/character/head.png`, anchor, out: compositeOut });
    await api.bridge({ op: "save-pose", project: projectId, name: poseName, from: compositeOut, anchor });
    await refreshPoses();
    setStatus(`Đã lưu pose "${poseName}" vào library — video render lần sau sẽ dùng.`);
  });

  // ---- canvas drag ----
  const onPointerDown = (e: React.PointerEvent, kind: "head" | "neckline") => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag(kind === "head"
      ? { kind, startX: e.clientX, startY: e.clientY, origin: anchor.neckX }
      : { kind, startX: e.clientX, startY: e.clientY, origin: detect?.neckY ?? 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / displayScale;
    const dy = (e.clientY - drag.startY) / displayScale;
    if (drag.kind === "head") setAnchor((p) => ({ ...p, neckX: Math.round(drag.origin + dx) }));
    else if (detect) setDetect((p) => (p ? { ...p, neckY: Math.max(4, Math.round(drag.origin + dy)) } : p));
  };
  const onPointerUp = () => setDrag(null);

  const stageImage = stage === "raw" ? rawPath : stage === "cutout" ? cutoutPath : croppedPath;

  return (
    <div className="asset-studio">
      <header className="as-header">
        <button type="button" className="ve-back-btn" onClick={onBack} title="Về Editor">←</button>
        <h1>Asset Studio</h1>
        <small>{projectId} · character</small>
        <div style={{ flex: 1 }} />
        {busy ? <span className="as-busy">●</span> : null}
      </header>

      <div className="as-body">
        {/* LEFT: search + library */}
        <aside className="as-left">
          <section className="as-panel">
            <h3>Tìm ảnh stock</h3>
            <div className="as-search-row">
              <input value={stockQuery} onChange={(e) => setStockQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="man pointing isolated…" />
              <button type="button" onClick={doSearch} disabled={busy || !stockQuery.trim()}>Tìm</button>
            </div>
            <label className="as-upload">
              + Upload ảnh của bạn
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </label>
            <div className="as-stock-grid">
              {stockResults.map((item) => (
                <button key={item.id} type="button" className="as-stock-item" onClick={() => importStock(item)} title={`${item.alt} — ${item.photographer} (${item.source})`}>
                  <img src={item.thumb} alt={item.alt} />
                </button>
              ))}
            </div>
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
            style={{ width: displayW, height: DISPLAY_H, backgroundSize: `${24 * displayScale}px ${24 * displayScale}px` }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {stageImage ? <img className="as-stage-img" src={api.fileUrl(stageImage)} alt="" draggable={false} /> : <div className="as-empty">Tìm / upload ảnh để bắt đầu</div>}

            {/* neck line (cutout stage) */}
            {stage === "cutout" && detect ? (
              <div className="as-neckline" style={{ top: detect.neckY * displayScale }} onPointerDown={(e) => onPointerDown(e, "neckline")} title="Kéo để đặt neck-line">
                <span>neck-line {detect.neckY}px</span>
              </div>
            ) : null}

            {/* head (cropped stage) */}
            {stage === "cropped" ? (() => {
              const headW = anchor.neckWidth * anchor.headWidthRatio * displayScale;
              const headH = headW * 1.12;
              return (
                <img
                  className="as-head"
                  src={headUrl}
                  alt="head"
                  draggable={false}
                  style={{
                    left: anchor.neckX * displayScale - headW / 2,
                    top: -anchor.headOverlap * headH,
                    width: headW,
                    height: headH,
                    transform: `rotate(${anchor.headRotate}deg)`,
                  }}
                  onPointerDown={(e) => onPointerDown(e, "head")}
                />
              );
            })() : null}
          </div>
          <div className="as-status">{status}</div>
        </main>

        {/* RIGHT: inspector */}
        <aside className="as-right">
          <section className="as-panel">
            <h3>Xử lý body</h3>
            <button type="button" className="as-btn" disabled={busy || !rawPath || stage !== "raw"} onClick={removeBg}>1. Tách nền (AI)</button>
            <button type="button" className="as-btn" disabled={busy || !cutoutPath || !detect} onClick={cropNeck}>3. Crop đầu gốc</button>
            <button type="button" className="as-btn ghost" disabled={busy || !cutoutPath} onClick={detectNeck}>2. Detect cổ tự động</button>
            <p className="as-hint">Manual: bấm Detect rồi kéo neck-line trên canvas trước khi crop.</p>
          </section>

          <section className="as-panel">
            <h3>Head</h3>
            <label className="as-slider">
              scale ×{anchor.headWidthRatio.toFixed(2)}
              <input type="range" min={1.4} max={4.2} step={0.05} value={anchor.headWidthRatio}
                onChange={(e) => setAnchor((p) => ({ ...p, headWidthRatio: Number(e.target.value) }))} />
            </label>
            <label className="as-slider">
              rotate {anchor.headRotate}°
              <input type="range" min={-30} max={30} step={1} value={anchor.headRotate}
                onChange={(e) => setAnchor((p) => ({ ...p, headRotate: Number(e.target.value) }))} />
            </label>
            <label className="as-slider">
              overlap {(anchor.headOverlap * 100).toFixed(0)}%
              <input type="range" min={0} max={0.45} step={0.01} value={anchor.headOverlap}
                onChange={(e) => setAnchor((p) => ({ ...p, headOverlap: Number(e.target.value) }))} />
            </label>
            <div className="as-head-preview"><img src={headUrl} alt="head" /></div>
          </section>

          <section className="as-panel">
            <h3>Lưu pose</h3>
            <div className="as-coverage" data-covered={coverage ? String(coverage.covered) : ""}>
              {coverage ? (coverage.covered ? "Che kín đầu gốc ✓" : `Lộ ${coverage.exposedPx}px ✗`) : "Chưa kiểm tra"}
            </div>
            <button type="button" className="as-btn ghost" disabled={busy || stage !== "cropped"} onClick={checkCoverage}>Kiểm tra che kín</button>
            <input value={poseName} onChange={(e) => setPoseName(e.target.value)} placeholder="tên-pose" />
            <button type="button" className="as-btn primary" disabled={busy || stage !== "cropped"} onClick={savePose}>💾 Lưu pose</button>
          </section>
        </aside>
      </div>
    </div>
  );
};
