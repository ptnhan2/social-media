import React from "react";
import { useStore } from "./store";
import { BLEND_MODES, DEFAULT_FILTERS, layerDisplaySize, Layer } from "./types";

/**
 * Properties panel (Figma pattern): numeric X/Y/W/H with linked ratio,
 * rotation, opacity, blend mode, flip, and live filters for color matching.
 */
export const PropertiesPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const layer = state.doc.layers.find((l) => l.id === state.ui.selectedIds[0]) || null;

  if (!layer) {
    return (
      <section className="as4-panel">
        <header className="as4-panel-header">
          <h4>Properties</h4>
        </header>
        <p className="as4-hint">Chọn layer để chỉnh transform / màu / blend</p>
      </section>
    );
  }

  const upd = (updates: Partial<Layer>, label?: string) =>
    dispatch({ type: "UPDATE_LAYER", id: layer.id, updates, label });

  const { w, h } = layerDisplaySize(layer);
  const [linked, setLinked] = React.useState(true);

  const num = (props: {
    label: string;
    value: number;
    step?: number;
    onCommit: (v: number) => void;
    suffix?: string;
  }) => (
    <label className="as4-num-field">
      <span>{props.label}</span>
      <input
        type="number"
        value={Math.round(props.value * 100) / 100}
        step={props.step ?? 1}
        onFocus={() => dispatch({ type: "HISTORY_MARK", label: `Edit ${props.label} ${layer.name}` })}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) props.onCommit(v);
        }}
        onBlur={() => dispatch({ type: "HISTORY_COMMIT" })}
      />
      {props.suffix ? <em>{props.suffix}</em> : null}
    </label>
  );

  const filterSlider = (key: keyof typeof DEFAULT_FILTERS, label: string, min: number, max: number, step = 1) => (
    <label className="as4-slider-field">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={layer.filters[key]}
        onPointerDown={() => dispatch({ type: "HISTORY_MARK", label: `Adjust ${label} ${layer.name}` })}
        onFocus={() => dispatch({ type: "HISTORY_MARK", label: `Adjust ${label} ${layer.name}` })}
        onChange={(e) => upd({ filters: { ...layer.filters, [key]: Number(e.target.value) } })}
        onPointerUp={() => dispatch({ type: "HISTORY_COMMIT" })}
        onBlur={() => dispatch({ type: "HISTORY_COMMIT" })}
      />
      <b>{layer.filters[key]}</b>
    </label>
  );

  return (
    <section className="as4-panel">
      <header className="as4-panel-header">
        <h4>{layer.name}</h4>
        <span className="as4-panel-actions">
          <button type="button" className="as4-icon-btn" title="Flip ngang"
            onClick={() => upd({ flipX: !layer.flipX }, `Flip ${layer.name}`)}>
            ⇄
          </button>
          <button type="button" className="as4-icon-btn" title="Flip dọc"
            onClick={() => upd({ flipY: !layer.flipY }, `Flip ${layer.name}`)}>
            ⇅
          </button>
        </span>
      </header>

      <div className="as4-prop-grid">
        {num({ label: "X", value: layer.x, onCommit: (v) => upd({ x: v }) })}
        {num({ label: "Y", value: layer.y, onCommit: (v) => upd({ y: v }) })}
        {num({
          label: "W",
          value: w,
          onCommit: (v) => {
            const sx = v / layer.width;
            upd({ scaleX: sx, scaleY: linked ? sx : layer.scaleY });
          },
        })}
        {num({
          label: "H",
          value: h,
          onCommit: (v) => {
            const sy = v / layer.height;
            upd({ scaleY: sy, scaleX: linked ? sy : layer.scaleX });
          },
        })}
        <button type="button" className={`as4-link-btn ${linked ? "on" : ""}`} title="Giữ tỉ lệ W:H"
          onClick={() => setLinked(!linked)}>
          🔗
        </button>
        {num({ label: "∠", value: layer.rotation, onCommit: (v) => upd({ rotation: v }), suffix: "°" })}
      </div>

      <label className="as4-slider-field">
        <span>Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.opacity}
          onPointerDown={() => dispatch({ type: "HISTORY_MARK", label: `Opacity ${layer.name}` })}
          onChange={(e) => upd({ opacity: Number(e.target.value) })}
          onPointerUp={() => dispatch({ type: "HISTORY_COMMIT" })}
        />
        <b>{Math.round(layer.opacity * 100)}%</b>
      </label>

      <label className="as4-num-field">
        <span>Blend</span>
        <select value={layer.blendMode} onChange={(e) => upd({ blendMode: e.target.value }, `Blend ${layer.name}`)}>
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>
              {m === "source-over" ? "normal" : m}
            </option>
          ))}
        </select>
      </label>

      <div className="as4-filter-section">
        <div className="as4-filter-header">
          <span>Color match</span>
          <button
            type="button"
            className="as4-icon-btn"
            title="Reset filters"
            onClick={() => upd({ filters: { ...DEFAULT_FILTERS } }, `Reset filters ${layer.name}`)}
          >
            ↺
          </button>
        </div>
        {filterSlider("brightness", "Brightness", -100, 100)}
        {filterSlider("contrast", "Contrast", -100, 100)}
        {filterSlider("saturate", "Saturation", -100, 100)}
        {filterSlider("hue", "Hue", -180, 180)}
        {filterSlider("blur", "Blur", 0, 20, 0.5)}
      </div>
    </section>
  );
};
