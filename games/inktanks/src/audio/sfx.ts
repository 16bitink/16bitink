import type { MatchEvent, Tank } from '../logic/match/types';
import type { Material } from '../logic/damage';
import type { ShotKind } from '../logic/parts';

/**
 * Sound effects: which ones exist and the pure rules around them (which
 * match event makes which sound, where, how loud; throttling; stereo and
 * distance), as in the other 16bit.ink games. The synthesis itself lives in
 * synth.ts; there are no audio files.
 */
export const SFX_IDS = [
  // Guns: a machine gun's rattle, the cannon, a rocket's whoosh, a mortar's thoomp, a flamer's roar, a laser's zap, a rail's crack, a big gun charging.
  'mg', 'cannon', 'rocket', 'mortar', 'flame', 'laser', 'rail', 'charge',
  // Hits: a shell on armour, on ground or a wall, on the player's own tank, an explosion, a tank wrecked.
  'clang', 'thud', 'hurt', 'boom', 'wreck',
  // The world: a wall cracking and coming down, a crate splintering, a fire catching, water and snow on the move, ice cracking, a splash, a log bridge snapping.
  'crack', 'crumble', 'crate', 'whoomp', 'rush', 'rumble', 'ice', 'splash', 'snap',
  // Kit: a pickup, a blueprint, a repair, a part swapped, a mine laid, smoke popped.
  'pickup', 'intel', 'repair', 'swap', 'drop', 'hiss',
  // Set pieces and voices: the radio, the alarm siren, the boss's horn, a flag raised or lost, the camera's shutter, the gate opening.
  'radio', 'siren', 'horn', 'flagUp', 'flagLost', 'shutter', 'gate',
  // Endings and the interface.
  'win', 'lose', 'click',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/** Shortest gap between two plays of the same sound, ms (a battle fires many at once). */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  mg: 55, cannon: 70, rocket: 90, mortar: 120, flame: 110, laser: 90, rail: 150, charge: 400,
  clang: 50, thud: 50, hurt: 120, boom: 90, wreck: 150,
  crack: 80, crumble: 200, crate: 100, whoomp: 250, rush: 1500, rumble: 1500, ice: 300, splash: 200, snap: 400,
  pickup: 80, intel: 120, repair: 400, swap: 200, drop: 150, hiss: 300,
  radio: 700, siren: 1500, horn: 1200, flagUp: 800, flagLost: 800, shutter: 300, gate: 1000,
  win: 1000, lose: 1000, click: 40,
};

/** One sound to play: where (none: in the player's ear), how loud, at what pitch. */
export interface Cue {
  readonly id: SfxId;
  readonly x?: number;
  readonly y?: number;
  readonly gain?: number;
  readonly pitch?: number;
}

const SHOT_SOUND: Readonly<Record<ShotKind, SfxId | null>> = {
  tracer: 'mg', shell: 'cannon', rocket: 'rocket', lob: 'mortar', flame: 'flame',
  // The Laser and the Rail sound on their own events (beam, slug), where the shot is resolved.
  beam: null, rail: null,
};

/** Enemy guns sit a little under the player's own. */
const THEIRS = 0.7;

/** The sounds one match event makes. `tank` finds a tank by id; `player` is the player's id (null: spectating). */
export function cuesFor(e: MatchEvent, tank: (id: number) => Tank | undefined, player: number | null): readonly Cue[] {
  const mine = (id: number | null | undefined): boolean => id !== null && id !== undefined && id === player;
  const at = (x: number, y: number, id: SfxId, gain = 1, pitch = 1): Cue => ({ id, x, y, gain, pitch });
  switch (e.kind) {
    case 'fire': {
      const id = SHOT_SOUND[e.shot];
      if (!id) return [];
      return mine(e.tank) ? [{ id, gain: 1 }] : [at(e.x, e.y, id, THEIRS, bigGun(tank(e.tank)))];
    }
    case 'beam':
      return [mine(e.tank) ? { id: 'laser' } : at(e.x0, e.y0, 'laser', THEIRS)];
    case 'slug':
      return [mine(e.tank) ? { id: 'rail' } : at(e.x0, e.y0, 'rail', THEIRS)];
    case 'aim': {
      if (mine(e.tank)) return [{ id: 'charge', gain: 0.6 }];
      const t = tank(e.tank);
      return t ? [at(t.x, t.y, 'charge', THEIRS)] : [];
    }
    case 'hit':
      if (e.shot === 'flame') return [];
      if (mine(e.target)) return [{ id: 'hurt', gain: Math.min(1, 0.6 + e.dmg / 120) }];
      return [at(e.x, e.y, e.target === null ? 'thud' : 'clang', e.target === null ? 0.7 : 0.8)];
    case 'explode':
      return [at(e.x, e.y, 'boom', Math.min(1, 0.45 + e.r / 120), Math.max(0.7, Math.min(1.25, 60 / Math.max(30, e.r))))];
    case 'kill': {
      const v = tank(e.victim);
      if (!v) return [];
      return [at(v.x, v.y, 'wreck', mine(e.victim) ? 1.2 : 1, v.role === 'boss' || v.body ? 0.75 : 1)];
    }
    case 'struct':
      // Placed by the caller, which knows where the structure stands (structCues).
      return [];
    case 'crate':
      return [at(e.x, e.y, 'crate')];
    case 'pickup':
      if (!mine(e.tank)) return [];
      return [{ id: e.what === 'intel' || e.what === 'proto' ? 'intel' : 'pickup' }];
    case 'swap':
      return mine(e.tank) ? [{ id: 'swap' }] : [];
    case 'alarm':
      return [at(e.x, e.y, 'siren', 0.8)];
    case 'objective':
      return [{ id: 'radio', gain: 0.8 }];
    case 'boss':
      if (e.what === 'ram') return [at(e.x, e.y, 'boom', 1, 0.7)];
      if (e.what === 'stunned') return [at(e.x, e.y, 'clang', 1, 0.6)];
      return [at(e.x, e.y, 'horn', 1)];
    case 'gadget':
      return [at(e.x, e.y, e.gadget === 'mines' ? 'drop' : e.gadget === 'oil' ? 'splash' : 'hiss', mine(e.tank) ? 1 : THEIRS)];
    case 'mine':
      return [at(e.x, e.y, 'boom', 1, 0.9)];
    case 'ignite':
      return [at(e.x, e.y, 'whoomp', 1)];
    case 'burn':
      return e.what === 'alight' ? [at(e.x, e.y, 'whoomp', e.tree ? 0.8 : 0.5, e.tree ? 0.8 : 1.1)] : [];
    case 'span':
      return [at(e.x, e.y, 'snap'), at(e.x, e.y, 'splash', 0.8, 0.8)];
    case 'flood':
      return [at(e.x, e.y, 'rush', 1)];
    case 'ice':
      return e.what === 'crack' ? [at(e.x, e.y, 'ice')] : [at(e.x, e.y, 'ice', 1, 0.8), at(e.x, e.y, 'splash', 1, 0.7)];
    case 'weather':
      return e.what === 'coming' ? [{ id: 'radio', gain: 0.7 }] : [];
    case 'setpiece':
      if (e.what === 'flagOurs') return [{ id: 'flagUp' }];
      if (e.what === 'flagLost') return [{ id: 'flagLost' }];
      if (e.what === 'photo') return [{ id: 'shutter' }];
      if (e.what === 'gate') return [at(e.x, e.y, 'gate')];
      return [at(e.x, e.y, 'rumble', 1)];
    case 'over':
      return [{ id: e.passed ? 'win' : 'lose' }];
    default:
      return [];
  }
}

/** A structure cracked (state 1) or came down (state 0), by what it's made of. */
export function structCues(state: 2 | 1 | 0, material: Material, x: number, y: number): readonly Cue[] {
  if (state === 2) return [];
  const woody = material === 'wood' || material === 'tree';
  if (state === 1) return [{ id: woody ? 'snap' : 'crack', x, y, gain: 0.6, pitch: woody ? 1.2 : 1 }];
  if (material === 'fuel') return [{ id: 'boom', x, y, gain: 1, pitch: 0.8 }, { id: 'whoomp', x, y }];
  if (woody) return [{ id: 'snap', x, y, gain: 0.9 }];
  return [{ id: 'crumble', x, y, gain: 1, pitch: material === 'metal' ? 1.3 : 1 }];
}

/** Bosses and their deck guns boom lower. */
function bigGun(t: Tank | undefined): number {
  return t && (t.role === 'boss' || t.role === 'bossTurret') ? 0.8 : 1;
}

export interface View {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** How far outside the view (in view widths) a sound can still be heard. */
const HEARING = 0.75;

/** Stereo pan (-1..1) and loudness (0..1) for a sound at `at`, heard from the camera's view. */
export function spatial(at: { readonly x: number; readonly y: number }, view: View): { pan: number; gain: number } {
  const w = Math.max(1, view.right - view.left);
  const h = Math.max(1, view.bottom - view.top);
  const cx = (view.left + view.right) / 2;
  const pan = Math.max(-1, Math.min(1, ((at.x - cx) / (w / 2)) * 0.7));
  const dx = Math.max(0, view.left - at.x, at.x - view.right) / w;
  const dy = Math.max(0, view.top - at.y, at.y - view.bottom) / h;
  const gain = Math.max(0, 1 - Math.hypot(dx, dy) / HEARING);
  return { pan, gain };
}

/** True (and remembers it) when `id` hasn't played within its minimum gap. */
export function canPlay(id: SfxId, now: number, last: Map<string, number>): boolean {
  const prev = last.get(id);
  if (prev !== undefined && now - prev < MIN_GAP_MS[id]) return false;
  last.set(id, now);
  return true;
}

/** The engine's loudness and pitch, 0..1 each, for a tank moving at `speed` of its top `max`. */
export function engineLevel(speed: number, max: number): { level: number; rev: number } {
  const rev = max > 0 ? Math.min(1, Math.abs(speed) / max) : 0;
  return { level: 0.35 + rev * 0.65, rev };
}
