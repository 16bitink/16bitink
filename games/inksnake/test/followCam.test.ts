import { describe, expect, it } from 'vitest';
import { BOARD } from '../src/level/types';
import {
  clampAxis, clampCentre, EDGE_ROOM, edgeMark, followStart, followStep, followZoom, MIN_BODY_CSS, MIN_SHOW, viewExtent, wantsFollow,
} from '../src/scenes/game/followCam';

describe('phone camera', () => {
  it('follows only on small screens', () => {
    expect(wantsFollow(390, 844)).toBe(true);
    expect(wantsFollow(844, 390)).toBe(true);
    expect(wantsFollow(1280, 760)).toBe(false);
    expect(wantsFollow(768, 1024)).toBe(false);
  });

  it('turned boards swap the axes of what the screen shows', () => {
    expect(viewExtent(390, 844, 2, true)).toEqual({ w: 422, h: 195 });
    expect(viewExtent(844, 390, 2, false)).toEqual({ w: 422, h: 195 });
  });

  it('zooms so the body is at least MIN_BODY_CSS wide, but shows at least MIN_SHOW of the board', () => {
    const whole = 0.7;
    const z = followZoom(whole, 15, 390, 844, true);
    expect(z * 15).toBeCloseTo(MIN_BODY_CSS);
    const v = viewExtent(390, 844, z, true);
    expect(Math.min(v.w / BOARD.w, v.h / BOARD.h)).toBeGreaterThanOrEqual(MIN_SHOW - 1e-9);
    // A thin snake would need a closer camera than MIN_SHOW allows: it stops there.
    const thin = followZoom(whole, 8, 390, 844, true);
    const tv = viewExtent(390, 844, thin, true);
    expect(Math.min(tv.w / BOARD.w, tv.h / BOARD.h)).toBeCloseTo(MIN_SHOW);
    // Never further out than the whole board.
    expect(followZoom(2, 30, 390, 844, true)).toBe(2);
  });

  it('clamps an axis inside the room, or centres it when the view is wider', () => {
    expect(clampAxis(0, 100, -50, 1000)).toBe(50);
    expect(clampAxis(990, 100, -50, 1000)).toBe(900);
    expect(clampAxis(400, 100, -50, 1000)).toBe(400);
    expect(clampAxis(10, 600, -50, 1000)).toBe(475);
  });

  it('never shows more than EDGE_ROOM past any edge', () => {
    const view = { w: 400, h: 300 };
    for (const c of [{ x: -500, y: -500 }, { x: 2000, y: 2000 }, { x: 480, y: 270 }, { x: 0, y: 540 }]) {
      const k = clampCentre(c, view);
      expect(k.x - view.w / 2).toBeGreaterThanOrEqual(-EDGE_ROOM);
      expect(k.x + view.w / 2).toBeLessThanOrEqual(BOARD.w + EDGE_ROOM);
      expect(k.y - view.h / 2).toBeGreaterThanOrEqual(-EDGE_ROOM);
      expect(k.y + view.h / 2).toBeLessThanOrEqual(BOARD.h + EDGE_ROOM);
    }
  });

  it('looks ahead of the head and eases after it without overshooting', () => {
    const view = { w: 420, h: 300 };
    const head = { x: 480, y: 270 };
    const s0 = followStart(head, 0, view);
    expect(s0.centre.x).toBeGreaterThan(head.x);
    expect(s0.centre.y).toBeCloseTo(head.y);
    // The head moves on; the camera follows part of the way each frame and settles at the look-ahead.
    const moved = { x: 600, y: 270 };
    let s = s0;
    const xs: number[] = [];
    for (let i = 0; i < 240; i++) {
      s = followStep(s, moved, 0, 1 / 60, view);
      xs.push(s.centre.x);
    }
    expect(xs.every((x, i) => i === 0 || x >= xs[i - 1]! - 1e-9)).toBe(true);
    expect(s.centre.x).toBeCloseTo(moved.x + s.lead.x, 1);
    // Turning round swings the look-ahead behind smoothly, never jumping.
    const turned = followStep(s, moved, Math.PI, 1 / 60, view);
    expect(Math.abs(turned.lead.x - s.lead.x)).toBeLessThan(8);
    // The step returns a new state.
    expect(turned).not.toBe(s);
  });

  it('marks off-screen things on the screen edge, in their direction', () => {
    expect(edgeMark({ x: 100, y: 100 }, 400, 800, 20)).toBeNull();
    const right = edgeMark({ x: 900, y: 400 }, 400, 800, 20)!;
    expect(right.x).toBeCloseTo(380);
    expect(right.y).toBeCloseTo(400);
    expect(right.angle).toBeCloseTo(0);
    const up = edgeMark({ x: 200, y: -300 }, 400, 800, 20, 64)!;
    expect(up.y).toBeCloseTo(64);
    expect(up.x).toBeCloseTo(200);
  });
});
