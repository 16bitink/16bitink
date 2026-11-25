import { curveAt, type Key } from '../short';

/**
 * The turtle's shape, shared by its painted art (turtleShell.ts), the jaws
 * and the lump (story.ts, lump.ts): places along its axis `a` (world units
 * back from the nose) and heights `h` off it (up positive).
 */
export interface AH {
  readonly a: number;
  readonly h: number;
}

const keys = (pts: readonly (readonly [number, number])[]): readonly Key[] => pts.map(([t, at]) => ({ t, at }));

/** The head and the neck, above and below the axis. */
const HEAD_TOP = keys([[0, 18], [8, 48], [28, 72], [65, 88], [102, 88], [142, 74], [178, 62], [215, 60], [290, 60]]);
const HEAD_BOTTOM = keys([[0, 26], [8, 50], [30, 66], [70, 77], [110, 78], [148, 66], [182, 59], [290, 60]]);
export const headTop = (a: number): number => curveAt(HEAD_TOP, a).at;
export const headBottom = (a: number): number => curveAt(HEAD_BOTTOM, a).at;
/** The neck's end under the shell. */
export const NECK_END = 288;

/** The carapace: where it starts over the neck and ends over the tail, its domed top, and its flared lower rim. */
export const SHELL_FROM = 204;
export const SHELL_TO = 712;
export const TURTLE_LEN = 720;
const DOME = keys([[204, 66], [222, 98], [255, 144], [300, 190], [350, 228], [405, 251], [455, 258], [510, 249], [565, 224], [615, 184], [655, 136], [688, 84], [712, 30]]);
const RIM = keys([[204, 52], [224, 14], [262, -24], [340, -54], [450, -66], [560, -60], [640, -40], [690, -14], [712, 12]]);
export const domeTop = (a: number): number => curveAt(DOME, a).at;
export const rimEdge = (a: number): number => curveAt(RIM, a).at;
/** The line where the rim's scutes meet the dome. */
const MARGIN = keys([[218, 78], [244, 44], [290, 8], [360, -16], [450, -24], [550, -18], [620, 0], [668, 36], [696, 62]]);
export const marginLine = (a: number): number => curveAt(MARGIN, a).at;
export const MARGIN_FROM = 218;
export const MARGIN_TO = 696;

/** The plastron's underside. */
const UNDER = keys([[204, 60], [226, 88], [256, 112], [320, 122], [450, 124], [570, 122], [640, 108], [684, 78], [712, 36]]);
export const underBottom = (a: number): number => curveAt(UNDER, a).at;

const smoothMax = (p: number, q: number): number => (p ** 8 + q ** 8) ** (1 / 8);

/** The whole turtle's outline, as the jaws and the lump meet it: above and below the axis. */
export function turtleTop(a: number): number {
  if (a <= 0 || a >= TURTLE_LEN) return 0;
  if (a < SHELL_FROM) return headTop(a);
  return a > SHELL_TO ? 30 * ((TURTLE_LEN - a) / (TURTLE_LEN - SHELL_TO)) : smoothMax(domeTop(a), 1);
}
export function turtleBottom(a: number): number {
  if (a <= 0 || a >= TURTLE_LEN) return 0;
  if (a < SHELL_FROM) return headBottom(a);
  return a > SHELL_TO ? 36 * ((TURTLE_LEN - a) / (TURTLE_LEN - SHELL_TO)) : smoothMax(underBottom(a), 1);
}

/** The outline as skin stretched over it lies: bridging its hollows, never inside it. */
const BRIDGE = 72;
const stretched = (f: (a: number) => number) => (a: number): number => {
  let sum = 0;
  for (let i = -8; i <= 8; i++) sum += f(a + (i * BRIDGE) / 8);
  return Math.max(f(a), sum / 17);
};
export const skinTop = stretched(turtleTop);
export const skinBottom = stretched(turtleBottom);

// ---------------------------------------------------------------- the scutes

const ah = (a: number, h: number): AH => ({ a, h });

/** The zigzag line between the big side scutes and the row along the top: widest where two side scutes meet. */
const RIDGE: readonly AH[] = [ah(232, 92), ah(290, 138), ah(352, 152), ah(402, 190), ah(452, 178), ah(503, 190), ah(548, 154), ah(610, 136), ah(684, 74)];
/** The seams between the big side scutes: from the ridge's corner down to the rim's line. */
const SIDE_SEAMS: readonly (readonly [AH, AH])[] = [
  [RIDGE[2]!, ah(326, marginLine(326))],
  [RIDGE[4]!, ah(452, marginLine(452))],
  [RIDGE[6]!, ah(572, marginLine(572))],
];
/** The seams along the top: from the ridge's other corners up to the dome's edge. */
const TOP_AT = [286, 400, 506, 618] as const;
const TOP_SEAMS: readonly (readonly [AH, AH])[] = [1, 3, 5, 7].map((r, i) => [RIDGE[r]!, ah(TOP_AT[i]!, domeTop(TOP_AT[i]!))] as const);

const marginRun = (from: number, to: number, n = 10): AH[] => Array.from({ length: n + 1 }, (_, i) => ah(from + ((to - from) * i) / n, marginLine(from + ((to - from) * i) / n)));
const domeRun = (from: number, to: number, n = 10): AH[] => Array.from({ length: n + 1 }, (_, i) => ah(from + ((to - from) * i) / n, domeTop(from + ((to - from) * i) / n)));

/** The four big side scutes, front to back, closed outlines. */
export const SIDE_SCUTES: readonly (readonly AH[])[] = [
  [RIDGE[0]!, RIDGE[1]!, RIDGE[2]!, ...marginRun(326, MARGIN_FROM + 8)],
  [RIDGE[2]!, RIDGE[3]!, RIDGE[4]!, ...marginRun(452, 326)],
  [RIDGE[4]!, RIDGE[5]!, RIDGE[6]!, ...marginRun(572, 452)],
  [RIDGE[6]!, RIDGE[7]!, RIDGE[8]!, ...marginRun(MARGIN_TO - 6, 572)],
];
/** The five along the top, front to back. */
export const TOP_SCUTES: readonly (readonly AH[])[] = [
  [RIDGE[1]!, RIDGE[0]!, ...domeRun(208, TOP_AT[0])],
  [RIDGE[3]!, RIDGE[2]!, RIDGE[1]!, ...domeRun(TOP_AT[0], TOP_AT[1])],
  [RIDGE[5]!, RIDGE[4]!, RIDGE[3]!, ...domeRun(TOP_AT[1], TOP_AT[2])],
  [RIDGE[7]!, RIDGE[6]!, RIDGE[5]!, ...domeRun(TOP_AT[2], TOP_AT[3])],
  [RIDGE[8]!, RIDGE[7]!, ...domeRun(TOP_AT[3], 706)],
];
/** Every seam of the shell, as lines: what pushes through the stretched skin. */
export const SEAM_LINES: readonly (readonly AH[])[] = [RIDGE, marginRun(MARGIN_FROM, MARGIN_TO, 30), ...SIDE_SEAMS, ...TOP_SEAMS];
/** The rim's scutes: their seams, along the rim. */
export const RIM_SEAMS = [222, 250, 292, 342, 396, 450, 504, 558, 608, 650, 682] as const;
