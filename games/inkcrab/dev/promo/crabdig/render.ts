import { drawDewy, loadDewy, type DewyImages } from '../../../../inkfish/dev/promo/devstory/dewy';
import { drawSpokenLine, INK_ON_PAPER } from '../captions';
import { withCredit } from '../credit';
import { inkWash, makeLayer } from '../crabbird/marks';
import { RED, TUNNEL } from '../../../src/art/palette';
import { SHELL_UNITS } from '../../../src/art/frame';
import { crabShift } from '../../../src/art/mouth';
import { shellPx } from '../../../src/logic/shells';
import { drawSon, loadSon, type SonImages } from '../son/son';
import { clamp01, lerp, ramp, VIDEO, type Short } from '../short';
import { boilAt } from '../sprites';
import {
  type Backdrop, type Cast, cached, drawCrab, drawDamp, drawGlint, drawGrains, drawNaked, drawNight, drawPrint, drawPuffAt, drawSand, drawShellAt, drawSky,
  drawSwipe, drawnOf, footFromMiddle, makeBackdrop, makeCast, middleFromFoot, type Sand,
} from './art';
import { renderCrabDigAudio } from './audio';
import envelope from './envelope.json';
import {
  AT, BURIED, camAt, CREDIT, gameCamAt, CHAMBER, CHAMBER_R, closeClock, closeCrab, type CrabPose, chamberAt, DEWY, dewyExitAt, dewyShowing, DIG_A, digDepthAt, dampAt, dugTiles, ENTRY,
  fillAt, tunnelR, GAME, gameCrabAt, grainsAt, lapseShowAt, LOOP_S, moveAt, NEW_HOME, nightAt, OWN_SHELL, printsAt, type ShotId, shotsAt, skinAt, skyAngleAt,
  sonDigAt, sonSandAt, sonTrophyAt, spokenAt, type Cam,
} from './story';
import { drawTablet, makeTabletArt } from './tablet';
import { WORDS } from './words';

/** Draws "Land hermit crabs bury themselves to grow" (story.ts has the choreography). */

export { CREDIT } from './story';

/** The crab's own shell in the close shot: the same kind as the game's new home, so the loop lands on it. */
const CLOSE_KIND = NEW_HOME.kind;
/** Screen px per frame px of the close crab's shell, at zoom 1. */
const CLOSE_UNIT = 560 / SHELL_UNITS;
/** The close shot's sand: 30 px tiles (10 game units at 3×), from world x CLOSE_X0. */
const CLOSE = { x0: -1400, cols: 100, rows: 100, units: 10, res: 3 } as const;
const CLOSE_TILE = CLOSE.units * CLOSE.res;
/** Game view: world px per tile (16) at 4× zoom. */
const GAME_ZOOM = GAME.tile / 16;
/** Paper under the game's tunnel shade (TUNNEL at 0.55), behind any hole open to the sky. */
const BURROW = TUNNEL;

interface Kit {
  readonly cast: Cast;
  readonly back: Backdrop;
  readonly son: SonImages;
  readonly dewy: DewyImages;
  readonly tablet: HTMLCanvasElement;
  readonly closeSand: (key: string) => Sand;
  readonly gameSand: (key: string) => Sand;
}

// ------------------------------------------------------------------ the close shot

const DIR = { x: Math.cos(DIG_A), y: Math.sin(DIG_A) };

/** Which close tiles are open at close time t: the tunnel (minus what has filled back in) and the chamber. */
function closeKey(t: number): string {
  return [Math.round(digDepthAt(t) / 8), Math.round(fillAt(t) / 8), Math.round(chamberAt(t) * 24)].join(',');
}

function makeCloseSand(key: string): Sand {
  const [depth, fill, chamber] = key.split(',').map(Number) as [number, number, number];
  const tip = depth * 8;
  const filled = fill * 8;
  const c = chamber / 24;
  return drawSand(CLOSE.cols, CLOSE.rows, CLOSE.units, CLOSE.res, (i, j) => {
    const x = CLOSE.x0 + (i + 0.5) * CLOSE_TILE;
    const y = (j + 0.5) * CLOSE_TILE;
    const dx = x - ENTRY.x;
    const dy = y - ENTRY.y;
    const along = dx * DIR.x + dy * DIR.y;
    const across = Math.abs(-dx * DIR.y + dy * DIR.x);
    // The tunnel runs from the surface to just past the crab's middle (its head end is rounded off).
    const r = tunnelR(along);
    const inTunnel = along >= filled && across < r && (along <= tip + 80 || Math.hypot(along - tip - 80, across) < r);
    const k = 0.35 + 0.65 * c;
    const inChamber = c > 0 && ((x - CHAMBER.x) / (CHAMBER_R.x * k)) ** 2 + ((y - CHAMBER.y) / (CHAMBER_R.y * k)) ** 2 < 1;
    return inTunnel || inChamber;
  });
}

/** The crab's opening (FOOT) for a pose given by its middle. */
function footOf(pose: CrabPose, unit: number): { x: number; y: number } {
  const m = middleFromFoot(unit);
  const c = Math.cos(pose.rot);
  const s = Math.sin(pose.rot);
  return { x: pose.at.x - (m.x * c - m.y * s), y: pose.at.y - (m.x * s + m.y * c) };
}

function drawCloseCrab(ctx: CanvasRenderingContext2D, kit: Kit, pose: CrabPose, t: number, boil: number, body: 'crab' | 'skin', alpha = 1): void {
  const unit = CLOSE_UNIT * pose.k;
  const foot = footOf(pose, unit);
  // Digging, the legs work faster than the line boils.
  const b = pose.dig > 0.3 ? Math.floor(t * 14) % 3 : boil;
  drawCrab(ctx, kit.cast, { x: foot.x, y: foot.y, unit, kind: CLOSE_KIND, facing: 1, rot: pose.rot, body, alpha }, b);
}

function drawClose(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const cam: Cam = camAt(t);
  ctx.save();
  ctx.translate(cam.ox, cam.oy);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.drawImage(kit.back.canvas, kit.back.left, -kit.back.surface);
  // Under the sand, where a tunnel opens to the sky: the shade of a burrow, never the page.
  ctx.fillStyle = BURROW;
  ctx.fillRect(CLOSE.x0, 0, CLOSE.cols * CLOSE_TILE, CLOSE.rows * CLOSE_TILE);
  const sand = kit.closeSand(closeKey(t));
  ctx.drawImage(sand.canvas, CLOSE.x0 - sand.pad, -sand.pad);
  drawDamp(ctx, CHAMBER.x, CHAMBER.y + 20, 800, dampAt(t));
  for (const p of printsAt(t)) drawPrint(ctx, p.x, 18, 4, p.kind, p.flip, p.alpha);
  const skin = skinAt(t);
  if (skin) drawCloseCrab(ctx, kit, { at: skin.at, rot: skin.rot, k: 1, dig: 0 }, t, (boil + 1) % 3, 'skin', skin.alpha);
  drawCloseCrab(ctx, kit, closeCrab(t), t, boil, 'crab');
  drawGrains(ctx, grainsAt(t), 1);
  const son = sonDigAt(t);
  if (son) {
    drawSandShadow(ctx, son.x + 10, 40, 760, son.alpha);
    drawSon(ctx, kit.son, { key: son.key, x: son.x, y: son.y, height: son.height, tilt: son.tilt, alpha: son.alpha });
    drawGrains(ctx, sonSandAt(t), 1);
  }
  ctx.restore();
  // Days and nights racing past overhead while the crab lies still.
  const night = nightAt(t);
  drawNight(ctx, cam.oy, night);
  const show = lapseShowAt(t);
  if (show > 0) {
    const a = skyAngleAt(t);
    // Each rises at one edge, arcs over the sea and sets at the other, under the beach's line.
    const arc = (angle: number): { x: number; y: number } => ({ x: 540 + 600 * Math.sin(angle), y: cam.oy - 50 - 230 * Math.cos(angle) });
    const sun = arc(a);
    const moon = arc(a + Math.PI);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIDEO.width, cam.oy - 4);
    ctx.clip();
    drawSky(ctx, sun.x, sun.y, 44, 'sun', show, boil);
    drawSky(ctx, moon.x, moon.y, 36, 'moon', show, boil);
    ctx.restore();
  }
}

/** A soft sandy shadow under a figure, so his own patch of sand sits into the beach. */
function drawSandShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * 0.35;
  const g = ctx.createRadialGradient(x, y, 0, x, y, w / 2);
  g.addColorStop(0, 'rgba(107,90,60,0.8)');
  g.addColorStop(1, 'rgba(107,90,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, w / 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ the game shot

const OWN_UNIT = (shellPx(OWN_SHELL.size) / SHELL_UNITS) * GAME_ZOOM;
const NEW_UNIT = (shellPx(NEW_HOME.size) / SHELL_UNITS) * GAME_ZOOM;

/** Where the crab stops beside the new home: their openings meet, as the game sets them mouth to mouth. */
function meetX(cast: Cast): number {
  return NEW_HOME.x * GAME.tile + footFromMiddle(cast, NEW_HOME.kind, NEW_UNIT) + footFromMiddle(cast, OWN_SHELL.kind, OWN_UNIT);
}

/** The game crab's shell middle on screen. */
function gameCrabScreen(cast: Cast, t: number): { x: number; y: number; facing: 1 | -1; moving: boolean } {
  const c = gameCrabAt(t);
  const x = lerp(c.x * GAME.tile, meetX(cast), ramp(t, AT.bigger - 1.0, AT.bigger - 0.45));
  return { x, y: GAME.top + c.y * GAME.tile, facing: c.facing, moving: c.moving };
}

/** Tiles round the new home, dug free as the crab gets there. */
function homeTiles(): string[] {
  const out: string[] = [];
  for (let x = Math.floor(NEW_HOME.x - 1.2); x <= Math.floor(NEW_HOME.x + 1.2); x++) for (const y of [NEW_HOME.y - 2, NEW_HOME.y - 1]) out.push(`${x},${y}`);
  return out;
}

function gameKey(t: number): string {
  const dug = [...dugTiles(t)];
  if (t > AT.bigger - 0.75) dug.push(...homeTiles());
  return [...new Set(dug)].sort().join(';');
}

/** Extra columns of sand each side of the screen, so the grid's edge (rock, inked) never shows. */
const SIDE = 2;

function makeGameSand(key: string): Sand {
  const open = new Set(key.split(';'));
  return drawSand(GAME.cols + 2 * SIDE, GAME.rows, 16, GAME_ZOOM, (i, j) => open.has(`${i - SIDE},${j}`));
}

function drawGameCrab(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const { cast } = kit;
  const c = gameCrabScreen(cast, t);
  const b = c.moving ? Math.floor(t * 10) % 3 : boil;
  const p = moveAt(t);
  const homeX = NEW_HOME.x * GAME.tile;
  const homeY = GAME.top + NEW_HOME.y * GAME.tile;
  if (p <= 0) {
    drawCrab(ctx, cast, { x: c.x + c.facing * footFromMiddle(cast, OWN_SHELL.kind, OWN_UNIT), y: c.y, unit: OWN_UNIT, kind: OWN_SHELL.kind, facing: c.facing }, b);
    return;
  }
  // The game's move-house: the old shell where it is, the new one mouth to mouth with it; the soft crab reaches across, a puff hides the switch.
  const oldFoot = c.x - footFromMiddle(cast, OWN_SHELL.kind, OWN_UNIT);
  drawShellAt(ctx, cast, OWN_SHELL.kind, c.x, c.y, OWN_UNIT, -1, boil);
  const SWITCH = 0.5;
  if (p < SWITCH) {
    drawShellAt(ctx, cast, NEW_HOME.kind, homeX, homeY, NEW_UNIT, 1, boil);
    const reach = clamp01(p / (SWITCH - 0.08));
    const s = OWN_UNIT * 0.93 * (0.75 + 0.35 * reach);
    const shift = crabShift(OWN_SHELL.kind, drawnOf(cast, OWN_SHELL.kind, OWN_UNIT), s) - 26 * reach;
    drawNaked(ctx, cast, oldFoot - shift, c.y, s, -1, Math.floor(t * 12) % 3);
  } else {
    const out = clamp01((p - SWITCH) / 0.35);
    const foot = homeX + footFromMiddle(cast, NEW_HOME.kind, NEW_UNIT);
    drawCrab(ctx, cast, { x: foot, y: homeY, unit: NEW_UNIT, kind: NEW_HOME.kind, facing: 1, fill: 0.62 + 0.24 * out }, boil);
  }
  const puff = Math.max(0, 1 - Math.abs(p - SWITCH) / 0.18);
  drawPuffAt(ctx, cast, oldFoot, homeY - 40, 230 * (0.6 + 0.4 * puff), puff, boil);
}

function drawGame(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const cam = gameCamAt(t);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.zoom, cam.zoom);
  const g = 0.92;
  const back = kit.back;
  ctx.drawImage(back.canvas, 540 + (back.left - 140) * g, GAME.top - back.surface * g, back.canvas.width * g, back.canvas.height * g);
  ctx.fillStyle = BURROW;
  ctx.fillRect(-SIDE * GAME.tile, GAME.top, VIDEO.width + 2 * SIDE * GAME.tile, VIDEO.height);
  const sand = kit.gameSand(gameKey(t));
  ctx.drawImage(sand.canvas, -SIDE * GAME.tile - sand.pad, GAME.top - sand.pad);
  // Buried shells: the game's faint highlighter swipe says something's down there; each glints as it's named.
  const freed = t > AT.bigger - 0.75;
  BURIED.forEach((s, i) => {
    const unit = (shellPx(s.size) / SHELL_UNITS) * GAME_ZOOM;
    const w = unit * SHELL_UNITS;
    const cx = s.x * GAME.tile;
    const gy = GAME.top + s.y * GAME.tile;
    const isHome = s === NEW_HOME;
    if (isHome && moveAt(t) > 0) return;
    drawSwipe(ctx, cx, gy - w * 0.3, w * 1.25, w * 0.75, isHome && freed ? 0.7 : 0.4, i);
    const seen = ramp(t, s.glint - 0.1, s.glint + 0.25);
    drawShellAt(ctx, kit.cast, s.kind, cx, gy, unit, isHome ? 1 : (i % 2 === 0 ? 1 : -1), boil, isHome && freed ? 1 : 0.15 + 0.45 * seen);
    drawGlint(ctx, cx + w * 0.18, gy - w * 0.55, 46, (t - s.glint) / 0.6);
    if (isHome) drawGlint(ctx, cx - w * 0.2, gy - w * 0.35, 60, (t - AT.treasure - 0.4) / 0.7);
  });
  drawGameCrab(ctx, kit, t, boil);
  const son = sonTrophyAt(t);
  if (son) {
    drawSandShadow(ctx, son.x + 10, GAME.top + 18, 320, son.alpha);
    drawSon(ctx, kit.son, { key: son.key, x: son.x, y: son.y, height: son.height, tilt: son.tilt, alpha: son.alpha });
  }
  ctx.restore();
  if (dewyShowing(t)) {
    const y = DEWY.bottom + dewyExitAt(t);
    const talking = talkingAt(t);
    drawDewy(ctx, kit.dewy, { t, x: DEWY.x, y, width: DEWY.width, from: 'proud', enterAt: AT.dewyIn, talking, speech: { words: WORDS, envelope } });
    drawTablet(ctx, kit.dewy, kit.tablet, { t, x: DEWY.x, y, width: DEWY.width, enterAt: AT.dewyIn, talking });
  }
}

/** 0..1: is a word being said (for Dewy's talking bob). */
function talkingAt(t: number): number {
  return WORDS.some((w) => t >= w.start - 0.05 && t <= w.end + 0.1) ? 1 : 0.2;
}

// ------------------------------------------------------------------ the short

function drawShot(ctx: CanvasRenderingContext2D, kit: Kit, id: ShotId, t: number, boil: number): void {
  if (id === 'close') drawClose(ctx, kit, closeClock(t), boil);
  else drawGame(ctx, kit, t, boil);
}

async function createInner(ctx: CanvasRenderingContext2D): Promise<Short> {
  const [son, dewy] = await Promise.all([loadSon(), loadDewy()]);
  const cast = makeCast([CLOSE_KIND, OWN_SHELL.kind, ...BURIED.map((b) => b.kind)]);
  const kit: Kit = {
    cast,
    tablet: makeTabletArt(cast),
    back: makeBackdrop(),
    son,
    dewy,
    closeSand: cached(makeCloseSand),
    gameSand: cached(makeGameSand),
  };
  const layer = makeLayer();
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const boil = boilAt(t);
      const s = shotsAt(t);
      drawShot(ctx, kit, s.under, t, boil);
      if (s.over) {
        layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawShot(layer.ctx, kit, s.over, t, boil);
        if (s.how === 'wash') inkWash(ctx, layer.canvas, layer.ctx, s.u);
        else {
          ctx.save();
          ctx.globalAlpha = s.u;
          ctx.drawImage(layer.canvas, 0, 0);
          ctx.restore();
        }
      }
      for (const r of spokenAt(t)) drawSpokenLine(ctx, r.words, r.current, INK_ON_PAPER, RED, r.y, r.size);
    },
    audio: renderCrabDigAudio,
  };
}

/** The short with its credit, which main.ts doesn't add for this one. */
export async function createCrabDig(ctx: CanvasRenderingContext2D): Promise<Short> {
  return withCredit(await createInner(ctx), ctx, undefined, CREDIT);
}
