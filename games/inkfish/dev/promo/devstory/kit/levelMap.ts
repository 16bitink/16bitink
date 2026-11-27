import { LEVELS_PER_CHAPTER, ZONE_INFO } from '../../../../src/levels/zones';
import { bakeMapBackground } from '../../../../src/scenes/map/mapArt';
import { computeMapLayout, MAP, type MapLayout } from '../../../../src/scenes/map/layout';
import { HAND, type Rect } from './geom';

/**
 * The game's level map: its real layout (src/scenes/map/layout.ts, every zone,
 * ten levels each) and its real baked background (mapArt.ts's washes, sand and
 * stipple, captured from a stand-in for the Phaser scene), with the level rings
 * drawn as the map draws them (paper disc, blue ink ring, number in the hand).
 */

interface MapArt {
  readonly layout: MapLayout;
  readonly chunks: readonly { readonly x: number; readonly canvas: HTMLCanvasElement; readonly scale: number }[];
}

let art: MapArt | null = null;

/** Bakes the map once (a few 1024 px canvases). */
export function levelMapArt(): MapArt {
  if (art) return art;
  const layout = computeMapLayout(ZONE_INFO.map((info) => ({
    info, locked: false, levelIds: Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => `c${info.id}-${i + 1}`),
  })));
  const chunks: { x: number; canvas: HTMLCanvasElement; scale: number }[] = [];
  const textures = new Map<string, HTMLCanvasElement>();
  // Just enough of a Phaser scene for bakeMapBackground: it hands us its canvases.
  const scene = {
    textures: {
      exists: (k: string) => textures.has(k),
      remove: (k: string) => textures.delete(k),
      addImage: (k: string, c: HTMLCanvasElement) => textures.set(k, c),
    },
    add: {
      image: (x: number, _y: number, k: string) => {
        const img = { setOrigin: () => img, setScale: (s: number) => { chunks.push({ x, canvas: textures.get(k)!, scale: s }); return img; } };
        return img;
      },
    },
  };
  bakeMapBackground(scene as unknown as Parameters<typeof bakeMapBackground>[0], layout);
  art = { layout, chunks };
  return art;
}

export interface MapView {
  readonly t: number;
  /** World x at the view's left edge (the map is ~15,000 world px long). */
  readonly scrollX: number;
  /** Screen px per world px (default: world y 40–640, the sky to just below the first zones' rings, fits the rect). */
  readonly scale?: number;
  /** Levels (1-based) drawn as done (blue fill) and the current one (bigger ring). */
  readonly done?: number;
  readonly current?: number;
}

/** Draws the level map into `r` (call inside a clip, e.g. drawPreview's draw). Returns world→screen for placing things on it. */
export function drawLevelMap(ctx: CanvasRenderingContext2D, r: Rect, v: MapView): (wx: number, wy: number) => { x: number; y: number } {
  const { layout, chunks } = levelMapArt();
  const s = v.scale ?? r.h / 600;
  const top = 40;
  const to = (wx: number, wy: number): { x: number; y: number } => ({ x: r.x + (wx - v.scrollX) * s, y: r.y + (wy - top) * s });
  ctx.save();
  ctx.fillStyle = '#f4eddc';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Sky band above the surface, then the baked sea.
  const sky = ctx.createLinearGradient(0, r.y, 0, to(0, MAP.surfaceY).y);
  sky.addColorStop(0, 'rgba(150,190,220,0.35)');
  sky.addColorStop(1, 'rgba(200,220,232,0.15)');
  ctx.fillStyle = sky;
  ctx.fillRect(r.x, r.y, r.w, to(0, MAP.surfaceY).y - r.y);
  for (const c of chunks) {
    const p = to(c.x, 0);
    const w = c.canvas.width * c.scale * s;
    if (p.x > r.x + r.w || p.x + w < r.x) continue;
    ctx.drawImage(c.canvas, p.x, p.y, w, c.canvas.height * c.scale * s);
  }
  // Waterline.
  ctx.strokeStyle = '#1b1a1f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let sx = r.x; sx <= r.x + r.w; sx += 8) {
    const wx = v.scrollX + (sx - r.x) / s;
    const y = to(0, MAP.surfaceY + Math.sin(wx / 80) * 5).y;
    if (sx === r.x) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
  }
  ctx.stroke();
  // Level rings.
  for (const n of layout.nodes) {
    const p = to(n.x, n.y);
    if (p.x < r.x - 60 || p.x > r.x + r.w + 60) continue;
    const level = n.index + 1;
    const current = level === v.current;
    const done = level <= (v.done ?? 0);
    const rad = Math.max(current ? 36 : 30, (current ? 30 : 25) * s * 1.25);
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#dfe6f5' : '#fffaf0';
    ctx.fill();
    ctx.lineWidth = current ? 3.5 : 2.5;
    ctx.strokeStyle = '#1f3f8a';
    ctx.stroke();
    ctx.font = `700 ${rad * 1.15}px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = done ? '#1f3f8a' : '#1b1a1f';
    ctx.fillText(String(level), p.x, p.y + 2);
  }
  ctx.restore();
  return to;
}

/** World position of level `n` (1-based) on the map. */
export function levelNodeAt(n: number): { readonly x: number; readonly y: number } {
  const node = levelMapArt().layout.nodes[n - 1]!;
  return { x: node.x, y: node.y };
}
