// canvas/EditSurface.tsx — Canva-style direct-manipulation canvas (fixed 960x540 stage).
// PX coordinates = native for react-moveable: no % <-> px conversion, no transform conflicts.
// During a gesture moveable mutates the target's style directly; on END geometry commits to state.
import React from "react";
import Moveable from "react-moveable";
import { CanvasStage } from "./CanvasStage";
import type { CanvasElement } from "./types";
import { CANVAS_W, CANVAS_H } from "./types";

export interface EditSurfaceProps {
  elements: CanvasElement[];
  grain?: number;
  vignette?: number;
  selectedIds: string[];
  onSelect: (ids: string[], additive: boolean) => void;
  onLive: (updater: (els: CanvasElement[]) => CanvasElement[]) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}

export const EditSurface: React.FC<EditSurfaceProps> = ({ elements, grain, vignette, selectedIds, onSelect, onLive, onGestureStart, onGestureEnd }) => {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const elRefs = React.useRef<Record<string, HTMLElement>>({});
  const moveableRef = React.useRef<Moveable>(null);
  const [editingText, setEditingText] = React.useState<string | null>(null);

  React.useEffect(() => { moveableRef.current?.updateRect(); }, [selectedIds]);
  // Keep moveable handles aligned if the stage is resized (Canva/TinyEngine pattern).
  React.useEffect(() => {
    if (!stageRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => moveableRef.current?.updateRect());
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  // Commit the target's DOM geometry (px) back into state. Called on gesture END.
  const commitFromDom = (node: HTMLElement) => {
    const id = node.dataset.elId!;
    const px = (s: string) => parseFloat(s) || 0;
    const m = node.style.transform.match(/rotate\(\s*([-\d.]+)deg\s*\)/);
    onLive(els => els.map(el => el.id === id ? {
      ...el, x: px(node.style.left), y: px(node.style.top),
      w: px(node.style.width) || el.w, h: px(node.style.height) || el.h,
      rotation: m ? parseFloat(m[1]) : el.rotation,
    } : el));
  };

  const transformableIds = selectedIds.filter(id => !elements.find(e => e.id === id)?.locked);
  const transformableNodes = transformableIds.map(id => elRefs.current[id]).filter(Boolean) as HTMLElement[];
  const isGroup = transformableNodes.length > 1;

  const handleElementPointerDown = (id: string, e: React.PointerEvent) => {
    const el = elements.find(x => x.id === id);
    if (e.shiftKey) { onSelect(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id], true); return; }
    if (!selectedIds.includes(id)) onSelect([id], false);
    if (el?.type === "text" && !el.locked && e.detail === 2) setEditingText(id);
  };

  return (
    <div className="edit-surface-wrap">
      <div className="editor-stage-scroll" onPointerDown={(e) => {
        const t = e.target as HTMLElement;
        if (!t.closest("[data-el-id]") && !t.closest(".moveable-control-box")) onSelect([], false);
      }}>
        <CanvasStage elements={elements} grain={grain} vignette={vignette} interactive selectedIds={selectedIds}
          stageRef={stageRef} handlers={{ onElementPointerDown: handleElementPointerDown }}>
          <RefBridge stageRef={stageRef} elRefs={elRefs} />
          {editingText && <TextInlineEditor id={editingText} elements={elements} onLive={onLive} onGestureStart={onGestureStart} onGestureEnd={onGestureEnd} onDone={() => setEditingText(null)} />}
          {transformableNodes.length > 0 && (
            <Moveable
              ref={moveableRef}
              target={isGroup ? transformableNodes : transformableNodes[0]}
              container={stageRef.current ?? undefined}
              draggable resizable={!isGroup} rotatable={!isGroup}
              snappable={false} origin={false} keepRatio={false} edge={false}
              renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
              throttleDrag={0} throttleResize={0} throttleRotate={0}
              onDragGroupStart={(e: any) => { onGestureStart(); e.targets.forEach((t: HTMLElement, i: number) => { const el = elements.find(x => x.id === t.dataset.elId); e.datas[i] = { sx: el!.x, sy: el!.y }; }); }}
              onDragGroup={(e: any) => { const [dx, dy] = e.beforeTranslate; e.targets.forEach((t: HTMLElement, i: number) => { const s = e.datas[i]; t.style.left = (s.sx + dx) + "px"; t.style.top = (s.sy + dy) + "px"; }); }}
              onDragGroupEnd={(e: any) => { e.targets.forEach((t: HTMLElement) => commitFromDom(t)); onGestureEnd(); }}
              onDragStart={isGroup ? undefined : () => onGestureStart()}
              onDrag={isGroup ? undefined : ((e: any) => { e.target.style.left = e.left + "px"; e.target.style.top = e.top + "px"; })}
              onDragEnd={isGroup ? undefined : ((e: any) => { commitFromDom(e.target); onGestureEnd(); })}
              onResizeStart={isGroup ? undefined : () => onGestureStart()}
              onResize={isGroup ? undefined : ((e: any) => { const t = e.target; t.style.width = e.width + "px"; t.style.height = e.height + "px"; t.style.left = e.drag.left + "px"; t.style.top = e.drag.top + "px"; })}
              onResizeEnd={isGroup ? undefined : ((e: any) => { commitFromDom(e.target); onGestureEnd(); })}
              onRotateStart={isGroup ? undefined : () => onGestureStart()}
              onRotate={isGroup ? undefined : ((e: any) => { const rot = e.rotation ?? e.beforeRotate ?? 0; e.target.style.transform = `rotate(${rot}deg)`; })}
              onRotateEnd={isGroup ? undefined : ((e: any) => { commitFromDom(e.target); onGestureEnd(); })}
            />
          )}
        </CanvasStage>
      </div>
    </div>
  );
};

const RefBridge: React.FC<{ stageRef: React.RefObject<HTMLDivElement>; elRefs: React.MutableRefObject<Record<string, HTMLElement>> }> = ({ stageRef, elRefs }) => {
  React.useEffect(() => {
    const nodes = stageRef.current?.querySelectorAll<HTMLElement>(".canvas-el[data-el-id]") ?? [];
    nodes.forEach(n => { elRefs.current[n.dataset.elId!] = n; });
  });
  return null;
};

const TextInlineEditor: React.FC<{ id: string; elements: CanvasElement[]; onLive: (u: (e: CanvasElement[]) => CanvasElement[]) => void; onGestureStart: () => void; onGestureEnd: () => void; onDone: () => void }> = ({ id, elements, onLive, onGestureStart, onGestureEnd, onDone }) => {
  const el = elements.find(e => e.id === id);
  React.useEffect(() => { onGestureStart(); }, []);
  if (!el) return null;
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, width: el.w, zIndex: 200 }}>
      <textarea autoFocus value={el.text ?? ""} onChange={e => onLive(els => els.map(x => x.id === id ? { ...x, text: e.target.value } : x))}
        onBlur={() => { onGestureEnd(); onDone(); }} onKeyDown={e => { if (e.key === "Escape") { onGestureEnd(); onDone(); } }}
        style={{ width: "100%", minHeight: 50, background: "rgba(13,21,32,.92)", color: "#fff", border: "1px solid #2563eb", borderRadius: 6, padding: 8, fontSize: 14, fontFamily: "Inter" }} />
    </div>
  );
};
