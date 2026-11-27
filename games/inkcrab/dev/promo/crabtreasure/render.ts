import { FOOT, SHELL_MID, SHELL_UNITS } from '../../../src/art/frame';
import { PAPER, RED } from '../../../src/art/palette';
import { bobAt, drawDewy, loadDewy, type DewyImages } from '../../../../inkfish/dev/promo/devstory/dewy';
import { drawSpokenLine, drawTextLine, INK_ON_PAPER } from '../captions';
import { creditAt } from '../credit';
import { makeLayer } from '../crabbird/marks';
import { boilAt } from '../sprites';
import { clamp01, lerp, smooth, VIDEO, type Short } from '../short';
import { loadSon, type SonImages } from '../son/son';
import { renderCrabTreasureAudio } from './audio';
import { type Cast, drawCrab, drawHighlight, drawShadow, drawShell, drawSwap, FULL, makeCast, shellMiddle, type ShellPlace } from './cast';
import { drawDigClumps, drawGlint, drawQuestion, drawStrain, drawSparkles, drawSpray, iris } from './marks';
import { drawBeachSet, drawGameSet, type BeachSet, type GameSet, makeBeachSet, makeGameSet } from './sets';
import {
  AT, beachCam, beachCrabAt, beachTime, BURIED, buriedAt, type Cam, colX, CRAB_Y, CREDIT, CREDIT_Y, DIG_S, digEffort, DIGS, digsDone, dewyAt, G, GAME_SWAP, gameCrabAt,
  glintAt, GW_BIG, GW_SMALL, HOLE, kidAt, LOOP_S, PAW_GRIP, PAW_SHELL, PEEK_CRAB, puzzleAt, rowY, type SceneId, shotsAt, SON_ART, SON_AT, SON_SCALE, sonAt, type SonLayer,
  spokenAt, squeezeAt, SWAP, treasureAt, TROPHY_SHELL, W_BIG, W_SMALL, gameCamY,
} from './story';
import ENVELOPE from './envelope.json';
import { WORDS } from './words';

/**
 * Draws "My Son Loves Two Things, So I Made Him A Game" (story.ts has the
 * choreography): the son's beach (son/ poses over beach 1's colours, the
 * game's crab and shells), the game's own beach 1 (sets.ts), Dewy with his
 * tablet showing the game, the captions and the credit.
 */

/** Frame px from a shell's middle to its opening. */
const FOOT_FROM_MIDDLE = FOOT.x - SHELL_MID;
/** Dewy's bust: bottom centre and width; the son with his tablet beside him. */
const DEWY = { x: 330, y: 1935, width: 620 } as const;
const KID = { x: 860, y: 1905, height: 560 } as const;
/** Where the fish on Dewy's tablet is, in proud.png px: the game is shown there instead. */
const TABLET = { tl: { x: 431, y: 990 }, tr: { x: 920, y: 938 }, bl: { x: 480, y: 1330 } } as const;
/** The part of the game view the tablet shows. */
const TABLET_CROP = { x: 40, y: 500, w: 1000, h: 690 } as const;

interface Kit {
  readonly son: SonImages;
  /** peek.png with its painted crab rubbed out, trophy.png with its painted shell (the game's own are drawn there instead). */
  readonly peek: HTMLCanvasElement;
  readonly trophy: HTMLCanvasElement;
  readonly dewy: DewyImages;
  readonly cast: Cast;
  readonly beach: BeachSet;
  readonly game: GameSet;
}

function erasePainted(img: HTMLImageElement, spot: { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number }): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const c = canvas.getContext('2d')!;
  c.drawImage(img, 0, 0);
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.translate(spot.x, spot.y);
  c.scale(1, spot.ry / spot.rx);
  const g = c.createRadialGradient(0, 0, spot.rx * 0.65, 0, 0, spot.rx);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, spot.rx, 0, Math.PI * 2);
  c.fill();
  c.restore();
  return canvas;
}

function withCam(ctx: CanvasRenderingContext2D, cam: Cam, draw: () => void): void {
  const hw = VIDEO.width / 2 / cam.zoom;
  const hh = VIDEO.height / 2 / cam.zoom;
  const x = Math.min(Math.max(cam.x, hw), VIDEO.width - hw);
  const y = Math.min(Math.max(cam.y, hh), VIDEO.height - hh);
  ctx.save();
  ctx.translate(VIDEO.width / 2, VIDEO.height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-x, -y);
  draw();
  ctx.restore();
}

// ---------------------------------------------------------------- the son's beach

function drawSonLayer(ctx: CanvasRenderingContext2D, kit: Kit, l: SonLayer): void {
  if (l.alpha <= 0) return;
  const img: CanvasImageSource = l.key === 'peek' ? kit.peek : l.key === 'trophy' ? kit.trophy : kit.son[l.key];
  const { w, h } = SON_ART[l.key];
  ctx.save();
  ctx.globalAlpha *= l.alpha;
  ctx.translate(l.x, l.y);
  ctx.rotate(l.tilt);
  ctx.scale(1 - l.squash * 0.5, 1 + l.squash);
  ctx.drawImage(img, (-w / 2) * SON_SCALE, -h * SON_SCALE, w * SON_SCALE, h * SON_SCALE);
  ctx.restore();
}

/** A soft, sand-coloured shadow under his patch of painted sand, so it sits in ours. */
function sonShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.16);
  const g = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
  g.addColorStop(0, 'rgba(170,135,85,0.32)');
  g.addColorStop(1, 'rgba(170,135,85,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const drawnOf = (kit: Kit, id: 'small' | 'big', width: number): number => (width / SHELL_UNITS) * kit.cast.fits[id];
const footOf = (kit: Kit, id: 'small' | 'big', width: number, mx: number, facing: number): number => mx + facing * FOOT_FROM_MIDDLE * drawnOf(kit, id, width);

/** Legs: the walk cycle while it scuttles, else the line boil. */
const legsAt = (walking: boolean, t: number, boil: number): number => (walking ? Math.floor(t * 10) % 3 : boil);

/** Where the big shell lands: mouth to mouth with the crab once it has walked out onto the open sand. */
function landing(kit: Kit): ShellPlace {
  const c = beachCrabAt(SWAP.from);
  return { id: 'big', x: footOf(kit, 'small', W_SMALL, c.mx, c.facing), y: c.y, width: W_BIG, facing: -c.facing };
}

function drawBeachCrab(ctx: CanvasRenderingContext2D, kit: Kit, tau: number, boil: number): void {
  const c = beachCrabAt(tau);
  const legs = legsAt(c.walking, tau, boil);
  const foot = footOf(kit, 'small', W_SMALL, c.mx, c.facing);
  const small: ShellPlace = { id: 'small', x: foot, y: c.y, width: W_SMALL, facing: c.facing, rotation: c.rock };
  const big = landing(kit);
  const t = treasureAt(tau);
  const landed = c.swap !== null || c.shell === 'big' || (t.where === 'down' && t.u >= 1);
  if (landed) {
    // The big shell on the sand, on its own shadow, drawn first: the crab walks up in front of it.
    drawShadow(ctx, shellMiddle(kit.cast, big), big.y, W_BIG * 0.36, 0.2);
    if (c.swap === null && c.shell === 'small') drawShell(ctx, kit.cast, big, boil);
  }
  // Once it has slipped across, its kick sends the old shell rolling off a little, so the new home reads.
  const kicked = (p: number): ShellPlace => ({ ...small, x: small.x + 110 * smooth((p - 0.5) / 0.5), rotation: 0.6 * smooth((p - 0.5) / 0.5) });
  if (c.swap !== null) {
    drawShadow(ctx, c.mx, c.y, W_SMALL * 0.3, 0.2);
    drawSwap(ctx, kit.cast, kicked(c.swap), big, W_SMALL, c.swap, legs, boil, small);
    return;
  }
  if (c.shell === 'big') {
    // At home in the big shell, peeking out facing back; the old one lies empty by it.
    drawShell(ctx, kit.cast, kicked(1), boil);
    drawCrab(ctx, kit.cast, { shell: big, fill: FULL * (W_SMALL / W_BIG) * 1.15, reach: 1, legs }, boil);
    return;
  }
  drawShadow(ctx, c.mx, c.y, W_SMALL * 0.3, 0.2);
  drawCrab(ctx, kit.cast, { shell: small, fill: c.fill, reach: c.reach, legs, squash: c.squash }, boil);
}

/**
 * Where the rising shell's base is, `u` 0..1: straight up out of the hole and
 * a little to the right, then up into his raised paw.
 */
function risePoint(u: number, paw: { readonly x: number; readonly y: number }): { readonly x: number; readonly y: number } {
  const out = { x: HOLE.x + 60, y: HOLE.y - 90 };
  if (u < 0.55) {
    const v = smooth(u / 0.55);
    return { x: lerp(HOLE.x + 20, out.x, v), y: lerp(HOLE.y + 190, out.y, Math.sqrt(v)) };
  }
  const v = smooth((u - 0.55) / 0.45);
  return { x: lerp(out.x, paw.x, v), y: lerp(out.y, paw.y, v) };
}

/** The treasure: up out of the hole, over the painted one in his raised paw, then down by the crab. */
function drawTreasure(ctx: CanvasRenderingContext2D, kit: Kit, tau: number, son: readonly SonLayer[], boil: number): void {
  const t = treasureAt(tau);
  if (t.where === 'none' || (t.where === 'down' && t.u >= 1)) return;
  const trophy = son.find((l) => l.key === 'trophy');
  const paw = { x: PAW_GRIP.x + (trophy ? trophy.x - SON_AT.trophy.x : 0), y: PAW_GRIP.y + (trophy ? trophy.y - SON_AT.trophy.y : 0) };
  // The shell drawn by its middle: a shell's middle sits FOOT_FROM_MIDDLE·drawn behind its opening.
  const place = (mx: number, groundY: number, width: number, facing: number, rotation = 0): ShellPlace => ({
    id: 'big', x: mx + facing * FOOT_FROM_MIDDLE * drawnOf(kit, 'big', width), y: groundY, width, facing, rotation, lifted: true,
  });
  if (t.where === 'hole') {
    // Rising out of the sand at the hole: the part still under the surface is hidden.
    const { x, y } = risePoint(t.u, paw);
    ctx.save();
    if (t.u < 0.4) {
      ctx.beginPath();
      ctx.rect(0, 0, VIDEO.width, HOLE.y + 14);
      ctx.clip();
    }
    drawShell(ctx, kit.cast, place(x, y, W_BIG, -1, -0.22 * t.u), boil);
    ctx.restore();
    return;
  }
  if (t.where === 'paw') {
    drawShell(ctx, kit.cast, place(paw.x, paw.y, W_BIG, -1, -0.22), boil);
    return;
  }
  // Swung down in an arc onto the open sand in front of him, where the crab will meet its opening.
  const land = landing(kit);
  // Out to the right first, clear of his face, then down onto the sand.
  const x = lerp(paw.x, shellMiddle(kit.cast, land), t.u) + 230 * Math.sin(Math.PI * t.u);
  const y = lerp(paw.y, land.y, smooth(t.u));
  drawShell(ctx, kit.cast, place(x, y, W_BIG, land.facing, -0.22 * (1 - t.u)), boil);
}

function drawBeach(ctx: CanvasRenderingContext2D, kit: Kit, time: number, boil: number): void {
  const tau = beachTime(time);
  withCam(ctx, beachCam(tau), () => {
    drawBeachSet(ctx, kit.beach, time);
    const son = sonAt(tau);
    sonShadow(ctx, son[son.length - 1]!.x, son[son.length - 1]!.y - 22, 470);
    for (const l of son) drawSonLayer(ctx, kit, l);
    // Sand flying off the spade, and the glint when it hits something.
    const digging = son.some((l) => l.key === 'dig') ? digEffort(tau) * Math.min(1, ...son.filter((l) => l.key === 'dig').map((l) => l.alpha)) : 0;
    drawSpray(ctx, HOLE.x + 20, HOLE.y - 10, DIG_S, tau, digging, 1);
    drawTreasure(ctx, kit, tau, son, boil);
    const t = treasureAt(tau);
    if (t.sparkle > 0) {
      const at = t.where === 'hole' ? { x: risePoint(t.u, PAW_GRIP).x, y: risePoint(t.u, PAW_GRIP).y - 110 } : PAW_SHELL;
      drawSparkles(ctx, at.x, at.y, 170, t.sparkle, tau, 7);
    }
    drawBeachCrab(ctx, kit, tau, boil);
    drawGlint(ctx, HOLE.x + 10, HOLE.y - 6, 84, glintAt(tau), tau);
    const c = beachCrabAt(tau);
    drawQuestion(ctx, c.mx - 20, c.y - 230, 170, puzzleAt(tau), boil);
    drawStrain(ctx, c.mx, c.y, squeezeAt(tau), boil);
  });
}

// ---------------------------------------------------------------- the game

function drawGame(ctx: CanvasRenderingContext2D, kit: Kit, time: number, boil: number): void {
  const t = ((time % LOOP_S) + LOOP_S) % LOOP_S;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.save();
  // The camera follows the crab down its shaft.
  ctx.translate(0, gameCamY(t));
  drawGameSet(ctx, kit.game, digsDone(t), t);
  const c = gameCrabAt(t);
  const b = buriedAt(t);
  const buriedFoot = footOf(kit, 'small', GW_SMALL, gameCrabAt(GAME_SWAP.from).mx, 1);
  const buried: ShellPlace = { id: 'big', x: buriedFoot, y: BURIED.y, width: GW_BIG, facing: -1 };
  const bmid = shellMiddle(kit.cast, buried);
  // Buried, it shows only faintly through the sand with a glint (the game's "something's down there");
  // uncovered, it lies on the game's highlighter swipe.
  if (b.shown < 1) {
    ctx.save();
    ctx.globalAlpha = 0.3 * (1 - b.shown);
    drawShell(ctx, kit.cast, buried, boil);
    ctx.restore();
    drawGlint(ctx, bmid + 40, BURIED.y - GW_BIG * 0.42, 46, 1 - b.shown, t);
  }
  drawHighlight(ctx, bmid, BURIED.y - GW_BIG * 0.2, GW_BIG * 0.8, GW_BIG * 0.42, 0.7 * b.shown, boil);
  const legs = legsAt(c.walking, t, boil);
  const foot = footOf(kit, 'small', GW_SMALL, c.mx, c.facing);
  const small: ShellPlace = { id: 'small', x: foot, y: c.y, width: GW_SMALL, facing: c.facing };
  if (c.swap !== null) {
    drawSwap(ctx, kit.cast, small, { ...buried, x: foot }, GW_SMALL, c.swap, legs, boil);
  } else if (c.shell === 'big') {
    drawShell(ctx, kit.cast, small, boil);
    drawCrab(ctx, kit.cast, { shell: { ...buried, x: foot }, fill: FULL * (GW_SMALL / GW_BIG) * 1.15 * (1 + 0.25 * c.pop), reach: 1, legs }, boil);
  } else {
    if (b.shown > 0) drawShell(ctx, kit.cast, { ...buried, alpha: b.shown }, boil);
    drawCrab(ctx, kit.cast, { shell: small, fill: FULL * (1 + 0.25 * c.pop), reach: 1, legs }, boil);
  }
  drawSparkles(ctx, bmid, BURIED.y - GW_BIG * 0.3, 220, b.sparkle, t, 6);
  // Sand kicked up out of each new hole.
  DIGS.forEach(([at, tiles], i) => {
    const [col, row] = tiles[0]!;
    drawDigClumps(ctx, colX(col) + (tiles.length > 1 ? G.tile : G.tile / 2), rowY(row) + G.tile / 2, t - at, i + 1, 3);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- Dewy, his son, the words

const talkingAt = (t: number): number => (WORDS.some((w) => t >= w.start - 0.05 && t <= w.end + 0.08) ? 1 : 0);

/** The game, as it looks right now, on Dewy's tablet over the painted fish. */
function drawTablet(ctx: CanvasRenderingContext2D, kit: Kit, game: HTMLCanvasElement, t: number, y: number, alpha: number): void {
  if (alpha <= 0) return;
  const img = kit.dewy.proud;
  const w = DEWY.width;
  const h = (img.naturalHeight / img.naturalWidth) * w;
  const k = w / img.naturalWidth;
  const { lift, squash } = bobAt(t, talkingAt(t));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(DEWY.x, y - lift * h);
  ctx.scale(1 - squash * 0.5, 1 + squash);
  ctx.translate(-w / 2, -h);
  const { tl, tr, bl } = TABLET;
  // The affine map taking the crop's corners onto the screen's three corners (px of the pose → canvas).
  const ax = ((tr.x - tl.x) * k) / TABLET_CROP.w;
  const ay = ((tr.y - tl.y) * k) / TABLET_CROP.w;
  const bx = ((bl.x - tl.x) * k) / TABLET_CROP.h;
  const by = ((bl.y - tl.y) * k) / TABLET_CROP.h;
  ctx.transform(ax, ay, bx, by, tl.x * k, tl.y * k);
  ctx.beginPath();
  ctx.rect(0, 0, TABLET_CROP.w, TABLET_CROP.h);
  ctx.clip();
  ctx.drawImage(game, TABLET_CROP.x, TABLET_CROP.y, TABLET_CROP.w, TABLET_CROP.h, 0, 0, TABLET_CROP.w, TABLET_CROP.h);
  // The screen's glass: a soft sheen.
  const g = ctx.createLinearGradient(0, 0, TABLET_CROP.w, TABLET_CROP.h);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TABLET_CROP.w, TABLET_CROP.h);
  ctx.restore();
}

function drawPeople(ctx: CanvasRenderingContext2D, kit: Kit, game: HTMLCanvasElement, t: number): void {
  const kid = kidAt(t);
  if (kid.shown) {
    const img = kit.son.tablet;
    const h = KID.height;
    const w = (img.width / img.height) * h;
    const bounce = Math.abs(Math.sin(Math.PI * t * 2.2)) * 10;
    ctx.save();
    ctx.translate(KID.x, KID.y + kid.down * 700 - bounce);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }
  const d = dewyAt(t);
  if (!d.shown) return;
  const y = DEWY.y + d.down * 900;
  drawDewy(ctx, kit.dewy, {
    t, x: DEWY.x, y, width: DEWY.width, from: d.from, to: d.to, changeAt: d.changeAt, talking: talkingAt(t),
    speech: { words: WORDS, envelope: ENVELOPE as number[] },
  });
  const proud = 1 - clamp01((t - d.changeAt) / 0.15);
  drawTablet(ctx, kit, game, t, y, proud);
}

function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  for (const r of spokenAt(t)) drawSpokenLine(ctx, r.words, r.current, INK_ON_PAPER, RED, r.y, r.size, r.unsaid);
  const credit = creditAt(t, LOOP_S, CREDIT.inAt);
  if (credit > 0) drawTextLine(ctx, CREDIT.text, VIDEO.width / 2, CREDIT_Y, 46, 700, credit, INK_ON_PAPER);
}

// ---------------------------------------------------------------- the short

export async function createCrabTreasure(ctx: CanvasRenderingContext2D): Promise<Short> {
  const [son, dewy] = await Promise.all([loadSon(), loadDewy()]);
  const kit: Kit = { son, peek: erasePainted(son.peek, PEEK_CRAB), trophy: erasePainted(son.trophy, TROPHY_SHELL), dewy, cast: makeCast(), beach: makeBeachSet(), game: makeGameSet() };
  const beachLayer = makeLayer();
  const gameLayer = makeLayer();
  const scene = (id: SceneId, time: number, boil: number): HTMLCanvasElement => {
    const layer = id === 'beach' ? beachLayer : gameLayer;
    layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
    if (id === 'beach') drawBeach(layer.ctx, kit, time, boil);
    else drawGame(layer.ctx, kit, time, boil);
    return layer.canvas;
  };
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const boil = boilAt(t);
      const s = shotsAt(t);
      const under = scene(s.under, t, boil);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      ctx.drawImage(under, 0, 0);
      if (s.over) {
        const over = scene(s.over, t, boil);
        if (s.how === 'iris') {
          const c = beachCrabAt(beachTime(t));
          iris(ctx, over, c.mx, c.y - 90, s.u);
        } else {
          ctx.save();
          ctx.globalAlpha = s.u;
          ctx.drawImage(over, 0, 0);
          ctx.restore();
        }
      }
      if (dewyAt(t).shown) {
        if (s.under !== 'game' && s.over !== 'game') scene('game', t, boil);
        drawPeople(ctx, kit, gameLayer.canvas, t);
      }
      drawWords(ctx, t);
    },
    audio: renderCrabTreasureAudio,
  };
}
