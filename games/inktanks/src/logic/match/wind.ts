import { stormAt, type StormRule } from './weather';
import type { Match } from './match';
import { canStand } from './movement';

/**
 * A blizzard's wind (chapter 4, design doc "Blizzards: a drift wind"): while
 * one blows, every moving tank drifts with it (scaled by the storm's strength
 * and by its own speed up to WIND_FULL px/s: a parked tank holds on its
 * brakes), sliding only where it may stand and never through a wall, and
 * every shell, tracer and rocket in flight is carried the same way. Lobbed
 * shells fall where they were aimed; beams and the Flamer's stream are
 * instant. Bosses, their turrets, our gun towers and boats hold their course.
 */
/** A tank this fast or faster gets the whole wind. */
export const WIND_FULL = 60;

export function blowWind(m: Match, r: StormRule, dt: number): void {
  if (r.wind.x === 0 && r.wind.y === 0) return;
  const level = stormAt(r, m.t).level;
  if (level <= 0) return;
  const dx = r.wind.x * level * dt;
  const dy = r.wind.y * level * dt;
  for (const t of m.tanks) {
    if (!t.alive || t.keel || t.rail || t.parent !== null || t.role === 'boss' || t.role === 'bossTurret') continue;
    const k = Math.min(1, Math.abs(t.speed) / WIND_FULL);
    if (k <= 0) continue;
    const rad = t.stats.radius * 0.6;
    const x = t.x + dx * k;
    const y = t.y + dy * k;
    if (!canStand(m, t, x, y) || !canStand(m, t, x + Math.sign(dx) * rad, y) || !canStand(m, t, x, y + Math.sign(dy) * rad)) continue;
    if (m.lineBlocker(t.x, t.y, x + Math.sign(dx) * rad, y + Math.sign(dy) * rad, null)) continue;
    t.x = x;
    t.y = y;
  }
  for (const s of m.shots) {
    if (!s.alive || s.lob) continue;
    s.x += dx;
    s.y += dy;
  }
}
