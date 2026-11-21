import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, wavOf } from '../audioKit';
import { EXTRA, type Extra } from '../swallowyou/audio';
import { AGELINE } from './ageline';
import { GHOSTS, TAGS } from './facts';
import { STEPS } from './ladder';
import { MAPS } from './maps';
import { PANELS } from './panels';
import { T, VIDEO_S } from './timeline';
import { LINEUP } from './twist';

/**
 * The soundtrack: the narrator straight through; under him, quiet: a whoosh
 * and a low swell on every step's zoom (deeper as the sharks grow), the
 * game's gulp on every meal, a stamp's thump on every stamp, a red slash on
 * every cross-out, the map's swim, the age counter's ticks, and the room's
 * hum.
 */

interface Cue {
  readonly id: SfxId | Extra;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: Cue['id'], t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

const spaced = (times: readonly number[], gap: number): number[] =>
  [...times].sort((a, b) => a - b).reduce<number[]>((acc, t) => (acc.length && t - acc[acc.length - 1]! < gap ? acc : [...acc, t]), []);

function stepCues(): Cue[] {
  return STEPS.flatMap((s, i) => [
    cue('dash', s.from, 1.3 - i * 0.05, 0.14, 0.4),
    cue('swell', s.from + 0.1, 1.25 - i * 0.06, 0.16),
    cue('thump', s.from + 0.9, 1.05, 0.18),
    ...(s.meal.id === 'plankton' || s.meal.id === 'hidden' ? [] : [cue('lunge', s.meal.at - 0.5, 1.4 - i * 0.04, 0.12), cue('eat', s.meal.at, 1.3 - i * 0.05, 0.2)]),
  ]);
}

function stampCues(): Cue[] {
  const stamps = spaced([
    ...TAGS.filter((tg) => tg.stamp).map((tg) => tg.at + 0.35),
    ...GHOSTS.map((g) => g.stampAt),
    ...GHOSTS.flatMap((g) => (g.shrink ? [g.shrink.at + 0.6] : [])),
  ], 0.25);
  const crosses = [...TAGS.flatMap((tg) => (tg.cross !== undefined ? [tg.cross] : [])), ...GHOSTS.flatMap((g) => (g.cross !== undefined ? [g.cross] : []))];
  return [
    ...stamps.map((t) => cue('thump', t, 1.15, 0.16)),
    ...crosses.map((t) => cue('click', t, 0.8, 0.16, -0.2)),
    ...GHOSTS.map((g) => cue('shimmer', g.from, 0.9, 0.1)),
    ...GHOSTS.flatMap((g) => (g.shrink ? [cue('swell', g.shrink.at, 1.4, 0.12)] : [])),
  ];
}

export const CUES: readonly Cue[] = [
  ...stepCues(),
  ...stampCues(),
  // The cold open: the giant's swell, the fins flicking past, the slam down.
  cue('swell', 0.05, 0.6, 0.22),
  cue('boing', T.you0, 1, 0.1),
  ...Array.from({ length: 12 }, (_, k) => cue('ding', T.twelve0 + k * 0.12, 0.8 + k * 0.05, 0.05)),
  cue('boom', T.this0, 1.1, 0.18),
  // The panels and the cut-ins.
  ...PANELS.map((p) => cue('dash', p.from, 1.2, 0.1, -0.5)),
  cue('dash', MAPS.from, 0.9, 0.14),
  ...Array.from({ length: 10 }, (_, k) => cue('splash', T.amazon + k * 0.6, 1.3, 0.05, 0.3)),
  cue('ding', T.peru, 1, 0.1),
  cue('ding', T.illinois, 1.1, 0.1),
  cue('boing', T.beach, 0.9, 0.12),
  cue('powerup', T.inkfish, 1, 0.16),
  cue('eat', T.eat4, 1.4, 0.2),
  cue('grow', T.eat4 + 0.8, 1, 0.18),
  cue('dash', T.fastest4, 1.4, 0.16),
  cue('swell', AGELINE.from, 0.7, 0.18),
  ...Array.from({ length: 24 }, (_, k) => cue('tick', T.biggest7 + k * 0.28, 1 + k * 0.01, 0.06, 0.5)),
  cue('heart', T.y1750, 1, 0.18),
  cue('boom', T.n351, 0.8, 0.14),
  cue('heart', T.deadly, 0.9, 0.18),
  cue('swell', T.where, 0.5, 0.22),
  cue('boom', T.realGiant, 0.6, 0.18),
  // The twist.
  cue('boom', T.plankton, 0.7, 0.2),
  cue('shimmer', T.plankton + 0.2, 1, 0.16),
  cue('suck', T.sardines + 1.4, 1.1, 0.16),
  cue('grow', T.born + 0.6, 0.9, 0.14),
  cue('ding', T.none, 1.2, 0.1),
  ...Array.from({ length: 12 }, (_, k) => cue('ding', LINEUP.from + k * 0.1, 0.9 + k * 0.05, 0.05)),
  cue('powerup', T.inkfish2, 1, 0.14),
];

const isExtra = (id: Cue['id']): id is Extra => id in EXTRA;

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const MASTER = 3;
const VOICE_GAIN = 0.8;

export async function renderSharksizeAudio(start = 0): Promise<Blob> {
  if (start !== 0) throw new Error('The long-form soundtrack starts at 0: it doesn’t loop');
  const { ctx, master, play } = offlineMix(VIDEO_S, MASTER);
  for (const c of CUES) {
    if (c.t < 0 || c.t >= VIDEO_S) continue;
    if (!isExtra(c.id)) {
      play(c.id, c.t, c.pitch, c.gain, c.pan);
      continue;
    }
    const level = ctx.createGain();
    level.gain.value = c.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = c.pan ?? 0;
    level.connect(pan).connect(master);
    EXTRA[c.id](ctx, level, c.t, c.pitch);
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
