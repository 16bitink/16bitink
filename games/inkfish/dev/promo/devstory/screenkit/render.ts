import { VIDEO, window01, type Short } from '../../short';
import {
  clipped, clockAt, countAt, cursorAt, drawClock, drawCounter, drawCursor, drawDesktop, drawEditor,
  drawGameBird, drawGameBoat, drawGameFish, drawGameItem, drawGameSquid, drawGameWeed, drawGlass, drawHitbox, drawInkReveal,
  drawLaptop, drawLevelMap, drawLog, drawMessage, drawMorph, drawPreview, drawReadout, drawRigBones, drawSea, drawTargetArrow,
  drawTodo, drawWarningStack, drawWindow, fishSpinePoints, fishStill, HAND, inset, LAPTOP_SCREEN, levelNodeAt, loadScreenArt,
  makeInkReveal, morphScreen, paperPattern, ramp, splitH, splitV, typingDuration, weekendMinutes, type Rect,
} from '../screen';

/**
 * Kit demo (not recorded): every piece of the screen kit over 12 s.
 *  0.0–2.6  editor typing the duck clamp + console + preview: ducks rising, hitboxes, readout, warnings
 *  2.6–5.4  art window: the pen inks a perch, the wash floods in, rig bones appear
 *  5.4–7.6  full-screen game: the squid boss, a shark switching target to the duck, birds, a boat; clock + counter
 *  7.6–9.8  level map + clicking cursor + to-do list ticking
 *  9.8–12   laptop → CRT → laptop morph, with a phone message
 */
const W = VIDEO.width;
const H = VIDEO.height;
const LOOP = 12;

const CODE = [
  "import { Duck } from './items';",
  '',
  'function floatDuck(d: Duck) {',
  '  d.vy -= LIFT * dt;',
  '  d.y += d.vy * dt;',
  '  if (d.y < surfaceY) d.y = surfaceY;',
  '  sharks.chase(d);',
  '}',
];

export async function createScreenKit(ctx: CanvasRenderingContext2D): Promise<Short> {
  const art = await loadScreenArt();
  const perch = makeInkReveal(fishStill('perch', 640));
  const scr = LAPTOP_SCREEN;

  const segEditor = (t: number): void => {
    const area = inset(scr, 18);
    const [left, right] = splitH(area, 0.68, 16);
    const [code, log] = splitV(left, 0.66, 14);
    const typeAt = 0.15;
    drawEditor(ctx, {
      rect: code, t, file: 'decoy.ts', code: CODE, firstLineNo: 41,
      typing: { at: typeAt, cps: 34, fromLine: 4 },
      highlight: { line: 5, at: typeAt + typingDuration(CODE, 34, 4) * 0.55 },
      warnings: [{ line: 4, at: 1.0 }], fontSize: 26,
    });
    drawLog(ctx, {
      rect: log, t, rows: [
        { at: 0.2, text: 'level 22 loaded' },
        { at: 0.9, text: 'duck.y < 0', kind: 'warn' },
        { at: 1.4, text: 'duck left the sea', kind: 'error' },
        { at: 1.9, text: 'shark #3 followed', kind: 'error' },
      ],
    });
    drawPreview(ctx, {
      rect: right, t, status: '● 3:07', draw: (c, r) => {
        drawSea(c, r, t, { surfaceY: r.y + r.h * 0.42, night: 0.9 });
        for (let k = 0; k < 3; k++) {
          const x = r.x + r.w * (0.3 + (k % 2) * 0.4);
          const y = r.y + r.h * 0.62 - ((t * 240 + k * 210) % (r.h * 0.6));
          drawGameItem(c, 'duck', { x, y, width: 84, facing: -1, rot: Math.sin(t * 3 + k) * 0.15 }, t);
          drawHitbox(c, { x: x - 42, y: y - 38, w: 84, h: 76 }, { t, label: `#${k + 1}` });
        }
        drawGameFish(c, { shape: 'inkling', x: r.x + r.w * 0.5, y: r.y + r.h * 0.82, length: 120, facing: 1, tilt: -0.5 }, t);
        drawReadout(c, r.x + r.w / 2, r.y + r.h - 50, { label: 'y', value: Math.round(-200 - t * 4800), t, bad: t > 0.8, size: 28, anchor: 'center' });
      },
    });
    drawWarningStack(ctx, left.x + left.w * 0.6, left.y + left.h * 0.5, [
      { at: 1.0, text: 'duck.y < 0' }, { at: 1.5, text: 'out of the sea' },
    ], t);
  };

  const segPen = (t: number): void => {
    const win = drawWindow(ctx, inset(scr, 18), 'perch.png · ink');
    clipped(ctx, win, () => {
      ctx.fillStyle = '#f4eddc';
      ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.fillStyle = paperPattern(ctx);
      ctx.fillRect(win.x, win.y, win.w, win.h);
    });
    const cx = win.x + win.w / 2;
    const cy = win.y + win.h / 2 + 10;
    drawInkReveal(ctx, perch, art.pen, { x: cx, y: cy, width: 760, t, at: 2.7, inkS: 1.6, washS: 0.7 });
    drawRigBones(ctx, fishSpinePoints(cx + 20, cy, 600, 1, 0, 6, { t, amount: 0.05 }), { t, at: 5.0, dur: 0.3, label: 'rig: 5 bones' });
  };

  const segGame = (t: number): void => {
    const r = scr;
    drawPreview(ctx, {
      rect: r, t, bare: true, draw: (c, v) => {
        const surf = v.y + 190;
        drawSea(c, v, t, { surfaceY: surf, depth: 0.7 });
        drawGameBoat(c, 'trawler', { x: v.x + 300, y: surf, width: 330 }, t);
        drawGameBird(c, 'gull', { x: v.x + 700 + t * 30, y: v.y + 90, width: 150, facing: -1 }, t);
        drawGameBird(c, 'tern', { x: v.x + 850 - t * 20, y: v.y + 130, width: 110 }, t + 0.3);
        for (let k = 0; k < 4; k++) drawGameWeed(c, (k % 3) as 0 | 1 | 2, v.x + 80 + k * 260, v.y + v.h + 10, 230 + (k % 2) * 60, t);
        drawGameSquid(c, { x: v.x + 640, y: v.y + 560, width: 700 }, t);
        const duck = { x: v.x + 220, y: surf - 6 };
        drawGameItem(c, 'duck', { x: duck.x, y: duck.y, width: 96, facing: -1 }, t);
        const shark = { x: v.x + 330, y: v.y + 420 };
        drawGameFish(c, { shape: 'shark', variant: 'heavy', x: shark.x, y: shark.y, length: 340, facing: -1, tilt: 0.35 }, t);
        const player = { x: v.x + 150, y: v.y + 640 };
        drawGameFish(c, { shape: 'inkling', x: player.x, y: player.y, length: 120, facing: 1 }, t);
        const switched = t > 6.1;
        drawTargetArrow(c, { x: shark.x - 150, y: shark.y + 10 }, switched ? { x: duck.x + 20, y: duck.y + 40 } : { x: player.x + 40, y: player.y - 30 }, { t, at: switched ? 6.1 : 5.5, label: switched ? 'target: duck' : 'target: you', bend: switched ? -0.3 : 0.3 });
      },
    });
    const minutes = clockAt([{ t: 5.4, at: weekendMinutes('SAT', 16) }, { t: 7.4, at: weekendMinutes('SUN', 17, 43) }], t);
    drawClock(ctx, { x: scr.x + scr.w - 250, y: scr.y + 60, minutes, t, speed: window01(t, 5.5, 7.3, 0.3), popAt: 5.5 });
    const n = countAt(t, 1, 8, 5.6, 7.2);
    drawCounter(ctx, { x: scr.x + 120, y: scr.y + 120, label: 'ARMS', value: n.value, fresh: n.fresh });
  };

  const segMap = (t: number): void => {
    const target = levelNodeAt(6);
    let node = { x: 0, y: 0 };
    const view = drawPreview(ctx, {
      rect: inset(scr, 18), t, title: 'InkFish · map', draw: (c, v) => {
        const to = drawLevelMap(c, v, { t, scrollX: 560 + (t - 7.6) * 40, done: 5, current: 6 });
        node = to(target.x, target.y);
      },
    });
    const cur = cursorAt([
      { t: 7.6, x: view.x + 300, y: view.y + 650 },
      { t: 8.2, x: node.x + 120, y: node.y - 160 },
      { t: 8.6, x: node.x - 60, y: node.y + 90, click: true },
      { t: 9.0, x: node.x + 150, y: node.y + 30, click: true },
      { t: 9.4, x: node.x - 200, y: node.y - 60, click: true },
      { t: 9.8, x: view.x + 300, y: view.y + 450 },
    ], t);
    drawCursor(ctx, art.hand, 'hand', cur);
    drawTodo(ctx, {
      x: scr.x + 40, y: scr.y + 110, w: 360, t, title: 'weekend', popAt: 7.65, items: [
        { text: 'fish', tickAt: 7.9 }, { text: 'tail', tickAt: 8.1 }, { text: 'squid', tickAt: 8.3 },
        { text: 'sharks', tickAt: 8.5 }, { text: '100 levels', tickAt: 8.7 }, { text: 'birds', tickAt: 8.9 }, { text: 'boats', tickAt: 9.1 },
      ],
    });
  };

  const segMorph = (t: number, u: number): Rect => {
    const r = morphScreen(u);
    clipped(ctx, r, () => {
      drawSea(ctx, r, t, { surfaceY: r.y + r.h * 0.15 });
      const cx = r.x + r.w / 2;
      drawGameFish(ctx, { shape: 'perch', variant: 'heavy', x: cx + 120, y: r.y + r.h * 0.55, length: r.w * 0.5, facing: -1, look: { jaw: 0.5 + 0.5 * Math.sin(t * 4) } }, t);
      drawGameFish(ctx, { shape: 'inkling', x: cx - 250, y: r.y + r.h * 0.5, length: r.w * 0.12, facing: -1 }, t);
    });
    drawGlass(ctx, r, u);
    return r;
  };

  const draw = (tRaw: number): void => {
    const t = ((tRaw % LOOP) + LOOP) % LOOP;
    // The room behind the screen and the area where Dewy will stand.
    const room = ctx.createLinearGradient(0, 0, 0, H);
    room.addColorStop(0, '#2b2f3d');
    room.addColorStop(1, '#171923');
    ctx.fillStyle = room;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = paperPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (t < 9.8) {
      clipped(ctx, scr, () => {
        drawDesktop(ctx, scr);
        if (t < 2.6) segEditor(t);
        else if (t < 5.4) segPen(t);
        else if (t < 7.6) segGame(t);
        else segMap(t);
      });
      drawGlass(ctx, scr);
      drawLaptop(ctx, art);
    } else {
      const u = t < 10.9 ? ramp(t, 9.9, 10.7) : 1 - ramp(t, 11.2, 11.95);
      segMorph(t, u);
      drawMorph(ctx, art, u);
      drawMessage(ctx, { x: 120, y: 1150, maxW: 760, text: 'every level feels the same', t, at: 10.4, from: 'playtester' });
    }
    // Labels in the Dewy area, so the demo explains itself.
    const names: readonly [number, string][] = [[2.6, 'editor · console · preview'], [5.4, 'pen-draw reveal · rig'], [7.6, 'game art · target arrow · clock · counter'], [9.8, 'level map · cursor · to-do'], [12, 'laptop ⇄ CRT · message']];
    const name = names.find(([end]) => t < end)![1];
    ctx.font = `700 64px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(244,237,220,0.85)';
    ctx.fillText(name, W / 2, 1600);
    ctx.font = `500 44px ${HAND}`;
    ctx.fillStyle = 'rgba(244,237,220,0.5)';
    ctx.fillText('screen kit demo · Dewy stands here', W / 2, 1680);
  };
  return { loopSeconds: LOOP, draw, audio: async () => new Blob([]) };
}
