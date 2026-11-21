import type { FishShape } from '../../../../src/art/fishArt';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { drawAnimal, plankton } from '../../foodchain/cast';
import { drawCapeFurSeal, prepareSeal } from '../../seal/art/capeFurSeal';
import { makeSprite, type Sprite } from '../../sprites';
import { drawSwimmer } from '../../swimmer';
import type { MealId } from '../ladder';
import { drawEagleRay } from './eagleRay';
import { drawSquid } from './squid';
import { drawStingray } from './stingray';

/**
 * The meals each shark gulps, at their real size: the game's own fish for
 * herring (its sardine, a fellow clupeid), reef fish (chromis), mullet,
 * tuna (bonito, a small tuna) and cod; foodchain's krill for the shrimp and
 * its copepods for plankton; the seal short's Cape fur seal; and painted
 * here, a squid (squid.ts), a southern stingray (stingray.ts) and a spotted
 * eagle ray for the tiger shark's "ray" (eagleRay.ts). All facing `facing`, placed
 * by the body's centre, `len` px long. No gore: meals vanish whole.
 */

const boilOf = (t: number): number => ((Math.floor(t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;

const GAME: Partial<Record<MealId, readonly [FishShape, number]>> = {
  herring: ['sardine', 8], reefFish: ['chromis', 8], mullet: ['mullet', 8], tuna: ['bonito', 8], cod: ['cod', 8],
};
const sprites = new Map<MealId, Sprite>();

function spriteOf(id: MealId): Sprite {
  let s = sprites.get(id);
  if (!s) {
    const [shape, res] = GAME[id]!;
    s = makeSprite(shape, res);
    sprites.set(id, s);
  }
  return s;
}

export async function prepareMeals(): Promise<void> {
  await plankton.prepare();
  prepareSeal();
  for (const id of Object.keys(GAME) as MealId[]) spriteOf(id);
}

/** Glittering specks: plankton too small to see at a shark's scale, plus a few copepods drawn big enough to read. */
function drawPlankton(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, t: number): void {
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996;
    const r = len * (0.15 + 0.85 * ((i * 0.618) % 1));
    const px = x + Math.cos(a + t * 0.3) * r;
    const py = y + Math.sin(a + t * 0.3) * r * 0.6;
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 5 + i);
    ctx.fillStyle = i % 3 ? '#f6f0c8' : '#c9f2ff';
    ctx.beginPath();
    ctx.arc(px, py, 1.6 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws meal `id`, its body centre at (x, y), `len` px long. */
export function drawMeal(ctx: CanvasRenderingContext2D, id: MealId, x: number, y: number, len: number, facing: 1 | -1, t: number): void {
  if (len < 1.5 || id === 'hidden') return;
  const beat = t * 9;
  const game = GAME[id];
  if (game) {
    drawSwimmer(ctx, spriteOf(id), { j: 0, shape: game[0], age: 0, x, y, length: len, facing, tilt: 0, beat, effort: 0.6 }, boilOf(t));
  } else if (id === 'shrimp') {
    drawAnimal(ctx, 'krill', { x, y, length: len, facing, beat, effort: 0.6 }, t, { kick: 0.5 + 0.5 * Math.sin(t * 7) });
  } else if (id === 'plankton') {
    drawPlankton(ctx, x, y, len, t);
  } else if (id === 'seal') {
    drawCapeFurSeal(ctx, { x, y, len, rot: 0, face: facing, beat }, { mood: 'nervous', gape: 0 }, boilOf(t));
  } else {
    const draw = id === 'squid' ? drawSquid : id === 'stingray' ? drawStingray : drawEagleRay;
    draw(ctx, x, y, len, facing, t);
  }
}
