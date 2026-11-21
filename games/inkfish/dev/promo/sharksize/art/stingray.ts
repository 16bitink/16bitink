import { dab } from '../../seal/art/paint';
import { drawRay, type Ray } from './rayKit';

/**
 * The southern stingray (Hypanus americanus), the great hammerhead's meal:
 * a rhomboid disc with angular outer corners and a slightly pointed snout,
 * plain sand-brown to olive above with a few soft darker blotches, white
 * below, the eyes and spiracles raised on the back, and a long whip tail with
 * its serrated spine. Painted by rayKit.ts; 100 units long, snout to tail tip.
 */
const SOUTHERN: Ray = {
  disc: [
    [44, 0], [41, 5], [33, 14], [24, 23], [18, 29], [14, 31], [9, 30], [2, 25], [-5, 17], [-10, 8], [-12, 0],
    [-10, -8], [-5, -17], [2, -25], [9, -30], [14, -31], [18, -29], [24, -23], [33, -14], [41, -5],
  ],
  tail: { root: -10, tip: -56, thick: 2.8, spine: 0.3 },
  dome: { u: 18, lu: 24, lw: 11, h: 4.5 },
  wing: { from: 12, reach: 31, lift: 4.5 },
  rate: 0.7,
  eye: { u: 30, w: 4.6, r: 1.7 },
  spiracle: { u: 25, w: 5.4, r: 1.5 },
  top: { light: '#b39d78', mid: '#8a7352', dark: '#584530' },
  belly: '#efe9dc',
  marks: ({ ctx, at }) => {
    // Soft darker blotches, the way the sand settles on it.
    for (let i = 0; i < 9; i++) {
      const u = 30 - ((i * 0.618) % 1) * 36;
      const w = (((i * 0.382) % 1) - 0.5) * 36;
      const p = at(u, w);
      dab(ctx, p.x, p.y, 4.5, '70,54,34', 0.25);
    }
  },
};

export function drawStingray(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, facing: 1 | -1, t: number): void {
  drawRay(ctx, SOUTHERN, x, y, len, facing, t);
}
