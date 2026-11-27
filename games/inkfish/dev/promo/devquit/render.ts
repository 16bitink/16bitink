import { PAPER } from '../../../src/art/pen';
import { drawTextLine, CAPTION_FONT, type TextInk } from '../captions';
import { creditAt } from '../credit';
import { drawDewy, loadDewy, type DewyImages, type DewyKey } from '../devstory/dewy';
import {
  clipped, cursorAt, drawCounter, drawCursor, drawDesktop, drawEditor, drawGameFish, drawGlass, drawLaptop, drawMessage, drawPreview, drawReadout,
  drawWindow, inset, LAPTOP_SCREEN, loadScreenArt, paperPattern, pop, ramp, splitV, typingDuration, type Rect, type ScreenArt,
} from '../devstory/screen';
import { VIDEO, type Short } from '../short';
import { renderDevQuitAudio } from './audio';
import envelope from './envelope.json';
import { BEAT, captionAt, LOOP_S, MOODS, wrap, type Mood } from './story';
import {
  drawBaitScene, drawEventBanner, drawFlipThumb, drawFleetScene, drawHunterScene, drawLevel, drawPausedLevel, FLIP_KINDS, label,
} from './scenes';
import { WORDS } from './words';

/**
 * "The First Person To Play My Game Quit At Level 6": Dewy's screen (the shared kit) over his hurt bust.
 *  0.0  level 6 paused, the playtester's message popped in, Dewy hurt        3.4  a grid of level thumbnails that look alike
 *  6.3  starting tiny, level after level                                    11.9 Dewy types; the thumbnails flip into different scenes
 * 15.0  the game's real events cut in full-monitor: fleet, bait ball, hunter  18.6 back on level 6, the cursor over Quit
 */
const W = VIDEO.width;
const H = VIDEO.height;
const SCR = LAPTOP_SCREEN;
const BUBBLE_TEXT = 'every level feels the same';
const SPOKEN: TextInk = { fill: '#ffd36a', halo: '#05091a' };
const UNSPOKEN: TextInk = { fill: PAPER, halo: '#05091a' };
const CAPTION = { y: 935, y2: 1020, size: 96, maxW: 980 } as const;

/** The cursor's way to Quit; it rests there at the loop point and again in frame 1. */
const QUIT_CURSOR = [
  { t: BEAT.quit, x: SCR.x + 760, y: SCR.y + 700 }, { t: 19.6, x: SCR.x + 560, y: SCR.y + 470 }, { t: 20.4, x: SCR.x + 640, y: SCR.y + 400 }, { t: LOOP_S, x: SCR.x + 650, y: SCR.y + 400 },
];

const CODE = [
  'for (const level of levels) {',
  '  level.start = TINY;',
  '  level.events = pick(SEA_EVENTS);',
  '  level.twist = nextTwist();',
  '}',
];

function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  let index = 0;
  now.line.rows.forEach((row, r) => {
    const words = row.map((w) => w.text);
    ctx.save();
    ctx.font = `700 ${CAPTION.size}px ${CAPTION_FONT}`;
    const space = ctx.measureText(' ').width;
    const natural = words.map((w) => ctx.measureText(w).width);
    ctx.restore();
    const total = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
    const k = Math.min(1, CAPTION.maxW / total);
    let x = W / 2 - (total * k) / 2;
    for (const [i, w] of words.entries()) {
      const at = index++;
      drawTextLine(ctx, w, x + (natural[i]! * k) / 2, r === 0 ? CAPTION.y : CAPTION.y2, CAPTION.size * k, 700, at <= now.word ? 1 : 0.6, at === now.word ? SPOKEN : UNSPOKEN);
      x += (natural[i]! + space) * k;
    }
  });
}

/** Thumbnail grid cells inside `area`. */
function gridCells(area: Rect, cols: number, rows: number, gap: number): Rect[] {
  const w = (area.w - gap * (cols - 1)) / cols;
  const h = (area.h - gap * (rows - 1)) / rows;
  return Array.from({ length: cols * rows }, (_, i) => ({ x: area.x + (i % cols) * (w + gap), y: area.y + Math.floor(i / cols) * (h + gap), w, h }));
}

/** The level grid. `flip`: seconds each thumbnail turns into something new start at flipFrom (none before). */
function drawGrid(c: CanvasRenderingContext2D, area: Rect, t: number, cols: number, rows: number, flipFrom: number | null, quitPinAt: number | null): void {
  gridCells(area, cols, rows, 10).forEach((cell, i) => {
    const kind = FLIP_KINDS[i % FLIP_KINDS.length]!;
    const u = flipFrom === null ? 0 : ramp(t, flipFrom + i * 0.095, flipFrom + i * 0.095 + 0.28);
    c.save();
    clipped(c, cell, () => {
      if (u > 0 && u < 1) {
        c.fillStyle = '#141a28';
        c.fillRect(cell.x, cell.y, cell.w, cell.h);
      }
    }, 10);
    if (u > 0 && u < 1) drawFlipThumb(c, cell, t, kind, u);
    else clipped(c, cell, () => drawLevel(c, cell, 1.7, u >= 1 ? kind : 'plain'), 10);
    c.strokeStyle = 'rgba(244,237,220,0.55)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.roundRect(cell.x, cell.y, cell.w, cell.h, 10);
    c.stroke();
    label(c, String(i + 1), cell.x + 28, cell.y + 26, 40);
    c.restore();
  });
  const cell = gridCells(area, cols, rows, 10)[5]!;
  if (quitPinAt !== null) {
      const s = pop(t, quitPinAt, 0.35);
      if (s > 0) {
        c.save();
        c.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
        c.scale(s, s);
        c.strokeStyle = '#d63a2e';
        c.lineWidth = 8;
        c.beginPath();
        c.roundRect(-cell.w / 2 - 4, -cell.h / 2 - 4, cell.w + 8, cell.h + 8, 14);
        c.stroke();
        c.restore();
        label(c, 'quit here', cell.x + cell.w / 2, cell.y + cell.h + 2, 40, '#d63a2e', '#f4eddc');
      }
  }
}

export async function createDevQuit(ctx: CanvasRenderingContext2D): Promise<Short> {
  const art: ScreenArt = await loadScreenArt();
  const dewy: DewyImages = await loadDewy();
  const speech = { words: WORDS, envelope: envelope as number[] };

  const poseDraw = (pose: Mood, t: number, alpha: number): void => {
    const img = dewy[pose as DewyKey];
    const aspect = img.naturalWidth / img.naturalHeight;
    const width = aspect > 1 ? 960 : 935 * aspect;
    drawDewy(ctx, dewy, { t, x: W / 2, y: H + 6, width, from: pose, alpha, speech });
  };
  const drawDewyMoods = (t: number): void => {
    const i = MOODS.reduce((n, m, k) => (t >= m.at ? k : n), 0);
    const cur = MOODS[i]!;
    const mix = i === 0 ? 1 : ramp(t, cur.at, cur.at + 0.15);
    if (mix < 1) poseDraw(MOODS[i - 1]!.pose, t, 1);
    poseDraw(cur.pose, t, mix);
  };

  const drawMonitor = (t: number): void => {
    clipped(ctx, SCR, () => {
      drawDesktop(ctx, SCR);
      const win = inset(SCR, 18);
      if (t < BEAT.grid) {
        drawPreview(ctx, { rect: win, t, title: 'InkFish · level 6', status: '❚❚ paused', draw: (c, v) => void drawPausedLevel(c, v, true) });
        const rest = cursorAt(QUIT_CURSOR, LOOP_S);
        drawCursor(ctx, art.hand, 'hand', { x: rest.x, y: rest.y, clickAge: Infinity });
      } else if (t < BEAT.tiny) {
        const inner = drawWindow(ctx, win, 'levels · chapter 1');
        drawGrid(ctx, { x: inner.x + 12, y: inner.y + 12, w: inner.w - 24, h: 470 }, t, 5, 3, null, BEAT.grid + 1.85);
      } else if (t < BEAT.flip) drawTiny(t, win);
      else if (t < BEAT.fleet) drawFlip(t, win);
      else if (t < BEAT.quit) drawEvents(t);
      else {
        let quit: Rect = { x: 0, y: 0, w: 0, h: 0 };
        const cur = cursorAt(QUIT_CURSOR, t);
        const hover = true;
        drawPreview(ctx, { rect: win, t, title: 'InkFish · level 6', status: '❚❚ paused', draw: (c, v) => { quit = drawPausedLevel(c, v, hover); } });
        void quit;
        drawCursor(ctx, art.hand, 'hand', { x: cur.x, y: cur.y, clickAge: Infinity });
      }
    });
  };

  function drawTiny(t: number, win: Rect): void {
    const level = t < 7.4 ? 6 : t < 8.45 ? 7 : t < 9.5 ? 8 : 9;
    const born = t < 7.4 ? BEAT.tiny : t < 8.45 ? 7.4 : t < 9.5 ? 8.45 : 9.5;
    const eatAt = 11.0;
    drawPreview(ctx, {
      rect: win, t, title: `InkFish · level ${level}`, status: '● playing', draw: (c, v) => {
        drawLevel(c, { x: v.x, y: v.y, w: v.w, h: v.h }, t, 'plain');
        // The tiny fish is drawn by drawLevel at a frozen size; cover it with a live one: a smaller shape, popping in at each start.
        const s = pop(t, born, 0.3);
        const grown = ramp(t, eatAt, eatAt + 0.5);
        const x = v.x + v.w * 0.3 + (t > 10.3 ? ramp(t, 10.3, eatAt) * 120 : 0);
        const y = v.y + v.h * 0.58;
        if (t > 10.2 && t < eatAt + 0.05) drawGameFish(c, { shape: 'anchovy', x: x + 190 - ramp(t, 10.2, eatAt) * 70, y: y - 6, length: 46, facing: -1 }, t);
        c.save();
        c.translate(x, y);
        c.scale(s, s);
        drawGameFish(c, { shape: 'inkling', x: 0, y: 0, length: 74 + grown * 22, facing: 1 }, t);
        c.restore();
        if (born > 7 && t - born < 0.3) {
          c.fillStyle = `rgba(255,255,255,${0.35 * (1 - (t - born) / 0.3)})`;
          c.fillRect(v.x, v.y, v.w, v.h);
        }
        drawCounter(c, { x: v.x + v.w / 2, y: v.y + 150, label: 'SIZE', value: t > eatAt + 0.1 ? 2 : 1, fresh: pop(t, eatAt + 0.1, 0.3) > 0 && t < eatAt + 0.5 ? 1 : 0 });
        drawReadout(c, v.x + 30, v.y + v.h - 50, { label: 'level', value: level, t });
      },
    });
  }

  function drawFlip(t: number, win: Rect): void {
    const [top, bottom] = splitV(win, 0.34, 12);
    const typeAt = 12.15;
    drawEditor(ctx, {
      rect: top, t, file: 'levels.ts', code: CODE, firstLineNo: 1, typing: { at: typeAt, cps: 30, fromLine: 1 },
      highlight: { line: 2, at: typeAt + typingDuration(CODE, 30, 1) * 0.5 }, fontSize: 28,
    });
    const inner = drawWindow(ctx, bottom, 'levels · chapter 1');
    drawGrid(ctx, inset(inner, 10), t, 5, 4, 13.0, null);
  }

  function drawEvents(t: number): void {
    const v = SCR;
    const clipView = (draw: (c: CanvasRenderingContext2D, r: Rect) => void): void => void drawPreview(ctx, { rect: v, t, bare: true, draw });
    if (t < BEAT.bait) {
      clipView((c, r) => { drawFleetScene(c, r, t, t - BEAT.fleet); drawEventBanner(c, r, t, BEAT.fleet + 0.05, 'fleet'); });
    } else if (t < BEAT.hunter) {
      clipView((c, r) => { drawBaitScene(c, r, t, t - BEAT.bait); drawEventBanner(c, r, t, BEAT.bait + 0.05, 'baitball'); });
    } else {
      clipView((c, r) => { drawHunterScene(c, r, t, t - BEAT.hunter); drawEventBanner(c, r, t, BEAT.hunter + 0.05, 'prowler'); });
    }
  }

  const bubble = (t: number): void => {
    const show = t < BEAT.tiny + 0.1 || t >= BEAT.quit + 0.1;
    if (!show) return;
    const at = t >= BEAT.quit ? BEAT.quit + 0.1 : -1;
    drawMessage(ctx, { x: 70, y: 600, maxW: 860, text: BUBBLE_TEXT, t, at, typingS: 0, from: 'playtester', size: 60 });
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    drawMonitor(t);
    drawGlass(ctx, SCR);
    drawLaptop(ctx, art);
    bubble(t);
    drawDewyMoods(t);
    drawCaption(ctx, t);
    const credit = creditAt(t, LOOP_S);
    if (credit > 0) {
      ctx.save();
      ctx.globalAlpha = credit / 0.75;
      ctx.fillStyle = 'rgba(8,12,22,0.6)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 170, 800, 340, 50, 25);
      ctx.fill();
      ctx.restore();
      drawTextLine(ctx, 'InkFish · 16bit.ink', W / 2, 836, 29, 700, credit, UNSPOKEN);
    }
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderDevQuitAudio };
}
