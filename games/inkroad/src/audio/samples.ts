import { SFX_URLS } from './tracks';
import type { SfxId } from './synth';

/**
 * The recorded takes (src/audio/sfx) behind each sound id. A sound without a
 * take, or one whose files have not loaded, plays its synth voice instead.
 * `gain` sits the take against the others; several files are picked at random.
 */
export interface Sample { readonly files: readonly string[]; readonly gain: number; /** Seconds the sound lasts at most (it fades out). */ readonly max?: number }

export const SAMPLES: Readonly<Partial<Record<SfxId, Sample>>> = {
  click: { files: ['tap'], gain: 0.5 },
  honk: { files: ['horn1', 'horn2', 'horn3'], gain: 0.5 },
  stamp: { files: ['stamp'], gain: 0.8 },
  thump: { files: ['plate'], gain: 0.85 },
  plate: { files: ['plate'], gain: 0.8 },
  cash: { files: ['coins'], gain: 0.7 },
  till: { files: ['till'], gain: 0.7 },
  build: { files: ['hammer'], gain: 0.7 },
  remove: { files: ['digger'], gain: 0.8, max: 1.4 },
  chime: { files: ['flyover'], gain: 0.7 },
  cleared: { files: ['cleared'], gain: 0.7 },
  letter: { files: ['letter'], gain: 0.7 },
  error: { files: ['badstamp'], gain: 0.7 },
  jam: { files: ['truck'], gain: 0.5 },
  truck: { files: ['truck'], gain: 0.55 },
  toots: { files: ['toots'], gain: 0.55 },
  night: { files: ['crickets'], gain: 0.8, max: 6 },
  digger: { files: ['digger'], gain: 0.8 },
  tram: { files: ['tram'], gain: 0.6 },
  ship: { files: ['ship'], gain: 0.8, max: 6 },
  page: { files: ['page'], gain: 0.7 },
};

/** Every file name the takes use, plus the traffic loop. */
export const SAMPLE_FILES: readonly string[] = [...new Set([...Object.values(SAMPLES).flatMap((s) => (s ? s.files : [])), 'traffic'])].filter((f) => f in SFX_URLS);

/** Decodes the takes, a few at a time, once the audio context exists. */
export async function loadSamples(ctx: BaseAudioContext): Promise<ReadonlyMap<string, AudioBuffer>> {
  const out = new Map<string, AudioBuffer>();
  await Promise.all(SAMPLE_FILES.map(async (name) => {
    try {
      const r = await fetch(SFX_URLS[name]!);
      if (!r.ok) throw new Error(`sfx ${name} ${r.status}`);
      out.set(name, await ctx.decodeAudioData(await r.arrayBuffer()));
    } catch (e) {
      console.warn(`[inkroad] sfx ${name} not loaded`, e);
    }
  }));
  return out;
}
