import { describe, expect, it } from "vitest";
import { docToImage, pointInPolygon, snapLayer } from "./geometry";
import { makeLayer } from "./types";

describe("snapLayer", () => {
  it("snaps layer center to doc center when close", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, scaleX: 1, scaleY: 1 });
    const r = snapLayer({ x: 503, y: 400 }, layer, 1000, 800, 8);
    expect(r.x).toBe(500);
    expect(r.guidesX).toEqual([500]);
    expect(r.y).toBe(400);
    expect(r.guidesY).toEqual([400]);
  });

  it("snaps layer edges to doc edges", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 200, height: 200, scaleX: 1, scaleY: 1 });
    // left edge at x-100 = -3 → snaps to 0 → center 100
    const r = snapLayer({ x: 97, y: 400 }, layer, 1000, 800, 8);
    expect(r.x).toBe(100);
    expect(r.guidesX).toEqual([0]);
  });

  it("no snap when far", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, scaleX: 1, scaleY: 1 });
    const r = snapLayer({ x: 300, y: 123 }, layer, 1000, 800, 8);
    expect(r.x).toBe(300);
    expect(r.guidesX).toEqual([]);
    expect(r.guidesY).toEqual([]);
  });

  it("snaps layer center to user guides", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, scaleX: 1, scaleY: 1 });
    const guides = { v: [300], h: [77] };
    const r = snapLayer({ x: 302, y: 200 }, layer, 1000, 800, 8, guides);
    expect(r.x).toBe(300);
    expect(r.guidesX).toEqual([300]);
    // h guide at 77 not near y=200 → no y snap
    expect(r.y).toBe(200);
    expect(r.guidesY).toEqual([]);

    const r2 = snapLayer({ x: 500, y: 80 }, layer, 1000, 800, 8, guides);
    expect(r2.y).toBe(77);
    expect(r2.guidesY).toEqual([77]);
  });

  it("doc center takes precedence over user guides at same distance", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, scaleX: 1, scaleY: 1 });
    // doc center 500 vs guide 498, center at 499 → both within threshold
    const r = snapLayer({ x: 499, y: 400 }, layer, 1000, 800, 8, { v: [498], h: [] });
    expect(r.x).toBe(500);
    expect(r.guidesX).toEqual([500]);
  });
});

describe("docToImage", () => {
  it("identity for untransformed layer", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, x: 500, y: 400, scaleX: 1, scaleY: 1 });
    expect(docToImage(layer, { x: 500, y: 400 })).toEqual({ x: 50, y: 50 });
    expect(docToImage(layer, { x: 450, y: 350 })).toEqual({ x: 0, y: 0 });
    expect(docToImage(layer, { x: 550, y: 450 })).toEqual({ x: 100, y: 100 });
  });

  it("inverse of scale", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, x: 500, y: 400, scaleX: 2, scaleY: 2 });
    expect(docToImage(layer, { x: 550, y: 450 })).toEqual({ x: 75, y: 75 });
  });

  it("inverse of rotation", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, x: 500, y: 400, scaleX: 1, scaleY: 1, rotation: 90 });
    // doc point below center maps to image right side after 90deg rotation
    const p = docToImage(layer, { x: 500, y: 450 });
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });

  it("inverse of flipX", () => {
    const layer = makeLayer({ id: "a", name: "a", src: "s", path: "p", width: 100, height: 100, x: 500, y: 400, scaleX: 1, scaleY: 1, flipX: true });
    expect(docToImage(layer, { x: 450, y: 400 })).toEqual({ x: 100, y: 50 });
  });
});

describe("pointInPolygon", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  it("inside", () => {
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
  });
  it("outside", () => {
    expect(pointInPolygon({ x: 150, y: 50 }, square)).toBe(false);
  });
  it("concave polygon (L-shape)", () => {
    const l = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 },
      { x: 40, y: 40 },
      { x: 40, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(pointInPolygon({ x: 20, y: 80 }, l)).toBe(true);
    expect(pointInPolygon({ x: 80, y: 80 }, l)).toBe(false);
  });
});
