import { atJunction, BUILD, clockOf, coins, controlOf, detourOf, joins, lineOf, look, main, newFlow, NEXT, redAt, roadIds, secs, selected, ui, waitAt } from '../parts';
import { byPain, isCalm, isRed, junctionName, mid, ptOf } from '../places';
import type { GuideView, Memo, Script, Step, Target } from '../types';

/**
 * Year 1 of Saffron Bay, for somebody who has never played: fix one junction
 * together, draw one street together, find one alone, then play.
 */
const DAWN_END = 26; // seconds into the day: the rush is on the road
const LATEST_STOP = 46;
const FAST = 3;
const EVENING = 78;
const DAY_END = 112;
const TAKERS = 9;
const NOON = 46;
const ROUNDABOUT = 30;
const WIDE = 190; // plan px round the crossroads that stay bright: the queues

const built = (v: GuideView): boolean => controlOf(v, main(v)) !== 'yield';
const jammed = (v: GuideView): boolean => redAt(v, main(v)) || clockOf(v) > LATEST_STOP;
const price = (v: GuideView): number => v.city.quote({ t: 'control', node: main(v), control: 'roundabout' }).cost || ROUNDABOUT;
const wide = (v: GuideView, tap: boolean): Target | null => { const t = atJunction(v.city, main(v), tap); return t?.t === 'spot' ? { ...t, wide: WIDE } : t; };
const tapMain = (v: GuideView): Target | null => wide(v, true);
const seeMain = (v: GuideView) => { const t = atJunction(v.city, main(v), false); return t?.t === 'spot' ? [t.at] : null; };

const SPRING: readonly Step[] = [
  { id: 'welcome', stage: 0, pause: true, ok: 'Let us go', why: 'You run the roads of Saffron Bay.', say: 'Keep people moving, and they keep you.', look: seeMain },
  {
    id: 'watch', stage: 0, why: 'Morning. Everybody leaves home at once.', say: 'Watch the crossroads in the middle.',
    target: (v) => atJunction(v.city, main(v), false), rate: (v) => (clockOf(v) < DAWN_END ? FAST : 1), until: (v) => built(v) || jammed(v),
  },
  {
    id: 'tap', stage: 0, pause: true, why: 'Everyone is stuck here. Time is stopped, so breathe.', say: 'Tap the crossroads.',
    enter: (v, m) => { m.before = Math.max(m.before ?? 0, waitAt(v, main(v))); }, target: tapMain, look: seeMain, until: (v) => selected(v, main(v)) || built(v),
  },
  {
    id: 'arrows', stage: 0, pause: true, ok: 'Next', why: 'Thick arrow: many cars. Red arrow: long wait.', say: 'Every road waits for every other road.',
    target: (v) => wide(v, false), until: built, back: { when: (v) => !selected(v, main(v)), to: 'tap' },
  },
  {
    id: 'build', stage: 0, pause: true, why: 'A roundabout gives everyone a turn.', say: (v) => `Tap Roundabout. It costs ${coins(price(v))}.`,
    target: () => ui('.sel [data-act=control][data-v=roundabout]'), until: built, back: { when: (v) => !selected(v, main(v)) && !built(v), to: 'tap' },
  },
  {
    id: 'clear', stage: 0, why: 'Now let it run.', say: 'Watch the red fade and the horns stop.', skipIf: (v, m) => m.before === undefined,
    target: (v) => atJunction(v.city, main(v), false), until: (v) => clockOf(v) > DAY_END || isCalm(v.city.junctionStats(main(v)).grade),
    reward: (v, m) => wonWait(v, m, main(v)),
  },
  {
    id: 'approval', stage: 0, pause: true, ok: 'Next', why: 'This dial is approval: how happy people are.', say: 'Four things move it:', reveals: ['approval'], target: () => look('.appr'),
    bullets: [
      { icon: 'bar-trips', text: 'Trips: people arrive on time' }, { icon: 'bar-parking', text: 'Parking: they find a space' },
      { icon: 'bar-cost', text: 'Cost: prices feel fair' }, { icon: 'bar-streets', text: 'Streets: quiet, no road works' },
    ],
  },
  {
    id: 'letters', stage: 0, pause: true, ok: 'Understood', who: 'sulo', why: 'Under 40 at night: a Council letter.', say: 'Three letters and you are out. Not this year, though.', target: () => look('.appr'),
  },
  {
    id: 'speed', stage: 0, why: 'The morning is saved.', say: 'Press 4x to reach the night.', reveals: ['speed'], target: () => ui('[data-k=sp4]'),
    until: (v) => v.speed >= 4 || clockOf(v) > DAY_END, skipIf: (v) => clockOf(v) > DAY_END,
  },
];

function wonWait(v: GuideView, m: Memo, id: number): string {
  const after = waitAt(v, id);
  const before = m.before ?? 0;
  return after < before - 1 ? `Cleared! The wait fell from ${secs(before)} to ${secs(after)}.` : 'Done. Look at the cars: everyone gets a turn now.';
}

const NIGHT_ONE: readonly Step[] = [
  { id: 'books', stage: 1, ok: 'Next', who: 'pim', why: 'Every night we count: money in, money out.', say: 'Green number at the bottom: you earned this season.', target: () => look('[data-pane=books]') },
  {
    id: 'todo', stage: 1, ok: 'Next', why: 'Complaints are your to-do list.', say: 'Loudest first. Each is a real place on your map.',
    target: (v) => (v.phone ? { t: 'ui', sel: ['[data-pane=complaints]', '[data-act=tab][data-tab=complaints]'], tap: false } : look('[data-pane=complaints]')),
  },
  { id: 'go-summer', stage: 1, why: 'That is all for tonight.', say: 'Tap Next season.', target: () => NEXT, until: (v) => v.city.phase === 'day' },
];

const plan = (v: GuideView) => detourOf(v.city, main(v));
const drawn = (v: GuideView, m: Memo): boolean => v.city.version > (m.version ?? Infinity) && roadIds(v.city) > (m.lastRoad ?? Infinity);
const noDetour = (v: GuideView): boolean => plan(v) === null;
const goodGhost = (v: GuideView): boolean => {
  const g = v.ghost;
  const p = plan(v);
  return !!g && !!p && !g.dragging && g.quote.ok && g.cmd.t === 'road' && joins(g.cmd.cells, p);
};
const planMark = (v: GuideView) => { const p = plan(v); return p ? [{ line: lineOf(p), label: `${secs(p.newS)} instead of ${secs(p.nowS)}` }] : []; };
const bothWays = (v: GuideView) => { const p = plan(v); return p ? [{ line: p.oldWay.map(ptOf), old: true, label: `${secs(p.nowS)} today` }, { line: lineOf(p), label: secs(p.newS) }] : []; };
const bothLook = (v: GuideView) => { const p = plan(v); return p ? [...lineOf(p), ...p.oldWay.map(ptOf)] : null; };
const planLook = (v: GuideView) => { const p = plan(v); return p ? lineOf(p) : null; };

const SUMMER: readonly Step[] = [
  {
    id: 'why-street', stage: 2, pause: true, ok: 'Show me', why: (v) => `Villas here drive ${secs(plan(v)?.nowS ?? 0)} round, through the crossroads.`,
    say: (v) => `A short street makes it ${secs(plan(v)?.newS ?? 0)}.`, skipIf: noDetour, marks: bothWays, look: bothLook,
    enter: (v, m) => { m.lastRoad = roadIds(v.city); m.version = v.city.version; },
  },
  {
    id: 'pick-street', stage: 2, pause: true, why: 'Let us give them a short cut.', say: 'Tap Street.', reveals: ['tool:street'], skipIf: (v, m) => m.lastRoad === undefined || (noDetour(v) && !drawn(v, m)),
    marks: planMark, target: () => ({ t: 'tool', tool: 'street' }), until: (v, m) => v.tool === 'street' || drawn(v, m),
  },
  {
    id: 'drag', stage: 2, pause: true, why: (v) => (v.ghost && !v.ghost.dragging ? 'Not quite. One end on each ring.' : 'A road runs from one point to another.'), say: 'Click or tap one ring, then the other. Click it again to finish.',
    skipIf: (v, m) => m.lastRoad === undefined || (noDetour(v) && !drawn(v, m)), target: (v) => { const p = plan(v); return p ? { t: 'drag', line: lineOf(p) } : null; }, look: planLook,
    until: (v, m) => goodGhost(v) || drawn(v, m), back: { when: (v) => v.tool !== 'street', to: 'pick-street' },
  },
  {
    id: 'build-street', stage: 2, pause: true, why: (v) => `It costs ${coins(v.ghost?.quote.cost ?? 0)}: you have ${coins(v.city.money)}.`, say: 'Tap Build.', skipIf: (v, m) => m.lastRoad === undefined,
    target: () => BUILD, until: drawn, back: { when: (v, m) => !v.ghost && !drawn(v, m), to: 'drag' },
  },
  {
    id: 'take-it', stage: 2, why: 'Your street is open.', say: (v) => (v.speed === 1 ? 'Let the morning come. Who takes it?' : 'Who takes it? Watch.'), skipIf: (v, m) => m.lastRoad === undefined,
    rate: (v) => (clockOf(v) < DAWN_END ? FAST : 1), until: (v, m) => newFlow(v, m) >= TAKERS || clockOf(v) > NOON,
    reward: (v, m) => `${Math.round(newFlow(v, m))} cars a minute now skip the crossroads.`,
    look: (v, m) => { const r = v.city.roads.find((x) => x.id > (m.lastRoad ?? Infinity) && x.level === 0); return r ? r.line : null; },
  },
  { id: 'summer-free', stage: 2, why: 'The rest of the day is yours.', say: 'Press 4x when you are ready for the night.', target: () => ui('[data-k=sp4]'), until: (v) => v.speed >= 4 || clockOf(v) > EVENING, skipIf: (v) => clockOf(v) > EVENING },
];

const troubled = (v: GuideView) => byPain(v.city).find((s) => isRed(s.grade)) ?? (clockOf(v) > EVENING ? byPain(v.city)[0] : undefined);
const changes = (v: GuideView): number => v.city.version + v.city.junctions.reduce((n, j) => n + (j.control.length * 31 + j.id) % 97, 0);

const AUTUMN: readonly Step[] = [
  { id: 'look-out', stage: 4, why: 'The city is growing. Keep your eyes open.', say: 'A red tag on the map means: people wait here.', until: (v) => troubled(v) !== undefined, reveals: ['tool:junction'] },
  {
    id: 'find-it', stage: 4, pause: true, why: 'Something is turning red. Time is stopped.', say: 'Find it and fix it: a roundabout, or a new street.',
    reveals: ['tools'], enter: (v, m) => { const t = troubled(v); m.node = t?.j.id ?? -1; m.before = t?.wait ?? 0; m.state = changes(v); },
    skipIf: (v, m) => m.state === undefined && !troubled(v), until: (v, m) => changes(v) !== m.state,
    look: (v, m) => { const j = v.city.junctions.find((x) => x.id === m.node); const c = seeMain(v); return j && c ? [j, ...c] : null; },
    hint: { afterMs: 20_000, say: 'Stuck? Tap my face, I will show you.', target: look('.ikr:not(.advising) .advbtn'), reveals: ['advisor'] },
  },
  {
    id: 'autumn-run', stage: 4, why: 'Good. Now let it run.', say: (v, m) => `Is ${place(v, m)} any better?`, skipIf: (_v, m) => m.node === undefined || m.node < 0,
    until: (v, m) => clockOf(v) > DAY_END || isCalm(v.city.junctionStats(m.node ?? -1).grade), reward: (v, m) => autumnReward(v, m),
  },
];

function place(v: GuideView, m: Memo): string {
  const j = v.city.junctions.find((x) => x.id === m.node);
  return j ? junctionName(v.city, j) : 'the corner';
}

function autumnReward(v: GuideView, m: Memo): string {
  const after = waitAt(v, m.node ?? -1);
  const before = m.before ?? 0;
  return after < before - 1 ? `Fixed! From ${secs(before)} to ${secs(after)}.` : 'Built. The evening will tell: check the red tags.';
}

const WINTER: readonly Step[] = [
  {
    id: 'goal', stage: 6, pause: true, ok: 'Next', who: 'sulo', why: 'This is your goal for the year.', say: (v) => `${v.city.goal.text}. Tap it to see where.`, reveals: ['goal'], target: () => look('.goalchip'),
  },
  {
    id: 'plan', stage: 6, pause: true, ok: 'Next', who: 'miko', why: 'Next year the market doubles.', say: 'Think about parking. Save some coins.',
    marks: (v) => { const l = v.city.lots.find((x) => x.kind === 'market' && x.opensYear === v.city.year + 1); return l ? [{ ring: mid(l), r: l.w * 24 }] : []; },
    look: (v) => { const l = v.city.lots.find((x) => x.kind === 'market' && x.opensYear === v.city.year + 1); return l ? [mid(l)] : null; },
  },
  {
    id: 'advisor', stage: 6, pause: true, ok: 'I have got this', why: 'From here the city is yours.', say: 'Not sure what to do? Tap my face.', reveals: ['advisor', 'ovs', 'ticker', 'forecast'], target: () => look('.advbtn'),
  },
];

const YEAR_END: readonly Step[] = [
  { id: 'plates', stage: 8, ok: 'Next', who: 'sulo', why: 'Three plates a year: survive, approval 60, the goal.', say: 'Collect them, and your own plate gets shorter.', target: () => look('.plates') },
  {
    id: 'tech', stage: 8, why: 'One new technology. It works for good.', say: 'Pick one.', target: () => ({ t: 'ui', sel: ['.techs', '[data-act=tab][data-tab=tech]'], tap: false }),
    until: (v) => v.city.techChoices.some((t) => v.city.techs.includes(t.id)) || v.city.techChoices.length === 0,
  },
  { id: 'go-2', stage: 8, why: 'Well done, Director.', say: 'On to the next year!', target: () => NEXT, until: (v) => v.city.phase === 'yearStart' },
];

export const SAFFRON_1: Script = { key: '1:1', hides: true, steps: [...SPRING, ...NIGHT_ONE, ...SUMMER, ...AUTUMN, ...WINTER, ...YEAR_END] };
