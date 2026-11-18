/**
 * What the goals and the pieces that aren't solid do (docs/inkbrick-design.md "Variety"):
 * pearls and the daily pearl are taken by touch, the rescue friend is freed by touch, the
 * Rising Tide sinks the field a cell every `every` seconds of play, and the rule's pull
 * (current, heavy) bends every stone. All deterministic.
 */
import { CURRENT_PULL, HEAVY_PULL, PEARL_R, TIDE_FLOOR_ROW, TIDE_RISE } from './constants';
import { pull } from './steer';
import { STEP } from './types';
import type { Ball, Pearl, World } from './world';

function touches(b: Ball, r: number, p: Pearl): boolean {
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const reach = r + PEARL_R;
  return dx * dx + dy * dy < reach * reach;
}

/** A stone touching the friend, a pearl or the daily pearl takes it. */
export function touchGoals(w: World, b: Ball): void {
  const r = w.ballRadius;
  const f = w.rescue;
  if (f && !w.rescued) {
    const qx = b.x < f.x ? f.x : b.x > f.x + f.w ? f.x + f.w : b.x;
    const qy = b.y < f.y ? f.y : b.y > f.y + f.h ? f.y + f.h : b.y;
    if ((b.x - qx) * (b.x - qx) + (b.y - qy) * (b.y - qy) < r * r) {
      w.rescued = true;
      w.rescuedAt = w.elapsed;
      w.events.push({ type: 'rescued', x: f.x + f.w / 2, y: f.y + f.h / 2 });
    }
  }
  for (let i = 0; i < w.pearls.length; i++) {
    const p = w.pearls[i]!;
    if (p.taken || !touches(b, r, p)) continue;
    p.taken = true;
    w.pearlsTaken++;
    if (w.pearlsTaken === w.pearls.length) w.pearlsAt = w.elapsed;
    w.events.push({ type: 'pearl', index: i, left: w.pearls.length - w.pearlsTaken, x: p.x, y: p.y });
  }
  const d = w.dailyPearl;
  if (d && !w.dailyPearlFound && touches(b, r, d)) {
    w.dailyPearlFound = true;
    w.events.push({ type: 'dailyPearl', x: d.x, y: d.y });
  }
}

/** The rule's pull on every moving stone (current: sideways, heavy: down). */
export function pullBalls(w: World, held: Ball | null): void {
  const ax = w.rule === 'current' ? CURRENT_PULL * w.ruleDir : 0;
  const ay = w.rule === 'heavy' ? HEAVY_PULL : 0;
  if (ax === 0 && ay === 0) return;
  for (const b of w.balls) if (b !== held) pull(b, ax, ay, STEP, w.speed);
}

/** The lowest row (cells) any sinking piece reaches now; breakable bricks separately. */
function lowestRows(w: World): { breakable: number; any: number } {
  let breakable = -1;
  let any = -1;
  const tideLayer = w.layers.length - 1;
  for (const b of w.bricks) {
    if (!b.alive || b.layer !== tideLayer) continue;
    const row = b.def.y + b.def.h - 1 + w.tideOffset;
    if (row > any) any = row;
    if (b.breakable && row > breakable) breakable = row;
  }
  return { breakable, any };
}

/**
 * Rising Tide, once per step of play: the field sinks a cell every `every` seconds. Returns true
 * when a brick reached the danger row (or a piece the raft's water): the caller takes a heart and
 * the field rises back TIDE_RISE cells.
 */
export function stepTide(w: World): boolean {
  const tide = w.level.tide;
  if (w.goal !== 'tide' || !tide || tide.every <= 0) return false;
  w.tideNextIn -= STEP;
  if (w.tideNextIn > 1e-9) return false;
  w.tideNextIn += tide.every;
  w.tideOffset++;
  w.events.push({ type: 'tideStep', offset: w.tideOffset });
  const low = lowestRows(w);
  if (low.breakable < tide.line && low.any < TIDE_FLOOR_ROW) return false;
  w.floods++;
  w.tideOffset = Math.max(0, w.tideOffset - TIDE_RISE);
  w.events.push({ type: 'tideFlood' });
  return true;
}
