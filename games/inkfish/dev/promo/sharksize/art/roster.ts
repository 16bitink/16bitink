import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { drawBullShark, prepareBull } from '../../croc/art/bullShark';
import { drawShark as drawCookiecutter } from '../../cookiecutter/shark';
import { drawTigerShark, prepareTiger } from '../../echidna/art/tigerShark';
import { drawGreatWhite, prepare as prepareWhite } from '../../foodchain/art/greatWhite';
import { drawWhaleShark, prepare as prepareWhaleShark } from '../../foodchain/art/whaleShark';
import { drawGreenlandShark } from '../../greenland/shark';
import { drawBaskingShark } from '../../seamonsters/art/baskingShark';
import { BLACKTIP } from './blacktip';
import { DOGFISH } from './dogfish';
import { LANTERNSHARK } from './lanternshark';
import { fitShark, placeholderShark, type RawShark, type SharkArt } from './contract';
import { SHARK_IDS, type SharkId } from './ids';
import { MAKO } from './mako';
import { HAMMERHEAD } from './hammerhead';

/**
 * Every shark of the video behind the one contract (contract.ts): the
 * paintings we already have, wrapped, and a labelled placeholder for each
 * species still to paint (MISSING.md). To land a new painting, export a
 * RawShark from its own file in this folder and swap its placeholder below
 * for it; nothing else changes.
 *
 * Painted for this video: lanternshark, blacktip, spiny dogfish (each its own
 * file here, through painted.ts); shortfin mako and great hammerhead
 * (mako.ts, hammerhead.ts, through bigSharkKit.ts).
 *
 * Reused: cookiecutter (cookiecutter/shark.ts), bull (croc/art), tiger
 * (echidna/art), Greenland (greenland/shark.ts), great white and whale shark
 * (foodchain/art), basking (seamonsters/art).
 */

const boilOf = (t: number): number => ((Math.floor(t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;

const RAW: Readonly<Record<SharkId, RawShark>> = {
  lanternshark: LANTERNSHARK,
  cookiecutter: {
    id: 'cookiecutter', name: 'COOKIECUTTER SHARK', painted: true, mouth: { along: 0.05, below: 0.05 },
    draw: (c, len, gulp, t, beat) => drawCookiecutter(c, {
      nose: { x: len / 2, y: 0 }, angle: 0, len, roll: 0, lips: gulp, grin: 0, eye: 'open', glow: 0.35, plug: 0, beat, effort: 0.4, whirl: 0,
    }, boilOf(t)),
  },
  dogfish: DOGFISH,
  blacktip: BLACKTIP,
  bull: {
    id: 'bull', name: 'BULL SHARK', painted: true, mouth: { along: 0.07, below: 0.045 }, prepare: prepareBull,
    draw: (c, len, _gulp, t, beat) => drawBullShark(c, { x: 0, y: 0, len, rot: 0, face: 1, beat }, {}, boilOf(t)),
  },
  mako: MAKO,
  hammerhead: HAMMERHEAD,
  tiger: {
    id: 'tiger', name: 'TIGER SHARK', painted: true, mouth: { along: 0.06, below: 0.045 }, prepare: prepareTiger,
    draw: (c, len, gulp, t, beat) => drawTigerShark(c, { x: 0, y: 0, len, rot: 0, face: 1, beat }, { gape: gulp }, boilOf(t)),
  },
  greenland: {
    id: 'greenland', name: 'GREENLAND SHARK', painted: true, mouth: { along: 0.05, below: 0.04 },
    draw: (c, len, _gulp, t, beat) => drawGreenlandShark(c, { x: 0, y: 0, length: len, facing: 1, tilt: 0, beat, effort: 0.3 }, boilOf(t), t),
  },
  greatWhite: {
    id: 'greatWhite', name: 'GREAT WHITE', painted: true, mouth: { along: 0.08, below: 0.05 }, prepare: prepareWhite,
    draw: (c, len, gulp, t, beat) => drawGreatWhite(c, 0, 0, len, 0, t, { jaw: gulp, tail: beat }),
  },
  basking: {
    id: 'basking', name: 'BASKING SHARK', painted: true, mouth: { along: 0.04, below: 0.04 },
    draw: (c, len, gulp, t, beat) => drawBaskingShark(c, 0, 0, len, 1, t, { gape: gulp, tail: beat }),
  },
  whaleShark: {
    id: 'whaleShark', name: 'WHALE SHARK', painted: true, mouth: { along: 0.015, below: 0.02 }, prepare: prepareWhaleShark,
    draw: (c, len, gulp, t, beat) => drawWhaleShark(c, 0, 0, len, 0, t, { gape: gulp, tail: beat }),
  },
  megalodon: placeholderShark('megalodon', 'MEGALODON', { depth: 0.24, head: 'long' }),
};

let ready: Readonly<Record<SharkId, SharkArt>> | null = null;

/** Bakes and measures every shark once; the same record after that. */
export async function prepareSharks(): Promise<Readonly<Record<SharkId, SharkArt>>> {
  if (ready) return ready;
  for (const id of SHARK_IDS) await RAW[id].prepare?.();
  const out = {} as Record<SharkId, SharkArt>;
  for (const id of SHARK_IDS) out[id] = fitShark(RAW[id]);
  ready = out;
  return out;
}

/** The sharks, once prepareSharks() has run. */
export function sharks(): Readonly<Record<SharkId, SharkArt>> {
  if (!ready) throw new Error('prepareSharks() first');
  return ready;
}

/** The ids still drawn by a placeholder. */
export const MISSING_SHARKS: readonly SharkId[] = SHARK_IDS.filter((id) => !RAW[id].painted);
