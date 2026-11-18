import type { GameHost } from '@16bitink/game-sdk';
import { describe, expect, it } from 'vitest';
import { coversAlbum, mergeAlbum } from '../src/daily/album';
import { albumTier, MILESTONE_DAYS, mergeStamps, nextMilestone, parseStamps, reachedAt, stampReached } from '../src/daily/milestones';
import { commitProgress, pullFromAccount } from '../src/logic/accountSave';
import { coversProgress, loadProgress, mergeProgress, parseProgress, recordResult, saveProgress } from '../src/logic/save';

const memStore = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe('album merge', () => {
  it('unions snakes and keeps the earliest date and its event', () => {
    const a = { corn: { date: '2026-12-05' }, krait: { date: '2026-12-01' } } as const;
    const b = { corn: { date: '2026-12-02', event: 'newYearsEve' }, rainbowboa: { date: '2026-12-31' } } as const;
    const m = mergeAlbum(a, b as never);
    expect(m.corn).toEqual({ date: '2026-12-02', event: 'newYearsEve' });
    expect(Object.keys(m).sort()).toEqual(['corn', 'krait', 'rainbowboa']);
    expect(mergeAlbum(a, b as never)).toEqual(mergeAlbum(b as never, a));
  });
  it('never loses a snake, and says when it covers another', () => {
    const a = { corn: { date: '2026-12-02' } } as const;
    expect(coversAlbum(a, {})).toBe(true);
    expect(coversAlbum(a, { corn: { date: '2026-12-05' } })).toBe(true);
    expect(coversAlbum(a, { corn: { date: '2026-12-01' } })).toBe(false);
    expect(coversAlbum({}, a)).toBe(false);
  });
});

describe('album in the progress save', () => {
  it('validates untrusted data', () => {
    const p = parseProgress({ levels: {}, album: { corn: { date: 'soon' }, dragon: { date: '2026-01-01' }, krait: { date: '2026-01-01' } }, stamps: { '7': '2026-12-02', '8': '2026-12-02', '14': 'x' } });
    expect(p.album).toEqual({ krait: { date: '2026-01-01' } });
    expect(p.stamps).toEqual({ '7': '2026-12-02' });
    expect(parseProgress({ album: 5, stamps: [1] })).toEqual({ levels: {} });
    expect(parseProgress({ levels: { 'a-1': { blots: 2, bestTime: 9 } } }).album).toBeUndefined();
  });
  it('merges with levels and keeps them through a result', () => {
    const a = parseProgress({ levels: { 'a-1': { blots: 1, bestTime: 30 } }, album: { corn: { date: '2026-12-05' } } });
    const b = parseProgress({ levels: {}, album: { krait: { date: '2026-12-01' } }, stamps: { '3': '2026-12-03' } });
    const m = mergeProgress(a, b);
    expect(Object.keys(m.album ?? {}).sort()).toEqual(['corn', 'krait']);
    expect(m.stamps).toEqual({ '3': '2026-12-03' });
    expect(coversProgress(m, a) && coversProgress(m, b)).toBe(true);
    expect(coversProgress(a, b)).toBe(false);
    expect(recordResult(m, 'a-2', 3, 20).album).toEqual(m.album);
  });
  it('migrates the old browser-only album once, and it survives saving', () => {
    const store = memStore({ 'inksnake.album.v1': JSON.stringify({ corn: { date: '2026-12-05' } }) });
    expect(loadProgress(store).album).toEqual({ corn: { date: '2026-12-05' } });
    saveProgress(store, loadProgress(store));
    expect(JSON.parse(store.m.get('inksnake.progress.v1')!).album).toEqual({ corn: { date: '2026-12-05' } });
    expect(loadProgress(memStore({ 'inksnake.album.v1': '{bad' })).album).toBeUndefined();
  });
  it('syncs through the account: pulls, merges and pushes what the account lacks', async () => {
    const store = memStore({ 'inksnake.album.v1': JSON.stringify({ corn: { date: '2026-12-05' } }) });
    let remote: unknown = { levels: {}, album: { krait: { date: '2026-12-01' } } };
    const host = {
      storage: store,
      progress: { load: async () => remote, save: async (d: unknown) => { remote = d; } },
    } as unknown as Pick<GameHost, 'storage' | 'progress'>;
    await pullFromAccount(host);
    await Promise.resolve();
    expect(Object.keys((remote as { album: object }).album).sort()).toEqual(['corn', 'krait']);
    expect(Object.keys(loadProgress(store).album ?? {}).sort()).toEqual(['corn', 'krait']);
    commitProgress(host, { ...loadProgress(store), album: { ...loadProgress(store).album, rainbowboa: { date: '2026-12-31' } } });
    await Promise.resolve();
    expect((remote as { album: object }).album).toHaveProperty('rainbowboa');
  });
});

describe('day milestones', () => {
  it('has the thresholds 3, 7, 14, 30, 50, 100', () => {
    expect([...MILESTONE_DAYS]).toEqual([3, 7, 14, 30, 50, 100]);
  });
  it('gives a frame tier by days played, only growing', () => {
    expect([0, 2, 3, 6, 7, 29, 30, 99, 100, 400].map(albumTier)).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 6, 6]);
  });
  it('knows the one reached and the next to look forward to', () => {
    expect(reachedAt(7)).toBe(7);
    expect(reachedAt(8)).toBeNull();
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(100)).toBeNull();
  });
  it('stamps only the day it is reached, keeps the earliest and validates', () => {
    expect(stampReached({}, 6, 7, '2026-12-09')).toEqual({ '7': '2026-12-09' });
    expect(stampReached({}, 7, 7, '2026-12-10')).toEqual({});
    expect(stampReached({}, 4, 5, '2026-12-10')).toEqual({});
    expect(mergeStamps({ '7': '2026-12-09' }, { '7': '2026-12-08', '3': '2026-12-01' })).toEqual({ '7': '2026-12-08', '3': '2026-12-01' });
    expect(parseStamps({ '3': '2026-12-01', '4': '2026-12-01', '7': 5 })).toEqual({ '3': '2026-12-01' });
  });
});
