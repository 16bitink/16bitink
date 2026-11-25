import { describe, expect, it } from 'vitest';
import { headToScreen } from '../dev/promo/crows/art/crow';
import { BILL_TIP, NUT_AT } from '../dev/promo/crows/art/crowHead';
import { creditAt, CREDIT, CREDIT_FROM } from '../dev/promo/crows/credit';
import { captionAt, HOOK_ROWS, HOOK_TO, hookAt, LINES, SOUNDS, TEXT } from '../dev/promo/crows/script';
import {
  AGAIN, AT, BOIL_STEPS, burstAt, crossPose, CROSS_NUT, CRUNCH_NUT, crunchWheel, CUTS, DROP_GROUND, dropNut, dropPose, greenAt, HARD_NUT, HARD_NUT_R, hardPose, hookNutDown,
  hookPose, hookWheelX, HOOK_WHEEL, IMPACT, kernelAt, LAND, LOOP_S, missAt, missPose, MISS_NUT, moveNut, MOVE_NUT, MOVE_WHEEL, movePose, PASSES, passAt, PECKS, peckAt, REACH, sceneAt,
  sceneFrom, shakeAt, stopAt, waitPose, wrap,
} from '../dev/promo/crows/story';
import { LOOP_S as WORDS_LOOP, TEMPO, WORDS } from '../dev/promo/crows/words';
import { BOIL_FPS } from '../src/art/textures';

const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: these crows use cars as nutcrackers (narrated, sells InkRoad)', () => {
  it('loops on a whole number of 1.5 s beats, frames and line-boil steps', () => {
    expect(LOOP_S).toBe(WORDS_LOOP);
    expect(LOOP_S).toBe(21);
    expect(LOOP_S % 1.5).toBe(0);
    expect(Number.isInteger(LOOP_S * 30)).toBe(true);
    expect(BOIL_STEPS).toBe(LOOP_S * BOIL_FPS);
    expect(TEMPO).toBeGreaterThan(1.03);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops seamlessly: the state at the loop point equals frame 1, and the last beat runs into it', () => {
    expect(wrap(LOOP_S)).toBe(0);
    expect(sceneAt(LOOP_S)).toEqual(sceneAt(0));
    expect(hookPose(LOOP_S)).toEqual(hookPose(0));
    expect(hookWheelX(LOOP_S)).toBe(hookWheelX(0));
    expect(captionAt(LOOP_S)).toEqual(captionAt(0));
    expect(hookAt(LOOP_S)).toBe(hookAt(0));
    expect(shakeAt(LOOP_S)).toEqual({ x: 0, y: 0 });
    expect(sceneAt(0).name).toBe('hook');
    expect(sceneAt(LOOP_S - 1e-6).name).toBe('again');
    const last = hookPose(LOOP_S - FRAME);
    const first = hookPose(0);
    expect(Math.hypot(last.head.x - first.head.x, last.head.y - first.head.y)).toBeLessThan(6);
    expect(Math.abs(last.head.a - first.head.a)).toBeLessThan(0.03);
    expect(Math.abs(last.x - first.x)).toBeLessThan(2);
    expect(last.head.nut).toBe(true);
    expect(Math.abs(hookWheelX(LOOP_S - FRAME) - hookWheelX(0))).toBeLessThan(10);
    // The wheel only ever rolls forward, from off the frame.
    expect(hookWheelX(AGAIN + 0.01) + HOOK_WHEEL.r + HOOK_WHEEL.depth).toBeLessThan(hookWheelX(0) + HOOK_WHEEL.r);
    for (let t = AGAIN; t < LOOP_S + 2.6; t += FRAME) expect(hookWheelX(t + FRAME)).toBeGreaterThanOrEqual(hookWheelX(t) - 1e-6);
  });

  it('opens on the hook: the tyre on the left, the crow on the right with the walnut held out between them, its eye on us', () => {
    for (const t of [0, 0.3]) {
      const p = hookPose(t);
      expect(p.head.nut).toBe(true);
      expect(p.head.lid).toBe(0);
      const nut = headToScreen(p, NUT_AT);
      expect(nut.x).toBeGreaterThan(400);
      expect(nut.x).toBeLessThan(600);
      expect(p.x).toBeGreaterThan(nut.x + 200);
      expect(1080 - nut.x, 'the bird is over half of the frame').toBeGreaterThan(540);
      const reach = hookWheelX(t) + HOOK_WHEEL.r;
      expect(reach).toBeGreaterThan(250);
      expect(reach).toBeLessThan(nut.x);
      expect(hookAt(t)).not.toBeNull();
      expect(captionAt(t)).toBeNull();
      expect(creditAt(t, LOOP_S)).toBe(0);
    }
    expect(hookNutDown(AT.cars + 0.05)).toBe(true);
    expect(HOOK_ROWS.flat().map((w) => w.text).join(' ')).toBe('These crows use CARS as nutcrackers!');
  });

  it('cuts to each beat on its words, in order', () => {
    const on = (t: number): string => sceneAt(t).name;
    expect(on(AT.nutcrackers)).toBe('hook');
    expect(on(AT.japan)).toBe('sendai');
    expect(on(AT.walnuts)).toBe('hard');
    expect(on(AT.crack)).toBe('hard');
    expect(on(AT.drops)).toBe('drop');
    expect(on(AT.road)).toBe('drop');
    expect(on(AT.waits)).toBe('wait');
    expect(on(AT.crunch)).toBe('crunch');
    expect(on(AT.missed)).toBe('missed');
    expect(on(AT.nut)).toBe('move');
    expect(on(AT.tire)).toBe('move');
    expect(on(AT.lunch)).toBe('traffic');
    expect(on(AT.traffic)).toBe('traffic');
    expect(on(AT.chuckle)).toBe('laugh');
    expect(on(AT.crosswalk)).toBe('crossing');
    expect(on(AT.stop)).toBe('crossing');
    expect(on(AT.people)).toBe('better');
    expect(on(AT.because)).toBe('again');
    for (let i = 1; i < CUTS.length; i++) expect(CUTS[i]!.from).toBeGreaterThan(CUTS[i - 1]!.from);
  });

  it('pecks the shell on the bill tip, three times, then drops a nut that lands on the road', () => {
    for (const p of PECKS) {
      expect(sceneAt(p).name).toBe('hard');
      expect(peckAt(p)).toBeGreaterThan(0.98);
      const tip = headToScreen(hardPose(p), BILL_TIP);
      expect(Math.hypot(tip.x - HARD_NUT.x, tip.y - HARD_NUT.y)).toBeLessThan(HARD_NUT_R);
    }
    expect(dropPose(AT.drops - 0.02).head.nut).toBe(true);
    expect(dropNut(AT.drops - 0.02)).toBeNull();
    expect(dropPose(AT.drops + 0.02).head.nut).toBe(false);
    // The nut leaves from where the bill held it.
    const held = headToScreen(dropPose(AT.drops - 1e-4), NUT_AT);
    const free = dropNut(AT.drops + 1e-4)!.at;
    expect(Math.hypot(held.x - free.x, held.y - free.y)).toBeLessThan(4);
    expect(dropNut(LAND)!.at.y).toBeCloseTo(DROP_GROUND.y, 0);
    expect(waitPose(AT.waits).head.nut).toBe(false);
  });

  it('crunches on the word: whole before, burst after, the kernel up, the picture shaken', () => {
    expect(burstAt(IMPACT - 0.02)).toBe(0);
    expect(burstAt(IMPACT + 0.4)).toBeGreaterThan(0.4);
    expect(IMPACT).toBeGreaterThan(AT.crunch);
    expect(IMPACT).toBeLessThan(AT.crunch + 0.15);
    expect(kernelAt(IMPACT + 0.25).at.y).toBeLessThan(CRUNCH_NUT.y - 250);
    expect(crunchWheel(IMPACT - 0.1).x).toBeLessThan(crunchWheel(IMPACT).x);
    expect(Math.abs(shakeAt(IMPACT + 0.03).x) + Math.abs(shakeAt(IMPACT + 0.03).y)).toBeGreaterThan(8);
    expect(shakeAt(IMPACT - 0.05)).toEqual({ x: 0, y: 0 });
  });

  it('keeps the crow out of every car: clear of the miss, off the road in the traffic, back from the tyres', () => {
    for (const t of FRAMES.filter((x) => sceneAt(x).name === 'missed' && missAt(x) < 0.6)) {
      expect(headToScreen(missPose(t), BILL_TIP).x - MISS_NUT.x, `t=${t}`).toBeGreaterThan(300);
    }
    for (const t of FRAMES.filter((x) => sceneAt(x).name === 'move')) {
      expect(headToScreen(movePose(t), BILL_TIP).x, `t=${t}`).toBeLessThan(MOVE_WHEEL.x - MOVE_WHEEL.r * 0.7);
    }
    // Both lanes get cars while the line is said.
    for (const lane of ['near', 'far'] as const) {
      expect(PASSES.filter((p) => p.lane === lane && passAt(p, AT.lunch + 0.4) > -2).length).toBeGreaterThan(1);
    }
  });

  it('sets the nut exactly in front of the tyre', () => {
    expect(moveNut(AT.it).at.x).toBe(MOVE_NUT.from);
    const n = moveNut(AT.tire).at;
    expect(n.x).toBeCloseTo(MOVE_NUT.to, 0);
    const rise = MOVE_WHEEL.y + MOVE_WHEEL.r - n.y;
    const edge = MOVE_WHEEL.x - MOVE_WHEEL.depth - Math.sqrt(MOVE_WHEEL.r ** 2 - (MOVE_WHEEL.r - rise) ** 2);
    expect(edge - n.x).toBeGreaterThan(MOVE_NUT.r * 0.5);
    expect(edge - n.x).toBeLessThan(MOVE_NUT.r * 2.4);
  });

  it('waits at the crosswalk on red and walks only once the light has changed and the cars slow', () => {
    for (const t of [AT.wait, AT.crosswalk, AT.until - 0.05]) {
      expect(greenAt(t)).toBe(0);
      expect(crossPose(t).x).toBe(crossPose(sceneFrom('crossing')).x);
    }
    expect(greenAt(AT.until + 0.1)).toBe(1);
    expect(stopAt(AT.stop + 0.1)).toBe(1);
    expect(crossPose(AT.stop).walk).toBeGreaterThan(0.2);
    expect(crossPose(REACH).x).toBeGreaterThan(crossPose(AT.wait).x + 150);
    const bill = headToScreen(crossPose(REACH), BILL_TIP);
    expect(Math.hypot(bill.x - CROSS_NUT.x, bill.y - CROSS_NUT.y)).toBeLessThan(60);
  });

  it('times the words inside the loop, ending at least 0.2 s before it', () => {
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end - 1e-6);
    for (const w of WORDS) expect(w.end).toBeGreaterThan(w.start);
    expect(WORDS[0]!.start).toBeGreaterThanOrEqual(0);
    expect(WORDS[WORDS.length - 1]!.end).toBeLessThanOrEqual(LOOP_S - 0.2);
    expect(WORDS.map((w) => w.text).join(' ')).toBe(
      'These crows use CARS as nutcrackers! In Sendai, Japan, walnuts are too hard to crack. So a crow drops one on the road… and waits. CRUNCH! '
        + 'Missed? It moves the nut… right in front of a TIRE! But now lunch is in the middle of traffic… so some wait at the CROSSWALK, until the cars STOP! '
        + 'Better than most people do, because',
    );
  });

  it('captions in phrases, text on every frame, and every text between y 270 and 1250', () => {
    for (const l of LINES) {
      expect(l.rows.length).toBeLessThanOrEqual(2);
      for (const r of l.rows) expect(r.length).toBeLessThanOrEqual(5);
      expect(l.from).toBeGreaterThanOrEqual(HOOK_TO);
      expect(l.to).toBeLessThanOrEqual(LOOP_S);
      expect(l.to).toBeGreaterThan(l.from);
    }
    // Only the two shouts stand alone.
    expect(LINES.filter((l) => l.words.length === 1).map((l) => l.words[0]!.text)).toEqual(['CRUNCH!', 'Missed?']);
    expect(LINES.flatMap((l) => l.words).filter((w) => w.start < LOOP_S).map((w) => w.text)).toEqual(WORDS.slice(6).map((w) => w.text));
    for (const t of FRAMES) expect(hookAt(t) !== null || captionAt(t) !== null, `t=${t}`).toBe(true);
    for (const { y, size } of Object.values(TEXT)) {
      expect(y - size * 0.8).toBeGreaterThanOrEqual(270);
      expect(y + size * 0.25).toBeLessThanOrEqual(1250);
    }
  });

  it('shows the InkRoad credit only after the CRUNCH has played, gone before the loop point', () => {
    expect(sceneFrom('missed')).toBeLessThanOrEqual(CREDIT_FROM + 0.1);
    expect(CREDIT.text).toBe('InkRoad · 16bit.ink/road');
    for (const t of FRAMES.filter((x) => x <= 10)) expect(creditAt(t, LOOP_S)).toBe(0);
    expect(creditAt(0.6 * LOOP_S, LOOP_S)).toBeCloseTo(CREDIT.alpha, 6);
    for (const t of FRAMES.filter((x) => x > LOOP_S - 0.6)) expect(creditAt(t, LOOP_S)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBeCloseTo(creditAt(LOOP_S, LOOP_S), 6);
  });

  it('keeps the effects quiet and inside the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.45);
    }
  });
});
