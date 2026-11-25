import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { CRITTER_IDS } from '../src/art/critterArt';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { addGrowth, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { growthPointsFor, relationTo, scoreFor } from '../src/logic/sizing';
import { SPECIES_INFO } from '../src/levels/species';
import { ARM_REACH, bodyPoint, tailChain, type LobsterPose } from '../dev/promo/gulplobster/lobster';
import { bracing, poseAt } from '../dev/promo/gulplobster/moves';
import { EYE_NEAR, SHOULDER_FAR, SHOULDER_NEAR } from '../dev/promo/gulplobster/parts';
import { SOUNDS } from '../dev/promo/gulplobster/sounds';
import {
  ANTENNA_LEFT, BITE_AT, BODY_UNITS, CAPTIONS, captionAlpha, CLACK_AT, depth, DESSERT_FROM, eyeTurn, eyeWide, FLICKS, flick, glint, GOAL, GULP_AT, growthBar, HEAVES, jawTips, K_L,
  lobsterAlarm, lobsterGone, LOBSTER_SIZE, LOOP_S, MEAL_POINTS, mouthFrame, murk, POINTS_BEFORE, poke, POKE_POP, pullAt, reach, SCALE, SCORE_TEXT, SLURP_AT, SNIP_AT, SPURT, toWorld,
  viewAt, viperBelly, viperEyes, viperFish, viperJaw, viperLength, VIPER_LEN, VIPER_SIZE, type View, type WorldFish,
} from '../dev/promo/gulplobster/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FOCUS = { x: 540, y: 800 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
const seenAt = (p: P, v: View): P => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });
const seen = (f: WorldFish, v: View) => ({ ...seenAt(f, v), length: v.zoom * f.length });
/** A point of the mouth's frame (body units) on screen. */
const frameSeen = (t: number, p: P): P => seenAt(toWorld(mouthFrame(t), p), viewAt(t));
const clawTip = (pose: LobsterPose, i: 0 | 1): P => {
  const c = pose.claws[i];
  const l = i === 0 ? 224 : 204;
  return { x: c.wrist.x + l * Math.cos(c.angle), y: c.wrist.y + l * Math.sin(c.angle) };
};
const shoulder = (pose: LobsterPose, i: 0 | 1): P => bodyPoint(pose, i === 0 ? SHOULDER_FAR : SHOULDER_NEAR);

const MIDNIGHT = INKFISH_FULL_CHAPTERS.find((c) => c.id === 8)!.levels[9]!;

describe('promo short: how did that fit (a whole lobster)', () => {
  it('loops: the next lobster at the end is the first at the start, on screen where it was, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    const [va, vb] = [viewAt(0), viewAt(END)];
    const [a, b] = [seen(viperFish(0), va), seen(viperFish(END), vb)];
    expect(b.x).toBeCloseTo(a.x, 1);
    expect(b.y).toBeCloseTo(a.y, 1);
    expect(b.length).toBeCloseTo(a.length, 1);
    expect(wrap(viperFish(END).beat - viperFish(0).beat)).toBeCloseTo(0, 3);
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(0, 6);
    expect(viperBelly(0).size).toBe(0);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(lobsterAlarm(END)).toBeCloseTo(lobsterAlarm(0), 4);
    expect(murk(END)).toBe(0);
    expect(lobsterGone(0)).toBe(false);
    expect(lobsterGone(END)).toBe(false);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
    // Every part of the lobster is on screen where it was, and posed as it was.
    const [p, q] = [poseAt(0), poseAt(END)];
    const same = (u: P, w: P): void => {
      const [x, y] = [frameSeen(0, u), frameSeen(END, w)];
      expect(y.x).toBeCloseTo(x.x, 0);
      expect(y.y).toBeCloseTo(x.y, 0);
    };
    same(p.joint, q.joint);
    for (const i of [0, 1] as const) {
      same(p.claws[i].wrist, q.claws[i].wrist);
      same(clawTip(p, i), clawTip(q, i));
      expect(q.claws[i].open).toBeCloseTo(p.claws[i].open, 3);
      p.antennae[i].forEach((u, k) => same(u, q.antennae[i][k]!));
    }
    tailChain(p).joints.forEach((u, k) => same(u, tailChain(q).joints[k]!));
    expect(q.spread).toBeCloseTo(p.spread, 3);
    expect(q.eyeTurn).toBe(p.eyeTurn);
    expect(q.wide).toBeCloseTo(p.wide, 6);
    expect(wrap(q.phase - p.phase)).toBeCloseTo(0, 3);
    q.tuck.forEach((x, k) => expect(x).toBeCloseTo(p.tuck[k]!, 3));
  });

  it('opens on the jaw swung wide round its tail: the face, both claws and the antennae outside, in frame, with no numbers', () => {
    expect(viperJaw(0)).toBeGreaterThan(1.5);
    expect(viperJaw(FRAME)).toBeGreaterThan(viperJaw(0));
    expect(lobsterAlarm(0)).toBeGreaterThan(0.9);
    const pose = poseAt(0);
    // The jaws are round the fan and two rings already; the carapace and the other rings are out in the water.
    const chain = tailChain(pose);
    expect(chain.joints[1]!.x).toBeLessThan(0);
    expect(chain.joints[3]!.x).toBeGreaterThan(0);
    expect(eyeTurn(0)).toBe(1);
    expect(eyeWide(0)).toBe(1);
    const v = viewAt(0);
    expect(seen(viperFish(0), v).length).toBeGreaterThan(590);
    for (const i of [0, 1] as const) {
      const tip = frameSeen(0, clawTip(pose, i));
      expect(tip.x).toBeGreaterThan(700);
      expect(tip.x).toBeLessThan(1060);
      expect(pose.claws[i].open).toBeGreaterThan(0.3);
    }
    // One claw up, one down: both clear of the body.
    expect(frameSeen(0, clawTip(pose, 0)).y).toBeLessThan(frameSeen(0, clawTip(pose, 1)).y - 300);
    const eye = frameSeen(0, bodyPoint(pose, EYE_NEAR));
    expect(eye.x).toBeGreaterThan(600);
    expect(eye.x).toBeLessThan(900);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera, the body and the claws included', () => {
    for (let t = 0; t < LOOP_S - FRAME / 2; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const [v, w] = [viewAt(t), viewAt(next)];
      const [a, b] = [seen(viperFish(t), v), seen(viperFish(next), w)];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(50);
      if (next > t) expect(Math.abs(v.zoom / w.zoom - 1)).toBeLessThan(0.03);
      if (lobsterGone(t) || lobsterGone(next)) continue;
      const [p, q] = [poseAt(t), poseAt(next)];
      const fast = t > SLURP_AT - 0.15 && t < GULP_AT;
      const [j, k] = [frameSeen(t, p.joint), frameSeen(next, q.joint)];
      expect(Math.hypot(j.x - k.x, j.y - k.y)).toBeLessThan(fast ? 220 : 75);
      for (const i of [0, 1] as const) {
        const [c, d] = [frameSeen(t, clawTip(p, i)), frameSeen(next, clawTip(q, i))];
        expect(Math.hypot(c.x - d.x, c.y - d.y)).toBeLessThan(fast ? 260 : 160);
        // The arm never stretches far past its reach.
        expect(Math.hypot(p.claws[i].wrist.x - shoulder(p, i).x, p.claws[i].wrist.y - shoulder(p, i).y)).toBeLessThan(ARM_REACH * 1.45);
      }
    }
  });

  it('keeps the viper in frame and above the growth bar, and the claws clear of it', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const s = seen(viperFish(t), viewAt(t));
      expect(s.length).toBeGreaterThan(280);
      expect(s.x + s.length / 2).toBeGreaterThan(160);
      expect(s.y).toBeGreaterThan(560);
      expect(s.y).toBeLessThan(960);
      if (lobsterGone(t) || growthBar(t).alpha < 0.05) continue;
      const tip = frameSeen(t, clawTip(poseAt(t), 1));
      expect(tip.y).toBeLessThan(1160);
    }
  });

  it('is faithful to the game: the game’s lobster, staged a peer only the gape can swallow, worth a stage-up', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(CRITTER_IDS).toContain('lobster');
    expect(SPECIES_INFO.lobster.pinches).toBe(true);
    expect(MIDNIGHT.name).toBe('Midnight');
    expect(MIDNIGHT.playerSizes[3]).toBe(VIPER_SIZE);
    expect(MIDNIGHT.playerSizes[4]! / MIDNIGHT.playerSizes[3]!).toBeCloseTo(SCALE, 6);
    expect(MIDNIGHT.tiers[MIDNIGHT.tiers.length - 1]).toBe(GOAL);
    for (const [viper, lobster] of [[VIPER_SIZE, LOBSTER_SIZE], [VIPER_SIZE * SCALE, LOBSTER_SIZE * SCALE]] as const) {
      expect(relationTo(viper, lobster)).toBe('peer');
      expect(lobster).toBeGreaterThan(viper);
      expect(canSwallow('gape', relationTo(viper, lobster))).toBe(true);
      expect(canSwallow('ink', relationTo(viper, lobster))).toBe(false);
    }
    const before = addGrowth(MIDNIGHT, initialGrowth, POINTS_BEFORE);
    const after = addGrowth(MIDNIGHT, before, growthPointsFor(LOBSTER_SIZE));
    expect(playerSizeFor(MIDNIGHT, before.tier)).toBe(VIPER_SIZE);
    expect(playerSizeFor(MIDNIGHT, after.tier)).toBe(MIDNIGHT.playerSizes[4]);
    expect(MEAL_POINTS).toBe(growthPointsFor(LOBSTER_SIZE));
    expect(SCORE_TEXT).toBe(`+${scoreFor(LOBSTER_SIZE, 1)}`);
    // Its body is as long as the viper, its claws more.
    expect((BODY_UNITS * K_L) / VIPER_LEN).toBeGreaterThan(0.9);
    expect(((BODY_UNITS + 200) * K_L) / VIPER_LEN).toBeGreaterThan(1.3);
  });

  it('goes in tail first and fights: the claws brace, one clacks shut on the lip (a wince), then they wave and only they are left', () => {
    expect(depth(BITE_AT + 0.01)).toBeGreaterThan(depth(0.3));
    for (const h of HEAVES) expect(depth(h + 0.3)).toBeGreaterThan(depth(h - 0.05));
    // Its eyes are out in the water through the first two heaves.
    for (const t of [0.5, 1.5, 2.4, 3.0]) expect(bodyPoint(poseAt(t), EYE_NEAR).x).toBeGreaterThan(t < 2.8 ? 60 : 15);
    for (const t of [2.0, 2.5, 3.0, 3.5]) {
      expect(bracing(t)).toBe(1);
      // The crusher reaches back onto the lower jaw's tip; the cutter's tip is under the upper jaw's.
      const pose = poseAt(t);
      const tips = jawTips(t);
      const near = clawTip(pose, 1);
      expect(Math.hypot(near.x - tips.lower.x, near.y - tips.lower.y)).toBeLessThan(110);
      expect(Math.hypot(clawTip(pose, 0).x - tips.upper.x, clawTip(pose, 0).y - tips.upper.y)).toBeLessThan(110);
      expect(frameSeen(t, clawTip(pose, 0)).y).toBeGreaterThan(frameSeen(t, tips.upper).y - 2);
    }
    expect(poseAt(CLACK_AT - 0.05).claws[1].open).toBeGreaterThan(0.5);
    expect(poseAt(CLACK_AT + 0.08).claws[1].open).toBeLessThan(0.25);
    expect(viperEyes(CLACK_AT - 0.02)).toBeNull();
    expect(viperEyes(CLACK_AT + 0.1)).toBe('squeeze');
    // The last of it: the face is in, the claws are out, waving, and snip once.
    const last = poseAt(4.4);
    expect(bodyPoint(last, EYE_NEAR).x).toBeLessThan(0);
    for (const i of [0, 1] as const) expect(clawTip(last, i).x).toBeGreaterThan(180);
    expect(poseAt(SNIP_AT).claws[1].open).toBeLessThan(0.1);
    expect(poseAt(SNIP_AT - 0.15).claws[1].open).toBeGreaterThan(0.3);
  });

  it('goes in whole on the gulp, but for one antenna, which is slurped in with a pop', () => {
    const t = GULP_AT - 1e-6;
    const pose = poseAt(t);
    for (const i of [0, 1] as const) expect(clawTip(pose, i).x).toBeLessThan(30);
    expect(lobsterGone(GULP_AT)).toBe(true);
    expect(viperJaw(GULP_AT - 0.01)).toBeGreaterThan(2.5);
    expect(viperJaw(GULP_AT + 0.1)).toBeLessThan(0.05);
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(1);
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
    expect(poke(GULP_AT - 0.01)).toBeNull();
    expect(poke(GULP_AT + 0.2)!.out).toBeGreaterThan(ANTENNA_LEFT * 0.9);
    expect(poke(POKE_POP - 0.01)!.out).toBeLessThan(12);
    expect(poke(POKE_POP)).toBeNull();
  });

  it('brings the next lobster backwards out of the dark, tail first, in flicks, its eyes turning as it sees the teeth', () => {
    expect(murk(8.6)).toBe(1);
    expect(murk(10.2)).toBe(0);
    expect(glint(9.0)).toBeGreaterThan(0.6);
    for (const f of FLICKS) expect(flick(f + 0.1)).toBe(1);
    // Always nearer, tail towards the lips and face away; the flicks are its fastest moments.
    for (let t = DESSERT_FROM; t < LOOP_S - 0.05; t += 0.05) expect(reach(t + 0.05)).toBeGreaterThanOrEqual(reach(t) - 0.5);
    expect(poseAt(10.2).tailBend).toBeGreaterThan(-1);
    expect(poseAt(FLICKS[2] + 0.1).tailBend).toBeLessThan(-2);
    expect(eyeTurn(10.8)).toBe(0);
    expect(eyeTurn(11.3)).toBe(1);
    const [ka, kb] = [mouthFrame(0).k * viewAt(0).zoom, mouthFrame(END).k * viewAt(END).zoom];
    expect(kb).toBeCloseTo(ka, 3);
  });

  it('grows one stage on the meal: SCALE times longer, as the game steps sizes', () => {
    expect(viperLength(SPURT - 0.01)).toBeCloseTo(VIPER_LEN, 6);
    expect(viperLength(SPURT + 2)).toBeCloseTo(VIPER_LEN * SCALE, 2);
  });

  it('shows the same words either side of the loop point, none on the first frame, and keeps them in y 270-1250', () => {
    expect(CAPTIONS.map((c) => c.text)).toEqual(['he’s got TWO claws…', 'how did THAT fit', 'dinner is served…\nagain']);
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
      expect(captionAlpha(c, 0)).toBe(0);
      const rows = c.text.split('\n').length;
      expect(c.y - c.size / 2).toBeGreaterThan(270);
      expect(c.y + (rows - 1) * c.size * 1.02 + c.size / 2).toBeLessThan(1250);
    }
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length).toBeLessThanOrEqual(1);
    expect(captionAlpha(CAPTIONS[1]!, GULP_AT + 0.5)).toBe(1);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(1);
    }
    for (const [id, at] of [['eatBig', GULP_AT], ['eat', POKE_POP], ['click', CLACK_AT], ['click', SNIP_AT]] as const) {
      expect(SOUNDS.some((c) => c.id === id && Math.abs(c.t - at) < 0.05)).toBe(true);
    }
  });
});
