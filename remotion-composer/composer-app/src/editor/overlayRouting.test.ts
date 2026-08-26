import { describe, expect, it } from "vitest";
import { routeOverlay } from "../../../shared/isaacverse/editor";
import type { EditorClip } from "../../../shared/isaacverse/editor";

const makeClip = (id: string, beatId: string | undefined, startSec: number, endSec: number, kind: "beat" | "element" = "element"): EditorClip => ({
  id,
  kind: kind as EditorClip["kind"],
  trackId: "video-main",
  range: { startSec, endSec },
  label: id,
  source: beatId ? { beatId } : {},
  linkedClipIds: [],
  locked: false,
  muted: false,
  hidden: false,
  metadata: {},
});

describe("routeOverlay — B1 regression lock (PIPELINE-HARDENING-SPEC §3.2-1c)", () => {
  const beatClip = makeClip("clip:beat:beat-01", "beat-01", 3.5, 7, "beat");
  const videoClips = [beatClip];

  it("overlay fully inside beat clip → nested (camera applies)", () => {
    const overlay = makeClip("beat-01:overlay-01", "beat-01", 4, 6.5);
    const { nested, host } = routeOverlay(overlay, videoClips);
    expect(nested).toBe(true);
    expect(host?.id).toBe("clip:beat:beat-01");
  });

  it("overlay spanning past beat end → ROOT (B1 fix: Remotion would clip it)", () => {
    // beat was trimmed from [3.5, 7] to [3.5, 5.5], but the overlay (regenerated
    // from EditDoc which still says beat durationSec 3.5) spans [4, 6.8]
    const trimmedBeat = makeClip("clip:beat:beat-01", "beat-01", 3.5, 5.5, "beat");
    const overlay = makeClip("beat-01:overlay-01", "beat-01", 4, 6.8);
    const { nested, host } = routeOverlay(overlay, [trimmedBeat]);
    expect(nested).toBe(false);
    expect(host).not.toBeNull(); // host WAS found (start inside the clip)
    // but nested=false because overlay.endSec > host.endSec
  });

  it("overlay with no beatId → root", () => {
    const overlay = makeClip("clip:text:999", undefined, 1, 3);
    const { nested, host } = routeOverlay(overlay, videoClips);
    expect(nested).toBe(false);
    expect(host).toBeNull();
  });

  it("overlay starting before the host clip → root (split: overlay in first part)", () => {
    // beat split: [3.5, 7] → part-a [3.5, 5] + part-b [5, 7]
    // overlay at [2.5, 4] starts before part-a — no host contains its start
    const partA = makeClip("clip:beat:beat-01:part-a", "beat-01", 3.5, 5, "beat");
    const partB = makeClip("clip:beat:beat-01:part-b", "beat-01", 5, 7, "beat");
    const overlay = makeClip("beat-01:overlay-01", "beat-01", 2.5, 4);
    const { nested } = routeOverlay(overlay, [partA, partB]);
    expect(nested).toBe(false); // no host contains the start → root
  });

  it("overlay exactly at host boundary (endSec === host.endSec) → nested (epsilon)", () => {
    const overlay = makeClip("beat-01:overlay-01", "beat-01", 4, 7);
    const { nested } = routeOverlay(overlay, videoClips);
    expect(nested).toBe(true); // endSec === host.endSec → inside (≤ with epsilon)
  });
});
