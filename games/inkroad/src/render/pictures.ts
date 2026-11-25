import { artFiles, ART_SCALE, textureKeys, type TextureName } from '../art/manifest';
import { ctxOf, makeCanvas, washTile } from './tiles';

/**
 * The one place the view asks for a picture: the painted file when the
 * manifest has it, else a placeholder drawn once. Nothing else loads images.
 */
export type Img = HTMLImageElement | HTMLCanvasElement;
export interface Picture { readonly img: Img; /** Image px per plan px. */ readonly scale: number }

const LOAD_TIMEOUT_MS = 20_000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error(`timed out: ${url}`)), LOAD_TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error(`did not load: ${url}`)); };
    img.src = url;
  });
}

export class Pictures {
  /** The city's art set ('gulf', 'oldtown'): set it before asking for textures. */
  style = 'gulf';
  private readonly made = new Map<string, Picture>();
  private readonly tones = new Map<string, HTMLCanvasElement>();

  private constructor(private readonly files: Map<string, HTMLImageElement>) {}

  static async load(style: string, onProgress?: (f: number) => void): Promise<Pictures> {
    const pics = new Pictures(new Map());
    await pics.add(style, onProgress);
    return pics;
  }

  /** Load what a city of this style needs and is not here yet, then use its set. */
  async add(style: string, onProgress?: (f: number) => void): Promise<void> {
    const missing = artFiles(style).filter(([name]) => !this.files.has(name));
    let done = 0;
    await Promise.all(missing.map(async ([name, url]) => {
      try {
        this.files.set(name, await loadImage(url));
      } catch (e) {
        console.warn('[inkroad] a picture is missing, using its placeholder:', name, e);
      }
      onProgress?.(++done / missing.length);
    }));
    this.style = style;
    this.tones.clear();
  }

  has(key: string): boolean {
    return this.files.has(key.replaceAll('/', '-'));
  }

  /** The painted picture, if there is one. */
  painted(key: string, scale: number = ART_SCALE): Picture | null {
    const img = this.files.get(key.replaceAll('/', '-'));
    return img ? { img, scale } : null;
  }

  /** The painted picture or the placeholder `draw` makes (kept). */
  get(key: string, draw: () => Picture, scale: number = ART_SCALE): Picture {
    const real = this.painted(key, scale);
    if (real) return real;
    const old = this.made.get(key);
    if (old) return old;
    const pic = draw();
    this.made.set(key, pic);
    return pic;
  }

  /** A ground texture in the city's own style. */
  texture(name: TextureName): Img {
    for (const key of textureKeys(this.style, name)) {
      const real = this.painted(key);
      if (real) return real.img;
    }
    return this.get(`tex/${name}`, () => ({ img: washTile(name), scale: ART_SCALE })).img;
  }

  /** A ground texture calmed down: `keep` 0..1 of its contrast, round its own mean colour, then washed with `tint`. */
  calm(name: TextureName, keep: number, tint: string | null = null, tintAlpha = 0): Img {
    if (keep >= 1 && !tint) return this.texture(name);
    const key = `${this.style}/${name}/${keep}/${tint}/${tintAlpha}`;
    const old = this.tones.get(key);
    if (old) return old;
    const c = calmed(this.texture(name), keep, tint, tintAlpha);
    this.tones.set(key, c);
    return c;
  }
}

/** The picture pulled towards its own mean colour. */
function calmed(img: Img, keep: number, tint: string | null, tintAlpha: number): HTMLCanvasElement {
  const c = makeCanvas(img.width, img.height);
  const g = ctxOf(c);
  g.drawImage(img, 0, 0, c.width, c.height);
  const one = makeCanvas(1, 1);
  const o = ctxOf(one);
  o.imageSmoothingQuality = 'high';
  o.drawImage(shrunk(c), 0, 0, 1, 1);
  const [r = 0, gr = 0, b = 0] = o.getImageData(0, 0, 1, 1).data;
  g.globalAlpha = 1 - keep;
  g.fillStyle = `rgb(${r},${gr},${b})`;
  g.fillRect(0, 0, c.width, c.height);
  if (tint) {
    g.globalAlpha = tintAlpha;
    g.fillStyle = tint;
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

/** Halved until small, so one pixel of it is a true mean. */
function shrunk(img: HTMLCanvasElement): HTMLCanvasElement {
  let cur = img;
  while (cur.width > 4) {
    const half = makeCanvas(cur.width / 2, cur.height / 2);
    ctxOf(half).drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
  }
  return cur;
}
