import type Phaser from 'phaser';
import { VEHICLE_PICTURES, VEHICLE_SCALE } from '../../art/manifest';
import { VEHICLES } from '../../sim/constants';
import type { VehicleKind } from '../../sim/types';
import { buildAtlas, type AtlasFrame, type Piece } from '../atlas';
import type { Picture, Pictures } from '../pictures';
import { RISE, TILT } from '../projection';
import { CAR_TINTS } from '../style';
import { ctxOf, makeCanvas } from '../tiles';
import { BODIES, darker, drawVehicle, MINIBUS_TINT, minibusOf, silhouette, tinted } from './shapes';

/**
 * Every vehicle at 32 headings in the game's projection, baked once from its
 * top-down picture: the picture is stacked upward in darker copies for the
 * sides, so it reads as a little solid with a shadow. At run
 * time a car is one quad; the last few degrees are a plain rotation.
 */
export const HEADINGS = 32;
/** Atlas px per plan px. */
const SCALE = 3;
const LAYERS_PER_PX = 1.2;
const SIDE_DARK = 0.42;
const SHADOW = { dx: 1.7, dy: 2.1, colour: 'rgba(52,40,46,0.34)' } as const;
const MARGIN = 5;

export interface CarFrames {
  /** frames[heading]. */
  readonly frames: readonly AtlasFrame[];
  readonly len: number;
  readonly wid: number;
}

interface Looks { readonly top: Picture; readonly side: HTMLCanvasElement; readonly shadow: HTMLCanvasElement }

const looksOf = (top: Picture): Looks => ({ top, side: darker(top, SIDE_DARK), shadow: silhouette(top, SHADOW.colour) });

function drawHeading(kind: VehicleKind, l: Looks, a: number): HTMLCanvasElement {
  const b = BODIES[kind];
  const reach = b.len + MARGIN * 2;
  const tall = b.high * RISE;
  const c = makeCanvas(reach * SCALE, (reach * TILT + tall) * SCALE);
  const g = ctxOf(c);
  g.imageSmoothingQuality = 'high';
  const cx = reach / 2;
  const cy = tall + (reach * TILT) / 2;
  const at = (z: number, dx = 0, dy = 0): void => {
    g.setTransform(SCALE, 0, 0, SCALE, (cx + dx) * SCALE, (cy + dy - z * RISE) * SCALE);
    g.scale(1, TILT);
    g.rotate(a);
  };
  const paste = (img: CanvasImageSource): void => g.drawImage(img, -b.len / 2, -b.wid / 2, b.len, b.wid);
  at(0, SHADOW.dx, SHADOW.dy);
  paste(l.shadow);
  const n = Math.max(2, Math.ceil(b.high * LAYERS_PER_PX));
  for (let i = 0; i < n; i++) { at((b.high * i) / n); paste(l.side); }
  at(b.high);
  paste(l.top.img);
  return c;
}

/** Looks per vehicle: cars come in every paint, the rest in their own. */
function variants(pics: Pictures, kind: VehicleKind): Picture[] {
  const n = VEHICLE_PICTURES[kind].n;
  const key = (i: number): string => (n === 0 ? `v/${kind}` : `v/${kind}-${i + 1}`);
  if (kind === 'van') { const van = pics.get(key(0), () => drawVehicle(kind), VEHICLE_SCALE); return [van, minibusOf(van)]; }
  if (kind !== 'car') return [pics.get(key(0), () => drawVehicle(kind), VEHICLE_SCALE)];
  return CAR_TINTS.map((_, t) => tinted(pics.get(key(t % n), () => drawVehicle(kind, t % n), VEHICLE_SCALE), t));
}

/** All vehicles: index by kind, then by tint (wrap). */
export function buildCarAtlas(textures: Phaser.Textures.TextureManager, pics: Pictures): readonly (readonly CarFrames[])[] {
  const pieces: Piece[] = [];
  for (const kind of VEHICLES) {
    variants(pics, kind).forEach((top, v) => {
      const l = looksOf(top);
      for (let h = 0; h < HEADINGS; h++) pieces.push({ name: `${kind}/${v}/${h}`, img: drawHeading(kind, l, (h / HEADINGS) * Math.PI * 2), scale: SCALE });
    });
  }
  const frames = buildAtlas(textures, 'cars', pieces);
  return VEHICLES.map((kind) => {
    const count = kind === 'car' ? CAR_TINTS.length : kind === 'van' ? 2 : 1;
    return Array.from({ length: count }, (_, v) => ({
      len: BODIES[kind].len, wid: BODIES[kind].wid,
      frames: Array.from({ length: HEADINGS }, (_, h) => frames.get(`${kind}/${v}/${h}`)!),
    }));
  });
}

/** The frame's origin (0..1) where the vehicle's centre on the ground is. */
export function carOrigin(kind: VehicleKind): { readonly x: number; readonly y: number } {
  const b = BODIES[kind];
  const reach = b.len + MARGIN * 2;
  const tall = b.high * RISE;
  return { x: 0.5, y: (tall + (reach * TILT) / 2) / (reach * TILT + tall) };
}

/** The baked heading nearest to a, and the turn left over. */
export function headingFrame(a: number): { readonly index: number; readonly rest: number } {
  const step = (Math.PI * 2) / HEADINGS;
  const k = Math.round(a / step);
  return { index: ((k % HEADINGS) + HEADINGS) % HEADINGS, rest: a - k * step };
}

/** Which paint of a kind a car wears: cars by tint, vans plain or minibus. */
export const paintOf = (kind: VehicleKind, tint: number, count: number): number => (kind === 'van' ? (tint === MINIBUS_TINT ? 1 : 0) : tint % count);
