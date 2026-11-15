import { describe, expect, it } from 'vitest';
import { isTagged, planTags, type TagSubject } from '../src/render/tagLogic';

const mk = (id: number, o: Partial<TagSubject> = {}): TagSubject => ({ id, team: 1, role: 'tank', ace: false, name: 'X', alive: true, isPlayer: false, ...o });

describe('name plates', () => {
  it('ordinary enemies, towers, trucks and the dead get none', () => {
    expect(isTagged(mk(1), 2)).toBe(false);
    expect(isTagged(mk(1, { role: 'bossTurret' }), 2)).toBe(false);
    expect(isTagged(mk(1, { role: 'truck', ace: true }), 2)).toBe(false);
    expect(isTagged(mk(1, { ace: true, alive: false }), 2)).toBe(false);
  });

  it('aces get a plate and the emblem, bosses a plate only, and hidden ones nothing', () => {
    const tanks = [mk(1, { ace: true, name: 'Sly' }), mk(2, { role: 'boss', name: 'Ironclad' }), mk(3), mk(4, { ace: true, name: 'Ghost' })];
    const plans = planTags(tanks, 2, (t) => t.id !== 4);
    expect(plans).toEqual([{ id: 1, plate: 'Sly', emblem: true, ally: false }, { id: 2, plate: 'Ironclad', emblem: false, ally: false }]);
    expect(planTags(tanks, null, () => true)).toEqual([]);
  });

  it('allies (wingmen, freed clan crews) get a blue plate; you and our towers none', () => {
    const tanks = [mk(1, { team: 0, clan: 'boars', name: 'Tusk' } as Partial<TagSubject>), mk(2, { team: 0, isPlayer: true, name: 'You' }), mk(3, { team: 0, role: 'tower', name: 'T' })];
    expect(planTags(tanks, 0, () => true)).toEqual([{ id: 1, plate: 'Tusk', emblem: false, ally: true }]);
  });
});
