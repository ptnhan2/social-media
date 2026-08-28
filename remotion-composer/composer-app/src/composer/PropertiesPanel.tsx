import React from "react";
import type { EditorClip } from "../../../shared/isaacverse/editor";
import { ANIM_PRESETS, EFFECT_PRESETS, FILTER_PRESETS, SPEED_PRESETS, TRANSITION_PRESETS } from "../../../shared/isaacverse/clipStyle";
import { validateProviderTextEdit } from "../../../shared/isaacverse/voiceClip";

export type PropTab = "transform" | "text" | "audio" | "animation" | "speed" | "color" | "transition" | "character" | "info";

export type CharacterPresenceOptions = {
  pose: string;
  position: string;
  size: string;
  motion: string;
};

export type KeyframeTarget = { clipId: string; property: string; t: number };

export type PropertiesPanelProps = {
  clip: EditorClip;
  tab: PropTab;
  onTabChange: (tab: PropTab) => void;
  autoFocusText?: boolean;
  onAutoFocusTextDone?: () => void;
  armedProps: string[];
  onToggleArm: (property: string, currentValue: number) => void;
  selectedKeyframe: KeyframeTarget | null;
  onSetEasing: (property: string, t: number, easing: "linear" | "ease-in" | "ease-out" | "ease-in-out") => void;
  onCommit: (changes: Record<string, unknown>) => void;
  onCommitRange: (range: { startSec?: number; endSec?: number }) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  canDelete: boolean;
  onZOrder: (action: "forward" | "backward" | "front" | "back") => void;
  onFlip: (axis: "h" | "v") => void;
  onSetSpeed: (speed: number) => void;
  /** Pose wiring: available pose names (dynamic from the pose library). */
  poseList?: string[];
  onAddPresence?: (options: CharacterPresenceOptions) => void;
  /** Voice pipeline (SPEC v3): project slug for the audio-regen endpoint. */
  projectId?: string;
};

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** Voice clip parity surface (PIPELINE-PRODUCTION-SPEC v3, M1a): sentence +
 *  provider text (the EXACT string sent to the TTS — Asset-Studio-prompt
 *  pattern), voice settings, QC readout, and per-clip surgical regen. */
const VoiceSection: React.FC<{
  clip: EditorClip;
  projectId?: string;
  onCommit: (changes: Record<string, unknown>) => void;
}> = ({ clip, projectId, onCommit }) => {
  const md = clip.metadata as Record<string, unknown>;
  const sentenceText = typeof md.sentenceText === "string" ? md.sentenceText : typeof md.transcript === "string" ? md.transcript : "";
  const providerText = typeof md.providerText === "string" ? md.providerText : sentenceText;
  const voiceSettings = (md.voiceSettings as Record<string, unknown>) ?? {};
  const qc = md.qc as { pass?: boolean; checks?: { id: string; label: string; pass: boolean; value: string; threshold: string }[]; durationSec?: number; expectedSec?: number; wer?: number | null } | undefined;
  const [regenState, setRegenState] = React.useState<"idle" | "running" | "done" | "error">("idle");
  const [regenMessage, setRegenMessage] = React.useState("");
  const [draftSentence, setDraftSentence] = React.useState(sentenceText);
  const [draftProvider, setDraftProvider] = React.useState(providerText);
  React.useEffect(() => { setDraftSentence(sentenceText); setDraftProvider(providerText); }, [sentenceText, providerText]);
  const wordCheck = validateProviderTextEdit(sentenceText, draftProvider);

  const regen = async () => {
    if (!projectId) { setRegenState("error"); setRegenMessage("projectId unavailable"); return; }
    setRegenState("running"); setRegenMessage("");
    try {
      // Send the CURRENT field value explicitly — the server-side clip
      // metadata may be stale (the onBlur commit is async and races this
      // POST). The user must hear exactly the text on screen.
      const start = await fetch("/api/project/audio-regen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, clipId: clip.id, takes: 2, providerText: draftProvider.trim() || undefined }),
      }).then((r) => r.json());
      if (!start.jobId) throw new Error(start.error || "regen failed to start");
      for (let i = 0; i < 90; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await fetch(`/api/project/audio-regen/status?jobId=${encodeURIComponent(start.jobId)}`).then((r) => r.json());
        if (status.status === "done") {
          setRegenState("done");
          setRegenMessage(`Regenerated — QC ${status.result?.qc?.pass === true ? "PASS" : "FAIL"}, ${status.result?.stemDurationSec ?? "?"}s`);
          return;
        }
        if (status.status === "error") throw new Error(status.message || "regen error");
      }
      throw new Error("regen timed out");
    } catch (error) {
      setRegenState("error");
      setRegenMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="ve-prop-voice">
      <label className="ve-prop-field ve-prop-field-wide">
        <span>Sentence text</span>
        <textarea rows={2} value={draftSentence} onChange={(e) => setDraftSentence(e.target.value)}
          onBlur={() => { if (draftSentence !== sentenceText) onCommit({ sentenceText: draftSentence }); }} />
      </label>
      <label className="ve-prop-field ve-prop-field-wide">
        <span>Provider text (chuỗi gửi TTS)</span>
        <textarea rows={3} value={draftProvider} onChange={(e) => setDraftProvider(e.target.value)}
          onBlur={() => { if (draftProvider !== providerText) onCommit({ providerText: draftProvider }); }} />
      </label>
      {!wordCheck.ok ? (
        <p className="ve-hint">⚠ Từ đã đổi ({wordCheck.changedWords.slice(0, 6).join(", ")}) — tags/CAPS thoải mái, nhưng đổi từ sẽ lệch script.</p>
      ) : (
        <p className="ve-hint">v3: nhấn từ = VIẾT HOA · pause = "…" hoặc [pause] · cảm xúc = [excited] [whisper] [sarcastic]... · không đổi từ.</p>
      )}
      <div className="ve-prop-grid">
        <label className="ve-prop-field ve-prop-field-wide">
          <span>Voice ID</span>
          <input type="text" value={String(voiceSettings.voiceId ?? "")} onChange={(e) => onCommit({ voiceSettings: { ...voiceSettings, voiceId: e.target.value } })} />
        </label>
        <label className="ve-prop-field">
          <span>Stability</span>
          <input type="number" step="0.05" min="0" max="1" value={num(voiceSettings.stability, 0.35)} onChange={(e) => onCommit({ voiceSettings: { ...voiceSettings, stability: Number(e.target.value) } })} />
        </label>
        <label className="ve-prop-field">
          <span>Style</span>
          <input type="number" step="0.05" min="0" max="1" value={num(voiceSettings.style, 0.35)} onChange={(e) => onCommit({ voiceSettings: { ...voiceSettings, style: Number(e.target.value) } })} />
        </label>
        <label className="ve-prop-field">
          <span>Speed</span>
          <input type="number" step="0.05" min="0.7" max="1.2" value={num(voiceSettings.speed, 1)} onChange={(e) => onCommit({ voiceSettings: { ...voiceSettings, speed: Number(e.target.value) } })} />
        </label>
      </div>
      {qc ? (
        <div className="ve-prop-field ve-prop-field-wide">
          <span>QC {qc.pass === true ? <b style={{ color: "#2dd4a0" }}>PASS</b> : <b style={{ color: "#ff6b6b" }}>FAIL</b>}</span>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12, color: "#b9bfcc" }}>
            {(qc.checks ?? []).map((check) => (
              <li key={check.id} style={{ color: check.pass ? "#b9bfcc" : "#ff9b9b" }}>
                {check.pass ? "✓" : "✗"} {check.label}: {check.value} ({check.threshold})
              </li>
            ))}
            {qc.wer !== null && qc.wer !== undefined ? <li>WER: {(qc.wer * 100).toFixed(1)}%</li> : null}
          </ul>
        </div>
      ) : null}
      <button type="button" className="ve-prop-btn" disabled={regenState === "running"} onClick={() => void regen()}>
        {regenState === "running" ? "Regenerating…" : "Regenerate voice (2 takes + QC)"}
      </button>
      {regenMessage ? <p className="ve-hint">{regenMessage}</p> : null}
    </div>
  );
};

const PALETTE = ["#ffffff", "#000000", "#f2b84b", "#61d7e8", "#ec6a5e", "#2dd4a0", "#8f7bff", "#f4e8cf", "#ffe066", "#ff6b9d", "#4ecdc4", "#45b7d1"];

const ColorField: React.FC<{ label: string; value: string; onChange: (color: string) => void }> = ({ label, value, onChange }) => (
  <label className="ve-prop-field">
    <span>{label}</span>
    <div className="ve-color-palette">
      {PALETTE.map((c) => <button key={c} type="button" className={`ve-color-swatch ${value === c ? "active" : ""}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={`Color ${c}`} />)}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 28, height: 20, border: "none", background: "transparent", cursor: "pointer" }} />
    </div>
  </label>
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  clip, tab, onTabChange, autoFocusText, onAutoFocusTextDone, armedProps, onToggleArm, selectedKeyframe, onSetEasing, onCommit, onCommitRange, onDelete, onDuplicate, canDelete, onZOrder, onFlip, onSetSpeed, poseList, onAddPresence, projectId,
}) => {
  const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  React.useEffect(() => {
    if (autoFocusText && tab === "text" && textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.select();
      onAutoFocusTextDone?.();
    }
  }, [autoFocusText, tab, onAutoFocusTextDone]);
  const md = clip.metadata;
  const isText = Boolean(md.isTextClip);
  const isAudio = clip.kind === "voice" || clip.kind === "music" || clip.kind === "audio-event";
  const isTransition = clip.kind === "transition";
  const isOverlay = (clip.kind === "element") || isText;

  const tabs: { id: PropTab; label: string; show: boolean }[] = [
    { id: "transform", label: "Transform", show: isOverlay },
    { id: "text", label: "Text", show: isText },
    { id: "audio", label: "Audio", show: isAudio },
    { id: "animation", label: "Animation", show: isOverlay },
    { id: "speed", label: "Speed", show: isAudio || isOverlay },
    { id: "color", label: "Color", show: isOverlay },
    { id: "transition", label: "Transition", show: isTransition },
    { id: "character", label: "Character", show: clip.kind === "beat" },
    { id: "info", label: "Info", show: !isOverlay && !isAudio && !isTransition },
  ];
  const activeTab = tabs.some((t) => t.id === tab && t.show) ? tab : (tabs.find((t) => t.show)?.id ?? "info");

  const NumberField: React.FC<{ label: string; prop: string; value: number; min?: number; max?: number; step?: number }> = ({ label, prop, value, min, max, step = 0.01 }) => (
    <label className="ve-prop-field">
      <span className="ve-prop-label-row">
        <span>{label}</span>
        <button
          type="button"
          className={`ve-kf-arm ${armedProps.includes(prop) ? "armed" : ""}`}
          title={armedProps.includes(prop) ? "Keyframes armed — edits create keyframes at the playhead" : "Arm keyframes for this property"}
          onClick={() => onToggleArm(prop, value)}
        >◇</button>
      </span>
      <input type="number" step={step} min={min} max={max} value={Math.round(value * 1000) / 1000} onChange={(e) => onCommit({ [prop]: Number(e.target.value) })} />
    </label>
  );

  return (
    <div className="ve-properties">
      <div className="ve-prop-header">
        <strong>{clip.label}</strong>
        <small>{clip.kind} · {clip.id}</small>
        <div className="ve-prop-actions">
          <button type="button" onClick={onDuplicate}>Duplicate</button>
          {canDelete ? <button type="button" className="danger" onClick={onDelete}>Delete</button> : null}
        </div>
      </div>

      <div className="ve-prop-tabs" role="tablist">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} className={activeTab === t.id ? "active" : ""} onClick={() => onTabChange(t.id)}>{t.label}</button>
        ))}
      </div>

      {selectedKeyframe && selectedKeyframe.clipId === clip.id ? (
        <div className="ve-prop-section ve-kf-easing">
          <span className="ve-prop-label-row"><span>Keyframe easing @ {selectedKeyframe.t.toFixed(2)}s</span></span>
          <select value="linear" onChange={(e) => onSetEasing(selectedKeyframe.property, selectedKeyframe.t, e.target.value as "linear")}>
            <option value="linear">Linear</option>
            <option value="ease-in">Ease in</option>
            <option value="ease-out">Ease out</option>
            <option value="ease-in-out">Ease in-out</option>
          </select>
        </div>
      ) : null}

      {activeTab === "transform" ? (
        <>
          <div className="ve-prop-section">
            <NumberField label="X" prop="x" value={num(md.x, 0.1)} min={-1} max={2} />
            <NumberField label="Y" prop="y" value={num(md.y, 0.1)} min={-1} max={2} />
            <NumberField label="W" prop="w" value={num(md.w, 0.3)} min={0.02} max={1.5} />
            <NumberField label="H" prop="h" value={num(md.h, 0.3)} min={0.02} max={1.5} />
            <NumberField label="Rotation" prop="rotation" value={num(md.rotation, 0)} min={-360} max={360} step={1} />
            <NumberField label="Opacity" prop="opacity" value={num(md.opacity, 1)} min={0} max={1} step={0.05} />
          </div>
          <div className="ve-prop-section">
            <label className="ve-prop-field">
              <span>Blend mode</span>
              <select value={typeof md.blendMode === "string" ? md.blendMode : "normal"} onChange={(e) => onCommit({ blendMode: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
              </select>
            </label>
            <label className="ve-prop-field">
              <span>Fit</span>
              <select value={typeof md.fit === "string" ? md.fit : "contain"} onChange={(e) => onCommit({ fit: e.target.value })}>
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </label>
          </div>
          <div className="ve-prop-section">
            <button type="button" className="ve-prop-btn" onClick={() => onFlip("h")}>Flip horizontal</button>
            <button type="button" className="ve-prop-btn" onClick={() => onFlip("v")}>Flip vertical</button>
          </div>
          <div className="ve-prop-section">
            <span className="ve-prop-label-row"><span>Layer order</span></span>
            <button type="button" className="ve-prop-btn" onClick={() => onZOrder("front")}>To front</button>
            <button type="button" className="ve-prop-btn" onClick={() => onZOrder("forward")}>Forward</button>
            <button type="button" className="ve-prop-btn" onClick={() => onZOrder("backward")}>Backward</button>
            <button type="button" className="ve-prop-btn" onClick={() => onZOrder("back")}>To back</button>
          </div>
          <div className="ve-prop-section">
            <label className="ve-prop-field">
              <span>Start</span>
              <input type="number" step="0.01" min="0" value={clip.range.startSec} onChange={(e) => onCommitRange({ startSec: Number(e.target.value) })} />
            </label>
            <label className="ve-prop-field">
              <span>End</span>
              <input type="number" step="0.01" min="0" value={clip.range.endSec} onChange={(e) => onCommitRange({ endSec: Number(e.target.value) })} />
            </label>
          </div>
        </>
      ) : null}

      {activeTab === "text" ? (
        <>
          <div className="ve-prop-section">
            <label className="ve-prop-field ve-prop-field-wide">
              <span>Text</span>
              <textarea ref={textAreaRef} rows={2} value={String(md.text ?? "")} onChange={(e) => onCommit({ text: e.target.value, label: e.target.value.slice(0, 30) || "Text" })} />
            </label>
          </div>
          <div className="ve-prop-section">
            <label className="ve-prop-field">
              <span>Font</span>
              <select value={typeof md.fontFamily === "string" ? md.fontFamily : "Inter, sans-serif"} onChange={(e) => onCommit({ fontFamily: e.target.value })}>
                <option value="Inter, sans-serif">Inter</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Courier New, monospace">Courier</option>
                <option value="Impact, sans-serif">Impact</option>
              </select>
            </label>
            <NumberField label="Font size" prop="fontSize" value={num(md.fontSize, 48)} min={8} max={200} step={1} />
          </div>
          <div className="ve-prop-section">
            <label className="ve-prop-field">
              <span>Weight</span>
              <select value={String(num(md.fontWeight, 700))} onChange={(e) => onCommit({ fontWeight: Number(e.target.value) })}>
                <option value="400">Normal</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="800">Extrabold</option>
              </select>
            </label>
            <label className="ve-prop-field">
              <span>Align</span>
              <select value={typeof md.textAlign === "string" ? md.textAlign : "center"} onChange={(e) => onCommit({ textAlign: e.target.value })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
          <div className="ve-prop-section ve-prop-toggles">
            <button type="button" className={md.italic ? "active" : ""} onClick={() => onCommit({ italic: !md.italic })}>I</button>
            <button type="button" className={md.underline ? "active" : ""} onClick={() => onCommit({ underline: !md.underline })}>U</button>
          </div>
          <div className="ve-prop-section">
            <ColorField label="Fill color" value={typeof md.color === "string" ? md.color : "#ffffff"} onChange={(c) => onCommit({ color: c })} />
            <ColorField label="Background" value={typeof md.bgColor === "string" ? md.bgColor : "#000000"} onChange={(c) => onCommit({ bgColor: c })} />
          </div>
          <div className="ve-prop-section">
            <NumberField label="Stroke W" prop="strokeWidth" value={num(md.strokeWidth, 0)} min={0} max={10} step={0.5} />
            <label className="ve-prop-field">
              <span>Stroke color</span>
              <input type="color" value={typeof md.strokeColor === "string" ? md.strokeColor : "#000000"} onChange={(e) => onCommit({ strokeColor: e.target.value })} />
            </label>
          </div>
          <div className="ve-prop-section">
            <NumberField label="Shadow blur" prop="shadowBlur" value={num(md.shadowBlur, 0)} min={0} max={40} step={1} />
            <label className="ve-prop-field">
              <span>Shadow color</span>
              <input type="color" value={typeof md.shadowColor === "string" ? md.shadowColor : "#000000"} onChange={(e) => onCommit({ shadowColor: e.target.value })} />
            </label>
          </div>
          <div className="ve-prop-section">
            <NumberField label="Glow blur" prop="glowBlur" value={num(md.glowBlur, 0)} min={0} max={40} step={1} />
            <label className="ve-prop-field">
              <span>Glow color</span>
              <input type="color" value={typeof md.glowColor === "string" ? md.glowColor : "#ffffff"} onChange={(e) => onCommit({ glowColor: e.target.value })} />
            </label>
          </div>
          <div className="ve-prop-section">
            <NumberField label="Letter spacing" prop="letterSpacing" value={num(md.letterSpacing, 0)} min={-5} max={20} step={0.5} />
            <NumberField label="Line height" prop="lineHeight" value={num(md.lineHeight, 1.2)} min={0.8} max={3} step={0.1} />
          </div>
        </>
      ) : null}

      {activeTab === "audio" ? (
        <div className="ve-prop-section">
          {clip.kind === "voice" ? <VoiceSection clip={clip} projectId={projectId} onCommit={onCommit} /> : null}
          <label className="ve-prop-field">
            <span>Gain dB</span>
            <input type="number" step="0.5" value={num(md.gainDb, 0)} onChange={(e) => onCommit({ gainDb: Number(e.target.value) })} />
          </label>
          <label className="ve-prop-field">
            <span>Fade in</span>
            <input type="number" step="0.01" min="0" value={num(md.fadeInSec, 0)} onChange={(e) => onCommit({ fadeInSec: Number(e.target.value) })} />
          </label>
          <label className="ve-prop-field">
            <span>Fade out</span>
            <input type="number" step="0.01" min="0" value={num(md.fadeOutSec, 0)} onChange={(e) => onCommit({ fadeOutSec: Number(e.target.value) })} />
          </label>
          <button type="button" className={clip.muted ? "ve-prop-btn active" : "ve-prop-btn"} onClick={() => onCommit({ muted: !clip.muted })}>{clip.muted ? "Unmute" : "Mute"}</button>
        </div>
      ) : null}

      {activeTab === "animation" ? (
        <div className="ve-prop-section">
          <label className="ve-prop-field">
            <span>Animate in</span>
            <select value={typeof md.animIn === "string" ? md.animIn : "none"} onChange={(e) => onCommit({ animIn: e.target.value })}>
              {ANIM_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
          </label>
          <label className="ve-prop-field">
            <span>Animate out</span>
            <select value={typeof md.animOut === "string" ? md.animOut : "none"} onChange={(e) => onCommit({ animOut: e.target.value })}>
              {ANIM_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
          </label>
          <label className="ve-prop-field">
            <span>Duration</span>
            <input type="number" step="0.05" min="0.1" value={num(md.animDurationSec, 0.5)} onChange={(e) => onCommit({ animDurationSec: Number(e.target.value) })} />
          </label>
        </div>
      ) : null}

      {activeTab === "speed" ? (
        <div className="ve-prop-section">
          <label className="ve-prop-field">
            <span>Speed</span>
            <select value={String(num(md.speed, 1))} onChange={(e) => onSetSpeed(Number(e.target.value))}>
              {SPEED_PRESETS.map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
            </select>
          </label>
          <p className="ve-hint">Changing speed re-times the clip on the timeline.</p>
        </div>
      ) : null}

      {activeTab === "color" ? (
        <>
          <div className="ve-prop-section">
            <label className="ve-prop-field">
              <span>Grade preset</span>
              <select value={typeof md.filter === "string" ? md.filter : "none"} onChange={(e) => onCommit({ filter: e.target.value })}>
                {FILTER_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
              </select>
            </label>
            <label className="ve-prop-field">
              <span>Effect</span>
              <select value={typeof md.filter === "string" ? md.filter : "none"} onChange={(e) => onCommit({ filter: e.target.value })}>
                {EFFECT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
              </select>
            </label>
          </div>
          <div className="ve-prop-section">
            <NumberField label="Brightness" prop="brightness" value={num(md.brightness, 1)} min={0.4} max={2} step={0.05} />
            <NumberField label="Contrast" prop="contrast" value={num(md.contrast, 1)} min={0.4} max={2} step={0.05} />
            <NumberField label="Saturation" prop="saturation" value={num(md.saturation, 1)} min={0} max={2.5} step={0.05} />
          </div>
        </>
      ) : null}

      {activeTab === "transition" ? (
        <div className="ve-prop-section">
          <label className="ve-prop-field">
            <span>Type</span>
            <select value={typeof md.transitionType === "string" ? md.transitionType : "fade"} onChange={(e) => onCommit({ transitionType: e.target.value })}>
              {TRANSITION_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
          </label>
          <label className="ve-prop-field">
            <span>Duration</span>
            <input type="number" step="0.01" min="0.05" value={clip.range.endSec - clip.range.startSec} onChange={(e) => onCommitRange({ endSec: clip.range.startSec + Math.max(0.05, Number(e.target.value)) })} />
          </label>
        </div>
      ) : null}

      {activeTab === "character" ? <CharacterPresenceTab clip={clip} poseList={poseList ?? []} onAddPresence={onAddPresence} /> : null}

      {activeTab === "info" ? (
        <div className="ve-prop-section">
          <span className="ve-prop-label-row"><span>Timing</span></span>
          <span>{clip.range.startSec.toFixed(2)}s – {clip.range.endSec.toFixed(2)}s</span>
          <span className="ve-prop-label-row"><span>Source</span></span>
          <span>{clip.source.beatId || clip.source.elementId || clip.source.audioCueId || clip.source.transitionId || "project"}</span>
        </div>
      ) : null}
    </div>
  );
};

const PRESENCE_POSITIONS = ["thirds-tl", "thirds-tr", "thirds-bl", "thirds-br", "edge-l-in", "edge-r-in", "center", "below-title", "beside-content", "lower-third"];
const PRESENCE_SIZES = ["chip", "small", "medium", "half", "full"];
const PRESENCE_MOTIONS = ["slide-l", "slide-r", "slide-u", "slide-d", "pop", "jump-in", "drop-in", "fade-scale", "peek"];

const CharacterPresenceTab: React.FC<{
  clip: EditorClip;
  poseList: string[];
  onAddPresence?: (options: CharacterPresenceOptions) => void;
}> = ({ clip, poseList, onAddPresence }) => {
  const [pose, setPose] = React.useState(poseList[0] ?? "present");
  const [position, setPosition] = React.useState("thirds-br");
  const [size, setSize] = React.useState("small");
  const [motion, setMotion] = React.useState("fade-scale");
  React.useEffect(() => {
    if (poseList.length && !poseList.includes(pose)) setPose(poseList[0]);
  }, [poseList, pose]);
  const dur = Math.max(0.5, clip.range.endSec - clip.range.startSec);
  return (
    <div className="ve-prop-section">
      <span className="ve-prop-label-row"><span>Character presence — ghép pose vào beat này</span></span>
      <label className="ve-prop-field">
        <span>Pose</span>
        <select value={pose} onChange={(e) => setPose(e.target.value)}>
          {poseList.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="ve-prop-field">
        <span>Position</span>
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          {PRESENCE_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="ve-prop-field">
        <span>Size</span>
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          {PRESENCE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="ve-prop-field">
        <span>Motion</span>
        <select value={motion} onChange={(e) => setMotion(e.target.value)}>
          {PRESENCE_MOTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <button
        type="button"
        className="ve-presence-add"
        disabled={!onAddPresence || !pose}
        title={`Thêm character overlay clip spanning ${dur.toFixed(1)}s của beat`}
        onClick={() => onAddPresence?.({ pose, position, size, motion })}
      >
        ＋ Thêm character ({dur.toFixed(1)}s)
      </button>
      <small className="ve-prop-hint">Pose tạo trong Asset Studio (🎨 nút header) sẽ xuất hiện trong danh sách sau khi lưu.</small>
    </div>
  );
};
