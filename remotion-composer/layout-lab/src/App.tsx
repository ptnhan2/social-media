import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { LayoutPreview, VariantConfig } from "./preview/LayoutPreview";
import { LAYOUTS, Overrides, OverridesProvider } from "./lib/layouts";
import { getRegistry, vote, selectVariant, LayoutItem, Registry } from "./lib/registry";
import type { ElementGeom } from "./lib/overrides";
import "./styles.css";

const POOL_LABELS: Record<string, string> = { motion: "Motion", texture: "Texture", palette: "Palette", image_renderer: "Renderer", sfx: "SFX" };
const STATUS_COLOR: Record<string, string> = { approved: "#2dd4a0", draft: "#f5b544", demoted: "#ef5552" };

const DEFAULT_SCENE = {
  start: 0, end: 6, kind: "x", dark: false,
  img: ["scene-4.png"],
  items: [
    { at: 0.4, text: "MAGIC RUNS ON METALS", size: 64, color: "#4FC3F7" },
    { at: 1.6, text: "each one costs something", size: 46, color: "#B0BEC5" },
    { at: 3.2, text: "that's the point", size: 52, color: "#FF5252" },
  ],
};

// Default image aspect per layout (for handle sizing)



function variantToConfig(item: LayoutItem): Partial<VariantConfig> {
  const pools = item.variant_pools || {};
  const pick = (pool: string) => pools[pool]?.options.find(o => o.id === pools[pool]?.selected);
  // Params may live in `params` (palette) or `sub_variants[0].params` (motion/texture/renderer)
  const p = (opt: any) => opt?.params ?? opt?.sub_variants?.[0]?.params ?? {};
  const cfg: Partial<VariantConfig> = {};
  const motionOpt = pick("motion");
  const mp = p(motionOpt);
  if (mp.from !== undefined || mp.to !== undefined) cfg.motion = { from: Number(mp.from ?? 1), to: Number(mp.to ?? 1.12) };
  const textureOpt = pick("texture");
  const tp = p(textureOpt);
  if (Object.keys(tp).length) cfg.texture = { grain: Number(tp.opacity ?? tp.alpha ?? 0.15), vignette: textureOpt?.id.includes("vignette") ? 0.17 : 0 };
  const palOpt = pick("palette");
  const pp = p(palOpt);
  if (pp.a0) cfg.palette = { dark: Boolean(pp.dark), a0: pp.a0 as string, a1: pp.a1 as string, a2: pp.a2 as string };
  return cfg;
}

function Card({ item, onOpen, onRegChange }: { item: LayoutItem; onOpen: (it: LayoutItem) => void; onRegChange: (r: Registry) => void }) {
  const cfg = useMemo(() => ({ layoutId: item.id, scene: DEFAULT_SCENE as any, overrides: {} as Overrides, ...variantToConfig(item) }), [item]);
  const hasCode = Boolean(LAYOUTS[item.id]);

  const applyVote = async (dir: "up" | "down") => onRegChange(await vote(item.id, dir));
  const applySelect = async (pool: string, vid: string) => onRegChange(await selectVariant(item.id, pool, vid));

  return (
    <div className={`card ${item.status}`} onClick={() => onOpen(item)}>
      <div className="card-head">
        <strong>{item.name}</strong>
        <span className="badge" style={{ background: STATUS_COLOR[item.status] || "#666" }}>{item.status}</span>
      </div>
      <div className="card-meta">{item.element_count} elem · {item.composition_type} · {item.narrative_role}</div>

      {hasCode ? (
        <Player component={LayoutPreview} inputProps={{ config: cfg }} durationInFrames={180} fps={30}
          compositionWidth={640} compositionHeight={360} style={{ width: "100%", borderRadius: 8 }} controls loop
          acknowledgeRemotionLicense />
      ) : item.preview ? (
        <img src={`/previews/${item.preview.replace(/^previews\//, "")}`} alt={item.name} style={{ width: "100%", borderRadius: 8 }} />
      ) : (
        <div className="no-preview">No preview — layout code not written yet</div>
      )}

      <div className="card-stats">
        <span className="up">↑ {item.use_count}</span>
        <span className="down">↓ {item.reject_count}</span>
        {item.used_in?.length > 0 && <span className="used-in">in {item.used_in.join(", ")}</span>}
      </div>

      {hasCode && (
        <div className="variant-grid" onClick={e => e.stopPropagation()}>
          {Object.entries(item.variant_pools || {}).map(([poolKey, pool]) => (
            <label key={poolKey} className="variant-field">
              <span>{POOL_LABELS[poolKey] || poolKey}</span>
              <select value={pool.selected} onChange={e => applySelect(poolKey, e.target.value)}>
                {pool.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}

      <div className="card-actions" onClick={e => e.stopPropagation()}>
        <button className="btn-approve" onClick={() => applyVote("up")}>✅ Approve</button>
        <button className="btn-reject" onClick={() => applyVote("down")}>❌ Reject</button>
        <button className="btn-edit" onClick={() => onOpen(item)}>✏️ Edit</button>
      </div>
    </div>
  );
}

// ---- Drag-drop editor: Player canvas + overlay handles from registered geometry ----
function EditorModal({ item, onClose, onRegChange }: { item: LayoutItem; onClose: () => void; onRegChange: (r: Registry) => void }) {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [elements, setElements] = useState<Record<string, ElementGeom>>({});
  const [selected, setSelected] = useState<string>("img");
  const [frame, setFrame] = useState(45);
  const [variantCfg, setVariantCfg] = useState<Partial<VariantConfig>>(variantToConfig(item));
  const playerRef = useRef<PlayerRef>(null);
  useEffect(() => { playerRef.current?.seekTo(frame); }, [frame]);

  // Layouts write geometry into a ref (no setState during child render);
  // a rAF loop diffs it into state so handles update.
  const elementsRef = useRef<Record<string, ElementGeom>>({});
  const register = useCallback((el: ElementGeom) => { elementsRef.current[el.key] = el; }, []);
  useEffect(() => {
    let raf: number;
    const tick = () => {
      setElements(prev => {
        const cur = elementsRef.current;
        let changed = Object.keys(cur).length !== Object.keys(prev).length;
        if (!changed) {
          for (const k of Object.keys(cur)) {
            const c = prev[k]; const n = cur[k];
            if (!c || Math.abs(c.x - n.x) > 0.05 || Math.abs(c.y - n.y) > 0.05
              || Math.abs(c.w - n.w) > 0.05 || Math.abs(c.h - n.h) > 0.05) { changed = true; break; }
          }
        }
        return changed ? { ...cur } : prev;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cfg = useMemo(() => ({ layoutId: item.id, scene: DEFAULT_SCENE as any, overrides, ...variantCfg }), [item, overrides, variantCfg]);
  const applySelect = async (pool: string, vid: string) => {
    const r = await selectVariant(item.id, pool, vid);
    onRegChange(r);
    const fresh = r.items.find(i => i.id === item.id)!;
    setVariantCfg(variantToConfig(fresh));
  };

  const hasCode = Boolean(LAYOUTS[item.id]);
  const handles = Object.entries(elements).map(([key, g]) => ({ key, ...g }));
  const imgGeom = elements["img"];

  const startDrag = (e: React.PointerEvent, key: string, initialX: number, initialY: number) => {
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget.closest(".editor-canvas") as HTMLElement).getBoundingClientRect();
    const startPctX = ((e.clientX - rect.left) / rect.width) * 100;
    const startPctY = ((e.clientY - rect.top) / rect.height) * 100;
    const move = (ev: PointerEvent) => {
      const pctX = ((ev.clientX - rect.left) / rect.width) * 100;
      const pctY = ((ev.clientY - rect.top) / rect.height) * 100;
      const nx = Math.min(100, Math.max(0, initialX + (pctX - startPctX)));
      const ny = Math.min(95, Math.max(5, initialY + (pctY - startPctY)));
      if (key === "img") setOverrides(o => ({ ...o, img: { ...(o.img || {}), x: Math.round(nx), y: Math.round(ny) } }));
      else setOverrides(o => { const items = [...(o.items || [])]; items[Number(key.split("-")[1])] = { ...(items[Number(key.split("-")[1])] || {}), y: Math.round(ny) }; return { ...o, items }; });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const resizeDrag = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget.closest(".editor-canvas") as HTMLElement).getBoundingClientRect();
    const startW = imgGeom?.w ?? 40;
    const startPctX = ((e.clientX - rect.left) / rect.width) * 100;
    const move = (ev: PointerEvent) => {
      const pctX = ((ev.clientX - rect.left) / rect.width) * 100;
      const nw = Math.min(90, Math.max(8, startW + (pctX - startPctX)));
      setOverrides(o => ({ ...o, img: { ...(o.img || {}), width: Math.round(nw) } }));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{item.name} <span className="tag-legacy">{item.provenance?.source?.includes("ported") ? "legacy-ported" : "researched"}</span></h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="preview-pane">
            {hasCode ? (
              <>
                <div className="editor-canvas" style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: 10 }}>
                  <OverridesProvider value={{ overrides, register }}>
                    <Player
                      ref={playerRef}
                      component={LayoutPreview}
                      inputProps={{ config: cfg }}
                      durationInFrames={240}
                      fps={30}
                      compositionWidth={960}
                      compositionHeight={540}
                      style={{ width: "100%", height: "100%" }}
                      controls={false}
                      acknowledgeRemotionLicense
                    />
                  </OverridesProvider>
                  {/* Handles from REGISTERED geometry — exact element boxes */}
                  {handles.map(h => (
                    <div key={h.key}
                      className={`handle ${h.key === "img" ? "" : "item-handle"} ${selected === h.key ? "selected" : ""}`}
                      style={{ left: `${h.x - h.w / 2}%`, top: `${h.y - h.h / 2}%`, width: `${h.w}%`, height: `${h.h}%` }}
                      onPointerDown={e => startDrag(e, h.key, h.x, h.y)}
                      onClick={e => { e.stopPropagation(); setSelected(h.key); }}
                    >
                      <span className="handle-label">{h.key === "img" ? "img" : h.key.replace("item-", "item ")}</span>
                      {h.key === "img" && <span className="resize-dot" onPointerDown={resizeDrag} title="Resize" />}
                    </div>
                  ))}
                </div>
                <div className="frame-ctrl">
                  <span>Frame</span>
                  <input type="range" min={0} max={240} value={frame} onChange={e => setFrame(Number(e.target.value))} />
                  <b>{frame}</b>
                </div>
              </>
            ) : item.preview ? (
              <img src={`/previews/${item.preview.replace(/^previews\//, "")}`} alt={item.name} style={{ width: "100%" }} />
            ) : <div className="no-preview">Layout code not written yet</div>}
          </div>

          <div className="inspector">
            {hasCode && selected === "img" ? (
              <>
                <h3>Image</h3>
                <label className="slider-field"><span>x</span><input type="range" min={5} max={95} value={overrides.img?.x ?? 50} onChange={e => setOverrides(o => ({ ...o, img: { ...(o.img || {}), x: Number(e.target.value) } }))} /><b>{overrides.img?.x ?? 50}</b></label>
                <label className="slider-field"><span>y</span><input type="range" min={5} max={95} value={overrides.img?.y ?? 47} onChange={e => setOverrides(o => ({ ...o, img: { ...(o.img || {}), y: Number(e.target.value) } }))} /><b>{overrides.img?.y ?? 47}</b></label>
                <label className="slider-field"><span>width</span><input type="range" min={8} max={90} value={overrides.img?.width ?? imgGeom?.w ?? 40} onChange={e => setOverrides(o => ({ ...o, img: { ...(o.img || {}), width: Number(e.target.value) } }))} /><b>{overrides.img?.width ?? imgGeom?.w ?? 40}</b></label>
                <label className="slider-field"><span>rotate</span><input type="range" min={-15} max={15} value={overrides.img?.rotate ?? 0} onChange={e => setOverrides(o => ({ ...o, img: { ...(o.img || {}), rotate: Number(e.target.value) } }))} /><b>{overrides.img?.rotate ?? 0}°</b></label>
                <label className="color-field"><span>bg dark</span><input type="checkbox" checked={cfg.palette?.dark ?? false} onChange={e => setVariantCfg(v => ({ ...v, palette: { ...(v.palette || {}), dark: e.target.checked } }))} /></label>
              </>
            ) : hasCode && selected.startsWith("item-") ? (
              <>
                <h3>Item {Number(selected.split("-")[1]) + 1}</h3>
                <label className="color-field"><span>color</span><input type="color" value={overrides.items?.[Number(selected.split("-")[1])]?.color ?? DEFAULT_SCENE.items[Number(selected.split("-")[1])].color} onChange={e => setOverrides(o => { const items = [...(o.items || [])]; const i = Number(selected.split("-")[1]); items[i] = { ...(items[i] || {}), color: e.target.value }; return { ...o, items }; })} /></label>
                <label className="slider-field"><span>size</span><input type="range" min={20} max={200} value={overrides.items?.[Number(selected.split("-")[1])]?.size ?? DEFAULT_SCENE.items[Number(selected.split("-")[1])].size} onChange={e => setOverrides(o => { const items = [...(o.items || [])]; const i = Number(selected.split("-")[1]); items[i] = { ...(items[i] || {}), size: Number(e.target.value) }; return { ...o, items }; })} /><b>{overrides.items?.[Number(selected.split("-")[1])]?.size ?? DEFAULT_SCENE.items[Number(selected.split("-")[1])].size}</b></label>
              </>
            ) : null}

            <h3>Variants</h3>
            <div className="variant-grid">
              {Object.entries(item.variant_pools || {}).map(([poolKey, pool]) => (
                <label key={poolKey} className="variant-field">
                  <span>{POOL_LABELS[poolKey] || poolKey}</span>
                  <select value={pool.selected} onChange={e => applySelect(poolKey, e.target.value)}>
                    {pool.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="inspector-note">
              Kéo trực tiếp trên canvas: ảnh (drag toàn box) + chấm resize góc dưới phải. Item: kéo dọc, click để chọn màu/size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [reg, setReg] = useState<Registry | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<LayoutItem | null>(null);

  useEffect(() => { getRegistry().then(setReg); }, []);
  if (!reg) return <div className="loading">Loading LayoutLab…</div>;

  const onRegChange = (r: Registry) => {
    setReg(r);
    if (editing) setEditing(r.items.find(i => i.id === editing.id) ?? null);
  };

  const items = [...reg.items]
    .filter(i => filter === "all" || i.status === filter)
    .sort((a, b) => (a.use_count || 0) - (b.use_count || 0));

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>LayoutLab <span className="ver">v3</span></h1>
          <p className="sub">{reg.stats.total} layouts · {reg.stats.approved} approved · {reg.stats.draft} draft · {reg.stats.demoted} demoted · least-used first</p>
        </div>
        <div className="filters">
          {["all", "approved", "draft", "demoted"].map(s => (
            <button key={s} className={`filter ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
      </header>
      <main className="grid">
        {items.map(item => <Card key={item.id} item={item} onOpen={setEditing} onRegChange={onRegChange} />)}
      </main>
      {editing && <EditorModal item={editing} onClose={() => setEditing(null)} onRegChange={onRegChange} />}
    </div>
  );
}
