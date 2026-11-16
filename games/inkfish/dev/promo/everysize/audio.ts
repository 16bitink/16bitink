import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, wavOf } from '../audioKit';
import { EXTRA, osc, type Extra } from '../swallowyou/audio';
import { GANNET_SPLASHES, RUN_GULPS } from './crowds';
import { running, turnsAt } from './hud';
import { STEPS } from './ladder';
import { HUNT, LINE, WHALE_HUNT, WHALING } from './scenes';
import { T, VIDEO_S } from './timeline';

/**
 * The soundtrack: the narrator straight through; under him, quiet: the
 * stopwatch ticking (fast at the bottom of the ladder, slower every step,
 * silent before each forecast), a stamp's thump on every forecast, a whoosh
 * and a low swell on every zoom (deeper as you grow), the game's gulps and
 * splashes for the hunts, and the room's hum.
 */

type Own = 'bell';

interface Cue {
  readonly id: SfxId | Extra | Own;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: Cue['id'], t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

const OWN: Readonly<Record<Own, (ctx: OfflineAudioContext, out: AudioNode, t: number, p: number) => void>> = {
  bell: (ctx, out, t, p) => {
    for (const [k, g] of [[1, 0.4], [2.76, 0.12], [5.4, 0.05]] as const) osc(ctx, out, { t, type: 'sine', from: 520 * p * k, dur: 2.4, gain: g, attack: 0.003 });
  },
};

/** The stopwatch: a tick every half turn of its hand, only on the climb's own shots. */
function ticks(): Cue[] {
  const out: Cue[] = [];
  const inserts = [[T.game - 0.2, T.foot - 0.5], [HUNT.from, HUNT.to], [WHALE_HUNT.from, LINE.to + 0.5]] as const;
  let last = 0;
  for (let t = 0.2; t < T.climb; t += 1 / 60) {
    if (!running(t) || inserts.some(([a, b]) => t >= a && t < b)) continue;
    const half = Math.floor(turnsAt(t) * 4);
    if (half !== last && t - (out[out.length - 1]?.t ?? -1) > 0.11) {
      out.push(cue('tick', t, half % 2 ? 1.25 : 1.05, 0.06, 0.55));
    }
    last = half;
  }
  return out;
}

function stepCues(): Cue[] {
  return STEPS.flatMap((s, i) => [
    cue('dash', s.from, 1.3 - i * 0.08, 0.14, -0.3),
    cue('swell', s.from + 0.1, 1.2 - i * 0.09, 0.16),
    ...s.readouts.flatMap((r) => [cue('thump', r.at, 1.05, 0.22), cue('tick', r.at + 0.35, 1.4, 0.12, 0.5)]),
  ]);
}

const spaced = (times: readonly number[], gap: number): number[] => times.reduce<number[]>((acc, t) => (acc.length && t - acc[acc.length - 1]! < gap ? acc : [...acc, t]), []);

export const CUES: readonly Cue[] = [
  ...ticks(),
  ...stepCues(),
  // The cold open: the whale's low swell, the orcas going past, the slam down to the larva, the promise.
  cue('swell', 0.05, 0.7, 0.2),
  cue('dash', T.orcas, 0.8, 0.16, 0.4),
  cue('boom', T.youreThis + 0.2, 1.2, 0.14),
  cue('boing', T.larva0, 1.3, 0.1),
  cue('thump', T.real + 0.1, 1.2, 0.18),
  cue('ding', T.oneSize, 1, 0.08, -0.5),
  cue('ding', T.veryTop, 0.9, 0.08, -0.5),
  // The larva: the anchovy's sweep, the jellyfish, the thinning days, the globe.
  cue('lunge', T.bigger, 1.4, 0.14),
  ...[0.4, 0.8, 1.2].map((d) => cue('eat', T.bigger + d, 1.6, 0.12)),
  cue('suck', T.jelly + 1.2, 1.4, 0.12),
  cue('shimmer', T.digest, 1, 0.1),
  ...Array.from({ length: 6 }, (_, i) => cue('click', T.half + i * 0.55, 1.1, 0.14)),
  cue('shimmer', T.everyPerson, 0.8, 0.12),
  cue('ding', T.two, 1.2, 0.1),
  cue('ding', T.rule, 1.1, 0.08, -0.5),
  // The sardine run.
  cue('rustle', T.millions, 1, 0.16),
  ...GANNET_SPLASHES.map((s) => cue('splash', s, 1.2, 0.18, 0.3)),
  cue('lunge', T.sharks, 0.9, 0.14),
  ...spaced(RUN_GULPS, 0.18).map((g, i) => cue('eat', g, 1.2 + (i % 3) * 0.1, 0.1, ((i * 7) % 9) / 4.5 - 1)),
  // The game.
  cue('powerup', T.inkfish, 1, 0.16),
  cue('eat', T.eat - 0.1, 1.4, 0.22),
  cue('eat', T.eat + 0.6, 1.3, 0.22),
  cue('grow', T.eat + 1.3, 1, 0.2),
  // The rule, the tuna, you.
  cue('shimmer', T.tenTimes, 1.1, 0.14),
  cue('dash', T.bluefin, 0.9, 0.12),
  cue('swell', T.warmer, 1.3, 0.1),
  cue('dash', T.orcasHunt, 0.75, 0.14),
  cue('boing', T.you, 1, 0.12),
  cue('dash', T.tiger, 0.8, 0.12),
  cue('thump', T.k300, 0.9, 0.2),
  cue('bell', T.yours, 1, 0.12),
  cue('swell', T.stops, 0.7, 0.2),
  // The great white and the orcas.
  cue('lunge', T.off + 0.4, 0.8, 0.16),
  cue('dash', T.five, 0.9, 0.14),
  cue('boom', T.won, 0.7, 0.14),
  cue('thump', T.snack, 1, 0.22),
  cue('shimmer', T.liver, 0.9, 0.14),
  // The blue whale.
  cue('swell', T.blue9, 0.6, 0.22),
  cue('heart', T.almost2, 1, 0.24),
  cue('dash', T.fourteen, 0.8, 0.14),
  cue('boom', T.killed + 0.6, 0.6, 0.14),
  // People did.
  cue('boom', T.people, 0.5, 0.2),
  ...Array.from({ length: 18 }, (_, i) => cue('tick', T.whaling + i * 0.12, 0.9 + i * 0.02, 0.08)),
  cue('heart', T.fewer, 1, 0.22),
  cue('bell', T.climbing, 1.2, 0.12),
  cue('ding', T.people, 0.8, 0.08, -0.5),
  ...Array.from({ length: 8 }, (_, i) => cue('ding', LINE.from + i * 0.18, 0.9 + i * 0.06, 0.06)),
  cue('thump', T.dangerous, 0.9, 0.2),
  cue('powerup', T.climb, 1, 0.14),
  cue('eat', T.climb + 1.2, 1.4, 0.2),
  cue('grow', T.climb + 2, 1, 0.18),
  cue('swell', WHALING.from, 0.6, 0.16),
];

const isOwn = (id: Cue['id']): id is Own => id in OWN;
const isExtra = (id: Cue['id']): id is Extra => id in EXTRA;

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const MASTER = 3;
const VOICE_GAIN = 0.8;

export async function renderEverysizeAudio(start = 0): Promise<Blob> {
  if (start !== 0) throw new Error('The long-form soundtrack starts at 0: it doesn’t loop');
  const { ctx, master, play } = offlineMix(VIDEO_S, MASTER);
  for (const c of CUES) {
    if (c.t < 0 || c.t >= VIDEO_S) continue;
    if (!isOwn(c.id) && !isExtra(c.id)) {
      play(c.id, c.t, c.pitch, c.gain, c.pan);
      continue;
    }
    const level = ctx.createGain();
    level.gain.value = c.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = c.pan ?? 0;
    level.connect(pan).connect(master);
    if (isOwn(c.id)) OWN[c.id](ctx, level, c.t, c.pitch);
    else EXTRA[c.id](ctx, level, c.t, c.pitch);
  }
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const gain = ctx.createGain();
  gain.gain.value = VOICE_GAIN;
  voice.connect(gain).connect(ctx.destination);
  voice.start(0);
  const mix = await ctx.startRendering();
  const frames = mix.length;
  const hum = ambience(frames, Math.round(VIDEO_S / 12));
  const channels = [0, 1].map((c) => {
    const out = mix.getChannelData(c).slice();
    const h = hum[c]!;
    for (let i = 0; i < frames; i++) out[i] = out[i]! + 0.1 * h[i]!;
    return out;
  });
  return wavOf(channels);
}
