import type { StructureDef } from '../logic/land';
import type { Match } from '../logic/match/match';
import type { MatchEvent } from '../logic/match/types';
import { stormAt } from '../logic/match/weather';
import type { DriveFamily } from '../logic/parts';
import { cuesFor, engineLevel, spatial, structCues, type View } from './sfx';
import type { SoundBoard } from './sound';

/**
 * One mission's sound: turns the match's events into effects placed around
 * the camera, and keeps the running sounds (the player's engine, a storm's
 * wind, the cargo helicopter's rotor) in step with the match every frame.
 */
export class MissionSound {
  private readonly structs: ReadonlyMap<string, StructureDef>;
  private kits: number;
  private quiet = true;

  constructor(private readonly board: SoundBoard, private readonly match: Match) {
    this.structs = new Map(match.structs.map((s) => [s.def.id, s.def]));
    this.kits = match.player?.kits ?? 0;
  }

  events(events: readonly MatchEvent[], view: View): void {
    const m = this.match;
    const player = m.player?.id ?? null;
    const tank = (id: number) => m.tank(id);
    for (const e of events) {
      if (e.kind === 'struct') {
        const d = this.structs.get(e.id);
        if (d) for (const c of structCues(e.state, d.material, d.x, d.y)) this.board.play(c, view);
        continue;
      }
      for (const c of cuesFor(e, tank, player)) this.board.play(c, view);
    }
  }

  /** Every frame: `paused` (the pause menu) or the mission over silences the running sounds. */
  frame(view: View, paused: boolean): void {
    const m = this.match;
    const p = m.player;
    const quiet = paused || m.over !== null || !p || !p.alive;
    if (quiet !== this.quiet) {
      this.quiet = quiet;
      this.board.setLoops(!quiet);
    }
    const loops = this.board.loops;
    if (!p || quiet || !loops) return;
    // A repair kit used: there's no event for it, but the bag shrinks.
    if (p.kits < this.kits) this.board.play({ id: 'repair' });
    this.kits = p.kits;
    const { level, rev } = engineLevel(p.speed, p.stats.speed);
    loops.setEngine(p.loadout.drive.family as DriveFamily, level, rev);
    loops.setWind(m.storm ? stormAt(m.storm, m.t).level : 0, m.storm?.kind === 'blizzard');
    const heli = m.objective.props().find((x) => x.kind === 'heli');
    if (heli && heli.kind === 'heli') {
      const place = spatial(heli, view);
      loops.setRotor(place.gain * heli.rotor * (0.6 + heli.alt * 0.4), place.pan);
    } else loops.setRotor(0, 0);
  }

  destroy(): void {
    this.board.setLoops(false);
  }
}
