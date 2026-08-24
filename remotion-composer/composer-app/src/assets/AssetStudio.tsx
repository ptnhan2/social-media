import Konva from "konva";
import React from "react";
import { CanvasStage, setStudioProject, StageActions } from "./studio/CanvasStage";
import { HistoryPanel } from "./studio/HistoryPanel";
import { ImportPanel } from "./studio/ImportPanel";
import { LayersPanel } from "./studio/LayersPanel";
import { PropertiesPanel } from "./studio/PropertiesPanel";
import { StatusBar } from "./studio/StatusBar";
import { StoreProvider, useStore } from "./studio/store";
import { ToolOptionsBar } from "./studio/ToolOptionsBar";
import { Toolbar } from "./studio/Toolbar";
import { docToImage } from "./studio/geometry";
import {
  applyAlphaMask,
  bridge,
  cacheImage,
  fileUrl,
  getLayerCanvas,
  loadImage,
  uploadCanvas,
  uploadDataUrl,
} from "./studio/imageOps";
import { makeLayer, Pt, ToolId } from "./studio/types";

export const AssetStudio: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => (
  <StoreProvider>
    <AssetStudioInner projectId={projectId} onBack={onBack} />
  </StoreProvider>
);

const TOOL_KEYS: Record<string, ToolId> = {
  v: "move",
  l: "lasso",
  w: "wand",
  e: "eraser",
  b: "bgremove",
  h: "hand",
  z: "zoom",
};

const AssetStudioInner: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => {
  const { state, dispatch } = useStore();
  const stageRef = React.useRef<Konva.Stage | null>(null);
  const actionsRef = React.useRef<StageActions | null>(null);
  const [exportState, setExportState] = React.useState<{ open: boolean; url: string | null; name: string }>({
    open: false,
    url: null,
    name: "",
  });

  React.useEffect(() => {
    setStudioProject(projectId);
  }, [projectId]);

  const run = React.useCallback(
    async (label: string, fn: () => Promise<void>) => {
      dispatch({ type: "SET_BUSY", busy: true });
      dispatch({ type: "SET_STATUS", status: label });
      try {
        await fn();
      } catch (e) {
        dispatch({ type: "SET_STATUS", status: `❌ ${String((e as Error).message || e)}` });
      } finally {
        dispatch({ type: "SET_BUSY", busy: false });
      }
    },
    [dispatch],
  );

  // --- add layer with doc auto-fit on first import ---
  const addImageLayer = React.useCallback(
    (path: string, name: string) => {
      const src = fileUrl(path);
      loadImage(src)
        .then((img) => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const first = state.doc.layers.length === 0;
          let docW = state.doc.docWidth;
          let docH = state.doc.docHeight;
          let scale: number;
          if (first) {
            const maxDim = 1024;
            let dw = w;
            let dh = h;
            if (Math.max(dw, dh) > maxDim) {
              const k = maxDim / Math.max(dw, dh);
              dw = Math.round(dw * k);
              dh = Math.round(dh * k);
            }
            docW = dw;
            docH = dh;
            scale = Math.min(dw / w, dh / h, 1);
          } else {
            scale = Math.min((docW * 0.8) / w, (docH * 0.8) / h, 1);
          }
          if (first) dispatch({ type: "SET_DOC_SIZE", width: docW, height: docH });
          dispatch({
            type: "ADD_LAYER",
            layer: makeLayer({
              id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name,
              src,
              path,
              width: w,
              height: h,
              x: docW / 2,
              y: name === "body" ? docH - (h * scale) / 2 : (h * scale) / 2 + 20,
              scaleX: scale,
              scaleY: scale,
            }),
            label: `Import ${name}`,
          });
          dispatch({ type: "SET_STATUS", status: `✓ Đã thêm layer "${name}"` });
        })
        .catch(() => dispatch({ type: "SET_STATUS", status: "❌ Không load được ảnh" }));
    },
    [dispatch, state.doc],
  );

  // --- lasso apply (server polygon-mask) ---
  const applyLasso = React.useCallback(
    () =>
      void run("Đang cắt…", async () => {
        const layer = state.doc.layers.find((l) => l.id === state.ui.selectedIds[0]);
        if (!layer || !state.ui.lasso.closed || state.ui.lasso.points.length < 3) return;
        const imgPolygon: Pt[] = state.ui.lasso.points.map((pt) => docToImage(layer, pt));
        const out = layer.path.replace(/\.[^.]+$/, "-cut.png");
        const data = await bridge({
          op: "polygon-mask",
          in: layer.path,
          polygon: imgPolygon,
          mode: state.ui.toolOptions.lasso.mode,
          out,
          nocrop: true,
        });
        dispatch({
          type: "REPLACE_LAYER_IMAGE",
          id: layer.id,
          src: fileUrl(String(data.out)),
          path: String(data.out),
          label: `Lasso cut ${layer.name}`,
        });
        dispatch({ type: "LASSO_CLEAR" });
        dispatch({ type: "SET_TOOL", tool: "move" });
        dispatch({ type: "SET_STATUS", status: "✓ Đã cắt layer" });
      }),
    [run, state.doc.layers, state.ui.selectedIds, state.ui.lasso, state.ui.toolOptions.lasso.mode, dispatch],
  );

  // --- wand delete ---
  const applyWandDelete = React.useCallback(
    () =>
      void run("Đang xoá vùng chọn…", async () => {
        const wand = state.ui.wand;
        if (!wand?.alphaMask) return;
        const layer = state.doc.layers.find((l) => l.id === wand.layerId);
        if (!layer) return;
        const canvas = await getLayerCanvas(layer);
        applyAlphaMask(canvas, wand.alphaMask, "delete");
        const { path, src } = await uploadCanvas(canvas, projectId);
        cacheImage(src, canvas);
        dispatch({ type: "REPLACE_LAYER_IMAGE", id: layer.id, src, path, label: `Magic erase ${layer.name}` });
        dispatch({ type: "SET_WAND", wand: null });
        dispatch({ type: "SET_STATUS", status: "✓ Đã xoá vùng wand chọn" });
      }),
    [run, state.ui.wand, state.doc.layers, projectId, dispatch],
  );

  // --- export + save pose ---
  const openExport = () =>
    void run("Đang flatten…", async () => {
      const url = await actionsRef.current?.exportDoc();
      if (!url) return;
      setExportState({ open: true, url, name: "" });
    });

  const savePose = () =>
    void run("Đang lưu pose…", async () => {
      if (!exportState.url || !exportState.name.trim()) return;
      const { path } = await uploadDataUrl(exportState.url, projectId);
      await bridge({ op: "save-pose", project: projectId, name: exportState.name.trim(), from: path, anchor: {} });
      setExportState({ open: false, url: null, name: "" });
      window.dispatchEvent(new CustomEvent("asset-studio:refresh-poses"));
      dispatch({ type: "SET_STATUS", status: `✓ Pose "${exportState.name.trim()}" đã lưu vào library` });
    });

  // --- drag-drop files onto canvas ---
  React.useEffect(() => {
    const handler = (e: Event) => {
      const files = (e as CustomEvent<FileList>).detail;
      const file = files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      void run("Đang upload ảnh kéo-thả…", async () => {
        const dataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(String(reader.result));
          reader.readAsDataURL(file);
        });
        const r = await fetch("/api/assets/body", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, data: dataUrl }),
        });
        const data = await r.json();
        addImageLayer(String(data.path), file.name.split(".")[0].slice(0, 15));
      });
    };
    window.addEventListener("asset-studio:drop-files", handler);
    return () => window.removeEventListener("asset-studio:drop-files", handler);
  }, [run, addImageLayer, projectId]);

  // --- keyboard shortcuts (Photopea-compatible) ---
  React.useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod) {
        switch (key) {
          case "z":
            e.preventDefault();
            dispatch({ type: e.shiftKey ? "REDO" : "UNDO" });
            return;
          case "y":
            e.preventDefault();
            dispatch({ type: "REDO" });
            return;
          case "j":
            e.preventDefault();
            if (state.ui.selectedIds[0]) dispatch({ type: "DUPLICATE_LAYER", id: state.ui.selectedIds[0] });
            return;
          case "d":
            e.preventDefault();
            dispatch({ type: "SELECT", ids: [] });
            dispatch({ type: "LASSO_CLEAR" });
            dispatch({ type: "SET_WAND", wand: null });
            return;
          case "0":
            e.preventDefault();
            actionsRef.current?.fit();
            return;
          default:
            return;
        }
      }

      if (TOOL_KEYS[key]) {
        dispatch({ type: "SET_TOOL", tool: TOOL_KEYS[key] });
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (state.ui.wand?.alphaMask) {
          applyWandDelete();
        } else if (state.ui.selectedIds.length) {
          dispatch({ type: "DELETE_LAYERS", ids: state.ui.selectedIds });
        }
        return;
      }

      if (e.key === "Enter") {
        if (state.ui.activeTool === "lasso") {
          e.preventDefault();
          if (!state.ui.lasso.closed) dispatch({ type: "LASSO_CLOSE" });
          else applyLasso();
        }
        return;
      }

      if (e.key === "Escape") {
        if (state.ui.lasso.points.length) dispatch({ type: "LASSO_CLEAR" });
        else if (state.ui.wand) dispatch({ type: "SET_WAND", wand: null });
        else dispatch({ type: "SELECT", ids: [] });
        return;
      }

      if (e.key === "Backspace" && state.ui.activeTool === "lasso") {
        dispatch({ type: "LASSO_POP_POINT" });
        return;
      }

      if (e.key.startsWith("Arrow") && state.ui.selectedIds.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        dispatch({
          type: "UPDATE_LAYERS",
          updates: state.ui.selectedIds.map((id) => {
            const l = state.doc.layers.find((x) => x.id === id)!;
            return { id, updates: { x: l.x + dx, y: l.y + dy } };
          }),
          label: "Nudge",
        });
        return;
      }

      if (e.key === "[") {
        const id = state.ui.selectedIds[0];
        if (id) {
          const idx = state.doc.layers.findIndex((l) => l.id === id);
          dispatch({ type: "REORDER_LAYER", id, toIndex: idx - 1 });
        }
        return;
      }
      if (e.key === "]") {
        const id = state.ui.selectedIds[0];
        if (id) {
          const idx = state.doc.layers.findIndex((l) => l.id === id);
          dispatch({ type: "REORDER_LAYER", id, toIndex: idx + 1 });
        }
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, state.ui, state.doc.layers, applyLasso, applyWandDelete]);

  const zoomBy = (factor: number) => {
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!p) return;
    const vp = state.viewport;
    const newScale = Math.max(0.05, Math.min(32, vp.scale * factor));
    const local = { x: (p.x - vp.x) / vp.scale, y: (p.y - vp.y) / vp.scale };
    dispatch({
      type: "SET_VIEWPORT",
      viewport: { scale: newScale, x: p.x - local.x * newScale, y: p.y - local.y * newScale },
    });
  };

  return (
    <div className="as4-root">
      <header className="as4-header">
        <button type="button" className="ve-back-btn" onClick={onBack} title="Về editor">
          ←
        </button>
        <h1>Asset Studio</h1>
        <small>{projectId}</small>
        <div className="as4-header-spacer" />
        <button type="button" className="as4-btn ghost" onClick={() => dispatch({ type: "UNDO" })}
          disabled={state.pointer <= 0} title="Ctrl+Z">
          ↶
        </button>
        <button type="button" className="as4-btn ghost" onClick={() => dispatch({ type: "REDO" })}
          disabled={state.pointer >= state.entries.length - 1} title="Ctrl+Shift+Z">
          ↷
        </button>
        <button type="button" className="as4-btn primary" onClick={openExport} disabled={state.doc.layers.length === 0}>
          💾 Save pose
        </button>
      </header>

      <ToolOptionsBar onLassoApply={applyLasso} onFit={() => actionsRef.current?.fit()} onZoom={zoomBy} />

      <div className="as4-main">
        <Toolbar />
        <CanvasStage stageRef={stageRef} actionsRef={actionsRef} />
        <aside className="as4-sidebar">
          <LayersPanel />
          <PropertiesPanel />
          <HistoryPanel />
          <ImportPanel
            projectId={projectId}
            onAddLayer={addImageLayer}
            onStatus={(status) => dispatch({ type: "SET_STATUS", status })}
            onBusy={(busy) => dispatch({ type: "SET_BUSY", busy })}
          />
        </aside>
      </div>

      <StatusBar onFit={() => actionsRef.current?.fit()} />

      {exportState.open && (
        <div className="as4-modal-backdrop" onClick={() => setExportState({ open: false, url: null, name: "" })}>
          <div className="as4-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Lưu pose vào library</h3>
            {exportState.url && <img className="as4-export-preview" src={exportState.url} alt="preview" />}
            <input
              autoFocus
              value={exportState.name}
              onChange={(e) => setExportState((s) => ({ ...s, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") savePose();
              }}
              placeholder="tên-pose (vd: point-right-2)"
            />
            <div className="as4-modal-actions">
              <button type="button" className="as4-btn ghost" onClick={() => setExportState({ open: false, url: null, name: "" })}>
                Huỷ
              </button>
              <button type="button" className="as4-btn primary" onClick={savePose} disabled={!exportState.name.trim() || state.ui.busy}>
                💾 Lưu pose
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
