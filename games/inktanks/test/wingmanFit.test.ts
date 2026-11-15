import { describe, expect, it } from 'vitest';
import { parseTank } from '../src/logic/level/load';
import { Match } from '../src/logic/match/match';
import { wingmenOf } from '../src/logic/match/wingmen';
import { RANKS } from '../src/logic/rank';
import { newSave, parseSave, serializeSave } from '../src/logic/save';
import { fitValid, mirrorLoadout, setWingman, wingmanLoadoutFor, wingmanLoadouts, wingmanLock, wingmanPart, withFamily, type WingmanFit } from '../src/logic/wingmanFit';
import { newProgress, type Progress } from '../src/logic/workshop';
import { fixture, load } from './fixtures/levels';

const xpOf = (id: string): number => RANKS.find((r) => r.id === id)!.xp;
/** A Colonel with cannon IV, rockets II, medium III, tracks I unlocked, on cannon/medium/halftracks. */
const colonel = (): Progress => ({
  ...newProgress(),
  xp: xpOf('colonel'),
  unlocked: ['machinegun', 'light', 'wheels', 'cannon', 'rockets', 'medium', 'tracks', 'halftracks'],
  mk: { machinegun: 1, light: 1, wheels: 2, cannon: 4, rockets: 2, medium: 3, tracks: 1, halftracks: 5 },
  loadout: parseTank('cannon4/medium3/halftracks5'),
});
const PICK: WingmanFit = { gun: 'rockets', hull: 'medium', drive: 'tracks' };

describe('wingman fits (workshop Wingmen tab)', () => {
  it('each part fits one Mk below your own workshop Mk for its family, Mk I at least', () => {
    const p = colonel();
    expect(wingmanPart(p, 'cannon')).toEqual({ family: 'cannon', mk: 3 });
    expect(wingmanPart(p, 'tracks')).toEqual({ family: 'tracks', mk: 1 });
    const r = setWingman(p, 0, PICK);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(wingmanLoadoutFor(r.progress, 0)).toEqual(parseTank('rockets1/medium2/tracks1'));
  });
  it('no pick (null) mirrors your starting tank one Mk lower, never a prototype', () => {
    const p = colonel();
    expect(wingmanLoadoutFor(p, 0)).toEqual(parseTank('cannon3/medium2/halftracks4'));
    const proto = { ...p, loadout: { ...p.loadout, gun: { family: 'laser' as const, mk: 5 as const, proto: true } } };
    expect(wingmanLoadoutFor(proto, 1).gun).toEqual({ family: 'laser', mk: 4 });
    expect(mirrorLoadout(parseTank('machinegun1/light1/wheels1'))).toEqual(parseTank('machinegun1/light1/wheels1'));
  });
  it('slot 1 needs Captain, slot 2 Colonel; only unlocked families in their own slots', () => {
    const cap = { ...colonel(), xp: xpOf('captain') };
    expect(wingmanLock(cap, 0)).toBeNull();
    expect(wingmanLock(cap, 1)).toBe('Colonel');
    expect(wingmanLock({ xp: 0 }, 0)).toBe('Captain');
    expect(setWingman(cap, 1, PICK)).toEqual({ ok: false, reason: 'needs Colonel' });
    expect(setWingman(colonel(), 0, { ...PICK, gun: 'laser' })).toEqual({ ok: false, reason: 'not unlocked' });
    expect(fitValid(colonel(), { ...PICK, gun: 'medium' } as unknown as WingmanFit)).toBe(false);
    const back = setWingman(colonel(), 1, null);
    expect(back.ok && back.progress.wingmen).toEqual([null, null]);
  });
  it('a pick whose family is later locked falls back to the mirror, never crashing', () => {
    const r = setWingman(colonel(), 0, PICK);
    if (!r.ok) throw new Error(r.reason);
    const lost = { ...r.progress, unlocked: r.progress.unlocked.filter((f) => f !== 'rockets') };
    expect(wingmanLoadoutFor(lost, 0)).toEqual(mirrorLoadout(lost.loadout));
    // A Progress from before the field.
    const { wingmen: _, ...old } = colonel();
    expect(wingmanLoadouts(old as Progress)).toHaveLength(2);
  });
  it('changing one slot keeps the others, starting from your own tank', () => {
    const p = colonel();
    expect(withFamily(p, 0, 'tracks')).toEqual({ gun: 'cannon', hull: 'medium', drive: 'tracks' });
    const r = setWingman(p, 0, PICK);
    if (!r.ok) throw new Error(r.reason);
    expect(withFamily(r.progress, 0, 'cannon')).toEqual({ ...PICK, gun: 'cannon' });
    // A fitted prototype of a locked family: the starter's family stands in.
    const proto = { ...p, loadout: { ...p.loadout, gun: { family: 'laser' as const, mk: 5 as const, proto: true } } };
    expect(withFamily(proto, 0, 'tracks').gun).toBe('machinegun');
  });
  it('saves; older saves load with none; bad entries become null', () => {
    const r = setWingman(colonel(), 1, PICK);
    if (!r.ok) throw new Error(r.reason);
    const back = parseSave(serializeSave({ ...newSave(), progress: r.progress }));
    expect(back.problem).toBeNull();
    expect(back.save.progress.wingmen).toEqual([null, PICK]);
    const old = JSON.parse(serializeSave(newSave()));
    delete old.progress.wingmen;
    expect(parseSave(JSON.stringify(old)).save.progress.wingmen).toEqual([]);
    old.progress.wingmen = [{ gun: 'cannon', hull: 'rail', drive: 'tracks' }, 'junk', PICK, PICK];
    const odd = parseSave(JSON.stringify(old));
    expect(odd.problem).toBeNull();
    expect(odd.save.progress.wingmen).toEqual([null, null]);
  });
  it('the match spawns the picked tanks', () => {
    const r = setWingman(colonel(), 0, PICK);
    if (!r.ok) throw new Error(r.reason);
    const level = load(fixture({ kind: 'assault' }, [{ role: 'turret', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: { x: 1800, y: 1000 } }]));
    const m = new Match({ level, seed: 2, player: { loadout: r.progress.loadout, wingmen: 2, wingmanLoadouts: wingmanLoadouts(r.progress) } });
    expect(wingmenOf(m).map((t) => t.loadout)).toEqual([parseTank('rockets1/medium2/tracks1'), parseTank('cannon3/medium2/halftracks4')]);
  });
});
