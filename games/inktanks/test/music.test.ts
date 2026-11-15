import { describe, expect, it } from 'vitest';
import { CHAPTERS, chapterOf } from '../src/logic/campaign';
import { evict, MISSION_TRACKS, MUSIC_LEVEL, trackFor, type MusicScreen } from '../src/audio/musicPlan';
import { MUSIC_TRACKS } from '../src/audio/tracks';

describe('music plan', () => {
  it('plays the theme on every screen outside missions and the ending', () => {
    const screens: MusicScreen[] = ['menu', 'map', 'briefing', 'workshop', 'results'];
    for (const s of screens) expect(trackFor(s)).toBe('theme');
  });

  it('gives each chapter its own mission track, in order', () => {
    expect(MISSION_TRACKS).toHaveLength(CHAPTERS.length);
    expect(new Set(MISSION_TRACKS).size).toBe(CHAPTERS.length);
    expect(trackFor('mission', 0)).toBe('meadowlands');
    expect(trackFor('mission', 4)).toBe('deepwood');
    expect(trackFor('mission', chapterOf(25).index)).toBe('mirefen');
    expect(trackFor('mission', chapterOf(50).index)).toBe('deepwood');
  });

  it('clamps an odd chapter instead of failing', () => {
    expect(trackFor('mission', 99)).toBe('deepwood');
    expect(trackFor('mission', -3)).toBe('meadowlands');
  });

  it('ends on the victory theme', () => {
    expect(trackFor('ending')).toBe('victory');
  });

  it('every track exists and loops inside its file (the victory theme plays once)', () => {
    for (const id of [...MISSION_TRACKS, 'theme', 'victory'] as const) {
      const t = MUSIC_TRACKS[id];
      expect(t.url).toBeTruthy();
      if (t.loopEnd !== null) expect(t.loopEnd).toBeGreaterThan(t.loopStart + 10);
    }
    expect(MUSIC_TRACKS.victory.loopEnd).toBeNull();
  });

  it('sits quieter in a mission and quieter still when paused', () => {
    expect(MUSIC_LEVEL.mission).toBeLessThan(MUSIC_LEVEL.screens);
    expect(MUSIC_LEVEL.paused).toBeLessThan(MUSIC_LEVEL.mission);
  });

  it('lets go of the oldest decoded tracks', () => {
    expect(evict(['a', 'b', 'c'], 2)).toEqual(['a']);
    expect(evict(['a'], 2)).toEqual([]);
    expect(evict(['a', 'b'], 0)).toEqual(['a', 'b']);
  });
});
