import React from "react";
import type { EditorClip, EditorDoc } from "../../../shared/isaacverse/editor";
import { overlayStyleAt } from "../../../shared/isaacverse/clipStyle";

type ElementInfo = {
  clip: EditorClip;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

type ContextMenuState = {
  x: number;
  y: number;
  clipId: string;
};

type DragState =
  | { mode: "none" }
  | { mode: "move"; startClientX: number; startClientY: number; origins: { clipId: string; x: number; y: number }[] }
  | { mode: "resize"; handle: string; startClientX: number; startClientY: number; origin: ElementInfo }
  | { mode: "rotate"; startClientX: number; startClientY: number; origin: ElementInfo }
  | { mode: "marquee"; startX: number; startY: number; currentX: number; currentY: number };

export type InteractiveCanvasProps = {
  editor: EditorDoc;
  currentSec: number;
  selectionClipIds: string[];
  groups: { id: string; name: string; clipIds: string[] }[];
  onSelect: (clipIds: string[]) => void;
  onMoveCommit: (clipId: string, x: number, y: number) => void;
  onResizeCommit: (clipId: string, patch: { x: number; y: number; w: number; h: number }) => void;
  onRotateCommit: (clipId: string, rotation: number) => void;
  onZOrder: (clipId: string, action: "forward" | "backward" | "front" | "back") => void;
  onFlip: (clipId: string, axis: "h" | "v") => void;
  onDuplicate: (clipId: string) => void;
  onDelete: (clipId: string) => void;
  onGroup: (clipIds: string[]) => void;
  onUngroup: (clipId: string) => void;
  onTextEdit: (clipId: string, text: string) => void;
};

const SNAP_TOLERANCE = 0.008;
const MIN_SIZE = 0.02;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const snapValue = (value: number, candidates: number[]) => {
  let best = value;
  for (const candidate of candidates) {
    if (Math.abs(value - candidate) < SNAP_TOLERANCE) { best = candidate; break; }
  }
  return best;
};

const activeElements = (editor: EditorDoc, currentSec: number): ElementInfo[] =>
  editor.tracks
    .filter((track) => (track.kind === "text" || track.kind === "overlay" || track.kind === "video") && !track.hidden && !track.locked)
    .flatMap((track) => track.clips)
    .filter((clip) => !clip.hidden && !clip.locked && clip.kind === "element" && currentSec >= clip.range.startSec && currentSec <= clip.range.endSec)
    .map((clip) => {
      const style = overlayStyleAt(clip, currentSec);
      return { clip, x: style.x, y: style.y, w: style.w, h: style.h, rotation: style.rotation };
    })
    .sort((a, b) => (typeof a.clip.metadata.z === "number" ? a.clip.metadata.z : 10) - (typeof b.clip.metadata.z === "number" ? b.clip.metadata.z : 10));

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  editor, currentSec, selectionClipIds, groups, onSelect, onMoveCommit, onResizeCommit, onRotateCommit, onZOrder, onFlip, onDuplicate, onDelete, onGroup, onUngroup, onTextEdit,
}) => {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<DragState>({ mode: "none" });
  const [live, setLive] = React.useState<Record<string, ElementInfo>>({});
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(null);
  const [editingText, setEditingText] = React.useState<{ clipId: string; value: string } | null>(null);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [guides, setGuides] = React.useState<{ vertical: number[]; horizontal: number[] }>({ vertical: [], horizontal: [] });
  const [stageScale, setStageScale] = React.useState(1);
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const update = () => setStageScale(Math.max(0.01, stage.getBoundingClientRect().width / editor.width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [editor.width]);
  const elements = activeElements(editor, currentSec);
  const liveFor = (clipId: string) => live[clipId];

  const toNormalized = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  };

  const stopDrag = () => setDrag({ mode: "none" });

  const hitTest = (clientX: number, clientY: number): string | undefined => {
    const point = toNormalized(clientX, clientY);
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const el = elements[i];
      const info = liveFor(el.clip.id) || el;
      if (point.x >= info.x && point.x <= info.x + info.w && point.y >= info.y && point.y <= info.y + info.h) return el.clip.id;
    }
    return undefined;
  };

  const onStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button === 2) return;
    setContextMenu(null);
    stageRef.current?.focus();
    const point = toNormalized(event.clientX, event.clientY);
    const hit = hitTest(event.clientX, event.clientY);

    if (hit) {
      const wasSelected = selectionClipIds.includes(hit);
      if (event.shiftKey) {
        onSelect(wasSelected ? selectionClipIds.filter((id) => id !== hit) : [...selectionClipIds, hit]);
        return;
      }
      if (!wasSelected) onSelect([hit]);
      const origins = selectionClipIds.includes(hit) ? elements.filter((el) => selectionClipIds.includes(el.clip.id)) : elements.filter((el) => el.clip.id === hit);
      setDrag({
        mode: "move",
        startClientX: event.clientX,
        startClientY: event.clientY,
        origins: origins.map((el) => ({ clipId: el.clip.id, x: el.x, y: el.y })),
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    setDrag({ mode: "marquee", startX: point.x, startY: point.y, currentX: point.x, currentY: point.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onStagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.mode === "none") return;
    const point = toNormalized(event.clientX, event.clientY);
    if (drag.mode === "move") {
      const dx = point.x - toNormalized(drag.startClientX, drag.startClientY).x;
      const dy = point.y - toNormalized(drag.startClientX, drag.startClientY).y;
      const next: Record<string, ElementInfo> = {};
      const vGuides: number[] = [];
      const hGuides: number[] = [];
      for (const origin of drag.origins) {
        const el = elements.find((candidate) => candidate.clip.id === origin.clipId);
        if (!el) continue;
        const rawX = origin.x + dx;
        const rawY = origin.y + dy;
        let x = snapValue(rawX, [0, 0.5 - el.w / 2, 1 - el.w]);
        let y = snapValue(rawY, [0, 0.5 - el.h / 2, 1 - el.h]);
        const elRight = x + el.w;
        const elCenterX = x + el.w / 2;
        const elBottom = y + el.h;
        const elCenterY = y + el.h / 2;
        for (const other of elements) {
          if (drag.origins.some((o) => o.clipId === other.clip.id)) continue;
          const oLeft = other.x;
          const oRight = other.x + other.w;
          const oCenterX = other.x + other.w / 2;
          const oTop = other.y;
          const oBottom = other.y + other.h;
          const oCenterY = other.y + other.h / 2;
          for (const candidate of [oLeft, oRight, oCenterX]) {
            for (const target of [x, elRight, elCenterX]) {
              if (Math.abs(target - candidate) < SNAP_TOLERANCE) { x = candidate === oLeft || candidate === oCenterX ? (target === elRight ? candidate - el.w : target === elCenterX ? candidate - el.w / 2 : candidate) : (target === elRight ? candidate - el.w : target === elCenterX ? candidate - el.w / 2 : candidate); vGuides.push(candidate); }
            }
          }
          for (const candidate of [oTop, oBottom, oCenterY]) {
            for (const target of [y, elBottom, elCenterY]) {
              if (Math.abs(target - candidate) < SNAP_TOLERANCE) { y = candidate === oTop || candidate === oCenterY ? (target === elBottom ? candidate - el.h : target === elCenterY ? candidate - el.h / 2 : candidate) : (target === elBottom ? candidate - el.h : target === elCenterY ? candidate - el.h / 2 : candidate); hGuides.push(candidate); }
            }
          }
        }
        next[origin.clipId] = { ...el, x, y };
      }
      setLive(next);
      setGuides({ vertical: [...new Set(vGuides)], horizontal: [...new Set(hGuides)] });
    } else if (drag.mode === "resize") {
      const el = elements.find((candidate) => candidate.clip.id === drag.origin.clip.id);
      if (!el) return;
      const start = toNormalized(drag.startClientX, drag.startClientY);
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      let { x, y, w, h } = drag.origin;
      const keepAspect = event.shiftKey;
      const aspect = drag.origin.h > 0 ? drag.origin.w / drag.origin.h : 1;
      if (drag.handle.includes("e")) w = clamp(drag.origin.w + dx, MIN_SIZE, 1);
      if (drag.handle.includes("s")) h = clamp(drag.origin.h + dy, MIN_SIZE, 1);
      if (drag.handle.includes("w")) { w = clamp(drag.origin.w - dx, MIN_SIZE, 1); x = drag.origin.x + (drag.origin.w - w); }
      if (drag.handle.includes("n")) { h = clamp(drag.origin.h - dy, MIN_SIZE, 1); y = drag.origin.y + (drag.origin.h - h); }
      if (keepAspect) {
        const scaleBy = Math.max(w / drag.origin.w, h / drag.origin.h);
        w = drag.origin.w * scaleBy;
        h = drag.origin.h * scaleBy;
        if (drag.handle.includes("w")) x = drag.origin.x + (drag.origin.w - w);
        if (drag.handle.includes("n")) y = drag.origin.y + (drag.origin.h - h);
      }
      setLive({ [el.clip.id]: { ...el, x, y, w, h } });
    } else if (drag.mode === "rotate") {
      const el = elements.find((candidate) => candidate.clip.id === drag.origin.clip.id);
      if (!el) return;
      const start = toNormalized(drag.startClientX, drag.startClientY);
      const cx = drag.origin.x + drag.origin.w / 2;
      const cy = drag.origin.y + drag.origin.h / 2;
      const angle = (dx: number, dy: number) => Math.atan2(dy, dx) * (180 / Math.PI);
      const before = angle(start.x - cx, start.y - cy);
      const after = angle(point.x - cx, point.y - cy);
      let rotation = drag.origin.rotation + (after - before);
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      rotation = ((rotation % 360) + 360) % 360;
      setLive({ [el.clip.id]: { ...el, rotation } });
    } else if (drag.mode === "marquee") {
      setDrag({ ...drag, currentX: point.x, currentY: point.y });
    }
  };

  const onStagePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.mode === "move") {
      for (const origin of drag.origins) {
        const info = liveFor(origin.clipId);
        if (info) onMoveCommit(origin.clipId, info.x, info.y);
      }
    } else if (drag.mode === "resize") {
      const info = liveFor(drag.origin.clip.id);
      if (info) onResizeCommit(drag.origin.clip.id, { x: info.x, y: info.y, w: info.w, h: info.h });
    } else if (drag.mode === "rotate") {
      const info = liveFor(drag.origin.clip.id);
      if (info) onRotateCommit(drag.origin.clip.id, Math.round(info.rotation * 10) / 10);
    } else if (drag.mode === "marquee") {
      const rect = {
        left: Math.min(drag.startX, drag.currentX),
        top: Math.min(drag.startY, drag.currentY),
        right: Math.max(drag.startX, drag.currentX),
        bottom: Math.max(drag.startY, drag.currentY),
      };
      const inside = elements.filter((el) => {
        const info = liveFor(el.clip.id) || el;
        const cx = info.x + info.w / 2;
        const cy = info.y + info.h / 2;
        return cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
      });
      onSelect(inside.map((el) => el.clip.id));
      setDrag({ mode: "none" });
      setLive({});
      return;
    }
    setDrag({ mode: "none" });
    setLive({});
    setGuides({ vertical: [], horizontal: [] });
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const hit = hitTest(event.clientX, event.clientY);
    if (!hit) return;
    const el = elements.find((e) => e.clip.id === hit);
    if (!el || !el.clip.metadata.isTextClip) return;
    setEditingText({ clipId: hit, value: String(el.clip.metadata.text ?? "") });
  };

  const commitTextEdit = () => {
    if (editingText && editingText.value !== String(elements.find((e) => e.clip.id === editingText.clipId)?.clip.metadata.text ?? "")) {
      onTextEdit(editingText.clipId, editingText.value);
    }
    setEditingText(null);
  };

  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const hit = hitTest(event.clientX, event.clientY);
    if (!hit) return;
    event.preventDefault();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top, clipId: hit });
  };

  const closeMenu = () => setContextMenu(null);

  const runMenuAction = (action: string) => {
    if (!contextMenu) return;
    const { clipId } = contextMenu;
    if (action.startsWith("z:")) onZOrder(clipId, action.slice(2) as "forward" | "backward" | "front" | "back");
    else if (action === "flip-h") onFlip(clipId, "h");
    else if (action === "flip-v") onFlip(clipId, "v");
    else if (action === "duplicate") onDuplicate(clipId);
    else if (action === "delete") onDelete(clipId);
    closeMenu();
  };

  React.useEffect(() => {
    const onGlobalPointerUp = () => {
      if (drag.mode !== "none") {
        setDrag({ mode: "none" });
        setLive({});
      }
    };
    window.addEventListener("pointerup", onGlobalPointerUp);
    return () => window.removeEventListener("pointerup", onGlobalPointerUp);
  }, [drag.mode]);

  const marqueeRect = drag.mode === "marquee" ? {
    left: `${Math.min(drag.startX, drag.currentX) * 100}%`,
    top: `${Math.min(drag.startY, drag.currentY) * 100}%`,
    width: `${Math.abs(drag.currentX - drag.startX) * 100}%`,
    height: `${Math.abs(drag.currentY - drag.startY) * 100}%`,
  } : null;

  return (
    <div
      ref={stageRef}
      className={`ic-stage ${drag.mode !== "none" ? "dragging" : ""}`}
      tabIndex={0}
      aria-label="Canvas editor — click an element to select it"
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      {elements.map((el) => {
        const info = liveFor(el.clip.id) || el;
        const selected = selectionClipIds.includes(el.clip.id);
        const isHover = hoverId === el.clip.id && !selected;
        const isEditing = editingText?.clipId === el.clip.id;
        const boxStyle: React.CSSProperties = {
          left: `${info.x * 100}%`,
          top: `${info.y * 100}%`,
          width: `${info.w * 100}%`,
          height: `${info.h * 100}%`,
          transform: `rotate(${info.rotation}deg)`,
          cursor: drag.mode === "none" ? "move" : undefined,
        };
        if (isEditing) return null;
        return (
          <div
            key={el.clip.id}
            className={`ic-element ${selected ? "selected" : ""} ${isHover ? "hovered" : ""}`}
            style={boxStyle}
            data-clip-id={el.clip.id}
            onPointerEnter={() => setHoverId(el.clip.id)}
            onPointerLeave={() => setHoverId(null)}
          >
            {selected ? (
              <>
                {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
                  <span
                    key={handle}
                    className={`ic-handle ic-handle-${handle}`}
                    data-handle={handle}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDrag({ mode: "resize", handle, startClientX: event.clientX, startClientY: event.clientY, origin: { ...el } });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                  />
                ))}
                <span
                  className="ic-rotate-handle"
                  aria-label="Rotate element"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setDrag({ mode: "rotate", startClientX: event.clientX, startClientY: event.clientY, origin: { ...el } });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                />
              </>
            ) : null}
          </div>
        );
      })}
      {marqueeRect ? <div className="ic-marquee" style={marqueeRect} /> : null}
      {selectionClipIds.length >= 2 ? (
        <div className="ic-multi-toolbar">
          <button type="button" onClick={() => onGroup(selectionClipIds)}>Group</button>
          {groups.some((g) => g.clipIds.some((id) => selectionClipIds.includes(id))) ? <button type="button" onClick={() => selectionClipIds.forEach((id) => onUngroup(id))}>Ungroup</button> : null}
        </div>
      ) : null}
      {contextMenu ? (
        <div className="ic-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => runMenuAction("duplicate")}>Duplicate</button>
          <button type="button" onClick={() => runMenuAction("delete")}>Delete</button>
          <hr />
          <button type="button" onClick={() => runMenuAction("z:front")}>Bring to front</button>
          <button type="button" onClick={() => runMenuAction("z:forward")}>Bring forward</button>
          <button type="button" onClick={() => runMenuAction("z:backward")}>Send backward</button>
          <button type="button" onClick={() => runMenuAction("z:back")}>Send to back</button>
          <hr />
          <button type="button" onClick={() => runMenuAction("flip-h")}>Flip horizontal</button>
          <button type="button" onClick={() => runMenuAction("flip-v")}>Flip vertical</button>
        </div>
      ) : null}
      {groups.map((group) => {
        const memberEls = elements.filter((el) => group.clipIds.includes(el.clip.id));
        if (memberEls.length < 2) return null;
        const minX = Math.min(...memberEls.map((el) => (liveFor(el.clip.id) || el).x));
        const minY = Math.min(...memberEls.map((el) => (liveFor(el.clip.id) || el).y));
        const maxX = Math.max(...memberEls.map((el) => { const info = liveFor(el.clip.id) || el; return info.x + info.w; }));
        const maxY = Math.max(...memberEls.map((el) => { const info = liveFor(el.clip.id) || el; return info.y + info.h; }));
        const padding = 0.01;
        return (
          <div key={group.id} className="ic-group-box" style={{ left: `${(minX - padding) * 100}%`, top: `${(minY - padding) * 100}%`, width: `${(maxX - minX + padding * 2) * 100}%`, height: `${(maxY - minY + padding * 2) * 100}%` }}>
            <span className="ic-group-label">{group.name}</span>
          </div>
        );
      })}
      {guides.vertical.map((x, i) => <div key={`vg-${i}`} className="ic-guide-line ic-guide-vertical" style={{ left: `${x * 100}%` }} />)}
      {guides.horizontal.map((y, i) => <div key={`hg-${i}`} className="ic-guide-line ic-guide-horizontal" style={{ top: `${y * 100}%` }} />)}
      {editingText ? (() => {
        const el = elements.find((e) => e.clip.id === editingText.clipId);
        if (!el) return null;
        const md = el.clip.metadata;
        return (
          <textarea
            className="ic-inline-text-editor"
            autoFocus
            value={editingText.value}
            style={{
              left: `${el.x * 100}%`, top: `${el.y * 100}%`, width: `${el.w * 100}%`, height: `${el.h * 100}%`,
              color: typeof md.color === "string" ? md.color : "#fff",
              fontFamily: typeof md.fontFamily === "string" ? md.fontFamily : "Inter, sans-serif",
              fontSize: `${(typeof md.fontSize === "number" ? md.fontSize : 48) * stageScale}px`,
              fontWeight: typeof md.fontWeight === "number" ? md.fontWeight : 700,
              textAlign: typeof md.textAlign === "string" ? md.textAlign as "left" | "center" | "right" : "center",
              fontStyle: md.fontStyle === "italic" ? "italic" : "normal",
              letterSpacing: typeof md.letterSpacing === "number" ? `${md.letterSpacing * stageScale}px` : undefined,
              lineHeight: typeof md.lineHeight === "number" ? md.lineHeight : undefined,
              textShadow: typeof md.textShadow === "string" ? md.textShadow : "0 2px 8px rgba(0,0,0,.55)",
            }}
            onChange={(e) => setEditingText({ ...editingText, value: e.target.value })}
            onBlur={commitTextEdit}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitTextEdit(); } if (e.key === "Escape") setEditingText(null); }}
          />
        );
      })() : null}
      <div className="ic-hint">{elements.length} elements on canvas · click to select · drag to move · Shift+drag to multi-select · Ctrl+G to group · double-click text to edit</div>
    </div>
  );
};
