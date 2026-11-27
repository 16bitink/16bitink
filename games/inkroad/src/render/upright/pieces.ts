import type Phaser from 'phaser';
import { buildingFallbacks, FOOTPRINTS, GARDEN_KIND, GROUND_KINDS, spriteFallbacks, spriteKeys, spritesOf, SPRITE_SCALE, VARIANTS, type SpriteName } from '../../art/manifest';
import { CELL } from '../../sim/constants';
import type { CityDef } from '../../sim/types';
import { buildAtlas, type AtlasFrame, type Piece } from '../atlas';
import { buildingPlaceholder, spritePlaceholder } from '../placeholders';
import type { Picture, Pictures } from '../pictures';
import { RISE, TILT } from '../projection';
import { ctxOf, makeCanvas } from '../tiles';

/** Every standing picture of a city in one atlas, with a cast shadow for each. */
const LEVELS = 4;
/** Where a point at height z throws its shadow, plan px per plan px of height (light from the north-west). */
const CAST = { x: 0.4, y: 0.16 } as const;
const SHADOW_SCALE = 0.6;
const SHADOW_INK = 'rgb(58,44,40)';
/** Things that float or lie flat throw no shadow. */
const NO_SHADOW: readonly SpriteName[] = ['prop/boat', 'prop/jetty', 'prop/yacht', 'prop/towel', 'prop/buoy'];
/** Drawn for a picture that is not there: nothing at all. */
const BLANK = '?';
const BLANK_PX = 2;

export interface PieceFrame {
  readonly body: AtlasFrame;
  readonly shadow: AtlasFrame | null;
  /** Where the foot is in the shadow frame, 0..1. */
  readonly shadowAt: { readonly x: number; readonly y: number };
}

interface Cast { readonly img: HTMLCanvasElement; readonly x: number; readonly y: number }

/** The picture's shape laid on the ground: each point's height becomes a step south-east. */
function castShadow(pic: Picture, depth: number): Cast {
  const w = pic.img.width / pic.scale;
  const h = pic.img.height / pic.scale;
  const roomy = Math.max(1, h - depth * TILT);
  const z = roomy / RISE;
  const k = roomy / h; // the part of the picture that is height, not footprint
  const out = { w: w + z * CAST.x, h: Math.max(4, z * CAST.y * TILT + 4) };
  const c = makeCanvas(out.w * SHADOW_SCALE, out.h * SHADOW_SCALE);
  const g = ctxOf(c);
  const shear = (CAST.x / RISE) * k;
  const drop = -(CAST.y * TILT / RISE) * k;
  // Picture space (plan px, foot at y = 0, up negative) to the ground.
  g.setTransform(SHADOW_SCALE, 0, -shear * SHADOW_SCALE, drop * SHADOW_SCALE, 0, 2 * SHADOW_SCALE);
  g.drawImage(pic.img, 0, -h, w, h);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = SHADOW_INK;
  g.fillRect(0, 0, c.width, c.height);
  return { img: c, x: w / 2 / out.w, y: 2 / out.h };
}

export class UprightAtlas {
  private readonly frames: Map<string, AtlasFrame>;
  private readonly casts = new Map<string, Cast>();
  private readonly alias = new Map<string, string>();
  private readonly noted = new Set<string>();

  constructor(textures: Phaser.Textures.TextureManager, private readonly pics: Pictures, def: CityDef) {
    const pieces: Piece[] = [];
    const add = (name: string, pic: Picture, depth: number, shadow: boolean): void => {
      pieces.push({ name, img: pic.img, scale: pic.scale });
      if (!shadow) return;
      const c = castShadow(pic, depth);
      this.casts.set(name, c);
      pieces.push({ name: `${name}#s`, img: c.img, scale: SHADOW_SCALE });
    };
    for (const name of spritesOf(def.style)) {
      spriteKeys(name).forEach((key, i) => add(key, pics.get(key, () => spritePlaceholder(name, i + 1), SPRITE_SCALE), 0, !NO_SHADOW.includes(name)));
    }
    this.buildings(def, add);
    pieces.push({ name: BLANK, img: makeCanvas(BLANK_PX, BLANK_PX), scale: 1 });
    this.frames = buildAtlas(textures, `up-${def.id}`, pieces);
  }

  /** Every kind the city has, at every level and variant; the same picture is packed once. */
  private buildings(def: CityDef, add: (name: string, pic: Picture, depth: number, shadow: boolean) => void): void {
    const kinds = new Set<string>([...def.lots.map((l) => l.kind), 'park-multi', 'park-under', ...(def.lots.some((l) => l.garden) ? [GARDEN_KIND] : [])]);
    const done = new Set<string>();
    for (const kind of kinds) {
      if (GROUND_KINDS.includes(kind)) continue;
      for (let level = 1; level <= LEVELS; level++) {
        for (let v = 0; v < (VARIANTS[kind] ?? 1); v++) {
          const keys = buildingFallbacks(def.style, kind, level, v);
          const real = keys.find((k) => this.pics.has(k));
          const use = real ?? keys[0]!;
          this.alias.set(`${kind}/${level}/${v}`, use);
          if (done.has(use)) continue;
          done.add(use);
          add(use, this.pics.painted(use) ?? buildingPlaceholder(kind, level, v), (FOOTPRINTS[kind]?.[1] ?? 2) * CELL, true);
        }
      }
    }
  }

  /** A picture by key. One that is missing is logged once and stands in for, never a crash. */
  sprite(key: string): PieceFrame {
    const real = [key, ...spriteFallbacks(key)].find((k) => this.frames.has(k)) ?? BLANK;
    if (real !== key) this.note(key, real);
    const c = this.casts.get(real);
    return { body: this.frames.get(real)!, shadow: this.frames.get(`${real}#s`) ?? null, shadowAt: c ? { x: c.x, y: c.y } : { x: 0.5, y: 0 } };
  }

  building(kind: string, level: number, variant: number): PieceFrame {
    const n = VARIANTS[kind] ?? 1;
    const name = `${kind}/${Math.max(1, level)}/${variant % n}`;
    return this.sprite(this.alias.get(name) ?? name);
  }

  private note(key: string, used: string): void {
    if (this.noted.has(key)) return;
    this.noted.add(key);
    console.warn(`[inkroad] no picture ${key}, using ${used === BLANK ? 'nothing' : used}`);
  }
}
