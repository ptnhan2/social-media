import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EditorDoc } from "../../../shared/isaacverse/editor";
import { EditorTimeline } from "./EditorTimeline";

const editor: EditorDoc = {
  id: "editor:video-01",
  projectId: "video-01",
  width: 1920,
  height: 1080,
  fps: 30,
  durationSec: 10,
  revision: { baseEditVersion: "v001", revision: 0, updatedAt: "2026-08-12T00:00:00.000Z" },
  tracks: [{
    id: "video-main",
    kind: "video",
    name: "Main track",
    order: 0,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "project", projectRef: "semantic-beats" },
    accepts: ["image", "video"],
    capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
    clips: [{ id: "clip:beat:01", kind: "beat", trackId: "video-main", range: { startSec: 2, endSec: 6 }, label: "Show proof", source: { beatId: "beat-01" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} }],
  }, {
    id: "voice",
    kind: "voice",
    name: "Audio 1",
    order: 1,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "project", projectRef: "audio-plan.voice" },
    accepts: ["audio"],
    capabilities: { visual: false, audio: true, canvas: false, trim: true, split: true, gain: true, fade: true, mute: true, solo: true },
    clips: [{ id: "clip:voice:01", kind: "voice", trackId: "voice", range: { startSec: 0, endSec: 4 }, label: "Voiceover", source: {}, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: { src: "voice.wav", keyframes: { gainDb: [{ t: 1, v: -3 }] } } }],
  }],
};

describe("EditorTimeline", () => {
  it("renders a ruler, accessible playhead, track row, and source-linked clip block", () => {
    const html = renderToStaticMarkup(<EditorTimeline editor={editor} selectionClipIds={[]} currentSec={0} zoom={1} onZoomChange={() => undefined} onSeek={() => undefined} onSelectClip={() => undefined} activeTool="select" onToolChange={() => undefined} />);

    expect(html).toContain("TIMELINE");
    expect(html).toContain("Main track");
    expect(html).toContain('data-clip-id="clip:beat:01"');
    expect(html).toContain('role="slider"');
    expect(html).toContain("Show proof");
    expect(html).toContain("Decoded audio waveform");
  });

  it("renders layer-add buttons and generic track names", () => {
    const html = renderToStaticMarkup(<EditorTimeline editor={editor} selectionClipIds={[]} currentSec={0} zoom={1} onZoomChange={() => undefined} onSeek={() => undefined} onSelectClip={() => undefined} activeTool="select" onToolChange={() => undefined} />);
    expect(html).toContain("+ Overlay");
    expect(html).toContain("+ Audio");
    expect(html).toContain("Audio 1");
    expect(html).not.toContain("Voiceover</strong>");
  });

  it("shows a keyframe expand button for clips with keyframes", () => {
    const html = renderToStaticMarkup(<EditorTimeline editor={editor} selectionClipIds={[]} currentSec={0} zoom={1} onZoomChange={() => undefined} onSeek={() => undefined} onSelectClip={() => undefined} activeTool="select" onToolChange={() => undefined} />);
    expect(html).toContain("Expand Audio 1 keyframes");
  });
});
