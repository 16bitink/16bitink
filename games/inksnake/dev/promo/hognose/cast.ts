import { HOGNOSE_ART } from '../../../src/art/chapters/barrensSnake';
import { drawBelly } from '../../../src/art/chapters/barrensSnakeBelly';
import { FOX_ART } from '../../../src/art/chapters/barrensFoxArt';
import { HOG_HEAD, HOG_TONGUE } from '../../../src/art/chapters/barrensSnakeHead';
import { makeCanvas } from '../../../src/art/pen';
import type { SnakeArt } from '../../../src/art/types';
import { bakeSprite, bakeStrip, type Sprite, type Strip } from '../sprites';
import { paintGround } from './ground';
import type { FoxPose } from './stage';

/**
 * The short's cast, baked once at the video's scale from InkSnake's own
 * Pine Barrens art: the ground, the Red Fox, the hognose's back and belly
 * strips, its head (mouth shut, open, belly-up) and tongue.
 */
export type HeadKey = 'shut' | 'open' | 'upShut' | 'upOpen';

export interface Cast {
  readonly ground: HTMLCanvasElement;
  readonly fox: Readonly<Record<FoxPose, Sprite>>;
  /** How far the fox's nose is from the sprite's centre along its heading, board units, per pose. */
  readonly nose: Readonly<Record<FoxPose, number>>;
  readonly back: Strip;
  readonly belly: Strip;
  readonly head: Readonly<Record<HeadKey, Sprite>>;
  readonly tongue: Sprite;
}

const FOX_RES = 6;
const HEAD_RES = 9;
const STRIP_RES = 9;
const FOX_POSES: readonly FoxPose[] = ['walk0', 'walk1', 'crouch', 'sniff', 'startle'];

/** The sprite's rightmost opaque column, in board units from its centre: the fox's nose. */
function noseOf(s: Sprite): number {
  const c = s.frames[0]!;
  const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
  for (let x = c.width - 1; x >= 0; x--) {
    for (let y = 0; y < c.height; y++) if (data[(y * c.width + x) * 4 + 3]! > 140) return (x - c.width / 2) / s.res;
  }
  return 0;
}

/** The head seen from the belly: the back's tan and blotches pulled towards the plates' cream, the ink lines and the pink of the open mouth kept. */
function underneath(s: Sprite): Sprite {
  const frames = s.frames.map((f) => {
    const { canvas, ctx } = makeCanvas(f.width, f.height);
    ctx.drawImage(f, 0, 0);
    const img = ctx.getImageData(0, 0, f.width, f.height);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3]! < 8) continue;
      const [r, g, b] = [px[i]!, px[i + 1]!, px[i + 2]!];
      const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
      const pink = r > 180 && r - g > 22 && r - b > 14;
      const ink = lum < 0.2 || b > r + 14;
      if (pink || ink) continue;
      const k = lum < 0.42 ? 0.45 : 0.7;
      px[i] = r + (238 - r) * k;
      px[i + 1] = g + (226 - g) * k;
      px[i + 2] = b + (186 - b) * k;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  });
  return { ...s, frames };
}

export function bakeCast(): Cast {
  const bellyArt: SnakeArt = { ...HOGNOSE_ART!, drawStrip: (d, len) => drawBelly(d, len) };
  const fox = Object.fromEntries(FOX_POSES.map((p, i) => [p, bakeSprite(FOX_ART!, p, FOX_RES, 800 + i * 7)])) as Record<FoxPose, Sprite>;
  const shut = bakeSprite(HOG_HEAD, 'shut', HEAD_RES, 310);
  const open = bakeSprite(HOG_HEAD, 'open', HEAD_RES, 320);
  return {
    ground: paintGround(),
    fox,
    nose: Object.fromEntries(FOX_POSES.map((p) => [p, noseOf(fox[p])])) as Record<FoxPose, number>,
    back: bakeStrip(HOGNOSE_ART!, STRIP_RES, 41),
    belly: bakeStrip(bellyArt, STRIP_RES, 43),
    head: { shut, open, upShut: underneath(shut), upOpen: underneath(open) },
    tongue: bakeSprite(HOG_TONGUE, 'flick', HEAD_RES, 330),
  };
}
