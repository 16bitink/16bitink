import type { Match } from '../match/match';
import type { Pt } from '../vec';
import { angleTo } from '../vec';
import type { HeliProp } from './types';

/**
 * The cargo helicopter that picks up the salvage (owner, Nov 14: "it's not
 * just a circle, a cargo helicopter should take the cargo"). Called in when
 * you pick the cargo up, it flies in from the nearest map edge, lands on the
 * pad and waits; drive the cargo under it and it loads, lifts and flies off.
 * Pure state; the view (render/heliView.ts) draws it from `prop()`.
 */
export const HELI = {
  /** Flying speed, px/s. */
  speed: 300,
  /** Seconds to land, and to lift off. */
  land: 1.6,
  lift: 1.4,
  /** Loading time with the cargo under it, s. */
  load: 1.5,
  /** It is away (the mission done) this long after lifting. */
  away: 2.2,
} as const;

type Phase = 'waiting' | 'inbound' | 'landing' | 'down' | 'loading' | 'lifting' | 'away' | 'gone';

export interface Heli {
  /** Calls it in (once). */
  call(): void;
  /** Advances it; `cargoIn` = the cargo is under it. Returns true the step the cargo is taken. */
  step(dt: number, cargoIn: boolean): boolean;
  readonly phase: () => Phase;
  /** 0–1 through the current phase (loading). */
  readonly progress: () => number;
  readonly prop: () => HeliProp | null;
}

export function cargoHeli(m: Match, pad: Pt): Heli {
  const w = m.land.width;
  const h = m.land.height;
  // From the nearest map edge, just off it.
  const edges: Pt[] = [{ x: -160, y: pad.y }, { x: w + 160, y: pad.y }, { x: pad.x, y: -160 }, { x: pad.x, y: h + 160 }];
  const from = edges.reduce((a, b) => (Math.hypot(b.x - pad.x, b.y - pad.y) < Math.hypot(a.x - pad.x, a.y - pad.y) ? b : a));
  let phase: Phase = 'waiting';
  let x = from.x;
  let y = from.y;
  let alt = 1;
  let heading = angleTo(from, pad);
  let t = 0;
  let cargo = false;
  const go = (p: Phase): void => {
    phase = p;
    t = 0;
  };
  const fly = (dt: number, to: Pt): boolean => {
    const d = Math.hypot(to.x - x, to.y - y);
    const s = HELI.speed * dt;
    if (d <= s) {
      x = to.x;
      y = to.y;
      return true;
    }
    x += ((to.x - x) / d) * s;
    y += ((to.y - y) / d) * s;
    return false;
  };
  return {
    call: () => {
      if (phase !== 'waiting') return;
      go('inbound');
      m.emit({ kind: 'objective', text: 'Chopper inbound to the pick-up' });
    },
    step: (dt, cargoIn) => {
      t += dt;
      switch (phase) {
        case 'inbound':
          if (fly(dt, pad)) go('landing');
          break;
        case 'landing':
          alt = Math.max(0, 1 - t / HELI.land);
          if (alt === 0) {
            go('down');
            m.emit({ kind: 'objective', text: 'Chopper down: bring the cargo under it' });
          }
          break;
        case 'down':
          if (cargoIn) go('loading');
          break;
        case 'loading':
          if (!cargoIn) go('down');
          else if (t >= HELI.load) {
            cargo = true;
            go('lifting');
            m.emit({ kind: 'objective', text: 'Cargo hooked: the chopper is lifting' });
            return true;
          }
          break;
        case 'lifting':
          alt = Math.min(1, t / HELI.lift);
          if (alt === 1) {
            heading = angleTo(pad, from);
            go('away');
          }
          break;
        case 'away':
          fly(dt, from);
          if (t >= HELI.away) go('gone');
          break;
        default:
          break;
      }
      return false;
    },
    phase: () => phase,
    progress: () => (phase === 'loading' ? Math.min(1, t / HELI.load) : 0),
    prop: () => (phase === 'waiting' || phase === 'gone' ? null : { kind: 'heli', x, y, alt, heading, cargo, rotor: phase === 'down' || phase === 'loading' ? 0.6 : 1 }),
  };
}
