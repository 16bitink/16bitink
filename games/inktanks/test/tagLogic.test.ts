import { describe, expect, it } from 'vitest';
import { part } from '../src/logic/parts';
import { isTagged, planTags, TAG, type TagSubject } from '../src/render/tagLogic';

const loadout = { gun: part('cannon', 1), hull: part('light', 1), drive: part('wheels', 1) };
const mk = (id: number, o: Partial<TagSubject> = {}): TagSubject => ({ id, team: 1, role: 'tank', ace: false, name: 'X', alive: true, x: 100, y: 0, loadout, ...o });
const me = { x: 0, y: 0, team: 2 };

describe('tag plan', () => {
  it('skips allies, towers, trucks, the dead and hidden tanks', () => {
    expect(isTagged(mk(1, { team: 0 }), 2)).toBe(false);
    expect(isTagged(mk(1, { role: 'bossTurret' }), 2)).toBe(false);
    expect(isTagged(mk(1, { role: 'truck' }), 2)).toBe(false);
    expect(isTagged(mk(1, { alive: false }), 2)).toBe(false);
    const plans = planTags([mk(1), mk(2)], me, (t) => t.id === 1);
    expect(plans.map((p) => p.id)).toEqual([1]);
  });
  it('gives aces a name plate and emblem, bosses a plate only', () => {
    const [ace, boss] = planTags([mk(1, { ace: true, name: 'Sly' }), mk(2, { role: 'boss', name: 'Ironclad' })], me, () => true);
    expect(ace).toMatchObject({ plate: 'Sly', emblem: true, icons: ['gun', 'hull', 'drive'] });
    expect(boss).toMatchObject({ plate: 'Ironclad', emblem: false, icons: [] });
  });
  it('fades far enemies and keeps the gun only in a crowd', () => {
    const far = planTags([mk(1, { x: TAG.far + 50 })], me, () => true)[0]!;
    expect(far.alpha).toBeCloseTo(TAG.fadeMin);
    const crowd = Array.from({ length: TAG.crowd + 1 }, (_, i) => mk(i + 1, { x: 80 + i }));
    expect(planTags(crowd, me, () => true).every((p) => p.icons.length === 1)).toBe(true);
    expect(planTags(crowd.slice(0, 2), me, () => true)[0]!.icons).toHaveLength(3);
  });
});
