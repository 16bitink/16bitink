import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { withCredit } from '../credit';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { pt } from '../../../src/art/kit';
import { renderSecretaryAudio } from './audio';
import { drawBird } from './bird';
import { bakeCast, type Cast } from './cast';
import { drawCta } from './cta';
import { drawLab } from './lab';
import { drawBlink, drawFace, drawMeet } from './shots';
import { drawSnake } from './snake';
import { SN } from './paint';
import { captionAt, CREDIT, HOOK_LINES, hookAlpha, hookWord, LINES, LOOP_S, sceneAt, TEXT, wrap } from './story';
import type { Word } from './words';
import { drawHook, drawKick } from './world';

/** Short #134, "This Bird Hunts Snakes By Kicking Them": the frame, the captions, and (here, not in main.ts) the credit. */
const MAX_W = 980;
const HOT = '#ffd27a';
const DIM = 0.55;

interface Spoken {
  readonly words: readonly Word[];
  readonly now: number;
  readonly y: number;
  readonly size: number;
  readonly unsaid: number;
  readonly alpha: number;
  readonly ink: TextInk;
}

function drawLine(ctx: CanvasRenderingContext2D, s: Spoken): void {
  ctx.save();
  ctx.font = `700 ${s.size}px Caveat`;
  const space = ctx.measureText(' ').width;
  const widths = s.words.map((w) => ctx.measureText(w.text).width);
  ctx.restore();
  const total = widths.reduce((sum, w) => sum + w, 0) + space * (s.words.length - 1);
  const k = Math.min(1, MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  s.words.forEach((w, i) => {
    const ink = i === s.now ? { fill: HOT, halo: s.ink.halo } : s.ink;
    drawTextLine(ctx, w.text, x + (widths[i]! * k) / 2, s.y, s.size * k, 700, s.alpha * (i <= s.now ? 1 : s.unsaid), ink);
    x += (widths[i]! + space) * k;
  });
}

function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  const hook = hookAlpha(t);
  if (hook > 0) {
    let now = hookWord(t);
    LINES.slice(0, HOOK_LINES).forEach((l, i) => {
      drawLine(ctx, { words: l.words, now, y: TEXT.hook.y + i * TEXT.hook.gap, size: TEXT.hook.size, unsaid: 1, alpha: hook, ink: PAPER_ON_DARK });
      now -= l.words.length;
    });
  }
  const c = captionAt(t);
  if (c) drawLine(ctx, { words: c.line.words, now: c.word, y: TEXT.line.y, size: TEXT.line.size, unsaid: DIM, alpha: 1, ink: PAPER_ON_DARK });
}

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const scene = sceneAt(t);
  if (scene === 'hook') drawHook(ctx, cast, t, boil);
  else if (scene === 'meet') drawMeet(ctx, cast, t, boil);
  else if (scene === 'face') drawFace(ctx, t, boil);
  else if (scene === 'kick') drawKick(ctx, cast, t, boil);
  else if (scene === 'timed') drawLab(ctx, t, boil);
  else drawBlink(ctx, t, boil);
  drawCta(ctx, cast.game, t, boil);
  drawWords(ctx, t);
}

/** ?kit: the bird standing and mid-kick, its head close, and the snake, side by side. */
function drawKit(ctx: CanvasRenderingContext2D, cast: Cast, boil: number): void {
  ctx.drawImage(cast.bg.meet, -120, -120);
  drawBird(ctx, {
    at: pt(300, 700), scale: 3.6, tilt: -0.1, wings: 0, ground: 66, head: { at: pt(34, -49), ang: -0.06, look: { lid: 0, crest: 0.4 } },
    near: { foot: pt(10, 66), grip: 'flat' }, far: { foot: pt(-9, 66), grip: 'flat' },
  }, boil);
  drawBird(ctx, {
    at: pt(760, 700), scale: 3.6, tilt: 0.12, wings: 1, ground: 66, head: { at: pt(48, -24), ang: 0.6, look: { lid: 0, crest: 1 } },
    near: { foot: pt(60, 32), grip: 'curl', toe: 0.35, knee: pt(16, 4) }, far: { foot: pt(-6, 66), grip: 'flat' },
  }, boil);
  drawSnake(ctx, { knots: [pt(120, 1700), pt(260, 1730), pt(420, 1700), pt(600, 1740), pt(760, 1720), pt(900, 1760)], width: 70, paint: SN }, boil);
}

export function createSecretary(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  const kit = new URLSearchParams(location.search).has('kit');
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    if (kit) drawKit(ctx, cast, boil);
    else drawFrame(ctx, cast, t, boil);
    ctx.restore();
  };
  return withCredit({ loopSeconds: LOOP_S, draw, audio: renderSecretaryAudio }, ctx, PAPER_ON_DARK, CREDIT);
}
