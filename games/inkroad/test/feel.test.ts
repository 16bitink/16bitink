import { readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filesFor, islandKeys, SETS } from '../src/art/sets';
import { textureKeys, spriteKeys, VEHICLE_PICTURES } from '../src/art/manifest';
import { heats, LaneMap, PIECE, runs } from '../src/render/overlay/queues';
import { marksOf } from '../src/render/overlay/marks';
import { goalName } from '../src/ui/goal';
import { nextState } from '../src/ui/jamBadges';
import { advised, effectOf, inflow } from '../src/ui/panels/controls';
import { shownYear } from '../src/ui/format';
import { columns } from '../src/ui/toolbar';
import type { CarsView, Link, Movement, Road } from '../src/sim/types';

const IMG = new URL('../src/art/img/', import.meta.url);
const FILES = readdirSync(IMG).filter((f) => f.endsWith('.webp'));
const NAMES = FILES.map((f) => f.replace(/\.webp$/, ''));
const VEHICLES = [...Object.keys(VEHICLE_PICTURES), 'boat'];

describe('art sets', () => {
  it('a city loads the common pictures and its own set, under 2 MB', () => {
    for (const style of SETS) {
      const list = filesFor(style, NAMES, VEHICLES);
      const size = list.reduce((n, f) => n + statSync(new URL(`${f}.webp`, IMG)).size, 0);
      expect(size, style).toBeLessThan(2_000_000);
      expect(list).toContain('v-car-1');
      expect(list.some((f) => f.startsWith(`b-${style}-home1`)), style).toBe(true);
      for (const other of SETS) if (other !== style && other !== 'gulf' && other !== 'oldtown') expect(list.some((f) => f.startsWith(`b-${other}-`))).toBe(false);
    }
  });
  it('plants no palms where there are none, and no red trees', () => {
    expect(filesFor('hills', NAMES, VEHICLES).some((f) => f.startsWith('tree-palm'))).toBe(false);
    expect(filesFor('gulf', NAMES, VEHICLES).some((f) => f.startsWith('tree-palm'))).toBe(true);
    expect(spriteKeys('tree/rivers')).not.toContain('tree/rivers-2');
  });
  it('borrows what a set lacks', () => {
    expect(textureKeys('oldtown', 'sand')[0]).toBe('tex/oldtown-ground');
    expect(textureKeys('hills', 'deep')).toContain('tex/hills-water');
    expect(islandKeys('gulf', true)).toEqual(['flat/island-small']);
    expect(islandKeys('rivers', false)[1]).toBe('flat/oldtown-island');
    expect(filesFor('rivers', NAMES, VEHICLES)).toContain('b-gulf-fair1-0');
  });
});

const link = (p: Partial<Link> = {}): Link => ({ id: 1, road: 1, from: 1, to: 2, lanes: 1, line: [{ x: 0, y: 0 }, { x: 300, y: 0 }], length: 300, freeSpeed: 60, ...p });
const road = { id: 1, level: 0 } as Road;

function cars(list: readonly { x: number; y?: number; v: number; a?: number; z?: number }[]): CarsView {
  const n = list.length;
  return {
    count: n, alive: new Uint8Array(n).fill(1), x: Float32Array.from(list, (c) => c.x), y: Float32Array.from(list, (c) => c.y ?? 0), heading: Float32Array.from(list, (c) => c.a ?? 0),
    z: Float32Array.from(list, (c) => c.z ?? 0), speed: Float32Array.from(list, (c) => c.v), kind: new Uint8Array(n), tint: new Uint8Array(n), anger: new Float32Array(n),
    blinker: new Int8Array(n), state: new Uint8Array(n), uid: new Uint32Array(n), frames: new Float64Array(n * 28), sub: 6,
  };
}

describe('queues', () => {
  it('joins cars close together and splits at a gap', () => {
    expect(runs([100, 120, 140, 250])).toEqual([{ from: 89, to: 151, n: 3 }, { from: 239, to: 261, n: 1 }]);
  });
  it('heats the lane behind stopped cars, more with more of them', () => {
    const map = new LaneMap([link()], [road]);
    const two = heats(map, cars([{ x: 280, v: 0 }, { x: 260, v: 1 }]));
    const six = heats(map, cars([280, 260, 240, 220, 200, 180].map((x) => ({ x, v: 0 }))));
    const at = (h: Map<number, Float32Array>, x: number): number => h.get(0)?.[Math.floor(x / PIECE)] ?? 0;
    expect(at(two, 270)).toBeGreaterThan(0);
    expect(at(six, 270)).toBeGreaterThan(at(two, 270));
    expect(at(six, 60)).toBe(0);
  });
  it('leaves one waiting car, moving cars, the other way and decks alone', () => {
    const map = new LaneMap([link()], [road]);
    expect(heats(map, cars([{ x: 280, v: 0 }])).size).toBe(0);
    expect(heats(map, cars([{ x: 280, v: 55 }, { x: 260, v: 55 }])).size).toBe(0);
    expect(heats(map, cars([{ x: 280, v: 0, a: Math.PI }, { x: 260, v: 0, a: Math.PI }])).size).toBe(0);
    expect(heats(map, cars([{ x: 280, v: 0, z: 30 }, { x: 260, v: 0, z: 30 }])).size).toBe(0);
    expect(new LaneMap([link()], [{ ...road, level: 1 } as Road]).lanes).toHaveLength(0);
  });
});

describe('jam tags', () => {
  it('come at D, stay through C for a while, celebrate at A or B', () => {
    expect(nextState('none', 'C', 0, 0)).toBe('none');
    expect(nextState('none', 'D', 0, 0)).toBe('on');
    expect(nextState('on', 'C', 4000, 1000)).toBe('on');
    expect(nextState('on', 'C', 9000, 6000)).toBe('quiet');
    expect(nextState('on', 'B', 9000, 100)).toBe('done');
    expect(nextState('on', 'A', 500, 100)).toBe('quiet');
    expect(nextState('done', 'F', 0, 0)).toBe('done');
  });
});

const move = (fromRoad: number, cars: number, wait = 12): Movement => ({ node: 1, fromRoad, toRoad: 9, cars, wait, share: 0.2, arrow: [], flyover: false });

describe('junction advice', () => {
  const even = inflow([move(1, 10), move(2, 11), move(3, 9), move(4, 10)]);
  const heavy = inflow([move(1, 40), move(2, 6), move(3, 5), move(4, 4)]);
  const calm = inflow([move(1, 4, 1), move(2, 4, 1), move(3, 4, 1)]);
  it('likes a roundabout when sides are even, signals when one is heavy', () => {
    expect(advised('yield', ['yield', 'roundabout'], even)).toBe('roundabout');
    expect(['much', 'better']).toContain(effectOf('yield', 'roundabout', even));
    expect(effectOf('roundabout', 'signal', heavy)).not.toBe('worse');
    expect(advised('yield', ['yield', 'roundabout', 'signal'], heavy)).toBe('signal');
  });
  it('leaves a calm corner alone and never sends a busy one back to give way', () => {
    expect(advised('yield', ['yield', 'roundabout', 'signal'], calm)).toBeNull();
    expect(['same', 'worse']).toContain(effectOf('yield', 'signal', calm));
    expect(effectOf('roundabout', 'yield', even)).toBe('worse');
  });
});

describe('words', () => {
  it('names a goal by what it measures', () => {
    expect(goalName('wait@22,18')).toBe('Crossroads wait');
    expect(goalName('found@market')).toBe('Found a space: market');
    expect(goalName('bar:streets')).toBe('Streets');
    expect(goalName('nothing')).toBe('');
  });
  it('years run on from city to city', () => {
    expect(shownYear({ def: { number: 2 }, year: 3 })).toBe(13);
    expect(shownYear({ def: { number: 1 }, year: 3 })).toBe(3);
  });
  it('the tool panel hugs its buttons', () => {
    expect(columns([1])).toBe(1);
    expect(columns([2, 1])).toBe(3);
    expect(columns([5, 3, 2])).toBe(3);
  });
  it('map views say spaces, moods and prices', () => {
    const city = {
      lots: [{ id: 1, kind: 'home', level: 1, gx: 0, gy: 0, w: 2, h: 2 }, { id: 2, kind: 'park', level: 1, gx: 4, gy: 0, w: 2, h: 2 }],
      carParks: [{ id: 1, gx: 0, gy: 0, w: 3, h: 2, used: 7, spaces: 18 }],
      roads: [{ id: 1, toll: true, kerb: false, line: [{ x: 0, y: 0 }, { x: 100, y: 0 }] }],
      prices: { park: 2, parkPeak: 3, tollPeak: 1 }, lotMood: () => ({ trips: 0.9, parking: 0 }),
    } as unknown as Parameters<typeof marksOf>[0];
    expect(marksOf(city, 'parking')[0]!.text).toBe('7 of 18');
    expect(marksOf(city, 'anger')).toHaveLength(1);
    expect(marksOf(city, 'anger')[0]!.face).toBe('angry');
    expect(marksOf(city, 'money').map((m) => m.text)).toEqual(['park 2', 'toll 1']);
    expect(marksOf(city, 'flow')).toEqual([]);
  });
});
