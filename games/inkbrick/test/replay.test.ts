/**
 * Old levels play exactly as before the variety pass (2026-11-18): seeded bots replay a level
 * from each chapter and piece, and every run's fingerprint (end phase, clock, hearts, bricks
 * left, peak balls, break-in, event count, a hash of every event and of the stones at the end,
 * and the aim window) must equal the numbers recorded with the engine before goals, rules and the
 * new pieces went in. The full set (all 50 levels, skilled 90 s + novice 60 s) was compared
 * once by hand with the same fixture; this keeps a cross-section of it. A level rebuilt by the
 * campaign refit (docs/inkbrick-design.md, "The campaign after the refit") is no longer an old
 * level: its pins come out (ch1-03-core, ch2-11-thaw, ch3-21-key and ch4-33-dark, rebuilt on 2026-11-18).
 */
import { describe, expect, it } from 'vitest';
import { INKBRICK_PAID_LEVELS } from '../content/paid';
import { CH1_LEVELS } from '../src/level/ch1/index';
import type { BotKind } from '../src/sim/bot';
import { fingerprint, type Fingerprint } from './replay.fixture';

const BEFORE: Readonly<Record<string, Fingerprint>> = {
  'ch1-01-vault|skilled|3': {"phase": "cleared", "elapsed": "46.1000", "heartsLost": 0, "breakableLeft": 0, "peakBalls": 5, "breakInAt": "0.9583", "events": 540, "hash": 2238374707, "aim": "0.047222"},
  'ch1-04-fuse|skilled|3': {"phase": "play", "elapsed": "89.7000", "heartsLost": 0, "breakableLeft": 14, "peakBalls": 4, "breakInAt": "11.5917", "events": 375, "hash": 2427604746, "aim": "0.036111"},
  'ch1-10-brumm|skilled|3': {"phase": "play", "elapsed": "89.7000", "heartsLost": 0, "breakableLeft": 173, "peakBalls": 1, "breakInAt": "1.4500", "events": 140, "hash": 1702271802, "aim": "0.013889"},
  'ch2-12-drift|skilled|3': {"phase": "cleared", "elapsed": "86.2833", "heartsLost": 0, "breakableLeft": 0, "peakBalls": 7, "breakInAt": "41.8500", "events": 641, "hash": 81815489, "aim": "0.002778"},
  'ch3-22-shutters|skilled|3': {"phase": "play", "elapsed": "89.7000", "heartsLost": 0, "breakableLeft": 30, "peakBalls": 5, "breakInAt": "1.0083", "events": 401, "hash": 1623554844, "aim": "0.033333"},
  'ch4-31-whirlpool|skilled|3': {"phase": "cleared", "elapsed": "78.5667", "heartsLost": 0, "breakableLeft": 0, "peakBalls": 5, "breakInAt": "0.6417", "events": 430, "hash": 2787545125, "aim": "0.130556"},
  'ch4-32-spinner|skilled|3': {"phase": "cleared", "elapsed": "71.6667", "heartsLost": 0, "breakableLeft": 0, "peakBalls": 7, "breakInAt": "7.0750", "events": 695, "hash": 463099076, "aim": "0.019444"},
  'ch5-41-doors|skilled|3': {"phase": "play", "elapsed": "89.7000", "heartsLost": 0, "breakableLeft": 9, "peakBalls": 10, "breakInAt": "0.8500", "events": 1511, "hash": 1133694323, "aim": "0.075000"},
  'ch1-01-vault|novice|5': {"phase": "play", "elapsed": "57.9833", "heartsLost": 1, "breakableLeft": 12, "peakBalls": 5, "breakInAt": "41.2917", "events": 261, "hash": 2937696412, "aim": "0.047222"},
};

const ALL = [...CH1_LEVELS, ...INKBRICK_PAID_LEVELS];

describe('replay: old levels are unchanged by the variety pass', () => {
  for (const [key, want] of Object.entries(BEFORE)) {
    const [id, bot, seed] = key.split('|') as [string, BotKind, string];
    it(`${id} (${bot}, seed ${seed})`, () => {
      const level = ALL.find((l) => l.id === id);
      expect(level).toBeDefined();
      expect(fingerprint(level!, bot, Number(seed), bot === 'skilled' ? 90 : 60)).toEqual(want);
    });
  }
});
