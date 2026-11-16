import { FRAME } from '../descent/frame';
import { smooth } from '../short';
import { T } from './timeline';

/**
 * The size ladder: eight steps from a 0.2 in larva to a 100 ft blue whale,
 * each with its hero, its size and weight in both units (script.md's table),
 * and its two forecast stamps (Lorenzen 1996, M = 3.00 W^-0.288 a year: the
 * larva and everything from 10 kg up are the model stretched past its data).
 *
 * The camera: every hero swims at the same spot (the anchor), and each step
 * zooms out in log space from one hero's framing to the next, so the old
 * hero shrinks to a speck beside the new one. The blue whale lies with its
 * eye beside the anchor, so the cold open (its eye) and the last step (all
 * of it) are the same whale.
 */

export type HeroKind = 'larva' | 'young' | 'sardine' | 'mackerel' | 'tuna' | 'person' | 'white' | 'whale';
export type Evidence = 'MODEL' | 'MODEL, STRETCHED' | 'REPORTED' | 'ESTIMATED';

export interface Readout {
  /** The small line over the stamp. */
  readonly label: string;
  /** The stamp. */
  readonly stamp: string;
  readonly tag: Evidence;
  readonly at: number;
  /** A small note under the tag. */
  readonly note?: string;
}

export interface Step {
  readonly kind: HeroKind;
  readonly name: string;
  /** Body length, metres. */
  readonly length: number;
  /** Weight, grams (the rule card's pips). */
  readonly grams: number;
  readonly size: string;
  readonly weight: string;
  /** When the zoom to it starts, and how long it takes. */
  readonly from: number;
  readonly zoom: number;
  /** Screen width in body lengths once it's the hero. */
  readonly frame: number;
  /** Stopwatch turns a second while it's the hero (fast at the bottom). */
  readonly tick: number;
  readonly readouts: readonly [Readout, Readout];
}

const forecast = (stamp: string, tag: Evidence, at: number, note?: string): Readout => ({ label: 'HALF OF FISH YOUR SIZE GONE IN', stamp, tag, at, note });
const nextYear = (stamp: string, tag: Evidence, at: number): Readout => ({ label: 'CHANCE YOU SEE NEXT YEAR', stamp, tag, at });

export const STEPS: readonly Step[] = [
  {
    kind: 'larva', name: 'A FISH LARVA', length: 0.005, grams: 0.001, size: '0.2 in · 5 mm', weight: '0.00004 oz · 0.001 g',
    from: T.youreThis - 0.1, zoom: 1.5, frame: 3.2, tick: 2.4,
    readouts: [forecast('12 DAYS', 'MODEL, STRETCHED', T.stamp1a), nextYear('3 IN 10,000,000,000', 'MODEL, STRETCHED', T.stamp1b)],
  },
  {
    kind: 'young', name: 'A YOUNG FISH', length: 0.025, grams: 0.3, size: '1 in · 2.5 cm', weight: '0.01 oz · 0.3 g',
    from: T.inch - 0.2, zoom: 2, frame: 2.1, tick: 1.4,
    readouts: [forecast('60 DAYS', 'MODEL', T.stamp2a), nextYear('1.4%', 'MODEL', T.stamp2b)],
  },
  {
    kind: 'sardine', name: 'A SARDINE', length: 0.1, grams: 10, size: '4 in · 10 cm', weight: '0.35 oz · 10 g',
    from: T.four - 0.2, zoom: 2, frame: 2.1, tick: 0.9,
    readouts: [forecast('5 MONTHS', 'MODEL', T.stamp3a), nextYear('21%', 'MODEL', T.stamp3b)],
  },
  {
    kind: 'mackerel', name: 'A MACKEREL', length: 0.3, grams: 300, size: '1 ft · 30 cm', weight: '0.66 lb · 300 g',
    from: T.foot - 0.2, zoom: 2, frame: 2.1, tick: 0.55,
    readouts: [forecast('1.2 YEARS', 'MODEL', T.stamp4a), nextYear('56%', 'MODEL', T.stamp4b)],
  },
  {
    kind: 'tuna', name: 'A TUNA', length: 1, grams: 1e4, size: '3 ft · 1 m', weight: '22 lb · 10 kg',
    from: T.threeFeet - 0.2, zoom: 2, frame: 2.1, tick: 0.35,
    readouts: [forecast('3.3 YEARS', 'MODEL, STRETCHED', T.stamp5a), nextYear('81%', 'MODEL, STRETCHED', T.stamp5b)],
  },
  {
    kind: 'person', name: 'YOU', length: 1.8, grams: 8e4, size: '6 ft · 1.8 m', weight: '176 lb · 80 kg',
    from: T.sixFeet - 0.2, zoom: 1.8, frame: 2.6, tick: 0.22,
    readouts: [
      { label: 'A FISH THIS HEAVY', stamp: '6 YEARS · 89%', tag: 'MODEL, STRETCHED', at: T.rule7 + 0.4 },
      { label: 'UNPROVOKED SHARK BITES, 2025', stamp: '9 DEATHS', tag: 'REPORTED', at: T.nine },
    ],
  },
  {
    kind: 'white', name: 'A GREAT WHITE', length: 4.6, grams: 1e6, size: '15 ft · 4.6 m', weight: '2,200 lb · 1,000 kg',
    from: T.fifteen - 0.2, zoom: 2, frame: 2.1, tick: 0.13,
    readouts: [
      forecast('12 YEARS', 'MODEL, STRETCHED', T.stamp7a, 'an average for that weight, not its lifespan'),
      { label: 'OLDEST AGED', stamp: '~73 YEARS', tag: 'ESTIMATED', at: T.stamp7b },
    ],
  },
  {
    kind: 'whale', name: 'A BLUE WHALE', length: 30, grams: 1e8, size: 'up to 100 ft · 30 m', weight: '220,000 lb · 100 t',
    from: T.now9 - 0.1, zoom: 3, frame: 1.6, tick: 0.05,
    readouts: [forecast('47 YEARS', 'MODEL, STRETCHED', T.stamp8a), nextYear('98.5%', 'MODEL, STRETCHED', T.stamp8b)],
  },
];

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface Camera {
  readonly centre: Pt;
  /** Screen width, metres. */
  readonly width: number;
}

const W = FRAME.width;
const H = FRAME.height;

/** Where the heroes swim (world metres) and where that lands on screen. */
export const ANCHOR: Pt = { x: 0, y: 0 };
export const ANCHOR_SCREEN: Pt = { x: 860, y: 590 };

/** The blue whale: body centre, facing left, its eye just right of the anchor. */
export const WHALE = { x: 0.33 * 30 + 0.9, y: -2.2, length: 30 } as const;
export const WHALE_EYE: Pt = { x: WHALE.x - 0.282 * WHALE.length, y: WHALE.y };

/** The cold open's framing: close on the eye, which sits in the right half. */
const OPEN_CAM: Camera = { centre: { x: WHALE_EYE.x - 1.6, y: WHALE_EYE.y + 1 }, width: 9.5 };

export const scaleOf = (cam: Camera): number => W / cam.width;
export const toScreen = (cam: Camera, p: Pt): Pt => {
  const k = scaleOf(cam);
  return { x: W / 2 + (p.x - cam.centre.x) * k, y: H / 2 + (p.y - cam.centre.y) * k };
};

/** The hero's framing: the anchor at ANCHOR_SCREEN (the whale's: its body centred). */
function framing(i: number): Camera {
  const st = STEPS[i]!;
  const width = st.length * st.frame;
  if (st.kind === 'whale') return { centre: { x: WHALE.x + 5, y: WHALE.y + 1.4 }, width };
  const k = W / width;
  return { centre: { x: ANCHOR.x - (ANCHOR_SCREEN.x - W / 2) / k, y: ANCHOR.y - (ANCHOR_SCREEN.y - H / 2) / k }, width };
}

/** The step whose zoom has started by t (-1 in the cold open's first shot). */
export function stepAt(t: number): number {
  let h = -1;
  STEPS.forEach((st, i) => {
    if (t >= st.from) h = i;
  });
  return h;
}

/** 0 .. 1 through step i's zoom. */
export const zoomOf = (i: number, t: number): number => smooth((t - STEPS[i]!.from) / STEPS[i]!.zoom);

/** A zoom between two framings that keeps the point both share still on screen (log width). */
function between(a: Camera, b: Camera, u: number): Camera {
  const width = Math.exp(Math.log(a.width) + (Math.log(b.width) - Math.log(a.width)) * u);
  const k = (width - b.width) / ((a.width - b.width) || 1);
  return { centre: { x: b.centre.x + (a.centre.x - b.centre.x) * k, y: b.centre.y + (a.centre.y - b.centre.y) * k }, width };
}

/** Extra pull-backs (factor of the hero's width) for the shots that show bigger animals to scale. */
export interface PullBack {
  readonly from: number;
  readonly to: number;
  readonly factor: number;
}

export const PULLBACKS: readonly PullBack[] = [
  { from: T.jelly - 0.4, to: T.scientists + 0.6, factor: 5 },
  { from: T.who - 0.6, to: T.fc3 - 0.2, factor: 18 },
  { from: T.bluefin - 0.3, to: T.stamp4a - 1.2, factor: 4.5 },
  { from: T.orcasHunt - 0.2, to: T.stamp5a - 1, factor: 6 },
  { from: T.tiger - 0.3, to: T.y2025 + 0.4, factor: 1.7 },
];

function pullAt(t: number): number {
  let f = 0;
  for (const p of PULLBACKS) {
    const u = smooth((t - p.from) / 1.2) * (1 - smooth((t - p.to) / 1.2));
    f = Math.max(f, Math.log(p.factor) * u);
  }
  return Math.exp(f);
}

export function cameraAt(t: number): Camera {
  const i = stepAt(t);
  if (i < 0) return { ...OPEN_CAM, width: OPEN_CAM.width * (1 - 0.04 * smooth(t / 6)) };
  const u = zoomOf(i, t);
  const prev = i === 0 ? OPEN_CAM : framing(i - 1);
  const cam = u < 1 ? between(prev, framing(i), u) : framing(i);
  const f = pullAt(t);
  if (f === 1) return cam;
  // Pull back about the anchor, so the hero stays put while the world grows round it.
  return { centre: { x: ANCHOR.x + (cam.centre.x - ANCHOR.x) * f, y: ANCHOR.y + (cam.centre.y - ANCHOR.y) * f }, width: cam.width * f };
}

/** The hero's body centre (world m): a slow drift and bob round the anchor. */
export function heroAt(i: number, t: number): Pt {
  const st = STEPS[i]!;
  if (st.kind === 'whale') return { x: WHALE.x, y: WHALE.y + 0.02 * st.length * Math.sin(t * 0.3) };
  return { x: ANCHOR.x + 0.04 * st.length * Math.sin(t * 0.37 + i), y: ANCHOR.y + 0.03 * st.length * Math.sin(t * 0.53 + i * 2) };
}
