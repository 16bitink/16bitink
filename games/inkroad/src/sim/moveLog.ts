/**
 * Every manoeuvre planned in this process (parking moves, doors, turning round on the road): what it was, its
 * seconds, the seconds it held the lane, and whether the planner found a way that fits. Read by dev/moves.mjs and
 * the tests; capped, so a long game never grows it without end.
 */
export interface MoveRecord {
  readonly what: 'in' | 'out' | 'door' | 'turn';
  readonly kind: string;
  readonly seconds: number;
  readonly lane: number;
  readonly fits: boolean;
  readonly ms: number;
  /** The Reeds–Shepp word driven, and why it does not fit when it does not. */
  readonly word?: string;
  /** Where it went from and to (the body's middle), for the lab's notes. */
  readonly from?: { readonly x: number; readonly y: number; readonly a: number };
  readonly to?: { readonly x: number; readonly y: number; readonly a: number };
}

const CAP = 200_000;
export const MOVE_LOG: MoveRecord[] = [];

export function logMove(r: MoveRecord): void {
  if (MOVE_LOG.length < CAP) MOVE_LOG.push(r);
}
