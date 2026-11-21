import { describe, expect, it } from 'vitest';
import { creditAt, CREDIT } from '../dev/promo/otterpocket/credit';
import { raisedOf } from '../dev/promo/otterpocket/otter';
import { captionAt, HOOK_ROWS, HOOK_TO, hookAt, LINES, SOUNDS, TEXT } from '../dev/promo/otterpocket/script';
import {
  AT, BOIL_STEPS, chestStoneAt, clamAt, CUTS, grabAt, hookPose, IMPACT, LOOP_S, MUSSELS, musselsAt, sceneAt, sceneFrom, shakeAt,
  STONES, stonesAt, viewAt, wrap,
} from '../dev/promo/otterpocket/story';
import { LOOP_S as WORDS_LOOP, TEMPO, WORDS } from '../dev/promo/otterpocket/words';
import { BOIL_FPS } from '../src/art/textures';

const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: sea otters have pockets (narrated, sells InkBrick)', () => {
  it('loops on a whole number of 1.5 s beats, frames and line-boil steps', () => {
    expect(LOOP_S).toBe(WORDS_LOOP);
    expect(LOOP_S).toBe(18);
    expect(LOOP_S % 1.5).toBe(0);
    expect(Number.isInteger(LOOP_S * 30)).toBe(true);
    expect(BOIL_STEPS).toBe(LOOP_S * BOIL_FPS);
    expect(TEMPO).toBeGreaterThan(1.03);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops seamlessly: every state at the loop point equals frame 1, and the last beat runs into it', () => {
    expect(wrap(LOOP_S)).toBe(0);
    expect(sceneAt(LOOP_S)).toEqual(sceneAt(0));
    expect(viewAt(LOOP_S)).toEqual(viewAt(0));
    expect(shakeAt(LOOP_S)).toEqual(shakeAt(0));
    expect(captionAt(LOOP_S)).toEqual(captionAt(0));
    expect(hookAt(LOOP_S)).toBe(hookAt(0));
    expect(sceneAt(0).name).toBe('hook');
    expect(sceneAt(LOOP_S - 1e-6).name).toBe('armpit');
    // The last frame has the arm up, the pouch and the stone showing, and the camera on the hook's shot.
    const last = viewAt(LOOP_S - FRAME);
    const first = viewAt(0);
    expect(Math.hypot(last.pose.armR.paw.x - first.pose.armR.paw.x, last.pose.armR.paw.y - first.pose.armR.paw.y)).toBeLessThan(8);
    expect(Math.hypot(last.pose.armL.paw.x - first.pose.armL.paw.x, last.pose.armL.paw.y - first.pose.armL.paw.y)).toBeLessThan(8);
    expect(Math.abs(last.cam.zoom - first.cam.zoom)).toBeLessThan(0.01);
    expect(Math.abs(last.cam.cx - first.cam.cx)).toBeLessThan(2);
    expect(Math.abs(last.pose.face.eyes - first.pose.face.eyes)).toBeLessThan(0.05);
    expect(last.pose.stone).toBe(1);
  });

  it('opens on the hook: on its back, the arm up, the pouch open with the stone in it, the hook line up', () => {
    for (const t of [0, 0.3, 1, 1.7]) {
      const v = viewAt(t);
      expect(v.scene.name, `t=${t}`).toBe('hook');
      expect(v.pose.back).toBe(false);
      expect(raisedOf(v.pose.armR), `t=${t}`).toBeGreaterThan(0.9);
      expect(v.pose.stone).toBe(1);
      expect(v.pose.stoneLift).toBeGreaterThan(0.1);
      expect(v.cam.zoom).toBeGreaterThan(1.1);
      expect(hookAt(t), `t=${t}`).not.toBeNull();
      expect(captionAt(t), `t=${t}`).toBeNull();
    }
    expect(hookPose(0)).toEqual(hookPose(LOOP_S));
    expect(HOOK_ROWS.flat().map((w) => w.text).join(' ')).toBe('Sea otters have POCKETS!');
  });

  it('cuts to each beat on its words, in order', () => {
    const on = (t: number): string => sceneAt(t).name;
    expect(on(AT.flap)).toBe('flap');
    expect(on(AT.arm)).toBe('flap');
    expect(on(AT.rock)).toBe('rock');
    expect(on(AT.dive)).toBe('dive');
    expect(on(AT.grab)).toBe('clam');
    expect(on(AT.clam)).toBe('clam');
    expect(on(AT.float)).toBe('float');
    expect(on(AT.smash)).toBe('smash');
    expect(on(AT.cracked)).toBe('count');
    expect(on(AT.stones)).toBe('count');
    expect(on(AT.chuckle)).toBe('laugh');
    expect(on(AT.armpit)).toBe('armpit');
    expect(on(AT.remember)).toBe('armpit');
    for (let i = 1; i < CUTS.length; i++) expect(CUTS[i]!.from).toBeGreaterThan(CUTS[i - 1]!.from);
  });

  it('shows each noun as it is said: the flap opened, both arms up, the rock out, the clam grabbed', () => {
    expect(viewAt(AT.skin + 0.1).pose.pouchOpen).toBeGreaterThan(0.9);
    expect(viewAt(AT.skin + 0.1).cam.zoom).toBeGreaterThan(1.8);
    const each = viewAt(AT.arm + 0.1).pose;
    expect(raisedOf(each.armL)).toBeGreaterThan(0.8);
    expect(raisedOf(each.armR)).toBeGreaterThan(0.8);
    expect(viewAt(AT.rock + 0.1).pose.stoneLift).toBeGreaterThan(0.6);
    expect(viewAt(AT.dive + 0.3).flip).toBeLessThan(0);
    expect(viewAt(sceneFrom('clam') - 0.02).depth).toBeGreaterThan(0.8);
    expect(grabAt(AT.clam).reach).toBe(1);
    expect(grabAt(AT.grab - 0.1).reach).toBeLessThan(0.5);
  });

  it('smashes the clam on the stone on its chest: whole before, cracked after, no stone in the pouch', () => {
    for (const t of [AT.float + 0.2, AT.back, IMPACT - 0.05]) {
      expect(clamAt(t)?.crack, `t=${t}`).toBe(0);
      expect(chestStoneAt(t)).toBe(1);
      expect(viewAt(t).pose.stone).toBe(0);
    }
    expect(clamAt(IMPACT + 0.3)?.crack).toBe(1);
    // The clam is lifted up towards us, then comes down onto the stone.
    expect(clamAt(IMPACT - 0.15)!.scale).toBeGreaterThan(1.3);
    expect(clamAt(IMPACT)!.scale).toBe(1);
    expect(viewAt(IMPACT - 0.15).pose.armR.paw.y).toBeLessThan(viewAt(IMPACT).pose.armR.paw.y - 60);
    expect(Math.abs(shakeAt(IMPACT + 0.05).y)).toBeGreaterThan(3);
    expect(shakeAt(IMPACT - 0.05)).toEqual({ x: 0, y: 0 });
  });

  it('counts 44 mussels by the end of "mussels…" and 6 stones by the end of "stones!"', () => {
    expect(musselsAt(AT.cracked - 0.05)).toBe(0);
    expect(musselsAt(AT.n44)).toBeGreaterThan(5);
    expect(musselsAt(AT.musselsEnd)).toBe(MUSSELS);
    expect(MUSSELS).toBe(44);
    expect(STONES).toBe(6);
    expect(stonesAt(AT.six - 0.1)).toBe(0);
    expect(stonesAt(AT.six + 0.01)).toBe(1);
    expect(stonesAt(AT.stonesEnd)).toBe(6);
    let last = 0;
    for (const t of FRAMES.filter((x) => sceneAt(x).name === 'count')) {
      expect(stonesAt(t)).toBeGreaterThanOrEqual(last);
      last = stonesAt(t);
    }
  });

  it('times the words inside the loop, ending at least 0.2 s before it', () => {
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end - 1e-6);
    for (const w of WORDS) expect(w.end).toBeGreaterThan(w.start);
    expect(WORDS[0]!.start).toBeGreaterThanOrEqual(0);
    expect(WORDS[WORDS.length - 1]!.end).toBeLessThanOrEqual(LOOP_S - 0.2);
    expect(WORDS.map((w) => w.text).join(' ')).toBe(
      'Sea otters have POCKETS! A loose flap of skin under each arm… and they keep a ROCK in there. '
        + 'Dive down, grab a clam, float on your back… and SMASH! One otter cracked 44 mussels… with just 6 stones! '
        + 'So next time an otter reaches into its armpit… remember,',
    );
  });

  it('captions in phrases, text on every frame, and every text between y 270 and 1250', () => {
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.from).toBeGreaterThanOrEqual(HOOK_TO);
      expect(l.to).toBeLessThanOrEqual(LOOP_S);
      expect(l.to).toBeGreaterThan(l.from);
    }
    expect(LINES.filter((l) => l.words.length > 1).length).toBeGreaterThan(LINES.length / 2);
    for (const t of FRAMES) expect(hookAt(t) !== null || captionAt(t) !== null, `t=${t}`).toBe(true);
    for (const { y, size } of Object.values(TEXT)) {
      expect(y - size * 0.8).toBeGreaterThanOrEqual(270);
      expect(y + size * 0.25).toBeLessThanOrEqual(1250);
    }
  });

  it('shows the InkBrick credit from 40% of the way in, never in the first second, gone before the loop point', () => {
    expect(CREDIT.text).toBe('InkBrick · 16bit.ink/brick');
    for (const t of FRAMES.filter((x) => x < 0.4 * LOOP_S)) expect(creditAt(t, LOOP_S)).toBe(0);
    expect(creditAt(0.5 * LOOP_S, LOOP_S)).toBeCloseTo(CREDIT.alpha, 6);
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
