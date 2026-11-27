import { drawSpokenLine, drawTextLine, INK_ON_PAPER } from '../captions';
import { creditAt } from '../credit';
import { RED } from '../../../src/art/palette';
import { clamp01, ramp, VIDEO, type Short } from '../short';
import { boilAt, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { drawSon, loadSon, type SonImages } from '../son/son';
import { bobAt, drawDewy, FADE_S, loadDewy, type DewyImages } from '../../../../inkfish/dev/promo/devstory/dewy';
import { renderCrabMaldivesAudio } from './audio';
import { type Beach, SHORE_GROUND as BERM, drawBackdrop, drawGold, drawPlane, drawSand, makeBeach, shoreLine } from './beach';
import envelope from './envelope.json';
import { drawGame, type Game, makeGame, puffsAt } from './game';
import { drawFlicks, drawHeart, drawPuff, drawRing, drawShadow, drawSparkle } from './marks';
import {
  AT, camOf, CENTRE_X, CREDIT, creditLow, CUT_S, DEWY, dewyExit, dewyOn, layerTop, LOOP_S, RING_DRAW_S, RINGS, ringsAlpha, said, screenX, seaplaneAt, shellAt, type ShotId,
  shotsAt, type SonPlace, sonOnBeach, sonPeek, spokenAt, worldCam, type WorldCam,
} from './story';
import { WORDS } from './words';

/** Draws "My Son Found His First Hermit Crab Here" (story.ts has the beats). */


interface Kit {
  readonly beach: Beach;
  readonly game: Game;
  readonly son: SonImages;
  readonly dewy: DewyImages;
  readonly close: { readonly back: Sprite; readonly front: Sprite; readonly shell: Sprite };
  readonly strewn: readonly Sprite[];
  readonly layer: { readonly canvas: HTMLCanvasElement; readonly ctx: CanvasRenderingContext2D };
  readonly tablet: { readonly canvas: HTMLCanvasElement; readonly ctx: CanvasRenderingContext2D };
}

/** The game's crab, in the reddish orange of the land hermit crabs on Maldives beaches (and of the one in the son's paws). */
const STRAWBERRY = { body: '#d8521f', tip: '#7a2410', soft: '#eea08e' } as const;

const SPEECH = { words: WORDS, envelope: envelope as readonly number[] };

/** The son, standing on the sand: a soft shadow under his patch of painted sand so it sits in ours. */
function drawSonOn(ctx: CanvasRenderingContext2D, son: SonImages, p: SonPlace): void {
  drawShadow(ctx, p.x, p.y - p.height * 0.03, p.height * 0.42, p.height * 0.06, p.alpha);
  drawSon(ctx, son, { key: p.key, x: p.x, y: p.y, height: p.height, tilt: p.tilt, alpha: p.alpha });
}

// ---------------------------------------------------------------- the beach shot (painted, then the game)

function rings(ctx: CanvasRenderingContext2D, cam: WorldCam, beach: Beach, t: number, boil: number): void {
  const alpha = ringsAlpha(t);
  const lagoon = beach.layers.find((l) => l.id === 'lagoon')!;
  const shore = beach.layers.find((l) => l.id === 'shore')!;
  for (const [i, r] of RINGS.entries()) {
    const u = (t - r.at) / RING_DRAW_S;
    if (u <= 0) continue;
    let at = { x: 0, y: 0, rx: 0, ry: 0 };
    if (r.id === 'seaplane') {
      const p = seaplaneAt(t, cam);
      if (!p) continue;
      at = { x: p.x, y: p.y, rx: 175, ry: 78 };
    } else if (r.id === 'villas') {
      at = { x: screenX(cam, 520, 0.6), y: layerTop(cam, lagoon.height, lagoon.lift) + 84 * cam.s, rx: 150 * cam.s, ry: 25 * cam.s };
    } else {
      // The palm leaning out over the lagoon on the left, crown to foot.
      at = { x: screenX(cam, 322, 0.85), y: layerTop(cam, shore.height, shore.lift) + (BERM - 78) * cam.s, rx: 58 * cam.s, ry: 96 * cam.s };
    }
    drawRing(ctx, at.x, at.y, at.rx, at.ry, Math.min(1, u), alpha, boil, i + 3);
    drawSparkle(ctx, at.x + at.rx * 0.8, at.y - at.ry * 0.85, 34, clamp01(u / 1.6), boil);
  }
}

/** Empty shells lying about on the near sand (design px from the centre, and below the shore line). */
const STREWN = [
  { kind: 'periwinkle', dx: -190, dy: 175, k: 0.34, facing: 1 },
  { kind: 'tun', dx: 185, dy: 150, k: 0.3, facing: -1 },
  { kind: 'snail', dx: 150, dy: 300, k: 0.38, facing: 1 },
] as const;

function drawStrewn(ctx: CanvasRenderingContext2D, kit: Kit, cam: WorldCam, top: number, alpha: number): void {
  if (alpha <= 0) return;
  STREWN.forEach((s, i) => {
    const x = screenX(cam, CENTRE_X + s.dx, 1);
    const y = top + s.dy * cam.s;
    drawShadow(ctx, x, y + 2, 40 * cam.s * s.k * 2, 8 * cam.s * s.k * 2, alpha);
    drawSprite(ctx, kit.strewn[i]!, 0, { x, y, scale: cam.s * s.k, facing: s.facing, alpha });
  });
}

/** "The Maldives!": light glinting off the lagoon, one point after another (screen px, when, how big). */
const WATER_GLINTS = [[330, 1160, 0.05, 32], [720, 1110, 0.2, 38], [905, 1290, 0.35, 30], [520, 1330, 0.5, 34], [180, 1250, 0.62, 28]] as const;

function drawBeachShot(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number, cam: WorldCam): void {
  drawBackdrop(ctx, kit.beach, cam);
  if (t < AT.shellCut + CUT_S) {
    for (const [x, y, dt, size] of WATER_GLINTS) drawSparkle(ctx, x, y, size, (t - said('Maldives!') - dt) / 0.55, boil);
  }
  const plane = seaplaneAt(t, cam);
  if (plane) drawPlane(ctx, kit.beach, plane.x, plane.y, plane.scale, plane.alpha, -0.04);
  const shore = shoreLine(kit.beach, cam);
  drawSand(ctx, kit.beach, cam, shore, 1 - cam.game);
  drawStrewn(ctx, kit, cam, shore, 1 - cam.game);
  drawGame(ctx, kit.game, cam, t, boil, cam.game);
  if (cam.game > 0.5) for (const p of puffsAt(t, cam)) drawPuff(ctx, p.x, p.y, p.r, p.a);
  if (cam.game > 0) rings(ctx, cam, kit.beach, t, boil);
  const son = sonOnBeach(t, cam);
  if (son) {
    drawSonOn(ctx, kit.son, son);
    // His crab's legs wriggling in his paws.
    const crab = { x: son.x + son.height * 0.24, y: son.y - son.height * 0.47 };
    drawFlicks(ctx, crab.x + 34, crab.y - 6, 26, 3, 0.55 * Math.max(0, Math.sin(t * 2 * Math.PI / 1.5)), boil, 4, -1.2, 0.9);
  }
}

// ---------------------------------------------------------------- the close-ups

/** The close-ups' beach: the same lagoon, nearer and soft behind the sand. */
const closeCam = (t: number, s: number, ground: number, pan: number): WorldCam => ({ s, ground, pan, game: 0, gold: worldCam(t).gold });

function drawShellShot(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const cam = closeCam(t, 4.2, 1360, 70);
  drawBackdrop(ctx, kit.beach, cam, 0.32);
  drawSand(ctx, kit.beach, cam, shoreLine(kit.beach, cam));
  const s = shellAt(t);
  drawShadow(ctx, s.x - 10, s.y + 8, 260, 34, 1);
  const shell = { x: s.x, y: s.y, scale: s.scale, rotation: s.rotation };
  if (s.out > 0) drawSprite(ctx, kit.close.back, boil, { ...shell, scale: s.scale * s.out });
  drawSprite(ctx, kit.close.shell, s.walking ? boil : 0, shell);
  if (s.out > 0) drawSprite(ctx, kit.close.front, boil, { ...shell, scale: s.scale * s.out });
  // Boing!
  const pop = (t - AT.pop) / 0.5;
  if (pop > 0 && pop < 1) drawFlicks(ctx, s.x + 130, s.y - 120, 150, 5, 1 - pop, boil, 9, -2.3, 0.4);
  // Sand kicked up behind it as it walks.
  if (s.walking) for (let i = 0; i < 2; i++) drawPuff(ctx, s.x - 240 - i * 40, s.y - 6, 18 + ((t * 3 + i) % 1) * 20, 0.5 * (1 - ((t * 3 + i) % 1)));
}

function drawPeekShot(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const cam = closeCam(t, 3.3, 1500, 150);
  drawBackdrop(ctx, kit.beach, cam, 0.25);
  drawSand(ctx, kit.beach, cam, shoreLine(kit.beach, cam));
  const p = sonPeek(t);
  drawSonOn(ctx, kit.son, p);
  // The image's own landmarks (peek.png, 1310 × 1061): his nose, his crab's eyes.
  const w = (1310 / 1061) * p.height;
  const nose = { x: p.x - w / 2 + 0.634 * w, y: p.y - p.height + 0.669 * p.height };
  const crab = { x: p.x - w / 2 + 0.733 * w, y: p.y - p.height + 0.75 * p.height };
  const tickle = ramp(t, AT.hooked - 0.45, AT.hooked - 0.3) * (1 - ramp(t, AT.hooked + 0.6, AT.hooked + 0.8));
  drawFlicks(ctx, (nose.x + crab.x) / 2 + 10, (nose.y + crab.y) / 2, 40, 4, tickle * (boil === 1 ? 0.6 : 1), boil, 2, -2.6, -0.4);
  drawHeart(ctx, crab.x + 40, crab.y - 70, 46, (t - AT.hooked) / 1.5, boil);
  drawHeart(ctx, crab.x + 110, crab.y - 20, 30, (t - AT.hooked - 0.25) / 1.4, boil);
}

function drawShot(ctx: CanvasRenderingContext2D, kit: Kit, id: ShotId, t: number, boil: number): void {
  if (id === 'shell') drawShellShot(ctx, kit, t, boil);
  else if (id === 'peek') drawPeekShot(ctx, kit, t, boil);
  else drawBeachShot(ctx, kit, t, boil, camOf(id, t));
}

// ---------------------------------------------------------------- Dewy, and the level on his tablet

/** The tablet's screen in proud.png's pixels (1134 × 1394): top-left, top-right, bottom-left. */
const TABLET = { tl: { x: 435, y: 997 }, tr: { x: 915, y: 941 }, bl: { x: 487, y: 1327 } } as const;
/** The part of the frame the tablet shows: the level round the crab and the lagoon. */
const TABLET_VIEW = { x: 0, y: 300, w: 1080, h: 790 } as const;

function drawTablet(ctx: CanvasRenderingContext2D, kit: Kit, t: number, exit: number, talking: number): void {
  const mix = clamp01((t - AT.proud) / FADE_S);
  if (mix <= 0) return;
  const img = kit.dewy.proud;
  const w = DEWY.width;
  const h = (img.naturalHeight / img.naturalWidth) * w;
  const k = w / img.naturalWidth;
  const { lift, squash } = bobAt(t, talking);
  const sx = 1 - squash * 0.5;
  const sy = 1 + squash;
  const map = (p: { x: number; y: number }): { x: number; y: number } => ({
    x: DEWY.x + sx * (-w / 2 + p.x * k),
    y: DEWY.y + exit - lift * h + sy * (-h + p.y * k),
  });
  const a = map(TABLET.tl);
  const b = map(TABLET.tr);
  const c = map(TABLET.bl);
  // The level, drawn on its own sheet and mapped onto the screen's quad.
  kit.tablet.ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBeachShot(kit.tablet.ctx, kit, t, boilAt(t), worldCam(t));
  ctx.save();
  ctx.globalAlpha = mix;
  ctx.setTransform((b.x - a.x) / TABLET_VIEW.w, (b.y - a.y) / TABLET_VIEW.w, (c.x - a.x) / TABLET_VIEW.h, (c.y - a.y) / TABLET_VIEW.h, a.x, a.y);
  ctx.drawImage(kit.tablet.canvas, TABLET_VIEW.x, TABLET_VIEW.y, TABLET_VIEW.w, TABLET_VIEW.h, 0, 0, TABLET_VIEW.w, TABLET_VIEW.h);
  ctx.restore();
}

function drawDewyAt(ctx: CanvasRenderingContext2D, kit: Kit, t: number): void {
  if (!dewyOn(t)) return;
  const exit = dewyExit(t);
  const talking = t > AT.dewyIn + 0.3 ? 0.7 : 0;
  ctx.save();
  ctx.translate(0, exit);
  drawDewy(ctx, kit.dewy, {
    t, x: DEWY.x, y: DEWY.y, width: DEWY.width, from: 'moved', to: 'proud', changeAt: AT.proud, talking, enterAt: AT.dewyIn, speech: SPEECH,
  });
  ctx.restore();
  drawTablet(ctx, kit, t, exit, talking);
}

// ---------------------------------------------------------------- the short

export async function createCrabMaldives(ctx: CanvasRenderingContext2D): Promise<Short> {
  const [son, dewy] = await Promise.all([loadSon(), loadDewy()]);
  const mk = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.width;
    canvas.height = VIDEO.height;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('2D canvas is not available');
    c.imageSmoothingQuality = 'high';
    return { canvas, ctx: c };
  };
  const kit: Kit = {
    beach: makeBeach(),
    game: makeGame(),
    son,
    dewy,
    close: { back: crabSprite('back', 4.5, false, STRAWBERRY), front: crabSprite('front', 4.5, false, STRAWBERRY), shell: shellSprite('moonsnail', 4.5) },
    strewn: STREWN.map((s) => shellSprite(s.kind, 2)),
    layer: mk(),
    tablet: mk(),
  };
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const boil = boilAt(t);
      const s = shotsAt(t);
      drawShot(ctx, kit, s.under, t, boil);
      if (s.over) {
        kit.layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawShot(kit.layer.ctx, kit, s.over, t, boil);
        ctx.save();
        ctx.globalAlpha = s.u;
        ctx.drawImage(kit.layer.canvas, 0, 0);
        ctx.restore();
      }
      drawDewyAt(ctx, kit, t);
      drawGold(ctx, worldCam(t).gold);
      for (const r of spokenAt(t)) drawSpokenLine(ctx, r.words, r.current, INK_ON_PAPER, RED, r.y, r.size, r.unsaid);
      const credit = creditAt(t, LOOP_S);
      const low = creditLow(t);
      if (credit * (1 - low) > 0) drawTextLine(ctx, CREDIT.text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, credit * (1 - low), INK_ON_PAPER);
      if (credit * low > 0) drawTextLine(ctx, CREDIT.text, CREDIT.low.x, CREDIT.low.y, CREDIT.size, 700, credit * low, INK_ON_PAPER);
    },
    audio: renderCrabMaldivesAudio,
  };
}
