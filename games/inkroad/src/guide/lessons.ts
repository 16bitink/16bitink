import type { ToolId } from '../sim/types';
import { BUILD, coins } from './parts';
import type { GuideView, Memo, Mark, Step, Target, Who } from './types';
import type { Pt } from '../sim/types';

/** A tool's first use in three taps: pick it, place it where the problem is, build. */
export interface ToolLesson {
  readonly id: string;
  readonly stage: number;
  readonly who?: Who;
  readonly tool: ToolId;
  /** Why this tool, and what to tap: 'Tap Car park.' */
  readonly why: string | ((v: GuideView, m: Memo) => string);
  readonly pick: string;
  readonly place: string;
  readonly placeWhy?: string | ((v: GuideView, m: Memo) => string);
  readonly target: (v: GuideView, m: Memo) => Target | null;
  readonly marks?: (v: GuideView, m: Memo) => readonly Mark[];
  readonly look?: (v: GuideView, m: Memo) => readonly Pt[] | null;
  /** What is drawn now would do. */
  readonly ready: (v: GuideView, m: Memo) => boolean;
  /** The city has it. */
  readonly done: (v: GuideView, m: Memo) => boolean;
  readonly skip: (v: GuideView, m: Memo) => boolean;
  readonly buildWhy?: (v: GuideView, m: Memo) => string;
  readonly kind?: string; // the car park kind to choose first
}

export function toolLesson(o: ToolLesson): readonly Step[] {
  const base = { stage: o.stage, pause: true, ...(o.who ? { who: o.who } : {}), ...(o.marks ? { marks: o.marks } : {}) } as const;
  const ids = { pick: `${o.id}-pick`, kind: `${o.id}-kind`, place: `${o.id}-place`, build: `${o.id}-build` };
  const inHand = (v: GuideView): boolean => v.tool === o.tool;
  const pick: Step = { ...base, id: ids.pick, why: o.why, say: o.pick, target: () => ({ t: 'tool', tool: o.tool }), skipIf: o.skip, until: (v, m) => inHand(v) || o.done(v, m), ...(o.look ? { look: o.look } : {}) };
  const kind: Step[] = o.kind ? [{
    ...base, id: ids.kind, why: 'Same sand, more cars.', say: 'Choose the kind.', target: () => ({ t: 'ui', sel: [`.kinds [data-v=${o.kind}]`], tap: true }), skipIf: o.skip,
    until: (v, m) => o.done(v, m) || v.parkKind === o.kind || (v.ghost?.cmd.t === 'carPark' && v.ghost.cmd.kind === o.kind),
    back: { when: (v) => !inHand(v), to: ids.pick },
  }] : [];
  const place: Step = {
    ...base, id: ids.place, why: o.placeWhy ?? o.why, say: o.place, target: o.target, skipIf: o.skip, until: (v, m) => o.ready(v, m) || o.done(v, m),
    back: { when: (v, m) => !inHand(v) && !o.done(v, m), to: ids.pick }, ...(o.look ? { look: o.look } : {}),
  };
  const build: Step = {
    ...base, id: ids.build, why: o.buildWhy ?? ((v) => `It costs ${coins(v.ghost?.quote.cost ?? 0)}. You have ${coins(v.city.money)}.`), say: 'Tap Build.', target: () => BUILD, until: o.done,
    back: { when: (v, m) => !v.ghost && !o.done(v, m), to: ids.place }, skipIf: (v, m) => o.skip(v, m) && !v.ghost && !o.done(v, m),
  };
  return [pick, ...kind, place, build];
}
