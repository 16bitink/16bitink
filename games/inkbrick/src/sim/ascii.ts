/** An ASCII picture of a level (lab, generator logs). One character per cell, rows 0-52. */
import { BRICK_ROW_MAX } from './constants';
import { cellIndex, forEachCell } from './grid';
import { COLS, type BrickKind, type LevelDef } from './types';
import { createWorld } from './world';

const CHARS: Readonly<Record<BrickKind, string>> = {
  soft: 'o', tough: 'T', stone: '#', x3: '3', keg: 'K', pickup: '+', ice: '*', key: 'k', gate: 'G',
};

export const ASCII_LEGEND = "# stone  o soft  T tough  3 x3  K keg  + pickup  * ice  k key  G gate  = shutter  @ spinner  O whirlpool  B Brumm  _ shield  : inside (empty)  ~ on a floe";

export function asciiBoard(level: LevelDef): string {
  const w = createWorld(level);
  const rows = BRICK_ROW_MAX + 3;
  const grid: string[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: string[] = [];
    for (let x = 0; x < COLS; x++) row.push(w.inside[cellIndex(x, y)] ? ':' : '.');
    grid.push(row);
  }
  const put = (x: number, y: number, ch: string): void => {
    const row = grid[y];
    if (row && x >= 0 && x < COLS) row[x] = ch;
  };
  for (const b of level.bricks) forEachCell(b, (x, y) => put(x, y, b.floe ? (b.kind === 'stone' ? '~' : CHARS[b.kind].toUpperCase() === CHARS[b.kind] ? '~' : CHARS[b.kind]) : CHARS[b.kind]));
  for (const s of level.shutters ?? []) forEachCell({ ...s, kind: 'stone' }, (x, y) => put(x, y, '='));
  for (const s of level.spinners ?? []) put(s.x, s.y, '@');
  for (const p of level.whirlpools ?? []) {
    put(p.a.x, p.a.y, 'O');
    put(p.b.x, p.b.y, 'O');
  }
  if (w.boss) {
    const b = w.boss;
    forEachCell({ x: b.x / 15, y: b.y / 15, w: b.w / 15, h: b.h / 15, kind: 'stone' }, (x, y) => put(x, y, 'B'));
    forEachCell({ x: Math.round(b.shieldX / 15), y: b.shieldY / 15, w: b.shieldW / 15, h: 1, kind: 'stone' }, (x, y) => put(x, y, '_'));
  }
  return grid.map((r, y) => `${String(y).padStart(2)} ${r.join('')}`).join('\n');
}
