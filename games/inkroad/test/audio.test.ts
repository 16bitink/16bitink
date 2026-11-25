import { describe, expect, it } from 'vitest';
import { DUCKS, HORN_GAP_MS, HORN_MAX, HORN_WINDOW_MS, hornAllowed } from '../src/audio/sound';
import { musicUrl } from '../src/audio/music';
import { isMusicOn, onMusicChange, setMusicOn, toggleMusic } from '../src/audio/musicPref';
import { SAMPLES } from '../src/audio/samples';
import { SFX_IDS } from '../src/audio/synth';
import { MUSIC_TRACKS, SFX_URLS } from '../src/audio/tracks';

describe('horn limit', () => {
  it('lets the first horn through and spaces the rest', () => {
    expect(hornAllowed([], 1000)).toBe(true);
    expect(hornAllowed([1000], 1000 + HORN_GAP_MS - 1)).toBe(false);
    expect(hornAllowed([1000], 1000 + HORN_GAP_MS)).toBe(true);
  });
  it('caps a burst and recovers after the window', () => {
    const burst = Array.from({ length: HORN_MAX }, (_, i) => i * HORN_GAP_MS);
    const now = HORN_MAX * HORN_GAP_MS;
    expect(hornAllowed(burst, now)).toBe(false);
    expect(hornAllowed(burst, HORN_WINDOW_MS + HORN_GAP_MS * HORN_MAX)).toBe(true);
  });
});

describe('music switch', () => {
  it('toggles, notifies and remembers', () => {
    setMusicOn(true);
    const seen: boolean[] = [];
    const off = onMusicChange((on) => seen.push(on));
    expect(toggleMusic()).toBe(false);
    expect(isMusicOn()).toBe(false);
    setMusicOn(true);
    off();
    expect(seen).toEqual([false, true]);
  });
});

describe('recorded audio', () => {
  it('has a loop for every city style and the menu', () => {
    for (const s of ['gulf', 'oldtown', 'islands', 'hills', 'rivers', 'menu']) {
      const t = MUSIC_TRACKS[s]!;
      expect(t, s).toBeDefined();
      expect(t.loopEnd - t.loopStart).toBeGreaterThan(30);
      expect(musicUrl(s)).toBe(t.url);
    }
    expect(musicUrl('nowhere')).toBeNull();
  });
  it('points every sample at a real file and every duck at a real sound', () => {
    for (const [id, spec] of Object.entries(SAMPLES)) for (const f of spec.files) expect(SFX_URLS[f], `${id}:${f}`).toBeDefined();
    expect(SFX_URLS.traffic).toBeDefined();
    for (const id of Object.keys(DUCKS)) expect(SFX_IDS as readonly string[]).toContain(id);
  });
});
