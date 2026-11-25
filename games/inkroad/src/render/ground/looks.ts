import type { TextureName } from '../../art/manifest';

/**
 * How each city's land is painted: which textures, how large and how calm,
 * and the colours of its washes and shores. Busy tiles are flattened towards
 * their own mean and laid large, so the roads stay the thing you look at.
 */
export interface Layer {
  readonly tex: TextureName;
  /** Plan px one tile covers. */
  readonly tile: number;
  /** How much of its contrast is kept, 0..1. */
  readonly keep: number;
  readonly tint?: string;
  readonly tintAlpha?: number;
  /** Laid over the base this strongly. */
  readonly alpha?: number;
}

export interface Look {
  readonly base: Layer;
  /** A finer grain over the base. */
  readonly grain?: Layer;
  /** The warm and cool blooms of the wash, 'r,g,b', and how strong (1 = the gulf's). */
  readonly warm: readonly [number, number, number];
  readonly cool: readonly [number, number, number];
  readonly wash: number;
  readonly water: Layer;
  /** The soft band of land along the shore. */
  readonly shore: string;
  /** A strip of beach this wide, plan px. */
  readonly beach: number;
  readonly shallow: string;
  /** How strongly the open sea goes deep, 0..1. */
  readonly deep: number;
  readonly old: { readonly tex: TextureName; readonly alpha: number };
  readonly park: number;
  /** Old stone laid as a soft border beside roads (the 'h' ground itself stays calm). */
  readonly apron?: TextureName;
}

const GULF: Look = {
  base: { tex: 'sand', tile: 420, keep: 1 }, warm: [170, 116, 62], cool: [255, 246, 222], wash: 1,
  water: { tex: 'water', tile: 210, keep: 1 }, shore: '176,128,72', beach: 0, shallow: '214,242,228', deep: 1, old: { tex: 'plaza', alpha: 0.5 }, park: 0.92,
};

const LOOKS: Readonly<Record<string, Look>> = {
  gulf: GULF,
  oldtown: {
    base: { tex: 'grass', tile: 300, keep: 0.4, tint: '#cfd49c', tintAlpha: 0.5 }, grain: { tex: 'sand', tile: 900, keep: 0.5, alpha: 0.18 },
    warm: [176, 150, 90], cool: [232, 232, 190], wash: 0.7,
    water: { tex: 'water', tile: 330, keep: 0.5, tint: '#5f9aa0', tintAlpha: 0.2 }, shore: '120,108,78', beach: 0, shallow: '186,212,206', deep: 0.8,
    old: { tex: 'sand', alpha: 0.4 }, park: 0.9, apron: 'cobble',
  },
  islands: {
    base: { tex: 'grass', tile: 320, keep: 0.45, tint: '#b7bd80', tintAlpha: 0.42 }, grain: { tex: 'sand', tile: 260, keep: 0.5, alpha: 0.16 },
    warm: [120, 132, 52], cool: [226, 232, 160], wash: 0.8,
    water: { tex: 'water', tile: 260, keep: 0.8 }, shore: '196,170,110', beach: 62, shallow: '222,248,232', deep: 1, old: { tex: 'plaza', alpha: 0.6 }, park: 0.9,
  },
  hills: {
    base: { tex: 'sand', tile: 980, keep: 0.4, tint: '#cdbb84', tintAlpha: 0.2 }, grain: { tex: 'grass', tile: 300, keep: 0.6, alpha: 0.26 },
    warm: [176, 124, 62], cool: [236, 226, 178], wash: 0.8,
    water: { tex: 'shallow', tile: 260, keep: 0.8 }, shore: '170,140,86', beach: 0, shallow: '200,238,232', deep: 1, old: { tex: 'plaza', alpha: 0.45 }, park: 0.9,
  },
  rivers: {
    base: { tex: 'grass', tile: 340, keep: 0.35, tint: '#c2ad72', tintAlpha: 0.34 }, grain: { tex: 'sand', tile: 1000, keep: 0.45, alpha: 0.3 },
    warm: [160, 104, 54], cool: [230, 214, 160], wash: 0.8,
    water: { tex: 'water', tile: 320, keep: 0.6, tint: '#6f9a98', tintAlpha: 0.25 }, shore: '120,96,62', beach: 0, shallow: '188,206,196', deep: 0.7, old: { tex: 'plaza', alpha: 0.5 }, park: 0.9,
  },
};

export const lookOf = (style: string): Look => LOOKS[style] ?? GULF;
