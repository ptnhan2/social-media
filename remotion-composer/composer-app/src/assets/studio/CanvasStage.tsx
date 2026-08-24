import Konva from "konva";
import React from "react";
import { Circle, Group, Image as KonvaImage, Layer as KonvaLayer, Line, Rect, Stage, Transformer } from "react-konva";
import { setCursor } from "./cursorStore";
import { useStore } from "./store";
import { docToImage, snapLayer } from "./geometry";
import {
  bridge,
  cacheImage,
  cachedImage,
  eraseSegment,
  fileUrlBusted,
  floodFillMask,
  getLayerCanvas,
  hitLayerAtPixel,
  loadImage,
  maskToPreviewCanvas,
  uploadCanvas,
} from "./imageOps";
import { Guide, Layer, Pt } from "./types";
import { layerAABB } from "./types";

/** Registry of live Konva.Image nodes by layer id (for Transformer + redraw). */
const nodeRegistry = new Map<string, Konva.Image>();

const checkerPattern = (() => {
  const c = document.createElement("canvas");
  c.width = 20;
  c.height = 20;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2b3038";
  ctx.fillRect(0, 0, 20, 20);
  ctx.fillStyle = "#343a44";
  ctx.fillRect(0, 0, 10, 10);
  ctx.fillRect(10, 10, 10, 10);
  return c;
})();

export const RULER_SIZE = 18;

export interface StageActions {
  fit: () => void;
  /** Flatten the doc (visible layers, opacity/filters/blend) to a PNG dataURL at doc resolution. */
  exportDoc: () => Promise<string | null>;
}

interface CanvasStageProps {
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  actionsRef: React.MutableRefObject<StageActions | null>;
  onLayerContextMenu?: (layerId: string, clientX: number, clientY: number) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({ stageRef, actionsRef, onLayerContextMenu }) => {
  const { state, dispatch } = useStore();
  const { doc, ui, viewport } = state;
  const tool = ui.activeTool;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const holderRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 900, h: 600 });
  const [mouseDoc, setMouseDoc] = React.useState<Pt | null>(null);
  const [guides, setGuides] = React.useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [spaceDown, setSpaceDown] = React.useState(false);
  const [panning, setPanning] = React.useState(false);
  const eraserState = React.useRef<{ layerId: string; last: Pt } | null>(null);
  const rulerDragRef = React.useRef<{ id: string; axis: "v" | "h" } | null>(null);
  const [marquee, setMarquee] = React.useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const userGuides = React.useMemo(
    () => ({
      v: ui.guides.filter((g) => g.axis === "v").map((g) => g.pos),
      h: ui.guides.filter((g) => g.axis === "h").map((g) => g.pos),
    }),
    [ui.guides],
  );

  // --- container size tracking (stage holder = area inside rulers) ---
  React.useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // --- fit / export actions exposed to shell ---
  React.useEffect(() => {
    actionsRef.current = {
      fit: () => {
        const el = containerRef.current;
        if (!el) return;
        const pad = 60;
        const scale = Math.max(
          0.05,
          Math.min((el.clientWidth - pad) / doc.docWidth, (el.clientHeight - pad) / doc.docHeight),
        );
        dispatch({
          type: "SET_VIEWPORT",
          viewport: {
            scale,
            x: (el.clientWidth - doc.docWidth * scale) / 2,
            y: (el.clientHeight - doc.docHeight * scale) / 2,
          },
        });
      },
      exportDoc: () =>
        new Promise<string | null>((resolve) => {
          const stage = stageRef.current;
          if (!stage) {
            resolve(null);
            return;
          }
          const url = stage.toDataURL({
            x: viewport.x,
            y: viewport.y,
            width: doc.docWidth * viewport.scale,
            height: doc.docHeight * viewport.scale,
            pixelRatio: 1 / viewport.scale,
            mimeType: "image/png",
          });
          const out = document.createElement("canvas");
          out.width = doc.docWidth;
          out.height = doc.docHeight;
          const img = new Image();
          img.onload = () => {
            const ctx = out.getContext("2d")!;
            ctx.drawImage(img, 0, 0, out.width, out.height);
            resolve(out.toDataURL("image/png"));
          };
          img.onerror = () => resolve(url);
          img.src = url;
        }),
    };
  }, [doc.docWidth, doc.docHeight, viewport, dispatch, actionsRef, stageRef]);

  // --- space bar = temporary pan ---
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // auto-fit when layers appear (including restored-from-persist on mount)
  const hadLayersRef = React.useRef(false);
  React.useEffect(() => {
    if (!hadLayersRef.current && doc.layers.length > 0 && size.w > 100) {
      actionsRef.current?.fit();
    }
    hadLayersRef.current = doc.layers.length > 0;
  }, [doc.layers.length, size.w, actionsRef]);

  const docPointer = (): Pt | null => {
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!p) return null;
    return { x: (p.x - viewport.x) / viewport.scale, y: (p.y - viewport.y) / viewport.scale };
  };

  /** Pixel-accurate hit (async: loads layer canvases on demand). */
  const hitLayerAtPixelAsync = async (pt: Pt): Promise<Layer | null> =>
    hitLayerAtPixel(
      doc.layers.map((layer) => ({ layer, aabb: layerAABB(layer) })),
      pt,
      (layer, p) => docToImage(layer, p),
    );

  const zoomAt = (factor: number, anchorDocPt?: Pt) => {
    const stage = stageRef.current;
    const p = anchorDocPt
      ? { x: anchorDocPt.x * viewport.scale + viewport.x, y: anchorDocPt.y * viewport.scale + viewport.y }
      : stage?.getPointerPosition();
    if (!p) return;
    const newScale = Math.max(0.05, Math.min(32, viewport.scale * factor));
    const local = { x: (p.x - viewport.x) / viewport.scale, y: (p.y - viewport.y) / viewport.scale };
    dispatch({
      type: "SET_VIEWPORT",
      viewport: { scale: newScale, x: p.x - local.x * newScale, y: p.y - local.y * newScale },
    });
  };

  // --- wheel: zoom at pointer ---
  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    zoomAt(e.evt.deltaY > 0 ? 0.9 : 1.1);
  };

  // --- stage mouse: lasso / wand / eraser / bgremove / zoom / select ---
  const onStageMouseDown = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (spaceDown) return;
    const pt = docPointer();
    if (!pt) return;
    const targetIsBackground = e.target === stageRef.current || e.target.name() === "doc-bg";
    const targetIsTransformer = e.target.findAncestor?.((n: Konva.Node) => n.getClassName() === "Transformer") != null;

    if (tool === "lasso") {
      e.evt.preventDefault();
      if (ui.lasso.closed) return;
      // dragging an existing point must not add a new one
      if (e.target.name() === "lasso-point") return;
      const pts = ui.lasso.points;
      if (pts.length >= 3) {
        const first = pts[0];
        if (Math.hypot(pt.x - first.x, pt.y - first.y) * viewport.scale < 12) {
          dispatch({ type: "LASSO_CLOSE" });
          return;
        }
      }
      dispatch({ type: "LASSO_ADD_POINT", point: pt });
      return;
    }

    if (tool === "wand") {
      const hit = await hitLayerAtPixelAsync(pt);
      if (!hit) {
        dispatch({ type: "SET_WAND", wand: null });
        return;
      }
      if (hit.locked) {
        dispatch({ type: "SET_STATUS", status: `Layer "${hit.name}" đang khoá` });
        return;
      }
      void runWand(hit, pt, e.evt.shiftKey);
      return;
    }

    if (tool === "eraser") {
      const target = doc.layers.find((l) => l.id === ui.selectedIds[0]) || null;
      if (!target) {
        dispatch({ type: "SET_STATUS", status: "Chọn layer cần chà xoá trước (V → click layer)" });
        return;
      }
      if (target.locked) return;
      e.evt.preventDefault();
      eraserState.current = { layerId: target.id, last: docToImage(target, pt) };
      void strokeEraser(target, pt, pt);
      return;
    }

    if (tool === "bgremove") {
      const hit = await hitLayerAtPixelAsync(pt);
      if (hit) void runBgRemove(hit);
      else dispatch({ type: "SET_STATUS", status: "Không có pixel layer nào tại điểm click" });
      return;
    }

    if (tool === "zoom") {
      zoomAt(e.evt.altKey ? 0.8 : 1.25, pt);
      return;
    }

    if (tool === "move" && targetIsBackground && !targetIsTransformer) {
      // click-only → deselect; drag → marquee select (handled in move/up)
      setMarquee({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
    }
  };

  const onStageMouseMove = () => {
    const pt = docPointer();
    setMouseDoc(pt);
    setCursor(pt);
    if (marquee && pt) setMarquee((m) => (m ? { ...m, x2: pt.x, y2: pt.y } : m));
    if (tool === "eraser" && eraserState.current) {
      const target = doc.layers.find((l) => l.id === eraserState.current!.layerId);
      if (target && pt) {
        const imgPt = docToImage(target, pt);
        void strokeEraser(target, eraserState.current.last, imgPt);
        eraserState.current.last = imgPt;
      }
    }
  };

  const onStageMouseUp = () => {
    if (tool === "eraser" && eraserState.current) {
      const layerId = eraserState.current.layerId;
      eraserState.current = null;
      void finishEraserStroke(layerId);
    }
    if (marquee) {
      const wasDrag = Math.hypot(marquee.x2 - marquee.x1, marquee.y2 - marquee.y1) * viewport.scale > 4;
      if (wasDrag) {
        const r = {
          x: Math.min(marquee.x1, marquee.x2),
          y: Math.min(marquee.y1, marquee.y2),
          w: Math.abs(marquee.x2 - marquee.x1),
          h: Math.abs(marquee.y2 - marquee.y1),
        };
        const hitIds = doc.layers
          .filter((l) => {
            if (!l.visible) return false;
            const b = layerAABB(l);
            return b.x < r.x + r.w && b.x + b.width > r.x && b.y < r.y + r.h && b.y + b.height > r.y;
          })
          .map((l) => l.id);
        dispatch({ type: "SELECT", ids: hitIds });
      } else {
        dispatch({ type: "SELECT", ids: [] });
      }
      setMarquee(null);
    }
  };

  // --- eraser implementation ---
  const strokeEraser = async (layer: Layer, from: Pt, to: Pt) => {
    const canvas = await getLayerCanvas(layer);
    const ctx = canvas.getContext("2d")!;
    const node = nodeRegistry.get(layer.id);
    if (node) node.clearCache();
    const brushScale = (Math.abs(layer.scaleX) + Math.abs(layer.scaleY)) / 2;
    eraseSegment(ctx, from, to, ui.toolOptions.eraser.size * brushScale, ui.toolOptions.eraser.hardness);
    node?.getLayer()?.batchDraw();
  };

  const finishEraserStroke = async (layerId: string) => {
    const layer = doc.layers.find((l) => l.id === layerId);
    const canvas = layer ? cachedImage(layer.src) : undefined;
    const node = nodeRegistry.get(layerId);
    if (node && layer && hasActiveFilters(layer)) node.cache();
    if (!layer || !(canvas instanceof HTMLCanvasElement)) return;
    try {
      dispatch({ type: "SET_STATUS", status: "Đang lưu nét chà…" });
      const { path, src } = await uploadCanvas(canvas, getStudioProject());
      cacheImage(src, canvas);
      dispatch({ type: "REPLACE_LAYER_IMAGE", id: layerId, src, path, label: "Erase" });
      dispatch({ type: "SET_STATUS", status: "✓ Đã chà xoá" });
    } catch (err) {
      dispatch({ type: "SET_STATUS", status: `❌ Lưu nét chà thất bại: ${String((err as Error).message)}` });
    }
  };

  // --- wand implementation ---
  const runWand = async (layer: Layer, pt: Pt, additive = false) => {
    const canvas = await getLayerCanvas(layer);
    const ctx = canvas.getContext("2d")!;
    const imgPt = docToImage(layer, pt);
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(imgPt.x)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(imgPt.y)));
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const mask = floodFillMask(
      data,
      canvas.width,
      canvas.height,
      x,
      y,
      ui.toolOptions.wand.tolerance,
      ui.toolOptions.wand.contiguous,
    );
    // shift+click: OR into the existing selection on the same layer
    const prev = additive && ui.wand?.layerId === layer.id ? ui.wand.alphaMask : null;
    let finalMask = mask;
    if (prev && prev.length === mask.length) {
      finalMask = new Uint8ClampedArray(mask.length);
      let any = false;
      for (let i = 0; i < mask.length; i++) {
        const v = mask[i] || prev[i] ? 255 : 0;
        finalMask[i] = v;
        if (v) any = true;
      }
      if (!any) finalMask = mask;
    }
    let count = 0;
    for (let i = 0; i < finalMask.length; i++) if (finalMask[i]) count++;
    if (count === 0) {
      dispatch({ type: "SET_STATUS", status: "Không chọn được pixel — thử tăng tolerance" });
      return;
    }
    dispatch({ type: "SELECT", ids: [layer.id] });
    dispatch({
      type: "SET_WAND",
      wand: {
        layerId: layer.id,
        maskCanvas: maskToPreviewCanvas(finalMask, canvas.width, canvas.height),
        alphaMask: finalMask,
        width: canvas.width,
        height: canvas.height,
      },
    });
    dispatch({
      type: "SET_STATUS",
      status: `✓ Wand chọn ${((count / mask.length) * 100).toFixed(1)}% layer — Delete để xoá vùng chọn`,
    });
  };

  const runBgRemove = async (layer: Layer) => {
    if (layer.locked) return;
    dispatch({ type: "SET_BUSY", busy: true });
    dispatch({ type: "SET_STATUS", status: `Đang tách nền "${layer.name}"…` });
    try {
      const out = layer.path.replace(/\.[^.]+$/, "-cutout.png");
      const data = await bridge({ op: "remove-bg", in: layer.path, out, algo: "auto" });
      dispatch({
        type: "REPLACE_LAYER_IMAGE",
        id: layer.id,
        src: fileUrlBusted(String(data.out)),
        path: String(data.out),
        label: `BG remove ${layer.name}`,
      });
      dispatch({ type: "SET_STATUS", status: `✓ Tách nền xong (${data.algoUsed}) — layer "${layer.name}"` });
    } catch (err) {
      dispatch({ type: "SET_STATUS", status: `❌ ${String((err as Error).message)}` });
    } finally {
      dispatch({ type: "SET_BUSY", busy: false });
    }
  };

  // --- ruler → guide drag ---
  const startRulerDrag = (axis: "v" | "h", e: React.MouseEvent) => {
    e.preventDefault();
    const rect = holderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const guide: Guide = {
      id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      axis,
      pos: axis === "v" ? (e.clientX - rect.left - viewport.x) / viewport.scale : (e.clientY - rect.top - viewport.y) / viewport.scale,
    };
    dispatch({ type: "ADD_GUIDE", guide });
    rulerDragRef.current = { id: guide.id, axis };

    const onMove = (ev: MouseEvent) => {
      const g = rulerDragRef.current;
      if (!g) return;
      const pos =
        g.axis === "v" ? (ev.clientX - rect.left - viewport.x) / viewport.scale : (ev.clientY - rect.top - viewport.y) / viewport.scale;
      dispatch({ type: "MOVE_GUIDE", id: g.id, pos });
    };
    const onUp = () => {
      rulerDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const panningActive = spaceDown || tool === "hand" || panning;
  const layersInteractive = tool === "move";

  // --- DOM-level context menu (Konva has no contextmenu node event) ---
  const layerIds = doc.layers.map((l) => l.id).join(",");
  React.useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;
    const ids = new Set(layerIds ? layerIds.split(",") : []);
    const onCtx = (e: MouseEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = container.getBoundingClientRect();
      const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const shape = stage.getIntersection(pointer);
      e.preventDefault(); // always suppress the browser menu inside the canvas
      e.stopPropagation(); // the shell's window-level contextmenu closer must not fire on the opening event
      const layerId = shape?.getAttr("layerId");
      if (typeof layerId === "string" && ids.has(layerId)) {
        onLayerContextMenu?.(layerId, e.clientX, e.clientY);
      }
    };
    container.addEventListener("contextmenu", onCtx);
    return () => container.removeEventListener("contextmenu", onCtx);
  }, [layerIds, onLayerContextMenu, stageRef]);

  const ruler = useRulerTicks(viewport, size);

  return (
    <div
      ref={containerRef}
      className="as4-canvas-wrap"
      data-viewport={`${viewport.scale},${viewport.x},${viewport.y}`}
      data-doc={`${doc.docWidth},${doc.docHeight}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files?.length) {
          window.dispatchEvent(new CustomEvent("asset-studio:drop-files", { detail: files }));
        }
      }}
    >
      <div
        ref={holderRef}
        className="as4-stage-holder"
        style={ui.showRulers ? { left: RULER_SIZE, top: RULER_SIZE } : undefined}
      >
        <Stage
          ref={(node) => {
            if (node) stageRef.current = node;
          }}
          width={size.w}
          height={size.h}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          draggable={panningActive}
          onWheel={onWheel}
          onMouseDown={onStageMouseDown}
          onMouseMove={onStageMouseMove}
          onMouseUp={onStageMouseUp}
          onMouseLeave={onStageMouseUp}
          onDragStart={() => setPanning(true)}
          onDragEnd={() => setPanning(false)}
          style={{
            cursor: panningActive ? "grab" : tool === "move" ? "default" : "crosshair",
          }}
        >
        <KonvaLayer>
          <Rect
            name="doc-bg"
            x={0}
            y={0}
            width={doc.docWidth}
            height={doc.docHeight}
            fillPatternImage={checkerPattern as unknown as HTMLImageElement}
          />
          <Rect
            x={0}
            y={0}
            width={doc.docWidth}
            height={doc.docHeight}
            stroke="#4a5261"
            strokeWidth={1 / viewport.scale}
            listening={false}
          />

          {/* rule-of-thirds grid */}
          {ui.showGrid && (
            <Group listening={false}>
              {[1, 2].map((i) => (
                <Line key={`gv-${i}`} points={[(doc.docWidth * i) / 3, 0, (doc.docWidth * i) / 3, doc.docHeight]} stroke="rgba(255,255,255,0.14)" strokeWidth={1 / viewport.scale} />
              ))}
              {[1, 2].map((i) => (
                <Line key={`gh-${i}`} points={[0, (doc.docHeight * i) / 3, doc.docWidth, (doc.docHeight * i) / 3]} stroke="rgba(255,255,255,0.14)" strokeWidth={1 / viewport.scale} />
              ))}
            </Group>
          )}

          {doc.layers.map((layer) => (
            <LayerImageNode
              key={layer.id}
              layer={layer}
              interactive={layersInteractive && !layer.locked}
              selected={ui.selectedIds.includes(layer.id)}
              dispatch={dispatch}
              setGuides={setGuides}
              viewportScale={viewport.scale}
              docWidth={doc.docWidth}
              docHeight={doc.docHeight}
              userGuides={userGuides}
            />
          ))}

          {/* wand selection overlay */}
          {ui.wand?.maskCanvas && (() => {
            const l = doc.layers.find((x) => x.id === ui.wand!.layerId);
            if (!l) return null;
            return (
              <KonvaImage
                image={ui.wand.maskCanvas}
                x={l.x}
                y={l.y}
                offsetX={l.width / 2}
                offsetY={l.height / 2}
                width={l.width}
                height={l.height}
                scaleX={l.scaleX * (l.flipX ? -1 : 1)}
                scaleY={l.scaleY * (l.flipY ? -1 : 1)}
                rotation={l.rotation}
                listening={false}
              />
            );
          })()}

          {/* snap guides: v = vertical lines at x, h = horizontal lines at y */}
          {guides.v.map((gx) => (
            <Line key={`v-${gx}`} points={[gx, -100000, gx, 100000]} stroke="#ff3366" strokeWidth={1 / viewport.scale} listening={false} />
          ))}
          {guides.h.map((gy) => (
            <Line key={`h-${gy}`} points={[-100000, gy, 100000, gy]} stroke="#ff3366" strokeWidth={1 / viewport.scale} listening={false} />
          ))}

          {/* marquee selection rect */}
          {marquee && (
            <Rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill="rgba(41,163,255,0.08)"
              stroke="#29a3ff"
              strokeWidth={1 / viewport.scale}
              dash={[4 / viewport.scale, 3 / viewport.scale]}
              listening={false}
            />
          )}

          {/* eraser brush preview */}
          {tool === "eraser" && mouseDoc && (
            <Circle
              x={mouseDoc.x}
              y={mouseDoc.y}
              radius={ui.toolOptions.eraser.size / 2}
              stroke="#f0883e"
              strokeWidth={1 / viewport.scale}
              fill="rgba(240,136,62,0.08)"
              listening={false}
            />
          )}

          {/* lasso overlay */}
          {tool === "lasso" && ui.lasso.points.length > 0 && (            <Group>
              <Line
                points={ui.lasso.points.flatMap((p) => [p.x, p.y])}
                closed={ui.lasso.closed}
                fill="rgba(0,255,100,0.10)"
                stroke="#00ff64"
                strokeWidth={2 / viewport.scale}
              />
              {!ui.lasso.closed && mouseDoc && (
                <Line
                  points={[
                    ui.lasso.points[ui.lasso.points.length - 1].x,
                    ui.lasso.points[ui.lasso.points.length - 1].y,
                    mouseDoc.x,
                    mouseDoc.y,
                  ]}
                  stroke="#00ff64"
                  strokeWidth={1 / viewport.scale}
                  dash={[6 / viewport.scale, 4 / viewport.scale]}
                />
              )}
              {ui.lasso.points.map((p, i) => (
                <Circle
                  key={i}
                  name="lasso-point"
                  x={p.x}
                  y={p.y}
                  radius={5 / viewport.scale}
                  fill={i === 0 ? "#ff6600" : "#00ff64"}
                  stroke="#ffffff"
                  strokeWidth={1 / viewport.scale}
                  draggable
                  onDragEnd={(e) => {
                    const np = ui.lasso.points.map((q, j) => (j === i ? { x: e.target.x(), y: e.target.y() } : q));
                    dispatch({ type: "LASSO_SET", lasso: { points: np, closed: ui.lasso.closed } });
                  }}
                  onClick={() => {
                    // click điểm đầu (cam) = khép polygon
                    if (i === 0 && ui.lasso.points.length >= 3 && !ui.lasso.closed) {
                      dispatch({ type: "LASSO_CLOSE" });
                    }
                  }}
                />
              ))}
            </Group>
          )}
        </KonvaLayer>

        <KonvaLayer>
          <TransformerComponent selectedIds={ui.selectedIds} tool={tool} />
          {/* user guides (draggable, double-click to remove) */}
          {ui.guides.map((g) => (
            <KonvaLineGuide
              key={g.id}
              guide={g}
              scale={viewport.scale}
              dispatch={dispatch}
            />
          ))}
        </KonvaLayer>
      </Stage>
      </div>

      {/* empty-state hint (doc has no layers) */}
      {doc.layers.length === 0 && (
        <div className="as4-canvas-empty">
          <div className="as4-canvas-empty-icon">🎨</div>
          <div>Import body (Stock / Upload) hoặc Generate head để bắt đầu</div>
          <small>Kéo-thả ảnh vào đây cũng được</small>
        </div>
      )}

      {/* rulers (HTML overlay, positions relative to stage origin = holder top-left) */}
      {ui.showRulers && (
        <>
          <div className="as4-ruler as4-ruler-corner" />
          <div
            className="as4-ruler as4-ruler-top"
            onMouseDown={(e) => startRulerDrag("h", e)}
            title="Kéo xuống để tạo guide ngang"
          >
            {ruler.x.map((t) => (
              <div key={`tx-${t}`} className="as4-ruler-tick-x" style={{ left: viewport.x + t * viewport.scale }}>
                <i />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div
            className="as4-ruler as4-ruler-left"
            onMouseDown={(e) => startRulerDrag("v", e)}
            title="Kéo sang phải để tạo guide dọc"
          >
            {ruler.y.map((t) => (
              <div key={`ty-${t}`} className="as4-ruler-tick-y" style={{ top: viewport.y + t * viewport.scale }}>
                <i />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- ruler tick computation ---

function useRulerTicks(viewport: ViewportLike, size: { w: number; h: number }): { x: number[]; y: number[] } {
  return React.useMemo(() => {
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
    const pick = (px: number) => steps.find((s) => s * viewport.scale >= 60) ?? 10000;
    const axis = (span: number, offset: number) => {
      const step = pick(span);
      const from = Math.floor((0 - offset) / viewport.scale / step) * step;
      const to = Math.ceil((span - offset) / viewport.scale / step) * step;
      const ticks: number[] = [];
      for (let v = from; v <= to; v += step) ticks.push(v);
      return ticks;
    };
    return { x: axis(size.w, viewport.x), y: axis(size.h, viewport.y) };
  }, [viewport, size]);
}

interface ViewportLike {
  scale: number;
  x: number;
  y: number;
}

/** A draggable guide line; drag moves it, double-click removes it. */
const KonvaLineGuide: React.FC<{
  guide: Guide;
  scale: number;
  dispatch: ReturnType<typeof useStore>["dispatch"];
}> = ({ guide, scale, dispatch }) => {
  const lineRef = React.useRef<Konva.Line>(null);

  React.useEffect(() => {
    const node = lineRef.current;
    if (!node) return;
    if (guide.axis === "v") node.x(guide.pos);
    else node.y(guide.pos);
    node.getLayer()?.batchDraw();
  }, [guide.pos, guide.axis]);

  return (
    <Line
      ref={lineRef}
      points={guide.axis === "v" ? [0, -100000, 0, 100000] : [-100000, 0, 100000, 0]}
      stroke="#29a3ff"
      strokeWidth={1 / scale}
      hitStrokeWidth={8 / scale}
      draggable
      dragBoundFunc={(pos) => (guide.axis === "v" ? { x: pos.x, y: 0 } : { x: 0, y: pos.y })}
      onDragMove={(e) => {
        const node = e.target;
        dispatch({ type: "MOVE_GUIDE", id: guide.id, pos: guide.axis === "v" ? node.x() : node.y() });
      }}
      onDblClick={() => dispatch({ type: "REMOVE_GUIDE", id: guide.id })}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "ew-resize";
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "";
      }}
    />
  );
};

// --- studio project id (set by shell; used by pixel uploads) ---
let studioProject = "isaacverse-final";
export function setStudioProject(id: string): void {
  studioProject = id;
}
function getStudioProject(): string {
  return studioProject;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function hasActiveFilters(layer: Layer): boolean {
  const f = layer.filters;
  return f.brightness !== 0 || f.contrast !== 0 || f.saturate !== 0 || f.hue !== 0 || f.blur !== 0;
}

// --- single layer image node ---

interface LayerImageProps {
  layer: Layer;
  interactive: boolean;
  selected: boolean;
  dispatch: ReturnType<typeof useStore>["dispatch"];
  setGuides: React.Dispatch<React.SetStateAction<{ v: number[]; h: number[] }>>;
  viewportScale: number;
  docWidth: number;
  docHeight: number;
  userGuides: { v: number[]; h: number[] };
}

const LayerImageNode: React.FC<LayerImageProps> = ({
  layer,
  interactive,
  dispatch,
  setGuides,
  viewportScale,
  docWidth,
  docHeight,
  userGuides,
}) => {
  const [image, setImage] = React.useState<CanvasImageSource | null>(null);
  const nodeRef = React.useRef<Konva.Image>(null);
  const filtersActive = hasActiveFilters(layer);

  React.useEffect(() => {
    let cancelled = false;
    const cached = cachedImage(layer.src);
    if (cached) {
      setImage(cached);
      return;
    }
    loadImage(layer.src)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [layer.src]);

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    if (filtersActive && image) node.cache();
    else node.clearCache();
  }, [filtersActive, image, layer.filters, layer.src]);

  React.useEffect(() => {
    const node = nodeRef.current;
    if (node) nodeRegistry.set(layer.id, node);
    return () => {
      nodeRegistry.delete(layer.id);
    };
  }, [layer.id]);

  return (
    <KonvaImage
      ref={nodeRef}
      layerId={layer.id}
      x={layer.x}
      y={layer.y}
      offsetX={layer.width / 2}
      offsetY={layer.height / 2}
      width={layer.width}
      height={layer.height}
      scaleX={layer.scaleX * (layer.flipX ? -1 : 1)}
      scaleY={layer.scaleY * (layer.flipY ? -1 : 1)}
      rotation={layer.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      globalCompositeOperation={layer.blendMode as GlobalCompositeOperation}
      image={image ?? undefined}
      draggable={interactive}
      listening={interactive}
      filters={filtersActive ? [Konva.Filters.Brighten, Konva.Filters.Contrast, Konva.Filters.HSL, Konva.Filters.Blur] : []}
      brightness={layer.filters.brightness / 100}
      contrast={layer.filters.contrast}
      saturation={layer.filters.saturate / 100}
      hue={(layer.filters.hue + 360) % 360}
      blurRadius={layer.filters.blur}
      onMouseDown={(e) => {
        if (e.evt.shiftKey) dispatch({ type: "SELECT", ids: [layer.id], additive: true });
        else dispatch({ type: "SELECT", ids: [layer.id] });
      }}
      onDragStart={() => {
        dispatch({ type: "HISTORY_MARK", label: `Move ${layer.name}` });
      }}
      onDragMove={(e) => {
        const snap = snapLayer(
          { x: e.target.x(), y: e.target.y() },
          layer,
          docWidth,
          docHeight,
          6 / viewportScale,
          userGuides,
        );
        if (snap.guidesX.length || snap.guidesY.length) {
          e.target.x(snap.x);
          e.target.y(snap.y);
        }
        setGuides({ v: snap.guidesX, h: snap.guidesY });
      }}
      onDragEnd={(e) => {
        setGuides({ v: [], h: [] });
        dispatch({ type: "UPDATE_LAYER", id: layer.id, updates: { x: e.target.x(), y: e.target.y() } });
        dispatch({ type: "HISTORY_COMMIT" });
      }}
      onTransformStart={() => {
        dispatch({ type: "HISTORY_MARK", label: `Transform ${layer.name}` });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        dispatch({
          type: "UPDATE_LAYER",
          id: layer.id,
          updates: {
            x: node.x(),
            y: node.y(),
            scaleX: Math.abs(node.scaleX()),
            scaleY: Math.abs(node.scaleY()),
            rotation: node.rotation(),
          },
        });
        dispatch({ type: "HISTORY_COMMIT" });
      }}
    />
  );
};

// --- transformer ---

const TransformerComponent: React.FC<{ selectedIds: string[]; tool: string }> = ({ selectedIds, tool }) => {
  const trRef = React.useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selectedIds.map((id) => nodeRegistry.get(id)).filter((n): n is Konva.Image => Boolean(n));
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, tool]);

  return (
    <Transformer
      ref={trRef}
      rotateEnabled
      keepRatio
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={4}
      anchorSize={9}
      anchorCornerRadius={2}
      anchorStroke="#f0883e"
      anchorFill="#161b22"
      borderStroke="#f0883e"
      borderStrokeWidth={1}
      borderDash={[4, 4]}
      padding={2}
    />
  );
};
