import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, window01, type Short } from '../short';
import { drawDewy, loadDewy, type DewyImages, type DewyKey } from '../devstory/dewy';
import {
  clipped, clockAt, countAt, cursorAt, drawClock, drawCounter, drawCursor, drawDesktop, drawEditor, drawGameBird, drawGameBoat,
  drawGameFish, drawGameSquid, drawGameWeed, drawGlass, drawInkReveal, drawLaptop, drawLevelMap, drawPreview, drawRigBones, drawSea,
  drawTodo, drawWarningStack, drawWindow, fishSpinePoints, fishStill, inset, LAPTOP_SCREEN, levelNodeAt, loadScreenArt, makeInkReveal,
  paperPattern, pop, ramp, splitH, splitV, squidImage, weekendMinutes, type InkReveal, type Rect, type ScreenArt,
} from '../devstory/screen';
import { makeCanvas } from '../../../src/art/pen';
import { creditAt, PAPER_ON_DARK } from '../credit';
import { renderWeekendAudio } from './audio';
import ENVELOPE from './envelope.json';
import { BEAT, captionAt, LOOP_S, MOODS, wrap } from './script';
import { SPEECH_WORDS } from './words';

/** Draws "I Built This In One Weekend. Here's Every Hour" on Dewy's screen (script.ts has the beats). */

const W = VIDEO.width;
const H = VIDEO.height;
const SCR = LAPTOP_SCREEN;
const INK_BG = '#050914';
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: INK_BG };
const CAPTION = { y: 925, size: 104, maxW: 980 } as const;
const DEWY = { x: 540, y: H + 20, width: 780, topY: 990 } as const;
const POSES: readonly DewyKey[] = ['proud', 'neutral', 'frustrated', 'laughing'];

/** The racing clock's keys: Saturday 4 pm, the tail at 6:42 pm, the squid at 10:23 pm, sharks 10:56 pm, Sunday 5:43 pm. */
const CLOCK = [
  { t: 2.3, at: weekendMinutes('SAT', 16) }, { t: 5.4, at: weekendMinutes('SAT', 16) },
  { t: 5.9, at: weekendMinutes('SAT', 18) }, { t: 6.9, at: weekendMinutes('SAT', 18, 42) },
  { t: 8.0, at: weekendMinutes('SAT', 18, 42) }, { t: 8.3, at: weekendMinutes('SAT', 22) }, { t: 10.2, at: weekendMinutes('SAT', 22, 23) },
  { t: 11.1, at: weekendMinutes('SAT', 22, 23) }, { t: 11.9, at: weekendMinutes('SAT', 22, 56) },
  { t: 13.1, at: weekendMinutes('SAT', 22, 56) }, { t: 14.4, at: weekendMinutes('SUN', 9) }, { t: 16.6, at: weekendMinutes('SUN', 17, 43) },
  { t: 20.4, at: weekendMinutes('SUN', 17, 43) },
];

const TODO = ['fish', 'tail', 'squid', 'sharks', '100 levels', 'birds', 'boats'] as const;
const TODO_TICK = [13.3, 13.5, 13.7, 13.95, 14.55, 15.1, 15.65] as const;

const CODE_FISH = ['fish.tail.swing(sin(t * 6));'];
const CODE_SHARK = [
  'function spawnSharks(level: Level) {',
  '  for (const lane of level.lanes) {',
  '    lane.add(shark, { hunger: 0.8 });',
  '  }',
  '  fish.fear = true;',
  '}',
  'sharks.chase(player);',
  'if (player.size < shark.size) flee();',
];
const CODE_OCEAN = [
  'for (let n = 1; n <= 100; n++) {',
  '  level[n] = makeLevel(n);',
  '  level[n].add(boats, birds);',
  '  level[n].add(seaweed, sharks);',
  '}',
  'sea.fill(ocean);',
];

const smoothstep = (u: number): number => u * u * (3 - 2 * u);
const sat = (u: number): number => Math.max(0, Math.min(1, u));

/** The sea behind the squid, mid-gulp: the squid arms close round the fish being pulled in (u counts through the loop's seam). */
function drawHook(ctx: CanvasRenderingContext2D, r: Rect, u: number): void {
  const surface = r.y + 120;
  drawSea(ctx, r, u + 21, { surfaceY: surface, depth: 0.75 });
  const cx = r.x + r.w * 0.5;
  const cy = r.y + r.h * 0.5;
  const k = smoothstep(sat((u + 0.8) / 2.9));
  const sq = { x: cx - 40, y: cy + 10, width: 1560 };
  drawGameFish(ctx, {
    shape: 'inkling', x: cx + 330 - 290 * k, y: cy + 150 - 90 * k, length: 330 - 200 * k, facing: -1, tilt: 0.25 * k,
    look: { jaw: 0.1 },
  }, u + 21);
  drawGameSquid(ctx, { ...sq, rot: Math.sin(u * 2.4) * 0.02 }, u + 21);
  // Bubbles round the gulp.
  for (let b = 0; b < 7; b++) {
    const ph = (u * 0.7 + b * 0.37) % 1;
    ctx.beginPath();
    ctx.arc(cx - 120 + b * 38 + Math.sin(ph * 9 + b) * 14, cy + 120 - ph * 380, 5 + (b % 3) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(240,250,255,0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function paper(ctx: CanvasRenderingContext2D, r: Rect): void {
  ctx.fillStyle = '#f4eddc';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = paperPattern(ctx);
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

export async function createWeekend(ctx: CanvasRenderingContext2D): Promise<Short> {
  const art: ScreenArt = await loadScreenArt();
  const dewy: DewyImages = await loadDewy();
  const fishLook = fishStill('perch', 640);
  const fishRev: InkReveal = makeInkReveal(fishLook);
  const squidRev: InkReveal = makeInkReveal(squidImage());
  const scratch = makeCanvas(W, H);
  // One width for every pose, so the tallest one's ear tips stay at or below DEWY.topY (the face keeps its size across crossfades).
  const dewyWidth = Math.min(DEWY.width, ...POSES.map((k) => ((DEWY.y - DEWY.topY) * dewy[k].naturalWidth) / dewy[k].naturalHeight));

  /** Saturday 4 pm: the pen inks a lumpy grey fish that wobbles stiffly. */
  const segFish = (t: number): void => {
    const win = drawWindow(ctx, inset(SCR, 18), 'fish.png · ink');
    clipped(ctx, win, () => {
      paper(ctx, win);
      const cx = win.x + win.w / 2;
      const cy = win.y + win.h / 2;
      const wob = t > 4.2 ? Math.sin(Math.floor(t * 4) * 2.1) * 0.07 : 0;
      // The fish is drawn flat on a scratch canvas, then pasted back in strips that sag and bulge: lumpy.
      const sc = scratch.ctx;
      sc.clearRect(0, 0, W, H);
      sc.save();
      sc.translate(cx, cy);
      sc.rotate(wob);
      sc.translate(-cx, -cy);
      const tip = drawInkReveal(sc, fishRev, art.pen, { x: cx, y: cy, width: 780, t, at: 2.75, inkS: 1.5, washS: 0 });
      // Grey fill: flat and a bit wrong.
      const grey = ramp(t, 4.25, 4.5);
      if (grey > 0) {
        sc.globalAlpha = 0.55 * grey;
        sc.filter = 'grayscale(1) contrast(0.9)';
        sc.drawImage(fishLook, cx - 390, cy - (390 * fishLook.height) / fishLook.width, 780, (780 * fishLook.height) / fishLook.width);
        sc.filter = 'none';
      }
      sc.restore();
      const lump = (x: number): number => Math.sin(x * 0.021) * 15 + Math.sin(x * 0.049 + 1) * 9;
      for (let x = win.x; x < win.x + win.w; x += 3) ctx.drawImage(scratch.canvas, x, win.y, 3, win.h, x, win.y + lump(x), 3, win.h);
      void tip;
    });
  };

  /** Six pm: rig bones, the tail swings, the wash floods in. */
  const segTail = (t: number): void => {
    const area = inset(SCR, 18);
    const [artRect, codeRect] = splitV(area, 0.7, 14);
    const win = drawWindow(ctx, artRect, 'fish.png · rig');
    clipped(ctx, win, () => {
      paper(ctx, win);
      const cx = win.x + win.w / 2;
      const cy = win.y + win.h / 2 + 50;
      const width = 700;
      const washAt = 6.95;
      const reveal = t < washAt ? { at: 2.75, inkS: 1.5, washS: 0 } : { at: washAt - 1.5, inkS: 1.5, washS: 0.7 };
      const swing = window01(t, 6.25, 7.3, 0.2) * Math.sin((t - 6.25) * 13) * 0.32;
      const joint = { x: cx - width * 0.145, y: cy };
      const part = (front: boolean): void => {
        ctx.save();
        ctx.beginPath();
        if (front) ctx.rect(joint.x, win.y, win.w, win.h);
        else ctx.rect(win.x, win.y, joint.x - win.x, win.h);
        ctx.clip();
        if (!front) {
          ctx.translate(joint.x, joint.y);
          ctx.rotate(swing);
          ctx.translate(-joint.x, -joint.y);
        }
        drawInkReveal(ctx, fishRev, null, { x: cx, y: cy, width, t, ...reveal });
        ctx.restore();
      };
      part(true);
      part(false);
      drawRigBones(ctx, fishSpinePoints(cx + 8, cy, 400, 1, 0, 6, { t, amount: 0.06 + Math.abs(swing) * 0.5 }), { t, at: 5.95, dur: 0.35, label: 'rig: 6 bones' });
    });
    drawEditor(ctx, { rect: codeRect, t, file: 'fish.ts', code: CODE_FISH, firstLineNo: 88, typing: { at: 6.0, cps: 22 }, fontSize: 30 });
  };

  /** Ten pm: the squid is inked arm by arm. */
  const segSquid = (t: number): void => {
    const win = drawWindow(ctx, inset(SCR, 18), 'squid.png · boss');
    clipped(ctx, win, () => {
      paper(ctx, win);
      drawInkReveal(ctx, squidRev, art.pen, { x: win.x + win.w / 2, y: win.y + win.h / 2 + 20, width: 930, t, at: 8.35, inkS: 1.95, washS: 0.75 });
    });
    const n = countAt(t, 1, 8, 8.5, 10.25, 1);
    drawCounter(ctx, { x: SCR.x + 150, y: SCR.y + 210, label: 'ARMS', value: n.value, fresh: n.fresh });
  };

  /** Eleven pm: a shark fin slices across the code. */
  const segSharks = (t: number): void => {
    const area = inset(SCR, 18);
    const ed = drawEditor(ctx, {
      rect: area, t, file: 'sharks.ts', code: CODE_SHARK, firstLineNo: 212, typing: { at: 11.2, cps: 40 }, fontSize: 34,
      warnings: [{ line: 6, at: 12.1, text: 'sharks.chase(!)' }],
    });
    void ed;
    const waterY = area.y + area.h * 0.52;
    const x = area.x - 260 + (area.w + 520) * smoothstep(sat((t - 11.1) / 1.6));
    clipped(ctx, { x: area.x, y: area.y + 60, w: area.w, h: waterY - area.y - 60 + 6 }, () => {
      drawGameFish(ctx, { shape: 'shark', variant: 'heavy', x, y: waterY + 80, length: 820, facing: 1, tilt: 0.02, effort: 0.8 }, t);
    });
    if (t > 11.1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(240,250,255,0.85)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = -30; k <= 18; k++) {
        const px = x - k * 16;
        const py = waterY + 4 + Math.sin(px / 26 + t * 9) * 5 + Math.max(0, k) * 1.5;
        if (px < area.x || px > area.x + area.w) continue;
        ctx[k === -30 ? 'moveTo' : 'lineTo'](px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
    drawWarningStack(ctx, area.x + area.w * 0.55, area.y + area.h * 0.72, [{ at: 12.2, text: 'shark.spawn ×3' }, { at: 12.6, text: 'player.size < shark.size' }], t);
  };

  /** Sunday: a hundred levels race by while boats, birds and seaweed pop into the sea. */
  const segOcean = (t: number): void => {
    const area = inset(SCR, 18);
    const [left, right] = splitH(area, 0.46, 16);
    drawEditor(ctx, { rect: left, t, file: 'levels.ts', code: CODE_OCEAN, firstLineNo: 1, typing: { at: 13.2, cps: 30 }, fontSize: 26, scrollTo: 0 });
    drawPreview(ctx, {
      rect: right, t, status: '● 100', draw: (c, v) => {
        const surf = v.y + v.h * 0.3;
        drawSea(c, v, t, { surfaceY: surf, depth: 0.6 });
        const weedAt = [15.85, 16.1, 16.3, 16.5, 16.7];
        weedAt.forEach((at, k) => {
          const s = pop(t, at);
          if (s > 0) drawGameWeed(c, (k % 3) as 0 | 1 | 2, v.x + 50 + k * (v.w / 5), v.y + v.h + 8, (200 + (k % 2) * 70) * s, t);
        });
        const bs = pop(t, 15.55);
        if (bs > 0) drawGameBoat(c, 'trawler', { x: v.x + v.w * 0.62, y: surf, width: 330 * bs }, t);
        const gs = pop(t, 15.0);
        if (gs > 0) drawGameBird(c, 'gull', { x: v.x + v.w * 0.3 + Math.sin(t * 2) * 20, y: v.y + 70 + Math.sin(t * 3) * 10, width: 130 * gs, facing: 1 }, t);
        const ts = pop(t, 15.25);
        if (ts > 0) drawGameBird(c, 'tern', { x: v.x + v.w * 0.75, y: v.y + 130, width: 100 * ts, facing: -1 }, t);
        drawGameFish(c, { shape: 'inkling', x: v.x + v.w * 0.4 + Math.sin(t) * 30, y: v.y + v.h * 0.72, length: 120, facing: 1 }, t);
        drawGameFish(c, { shape: 'shark', variant: 'heavy', x: v.x + v.w * 0.72 - Math.sin(t * 0.8) * 40, y: v.y + v.h * 0.55, length: 260, facing: -1 }, t);
      },
    });
    const n = countAt(t, 1, 100, 13.4, 14.55, 1.4);
    drawCounter(ctx, { x: right.x + right.w * 0.5, y: right.y + 190, label: 'LEVEL', value: Math.floor(n.value), fresh: n.fresh });
  };

  /** The cursor wanders over the level map and clicks around helplessly. */
  const segMap = (t: number): void => {
    const target = levelNodeAt(1);
    let node = { x: 0, y: 0 };
    const view = drawPreview(ctx, {
      rect: inset(SCR, 18), t, title: 'InkFish · map', draw: (c, v) => {
        const to = drawLevelMap(c, v, { t, scrollX: 120 + (t - BEAT.map) * 18, done: 0, current: 1 });
        node = to(target.x, target.y);
      },
    });
    const keys = [
      { t: BEAT.map, x: view.x + view.w * 0.7, y: view.y + view.h * 0.3 },
      { t: 17.3, x: view.x + view.w * 0.62, y: view.y + view.h * 0.62, click: true },
      { t: 17.8, x: view.x + view.w * 0.3, y: view.y + view.h * 0.75, click: true },
      { t: 18.3, x: view.x + view.w * 0.5, y: view.y + view.h * 0.35, click: true },
      { t: 18.75, x: view.x + view.w * 0.78, y: view.y + view.h * 0.55, click: true },
      { t: 19.6, x: view.x + view.w * 0.4, y: view.y + view.h * 0.5 },
      { t: 20.5, x: view.x + view.w * 0.55, y: view.y + view.h * 0.45 },
    ];
    void node;
    drawCursor(ctx, art.arrow, 'arrow', cursorAt(keys, t));
  };

  const segTodo = (t: number): void => {
    if (t < 13.15) return;
    drawTodo(ctx, {
      x: SCR.x + 36, y: SCR.y + 300, w: 400, t, title: 'weekend', size: 38, popAt: 13.15,
      items: TODO.map((text, i) => ({ text, tickAt: TODO_TICK[i] })),
    });
  };

  const drawScreen = (t: number): void => {
    clipped(ctx, SCR, () => {
      drawDesktop(ctx, SCR);
      if (t < BEAT.fish || t >= BEAT.back) {
        const u = t >= BEAT.back ? t - LOOP_S : t;
        drawPreview(ctx, { rect: SCR, t, bare: true, draw: (c, v) => drawHook(c, v, u) });
      } else if (t < BEAT.tail) segFish(t);
      else if (t < BEAT.squid) segTail(t);
      else if (t < BEAT.sharks) segSquid(t);
      else if (t < BEAT.ocean) segSharks(t);
      else if (t < BEAT.map) segOcean(t);
      else segMap(t);
      if (t >= BEAT.ocean && t < BEAT.back) segTodo(t);
      if (t >= BEAT.fish && t < BEAT.back) {
        const m = clockAt(CLOCK, t);
        const speed = Math.min(1, Math.abs(clockAt(CLOCK, t + 0.06) - clockAt(CLOCK, t - 0.06)) / 0.12 / 260);
        drawClock(ctx, { x: SCR.x + SCR.w - 260, y: SCR.y + 62, minutes: m, t, speed, popAt: 2.3 });
      }
    });
    drawCredit(t);
    drawGlass(ctx, SCR);
    drawLaptop(ctx, art);
  };

  /** The one credit, inside the screen at the bottom centre (the standard spot would land on Dewy). */
  const drawCredit = (t: number): void => {
    const a = creditAt(t, LOOP_S) / 0.75;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 29px ${CAPTION_FONT}`;
    const w = ctx.measureText('InkFish · 16bit.ink').width + 44;
    ctx.fillStyle = 'rgba(10,13,22,0.62)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - w / 2, 835 - 33, w, 46, 23);
    ctx.fill();
    ctx.restore();
    drawTextLine(ctx, 'InkFish · 16bit.ink', W / 2, 835, 29, 700, a * 0.9, PAPER_ON_DARK);
  };

  const drawCaption = (t: number): void => {
    const now = captionAt(t);
    if (!now) return;
    const words = now.line.words.map((w) => w.text);
    ctx.save();
    ctx.font = `700 ${CAPTION.size}px ${CAPTION_FONT}`;
    const space = ctx.measureText(' ').width;
    const natural = words.map((w) => ctx.measureText(w).width);
    ctx.restore();
    const total = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
    const k = Math.min(1, CAPTION.maxW / total);
    let x = W / 2 - (total * k) / 2;
    words.forEach((w, i) => {
      const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
      drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION.y, CAPTION.size * k, 700, i <= now.word ? 1 : 0.55, colours);
      x += (natural[i]! + space) * k;
    });
  };

  const moodAt = (t: number): { from: DewyKey; to: DewyKey; changeAt: number } => {
    let i = 0;
    MOODS.forEach((m, k) => {
      if (t >= m.at) i = k;
    });
    const cur = MOODS[i]!;
    const prev = i === 0 ? MOODS[MOODS.length - 1]! : MOODS[i - 1]!;
    return { from: prev.key, to: cur.key, changeAt: cur.at };
  };
  const talking = (t: number): number => (SPEECH_WORDS.some((w) => t >= w.start - 0.05 && t <= w.end + 0.08) ? 1 : 0);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const room = ctx.createLinearGradient(0, 0, 0, H);
    room.addColorStop(0, '#2b2f3d');
    room.addColorStop(1, '#171923');
    ctx.fillStyle = room;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = paperPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    drawScreen(t);
    const mood = moodAt(t);
    drawDewy(ctx, dewy, { t, x: DEWY.x, y: DEWY.y, width: dewyWidth, ...mood, talking: talking(t), speech: { words: SPEECH_WORDS, envelope: ENVELOPE as number[] } });
    drawCaption(t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderWeekendAudio };
}
