/** The palette: warm paper, sand, muted roads, turquoise water. Red means jammed and nothing else. */
export const INK = '#3a322b';
export const INK_SOFT = 'rgba(58,50,43,0.55)';
export const PAPER = '#f3ead8';
export const SAND = '#e8cfa0';
export const SAND_DARK = '#c9a873';
export const GRASS = '#9fae6e';
export const WATER = '#4fb3b8';
export const WATER_DEEP = '#2a8793';
export const WATER_SHALLOW = '#a9dcd2';
export const ASPHALT = '#85838a';
export const CONCRETE = '#b9b1a5';
export const PAVING = '#d8cab2';
export const BUSLANE = '#b58a5c';
export const ROCK = '#a58f76';
export const PLAZA = '#d3b594';
export const WORKS = '#c08f58';
export const PAINT = '#f2ecdf';
export const PAINT_YELLOW = '#e2b84f';
export const KERB_BLUE = '#3f9fb0';
export const SHADOW = 'rgba(60,46,40,0.26)';
export const JAM = '#c93a2b';

export const PAPER_HEX = 0xf3ead8;
export const INK_HEX = 0x3a322b;
export const JAM_HEX = 0xc93a2b;

/** Cars' paints (index = CarsView.tint). No red. */
export const CAR_TINTS: readonly string[] = [
  '#f4f1ea', '#c9ccd0', '#8f979e', '#4f5660', '#5d8fb8', '#3c6a94', '#7fb0a3', '#a9b57a', '#d9c08a', '#b08d6a', '#8d86a8', '#e8ddc4',
];

/** Line colours (TransitLine.colour). No red. */
export const LINE_COLOURS: readonly number[] = [0x2f7f8f, 0xb9792b, 0x6b5aa0, 0x4f8a4a, 0x2f5f9f, 0xa0567a];

/** Calm ink to amber to red: 0 = free, 1 = jammed. */
const RAMP: readonly (readonly [number, number, number, number])[] = [
  [0, 72, 112, 110], [0.4, 120, 140, 84], [0.62, 214, 166, 62], [0.8, 220, 120, 52], [1, 201, 58, 43],
];

export function heat(t: number): number {
  const v = Math.min(1, Math.max(0, t));
  for (let i = 1; i < RAMP.length; i++) {
    const a = RAMP[i - 1]!;
    const b = RAMP[i]!;
    if (v > b[0]) continue;
    const k = (v - a[0]) / (b[0] - a[0]);
    const c = (n: 1 | 2 | 3): number => Math.round(a[n] + (b[n] - a[n]) * k);
    return (c(1) << 16) | (c(2) << 8) | c(3);
  }
  return JAM_HEX;
}

export const css = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

export const HAND = '"Caveat", "Patrick Hand", cursive';
export const PLAIN = '"Inter", "Segoe UI", system-ui, sans-serif';
