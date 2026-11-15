import { pushOut } from '../geom';
import type { AvalancheDef } from '../level/types';
import { hitTank } from './combat';
import type { Match } from './match';
import type { StructRt } from './types';

/**
 * Avalanches (chapter 4, level 37 "Avalanche": shoot the cliffs to bury
 * waves). A level's `avalanches` name a structure (`by`, a cornice on a
 * cliff) and the drifts it brings down. The loader adds the drifts to the
 * map as dormant structures (not drawn, not solid, not in the nav grids).
 * When `by` breaks they all fall at once: whole, solid low cover, closing
 * the route under them in every nav grid until they're dug out; every tank
 * under one takes the avalanche's damage (raw) and is pushed clear.
 */
export const AVALANCHE = { damage: 160, text: 'Avalanche!' } as const;

/** A structure broke: bring down the avalanches it held. */
export function avalancheOn(m: Match, s: StructRt): void {
  for (const a of m.level.def.avalanches ?? []) if (a.by === s.def.id) fall(m, a);
}

function fall(m: Match, a: AvalancheDef): void {
  const hit = new Set<number>();
  for (let i = 0; i < m.structs.length; i++) {
    const st = m.structs[i]!;
    if (st.def.dormant !== a.by || !st.dormant) continue;
    st.dormant = false;
    st.state = 2;
    st.hp = st.def.hp;
    m.navs.block(st.def);
    m.emit({ kind: 'struct', id: st.def.id, state: 2 });
    for (const t of m.tanks) {
      if (!t.alive || t.role === 'boss' || t.role === 'bossTurret' || t.keel) continue;
      const p = pushOut(st.def.shape, st.def.x, st.def.y, t.x, t.y, t.stats.radius * 0.85);
      if (!p) continue;
      t.x += p.x;
      t.y += p.y;
      t.speed = 0;
      t.slide = null;
      if (hit.has(t.id)) continue;
      hit.add(t.id);
      hitTank(m, t, a.damage ?? AVALANCHE.damage, 'cannon', null, true);
    }
  }
  const at = m.structs.find((x) => x.def.id === a.by);
  m.emit({ kind: 'objective', text: a.text ?? AVALANCHE.text });
  if (at) m.emit({ kind: 'setpiece', what: 'avalanche', x: at.def.x, y: at.def.y });
}
