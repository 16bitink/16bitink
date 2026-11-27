import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { creditAt, PAPER_ON_DARK } from '../credit';
import { VIDEO, type Short } from '../short';
import { drawDewy, loadDewy, type DewyKey, type DewyImages } from '../devstory/dewy';
import {
  clipped, drawDesktop, drawEditor, drawGlass, drawLaptop, drawLog, drawPreview, drawWarningStack, inset, lerpRect, LAPTOP_SCREEN, loadScreenArt, paperPattern, ramp,
  smooth, splitH, splitV, typingDuration, type Rect,
} from '../devstory/screen';
import { renderDucksAudio } from './audio';
import { drawEscapes } from './escape';
import envelope from './envelope.json';
import { captionAt } from './script';
import { ENDS_AT, ESCAPE_AT, FLYING_AT, fullAt, LOOP_S, MISS_AT, MOODS, ONE_AT, SURFACE_AT, wrap } from './story';
import { drawWorld } from './world';
import { WORDS } from './words';

const W = VIDEO.width;
const H = VIDEO.height;
const SPOKEN = '#ffcf52';
const HALO = '#05091a';
const PAPER_ON_INK: TextInk = { fill: '#f7f0df', halo: HALO };
const CAPTION_Y = 1010;
const CAPTION_SIZE = 92;
const CAPTION_MAX_W = 980;
const DEWY_BOTTOM = 1935;
const DEWY_SCALE = 0.66;
const DEWY_MAX_W = 1060;
const NIGHT_TINT = 'rgba(30,50,130,0.2)';

const CODE_FIX = '  if (duck.y < surfaceY) duck.y = surfaceY;';
const CODE_BEFORE = ['// rubber duck decoy', '', 'function floatDuck(duck) {', '  sharks.chase(duck);', '  duck.vy -= LIFT * dt;', '  duck.y += duck.vy * dt;', '}'];
const CODE_AFTER = [...CODE_BEFORE.slice(0, 6), CODE_FIX, '}'];
const CODE_COMMENTED = [...CODE_BEFORE.slice(0, 6), `  // ${CODE_FIX.trim()}`, '}'];
const FIX_LINE = 6;
const TYPE_AT = ONE_AT + 0.25;
const TYPE_CPS = 40;
const TYPED_AT = TYPE_AT + typingDuration(CODE_AFTER, TYPE_CPS, FIX_LINE) - 0.3;
/** The editor is whole-width from here to (back to its normal size by) SURFACE_AT + 0.35. */
const WIDE_FROM = ONE_AT - 0.3;
const WIDE_TO = ONE_AT + 0.1;
const NARROW_FROM = SURFACE_AT - 0.1;
const NARROW_TO = SURFACE_AT + 0.35;
const UNDO_AT = FLYING_AT + 0.5;

const LOG_BASE = [
  { at: -1, text: 'level 22 loaded' },
  { at: -1, text: 'sea: night (3:07)' },
  { at: -1, text: 'decoy: 3 ducks out' },
];
const LOG_ROWS = [
  ...LOG_BASE,
  { at: ENDS_AT + 0.35, text: 'duck.y < 0', kind: 'warn' as const },
  { at: ENDS_AT + 1.0, text: 'duck left the sea', kind: 'error' as const },
  { at: ENDS_AT + 1.7, text: 'no ceiling found', kind: 'error' as const },
  { at: ENDS_AT + 2.4, text: 'shark #3 followed', kind: 'error' as const },
];
const TOASTS = [
  { at: ENDS_AT + 0.3, text: 'duck.y < surfaceY' },
  { at: ENDS_AT + 0.95, text: 'duck left the sea!' },
  { at: ENDS_AT + 1.6, text: 'shark #3 followed' },
];

function caption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / total);
  let x = W / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: HALO } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.6, colours);
    x += (natural[i]! + space) * k;
  });
}

/** Dewy's pose at t: the current mood, crossfading from the one before it. */
function moodAt(t: number): { from: DewyKey; to: DewyKey; changeAt: number } {
  let i = 0;
  while (i < MOODS.length - 1 && t >= MOODS[i + 1]!.at) i++;
  const prev = MOODS[Math.max(0, i - 1)]!.key;
  return { from: i === 0 ? MOODS[0].key : prev, to: MOODS[i]!.key, changeAt: MOODS[i]!.at };
}

/** The credit lives inside the laptop screen, bottom centre, on a dark pill (it never lands on Dewy). */
function drawCredit(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `700 30px ${CAPTION_FONT}`;
  const w = ctx.measureText('InkFish · 16bit.ink').width + 44;
  ctx.globalAlpha = Math.min(1, alpha / 0.75);
  ctx.fillStyle = 'rgba(8,12,24,0.6)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - w / 2, 800, w, 46, 23);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, 'InkFish · 16bit.ink', W / 2, 835, 30, 700, alpha, PAPER_ON_DARK);
}

export async function createDucks(ctx: CanvasRenderingContext2D): Promise<Short> {
  const art = await loadScreenArt();
  const dewy = await loadDewy();
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lctx = layer.getContext('2d')!;
  const scr = LAPTOP_SCREEN;
  const area = inset(scr, 18);
  const [editorRect, previewRect] = splitH(area, 0.54, 16);
  const [codeRect, logRect] = splitV(editorRect, 0.6, 14);
  // The preview's viewport (what drawPreview returns) in the normal layout, for the things that fly out of it.
  const scratch = document.createElement('canvas').getContext('2d')!;
  const view = drawPreview(scratch, { rect: previewRect, t: 0, draw: () => undefined });

  // One scale for every pose (the face keeps its size across crossfades); the tallest pose's ear tips sit at ~y 1015.
  const widthOf = (key: DewyKey): number => Math.min(DEWY_MAX_W, dewy[key].naturalWidth * DEWY_SCALE);

  const drawDewyLayer = (t: number): void => {
    lctx.clearRect(0, 0, W, H);
    const m = moodAt(t);
    drawDewy(lctx, dewy as DewyImages, {
      t, x: W / 2, y: DEWY_BOTTOM, width: widthOf(m.to), from: m.from, to: m.to, changeAt: m.changeAt, talking: 0,
      speech: { words: WORDS, envelope },
    });
    lctx.save();
    lctx.globalCompositeOperation = 'source-atop';
    lctx.fillStyle = NIGHT_TINT;
    lctx.fillRect(0, 0, W, H);
    lctx.restore();
    ctx.drawImage(layer, 0, 0);
  };

  const screen = (t: number): void => {
    drawDesktop(ctx, scr);
    const wide = ramp(t, WIDE_FROM, WIDE_TO) * (1 - ramp(t, NARROW_FROM, NARROW_TO));
    const pv = 1 - wide * 0.0;
    const code = t < ONE_AT - 0.2 || t >= UNDO_AT ? CODE_BEFORE : t >= FLYING_AT - 0.1 ? CODE_COMMENTED : CODE_AFTER;
    const typing = t >= ONE_AT - 0.2 && t < FLYING_AT - 0.1 ? { at: TYPE_AT, cps: TYPE_CPS, fromLine: FIX_LINE } : undefined;
    const full = smooth(Math.min(1, Math.max(0, fullAt(t))));
    const drawPrev = (): void => {
      drawPreview(ctx, {
        rect: lerpRect(previewRect, area, full), t, status: '● 3:07', alpha: pv,
        draw: (c, r) => drawWorld(c, r, t, { skyDucks: 1, water: true, k: r.w / view.w }),
      });
    };
    if (full <= 0) drawPrev();
    // Editor + console.
    const rect = lerpRect(codeRect, area, smooth(wide));
    const caret = drawEditor(ctx, {
      rect, t, file: 'decoy.ts', code, firstLineNo: 41, typing, fontSize: 26,
      highlight: t >= TYPED_AT && t < UNDO_AT ? { line: FIX_LINE, at: TYPED_AT } : undefined,
      warnings: t >= ENDS_AT + 0.2 && t < ONE_AT + 0.1 ? [{ line: 5, at: ENDS_AT + 0.2 }] : [],
      scrollTo: 0,
    });
    void caret;
    if (wide < 1) drawLog(ctx, { rect: logRect, t, rows: t >= UNDO_AT ? LOG_BASE : LOG_ROWS, alpha: 1 - wide });
    if (full > 0) drawPrev();
    if (t >= ENDS_AT + 0.3 && t < ONE_AT - 0.1 && full <= 0) drawWarningStack(ctx, editorRect.x + editorRect.w / 2, codeRect.y + codeRect.h - 40, TOASTS, t, 26);
  };

  const draw = (tRaw: number): void => {
    const t = wrap(tRaw);
    const room = ctx.createLinearGradient(0, 0, 0, H);
    room.addColorStop(0, '#1b2440');
    room.addColorStop(1, '#0c1226');
    ctx.fillStyle = room;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = paperPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    clipped(ctx, scr, () => screen(t));
    drawGlass(ctx, scr);
    drawLaptop(ctx, art);
    drawEscapes(ctx, t, view);
    drawDewyLayer(t);
    caption(ctx, t);
    const a = creditAt(t, LOOP_S);
    drawCredit(ctx, a);
  };
  void ESCAPE_AT;
  void MISS_AT;
  return { loopSeconds: LOOP_S, draw, audio: renderDucksAudio };
}
