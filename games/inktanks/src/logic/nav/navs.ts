import { GROUNDS, type Land, type StructureDef } from '../land';
import { FlowCache } from './flow';
import { block, buildNav, fence, regrade, unblock, type NavGrid } from './grid';

export interface NavPair {
  readonly nav: NavGrid;
  readonly flow: FlowCache;
}

/**
 * A level's navigation, per kind of drive (chapter 3): the ground grid every
 * chapter 1–2 tank uses (deep water closed), and a Hover grid (deep water
 * open) built the first time a Hover tank asks, so levels without Hover
 * never pay for it. Breaking a structure or flooding ground updates both.
 */
export class Navs {
  readonly ground: NavPair;
  private hover: NavPair | null = null;
  private heavy: NavPair | null = null;
  /** Whether the land has thin ice (chapter 4): only then do Heavy hulls get a grid of their own. */
  private readonly thinIce: boolean;
  /** The grid of drives that can't crush fences, built the first time one asks on a land with fences. */
  private fenced: NavPair | null = null;
  private readonly fences: boolean;

  constructor(private readonly land: Land) {
    const nav = buildNav(land);
    this.ground = { nav, flow: new FlowCache(nav, undefined, land) };
    const thin = GROUNDS.indexOf('thinIce');
    this.thinIce = land.ground.includes(thin);
    this.fences = land.structures.some(fence);
  }

  /**
   * The grid for a drive: Hover's when it floats; a Heavy hull's (thin ice closed) on a land with
   * thin ice; `fenced` (it can't crush fences: not Tracks, not a Heavy hull) the ground grid with
   * fences made dear, on a land that has fences.
   */
  for(floats: boolean, heavy = false, fenced = false): NavPair {
    if (floats) {
      this.hover ??= pair(buildNav(this.land, true));
      return this.hover;
    }
    if (heavy && this.thinIce) {
      this.heavy ??= pair(buildNav(this.land, false, true), this.land);
      return this.heavy;
    }
    if (!fenced || !this.fences) return this.ground;
    this.fenced ??= pair(buildNav(this.land, false, false, true), this.land);
    return this.fenced;
  }

  private all(): NavGrid[] {
    return [this.ground.nav, this.hover?.nav, this.heavy?.nav, this.fenced?.nav].filter((n): n is NavGrid => n !== undefined);
  }

  unblock(id: string): void {
    for (const n of this.all()) unblock(n, this.land, id);
  }

  /** A structure appeared (an avalanche's drifts): its cells close in every grid. `soft`: a blaze, its cells only grow dear. */
  block(s: StructureDef, soft = false): void {
    for (const n of this.all()) block(n, s, soft);
  }

  regrade(cells: readonly number[]): void {
    for (const n of this.all()) regrade(n, this.land, cells);
  }
}

const pair = (nav: NavGrid, land?: Land): NavPair => ({ nav, flow: new FlowCache(nav, undefined, land) });
