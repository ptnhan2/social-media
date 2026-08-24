/**
 * Tiny external store for canvas cursor position (doc coords).
 * Updated from CanvasStage mousemove (rAF-throttled), read by StatusBar —
 * avoids dispatching store actions on every mouse move.
 */
import { useSyncExternalStore } from "react";

interface CursorState {
  x: number;
  y: number;
}

let cursor: CursorState | null = null;
const listeners = new Set<() => void>();
let rafId: number | null = null;
let pending: CursorState | null = null;

function emit() {
  rafId = null;
  if (pending) {
    cursor = pending;
    pending = null;
    for (const l of listeners) l();
  }
}

export function setCursor(pos: CursorState | null): void {
  pending = pos;
  if (rafId == null && typeof requestAnimationFrame === "function") {
    rafId = requestAnimationFrame(emit);
  } else if (typeof requestAnimationFrame !== "function") {
    cursor = pos;
  }
}

export function subscribeCursor(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCursor(): CursorState | null {
  return cursor;
}

export function useCursor(): CursorState | null {
  return useSyncExternalStore(subscribeCursor, getCursor, getCursor);
}
