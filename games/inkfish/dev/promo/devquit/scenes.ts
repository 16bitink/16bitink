import { SEA_EVENTS, type SeaEventId } from '../../../src/logic/seaEvents';
import {
  clipped, drawGameBird, drawGameBoat, drawGameFish, drawGameItem, drawGameSquid, drawGameWeed, drawSea, drawTargetArrow, HAND, pop, ramp, type Rect,
} from '../devstory/screen';

/** The small game scenes on Dewy's screen: level thumbnails, the paused level, and the three sea events. */

export type Kind = 'plain' | 'night' | 'fleet' | 'bait' | 'hunter' | 'deep' | 'birds' | 'boat' | 'duck';
/** What the thumbnails flip into, in order (the first is a plain one only for completeness). */
export const FLIP_KINDS: readonly Kind[] = ['fleet', 'bait', 'hunter', 'night', 'deep', 'birds', 'boat', 'duck'];

/** Where the tiny player fish sits in a plain level, as fractions of the view. */
const START = { x: 0.3, y: 0.58, length: 0.1 } as const;

/** A level in miniature (or in full): the same sea, weed and tiny fish for 'plain', a twist for the rest. */
export function drawLevel(c: CanvasRenderingContext2D, r: Rect, t: number, kind: Kind): void {
  const u = r.w;
  const surfaceY = r.y + r.h * (kind === 'fleet' || kind === 'boat' || kind === 'birds' ? 0.3 : 0.14);
  drawSea(c, r, t, { surfaceY, night: kind === 'night' ? 0.9 : 0, depth: kind === 'deep' ? 0.85 : undefined });
  drawGameWeed(c, 0, r.x + u * 0.18, r.y + r.h + 4, r.h * 0.34, t);
  drawGameWeed(c, 1, r.x + u * 0.78, r.y + r.h + 4, r.h * 0.3, t);
  const px = r.x + u * START.x;
  const py = r.y + r.h * START.y;
  const player = u * START.length;
  if (kind === 'fleet' || kind === 'boat') drawGameBoat(c, kind === 'fleet' ? 'trawler' : 'skiff', { x: r.x + u * 0.62, y: surfaceY, width: u * 0.36 }, t);
  if (kind === 'birds') {
    drawGameBird(c, 'gull', { x: r.x + u * 0.6, y: r.y + r.h * 0.14, width: u * 0.2, facing: -1 }, t);
    drawGameBird(c, 'tern', { x: r.x + u * 0.8, y: r.y + r.h * 0.2, width: u * 0.14 }, t + 0.3);
  }
  if (kind === 'duck') drawGameItem(c, 'duck', { x: r.x + u * 0.65, y: surfaceY - 4, width: u * 0.14, facing: -1 }, t);
  if (kind === 'deep') drawGameSquid(c, { x: r.x + u * 0.68, y: r.y + r.h * 0.62, width: u * 0.5 }, t);
  if (kind === 'hunter') drawGameFish(c, { shape: 'shark', variant: 'heavy', x: r.x + u * 0.74, y: r.y + r.h * 0.5, length: u * 0.4, facing: -1 }, t);
  if (kind === 'bait') {
    for (let k = 0; k < 7; k++) drawGameFish(c, { shape: 'sardine', x: r.x + u * (0.55 + 0.07 * Math.cos(k * 2.1)), y: r.y + r.h * (0.5 + 0.1 * Math.sin(k * 1.7)), length: u * 0.08, facing: -1 }, t + k * 0.1);
  }
  drawGameFish(c, { shape: 'inkling', x: px, y: py, length: player, facing: 1 }, t);
}

/** A flipping thumbnail: `u` 0..1 of the turn; the plain face turns edge-on, then the new one turns out. */
export function drawFlipThumb(c: CanvasRenderingContext2D, r: Rect, t: number, kind: Kind, u: number): void {
  const k = Math.abs(Math.cos(Math.PI * u));
  const cx = r.x + r.w / 2;
  c.save();
  c.translate(cx, 0);
  c.scale(Math.max(0.02, k), 1);
  c.translate(-cx, 0);
  clipped(c, r, () => drawLevel(c, r, t, u < 0.5 ? 'plain' : kind));
  c.restore();
}

/** A hand-lettered label with a paper halo. */
export function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill = '#1b1a1f', halo = '#f4eddc'): void {
  c.save();
  c.font = `700 ${size}px ${HAND}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = size * 0.18;
  c.strokeStyle = halo;
  c.strokeText(text, x, y);
  c.fillStyle = fill;
  c.fillText(text, x, y);
  c.restore();
}

/** The game's own banner for a sea event: its real title and line; red for a threat. */
export function drawEventBanner(c: CanvasRenderingContext2D, v: Rect, t: number, at: number, id: SeaEventId): void {
  const info = SEA_EVENTS[id];
  const s = pop(t, at, 0.3);
  if (s <= 0) return;
  const w = v.w - 120;
  const h = 210;
  c.save();
  c.translate(v.x + v.w / 2, v.y + 50 + h / 2);
  c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,0.4)';
  c.shadowBlur = 18;
  c.shadowOffsetY = 8;
  c.fillStyle = info.danger ? '#a3342b' : '#2f6f8f';
  c.beginPath();
  c.roundRect(-w / 2, -h / 2, w, h, 26);
  c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = '#f4eddc';
  c.lineWidth = 4;
  c.stroke();
  c.fillStyle = '#f4eddc';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `700 100px ${HAND}`;
  c.fillText(info.title, 0, -38);
  c.font = `600 38px ${HAND}`;
  const words = info.line.split(' ');
  const rows: string[] = [];
  for (const word of words) {
    const last = rows[rows.length - 1];
    if (last !== undefined && c.measureText(`${last} ${word}`).width < w - 90) rows[rows.length - 1] = `${last} ${word}`;
    else rows.push(word);
  }
  rows.forEach((row, i) => c.fillText(row, 0, 38 + i * 40));
  c.restore();
}

const sway = (t: number, k: number): number => Math.sin(t * 1.7 + k);

/** Fishing fleet: boats on the surface, dotted warnings, then hooks dropping. ft = seconds into the scene. */
export function drawFleetScene(c: CanvasRenderingContext2D, v: Rect, t: number, ft: number): void {
  const surf = v.y + 430;
  drawSea(c, v, t, { surfaceY: surf });
  for (let k = 0; k < 3; k++) drawGameWeed(c, (k % 3) as 0 | 1 | 2, v.x + 120 + k * 380, v.y + v.h + 8, 250, t);
  const boats = [{ x: v.x + 230, w: 340, kind: 'trawler' as const }, { x: v.x + 640, w: 260, kind: 'skiff' as const }, { x: v.x + 900, w: 220, kind: 'dinghy' as const }];
  boats.forEach((b, k) => {
    const y = surf + Math.sin(t * 2 + k) * 4;
    drawGameBoat(c, b.kind, { x: b.x, y, width: b.w }, t);
    const hx = b.x - b.w * 0.2;
    const drop = ramp(ft, 0.25 + k * 0.12, 0.7 + k * 0.12);
    const depth = y + 40 + drop * (250 + k * 70);
    c.save();
    c.lineWidth = 4;
    if (drop <= 0) {
      c.setLineDash([10, 14]);
      c.strokeStyle = 'rgba(255,75,62,0.9)';
      c.beginPath();
      c.moveTo(hx, y + 40);
      c.lineTo(hx, y + 40 + 330);
      c.stroke();
    } else {
      c.strokeStyle = '#2b2430';
      c.beginPath();
      c.moveTo(hx, y + 30);
      c.lineTo(hx, depth);
      c.stroke();
      c.lineWidth = 7;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(hx + 14, depth + 4, 15, Math.PI * 0.9, Math.PI * 2.3);
      c.stroke();
    }
    c.restore();
  });
  const px = v.x + 470 + sway(t, 0) * 70;
  drawGameFish(c, { shape: 'inkling', x: px, y: v.y + 740 + sway(t, 2) * 20, length: 130, facing: 1 }, t);
}

/** Bait ball: a rushing school swirling round the player, who feasts. */
export function drawBaitScene(c: CanvasRenderingContext2D, v: Rect, t: number, ft: number): void {
  drawSea(c, v, t, { surfaceY: v.y + 150 });
  for (let k = 0; k < 3; k++) drawGameWeed(c, (k % 3) as 0 | 1 | 2, v.x + 150 + k * 380, v.y + v.h + 8, 260, t);
  const cx = v.x + v.w / 2 + 60;
  const cy = v.y + 520;
  const eat = ramp(ft, 0.2, 0.7);
  for (let k = 0; k < 28; k++) {
    const a = t * 2.2 + k * 0.62 + (k % 3);
    const rad = 120 + (k % 7) * 28 + 40 * Math.sin(t + k);
    const x = cx + Math.cos(a) * rad * 1.5;
    const y = cy + Math.sin(a) * rad * 0.9;
    const eaten = k % 5 === 0 && ft > 0.45 + (k % 4) * 0.12;
    if (!eaten) drawGameFish(c, { shape: 'sardine', x, y, length: 74, facing: Math.sin(a) > 0 ? -1 : 1, tilt: 0.2 }, t + k * 0.13);
  }
  drawGameFish(c, { shape: 'inkling', x: cx - 330 + eat * 280, y: cy + 40 + sway(t, 1) * 30, length: 180, facing: 1, look: { jaw: 0.5 + 0.5 * Math.sin(t * 9) } }, t);
}

/** Hunter: a shark closes in on the player; a debug arrow shows who it wants. */
export function drawHunterScene(c: CanvasRenderingContext2D, v: Rect, t: number, ft: number): void {
  drawSea(c, v, t, { surfaceY: v.y + 150 });
  for (let k = 0; k < 3; k++) drawGameWeed(c, (k % 3) as 0 | 1 | 2, v.x + 150 + k * 380, v.y + v.h + 8, 270, t);
  const player = { x: v.x + 250 + ft * 60, y: v.y + 560 + sway(t, 0) * 30 };
  const shark = { x: v.x + v.w + 220 - ft * 420, y: v.y + 470 + sway(t, 3) * 40 };
  drawGameFish(c, { shape: 'shark', variant: 'heavy', x: shark.x, y: shark.y, length: 520, facing: -1, tilt: 0.06 }, t);
  drawGameFish(c, { shape: 'inkling', x: player.x, y: player.y, length: 130, facing: 1, effort: 1 }, t);
  drawTargetArrow(c, { x: shark.x - 270, y: shark.y - 20 }, { x: player.x + 50, y: player.y - 30 }, { t, at: 0.2, label: 'target: YOU', bend: 0.25 });
  c.fillStyle = `rgba(160,20,20,${0.1 + 0.08 * Math.sin(t * 8)})`;
  c.fillRect(v.x, v.y, v.w, v.h);
}

/** Level 6, paused: the frozen tiny fish, a dimmed sea, Resume / Quit. Cursor optional. Returns the Quit button. */
export function drawPausedLevel(c: CanvasRenderingContext2D, v: Rect, hover: boolean): Rect {
  drawLevel(c, v, 1.7, 'plain');
  c.fillStyle = 'rgba(10,14,24,0.5)';
  c.fillRect(v.x, v.y, v.w, v.h);
  label(c, 'PAUSED', v.x + v.w / 2, v.y + v.h * 0.18, 120, '#f4eddc', '#05091a');
  const bw = 300;
  const bh = 96;
  const quit = { x: v.x + v.w / 2 + 20, y: v.y + v.h * 0.29, w: bw, h: bh };
  [{ r: { x: v.x + v.w / 2 - 20 - bw, y: quit.y, w: bw, h: bh }, text: 'Resume', on: false }, { r: quit, text: 'Quit', on: hover }].forEach(({ r, text, on }) => {
    c.fillStyle = on ? '#a3342b' : '#f4eddc';
    c.beginPath();
    c.roundRect(r.x, r.y, r.w, r.h, 20);
    c.fill();
    c.strokeStyle = '#1b1a1f';
    c.lineWidth = 4;
    c.stroke();
    label(c, text, r.x + r.w / 2, r.y + r.h / 2 + 3, 66, on ? '#f4eddc' : '#1b1a1f', 'rgba(0,0,0,0)');
  });
  return quit;
}
