import { RULE_CLASS, type GoalKind, type LevelDef, type RescueWho, type RuleKind } from '../sim/types';
import { goalIconUrl, ruleIconUrl } from '../render/ink/ruleIcons';
import { esc } from './dom';

/**
 * The words for the goals and the rules of the day (docs/inkbrick-design.md,
 * "Variety"): a short name, one line, and the "with ..." phrase the daily's
 * tomorrow teaser uses. Shown with the Pen-drawn badges (render/ink/ruleIcons).
 */
export interface RuleText {
  readonly name: string;
  readonly line: string;
  /** For "Tomorrow: Rising Tide, with a Strong Current". */
  readonly withPhrase: string;
}

export const RULES: Readonly<Record<RuleKind, RuleText>> = {
  current: { name: 'Strong Current', line: 'the sea pushes the stone sideways', withPhrase: 'a Strong Current' },
  heavy: { name: 'Heavy Stone', line: 'the stone is pulled down to the raft', withPhrase: 'a Heavy Stone' },
  speedy: { name: 'Quick Stone', line: 'the stone flies a quarter faster', withPhrase: 'a Quick Stone' },
  tinyRaft: { name: 'Tiny Raft', line: 'Skip’s raft is two-thirds its size', withPhrase: 'a Tiny Raft' },
  oneHeart: { name: 'One Heart', line: 'a single heart, so keep the stone up', withPhrase: 'One Heart' },
  fog: { name: 'Sea Fog', line: 'only the stone’s own light shows the way', withPhrase: 'Sea Fog' },
  slow: { name: 'Calm Sea', line: 'the stone moves a little slower', withPhrase: 'a Calm Sea' },
  wideRaft: { name: 'Wide Raft', line: 'a big raft all level long', withPhrase: 'a Wide Raft' },
  bigStone: { name: 'Big Stone', line: 'a boulder that hits more bricks', withPhrase: 'a Big Stone' },
  sticky: { name: 'Sticky Raft', line: 'the raft catches the stone: tap to throw it', withPhrase: 'a Sticky Raft' },
  twoStones: { name: 'Two Stones', line: 'every throw sends two stones', withPhrase: 'Two Stones' },
  ghost: { name: 'Ghost Stone', line: 'after each bounce the stone slips through a brick', withPhrase: 'a Ghost Stone' },
  goldRush: { name: 'Gold Rush', line: 'x3 shells all over the board', withPhrase: 'a Gold Rush' },
  kegDay: { name: 'Keg Day', line: 'powder kegs all over the board', withPhrase: 'Keg Day' },
};

export const GOAL_NAMES: Readonly<Record<GoalKind, string>> = {
  clear: 'Clear the Cove', rescue: 'Rescue', pearls: 'Pearl Hunt', stones: 'Few Stones', tide: 'Rising Tide',
};

export const FRIEND_NAMES: Readonly<Record<RescueWho, string>> = { crab: 'the little crab', pup: 'the seal pup', puffin: 'the puffin chick' };

const pct = (share: number): string => `${Math.round(share * 100)}%`;

/** The current's side, for its line. */
const currentLine = (dir: 1 | -1 | undefined): string => `the sea pushes the stone to the ${dir === -1 ? 'left' : 'right'}`;

export const ruleLine = (rule: RuleKind, dir?: 1 | -1): string => (rule === 'current' ? currentLine(dir) : RULES[rule].line);

/** The goal as one line before the level: "Rescue the seal pup", "Collect 4 pearls". */
/** The goal's line under its name on the rule banner (the name is shown above it, so not repeated). */
export function goalLine(level: LevelDef): string {
  switch (level.goal ?? 'clear') {
    case 'rescue': return `Rescue ${FRIEND_NAMES[level.rescue?.who ?? 'pup']}: reach the cage with a stone`;
    case 'pearls': return `Collect ${level.pearls?.length ?? 0} pearls`;
    case 'stones': return `Break ${pct(level.need ?? 0)} with ${level.stones ?? 0} stones`;
    case 'tide': return 'Clear the bricks before they reach the line';
    default: return 'Break every brick';
  }
}

/** "Tomorrow: Rising Tide, with a Strong Current" (a clear day: "Tomorrow: a Strong Current"). */
export function tomorrowLine(t: { readonly rule: RuleKind; readonly goal: GoalKind }): string {
  const rule = RULES[t.rule]?.withPhrase;
  if (!rule) return '';
  return t.goal === 'clear' ? `Tomorrow: ${rule}` : `Tomorrow: ${GOAL_NAMES[t.goal]}, with ${rule}`;
}

export const ruleIcon = (rule: RuleKind, cls = 'rule-ic'): string =>
  `<img class="${cls}" src="${ruleIconUrl(rule, RULE_CLASS[rule])}" alt="">`;

export const goalIcon = (goal: GoalKind, cls = 'rule-ic'): string => `<img class="${cls}" src="${goalIconUrl(goal)}" alt="">`;

/** The banner before a level: the goal, and the rule with its badge and line. */
export function ruleBannerHtml(level: LevelDef): string {
  const goal = level.goal ?? 'clear';
  const goalRow = `<div class="rb-row">${goalIcon(goal)}<div><b>${esc(GOAL_NAMES[goal])}</b><span>${esc(goalLine(level))}</span></div></div>`;
  const rule = level.rule && RULES[level.rule]
    ? `<div class="rb-row">${ruleIcon(level.rule)}<div><b>${esc(RULES[level.rule].name)}</b><span>${esc(ruleLine(level.rule, level.ruleDir))}</span></div></div>`
    : '';
  return `<div class="rule-banner">${goalRow}${rule}</div>`;
}

/** What each of the three shells asks for on this level (the HUD's panel and the results card). */
export function shellLabels(level: Pick<LevelDef, 'goal' | 'need' | 'par' | 'rescue'>, clockOf: (s: number) => string): readonly [string, string, string] {
  const par = `Under ${clockOf(level.par)}`;
  switch (level.goal ?? 'clear') {
    case 'rescue': return [`Free ${FRIEND_NAMES[level.rescue?.who ?? 'pup']}`, 'Keep every heart', par];
    case 'pearls': return ['Every pearl', 'Keep every heart', par];
    case 'stones': {
      const need = level.need ?? 0;
      return [`Break ${pct(need)}`, `Break ${pct((need + 1) / 2)}`, 'Break everything'];
    }
    default: return ['Clear it', 'Keep every heart', par];
  }
}

/** A friend's short name for the HUD: "the seal pup" → "seal pup". */
export const friendShort = (who: RescueWho): string => FRIEND_NAMES[who].replace(/^the /, '');
