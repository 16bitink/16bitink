/**
 * A top-down ASCII frame of a scenario, for the motion lab CLI: road surface `.`, its kerb `#`, blocks `+`, car parks
 * `%`, cars as their oriented boxes (actor letter, front in capitals; `o`/`O` background, `p` parked, `?` others),
 * the car that broke the rule as `!` with its nose `^`. Plan px: 3 px a column, 6 px a row.
 */
import { lotRect } from '../../src/city/geometry';
import type { City } from '../../src/city/state';
import { halfWidth } from '../../src/sim/roadGeom';
import type { Sample } from './lab';

const PX_X = 3;
const PX_Y = 6;
const COLS = 96;
const ROWS = 32;
const KERB = 1.6;
/** Share of the body's length drawn as its nose. */
const NOSE = 0.3;

function roadChar(c: City, x: number, y: number): string {
  let best = Infinity;
  let half = 0;
  for (const r of c.net.roads) {
    if (r.level !== 0) continue;
    for (let i = 0; i + 1 < r.line.length; i++) {
      const a = r.line[i]!, b = r.line[i + 1]!;
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
      const d = Math.hypot(x - a.x - u * dx, y - a.y - u * dy) - halfWidth(r);
      if (d < best) { best = d; half = halfWidth(r); }
    }
  }
  for (const j of c.net.junctions) {
    const d = Math.hypot(j.x - x, j.y - y) - j.radius;
    if (d < best) { best = d; half = j.radius; }
  }
  if (half === 0) return ' ';
  if (Math.abs(best) <= KERB) return '#';
  return best < 0 ? '.' : ' ';
}

const inRect = (r: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const onEdge = (r: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean =>
  inRect(r, x, y) && (x - r.x < PX_X || r.x + r.w - x < PX_X || y - r.y < PX_Y || r.y + r.h - y < PX_Y);

function carChar(s: Sample, bad: number): string {
  if (s.uid === bad) return '!';
  if (s.state === 'parked') return 'p';
  if (s.who === 'bg') return 'o';
  if (s.who === 'fill') return 'p';
  if (s.who === '?') return '?';
  return s.who[0]!.toLowerCase();
}

/** The frame around (cx, cy), `bad` the uid to mark. */
export function asciiFrame(c: City, row: readonly Sample[], cx: number, cy: number, bad = -1): string {
  const x0 = cx - (COLS / 2) * PX_X, y0 = cy - (ROWS / 2) * PX_Y;
  const lines: string[] = [];
  const lots = c.lots.map(lotRect);
  const parks = c.parks.map(lotRect);
  for (let j = 0; j < ROWS; j++) {
    let line = '';
    for (let i = 0; i < COLS; i++) {
      const x = x0 + (i + 0.5) * PX_X, y = y0 + (j + 0.5) * PX_Y;
      let ch = roadChar(c, x, y);
      if (lots.some((r) => onEdge(r, x, y))) ch = '+';
      if (parks.some((r) => onEdge(r, x, y))) ch = '%';
      for (const s of row) {
        const fx = Math.cos(s.a), fy = Math.sin(s.a);
        const along = (x - s.x) * fx + (y - s.y) * fy, lat = -(x - s.x) * fy + (y - s.y) * fx;
        if (Math.abs(along) > s.len / 2 || Math.abs(lat) > s.wid / 2 + 0.6) continue;
        const k = carChar(s, bad);
        const nose = along > s.len / 2 - s.len * NOSE;
        ch = nose ? (k === '!' ? '^' : k === 'p' ? 'p' : k.toUpperCase()) : k;
      }
      line += ch;
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  const cars = row.filter((s) => s.x > x0 && s.x < x0 + COLS * PX_X && s.y > y0 && s.y < y0 + ROWS * PX_Y)
    .map((s) => `${s.uid === bad ? '!' : ''}${s.who}#${s.uid % 100000} ${s.state}${s.info ? ` ${s.info.split(' ')[0]}` : ''} (${s.x.toFixed(0)},${s.y.toFixed(0)}) ${((s.a * 180) / Math.PI).toFixed(0)}deg ${s.v.toFixed(1)}px/s ${s.gear}`);
  return `${lines.join('\n')}\n  ${PX_X}px/col ${PX_Y}px/row, centre ${cx.toFixed(0)},${cy.toFixed(0)}\n  ${cars.join('\n  ')}`;
}
