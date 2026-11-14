import type { BlizzardDef, SandstormDef } from '../level/types';
import { VISION } from '../bots/perception';

/**
 * Sandstorms (chapter 2, design doc "Chapters 2–5"). A level's weather rolls
 * a storm over every `every` s (the first at `first`, default `every`) for
 * `last` s. A storm ramps in and out over STORM.ramp s; at full strength
 * nobody sees past `sight` px: bots' eyes are capped (perception), and the
 * player's view is cut by the sand overlay (render/stormView.ts). The HUD
 * warns STORM.warn s ahead. Pure functions of the level time.
 */
export const STORM = { every: 40, last: 12, sight: 180, warn: 5, ramp: 1.5 } as const;
/** Chapter 4's blizzards: the same rule, a little longer and further apart, with a wind (match/wind.ts). */
export const BLIZZARD = { every: 45, last: 14, sight: 200, wind: 30, windAngle: 2.2 } as const;

export interface StormNow {
  /** 0 clear … 1 full storm. */
  readonly level: number;
  /** Seconds to the next storm's start (0 while one blows). */
  readonly next: number;
  /** Which storm this is or will be (0-based). */
  readonly index: number;
}

export interface StormRule {
  readonly kind: 'sandstorm' | 'blizzard';
  readonly every: number;
  readonly last: number;
  readonly sight: number;
  readonly first: number;
  /** The wind at full strength, px/s (a blizzard's; 0 in a sandstorm). */
  readonly wind: { readonly x: number; readonly y: number };
}

export function stormRule(w: SandstormDef | BlizzardDef): StormRule {
  const d = w.kind === 'blizzard' ? BLIZZARD : STORM;
  const every = w.every ?? d.every;
  const speed = w.kind === 'blizzard' ? (w.wind ?? BLIZZARD.wind) : 0;
  const a = w.kind === 'blizzard' ? (w.windAngle ?? BLIZZARD.windAngle) : 0;
  return { kind: w.kind, every, last: Math.min(w.last ?? d.last, every - 1), sight: w.sight ?? d.sight, first: w.first ?? every, wind: { x: Math.cos(a) * speed, y: Math.sin(a) * speed } };
}

export function stormAt(r: StormRule, t: number): StormNow {
  if (t < r.first) return { level: 0, next: r.first - t, index: 0 };
  const index = Math.floor((t - r.first) / r.every);
  const into = t - r.first - index * r.every;
  if (into >= r.last) return { level: 0, next: r.every - into, index: index + 1 };
  const ramp = Math.min(STORM.ramp, r.last / 2);
  const level = Math.min(1, into / ramp, (r.last - into) / ramp);
  return { level: Math.max(0, level), next: 0, index };
}

/** How far anyone sees in this weather: no cap when clear, `sight` in a full storm. */
export function sightCap(r: StormRule | null, t: number): number {
  if (!r) return Infinity;
  const level = stormAt(r, t).level;
  return level <= 0 ? Infinity : VISION - (VISION - r.sight) * level;
}

/** The weather events between two steps: 'coming' warn s ahead, 'start' and 'end'. */
export function stormEvents(r: StormRule, t0: number, t1: number): readonly { what: 'coming' | 'start' | 'end'; in?: number }[] {
  const out: { what: 'coming' | 'start' | 'end'; in?: number }[] = [];
  const a = stormAt(r, t0);
  const b = stormAt(r, t1);
  if (b.level === 0 && b.next <= STORM.warn && (a.next > STORM.warn || a.index !== b.index || t0 <= 0)) out.push({ what: 'coming', in: Math.ceil(b.next) });
  if (a.level === 0 && b.level > 0) out.push({ what: 'start' });
  if (a.level > 0 && b.level === 0) out.push({ what: 'end' });
  return out;
}
