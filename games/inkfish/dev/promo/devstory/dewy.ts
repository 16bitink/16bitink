import neutral from './art/dewy/neutral.png?url';
import proud from './art/dewy/proud.png?url';
import tired from './art/dewy/tired.png?url';
import frustrated from './art/dewy/frustrated.png?url';
import moved from './art/dewy/moved.png?url';
import laughing from './art/dewy/laughing.png?url';
import kidWonder from './art/dewy/kid-wonder.png?url';
import kidTyping from './art/dewy/kid-typing.png?url';
import hurt from './art/dewy/hurt.png?url';
import mouthMeta from './art/dewy/mouth/mouths.json';
import { faceAt, type EyeKey, type MouthKey, type SpeechWord } from './lipsync';

export type { SpeechWord } from './lipsync';
const MOUTH_URLS = import.meta.glob('./art/dewy/mouth/*.png', { eager: true, query: '?url', import: 'default' });

/**
 * Dewy the fennec fox (the game's creator): painted busts, transparent PNGs.
 * Everything here is a pure function of time, so the recorder can render any frame.
 *
 *   const dewy = await loadDewy();                       // once, before the first draw
 *   drawDewy(ctx, dewy, { t, x: 540, y: 1500, width: 650, from: 'neutral', to: 'proud', changeAt: 4.2,
 *                         talking: talkAmount(t), enterAt: 0.2 });
 *
 * Lip sync (poses with a mouth set: neutral, proud, tired, frustrated, moved, laughing, hurt):
 *   drawDewy(ctx, dewy, { ..., speech: { words, envelope } });
 * `words` = Scribe word timings, `envelope` = per-frame voice loudness from envelope.py. The pose PNG stays
 * untouched; the mouth patch (and the blink patch when the mouth is shut) is pasted on it, see art/mouths.py.
 * During a crossfade the incoming pose is the one lip-synced.
 */

export const DEWY_KEYS = ['neutral', 'proud', 'tired', 'frustrated', 'moved', 'laughing', 'kid-wonder', 'kid-typing', 'hurt'] as const;
export type DewyKey = (typeof DEWY_KEYS)[number];
export type DewyImages = Readonly<Record<DewyKey, HTMLImageElement>> & { readonly patches: Readonly<Record<string, HTMLImageElement>> };
type Placement = readonly [number, number, number, number];
interface MouthMeta {
  readonly mouth: Placement;
  readonly eye: Placement | null;
  readonly size: readonly [number, number];
}
const MOUTHS = mouthMeta as unknown as Readonly<Record<string, MouthMeta>>;
/** Poses that have a mouth set. */
export const TALKING_KEYS: readonly DewyKey[] = (Object.keys(MOUTHS) as DewyKey[]).filter((k) => (DEWY_KEYS as readonly string[]).includes(k));

const URLS: Readonly<Record<DewyKey, string>> = {
  neutral, proud, tired, frustrated, moved, laughing, 'kid-wonder': kidWonder, 'kid-typing': kidTyping, hurt,
};

/** Seconds an expression takes to crossfade into the next. */
export const FADE_S = 0.15;
/** Seconds the enter-from-bottom slide takes. */
export const ENTER_S = 0.45;
const BOB_HZ = 3.4;

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Loads all nine busts and the mouth/blink patches. */
export async function loadDewy(): Promise<DewyImages> {
  const entries = await Promise.all(DEWY_KEYS.map(async (k) => [k, await loadImage(URLS[k])] as const));
  const patchEntries = await Promise.all(
    Object.entries(MOUTH_URLS).map(async ([path, url]) => [path.replace(/^.*\/|\.png$/g, ''), await loadImage(url)] as const),
  );
  return { ...Object.fromEntries(entries), patches: Object.fromEntries(patchEntries) } as DewyImages;
}

export interface DewyPose {
  /** Seconds (loop time). */
  readonly t: number;
  /** Anchor: the bottom-centre of the bust, in canvas px. */
  readonly x: number;
  readonly y: number;
  /** Drawn width in px (height follows each bust's own aspect). */
  readonly width: number;
  /** Expression before the change. */
  readonly from: DewyKey;
  /** Expression after the change (omit for a single steady expression). */
  readonly to?: DewyKey;
  /** When the crossfade from `from` to `to` starts (it takes FADE_S). */
  readonly changeAt?: number;
  /** 0..1 talking amount: 0 rests perfectly still, 1 bobs fully. */
  readonly talking?: number;
  /** Start of the enter-from-bottom slide; omit for already on screen. */
  readonly enterAt?: number;
  /** Enter slide length (default ENTER_S). */
  readonly enterS?: number;
  /** Overall opacity 0..1 (default 1). */
  readonly alpha?: number;
  /** Lip sync: word timings + per-frame voice loudness (30 fps, from envelope.py). Poses without a mouth set ignore it. */
  readonly speech?: { readonly words: readonly SpeechWord[]; readonly envelope: readonly number[]; readonly blinkSeed?: number };
}

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const easeOutBack = (u: number): number => {
  const c = 1.45;
  const v = clamp01(u) - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
};

/** The talking bob at time t, scaled by `talking`: lift (fraction of height) and squash (scale-y deviation). */
export function bobAt(t: number, talking: number): { readonly lift: number; readonly squash: number } {
  const k = clamp01(talking);
  const beat = Math.abs(Math.sin(Math.PI * BOB_HZ * t)); // 0..1, one bounce per beat
  const wobble = 0.65 + 0.35 * Math.sin(2 * Math.PI * 1.3 * t + 1.1); // so it isn't a metronome
  return { lift: 0.012 * beat * wobble * k, squash: 0.014 * (0.5 - beat) * wobble * k };
}

function drawPatch(ctx: CanvasRenderingContext2D, images: DewyImages, key: DewyKey, part: 'mouth' | 'eye', letter: MouthKey | EyeKey, k: number): void {
  const meta = MOUTHS[key];
  const place = meta?.[part];
  const patch = images.patches[`${key}-${letter === 'blink' ? 'G' : letter === 'half' ? 'H' : letter}`];
  if (!place || !patch) return;
  ctx.drawImage(patch, place[0] * k, place[1] * k, place[2] * k, place[3] * k);
}

function drawOne(ctx: CanvasRenderingContext2D, images: DewyImages, key: DewyKey, p: DewyPose, alpha: number, lift: number, squash: number, slide: number): void {
  const img = images[key];
  const w = p.width;
  const h = (img.naturalHeight / img.naturalWidth) * w;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y + slide - lift * h); // bottom-centre anchor
  ctx.scale(1 - squash * 0.5, 1 + squash); // squash around the bottom edge
  ctx.drawImage(img, -w / 2, -h, w, h);
  if (p.speech && MOUTHS[key]) {
    const face = faceAt(p.speech.words, p.speech.envelope, p.t, p.speech.blinkSeed ?? 0);
    ctx.translate(-w / 2, -h); // pose pixel space, scaled by k
    const k = w / img.naturalWidth;
    drawPatch(ctx, images, key, 'mouth', face.mouth, k);
    if (face.eyes) drawPatch(ctx, images, key, 'eye', face.eyes, k);
  }
  ctx.restore();
}

/** Draws Dewy's bust for time p.t. Safe to call every frame. */
export function drawDewy(ctx: CanvasRenderingContext2D, images: DewyImages, p: DewyPose): void {
  const total = p.alpha ?? 1;
  const { lift, squash } = bobAt(p.t, p.talking ?? 0);
  const enterS = p.enterS ?? ENTER_S;
  const hFrom = (images[p.from].naturalHeight / images[p.from].naturalWidth) * p.width;
  const slide = p.enterAt === undefined ? 0 : (1 - easeOutBack((p.t - p.enterAt) / enterS)) * hFrom * 1.1;
  if (p.enterAt !== undefined && p.t < p.enterAt) return;
  const mix = p.to !== undefined && p.changeAt !== undefined ? clamp01((p.t - p.changeAt) / FADE_S) : 0;
  if (mix >= 1 && p.to !== undefined) return drawOne(ctx, images, p.to, p, total, lift, squash, slide);
  drawOne(ctx, images, p.from, p, total, lift, squash, slide);
  if (mix > 0 && p.to !== undefined) drawOne(ctx, images, p.to, p, total * mix, lift, squash, slide);
}
