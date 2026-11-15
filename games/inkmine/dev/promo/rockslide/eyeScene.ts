import { RED_FINISH } from '../../../src/art/brineFauna';
import { drawRockslide, type RockslidePose } from '../../../src/art/creatures/rockslide';
import { TALUS_STYLE } from '../../../src/art/creatures/rockcrab';
import { makeDraw } from '../../../src/art/kit';
import { rgba } from '../../../src/art/paint';
import { BOIL, RED } from '../../../src/art/palette';
import { render } from '../../../src/art/textures';
import { talusStone } from '../../../src/art/creatures/rockcrab';
import { VIDEO, lerp, ramp } from '../short';
import { eyeOpenAt, EYE_AT, EYE_OPEN_AT, WAKE_AT, wrap } from './story';

/**
 * Cut in on the eyes: the game's own drawing of the Rockslide, drawn again at
 * 12 px a unit (the pen is vector, so it stays crisp) with the camera on its
 * face. Shut, they are slits between the stones under the heap; on "OPEN!"
 * they lift on their stalks, the heap shedding stones.
 */
const RES = 12;
/** Art units across and down the frame, and where the shut eyes sit in it (art y = -12 at screen y 1000). */
const HEADROOM = 640;
const FRAME = { w: VIDEO.width / RES, h: (VIDEO.height + HEADROOM) / RES, ox: VIDEO.width / RES / 2, oy: (1144 + HEADROOM) / RES };
/** The awake body's rim stands 44 units over the sleeper's: this drops it back, so the stalks rise out of the same sockets. */
const RISE = 44 * RES;
const EYE_AT_Y = 1000;

type Pose = Exclude<RockslidePose, 'stir'> | 'stir';

function bakePose(pose: Pose, seed: number): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => render(FRAME.w, FRAME.h, FRAME.ox, FRAME.oy, RES, (ctx) => drawRockslide(makeDraw(ctx, seed + f, f, 0, RED), pose), RED_FINISH));
}

/** A stone tumbling off the heap, `u` seconds into its fall. */
function drawFallers(ctx: CanvasRenderingContext2D, age: number): void {
  if (age < 0 || age > 1.2) return;
  for (let i = 0; i < 7; i++) {
    const x = 140 + ((i * 163) % 800);
    const start = (i % 4) * 0.07;
    const u = age - start;
    if (u <= 0) continue;
    const size = 26 + ((i * 37) % 40);
    ctx.save();
    ctx.globalAlpha = 1 - ramp(age, 0.8, 1.2);
    ctx.translate(x, 160 + 900 * u * u + 120 * u);
    ctx.rotate(u * (2 + (i % 3)));
    talusStone(makeDraw(ctx, 9100 + i, 0, 0, RED), 0, 0, size, 9100 + i, true, TALUS_STYLE);
    ctx.restore();
  }
}

export function makeEyeScene(): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const sleep = bakePose('sleep', 7600);
  const stir = bakePose('stir', 7610);
  const awake = bakePose('awake', 7620);
  return (ctx, time, boil) => {
    const t = wrap(time);
    const open = eyeOpenAt(t);
    const zoom = lerp(1, 1.1, ramp(t, EYE_AT, WAKE_AT));
    ctx.fillStyle = '#150a09';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    const floor = ctx.createLinearGradient(0, 1100, 0, 1920);
    floor.addColorStop(0, '#5a3a2e');
    floor.addColorStop(1, '#1a0d0b');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 1100, VIDEO.width, 820);
    ctx.save();
    // The push is about the eyes, which are the middle of the picture while shut, and above it after.
    const focus = lerp(EYE_AT_Y, 600, ramp(open, 0.3, 1));
    ctx.translate(540, focus);
    ctx.scale(zoom, zoom);
    ctx.translate(-540, -focus);
    const wasShut = 1 - ramp(open, 0.05, 0.5);
    const half = ramp(open, 0.04, 0.3) * (1 - ramp(open, 0.5, 0.85));
    const up = ramp(open, 0.45, 0.95);
    ctx.globalAlpha = wasShut;
    ctx.drawImage(sleep[boil % BOIL]!, 0, -HEADROOM);
    ctx.globalAlpha = half;
    ctx.drawImage(stir[boil % BOIL]!, 0, -HEADROOM);
    ctx.globalAlpha = up;
    ctx.drawImage(awake[boil % BOIL]!, 0, RISE - HEADROOM);
    ctx.globalAlpha = 1;
    if (open > 0.1) drawFallers(ctx, t - EYE_OPEN_AT);
    ctx.restore();
    // The dark closes in on the eyes, and warms a little as they open.
    const g = ctx.createRadialGradient(540, focus, 200, 540, focus, 1150);
    g.addColorStop(0, 'rgba(10, 4, 4, 0)');
    g.addColorStop(1, 'rgba(10, 4, 4, 0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    if (open > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = 700;
      const glow = ctx.createRadialGradient(540, 560, 0, 540, 560, r);
      glow.addColorStop(0, rgba('#ff9a6a', 0.14 * up));
      glow.addColorStop(1, rgba('#ff9a6a', 0));
      ctx.fillStyle = glow;
      ctx.fillRect(540 - r, 560 - r, r * 2, r * 2);
      ctx.restore();
    }
  };
}
