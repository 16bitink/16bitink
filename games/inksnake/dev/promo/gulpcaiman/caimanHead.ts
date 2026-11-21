import { capsule, closed, cub, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { ellipseAt } from '../../../src/art/critters/preyKit';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { artX, crossband, fadeX, HIDE, hideWash, JOINTS, keel, outline, range } from './caimanArt';

/**
 * The young caiman's head from the side, its origin at the neck, the snout
 * along +x: the short broad snout with the nostrils on a bump at its tip, the
 * bony spectacle ridge in front of the eye, the eye high in its raised orbit,
 * the shut, scalloped lips with a few teeth showing, the pale jaw.
 */
const J = JOINTS.neck.a;

/** Bumps on the head's top line, art units: the nostrils, the spectacle, the orbit. */
const lift = (a: number): number =>
  0.9 * Math.sin(Math.PI * Math.min(1, Math.max(0, (a - 2) / 22))) +
  1.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, (a - 80) / 16))) +
  2.2 * Math.sin(Math.PI * Math.min(1, Math.max(0, (a - 94) / 40))) ** 1.3;

const O = outline(0, 252, J, 64, lift);
/** The blunt, rounded tip of the snout, from the top line round to the chin. */
const TIP = cub(O.top[0]!, pt(34.2, -2.6), pt(34.4, 2.4), O.bottom[0]!, 8);
const SHAPE = [...O.shape, ...[...TIP].reverse()];
const topAt = (x: number): number => {
  const i = O.top.findIndex((p) => p.x <= x);
  return i < 0 ? O.top[O.top.length - 1]!.y : O.top[i]!.y;
};

const EYE = pt(artX(112, J), -7.6);
const SPECTACLE = artX(88, J);
/** The lip line, from the snout's tip back to the corner of the mouth behind the eye. */
const lipY = (x: number): number => 0.9 + (32.4 - x) * 0.07 + 0.36 * Math.sin(x * 0.7);
const LIP: readonly Pt[] = range(9.6, 33.4, 0.4).reverse().map((x) => pt(x, lipY(x)));

function eye(d: Draw, alarm: boolean): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = alarm ? 2.15 : 1.95;
  // The socket's shade under the raised orbit.
  glaze(ctx, EYE.x, EYE.y + 0.4, r * 2, r * 1.5, 0, HIDE.deep, 0.55);
  const ball = ellipseAt(EYE.x, EYE.y, r * 1.15, r, 0, 24);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(EYE.x - 0.3, EYE.y + 0.3, 0.2, EYE.x, EYE.y, r * 1.2);
    g.addColorStop(0, '#e7cf72');
    g.addColorStop(0.6, HIDE.iris);
    g.addColorStop(1, '#6e5a22');
    ctx.fillStyle = g;
    ctx.fillRect(EYE.x - 4, EYE.y - 4, 8, 8);
    // The vertical slit, wider in alarm.
    pen.fill(ellipseAt(EYE.x + 0.1, EYE.y, alarm ? 0.75 : 0.42, r * 0.95, 0, 16), '#0d0b08', 1);
    if (!alarm) pen.fill([pt(EYE.x - 4, EYE.y - 4), pt(EYE.x + 4, EYE.y - 4), pt(EYE.x + 4, EYE.y - r * 0.25), pt(EYE.x - 4, EYE.y - r * 0.4)], '#5d5848', 1);
  });
  pen.dot(EYE.x + r * 0.45, EYE.y - r * (alarm ? 0.4 : 0.05), r * 0.24, PAPER_FILL, 1);
  pen.stroke(closed(ball), 0.6, d.ink, 0.95, false);
  // The heavy bony lid, raised in alarm, and the lower lid.
  const lid = alarm ? EYE.y - r * 1.05 : EYE.y - r * 0.3;
  pen.stroke(cub(pt(EYE.x - r * 1.35, lid + 0.6), pt(EYE.x - 0.6, lid - 0.5), pt(EYE.x + 0.8, lid - 0.5), pt(EYE.x + r * 1.35, lid + 0.5), 8), 1.1, d.ink, 1, false);
  pen.hair(cub(pt(EYE.x - r, EYE.y + r * 0.9), pt(EYE.x, EYE.y + r * 1.25), pt(EYE.x + 0.6, EYE.y + r * 1.2), pt(EYE.x + r * 1.2, EYE.y + r * 0.7), 8), 0.5, d.ink, 0.7);
}

function teeth(d: Draw): void {
  const tooth = (x: number, len: number, up: boolean): void => {
    const y = lipY(x) + (up ? 0.15 : -0.1);
    const tri = up ? [pt(x - 0.4, y), pt(x + 0.05, y - len), pt(x + 0.4, y)] : [pt(x - 0.42, y), pt(x - 0.05, y + len), pt(x + 0.42, y)];
    d.pen.fill(tri, HIDE.tooth, 1);
    d.pen.stroke(tri, 0.3, d.ink, 0.85, false);
  };
  for (const [x, l] of [[30.6, 0.9], [28.2, 1.25], [25.6, 1], [22.8, 1.15], [19.9, 0.95], [16.9, 0.85], [14, 0.7]] as const) tooth(x, l, false);
  for (const [x, l] of [[29.4, 0.85], [21.4, 0.7]] as const) tooth(x, l, true);
}

type HeadPose = 'calm' | 'alarm';

/** Neck and head, the origin at the neck's root. Its mouth stays shut. */
function drawHead(d: Draw, pose: HeadPose): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.clipped(SHAPE, () => {
    hideWash(ctx, -11, 9, -8, 44, 0.6);
    // The pale lower jaw, below the lips.
    pen.fill([...LIP, pt(9.6, 2.4), pt(9.6, 10), pt(36, 10), pt(36, lipY(32.2))], HIDE.jaw, 1);
    const g = ctx.createLinearGradient(0, 0, 0, 8);
    g.addColorStop(0, 'rgba(120,108,72,0.5)');
    g.addColorStop(0.5, 'rgba(120,108,72,0)');
    g.addColorStop(1, 'rgba(90,80,52,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 34, 9);
    // Dark marks: bands over the snout and down the neck, spots along the jaw.
    for (const [a, w] of [[30, 1.8], [62, 2.6]] as const) crossband(ctx, artX(a, J), w, -6, 1.5, 0.4);
    crossband(ctx, artX(232, J), 3, -12, 3, 0.55);
    for (const x of [27, 22.5, 17.5, 12.5]) glaze(ctx, x, lipY(x) + 2.1, 1.1, 0.75, 0, HIDE.band, 0.5);
    // Light on the snout's top and the skull table, shade under the cheek.
    glaze(ctx, 23, -4.2, 8, 1.2, -0.06, HIDE.light, 0.55);
    glaze(ctx, 2, -8.6, 6, 1.4, 0, HIDE.light, 0.4);
    glaze(ctx, 4, 4.5, 6, 3, 0, HIDE.deep, 0.35);
    // Scales: the skull table's plates, small ones over the cheek and snout.
    for (const x of range(-4, 7, 2.1)) pen.hair(closed(ellipseAt(x, topAt(x) + 1.6, 0.9, 0.6, 0, 8)), 0.3, d.ink, 0.45);
    for (const x of range(18, 31, 1.6)) pen.dot(x, (topAt(x) + lipY(x)) / 2 + 0.6 * Math.sin(x * 2.3), 0.32, HIDE.deep, 0.5);
    for (const x of range(-4, 8, 1.4)) pen.dot(x, 1 + 0.8 * Math.sin(x * 1.9), 0.38, HIDE.deep, 0.45);
  });
  // The lips, scalloped and shut, teeth showing.
  pen.stroke(LIP, 0.75, d.ink, 0.95, false);
  teeth(d);
  // The spectacle: a bony ridge across the head just in front of the eyes, and the dip behind it.
  const sTop = topAt(SPECTACLE);
  // A raised bar across the brow: lit along its top, its shadow cast below and behind it.
  const bar = capsule(pt(SPECTACLE + 0.1, sTop + 0.2), pt(SPECTACLE + 1.1, sTop + 3.6), 1.7, 1.1);
  glaze(ctx, SPECTACLE - 1.3, sTop + 2.4, 1.5, 2.2, 0.25, HIDE.band, 0.7);
  glaze(ctx, SPECTACLE + 0.9, sTop + 4.2, 1.4, 0.8, 0, HIDE.band, 0.5);
  pen.fill(bar, HIDE.scute, 1);
  pen.clipped(bar, () => glaze(ctx, SPECTACLE + 0.2, sTop + 0.6, 1.2, 1.8, 0.25, HIDE.light, 0.95));
  pen.stroke(closed(bar), 0.7, d.ink, 0.95, false);
  pen.hair([pt(SPECTACLE - 0.5, sTop - 0.4), pt(SPECTACLE + 0.9, sTop - 0.5)], 0.7, '#e2dcc4', 0.9);
  // The nostrils on their bump at the tip.
  const nx = artX(13, J);
  pen.fill(ellipseAt(nx, topAt(nx) + 0.55, 0.9, 0.35, 0.1, 10), '#16130f', 1);
  eye(d, pose === 'alarm');
  // The outline, and the nuchal scutes behind the skull.
  pen.stroke(O.top, 1.3, d.ink, 1, false);
  pen.stroke(O.bottom, 1.4, d.ink, 1, false);
  pen.stroke(TIP, 1.3, d.ink, 1, false);
  for (const x of [-4.4, -2.6, -0.8]) keel(d, pt(x, topAt(x) + 0.3), 1.6, 1.2);
  fadeX(ctx, -5.6, -2.4);
}

export const CAIMAN_HEAD: SpriteArt<HeadPose> = { frame: 76, res: 8, poses: ['calm', 'alarm'], draw: drawHead };

