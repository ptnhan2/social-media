import React from "react";
import type { EditorAsset, EditorClip, EditorDoc } from "../../../shared/isaacverse/editor";
import { ANIM_PRESETS, EFFECT_PRESETS, FILTER_PRESETS, TRANSITION_PRESETS } from "../../../shared/isaacverse/clipStyle";

export type LeftTab = "media" | "audio" | "text" | "effects" | "transitions" | "filters" | "brand";

const BRAND_COLORS = ["#ffffff", "#ffe066", "#61d7e8", "#ec6a5e", "#8f7bff", "#2dd4a0", "#0a0c12"];
const BRAND_FONTS = ["Inter, sans-serif", "Georgia, serif", "\"Courier New\", monospace", "Arial, sans-serif", "Impact, sans-serif"];

export type LeftRailProps = {
  tab: LeftTab;
  onTabChange: (tab: LeftTab) => void;
  editor: EditorDoc;
  derivedAssets: EditorAsset[];
  selectedClip: EditorClip | undefined;
  onUpload: (file: File) => void;
  onAddText: (preset: "heading" | "body" | "caption" | "lower-third") => void;
  onAddAssetAtPlayhead: (assetId: string) => void;
  onApplyFilter: (filterId: string) => void;
  onApplyEffect: (effectId: string) => void;
  onAddTransition: (type: string) => void;
  onApplyBrandColor: (color: string) => void;
  onApplyBrandFont: (font: string) => void;
};

const assetDraggable = (event: React.DragEvent, asset: EditorAsset) => {
  event.dataTransfer.setData("application/x-isaacverse-asset", JSON.stringify({ src: asset.src, kind: asset.kind, name: asset.name, assetId: asset.id }));
  event.dataTransfer.effectAllowed = "copy";
};

const effectDraggable = (event: React.DragEvent, effectId: string) => {
  event.dataTransfer.setData("application/x-isaacverse-effect", effectId);
  event.dataTransfer.effectAllowed = "copy";
};

const transitionDraggable = (event: React.DragEvent, transitionId: string) => {
  event.dataTransfer.setData("application/x-isaacverse-transition", transitionId);
  event.dataTransfer.effectAllowed = "copy";
};

const AudioPreviewButton: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const toggle = () => {
    if (!audioRef.current) audioRef.current = new Audio(src);
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { void audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };
  React.useEffect(() => () => { audioRef.current?.pause(); }, []);
  return <button type="button" className={`ve-media-play-btn ${playing ? "playing" : ""}`} onClick={(e) => { e.stopPropagation(); toggle(); }} aria-label={playing ? "Stop preview" : "Play preview"}>{playing ? "⏸" : "▶"}</button>;
};

export const LeftRail: React.FC<LeftRailProps> = ({
  tab, onTabChange, editor, derivedAssets, selectedClip, onUpload, onAddText, onAddAssetAtPlayhead, onApplyFilter, onApplyEffect, onAddTransition, onApplyBrandColor, onApplyBrandFont,
}) => {
  const [mediaView, setMediaView] = React.useState<"grid" | "list">("grid");
  const [mediaFilter, setMediaFilter] = React.useState<"all" | "video" | "image" | "audio">("all");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const tabs: { id: LeftTab; label: string }[] = [
    { id: "media", label: "Media" },
    { id: "audio", label: "Audio" },
    { id: "text", label: "Text" },
    { id: "effects", label: "Effects" },
    { id: "transitions", label: "Transitions" },
    { id: "filters", label: "Filters" },
    { id: "brand", label: "Brand kit" },
  ];
  const filteredAssets = derivedAssets.filter((asset) => mediaFilter === "all" || asset.kind === mediaFilter);
  const audioAssets = derivedAssets.filter((asset) => asset.kind === "audio");

  return (
    <div className="ve-left-rail">
      <div className="ve-tab-strip" role="tablist" aria-label="Content library">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => onTabChange(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className="ve-tab-content">
        {tab === "media" ? (
          <>
            <div className="ve-tab-head-row">
              <button className="ve-btn" type="button" onClick={() => fileInputRef.current?.click()}>Upload file</button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} />
              <div className="ve-view-toggle">
                <button type="button" className={mediaView === "grid" ? "active" : ""} aria-label="Grid view" onClick={() => setMediaView("grid")}>▦</button>
                <button type="button" className={mediaView === "list" ? "active" : ""} aria-label="List view" onClick={() => setMediaView("list")}>≡</button>
              </div>
            </div>
            <div className="ve-media-filter" role="tablist" aria-label="Filter media by type">
              {(["all", "video", "image", "audio"] as const).map((kind) => (
                <button key={kind} type="button" className={mediaFilter === kind ? "active" : ""} onClick={() => setMediaFilter(kind)}>{kind}</button>
              ))}
            </div>
            <div className={`ve-media-grid ${mediaView}`}>
              {filteredAssets.length ? filteredAssets.map((asset) => (
                <div
                  key={asset.src}
                  className="ve-media-item"
                  draggable
                  title={`${asset.name} — drag onto the timeline or canvas`}
                  onDragStart={(event) => assetDraggable(event, asset)}
                  onClick={() => onAddAssetAtPlayhead(asset.id)}
                >
                  {asset.kind === "image" || asset.kind === "video" ? <span className="ve-media-thumb"><img src={asset.src} alt="" /></span> : <span className="ve-media-thumb ve-media-audio">{asset.kind === "audio" ? <AudioPreviewButton src={asset.src} /> : "♪"}</span>}
                  <span className="ve-media-name">{asset.name}</span>
                  <span className="ve-media-kind">{asset.kind}</span>
                </div>
              )) : <p className="ve-hint">No media yet. Upload a file or add content to the timeline.</p>}
            </div>
            <p className="ve-hint">Drag media onto the timeline to add a clip, or onto the canvas to place an overlay.</p>
          </>
        ) : null}

        {tab === "audio" ? (
          <>
            <div className="ve-panel-title">Audio library</div>
            {audioAssets.length ? audioAssets.map((asset) => (
              <div key={asset.src} className="ve-media-item ve-media-row" draggable onDragStart={(event) => assetDraggable(event, asset)} onClick={() => onAddAssetAtPlayhead(asset.id)}>
                <span className="ve-media-kind">{asset.kind}</span>
                <span className="ve-media-name">{asset.name}</span>
              </div>
            )) : <p className="ve-hint">No audio assets. Upload music or SFX from the Media tab.</p>}
          </>
        ) : null}

        {tab === "text" ? (
          <>
            <div className="ve-panel-title">Add text</div>
            <button className="ve-btn" type="button" onClick={() => onAddText("heading")}>+ Add heading</button>
            <button className="ve-btn" type="button" onClick={() => onAddText("body")}>+ Add body text</button>
            <button className="ve-btn" type="button" onClick={() => onAddText("caption")}>+ Add caption</button>
            <button className="ve-btn" type="button" onClick={() => onAddText("lower-third")}>+ Add lower third</button>
            <p className="ve-hint">Shortcut: press T to add a heading at the playhead.</p>
          </>
        ) : null}

        {tab === "effects" ? (
          <>
            <div className="ve-panel-title">Effects</div>
            <p className="ve-hint">Select an overlay clip, then click an effect to apply it.</p>
            <div className="ve-card-grid">
              {EFFECT_PRESETS.map((preset) => (
                <button key={preset.id} type="button" className={`ve-card ve-effect-card ${selectedClip && selectedClip.metadata.filter === preset.id ? "active" : ""}`} draggable onDragStart={(event) => effectDraggable(event, preset.id)} onClick={() => onApplyEffect(preset.id)}>{preset.label}</button>
              ))}
            </div>
          </>
        ) : null}

        {tab === "transitions" ? (
          <>
            <div className="ve-panel-title">Transitions</div>
            <p className="ve-hint">Click to add a transition at the playhead cut.</p>
            <div className="ve-card-grid">
              {TRANSITION_PRESETS.map((preset) => (
                <button key={preset.id} type="button" className="ve-card ve-effect-card" draggable onDragStart={(event) => transitionDraggable(event, preset.id)} onClick={() => onAddTransition(preset.id)}>{preset.label}</button>
              ))}
            </div>
          </>
        ) : null}

        {tab === "filters" ? (
          <>
            <div className="ve-panel-title">Filters</div>
            <p className="ve-hint">Select an overlay clip, then click a color grade to apply it.</p>
            <div className="ve-card-grid">
              {FILTER_PRESETS.map((preset) => (
                <button key={preset.id} type="button" className={`ve-card ve-effect-card ${selectedClip && selectedClip.metadata.filter === preset.id ? "active" : ""}`} draggable onDragStart={(event) => effectDraggable(event, preset.id)} onClick={() => onApplyFilter(preset.id)}>{preset.label}</button>
              ))}
            </div>
          </>
        ) : null}

        {tab === "brand" ? (
          <>
            <div className="ve-panel-title">Brand colors</div>
            <p className="ve-hint">Select a text clip, then click a color.</p>
            <div className="ve-color-row">
              {BRAND_COLORS.map((color) => (
                <button key={color} type="button" className="ve-swatch" style={{ background: color }} aria-label={`Apply brand color ${color}`} onClick={() => onApplyBrandColor(color)} />
              ))}
            </div>
            <div className="ve-panel-title">Brand fonts</div>
            <div className="ve-card-grid">
              {BRAND_FONTS.map((font) => (
                <button key={font} type="button" className="ve-card" style={{ fontFamily: font }} onClick={() => onApplyBrandFont(font)}>{font.split(",")[0]}</button>
              ))}
            </div>
            <div className="ve-panel-title">Animation presets</div>
            <div className="ve-card-grid">
              {ANIM_PRESETS.slice(0, 6).map((preset) => (
                <span key={preset.id} className="ve-card-static">{preset.label}</span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
