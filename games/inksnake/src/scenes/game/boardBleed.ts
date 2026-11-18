import Phaser from 'phaser';
import { ART_RES, PAPER_HEX } from '../../art/palette';
import { rimStrips } from '../../art/rim/rimKit';
import { SURROUND } from '../../art/rim/surroundPlan';
import { BOARD } from '../../level/types';

/** The wash at the surround's far edge: a breath of ground still shows through. */
const FADE_TO = 0.9;
/** The wash halfway across the surround: near the border the place reads as the place. */
const FADE_MID = 0.24;
/** The wall lies over the board's edge, under everything that moves. */
const RIM_DEPTH = 2.3;

/**
 * Lays the board's ground (texture `board`) over the place painted round it
 * (`surround`, see bakeSurround), both at `depth`, and the border's wall
 * (`rims`, see bakeRims) on the board's edge above them, so the place
 * carries on to the screen's edges whatever the screen's shape, never
 * mirrored, behind a wall that says where the board ends. Away from the
 * board the surround washes out into paper, and paper lies beyond it.
 */
export function layGround(scene: Phaser.Scene, board: string, surround: string, rims: { readonly flat: string; readonly tall: string }, depth: number): void {
  const { x: sx, y: sy } = SURROUND;
  scene.add.image(-sx, -sy, surround).setOrigin(0).setScale(1 / SURROUND.res).setDepth(depth);
  scene.add.image(0, 0, board).setOrigin(0).setScale(1 / ART_RES).setDepth(depth);
  const { w, h } = BOARD;
  const g = scene.add.graphics().setDepth(depth);
  const band = (x: number, y: number, bw: number, bh: number, a: readonly [number, number, number, number]): void => {
    g.fillGradientStyle(PAPER_HEX, PAPER_HEX, PAPER_HEX, PAPER_HEX, a[0], a[1], a[2], a[3]);
    g.fillRect(x, y, bw, bh);
  };
  // Each side in two steps: clear at the board's edge, light halfway out, washed out at the surround's edge. The corners overlap and wash out a little more.
  const [hx, hy] = [sx / 2, sy / 2];
  const [o, m, t] = [0, FADE_MID, FADE_TO];
  const tall = h + sy * 2;
  const long = w + sx * 2;
  band(-sx, -sy, hx, tall, [t, m, t, m]);
  band(-hx, -sy, hx, tall, [m, o, m, o]);
  band(w, -sy, hx, tall, [o, m, o, m]);
  band(w + hx, -sy, hx, tall, [m, t, m, t]);
  band(-sx, -sy, long, hy, [t, t, m, m]);
  band(-sx, -hy, long, hy, [m, m, o, o]);
  band(-sx, h, long, hy, [o, o, m, m]);
  band(-sx, h + hy, long, hy, [m, m, t, t]);
  // Beyond the surround, paper, a whole board out.
  g.fillStyle(PAPER_HEX, FADE_TO);
  g.fillRect(-w, -h, w - sx, h * 3);
  g.fillRect(w + sx, -h, w - sx, h * 3);
  g.fillRect(-sx, -h, w + sx * 2, h - sy);
  g.fillRect(-sx, h + sy, w + sx * 2, h - sy);
  const s = rimStrips();
  const lay = (key: string, frame: string, x: number, y: number): void => {
    scene.add.image(x, y, key, frame).setOrigin(0).setScale(1 / ART_RES).setDepth(RIM_DEPTH);
  };
  lay(rims.flat, 'top', s.top.x0, s.top.y0);
  lay(rims.flat, 'bottom', s.bottom.x0, s.bottom.y0);
  lay(rims.tall, 'left', s.left.x0, s.left.y0);
  lay(rims.tall, 'right', s.right.x0, s.right.y0);
}
