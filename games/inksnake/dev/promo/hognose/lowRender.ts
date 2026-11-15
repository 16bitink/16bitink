import { pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import type { Placed } from './snake';
import { drawDust, drawMark, drawStink } from './fx';
import { paintLowBack } from './lowBack';
import { bakeShade, bakeSkin, softSkin } from './lowBody';
import { bakeFox, FOX_CANVAS, FOX_EYE } from './lowFox';
import { bakeHead } from './lowHead';
import { bodyPoint, drawLowSnake, type LowCast, type LowPlaced } from './lowSnake';
import type { FoxState, Stage } from './stage';

/**
 * A frame of the low view: the Pine Barrens at eye level, the fox's face
 * behind the hognose (sniffing in over it), the hognose, the musk, the thud,
 * the fox's "!" and "?".
 */
export interface LowArt {
  readonly back: HTMLCanvasElement;
  readonly snake: LowCast;
  readonly calm: readonly HTMLCanvasElement[];
  readonly wince: readonly HTMLCanvasElement[];
}

export function bakeLow(): LowArt {
  const skin = bakeSkin(52101);
  return {
    back: paintLowBack(),
    snake: { skin, soft: softSkin(skin), shade: bakeShade(), shut: bakeHead('shut', 41100), gape: bakeHead('gape', 41200) },
    calm: bakeFox('calm', 61100),
    wince: bakeFox('wince', 61200),
  };
}

const pick = (frames: readonly HTMLCanvasElement[], boil: number): HTMLCanvasElement => frames[((boil % frames.length) + frames.length) % frames.length]!;

function drawFox(ctx: CanvasRenderingContext2D, art: LowArt, fox: FoxState, boil: number, shake: Pt): void {
  const draw = (frames: readonly HTMLCanvasElement[], alpha: number): void => {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fox.x + shake.x, fox.y + shake.y);
    ctx.rotate(fox.heading);
    ctx.scale(FOX_CANVAS.scale, FOX_CANVAS.scale);
    ctx.drawImage(pick(frames, boil), -FOX_CANVAS.ox, -FOX_CANVAS.oy, FOX_CANVAS.w, FOX_CANVAS.h);
    ctx.restore();
  };
  draw(art.calm, 1);
  draw(art.wince, fox.wince);
}

/** The fox's eye on screen. */
export function foxEye(fox: FoxState): Pt {
  const c = Math.cos(fox.heading);
  const s = Math.sin(fox.heading);
  const k = FOX_CANVAS.scale;
  return pt(fox.x + (FOX_EYE.x * c - FOX_EYE.y * s) * k, fox.y + (FOX_EYE.x * s + FOX_EYE.y * c) * k);
}

/** drawStink and drawDust work in board units at a camera's scale; the low view is screen px (scale 9 = 1 px per unit there). */
const LOW_FX_CAM = { cx: 0, cy: 0, s: 9 } as const;

export function drawLowFrame(ctx: CanvasRenderingContext2D, art: LowArt, st: Stage, t: number, boil: number, shake: Pt): void {
  ctx.drawImage(art.back, shake.x * 0.5, shake.y * 0.5);
  drawFox(ctx, art, st.fox, boil, shake);
  const p: LowPlaced = drawLowSnake(ctx, art.snake, st.snake, boil, shake);
  const body = { spine: [0.2, 0.35, 0.55, 0.7, 0.85].map((u) => bodyPoint(p, u)) } as unknown as Placed;
  drawStink(ctx, body, LOW_FX_CAM, t, st.fx.stink);
  drawDust(ctx, bodyPoint(p, 0.3), LOW_FX_CAM, st.fx.dust);
  const eye = foxEye(st.fox);
  const mark = { x: Math.max(150, Math.min(930, eye.x - 60)), y: Math.max(330, eye.y - 230) };
  drawMark(ctx, '!', mark, st.fx.bangFox);
  drawMark(ctx, '?', mark, st.fx.question);
}
