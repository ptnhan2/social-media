import Konva from "konva";
import React from "react";
import { Circle, Group, Image as KonvaImage, Layer as KonvaLayer, Line, Rect, Stage, Transformer } from "react-konva";
import { useStore } from "./store";
import { docToImage, snapLayer } from "./geometry";
import {
  bridge,
  cacheImage,
  cachedImage,
  eraseSegment,
  fileUrl,
  floodFillMask,
  getLayerCanvas,
  loadImage,
  maskToPreviewCanvas,
  uploadCanvas,
} from "./imageOps";
import { Layer, Pt } from "./types";
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

export interface StageActions {
  fit: () => void;
  /** Flatten the doc (visible layers, opacity/filters/blend) to a PNG dataURL at doc resolution. */
  exportDoc: () => Promise<string | null>;
}

interface CanvasStageProps {
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  actionsRef: React.MutableRefObject<StageActions | null>;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({ stageRef, actionsRef }) => {
  const { state, dispatch } = useStore();
  const { doc, ui, viewport } = state;
  const tool = ui.activeTool;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 900, h: 600 });
  const [mouseDoc, setMouseDoc] = React.useState<Pt | null>(null);
  const [guides, setGuides] = React.useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [spaceDown, setSpaceDown] = React.useState(false);
  const [panning, setPanning] = React.useState(false);
  const eraserState = React.useRef<{ layerId: string; last: Pt } | null>(null);

  // --- container size tracking ---
  React.useEffect(() => {
    const el = containerRef.current;
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

  // auto-fit when the first layer arrives
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

  const hitLayerAt = (pt: Pt): Layer | null => {
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const l = doc.layers[i];
      if (!l.visible) continue;
      const b = layerAABB(l);
      if (pt.x >= b.x && pt.x <= b.x + b.width && pt.y >= b.y && pt.y <= b.y + b.height) return l;
    }
    return null;
  };

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
  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (spaceDown) return;
    const pt = docPointer();
    if (!pt) return;
    const targetIsBackground = e.target === stageRef.current || e.target.name() === "doc-bg";
    const targetIsTransformer = e.target.findAncestor?.((n: Konva.Node) => n.getClassName() === "Transformer") != null;

    if (tool === "lasso") {
      e.evt.preventDefault();
      if (ui.lasso.closed) return;
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
      const hit = hitLayerAt(pt);
      if (!hit) {
        dispatch({ type: "SET_WAND", wand: null });
        return;
      }
      if (hit.locked) {
        dispatch({ type: "SET_STATUS", status: `Layer "${hit.name}" đang khoá` });
        return;
      }
      void runWand(hit, pt);
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
      const hit = hitLayerAt(pt);
      if (hit) void runBgRemove(hit);
      return;
    }

    if (tool === "zoom") {
      zoomAt(e.evt.altKey ? 0.8 : 1.25, pt);
      return;
    }

    if (tool === "move" && targetIsBackground && !targetIsTransformer) {
      dispatch({ type: "SELECT", ids: [] });
    }
  };

  const onStageMouseMove = () => {
    const pt = docPointer();
    setMouseDoc(pt);
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
  const runWand = async (layer: Layer, pt: Pt) => {
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
    let count = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i]) count++;
    if (count === 0) {
      dispatch({ type: "SET_STATUS", status: "Không chọn được pixel — thử tăng tolerance" });
      return;
    }
    dispatch({ type: "SELECT", ids: [layer.id] });
    dispatch({
      type: "SET_WAND",
      wand: {
        layerId: layer.id,
        maskCanvas: maskToPreviewCanvas(mask, canvas.width, canvas.height),
        alphaMask: mask,
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
        src: fileUrl(String(data.out)),
        path: String(data.out),
        label: `BG remove ${layer.name}`,
      });
      dispatch({ type: "SET_STATUS", status: `✓ Tách nền xong (${data.algoUsed})` });
    } catch (err) {
      dispatch({ type: "SET_STATUS", status: `❌ ${String((err as Error).message)}` });
    } finally {
      dispatch({ type: "SET_BUSY", busy: false });
    }
  };

  const panningActive = spaceDown || tool === "hand" || panning;
  const layersInteractive = tool === "move";

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
        style={{ cursor: panningActive ? "grab" : tool === "move" ? "default" : "crosshair" }}
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

          {/* lasso overlay */}
          {tool === "lasso" && ui.lasso.points.length > 0 && (
            <Group listening={false}>
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
                  x={p.x}
                  y={p.y}
                  radius={5 / viewport.scale}
                  fill={i === 0 ? "#ff6600" : "#00ff64"}
                  stroke="#ffffff"
                  strokeWidth={1 / viewport.scale}
                />
              ))}
            </Group>
          )}
        </KonvaLayer>

        <KonvaLayer>
          <TransformerComponent selectedIds={ui.selectedIds} tool={tool} />
        </KonvaLayer>
      </Stage>
    </div>
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
}

const LayerImageNode: React.FC<LayerImageProps> = ({
  layer,
  interactive,
  dispatch,
  setGuides,
  viewportScale,
  docWidth,
  docHeight,
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
        const snap = snapLayer({ x: e.target.x(), y: e.target.y() }, layer, docWidth, docHeight, 6 / viewportScale);
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
