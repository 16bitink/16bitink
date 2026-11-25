/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/level/types';
import { SNOUT } from '../src/logic/chapters/reefShark';
import { Chaser, type ChaserSpec } from '../src/logic/enemies/chaser';
import type { Enemy, StrikeMark } from '../src/logic/enemyTypes';
import { openings } from '../src/logic/openings';
import { Snake } from '../src/logic/snake';
import { STRIKE } from '../src/logic/species';
import { dist, pt } from '../src/logic/vec';
import { World } from '../src/logic/world';
import { botInput } from './bot';

const BOT_TIMEOUT = 240_000;
const DT = 1 / 60;
const FILES = import.meta.glob<Record<string, readonly LevelDef[]>>('../src/level/chapter*.ts', { eager: true });
const CHAPTERS = Object.entries(FILES)
  .map(([f, m]) => [Number(f.replace(/^.*chapter(\d+)\.ts$/, '$1')), Object.values(m).find(Array.isArray) ?? []] as const)
  .sort((a, b) => a[0] - b[0]);

/** Px of slack: enemies move (and are pushed off the body) within a step. */
const SLACK = 14;
/** The shark's mark is its snout, but a strike on its side, this much further off, lands too. */
const SIDE_HIT: Readonly<Record<string, number>> = { shark: SNOUT + 6 };

/** A stand-in enemy at `at`, open to a strike within `r`. */
function dummy(at: { x: number; y: number }, r: number, moment: boolean): Enemy {
  const mark: StrikeMark = { x: at.x, y: at.y, r, moment };
  return { id: 7, kind: 'hawk', x: at.x, y: at.y, heading: 0, alt: 0, mode: 'x', modeAge: 0, away: false, step: () => undefined, strikeMark: () => mark };
}

describe('openings', () => {
  const snake = (): Snake => new Snake('corn', pt(200, 200), 0, 120);
  const lunge = 150 * STRIKE.boost * STRIKE.time;

  it('is ready when a lunge straight ahead would reach it', () => {
    expect(openings([dummy(pt(200 + lunge + 40, 200), 50, true)], snake())[0]).toMatchObject({ ready: true, r: 50 });
  });

  it('is shown but not ready when it is out of reach, or not straight ahead', () => {
    expect(openings([dummy(pt(200 + lunge + 80, 200), 50, true)], snake())[0]).toMatchObject({ ready: false });
    expect(openings([dummy(pt(200, 280), 50, true)], snake())[0]).toMatchObject({ ready: false });
    expect(openings([dummy(pt(100, 200), 50, true)], snake())[0]).toMatchObject({ ready: false });
  });

  it('is not ready while the next strike is still resting, or the snake is held', () => {
    const resting = snake();
    resting.strikeRest = 0.3;
    expect(openings([dummy(pt(260, 200), 50, true)], resting)[0]!.ready).toBe(false);
    const stunned = snake();
    stunned.mode = 'stun';
    expect(openings([dummy(pt(260, 200), 50, true)], stunned)[0]!.ready).toBe(false);
  });

  it('shows an enemy that is always open only once a lunge could reach it', () => {
    expect(openings([dummy(pt(600, 200), 40, false)], snake())).toHaveLength(0);
    expect(openings([dummy(pt(200, 200 + lunge + 20), 40, false)], snake())).toHaveLength(1);
  });

  it('leaves out enemies that are off the board, or that a strike does nothing to', () => {
    const { strikeMark: _, ...plain } = dummy(pt(240, 200), 40, true);
    expect(openings([{ ...dummy(pt(240, 200), 40, true), away: true }, plain], snake())).toHaveLength(0);
  });

  it('never invites a strike at something prickly', () => {
    const spec: ChaserSpec = { speed: 50, prowl: 30, sight: 100, reach: 20, bite: { kind: 'nip', amount: 5 }, scared: 'prickly' };
    expect(new Chaser(1, 'hedgehog', 0, spec).strikeMark(snake())).toBeNull();
  });
});

/** What an enemy's mark was, by its id, before a step. */
const marksOf = (w: World): Map<number, StrikeMark> => {
  const all = [...w.enemies, ...(w.boss ? [w.boss] : [])].filter((e) => !e.away);
  return new Map(all.flatMap((e) => {
    const m = e.strikeMark?.(w.snake) ?? null;
    return m ? [[e.id, m] as const] : [];
  }));
};

describe.each(CHAPTERS)('the mark tells the truth in chapter %i', (n, chapter) => {
  it('every hit on the boss lands on a mark, and a strike inside a mark always counts', () => {
    let hits = 0;
    for (const level of chapter) for (const seed of [0, 1]) {
      const w = new World(level, seed);
      while (w.state === 'play' && w.elapsed < level.par * 2) {
        const before = marksOf(w);
        const hp = w.boss?.hp ?? 0;
        w.step(botInput(w), DT);
        const after = marksOf(w);
        const head = w.snake.head;
        if (w.boss && w.boss.hp < hp) {
          hits += 1;
          const m = before.get(w.boss.id);
          expect(m, `${level.id}: the boss was hit unmarked`).toBeDefined();
          expect(dist(head, m!), `${level.id}: hit from outside its ring`).toBeLessThan(m!.r + SLACK + (SIDE_HIT[w.boss.kind] ?? 0));
        }
        if (!w.snake.striking) continue;
        for (const [id, m] of after) {
          if (!before.has(id)) continue;
          expect(dist(head, m), `${level.id}: a strike inside enemy ${id}'s ring did nothing`).toBeGreaterThan(m.r - SLACK);
        }
      }
    }
    expect(hits, `chapter ${n}'s boss was never hit`).toBeGreaterThan(0);
  }, BOT_TIMEOUT);
});
