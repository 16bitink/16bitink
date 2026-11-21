import { pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { dust, hitStar } from '../badger/fx';
import { lerp, VIDEO } from '../short';
import { type BirdPose, drawBird } from './bird';
import { BG_PAD, type Cast } from './cast';
import { SN, type SnakePaint } from './paint';
import { drawSnake } from './snake';
import { hookPose, KICK_KNEE, type KickPose, kickFoot, kickPose, miniAt, pressAt, sightAt, TARGET, tenseAt } from './story';

/**
 * The kick on the savanna, side on: the bird with one leg cocked high over
 * the snake, then the stomp just behind its head with a flash and a puff of
 * dust (never blood). The hook (and the aim beat that runs into it) and the
 * dramatic evening "five times its body weight" shot both draw it.
 */
export interface Place {
  /** The bird's body centre on screen and its px per unit. */
  readonly at: Pt;
  readonly scale: number;
}

export const HOOK_PLACE: Place = { at: pt(300, 958), scale: 7 };
const KICK_PLACE: Place = { at: pt(300, 1090), scale: 6.0 };

/** The bird's pose for a kick. */
export function kickBird(k: KickPose, place: Place): BirdPose {
  const s = k.stomp;
  return {
    at: place.at, scale: place.scale, tilt: 0.05 + 0.08 * s, wings: 0.85 + 0.15 * s, ground: 66,
    head: { at: pt(47 + 2 * s, -25 + 8 * s), ang: 0.55 + 0.15 * s + 0.08 * k.sway, look: { lid: 0, crest: 1 } },
    near: { foot: kickFoot(k.raise, s), grip: s > 0.9 ? 'splay' : 'curl', toe: lerp(0.35, 0, s), knee: KICK_KNEE },
    far: { foot: pt(-6, 66), grip: 'flat' },
  };
}

/** Where the foot lands on screen. */
export const targetOf = (place: Place): Pt => pt(place.at.x + TARGET.x * place.scale, place.at.y + TARGET.y * place.scale);

/** The snake under a kick: its neck under the target, its head reared (until pinned) and swaying, its body wriggling after the hit. */
export function kickSnake(k: KickPose, T: Pt, k0: number, paint: SnakePaint = SN): { knots: Pt[]; width: number; paint: SnakePaint; pinned: number } {
  const lift = 46 * (1 - k.stomp);
  const wr = k.dust > 0 && k.dust < 1 ? 1 - k.dust : 0;
  const w = (i: number): number => Math.sin(k.dust * 16 - i * 1.3) * 26 * wr * (i / 5);
  const knots = [
    pt(T.x - 92 * k0 + k.sway * 22 * k0, T.y + (4 - lift + Math.abs(k.sway) * 6) * k0),
    pt(T.x - 10 * k0, T.y + 24 * k0),
    pt(T.x + 120 * k0, T.y + (38 + w(2)) * k0),
    pt(T.x + 260 * k0, T.y + (22 + w(3)) * k0),
    pt(T.x + 380 * k0, T.y + (48 + w(4)) * k0),
    pt(T.x + 470 * k0, T.y + (86 + w(5)) * k0),
  ];
  return { knots, width: 72 * k0, paint, pinned: k.stomp };
}

/** The camera: zoom about a focus. */
function camera(ctx: CanvasRenderingContext2D, zoom: number, focus: Pt, shake: number): void {
  ctx.translate(focus.x + shake * 9, focus.y - shake * 6);
  ctx.scale(zoom, zoom);
  ctx.translate(-focus.x, -focus.y);
}

/** A warm golden-hour glaze over the whole frame (soft light). */
export function golden(ctx: CanvasRenderingContext2D, alpha: number, colour = '#ffb24a'): void {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function vignette(ctx: CanvasRenderingContext2D, alpha: number, colour = '20,10,4'): void {
  const v = ctx.createRadialGradient(VIDEO.width / 2, 1050, 420, VIDEO.width / 2, 1050, 1250);
  v.addColorStop(0, `rgba(${colour},0)`);
  v.addColorStop(1, `rgba(${colour},${alpha})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

function kickScene(ctx: CanvasRenderingContext2D, bg: HTMLCanvasElement, k: KickPose, place: Place, boil: number, seed: number): void {
  const T = targetOf(place);
  ctx.drawImage(bg, -BG_PAD, -BG_PAD);
  drawSnake(ctx, kickSnake(k, T, place.scale / 6.2), boil);
  drawBird(ctx, kickBird(k, place), boil);
  dust(ctx, pt(T.x + 30, T.y + 40), k.dust, 150, seed);
  dust(ctx, pt(T.x - 40, T.y + 46), k.dust * 1.1, 110, seed + 1);
  hitStar(ctx, pt(T.x + 10, T.y + 20), k.impact, 120);
}

/** The dashed line of the bird's gaze to the snake's head (it aims by sight). */
function sightLine(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, k: number): void {
  if (k <= 0) return;
  const end = pt(from.x + (to.x - from.x) * Math.min(1, k * 1.3), from.y + (to.y - from.y) * Math.min(1, k * 1.3));
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2);
  ctx.lineCap = 'round';
  ctx.setLineDash([22, 18]);
  for (const [w, c] of [[13, '#fff3d6'], [6, '#b3322b']] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (k > 0.75) {
    const r = 70 - 20 * (k - 0.75) * 4;
    for (const [w, c] of [[12, '#fff3d6'], [6, '#b3322b']] as const) {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(to.x, to.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Frame 1, and the aim beat that runs into it. */
export function drawHook(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const k = hookPose(t);
  const tense = tenseAt(t);
  ctx.save();
  camera(ctx, k.zoom, pt(600, 1150), k.impact);
  kickScene(ctx, cast.bg.hook, k, HOOK_PLACE, boil, 61);
  const p = kickBird(k, HOOK_PLACE);
  const eye = pt(HOOK_PLACE.at.x + p.head.at.x * HOOK_PLACE.scale, HOOK_PLACE.at.y + p.head.at.y * HOOK_PLACE.scale);
  const snakeHead = kickSnake(k, targetOf(HOOK_PLACE), 1).knots[0]!;
  sightLine(ctx, eye, pt(snakeHead.x + 20, snakeHead.y - 6), sightAt(t));
  ctx.restore();
  golden(ctx, 0.3 * (1 - tense));
  if (tense > 0) {
    ctx.fillStyle = `rgba(30,50,100,${0.3 * tense})`;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  vignette(ctx, 0.45 + 0.25 * tense, tense > 0.5 ? '6,10,24' : '20,10,4');
}

/** "and a kick of FIVE times its own body weight!": evening, low and dramatic, five little birds piling up. */
export function drawKick(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const k = kickPose(t);
  ctx.save();
  camera(ctx, k.zoom, pt(560, 1200), k.impact);
  kickScene(ctx, cast.bg.kick, k, KICK_PLACE, boil, 67);
  ctx.restore();
  golden(ctx, 0.35, '#ff7a3a');
  vignette(ctx, 0.6, '30,6,4');
  const press = pressAt(t);
  for (let i = 0; i < 5; i++) {
    const m = miniAt(t, i);
    if (m <= 0) continue;
    const pop = m < 1 ? m * (1 + 0.25 * Math.sin(m * Math.PI)) : 1;
    const s = 1.6 * pop;
    const feet = pt(140 + i * 200, 740 + press * 34);
    drawBird(ctx, {
      at: pt(feet.x, feet.y - 66 * s * (1 - 0.12 * press)), scale: s, tilt: -0.06, wings: 0, ground: 66,
      head: { at: pt(30, -52), ang: 0, look: { lid: 0, crest: 0.6 } }, near: { foot: pt(8, 66), grip: 'flat' }, far: { foot: pt(-8, 66), grip: 'flat' },
    }, (boil + i) % 3);
  }
}
