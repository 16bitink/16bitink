import { BOARD, type CoverDef, type LevelDef, type Place, type SolidDef } from '../../level/types';
import { createRng, type Rng } from '../../logic/rng';

/**
 * What lies round a level's board, past its border: the place carrying on,
 * plainer (no gameplay). Laid out here from the level's id alone, so a retry
 * (or another device) shows the same surround. Plain data: see surround.ts
 * for its painting.
 */

/** How far the painted surround reaches past each board edge, board px, and its texture px per board px. */
export const SURROUND = { x: 240, y: 150, res: 1 } as const;
/** Scenery keeps this far off the board's edges, so the border stands clear, board px. */
const CLEAR = 46;
/** And this far in from the surround's outer edge (it's washed out there anyway). */
const FAR = 24;
/** Scenery pieces, solids and cover, at most. */
const SOLIDS = 14;
const COVERS = 12;
/** Pieces keep this far apart (beyond their radii), board px. */
const GAP = 14;
/** Sizes a piece of scenery may be painted at, board px (radius of a round thing, short side of a long one). */
const SIZE = { min: 14, max: 34 } as const;

/** Looks a place's scenery takes when the level has no solids of its own to borrow. */
const PLACE_SCENERY: Record<Place, readonly string[]> = {
  farm: ['rock', 'post', 'barrel'],
  barrens: ['pine', 'stump'],
  dunes: ['creosote', 'boulder', 'yucca'],
  savanna: ['acacia', 'rock', 'termite'],
  rainforest: [],
  reef: ['coral', 'rock'],
  mountains: ['boulder'],
  heath: ['boulder'],
  jungle: ['bamboo'],
  flooded: ['trunk'],
};

export interface SurroundPlan {
  readonly solids: readonly SolidDef[];
  readonly covers: readonly CoverDef[];
}

/** A stable number for a level id. */
export function surroundSeed(levelId: string): number {
  let h = 2166136261;
  for (let i = 0; i < levelId.length; i++) h = Math.imul(h ^ levelId.charCodeAt(i), 16777619);
  return (h >>> 0) % 1_000_000;
}

/**
 * The scenery round a level's board: solids borrowed from the level's own
 * looks (or its place's), cover from its own, scattered in the ring between
 * the border and the surround's washed-out edge, none overlapping.
 */
export function planSurround(level: Pick<LevelDef, 'id' | 'solids' | 'cover'>, place: Place): SurroundPlan {
  const rng = createRng(surroundSeed(level.id));
  const own = level.solids ?? [];
  const looks = own.length ? [...new Set(own.map((s) => s.look))] : PLACE_SCENERY[place];
  const rectLooks = new Set(own.filter((s) => s.kind === 'rect').map((s) => s.look));
  const placed: { x: number; y: number; r: number }[] = [];
  const solids: SolidDef[] = [];
  for (let i = 0; i < SOLIDS * 6 && solids.length < SOLIDS && looks.length; i++) {
    const look = looks[Math.floor(rng() * looks.length)]!;
    const r = SIZE.min + rng() * (SIZE.max - SIZE.min);
    const p = spot(rng, r * (rectLooks.has(look) ? 1.8 : 1), placed);
    if (!p) continue;
    if (rectLooks.has(look)) {
      const long = r * (2.6 + rng() * 1.4);
      const flat = rng() < 0.5;
      const [w, h] = flat ? [long, r] : [r, long];
      solids.push({ kind: 'rect', look, x: Math.round(p.x - w / 2), y: Math.round(p.y - h / 2), w: Math.round(w), h: Math.round(h) });
    } else solids.push({ kind: 'circle', look, x: Math.round(p.x), y: Math.round(p.y), r: Math.round(r) });
  }
  const coverLooks = [...new Set((level.cover ?? []).map((c) => c.look))];
  const covers: CoverDef[] = [];
  for (let i = 0; i < COVERS * 6 && covers.length < COVERS && coverLooks.length; i++) {
    const r = 26 + rng() * 26;
    const p = spot(rng, r, placed);
    if (p) covers.push({ look: coverLooks[Math.floor(rng() * coverLooks.length)]!, x: Math.round(p.x), y: Math.round(p.y), r: Math.round(r) });
  }
  return { solids, covers };
}

/** A free spot in the ring for something of radius r, or null after a few tries. */
function spot(rng: Rng, r: number, placed: { x: number; y: number; r: number }[]): { x: number; y: number } | null {
  for (let k = 0; k < 8; k++) {
    const x = -SURROUND.x + FAR + rng() * (BOARD.w + SURROUND.x * 2 - FAR * 2);
    const y = -SURROUND.y + FAR + rng() * (BOARD.h + SURROUND.y * 2 - FAR * 2);
    if (x > -CLEAR - r && x < BOARD.w + CLEAR + r && y > -CLEAR - r && y < BOARD.h + CLEAR + r) continue;
    if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + r + GAP)) continue;
    placed.push({ x, y, r });
    return { x, y };
  }
  return null;
}
