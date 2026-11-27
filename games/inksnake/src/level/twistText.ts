import { BOSS_ENTRIES, ENEMY_ENTRIES } from '../logic/chapters/index';
import { foodName, preySpec } from '../logic/prey';
import { goldenKind } from '../logic/daily/golden';
import { isTreatKind, RULE_INFO, ruleLine } from './daily';
import type { LevelDef } from './types';

/** How a level's twist is told: a few words on its card, a hint as it starts, and a tip after a loss. */
export interface TwistText {
  readonly card: string;
  readonly hint: string;
  readonly tip: string;
}

/** A tip for each engine rule of the day, after a loss. */
const RULE_TIPS: Partial<Record<string, string>> = {
  ice: 'On ice, start your turns early and steer gently: the snake slides on.',
  blizzard: 'Lean into the wind: aim a little upwind of where you want to go.',
  fog: 'In fog, move slowly and let the prey come into sight.',
  hotDay: 'Everything is quick today: cut corners and strike from closer.',
  rival: 'Beat the rival to the food, and keep clear of its head once it grows.',
  lure: 'Food drifts to you: hold still near it and let it come.',
  looseKnots: 'No knots today: cross your own body as much as you like.',
  goldRush: 'Golden meals grow you three times as much: chase the gold.',
};

/** The twists a level has, worded three ways (its goal first, then its boss and enemies, then the rest). */
export function twistTexts(level: LevelDef): TwistText[] {
  const out: TwistText[] = [];
  const g = level.goal;
  if (g?.kind === 'rush') out.push({ card: `Grow within ${g.seconds} seconds`, hint: `${g.seconds} seconds to grow!`, tip: 'On the clock, don\'t chase one meal round the board: turn to the nearest one.' });
  if (g?.kind === 'feast') {
    const name = foodName(g.food, g.count !== 1);
    const tip = isTreatKind(g.food) ? `Every ${foodName(g.food, false)} counts: sweep the board for them between meals.` : `Go for the ${foodName(g.food, true)} first, and grow on whatever is nearest between them.`;
    out.push({ card: `Also eat ${g.count} ${name}`, hint: `Eat ${g.count} ${name}, and grow`, tip });
  }
  if (g?.kind === 'golden') {
    const name = preySpec(goldenKind(level)).name;
    out.push({ card: `Catch the golden ${name} ${g.count} times`, hint: `Catch the golden ${name}!`, tip: `The golden ${name} hides in cover: slip under it too, and it can't see you coming.` });
  }
  if (level.rule && RULE_INFO[level.rule].engine) out.push({ card: ruleLine(level.rule), hint: ruleLine(level.rule), tip: RULE_TIPS[level.rule] ?? 'Each day has its own rule: play to it.' });
  const boss = level.boss ? BOSS_ENTRIES[level.boss.kind] : undefined;
  if (boss) out.push({ card: boss.text.card, hint: boss.text.hint, tip: boss.text.tip });
  const kinds = [...new Set((level.enemies ?? []).map((e) => e.kind))];
  for (const k of kinds) {
    const t = ENEMY_ENTRIES[k]?.text;
    if (t) out.push({ card: t.card, hint: t.hint, tip: t.tip });
  }
  if (level.lives === 1) out.push({ card: 'One life', hint: 'One life: careful!', tip: 'With one life, leave yourself room: wide turns, and never cut across your own body.' });
  if (level.dark) out.push({ card: 'Night', hint: 'Night falls', tip: 'At night, keep to the open middle: things in the dark come at you slowly.' });
  return out;
}
