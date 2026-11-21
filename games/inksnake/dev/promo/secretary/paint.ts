import { SEC } from '../../../src/art/chapters/savannaBossPaint';

/**
 * The secretary bird's paint for the promo: the game's boss colours
 * (savannaBossPaint.ts SEC) plus what only shows side on and close up:
 * the lit and shaded orange-red face, the eye, the bill's tones and the
 * pinkish-grey legs.
 */
export const SB = {
  ...SEC,
  line: '#141218',
  face: '#e8642e', faceLit: '#f79a5a', faceDeep: '#a83a1c',
  iris: '#7a4f26', irisLit: '#b4813e', irisDeep: '#2e1a0c', pupil: '#070506',
  billLit: '#c9ced4', billDeep: '#6c727c', cere: '#d9a184',
  leg: '#d3b5ad', legLit: '#efdcd5', legDeep: '#987c75', scale: '#a98a83',
  breast: '#e9e9e3',
} as const;

/** The olive-brown snake (a generic African snake: no species, no pattern to name). */
export const SN = {
  back: '#6e5c34', backLit: '#9a8a52', backDeep: '#43361c', belly: '#dccf9e', bellyDeep: '#a99a68',
  iris: '#8a6a2a', pupil: '#0a0806', line: '#16130c', tongue: '#2a1a1e',
} as const;

/** The rubber snake on the force plate: toy green, glossy. */
export const RUBBER = {
  back: '#4f8a3a', backLit: '#8cc46a', backDeep: '#2c5222', belly: '#c9dd8a', bellyDeep: '#8aa456',
  iris: '#e0c040', pupil: '#0a0806', line: '#14200e', tongue: '#b0302a',
} as const;

export type SnakePaint = typeof SN | typeof RUBBER;
