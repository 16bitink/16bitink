import laptopUrl from './art/screen/laptop.png?url';
import crtUrl from './art/screen/crt.png?url';
import penUrl from './art/screen/pen.png?url';
import arrowUrl from './art/screen/arrow.png?url';
import handUrl from './art/screen/hand.png?url';
import { clamp01, lerpRect, smooth, type Rect } from './kit/geom';

/**
 * "Dewy's screen": the shared kit of the four dev-story shorts (#145–148).
 * 1080×1920 canvas; the screen lives in the top area (y 0–1050). Everything is
 * a pure function of time. The painted art (art/screen/, cut by cut.py from the
 * ElevenLabs generations in raw/) is loaded once with loadScreenArt().
 *
 * Draw order for a frame:  backdrop → screen content (clipped to the screen
 * rect) → glass → drawLaptop / drawCrt / drawMorph (the bezel goes OVER the
 * content: its screen hole is transparent and hides the rect's corners) →
 * things escaping the screen → Dewy → captions.
 *
 * MACHINES (this file)
 *   loadScreenArt(): Promise<ScreenArt>             the laptop, CRT, pen, arrow, hand images
 *   LAPTOP_SCREEN, CRT_SCREEN: Rect                 where each machine's screen is in the default layout
 *   drawLaptop(ctx, art, screen = LAPTOP_SCREEN)    grown-up Dewy's laptop (thin bezel, notch, deck at the bottom)
 *   drawCrt(ctx, art, screen = CRT_SCREEN)          the childhood beige CRT
 *   morphScreen(u): Rect                            the screen rect between laptop (0) and CRT (1)
 *   drawMorph(ctx, art, u)                          laptop ⇄ CRT: both bezels fitted to morphScreen(u), crossfaded
 *   drawGlass(ctx, screen, crt = 0)                 glass over the content: sheen; CRT scanlines, vignette, glow
 *   drawScreenOff / drawDesktop(ctx, screen)        a dark desktop backdrop for the screen
 *
 * PANELS (kit/panels.ts)
 *   drawWindow(ctx, rect, title, { light }) → inner Rect      window chrome (title bar, three dots)
 *   drawEditor(ctx, { rect, t, file, code, typing, highlight, warnings, firstLineNo, fontSize, scrollTo }) → caret Pt
 *   typingDuration(code, cps, fromLine)                        seconds the typing takes (to time the next beat)
 *   drawLog(ctx, { rect, t, rows: { at, text, kind } [] })      console with sliding rows + error badge
 *   drawPreview(ctx, { rect, t, title, draw(ctx, inner), bare, status, popAt }) → viewport Rect
 *   splitH / splitV / inset (kit/geom.ts)                      carve the screen into editor | preview
 *
 * PEN-DRAW REVEAL (kit/penDraw.ts)
 *   makeInkReveal(canvas)                                       once per drawing (traces its outline and spine)
 *   drawInkReveal(ctx, reveal, art.pen, { x, y, width, t, at, inkS, washS, nib, facing }) → nib tip | null
 *   drawPen(ctx, art.pen, tip)                                  the painted dip pen on its own
 *
 * DEBUG (kit/debug.ts)
 *   drawHitbox(ctx, rect, { t, label, at, circle, color })      dashed box, marching ants, tag
 *   drawTargetArrow(ctx, from, to, { t, at, label, bend })      curved dashed arrow
 *   drawReadout(ctx, x, y, { label, value, t, bad })            'duck.y: −12,480' pill (formatNumber)
 *   fishSpinePoints(x, y, length, facing, tilt, n, sway) + drawRigBones(ctx, pts, { t, at, dur, label })
 *   drawWarningStack(ctx, x, y, rows, t)                        red toasts stacking up
 *
 * GAGS (kit/gags.ts)
 *   drawTodo(ctx, { x, y, w, t, title, items: { text, tickAt, showAt } [] })
 *   drawMessage(ctx, { x, y, maxW, text, t, at, from, typingS })   phone bubble with typing dots
 *   clockLabel(min), weekendMinutes('SAT', 16), clockAt(keys, t), drawClock(ctx, { x, y, minutes, t, speed })
 *   countAt(t, from, to, t0, t1) + drawCounter(ctx, { x, y, label, value, fresh })
 *   cursorAt(keys, t) + drawCursor(ctx, art.arrow | art.hand, 'arrow' | 'hand', { x, y, clickAge })
 *
 * THE GAME'S ART (kit/gameArt.ts, kit/levelMap.ts): baked from src/art, cached
 *   drawSea(ctx, rect, t, { surfaceY, night, depth })            paper + sea washes + waterline
 *   drawGameFish(ctx, { shape, x, y, length, facing, tilt, variant, look }, t)   swims, gapes, gulps (swimmer.ts)
 *   fishStill(shape, length) → canvas                            a still fish for makeInkReveal
 *   drawGameSquid(ctx, { x, y, width, facing }, t), squidImage()
 *   drawGameItem(ctx, 'duck', { x, y, width, facing, rot }, t)    the rubber duck decoy (and every other item)
 *   drawGameBird(ctx, 'gull', { x, y, width, facing }, t, flapHz, dive)
 *   drawGameBoat(ctx, 'trawler', { x, y: waterline, width }, t)
 *   drawGameWeed(ctx, kind, x, footY, height, t)
 *   drawLevelMap(ctx, rect, { t, scrollX, done, current }) → world→screen;  levelNodeAt(n)
 *
 * `?short=screenkit` (screenkit/render.ts) shows every piece over 12 s.
 */

export interface ScreenArt {
  readonly laptop: HTMLImageElement;
  readonly crt: HTMLImageElement;
  readonly pen: HTMLImageElement;
  readonly arrow: HTMLImageElement;
  readonly hand: HTMLImageElement;
}

export async function loadScreenArt(): Promise<ScreenArt> {
  const load = async (src: string): Promise<HTMLImageElement> => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  };
  const [laptop, crt, pen, arrow, hand] = await Promise.all([laptopUrl, crtUrl, penUrl, arrowUrl, handUrl].map(load));
  return { laptop: laptop!, crt: crt!, pen: pen!, arrow: arrow!, hand: hand! };
}

/** Source geometry of the laptop image (1280×720, see cut.py): its screen, and the rows the 3-slice stretches between. */
const LAPTOP_SRC = { screen: { x: 125, y: 25, w: 1030, h: 573 }, sliceTop: 64, sliceBottom: 556 } as const;
/** The CRT image's screen (1280×720). */
const CRT_SRC = { screen: { x: 314, y: 86, w: 649, h: 440 } } as const;

/** The laptop's screen in the default layout: full width, y 30–868; the keyboard deck peeks in below to ~y 975. */
export const LAPTOP_SCREEN: Rect = { x: 46, y: 30, w: 988, h: 838 };
/** The CRT's screen in the default layout (the casing spans ~x 15–1060, y 105–910). */
export const CRT_SCREEN: Rect = { x: 170, y: 198, w: 740, h: 502 };

/**
 * The laptop fitted to `screen`: scaled to its width, and stretched only
 * through the plain middle of the lid (3-slice), so the notch and the keyboard
 * deck keep their painted shape whatever the screen's height.
 */
export function drawLaptop(ctx: CanvasRenderingContext2D, art: ScreenArt, screen: Rect = LAPTOP_SCREEN, alpha = 1): void {
  const img = art.laptop;
  const src = LAPTOP_SRC;
  const s = screen.w / src.screen.w;
  const x0 = screen.x - src.screen.x * s;
  const topY0 = screen.y - src.screen.y * s;
  const bottomY0 = screen.y + screen.h - (src.screen.y + src.screen.h - src.sliceBottom) * s;
  const midTop = topY0 + src.sliceTop * s;
  const W = img.width * s;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, 0, 0, img.width, src.sliceTop, x0, topY0, W, src.sliceTop * s + 0.5);
  ctx.drawImage(img, 0, src.sliceTop, img.width, src.sliceBottom - src.sliceTop, x0, midTop, W, bottomY0 - midTop + 0.5);
  ctx.drawImage(img, 0, src.sliceBottom, img.width, img.height - src.sliceBottom, x0, bottomY0, W, (img.height - src.sliceBottom) * s);
  ctx.restore();
}

/** The beige CRT fitted to `screen` (stretched to it if the aspect differs: fine mid-morph). */
export function drawCrt(ctx: CanvasRenderingContext2D, art: ScreenArt, screen: Rect = CRT_SCREEN, alpha = 1): void {
  const img = art.crt;
  const sx = screen.w / CRT_SRC.screen.w;
  const sy = screen.h / CRT_SRC.screen.h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, screen.x - CRT_SRC.screen.x * sx, screen.y - CRT_SRC.screen.y * sy, img.width * sx, img.height * sy);
  ctx.restore();
}

/** The screen rect `u` of the way from the laptop (0) to the CRT (1), eased. */
export const morphScreen = (u: number): Rect => lerpRect(LAPTOP_SCREEN, CRT_SCREEN, smooth(u));

/**
 * Laptop ⇄ CRT. Both bezels are fitted to morphScreen(u) and crossfade over the
 * middle of the move, so content drawn in morphScreen(u) stays framed throughout.
 */
export function drawMorph(ctx: CanvasRenderingContext2D, art: ScreenArt, u: number): void {
  const r = morphScreen(u);
  const fade = smooth(clamp01((u - 0.25) / 0.5));
  if (fade < 1) drawLaptop(ctx, art, r, 1 - fade);
  if (fade > 0) drawCrt(ctx, art, r, fade);
}

/** Glass over the content: a soft diagonal sheen; with `crt` (0..1) also scanlines, a vignette and a warm phosphor glow. */
export function drawGlass(ctx: CanvasRenderingContext2D, r: Rect, crt = 0): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const sheen = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.6, r.y + r.h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.03)');
  sheen.addColorStop(0.36, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (crt > 0) {
    ctx.globalAlpha = crt;
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let y = r.y; y < r.y + r.h; y += 4) ctx.fillRect(r.x, y, r.w, 1.6);
    const vig = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, r.h * 0.3, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.72);
    vig.addColorStop(0, 'rgba(255,240,200,0.06)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
}

/** A dark desktop wallpaper for the screen (ink-blue with a faint wash), drawn before the windows. */
export function drawDesktop(ctx: CanvasRenderingContext2D, r: Rect): void {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, '#22304a');
  g.addColorStop(1, '#141a28');
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

export * from './kit/geom';
export * from './kit/panels';
export * from './kit/penDraw';
export * from './kit/debug';
export * from './kit/gags';
export * from './kit/gameArt';
export * from './kit/levelMap';
