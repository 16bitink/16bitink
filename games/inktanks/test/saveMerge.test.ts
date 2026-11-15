import { describe, expect, it } from 'vitest';
import { newSave, parseSave, SAVE_VERSION, serializeSave, type SaveData } from '../src/logic/save';
import { leadOf, mergeSave } from '../src/logic/saveMerge';
import { newProgress, type Progress } from '../src/logic/workshop';

const save = (p: Partial<Progress>, extra: Partial<SaveData> = {}): SaveData => ({ ...newSave(), ...extra, progress: { ...newProgress(), ...p } });
const valid = (s: SaveData): SaveData => {
  const back = parseSave(serializeSave(s));
  expect(back.problem).toBeNull();
  return back.save;
};

/** A player 12 levels in: cannon and halftracks owned, research, gadget tiers, a Brigadier with a kept prototype. */
const veteran = (): SaveData =>
  save(
    {
      xp: 11_500,
      medals: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, [true, i % 2 === 0, false]])),
      unlocked: ['machinegun', 'light', 'wheels', 'cannon', 'halftracks'],
      mk: { machinegun: 3, light: 2, wheels: 1, cannon: 4, halftracks: 2 },
      intel: { cannon: 9, halftracks: 2 },
      intelTotal: { cannon: 120, halftracks: 40, machinegun: 30 },
      research: { cannon: { damage: 2, reload: 1 }, light: { hp: 3 } },
      gadgetIntel: { oil: 4 },
      gadgetMk: { mines: 3, oil: 2 },
      protos: [{ family: 'rockets', mk: 3, proto: true }],
      loadout: { gun: { family: 'rockets', mk: 3, proto: true }, hull: { family: 'light', mk: 2 }, drive: { family: 'halftracks', mk: 2 } },
      wingmen: [{ gun: 'cannon', hull: 'light', drive: 'halftracks' }],
    },
    { gadget: 'oil', seenBlueprints: true },
  );

describe('mergeSave', () => {
  it('merging a save with itself gives the same save', () => {
    for (const s of [newSave(), valid(veteran())]) expect(mergeSave(s, s)).toEqual(s);
  });

  it('a fresh save merged with a progressed one gives the progressed one, either way round', () => {
    const v = valid(veteran());
    expect(mergeSave(newSave(), v)).toEqual(v);
    expect(mergeSave(v, newSave())).toEqual(v);
  });

  it('is the same either way round when the copies are not tied (sound aside)', () => {
    const a = valid(veteran());
    const b = valid(save({ xp: 300, medals: { 1: [true, true, true], 13: [true, false, true] }, unlocked: ['machinegun', 'light', 'wheels', 'mortar'], mk: { machinegun: 1, light: 1, wheels: 1, mortar: 1 }, intel: { mortar: 5 }, intelTotal: { mortar: 8 } }, { gadget: 'smoke' }));
    const ab = mergeSave(a, b);
    const ba = mergeSave(b, a);
    expect({ ...ab, progress: { ...ab.progress, unlocked: [...ab.progress.unlocked].sort() } }).toEqual({ ...ba, sound: ab.sound, progress: { ...ba.progress, unlocked: [...ba.progress.unlocked].sort() } });
  });

  it('every merge is a valid save', () => {
    const a = valid(veteran());
    const b = valid(save({ xp: 50, medals: { 2: [true, false, false] }, loadout: { gun: { family: 'machinegun', mk: 1 }, hull: { family: 'light', mk: 1 }, drive: { family: 'wheels', mk: 1 } } }));
    for (const m of [mergeSave(a, b), mergeSave(b, a), mergeSave(a, newSave())]) expect(valid(m)).toEqual(m);
  });

  it('medals: OR per medal, per level', () => {
    const a = save({ medals: { 1: [true, true, false], 2: [true, false, false] } });
    const b = save({ medals: { 1: [true, false, true], 3: [true, false, false] } });
    expect(mergeSave(a, b).progress.medals).toEqual({ 1: [true, true, true], 2: [true, false, false], 3: [true, false, false] });
  });

  it('xp: the higher', () => {
    expect(mergeSave(save({ xp: 900 }), save({ xp: 400 })).progress.xp).toBe(900);
    expect(mergeSave(save({ xp: 400 }), save({ xp: 900 })).progress.xp).toBe(900);
  });

  it('unlocked families: union, this device first', () => {
    const a = save({ unlocked: ['machinegun', 'light', 'wheels', 'cannon'], mk: { machinegun: 1, light: 1, wheels: 1, cannon: 1 } });
    const b = save({ unlocked: ['machinegun', 'light', 'wheels', 'tracks'], mk: { machinegun: 1, light: 1, wheels: 1, tracks: 1 } });
    expect(mergeSave(a, b).progress.unlocked).toEqual(['machinegun', 'light', 'wheels', 'cannon', 'tracks']);
  });

  it('Mk per family, gadget Mk and research steps: the higher', () => {
    const a = save({ unlocked: ['machinegun', 'light', 'wheels', 'cannon'], mk: { machinegun: 3, light: 1, wheels: 1, cannon: 2 }, gadgetMk: { mines: 2 }, research: { cannon: { damage: 3 }, light: { hp: 1 } } });
    const b = save({ mk: { machinegun: 2, light: 4, wheels: 1 }, gadgetMk: { mines: 1, smoke: 3 }, research: { cannon: { damage: 1, reload: 2 }, wheels: { grip: 2 } } });
    const p = mergeSave(a, b).progress;
    expect(p.mk).toEqual({ machinegun: 3, light: 4, wheels: 1, cannon: 2 });
    expect(p.gadgetMk).toEqual({ mines: 2, smoke: 3 });
    expect(p.research).toEqual({ cannon: { damage: 3, reload: 2 }, light: { hp: 1 }, wheels: { grip: 2 } });
  });

  it('lifetime blueprints: the higher per family', () => {
    const p = mergeSave(save({ intelTotal: { cannon: 10, tracks: 4 } }), save({ intelTotal: { cannon: 6, mortar: 3 } })).progress;
    expect(p.intelTotal).toEqual({ cannon: 10, tracks: 4, mortar: 3 });
  });

  it('spendable blueprints come whole from the copy further along', () => {
    const ahead = save({ medals: { 1: [true, false, false], 2: [true, false, false] }, intel: { cannon: 1 }, gadgetIntel: { oil: 1 } });
    const behind = save({ medals: { 1: [true, true, true] }, xp: 5000, intel: { cannon: 30, tracks: 9 }, gadgetIntel: { oil: 12, smoke: 2 } });
    for (const p of [mergeSave(ahead, behind).progress, mergeSave(behind, ahead).progress]) {
      expect(p.intel).toEqual({ cannon: 1 });
      expect(p.gadgetIntel).toEqual({ oil: 1 });
    }
  });

  it('the copy further along: passed levels, then XP, then lifetime blueprints, then this device', () => {
    const a = save({ medals: { 1: [true, false, false] }, xp: 10 });
    expect(leadOf(a, save({ medals: { 1: [true, false, false], 2: [true, false, false] } }))).not.toBe(a);
    expect(leadOf(a, save({ medals: { 1: [true, true, true] }, xp: 5 }))).toBe(a);
    expect(leadOf(a, save({ medals: { 1: [true, false, false] }, xp: 11 }))).not.toBe(a);
    const c = save({ medals: { 1: [true, false, false] }, xp: 10, intelTotal: { cannon: 2 } });
    expect(leadOf(a, c)).toBe(c);
    const twin = save({ medals: { 1: [true, false, false] }, xp: 10 });
    expect(leadOf(a, twin)).toBe(a);
    expect(leadOf(twin, a)).toBe(twin);
  });

  it('spending never goes negative and stays within lifetime totals', () => {
    const p = mergeSave(valid(veteran()), save({ intel: { cannon: 0 } })).progress;
    for (const [f, n] of Object.entries(p.intel)) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(p.intelTotal[f as keyof typeof p.intelTotal] ?? 0);
    }
  });

  it('prototypes: union, the best Mk per family', () => {
    const a = save({ protos: [{ family: 'rockets', mk: 2, proto: true }, { family: 'heavy', mk: 3, proto: true }] });
    const b = save({ protos: [{ family: 'rockets', mk: 4, proto: true }, { family: 'tracks', mk: 1, proto: true }] });
    expect(mergeSave(a, b).progress.protos).toEqual([
      { family: 'rockets', mk: 4, proto: true },
      { family: 'heavy', mk: 3, proto: true },
      { family: 'tracks', mk: 1, proto: true },
    ]);
  });

  it('loadout, gadget and wingmen come from the copy further along', () => {
    const v = valid(veteran());
    const other = save({ xp: 20, loadout: { gun: { family: 'machinegun', mk: 1 }, hull: { family: 'light', mk: 1 }, drive: { family: 'wheels', mk: 1 } }, wingmen: [null] }, { gadget: 'smoke' });
    for (const m of [mergeSave(v, other), mergeSave(other, v)]) {
      expect(m.progress.loadout).toEqual(v.progress.loadout);
      expect(m.gadget).toBe('oil');
      expect(m.progress.wingmen).toEqual(v.progress.wingmen);
    }
  });

  it('a fitted prototype is refitted at the best Mk kept', () => {
    const lead = valid(veteran());
    const better = save({ xp: 0, protos: [{ family: 'rockets', mk: 5, proto: true }] });
    expect(mergeSave(lead, better).progress.loadout.gun).toEqual({ family: 'rockets', mk: 5, proto: true });
  });

  it('seen-blueprints tip: OR; sound: always this device', () => {
    const a = save({}, { seenBlueprints: false, sound: false });
    const b = save({ xp: 999 }, { seenBlueprints: true, sound: true });
    expect(mergeSave(a, b).seenBlueprints).toBe(true);
    expect(mergeSave(a, b).sound).toBe(false);
    expect(mergeSave(b, a).sound).toBe(true);
  });

  it('covers every SaveData and Progress field', () => {
    const m = mergeSave(valid(veteran()), newSave());
    expect(Object.keys(m).sort()).toEqual(Object.keys(newSave()).sort());
    expect(Object.keys(m.progress).sort()).toEqual(Object.keys(newProgress()).sort());
    expect(m.v).toBe(SAVE_VERSION);
  });
});
