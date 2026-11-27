import { pointAt } from '../src/render/geom';
import { lineLength } from '../src/sim/geom';
import type { CarsView, CityView, Link } from '../src/sim/types';

/** Dummy cars running along the city's links, as many as asked: what drawing alone costs. */
const STEP = 0.1;

export function stressCity(city: CityView, n: number): CityView {
  const cars: CarsView = {
    count: n, alive: new Uint8Array(n).fill(1), x: new Float32Array(n), y: new Float32Array(n), heading: new Float32Array(n), z: new Float32Array(n), speed: new Float32Array(n).fill(40),
    kind: new Uint8Array(n), tint: new Uint8Array(n), anger: new Float32Array(n), blinker: new Int8Array(n), state: new Uint8Array(n), uid: new Uint32Array(n),
    frames: new Float64Array(n * 7 * 4), sub: 6,
  };
  const on: { link: Link; s: number; len: number; v: number }[] = [];
  let seed = 1;
  const rnd = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const link = city.links[Math.floor(rnd() * city.links.length)]!;
    const len = lineLength(link.line);
    on.push({ link, len, s: rnd() * len, v: 25 + rnd() * 50 });
    cars.kind[i] = rnd() < 0.8 ? 0 : Math.floor(rnd() * 9);
    cars.tint[i] = Math.floor(rnd() * 12);
    cars.uid[i] = i + 1;
    cars.anger[i] = rnd() < 0.1 ? 0.9 : 0;
    cars.blinker[i] = rnd() < 0.1 ? 1 : 0;
  }
  let clock = 0;
  let left = 0;
  const step = (): void => on.forEach((c, i) => {
    c.s += c.v * STEP;
    if (c.s > c.len) { c.s = 0; cars.uid[i] = cars.uid[i]! + n; }
    const p = pointAt(c.link.line, c.s);
    cars.x[i] = p.x; cars.y[i] = p.y; cars.heading[i] = p.a;
    // Every frame of the step at the step's end pose (enough to cost what drawing costs).
    for (let k = 0; k <= 6; k++) cars.frames.set([p.x, p.y, p.a, 0], (i * 7 + k) * 4);
  });
  const advance = (s: number): void => { left += s; while (left >= STEP) { left -= STEP; clock += STEP; step(); } };
  step();
  const own: Record<string, unknown> = { cars, advance, phase: 'day', hour: 21 };
  return new Proxy(city, { get: (t, k) => (k === 'clock' ? clock : typeof k === 'string' && k in own ? own[k] : Reflect.get(t, k)) });
}
