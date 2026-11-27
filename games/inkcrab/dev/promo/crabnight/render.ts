import { bobAt, drawDewy, loadDewy, type DewyImages } from '../../../../inkfish/dev/promo/devstory/dewy';
import { drawSpokenLine, drawTextLine, INK_ON_PAPER, PAPER_ON_DARK, type TextInk } from '../captions';
import { creditAt } from '../credit';
import { makeLayer } from '../crabbird/marks';
import { RED } from '../../../src/art/palette';
import { clamp01, ramp, VIDEO, type Short } from '../short';
import { boilAt } from '../sprites';
import { loadSon, type SonImages } from '../son/son';
import { drawCrab, drawFootprints, drawPlankton, drawSandPuff, drawShellOnly, drawSonOn, drawWave, makeCast, type Cast } from './actors';
import { renderCrabNightAudio } from './audio';
import ENVELOPE from './envelope.json';
import { BURIED, GAME_RES, makeCloseSet, makeDaySet, makeGameSet, makeNightSky, makeWrack, makeWrackCloseSet, nightDye, nightTint } from './scene';
import { GAME_CRAB_SCALE, gameCam, playerAt, toScreen, ZOOM_AT } from './game';
import {
  beamAt, CAPTION_SIZE, CREDIT, CAPTION_Y, CLOSE_SAND_TOP, CLOSE_SCALE, CLOSE_SHELLS, darknessAt, dayCrab, daySon, DEWY, dewySlide, EMERGERS, emergeAt,
  foragers, foragersClose, GAME_SURFACE, LOOP_S, said, WRACK_CLOSE, wrackCloseY, type ShotId, shotsAt, SON_H, spokenAt, sunriseAt, TORCH_SON, torchSonIn, walker, waveAt, wrackShown,
} from './story';
import { WORDS } from './words';

/** Draws "How To Find A Hermit Crab" (story.ts has the choreography). */


interface Kit {
  readonly day: HTMLCanvasElement;
  readonly close: HTMLCanvasElement;
  readonly wrackClose: HTMLCanvasElement;
  readonly wrackCloseLine: HTMLCanvasElement;
  readonly nightSky: HTMLCanvasElement;
  readonly wrack: HTMLCanvasElement;
  readonly game: HTMLCanvasElement;
  readonly cast: Cast;
  readonly son: SonImages;
  readonly dewy: DewyImages;
  readonly world: ReturnType<typeof makeLayer>;
  readonly lit: ReturnType<typeof makeLayer>;
  readonly figure: ReturnType<typeof makeLayer>;
  readonly shot: ReturnType<typeof makeLayer>;
  readonly text: ReturnType<typeof makeLayer>;
  readonly mask: ReturnType<typeof makeLayer>;
}

const DAY_CRAB_SCALE = 1.9;
const SHORE_CRAB_SCALE = 1.5;
/** The torch's lens in the torch pose, as a share of the drawing (before it is mirrored). */
const LENS = { x: 0.472, y: 0.63 } as const;

// ---------------------------------------------------------------- the shots

function drawDay(c: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  c.drawImage(kit.day, 0, 0);
  const son = daySon(t);
  drawFootprints(c, son.x - 150);
  drawCrab(c, kit.cast, dayCrab(t), DAY_CRAB_SCALE, boil);
  const opts = { lift: son.lift, tilt: son.tilt };
  if (son.turned < 1) drawSonOn(c, kit.son, 'search', son.x, son.y, SON_H, { ...opts, alpha: 1 - son.turned });
  if (son.turned > 0) drawSonOn(c, kit.son, 'search', son.x, son.y, SON_H, { ...opts, flip: true, alpha: son.turned });
}

function drawClose(c: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  c.drawImage(kit.close, 0, 0);
  // Far to near, so nearer shells overlap the ones behind.
  const walk = walker(t);
  const behind = CLOSE_SHELLS.filter((s) => s.y < walk.y);
  for (const s of behind) drawShellOnly(c, kit.cast, s.kind, s.x, s.y, s.scale, s.facing, s.tilt, boil);
  drawCrab(c, kit.cast, walk, CLOSE_SCALE, boil);
  for (const s of CLOSE_SHELLS.filter((x) => x.y >= walk.y)) drawShellOnly(c, kit.cast, s.kind, s.x, s.y, s.scale, s.facing, s.tilt, boil);
}

/** The low close view: the wave runs up and draws back, leaving the line of weed; two crabs forage along it. */
function drawWrackClose(c: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  c.drawImage(kit.wrackClose, 0, 0);
  const shown = wrackShown(t);
  if (shown > 0) {
    c.save();
    c.globalAlpha = shown;
    c.drawImage(kit.wrackCloseLine, 0, 0);
    c.restore();
  }
  const w = waveAt(t, WRACK_CLOSE.sea, WRACK_CLOSE.line);
  drawWave(c, w.front, w.water, boil, WRACK_CLOSE.sea, WRACK_CLOSE.k);
  const [a, b] = foragersClose(t);
  drawCrab(c, kit.cast, a!, WRACK_CLOSE.crab, boil, 'whelk');
  drawCrab(c, kit.cast, b!, WRACK_CLOSE.crab, boil, 'moonsnail');
}

/** Everything on the shore that the night dyes and the torch lights: the sand, the weed, the wave, the crabs. */
function drawShoreWorld(c: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  c.drawImage(kit.day, 0, 0);
  const shown = wrackShown(t);
  if (shown > 0) {
    c.save();
    c.globalAlpha = shown;
    c.drawImage(kit.wrack, 0, 0);
    c.restore();
  }
  const w = waveAt(t);
  drawWave(c, w.front, w.water, boil);
  const [a, b] = foragers(t);
  drawCrab(c, kit.cast, a!, SHORE_CRAB_SCALE, boil, 'whelk');
  drawCrab(c, kit.cast, b!, SHORE_CRAB_SCALE, boil, 'moonsnail');
  EMERGERS.forEach((e, i) => {
    const { up, dx } = emergeAt(e, t);
    if (up <= 0) return;
    c.save();
    c.beginPath();
    c.rect(0, 0, VIDEO.width, e.y + 4);
    c.clip();
    drawCrab(c, kit.cast, { x: e.x + dx, y: e.y + (1 - up) * 110, out: ramp(t, e.at + 0.2, e.at + 0.45), facing: e.facing, bob: 0 }, SHORE_CRAB_SCALE, boil, i === 1 ? 'topshell' : 'snail');
    c.restore();
    drawSandPuff(c, e.x, e.y, (t - e.at) / 0.7, i);
  });
}

function lensAt(): { x: number; y: number } {
  const img = TORCH_SON.h;
  // Mirrored: the lens's share from the left becomes its share from the right.
  const w = (1166 / 1348) * img;
  return { x: TORCH_SON.x + (0.5 - LENS.x) * w, y: TORCH_SON.y - (1 - LENS.y) * img };
}

function softEllipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, inner: string, outer: string): void {
  const g = c.createRadialGradient(0, 0, rx * 0.4, 0, 0, rx);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  c.fillStyle = g;
  c.fillRect(-rx, -rx, rx * 2, rx * 2);
  c.restore();
}

/** Fades the painted patch of sand under the son's feet into the night beach: only a soft pool round his feet stays. */
function fadePatch(c: CanvasRenderingContext2D, mask: ReturnType<typeof makeLayer>, x: number, bottom: number, h: number): void {
  const m = mask.ctx;
  m.clearRect(0, 0, VIDEO.width, VIDEO.height);
  const cut = bottom - 0.17 * h;
  const fade = m.createLinearGradient(0, cut - 0.04 * h, 0, cut);
  fade.addColorStop(0, '#000');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  m.fillStyle = '#000';
  m.fillRect(0, 0, VIDEO.width, cut - 0.04 * h);
  m.fillStyle = fade;
  m.fillRect(0, cut - 0.04 * h, VIDEO.width, 0.04 * h);
  softEllipse(m, x, bottom - 0.085 * h, 0.36 * h, 0.12 * h, '#000', 'rgba(0,0,0,0)');
  c.save();
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(mask.canvas, 0, 0);
  c.restore();
}

function drawShore(c: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const { world, lit, figure } = kit;
  world.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawShoreWorld(world.ctx, kit, t, boil);
  c.drawImage(world.canvas, 0, 0);
  const dark = darknessAt(t);
  nightDye(c, dark);
  if (dark > 0) {
    c.save();
    c.globalAlpha = dark;
    c.drawImage(kit.nightSky, 0, 0);
    c.restore();
  }
  const sonIn = torchSonIn(t);
  if (sonIn <= 0) return;
  const beam = beamAt(t);
  const lens = lensAt();
  if (beam.on > 0) {
    // The pool of torchlight: the beach in its own colours there, warm, soft-edged.
    lit.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
    lit.ctx.globalCompositeOperation = 'source-over';
    lit.ctx.drawImage(world.canvas, 0, 0);
    lit.ctx.globalCompositeOperation = 'destination-in';
    softEllipse(lit.ctx, beam.x, beam.y, 260, 120, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)');
    lit.ctx.globalCompositeOperation = 'source-over';
    c.save();
    c.globalAlpha = beam.on * 0.95;
    c.drawImage(lit.canvas, 0, 0);
    c.globalCompositeOperation = 'lighter';
    softEllipse(c, beam.x, beam.y, 240, 100, 'rgba(255,236,170,0.28)', 'rgba(255,236,170,0)');
    // The beam itself, from the lens to the pool.
    const g = c.createLinearGradient(lens.x, lens.y, beam.x, beam.y);
    g.addColorStop(0, 'rgba(255,244,200,0.34)');
    g.addColorStop(1, 'rgba(255,244,200,0.04)');
    c.fillStyle = g;
    c.filter = 'blur(16px)';
    const ang = Math.atan2(beam.y - lens.y, beam.x - lens.x) + Math.PI / 2;
    const [ox, oy] = [Math.cos(ang), Math.sin(ang)];
    c.beginPath();
    c.moveTo(lens.x + ox * 14, lens.y + oy * 14);
    c.lineTo(beam.x + ox * 200, beam.y + oy * 80);
    c.lineTo(beam.x - ox * 200, beam.y - oy * 80);
    c.lineTo(lens.x - ox * 14, lens.y - oy * 14);
    c.closePath();
    c.fill();
    c.filter = 'none';
    c.restore();
  }
  // The son, by moonlight: dimmed a little, his torch glowing.
  figure.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSonOn(figure.ctx, kit.son, 'torch', TORCH_SON.x + 260 * (1 - sonIn), TORCH_SON.y, TORCH_SON.h, { flip: true, lift: 10 * Math.abs(Math.sin(t * 5)) * (1 - sonIn) });
  figure.ctx.save();
  figure.ctx.globalCompositeOperation = 'source-atop';
  figure.ctx.fillStyle = 'rgba(22,28,70,0.36)';
  figure.ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  figure.ctx.restore();
  fadePatch(figure.ctx, kit.mask, TORCH_SON.x + 260 * (1 - sonIn), TORCH_SON.y, TORCH_SON.h);
  c.save();
  c.globalAlpha = clamp01(sonIn * 1.5);
  c.drawImage(figure.canvas, 0, 0);
  c.globalCompositeOperation = 'lighter';
  if (beam.on > 0) softEllipse(c, lens.x, lens.y, 70, 70, `rgba(255,240,190,${0.6 * beam.on})`, 'rgba(255,240,190,0)');
  c.restore();
}

/** Where the tablet's screen is in Dewy's proud pose (its own pixels): we show the game on it. */
const SCREEN = [[438, 990], [972, 938], [984, 1292], [446, 1328]] as const;

function drawDewyAt(c: CanvasRenderingContext2D, kit: Kit, t: number): void {
  const slide = dewySlide(t);
  if (slide >= 1) return;
  const img = kit.dewy.proud;
  const w = DEWY.width;
  const h = (img.naturalHeight / img.naturalWidth) * w;
  const talking = Math.min(ramp(t, said('So') - 0.1, said('So')), 1 - ramp(t, said('beach,'), said('beach,') + 0.15));
  const y = DEWY.y + slide * h * 1.1;
  drawDewy(c, kit.dewy, { t, x: DEWY.x, y, width: w, from: 'proud', talking, speech: { words: WORDS, envelope: ENVELOPE as number[] } });
  // The game on his tablet, in place of the picture painted on it.
  const { lift, squash } = bobAt(t, talking);
  const k = w / img.naturalWidth;
  c.save();
  c.translate(DEWY.x, y - lift * h);
  c.scale(1 - squash * 0.5, 1 + squash);
  c.translate(-w / 2, -h);
  c.scale(k, k);
  c.beginPath();
  SCREEN.forEach(([x, yy], i) => (i ? c.lineTo(x, yy) : c.moveTo(x, yy)));
  c.closePath();
  c.clip();
  const xs = SCREEN.map((p) => p[0]);
  const ys = SCREEN.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // The view round the crab: the strand and the bay, as on the phone's screen.
  c.drawImage(kit.game, 0, 520 * GAME_RES, VIDEO.width * GAME_RES, 880 * GAME_RES, x0, y0, x1 - x0, y1 - y0);
  c.restore();
}

function drawGame(c: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  // The camera: the whole beach while Dewy speaks, then in close on the strand.
  const cam = gameCam(t);
  const world = (draw: () => void): void => {
    c.save();
    c.translate(540, 960);
    c.scale(cam.z, cam.z);
    c.translate(-cam.x, -cam.y);
    draw();
    c.restore();
  };
  world(() => {
    c.drawImage(kit.game, 0, 0, VIDEO.width, VIDEO.height);
    for (const b of BURIED) drawShellOnly(c, kit.cast, b.kind, b.x, b.y, 1.25, -1, 0, boil);
    drawCrab(c, kit.cast, playerAt(t), GAME_CRAB_SCALE, boil);
  });
  nightTint(c);
  // Closing in, the dark comes down round the crab as in the game when the moon goes in (nightView.ts): a pool of sight round it.
  const dim = 0.62 * ramp(t, ZOOM_AT, ZOOM_AT + 0.6);
  if (dim > 0) {
    const eye = toScreen(cam, { x: playerAt(t).x, y: GAME_SURFACE - 60 });
    const m = kit.mask.ctx;
    m.clearRect(0, 0, VIDEO.width, VIDEO.height);
    m.globalCompositeOperation = 'source-over';
    m.fillStyle = '#141c3c';
    m.fillRect(0, 0, VIDEO.width, VIDEO.height);
    m.globalCompositeOperation = 'destination-out';
    const g = m.createRadialGradient(eye.x, eye.y, 260, eye.x, eye.y, 680);
    g.addColorStop(0, '#000');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g;
    m.fillRect(0, 0, VIDEO.width, VIDEO.height);
    m.globalCompositeOperation = 'source-over';
    c.save();
    c.globalAlpha = dim;
    c.drawImage(kit.mask.canvas, 0, 0);
    c.restore();
  }
  world(() => drawPlankton(c, t, 1 + 0.3 * ramp(t, said('glowing') - 0.2, said('glowing') + 0.2)));
  const sun = sunriseAt(t);
  if (sun > 0) {
    c.save();
    c.globalCompositeOperation = 'screen';
    // The sun coming up behind the bay: a warm glow from the horizon, rose higher up.
    const g = c.createRadialGradient(VIDEO.width * 0.62, 900, 40, VIDEO.width * 0.62, 900, 1100);
    g.addColorStop(0, 'rgba(255,214,140,1)');
    g.addColorStop(0.35, 'rgba(250,150,120,0.8)');
    g.addColorStop(1, 'rgba(120,90,160,0.4)');
    c.globalAlpha = 0.65 * sun;
    c.fillStyle = g;
    c.fillRect(0, 0, VIDEO.width, VIDEO.height);
    c.restore();
  }
  drawDewyAt(c, kit, t);
}

function drawShot(c: CanvasRenderingContext2D, kit: Kit, id: ShotId, t: number, boil: number): void {
  if (id === 'day') drawDay(c, kit, t, boil);
  else if (id === 'close') drawClose(c, kit, t, boil);
  else if (id === 'wrack') drawWrackClose(c, kit, t, boil);
  else if (id === 'shore') drawShore(c, kit, t, boil);
  else drawGame(c, kit, t, boil);
}

// ---------------------------------------------------------------- words

/** Captions turn to paper on dark once night has fallen, back to ink by day. */
function inkAt(t: number): TextInk {
  const s = shotsAt(t);
  const nightShot = (id: ShotId | null): boolean => id === 'game' || (id === 'shore' && darknessAt(t) > 0.35);
  const night = s.over && s.u > 0.5 ? nightShot(s.over) : nightShot(s.under);
  return night ? PAPER_ON_DARK : INK_ON_PAPER;
}

function drawWords(c: CanvasRenderingContext2D, kit: Kit, t: number): void {
  const colours = inkAt(t);
  const spoken = spokenAt(t);
  const credit = creditAt(t, LOOP_S, CREDIT.inAt);
  const draw = (cc: CanvasRenderingContext2D): void => {
    drawSpokenLine(cc, spoken.words, spoken.current, colours, RED, CAPTION_Y, CAPTION_SIZE, 0.5);
  };
  if (spoken.alpha >= 1) draw(c);
  else if (spoken.alpha > 0) {
    kit.text.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
    draw(kit.text.ctx);
    c.save();
    c.globalAlpha = spoken.alpha;
    c.drawImage(kit.text.canvas, 0, 0);
    c.restore();
  }
  if (credit > 0) drawTextLine(c, CREDIT.text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, credit, colours);
}

export async function createCrabNight(ctx: CanvasRenderingContext2D): Promise<Short> {
  const [son, dewy] = await Promise.all([loadSon(), loadDewy()]);
  const day = makeDaySet();
  const kit: Kit = {
    day,
    close: makeCloseSet(day, CLOSE_SAND_TOP),
    wrackClose: makeWrackCloseSet(day, WRACK_CLOSE.sea),
    wrackCloseLine: makeWrack(wrackCloseY, WRACK_CLOSE.k),
    nightSky: makeNightSky(),
    wrack: makeWrack(),
    game: makeGameSet(),
    cast: makeCast(),
    son,
    dewy,
    world: makeLayer(),
    lit: makeLayer(),
    figure: makeLayer(),
    shot: makeLayer(),
    text: makeLayer(),
    mask: makeLayer(),
  };
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const boil = boilAt(t);
      const s = shotsAt(t);
      drawShot(ctx, kit, s.under, t, boil);
      if (s.over && s.u > 0) {
        kit.shot.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawShot(kit.shot.ctx, kit, s.over, t, boil);
        ctx.save();
        ctx.globalAlpha = s.u;
        ctx.drawImage(kit.shot.canvas, 0, 0);
        ctx.restore();
      }
      drawWords(ctx, kit, t);
    },
    audio: renderCrabNightAudio,
  };
}

