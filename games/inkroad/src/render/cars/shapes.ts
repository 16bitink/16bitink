import { VEHICLE_PICTURES, VEHICLE_SCALE } from '../../art/manifest';
import { LENGTHS } from '../../sim/tune';
import type { VehicleKind } from '../../sim/types';
import type { Picture } from '../pictures';
import { CAR_TINTS, INK } from '../style';
import { ctxOf, makeCanvas } from '../tiles';

/** Stand-in vehicles, seen straight from above, nose to the right, at 8x. */
export interface Body { readonly len: number; readonly wid: number; readonly high: number }

/** A lane is 9 px. Drawn a little bigger than the sim's cars (which keep 4 px apart), so they read on a phone. */
const WIDEST = 9.4;
const BIGGER = { small: 1.14, long: 1.07, from: 20 } as const;

/** Plan px. The length is the sim's, the width the picture's, kept inside a lane; `high` is the little that shows of its side. */
export const BODIES: Readonly<Record<VehicleKind, Body>> = {
  car: body('car', 1.4), taxi: body('taxi', 1.4), van: body('van', 2.2), truck: body('truck', 2.6), bus: body('bus', 2.6),
  tram: body('tram', 2.8), tow: body('tow', 1.8), school: body('school', 2.6), police: body('police', 1.4),
};

function body(kind: VehicleKind, high: number): Body {
  const p = VEHICLE_PICTURES[kind];
  const len = LENGTHS[kind] * (LENGTHS[kind] < BIGGER.from ? BIGGER.small : BIGGER.long);
  return { len, wid: Math.min(WIDEST, (len * p.h) / p.w), high };
}

const PAINTS: Readonly<Record<VehicleKind, string>> = {
  car: '#f4f1ea', taxi: '#e8b33c', van: '#ece6da', truck: '#e6dcc6', bus: '#4f9aa0', tram: '#5d8a6e', tow: '#d99a3e', school: '#e9c04a', police: '#f2f0ea',
};
const GLASS = '#3c4a55';
const GLINT = 'rgba(255,255,255,0.35)';

interface Pen { readonly g: CanvasRenderingContext2D; readonly w: number; readonly h: number }

const rr = (p: Pen, x: number, y: number, w: number, h: number, r: number): void => {
  p.g.beginPath();
  p.g.roundRect(x * p.w, y * p.h, w * p.w, h * p.h, r * p.h);
};

/** One vehicle from above, 8x. */
export function drawVehicle(kind: VehicleKind, variant = 0): Picture {
  const spec = VEHICLE_PICTURES[kind];
  const c = makeCanvas(spec.w, spec.h);
  const g = ctxOf(c);
  const p: Pen = { g, w: spec.w, h: spec.h };
  shell(p, PAINTS[kind]);
  if (kind === 'truck') truckTop(p);
  else if (kind === 'bus' || kind === 'tram' || kind === 'school') longTop(p, kind);
  else cabin(p, kind, variant);
  lights(p);
  return { img: c, scale: VEHICLE_SCALE };
}

function shell(p: Pen, paint: string): void {
  const { g } = p;
  rr(p, 0.02, 0.07, 0.96, 0.86, 0.26);
  g.fillStyle = paint;
  g.fill();
  const shade = g.createLinearGradient(0, 0, 0, p.h);
  shade.addColorStop(0, 'rgba(255,255,255,0.25)');
  shade.addColorStop(0.45, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(60,46,40,0.3)');
  g.fillStyle = shade;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = p.h * 0.065;
  g.stroke();
}

function cabin(p: Pen, kind: VehicleKind, variant: number): void {
  const { g } = p;
  const back = kind === 'van' ? 0.06 : 0.18 + variant * 0.03;
  const roofTo = kind === 'van' ? 0.74 : 0.6;
  rr(p, back, 0.15, roofTo + 0.14 - back, 0.7, 0.2);
  g.fillStyle = GLASS;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = p.h * 0.03;
  g.stroke();
  rr(p, back + 0.1, 0.18, roofTo - back - 0.1, 0.64, 0.14);
  g.fillStyle = PAINTS[kind];
  g.fill();
  g.stroke();
  if (kind === 'taxi') { g.fillStyle = '#f7f0da'; g.fillRect(p.w * 0.42, p.h * 0.34, p.w * 0.07, p.h * 0.32); g.strokeRect(p.w * 0.42, p.h * 0.34, p.w * 0.07, p.h * 0.32); }
  if (kind === 'police') { g.fillStyle = '#4f7fb8'; g.fillRect(p.w * 0.42, p.h * 0.26, p.w * 0.07, p.h * 0.48); }
  if (kind === 'tow') { g.fillStyle = '#6b6258'; g.fillRect(p.w * 0.1, p.h * 0.42, p.w * 0.3, p.h * 0.16); }
  g.strokeStyle = GLINT;
  g.lineWidth = p.h * 0.04;
  g.beginPath();
  g.moveTo(p.w * (roofTo + 0.06), p.h * 0.3);
  g.lineTo(p.w * (roofTo + 0.08), p.h * 0.6);
  g.stroke();
}

function truckTop(p: Pen): void {
  const { g } = p;
  rr(p, 0.02, 0.07, 0.7, 0.86, 0.06);
  g.fillStyle = '#efe7d6';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = p.h * 0.05;
  g.stroke();
  rr(p, 0.76, 0.12, 0.2, 0.76, 0.16);
  g.fillStyle = '#6f93a8';
  g.fill();
  g.stroke();
  g.fillStyle = GLASS;
  g.fillRect(p.w * 0.9, p.h * 0.2, p.w * 0.035, p.h * 0.6);
}

function longTop(p: Pen, kind: VehicleKind): void {
  const { g } = p;
  rr(p, 0.03, 0.16, 0.94, 0.68, 0.18);
  g.fillStyle = kind === 'school' ? '#f0cb5c' : '#f1ece0';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = p.h * 0.035;
  g.stroke();
  g.fillStyle = 'rgba(70,64,60,0.35)';
  for (const x of kind === 'tram' ? [0.14, 0.4, 0.66] : [0.2, 0.58]) g.fillRect(p.w * x, p.h * 0.34, p.w * 0.12, p.h * 0.32);
  g.fillStyle = GLASS;
  g.fillRect(p.w * 0.955, p.h * 0.2, p.w * 0.02, p.h * 0.6);
  if (kind !== 'tram') return;
  g.strokeStyle = INK;
  for (const x of [0.33, 0.66]) { g.beginPath(); g.moveTo(p.w * x, p.h * 0.08); g.lineTo(p.w * x, p.h * 0.92); g.stroke(); }
}

function lights(p: Pen): void {
  const { g } = p;
  g.fillStyle = '#fff3c4';
  g.fillRect(p.w * 0.95, p.h * 0.14, p.w * 0.03, p.h * 0.14);
  g.fillRect(p.w * 0.95, p.h * 0.72, p.w * 0.03, p.h * 0.14);
  g.fillStyle = '#8a4038';
  g.fillRect(p.w * 0.02, p.h * 0.15, p.w * 0.025, p.h * 0.14);
  g.fillRect(p.w * 0.02, p.h * 0.71, p.w * 0.025, p.h * 0.14);
}

/** A copy with its light parts painted (multiply keeps ink, glass and shading). */
export function tinted(pic: Picture, tint: number): Picture {
  const colour = CAR_TINTS[tint % CAR_TINTS.length]!;
  const c = makeCanvas(pic.img.width, pic.img.height);
  const g = ctxOf(c);
  g.drawImage(pic.img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = colour;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(pic.img, 0, 0);
  return { img: c, scale: pic.scale };
}

/** A flat silhouette in one colour, for the sides and the shadow. */
export function silhouette(pic: Picture, colour: string): HTMLCanvasElement {
  const c = makeCanvas(pic.img.width, pic.img.height);
  const g = ctxOf(c);
  g.drawImage(pic.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = colour;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** A darker copy, for a vehicle's sides. */
export function darker(pic: Picture, by: number): HTMLCanvasElement {
  const c = makeCanvas(pic.img.width, pic.img.height);
  const g = ctxOf(c);
  g.drawImage(pic.img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(48,38,34,${by})`;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Seven Hills: a minibus is a van painted warm, with a teal stripe along it. */
export function minibusOf(pic: Picture): Picture {
  const c = makeCanvas(pic.img.width, pic.img.height);
  const g = ctxOf(c);
  g.drawImage(pic.img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = '#eba94a';
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(pic.img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#2c7a80';
  g.fillRect(0, c.height * 0.4, c.width, c.height * 0.2);
  g.fillStyle = '#fffaf0';
  g.fillRect(0, c.height * 0.36, c.width, c.height * 0.03);
  g.fillRect(0, c.height * 0.61, c.width, c.height * 0.03);
  return { img: c, scale: pic.scale };
}

/** The tint the sim gives a minibus (a service van); delivery vans keep tint 0. */
export { MINIBUS_TINT } from '../../sim/constants';
