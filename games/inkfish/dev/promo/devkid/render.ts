import { drawTextLine, CAPTION_FONT, type TextInk } from '../captions';
import { creditAt, PAPER_ON_DARK } from '../credit';
import { drawDewy, loadDewy, type DewyImages, type DewyKey } from '../devstory/dewy';
import {
  clipped, drawCrt, drawDesktop, drawEditor, drawGlass, drawInkReveal, drawLaptop, drawMorph, drawWindow, fishStill, inset, LAPTOP_SCREEN,
  loadScreenArt, makeInkReveal, morphScreen, paperPattern, pop, splitV, typingDuration, type Rect,
} from '../devstory/screen';
import { PAPER } from '../../../src/art/pen';
import { ramp, VIDEO, type Short } from '../short';
import { renderDevkidAudio } from './audio';
import envelope from './envelope.json';
import { crtSea, introSea, swallowSea } from './scenes';
import { ALIVE_AT, BUILD_AT, captionAt, crtAmount, EMPTY_AT, LOOP_S, MORPH_IN, POSES, talking } from './story';
import { WORDS } from './words';

/** "I Remade My Favorite Childhood Game In One Weekend" (story.ts has the timeline). */
const W = VIDEO.width;
const H = VIDEO.height;
const SPOKEN = '#f5c84a';
const CAPTION_Y = 985;
const CAPTION_SIZE = 96;
const PAPER_ON_INK: TextInk = PAPER_ON_DARK;
const DEWY_X = 540;
const DEWY_BOTTOM = 1930;
const FADE = 0.15;
/** Every pose is fitted to the same height (ear tips at or below y 990, bottom cut by the frame), at most MAX_W wide. */
const FIT_H = 940;
const MAX_W = 1000;
/** Widths that keep the face about the same size across crossfades (the wide busts would otherwise come out huge). */
const POSE_W: Partial<Record<DewyKey, number>> = { moved: 800, laughing: 820 };
const CODE = [
  "import { fish } from './art';",
  '',
  'export function makeFish() {',
  '  const f = ink(fish.outline);',
  '  f.wash("sea-blue");',
  '  f.eat(smallerFish);',
  '  return f.grow();',
  '}',
];

/** The pose list as drawDewy calls: each pose fades in over the previous one. Kid poses never lip-sync. */
function drawDewySeq(ctx: CanvasRenderingContext2D, dewy: DewyImages, t: number): void {
  const idx = POSES.reduce((acc, p, i) => (t >= p.at ? i : acc), 0);
  const cur = POSES[idx]!;
  const prev = POSES[idx - 1] ?? POSES[POSES.length - 1]!;
  const mix = idx === 0 ? 1 : Math.min(1, (t - cur.at) / FADE);
  const one = (key: DewyKey, alpha: number): void => {
    const kid = key.startsWith('kid');
    const img = dewy[key];
    const width = POSE_W[key] ?? Math.min(FIT_H * (img.naturalWidth / img.naturalHeight), MAX_W);
    drawDewy(ctx, dewy, {
      t, x: DEWY_X, y: DEWY_BOTTOM, width, from: key, alpha,
      talking: kid ? 0 : talking(t), speech: kid ? undefined : { words: WORDS, envelope },
    });

  };
  if (mix < 1) one(prev.key, 1);
  one(cur.key, mix);
}

/** The glow from the machine down onto young Dewy (the CRT's light on his face). */
function drawGlow(ctx: CanvasRenderingContext2D, t: number, u: number): void {
  const a = 0.16 * u * (0.9 + 0.1 * Math.sin((2 * Math.PI * 53 * t) / LOOP_S));
  if (a <= 0) return;
  const g = ctx.createRadialGradient(560, 880, 60, 560, 1250, 640);
  g.addColorStop(0, `rgba(170,215,255,${a * 1.6})`);
  g.addColorStop(1, 'rgba(170,215,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 880, W, 1040);
}

function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const words = now.line.words.map((w) => w.text);
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w).width);
  const total = widths.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  let x = W / 2 - total / 2;
  ctx.restore();
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: '#05091a' } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + widths[i]! / 2, CAPTION_Y, CAPTION_SIZE, 700, i <= now.word ? 1 : 0.55, colours);
    x += widths[i]! + space;
  });
}

/** The one credit, inside the screen at its bottom centre (never over Dewy): small text on a dark translucent pill. */
function drawCredit(ctx: CanvasRenderingContext2D, r: Rect, alpha: number): void {
  if (alpha <= 0) return;
  const size = 29;
  const base = r.y + r.h - 33;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText('InkFish · 16bit.ink').width + 36;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(10,14,28,0.55)';
  ctx.beginPath();
  ctx.roundRect(r.x + r.w / 2 - w / 2, base - size * 0.95, w, size * 1.4, size * 0.7);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, 'InkFish · 16bit.ink', r.x + r.w / 2, base, size, 700, alpha / 0.75, PAPER_ON_INK);
}

export async function createDevkid(ctx: CanvasRenderingContext2D): Promise<Short> {
  const [art, dewy] = await Promise.all([loadScreenArt(), loadDewy()]);
  const reveal = makeInkReveal(fishStill('inkling', 700));
  const scr = LAPTOP_SCREEN;
  const layer = (alpha: number, fn: () => void): void => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    fn();
    ctx.restore();
  };

  const emptyWindow = (t: number): void => {
    const win = drawWindow(ctx, inset(scr, 50), 'untitled.png');
    clipped(ctx, win, () => {
      ctx.fillStyle = PAPER;
      ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.fillStyle = paperPattern(ctx);
      ctx.fillRect(win.x, win.y, win.w, win.h);
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = '#1b1a1f';
        ctx.fillRect(win.x + win.w / 2 - 2, win.y + win.h / 2 - 46, 5, 92);
      }
    });
  };

  const buildWindows = (t: number): void => {
    const area = inset(scr, 18);
    const [top, bottom] = splitV(area, 0.64, 14);
    const s = Math.max(0.001, pop(t, BUILD_AT, 0.3));
    ctx.save();
    ctx.translate(scr.x + scr.w / 2, scr.y + scr.h / 2);
    ctx.scale(s, s);
    ctx.translate(-(scr.x + scr.w / 2), -(scr.y + scr.h / 2));
    const win = drawWindow(ctx, top, 'fish.png · ink');
    clipped(ctx, win, () => {
      ctx.fillStyle = PAPER;
      ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.fillStyle = paperPattern(ctx);
      ctx.fillRect(win.x, win.y, win.w, win.h);
    });
    drawInkReveal(ctx, reveal, art.pen, { x: win.x + win.w / 2, y: win.y + win.h / 2 + 10, width: win.w * 0.78, t, at: BUILD_AT + 0.3, inkS: 1.3, washS: 0.55 });
    drawEditor(ctx, { rect: bottom, t, file: 'fish.ts', code: CODE, typing: { at: BUILD_AT + 0.2, cps: 38 }, fontSize: 26, firstLineNo: 1 });
    ctx.restore();
  };

  const draw = (tRaw: number): void => {
    const t = ((tRaw % LOOP_S) + LOOP_S) % LOOP_S;
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

    const u = crtAmount(t);
    const r = morphScreen(u);
    drawGlow(ctx, t, u);
    clipped(ctx, r, () => {
      drawDesktop(ctx, r);
      if (t < EMPTY_AT + 0.6 || t >= MORPH_IN) {
        const seaA = t < EMPTY_AT ? 1 : t < EMPTY_AT + 0.6 ? 1 - ramp(t, EMPTY_AT, EMPTY_AT + 0.6) : 0;
        if (t < EMPTY_AT + 0.6) layer(seaA, () => crtSea(ctx, r, t));
      }
      layer(ramp(t, EMPTY_AT + 0.3, EMPTY_AT + 0.8) * (1 - ramp(t, BUILD_AT, BUILD_AT + 0.1)), () => emptyWindow(t));
      layer(ramp(t, BUILD_AT, BUILD_AT + 0.1) * (1 - ramp(t, ALIVE_AT, ALIVE_AT + 0.2)), () => buildWindows(t));
      layer(ramp(t, ALIVE_AT, ALIVE_AT + 0.2) * (1 - ramp(t, MORPH_IN, MORPH_IN + 0.5)), () => swallowSea(ctx, r, t));
      layer(ramp(t, MORPH_IN, MORPH_IN + 0.5), () => introSea(ctx, r, t));
    });
    drawCredit(ctx, r, creditAt(t, LOOP_S));
    drawGlass(ctx, r, u);
    drawMorph(ctx, art, u);
    drawDewySeq(ctx, dewy, t);
    drawCaption(ctx, t);
  };
  void drawCrt; void drawLaptop; void typingDuration; void (null as unknown as Rect);
  return { loopSeconds: LOOP_S, draw, audio: renderDevkidAudio };
}
