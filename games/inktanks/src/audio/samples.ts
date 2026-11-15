import cannon1 from './samples/cannon-1.mp3?url';
import cannon2 from './samples/cannon-2.mp3?url';
import flame from './samples/flame.mp3?url';
import laser from './samples/laser.mp3?url';
import mg from './samples/mg.mp3?url';
import mortar from './samples/mortar.mp3?url';
import rail from './samples/rail.mp3?url';
import rocket from './samples/rocket.mp3?url';
import type { SfxId } from './sfx';

/**
 * The gun shots are recordings (generated with PixelLab's sound effects,
 * trimmed and loudness-matched to −16 LUFS by ffmpeg); everything else is
 * synthesized (synth.ts). A sound with more than one take picks one at
 * random each shot. Until a recording has loaded, its synth recipe plays.
 */
export const SAMPLES: Partial<Readonly<Record<SfxId, readonly string[]>>> = {
  cannon: [cannon1, cannon2],
  mg: [mg],
  rocket: [rocket],
  mortar: [mortar],
  flame: [flame],
  laser: [laser],
  rail: [rail],
};

/** Each recording's level against the synthesized sounds around it. */
export const SAMPLE_GAIN: Partial<Readonly<Record<SfxId, number>>> = {
  cannon: 0.8, mg: 0.75, rocket: 0.7, mortar: 0.8, flame: 0.45, laser: 0.7, rail: 0.85,
};

/** Fetches and decodes every recording; one that fails stays on its synth recipe. */
export async function loadSamples(ctx: BaseAudioContext): Promise<Map<SfxId, AudioBuffer[]>> {
  const out = new Map<SfxId, AudioBuffer[]>();
  const jobs = Object.entries(SAMPLES).flatMap(([id, urls]) => (urls ?? []).map(async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const list = out.get(id as SfxId) ?? [];
      list.push(buf);
      out.set(id as SfxId, list);
    } catch (e) {
      console.warn(`[inktanks] could not load the ${id} sound`, e);
    }
  }));
  await Promise.all(jobs);
  return out;
}
