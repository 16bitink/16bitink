/// <reference types="vite/client" />
import { filesFor } from './sets';

/**
 * Every picture the game may show, by key. A file is src/art/img/<key with "/"
 * as "-">.webp (or .png); a key with no file gets a placeholder drawn by
 * src/render/placeholders.ts, so the game always runs. Pictures are 2x: image
 * px / 2 = plan px (vehicles 8x).
 */
const FILES = import.meta.glob('./img/*.{webp,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const NAME = /\/([^/]+)\.(?:webp|png)$/;

/** File name (no extension) to URL. */
const URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [NAME.exec(path)?.[1] ?? path, url]),
);

export const artUrl = (key: string): string | undefined => URLS[key.replaceAll('/', '-')];
export const hasArt = (key: string): boolean => artUrl(key) !== undefined;

// ---------------------------------------------------------------- scales

/** Image px per plan px. */
export const ART_SCALE = 2;
/** Trees, rocks and props are painted at 4x. */
export const SPRITE_SCALE = 4;
export const VEHICLE_SCALE = 8;

// ---------------------------------------------------------------- seamless textures (512 x 512, plan view)

export const TEXTURES = ['sand', 'grass', 'water', 'deep', 'asphalt', 'concrete', 'paving', 'buslane', 'rock', 'plaza', 'works', 'cobble', 'beach', 'shallow'] as const;
export type TextureName = (typeof TEXTURES)[number];
export const TEXTURE_SIZE = 512;

/** A city's own textures: `tex/<style>-<name>`, some under another name; else the plain `tex/<name>`. */
const TEXTURE_ALIAS: Readonly<Record<string, Readonly<Partial<Record<TextureName, string>>>>> = { oldtown: { sand: 'ground' } };
/** What a set without its own uses instead. */
const TEXTURE_STAND_IN: Readonly<Partial<Record<TextureName, TextureName>>> = { cobble: 'plaza', beach: 'sand', shallow: 'water', deep: 'water' };
export const textureKeys = (style: string, name: TextureName): readonly string[] => {
  const own = `tex/${style}-${TEXTURE_ALIAS[style]?.[name] ?? name}`;
  const other = TEXTURE_STAND_IN[name];
  return other ? [own, `tex/${style}-${other}`, `tex/${name}`, `tex/${other}`] : [own, `tex/${name}`];
};

// ---------------------------------------------------------------- upright sprites (anchor: bottom centre, 4x)

/** `skip`: variants that are painted but not planted (a red tree reads as a jam). */
export interface SpriteSpec { readonly w: number; readonly h: number; readonly n: number; readonly skip?: readonly number[] }
/** Size in image px (about; the file's own size wins) and how many variants (keys `<name>-1`..`-n`; n = 0: just `<name>`). */
export const SPRITES = {
  'tree/palm': { w: 100, h: 118, n: 4 }, 'tree/palm-tall': { w: 90, h: 142, n: 2 }, 'tree/round': { w: 120, h: 102, n: 3 },
  'tree/shrub': { w: 62, h: 49, n: 4 }, 'tree/rock': { w: 70, h: 56, n: 4 },
  'tree/oldtown': { w: 110, h: 130, n: 8 }, 'tree/oldtown-shrub': { w: 80, h: 55, n: 3 }, 'tree/oldtown-rock': { w: 107, h: 52, n: 1 },
  'tree/islands': { w: 140, h: 130, n: 8 }, 'tree/islands-shrub': { w: 92, h: 75, n: 2 }, 'tree/islands-rock': { w: 120, h: 80, n: 2 },
  'tree/hills': { w: 120, h: 130, n: 8 }, 'tree/hills-shrub': { w: 74, h: 56, n: 2 }, 'tree/hills-rock': { w: 92, h: 60, n: 2 },
  'tree/rivers': { w: 124, h: 130, n: 8, skip: [2, 5] }, 'tree/rivers-shrub': { w: 77, h: 51, n: 2, skip: [1] }, 'tree/rivers-rock': { w: 92, h: 60, n: 2 },
  'prop/lamp': { w: 20, h: 86, n: 0 }, 'prop/cone': { w: 14, h: 20, n: 0 }, 'prop/barrier': { w: 56, h: 23, n: 0 },
  'prop/bus-stop': { w: 72, h: 62, n: 0 }, 'prop/metro': { w: 88, h: 88, n: 0 }, 'prop/jetty': { w: 120, h: 72, n: 0 },
  'prop/boat': { w: 110, h: 64, n: 2 }, 'prop/toll': { w: 28, h: 100, n: 0 }, 'prop/pier': { w: 54, h: 104, n: 0 },
  'prop/signal': { w: 24, h: 56, n: 0 }, 'prop/warning': { w: 29, h: 56, n: 0 }, 'prop/crane': { w: 150, h: 150, n: 0 },
  'prop/digger': { w: 86, h: 64, n: 0 }, 'prop/kiosk': { w: 84, h: 64, n: 0 }, 'prop/sunshade': { w: 56, h: 61, n: 0 }, 'prop/yacht': { w: 200, h: 74, n: 0 },
  'prop/umbrella': { w: 56, h: 60, n: 3 }, 'prop/towel': { w: 29, h: 44, n: 2 }, 'prop/lounger': { w: 25, h: 44, n: 0 }, 'prop/lifeguard': { w: 62, h: 84, n: 0 },
  'prop/beach-fence': { w: 84, h: 28, n: 0 }, 'prop/beach-kiosk': { w: 84, h: 69, n: 0 }, 'prop/surf-rack': { w: 60, h: 44, n: 0 }, 'prop/buoy': { w: 23, h: 44, n: 0 },
  'prop/fuel-sign': { w: 30, h: 96, n: 0 },
} as const satisfies Record<string, SpriteSpec>;
export type SpriteName = keyof typeof SPRITES;

/** What grows in each city. */
export interface Greens { readonly tall: readonly SpriteName[]; readonly round: readonly SpriteName[]; readonly shrub: SpriteName; readonly rock: SpriteName; readonly beach: boolean }
const own = (style: 'oldtown' | 'islands' | 'hills' | 'rivers', beach: boolean): Greens => ({
  tall: [`tree/${style}`], round: [`tree/${style}`], shrub: `tree/${style}-shrub`, rock: `tree/${style}-rock`, beach,
});
const GREENS: Readonly<Record<string, Greens>> = {
  gulf: { tall: ['tree/palm', 'tree/palm', 'tree/palm-tall'], round: ['tree/round'], shrub: 'tree/shrub', rock: 'tree/rock', beach: true },
  oldtown: own('oldtown', false), islands: own('islands', true), hills: own('hills', false), rivers: own('rivers', false),
};
export const greensOf = (style: string): Greens => GREENS[style] ?? GREENS.gulf!;
export const spriteKeys = (name: SpriteName): string[] => {
  const { n, skip = [] }: SpriteSpec = SPRITES[name];
  return n === 0 ? [name] : Array.from({ length: n }, (_, i) => i + 1).filter((i) => !skip.includes(i)).map((i) => `${name}-${i}`);
};

const SPRITE_NAMES = Object.keys(SPRITES) as SpriteName[];
/** Every sprite a city of this style may show: its greens and all the props. */
export function spritesOf(style: string): SpriteName[] {
  const g = greensOf(style);
  return [...new Set<SpriteName>([...g.tall, ...g.round, g.shrub, g.rock, ...SPRITE_NAMES.filter((n) => n.startsWith('prop/'))])];
}
/** What may stand in for a sprite that is not there: its other variants, then the plain name. */
export function spriteFallbacks(key: string): string[] {
  const plain = key.replace(/-\d+$/, '');
  const name = SPRITE_NAMES.find((n) => n === plain);
  return [...(name ? spriteKeys(name) : []), plain].filter((k) => k !== key);
}

// ---------------------------------------------------------------- flat pictures (plan view, anchor: centre, 2x)

export const FLATS = {
  'flat/island': { w: 256, h: 256 },
  'flat/island-small': { w: 128, h: 128 },
  'flat/carpark-lot': { w: 240, h: 160 },
  'flat/carpark-ride': { w: 320, h: 240 },
} as const;
export type FlatName = keyof typeof FLATS;

// ---------------------------------------------------------------- vehicles (straight from above, nose right, 8x)

export const VEHICLE_PICTURES = {
  car: { w: 112, h: 58, n: 5 }, taxi: { w: 112, h: 56, n: 0 }, van: { w: 136, h: 67, n: 0 }, truck: { w: 232, h: 114, n: 0 },
  bus: { w: 272, h: 102, n: 0 }, tram: { w: 440, h: 155, n: 0 }, tow: { w: 152, h: 65, n: 0 }, school: { w: 240, h: 94, n: 0 },
  police: { w: 112, h: 57, n: 0 },
} as const;

// ---------------------------------------------------------------- buildings (anchor: bottom centre of the footprint's south edge, 2x)

/** Footprints in cells. home, shops and office fill a lot with 2 x 2 plots; the rest are one picture. */
export const FOOTPRINTS: Readonly<Record<string, readonly [number, number]>> = {
  home: [2, 2], shops: [2, 2], office: [2, 2],
  market: [4, 3], school: [4, 3], hospital: [4, 3], landmark: [4, 3],
  nursery: [2, 2], fuel: [2, 2], food: [2, 2], fun: [3, 2],
  mall: [6, 4], stadium: [6, 5], port: [6, 3], fair: [6, 5], 'park-multi': [2, 2], 'park-under': [2, 2],
};
/** Kinds that repeat their picture over the lot. */
export const PLOT_KINDS: readonly string[] = ['home', 'shops', 'office', 'food'];
/** Kinds with no building: painted ground. */
export const GROUND_KINDS: readonly string[] = ['park', 'square'];

export const VARIANTS: Readonly<Record<string, number>> = { home: 4, shops: 2, office: 2, food: 2 };
const FALLBACK_STYLE = 'gulf';

export const buildingKey = (style: string, kind: string, level: number, variant: number): string => `b/${style}/${kind}${level}-${variant}`;

/** The keys to try for a building, best first: lower variants, lower levels, then the gulf set. */
export function buildingFallbacks(style: string, kind: string, level: number, variant: number): string[] {
  const out: string[] = [];
  for (const s of style === FALLBACK_STYLE ? [style] : [style, FALLBACK_STYLE]) {
    for (let l = level; l >= 1; l--) {
      out.push(buildingKey(s, kind, l, variant));
      if (variant !== 0) out.push(buildingKey(s, kind, l, 0));
    }
  }
  return out;
}

/** The image files a city of this style needs, for the loader: what all share, and its own set. */
export function artFiles(style: string): readonly (readonly [name: string, url: string])[] {
  return filesFor(style, Object.keys(URLS), [...Object.keys(VEHICLE_PICTURES), 'boat']).map((n) => [n, URLS[n]!] as const);
}
