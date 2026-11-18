/**
 * For bots on rescue and pearls levels: the angles from a hit spot whose ghost reaches the friend
 * or a pearl still to take, traced against the board as it is now (broken bricks gone, flip walls
 * as their levers left them, the tide's offset, the moving pieces where they'll be when the stone
 * gets there). The Aimer traces the level as it starts; this one follows the play.
 */
import { MAX_BOUNCE_DEG, PEARL_R } from './constants';
import { cellIndex, forEachCell } from './grid';
import { movePieces } from './pieces';
import { AIM_LEAD, AIM_PHASES, pieceCycle, traceInside } from './trace';
import { BOARD_W, CELL, COLS, ROWS, type LevelDef, type SimState } from './types';
import { createWorld, type World } from './world';

const AIM_PX = 2;
const STEP_DEG = 0.5;

export class GoalAimer {
  private readonly w: World;
  private readonly cycle: number;
  private readonly cache = new Map<string, readonly number[]>();
  private target: Uint8Array = new Uint8Array(COLS * ROWS);
  private version = 0;
  private phase = 0;
  /** False once nothing is left to aim for (friend freed, every pearl taken). */
  active = true;

  constructor(level: LevelDef) {
    this.w = createWorld(level);
    this.cycle = pieceCycle(level);
  }

  /** Brings the live board up to the play's state; call before `angles`. */
  sync(s: SimState): void {
    const w = this.w;
    let changed = false;
    for (const b of s.bricks) {
      const mine = w.bricks[b.index]!;
      if (b.alive || !mine.alive) continue;
      mine.alive = false;
      const grid = w.layers[mine.layer]!.grid;
      forEachCell(mine.def, (cx, cy) => (grid[cellIndex(cx, cy)] = -1));
      changed = true;
    }
    s.flips.forEach((f, i) => {
      if (w.flips[i]!.solid !== f.solid) {
        w.flips[i]!.solid = f.solid;
        changed = true;
      }
    });
    if (w.tideOffset !== s.tideOffset) {
      w.tideOffset = s.tideOffset;
      changed = true;
    }
    const phase = this.cycle > 0 ? Math.round(((((s.time + AIM_LEAD) % this.cycle) + this.cycle) % this.cycle / this.cycle) * AIM_PHASES) % AIM_PHASES : 0;
    if (phase !== this.phase) changed = true;
    this.phase = phase;
    if (changed || this.version === 0) {
      w.time = this.cycle > 0 ? (this.cycle * phase) / AIM_PHASES : 0;
      movePieces(w);
      s.crabs.forEach((c, i) => {
        w.crabs[i]!.x = c.x;
        w.crabs[i]!.y = c.y;
      });
      this.version++;
      this.cache.clear();
    }
    this.target = this.targetMask(s);
  }

  /** Cells a stone's centre may be in to touch the friend or an untaken pearl. */
  private targetMask(s: SimState): Uint8Array {
    const mask = new Uint8Array(COLS * ROWS);
    const r = s.ballRadius;
    const mark = (x0: number, y0: number, x1: number, y1: number): void => {
      for (let cy = Math.max(0, Math.floor(y0 / CELL)); cy <= Math.min(ROWS - 1, Math.floor(y1 / CELL)); cy++) {
        for (let cx = Math.max(0, Math.floor(x0 / CELL)); cx <= Math.min(COLS - 1, Math.floor(x1 / CELL)); cx++) mask[cy * COLS + cx] = 1;
      }
    };
    let any = false;
    if (s.rescue && !s.rescued) {
      // Only the cells whose centre is within reach: the friend's box grown by under a stone's radius.
      const g = Math.min(r, CELL / 2);
      mark(s.rescue.x - g, s.rescue.y - g, s.rescue.x + s.rescue.w + g - 1e-6, s.rescue.y + s.rescue.h + g - 1e-6);
      any = true;
    }
    for (const p of s.pearls) {
      if (p.taken) continue;
      const g = Math.min(r + PEARL_R, CELL) * 0.7;
      mark(p.x - g, p.y - g, p.x + g, p.y + g);
      any = true;
    }
    this.active = any;
    return mask;
  }

  /** Angles from hit x whose ghost reaches a target cell, breakable bricks blocking. */
  angles(x: number): readonly number[] {
    if (!this.active) return [];
    const r = this.w.ballRadius;
    const px = AIM_PX * Math.round(Math.min(BOARD_W - r, Math.max(r, x)) / AIM_PX);
    const key = `${px}:${this.targetKey()}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const list: number[] = [];
    for (let a = -MAX_BOUNCE_DEG; a <= MAX_BOUNCE_DEG; a += STEP_DEG) if (traceInside(this.w, px, a, false, this.target)) list.push(a);
    this.cache.set(key, list);
    return list;
  }

  private targetKey(): number {
    let h = 0;
    for (let i = 0; i < this.target.length; i++) if (this.target[i]) h = (Math.imul(h, 31) + i) >>> 0;
    return h;
  }

  /** Centres (px) of what's left to aim for. */
  static spots(s: SimState): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    if (s.rescue && !s.rescued) out.push({ x: s.rescue.x + s.rescue.w / 2, y: s.rescue.y + s.rescue.h / 2 });
    for (const p of s.pearls) if (!p.taken) out.push({ x: p.x, y: p.y });
    return out;
  }
}
