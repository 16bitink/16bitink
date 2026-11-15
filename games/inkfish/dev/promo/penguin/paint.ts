import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { add, type Camera, dot, NEAR, norm, project, type Projected, scale, sub, v3, type V3 } from './geo';
import { type EyeSpot, type Paint, type RGB, type Spine, SPINE, type Surf } from './model';

/**
 * Paints the penguin model through a camera, like the painted animals in
 * ../foodchain/art/: every surface is laid in as a wash of small quads, each
 * lit for where it faces (key light, sky from above, a cool fill), so the
 * colour follows the body round with the countershading built in; black
 * feathers take broken pale sheen strokes, white ones cool shade strokes; the
 * mouth glistens and darkens towards the throat. Parts are drawn back to
 * front into a layer and laid down with a firm ink outline and a soft blur, so
 * the silhouette is inked but no seams show between body, neck and head.
 */

export interface Light {
  /** Towards the key light, world. */
  readonly dir: V3;
  /** Key, ambient and sky (from above) colours, 0 .. 1 per channel. */
  readonly key: readonly [number, number, number];
  readonly amb: readonly [number, number, number];
  readonly sky: readonly [number, number, number];
  /** A light from the camera itself into the mouth, 0 .. 1. */
  readonly flash: number;
  /** How dark the mouth gets towards the throat, 0 .. 1. */
  readonly deep: number;
  /** A rim of light round the silhouette (from behind), colour 0 .. 1 per channel. */
  readonly rim?: readonly [number, number, number];
}

const clamp255 = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
export const css = (c: RGB, a = 1): string => (a >= 1 ? `rgb(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])})` : `rgba(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])},${a.toFixed(3)})`);

/** The colour of a surface facing `n` (unit, world) seen from `view` (unit, towards the camera). */
export function shade(p: Paint, n: V3, view: V3, light: Light, depth = 1): RGB {
  const ndl = dot(n, light.dir);
  const diff = Math.max(0, (ndl + 0.2) / 1.2);
  const skyK = 0.5 + 0.5 * n.y;
  const flash = light.flash * Math.max(0, dot(n, view));
  const occ = 1 - light.deep * Math.pow(1 - depth, 1.4);
  const h = norm(add(light.dir, view));
  const spec = Math.pow(Math.max(0, dot(n, h)), 9) * p.gloss * 0.42;
  const wet = (p.wet ?? 0) * (Math.pow(Math.max(0, dot(n, h)), 70) * 0.9 + Math.pow(Math.max(0, dot(n, view)), 40) * 0.35 * light.flash);
  const edge = Math.pow(1 - Math.max(0, dot(n, view)), 3) * (0.4 + 0.6 * Math.max(0, n.y + 0.3));
  const out = [0, 1, 2].map((i) => {
    const base = p.rgb[i]! / 255;
    const lit = light.amb[i]! + light.key[i]! * diff + light.sky[i]! * skyK + flash;
    const rim = (light.rim?.[i] ?? 0) * edge * (0.35 + 0.65 * p.gloss);
    return 255 * (occ * (base * lit + (spec + wet) * light.key[i]! + rim) + (1 - occ) * 0.012);
  });
  return [out[0]!, out[1]!, out[2]!];
}

// ---------------------------------------------------------------- surfaces

/** One thing to paint, at its distance from the camera: everything is painted far to near. */
export interface Item {
  readonly depth: number;
  draw(ctx: CanvasRenderingContext2D): void;
}

const SHEEN: RGB = [168, 192, 222];
const DEEP: RGB = [6, 9, 16];
const COOL: RGB = [112, 130, 156];

interface Stroke { readonly a: Projected; readonly b: Projected; readonly c: Projected; readonly colour: string; readonly w: number }
interface Edge { readonly a: Projected; readonly b: Projected }

/** Every visible quad of the surfaces, with its brush strokes and its inked edges (silhouette and borders). */
export function surfaceItems(cam: Camera, surfs: readonly Surf[], light: Light, boil: number): Item[] {
  const items: Item[] = [];
  for (const s of surfs) {
    const rng = createRng(4099 + boil * 131 + s.name.length * 17 + s.nu);
    const cols = s.nv + 1;
    const world: V3[] = [];
    const scr: Projected[] = [];
    for (let i = 0; i <= s.nu; i++) {
      for (let j = 0; j <= s.nv; j++) {
        const p = s.at(i / s.nu, j / s.nv);
        world.push(p);
        scr.push(project(cam, p));
      }
    }
    // Which quads face the camera (and aren't cut away).
    const facing: boolean[] = [];
    const normals: V3[] = [];
    for (let i = 0; i < s.nu; i++) {
      for (let j = 0; j < s.nv; j++) {
        const k = i * cols + j;
        const [a, b, c, d] = [world[k]!, world[k + cols]!, world[k + cols + 1]!, world[k + 1]!];
        const n = scale(norm(crossOf(sub(c, a), sub(d, b))), s.sign);
        const mid = scale(add(add(a, b), add(c, d)), 0.25);
        const ok = dot(n, norm(sub(cam.eye, mid))) > 0.004 && !s.skip?.((i + 0.5) / s.nu, (j + 0.5) / s.nv);
        facing.push(ok);
        normals.push(n);
      }
    }
    // Each vertex shaded with its own smooth normal, so the washes run without steps.
    const vcol: (RGB | null)[] = new Array(world.length).fill(null);
    const vmark: number[] = new Array(world.length).fill(0);
    const vlit: number[] = new Array(world.length).fill(0);
    const vertexColour = (i: number, j: number): RGB => {
      const k = i * cols + j;
      const have = vcol[k];
      if (have) return have;
      const at = (ii: number, jj: number): V3 => {
        let j2 = jj;
        if (s.wrapV) j2 = ((jj % s.nv) + s.nv) % s.nv;
        return world[Math.max(0, Math.min(s.nu, ii)) * cols + Math.max(0, Math.min(s.nv, j2))]!;
      };
      let n = crossOf(sub(at(i + 1, j), at(i - 1, j)), sub(at(i, j + 1), at(i, j - 1)));
      const l = Math.hypot(n.x, n.y, n.z);
      n = l > 1e-6 ? scale(n, s.sign / l) : normals[Math.min(s.nu - 1, i) * s.nv + Math.min(s.nv - 1, j)]!;
      const p = world[k]!;
      const u = i / s.nu;
      const v = j / s.nv;
      const pv = s.paint(u, v);
      vmark[k] = (pv.rgb[0] + pv.rgb[1] + pv.rgb[2]) / 765;
      vlit[k] = Math.max(0, dot(n, light.dir));
      const c = shade(pv, n, norm(sub(cam.eye, p)), light, s.depth ? s.depth(u, v) : 1);
      vcol[k] = c;
      return c;
    };
    const faces = (i: number, j: number): boolean | null => {
      if (s.wrapV) j = (j + s.nv) % s.nv;
      if (i < 0 || i >= s.nu || j < 0 || j >= s.nv) return null;
      return facing[i * s.nv + j]!;
    };
    for (let i = 0; i < s.nu; i++) {
      for (let j = 0; j < s.nv; j++) {
        if (!facing[i * s.nv + j]) continue;
        const k = i * cols + j;
        const [sa, sb, sc, sd] = [scr[k]!, scr[k + cols]!, scr[k + cols + 1]!, scr[k + 1]!];
        if (sa.z < NEAR || sb.z < NEAR || sc.z < NEAR || sd.z < NEAR) continue;
        const [a, b, c, d] = [world[k]!, world[k + cols]!, world[k + cols + 1]!, world[k + 1]!];
        const n = normals[i * s.nv + j]!;
        const mid = scale(add(add(a, b), add(c, d)), 0.25);
        const view = norm(sub(cam.eye, mid));
        const u = (i + 0.5) / s.nu;
        const v = (j + 0.5) / s.nv;
        const paint = s.paint(u, v);
        // A little unevenness, like a wash laid by hand.
        const wob = 1 + (rng() - 0.5) * 0.05;
        const [ca, cb, cc, cd] = [vertexColour(i, j), vertexColour(i + 1, j), vertexColour(i + 1, j + 1), vertexColour(i, j + 1)];
        // The pen: a line along the edge of a marking (where the paint's lightness crosses markEdge)...
        const pen: { a: Projected; b: Projected; w: number; alpha: number }[] = [];
        if (s.markEdge !== undefined) {
          const corners = [[k, sa], [k + cols, sb], [k + cols + 1, sc], [k + 1, sd]] as const;
          const hits: Projected[] = [];
          for (let e = 0; e < 4; e++) {
            const [k0, p0] = corners[e]!;
            const [k1, p1] = corners[(e + 1) % 4]!;
            const m0 = vmark[k0]! - s.markEdge;
            const m1 = vmark[k1]! - s.markEdge;
            if (m0 * m1 < 0) hits.push(mixP(p0, p1, m0 / (m0 - m1)));
          }
          if (hits.length >= 2) pen.push({ a: hits[0]!, b: hits[1]!, w: 1.7, alpha: 0.7 });
        }
        // ...and hatching in the shade of the light parts (white feathers, the bill).
        const meanMark = (vmark[k]! + vmark[k + cols]! + vmark[k + cols + 1]! + vmark[k + 1]!) / 4;
        const meanLit = (vlit[k]! + vlit[k + cols]! + vlit[k + cols + 1]! + vlit[k + 1]!) / 4;
        if (s.group !== 'mouth' && meanMark > 0.3 && meanLit < 0.32 && rng() < 0.55) {
          const c = mixP(mixP(sa, sc, 0.5), mixP(sb, sd, 0.5), 0.5);
          const size = Math.min(26, 0.75 * Math.max(Math.hypot(sc.x - sa.x, sc.y - sa.y), Math.hypot(sd.x - sb.x, sd.y - sb.y)));
          const dir = { x: 0.8, y: -0.6 };
          const off = { x: 0.6 * size * 0.35, y: 0.8 * size * 0.35 };
          for (const o of [-0.5, 0.5]) {
            const ox = c.x + off.x * o * 2;
            const oy = c.y + off.y * o * 2;
            pen.push({ a: { x: ox - dir.x * size / 2, y: oy - dir.y * size / 2, z: 0 }, b: { x: ox + dir.x * size / 2, y: oy + dir.y * size / 2, z: 0 }, w: 1.1, alpha: 0.16 + 0.5 * (0.32 - meanLit) });
          }
        }
        // The wash across the quad: an affine fit to its four corner colours, laid as one gradient along its steepest way.
        const fit = fitGradient([sa, sb, sc, sd], [ca, cb, cc, cd], wob);
        const depth = (sa.z + sb.z + sc.z + sd.z) / 4;
        const pts = [sa, sb, sc, sd];
        const strokes: Stroke[] = [];
        if (s.feathers && meanMark < 0.4 && rng() < 0.5) {
          const dark = paint.rgb[0] < 120;
          const lit = Math.max(0, dot(n, light.dir));
          const hl = Math.pow(Math.max(0, dot(n, norm(add(light.dir, view)))), 5);
          const at = (p: number, q: number): Projected => mixP(mixP(sa, sb, p), mixP(sd, sc, p), q);
          const p0 = rng();
          const q0 = rng() * 0.5;
          const len = 0.8 + 1.6 * rng();
          const w = Math.max(0.8, Math.min(2.6, Math.hypot(sd.x - sa.x, sd.y - sa.y) * 0.16));
          if (dark && hl + lit * 0.4 > 0.12) {
            strokes.push({ a: at(p0, q0), b: at(p0 + 0.15, q0 + len * 0.5), c: at(p0, q0 + len), colour: css(SHEEN, Math.min(0.55, 0.08 + 0.55 * hl + 0.15 * lit)), w });
          } else if (lit < 0.35) {
            strokes.push({ a: at(p0, q0), b: at(p0 + 0.1, q0 + len * 0.5), c: at(p0 + 0.2, q0 + len), colour: css(dark ? DEEP : COOL, dark ? 0.35 : 0.1 + 0.3 * (0.35 - lit)), w: w * 0.9 });
          }
        }
        const edges: Edge[] = [];
        if (s.ink) {
          const side = (ni: number, nj: number, p: Projected, q: Projected): void => {
            const f = faces(ni, nj);
            if (f === false || (f === null && s.ink!.borders)) edges.push({ a: p, b: q });
          };
          side(i - 1, j, sa, sd);
          side(i + 1, j, sb, sc);
          side(i, j - 1, sa, sb);
          side(i, j + 1, sd, sc);
        }
        const ink = s.ink;
        const jit = (): number => (rng() - 0.5) * 1.1;
        const shake = edges.map((e) => ({ ax: e.a.x + jit(), ay: e.a.y + jit(), bx: e.b.x + jit(), by: e.b.y + jit() }));
        items.push({
          depth,
          draw(ctx) {
            ctx.beginPath();
            ctx.moveTo(pts[0]!.x, pts[0]!.y);
            for (let q = 1; q < 4; q++) ctx.lineTo(pts[q]!.x, pts[q]!.y);
            ctx.closePath();
            const fill = ctx.createLinearGradient(fit.p0.x, fit.p0.y, fit.p1.x, fit.p1.y);
            fill.addColorStop(0, css(fit.c0));
            fill.addColorStop(1, css(fit.c1));
            ctx.fillStyle = fill;
            ctx.strokeStyle = fill;
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
            for (const st of strokes) {
              ctx.strokeStyle = st.colour;
              ctx.lineWidth = st.w;
              ctx.beginPath();
              ctx.moveTo(st.a.x, st.a.y);
              ctx.quadraticCurveTo(st.b.x, st.b.y, st.c.x, st.c.y);
              ctx.stroke();
            }
            for (const pn of pen) {
              ctx.strokeStyle = INK;
              ctx.globalAlpha = pn.alpha;
              ctx.lineWidth = pn.w;
              ctx.beginPath();
              ctx.moveTo(pn.a.x, pn.a.y);
              ctx.lineTo(pn.b.x, pn.b.y);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
            if (ink && shake.length) {
              ctx.strokeStyle = INK;
              ctx.globalAlpha = ink.alpha;
              ctx.lineWidth = ink.width;
              ctx.beginPath();
              for (const e of shake) {
                ctx.moveTo(e.ax, e.ay);
                ctx.lineTo(e.bx, e.by);
              }
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          },
        });
      }
    }
  }
  return items;
}

/**
 * A least-squares affine fit of colour over a quad's four screen corners,
 * as a two-stop gradient along the way its brightness changes most, so
 * neighbouring quads blend without stripes.
 */
function fitGradient(pts: readonly Projected[], cols: readonly RGB[], k: number): { p0: { x: number; y: number }; p1: { x: number; y: number }; c0: RGB; c1: RGB } {
  const mx = (pts[0]!.x + pts[1]!.x + pts[2]!.x + pts[3]!.x) / 4;
  const my = (pts[0]!.y + pts[1]!.y + pts[2]!.y + pts[3]!.y) / 4;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of pts) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  const det = sxx * syy - sxy * sxy;
  const mean = [0, 1, 2].map((c) => (k * (cols[0]![c]! + cols[1]![c]! + cols[2]![c]! + cols[3]![c]!)) / 4);
  const flat: RGB = [mean[0]!, mean[1]!, mean[2]!];
  if (Math.abs(det) < 1e-6) return { p0: { x: mx, y: my }, p1: { x: mx + 1, y: my }, c0: flat, c1: flat };
  const slope = [0, 1, 2].map((c) => {
    let sxv = 0;
    let syv = 0;
    pts.forEach((p, i) => {
      const v = k * cols[i]![c]!;
      sxv += (p.x - mx) * v;
      syv += (p.y - my) * v;
    });
    return { b: (sxv * syy - syv * sxy) / det, c: (syv * sxx - sxv * sxy) / det };
  });
  const gx = slope[0]!.b * 0.3 + slope[1]!.b * 0.59 + slope[2]!.b * 0.11;
  const gy = slope[0]!.c * 0.3 + slope[1]!.c * 0.59 + slope[2]!.c * 0.11;
  const gl = Math.hypot(gx, gy);
  const dir = gl > 1e-9 ? { x: gx / gl, y: gy / gl } : { x: 1, y: 0 };
  const reach = Math.max(1, ...pts.map((p) => Math.abs((p.x - mx) * dir.x + (p.y - my) * dir.y)));
  const at = (t: number): RGB => {
    const ch = (c: number): number => mean[c]! + t * (slope[c]!.b * dir.x + slope[c]!.c * dir.y);
    return [ch(0), ch(1), ch(2)];
  };
  return { p0: { x: mx - dir.x * reach, y: my - dir.y * reach }, p1: { x: mx + dir.x * reach, y: my + dir.y * reach }, c0: at(-reach), c1: at(reach) };
}

const crossOf = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const mixP = (a: Projected, b: Projected, u: number): Projected => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u });

/** Paints items far to near. */
export function paintItems(ctx: CanvasRenderingContext2D, items: readonly Item[]): void {
  const sorted = [...items].sort((p, q) => q.depth - p.depth);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const it of sorted) it.draw(ctx);
  ctx.restore();
}

/** Lays a painted layer down, softened a touch so the washes run together. */
export function layDown(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, soft = 1.1): void {
  ctx.save();
  ctx.filter = `blur(${soft}px)`;
  ctx.drawImage(layer, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 0.3;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- the eye

/** A dark, wet eye with a white ring and a catchlight; `shut` closes the lid. */
export function eyeItem(cam: Camera, e: EyeSpot, shut: number, glint = 1): Item | null {
  if (dot(e.n, norm(sub(cam.eye, e.c))) < 0.08) return null;
  const c = project(cam, e.c);
  if (c.z < NEAR) return null;
  return { depth: c.z - 1.2, draw: (ctx) => drawEye(ctx, cam, e, c, shut, glint) };
}

function drawEye(ctx: CanvasRenderingContext2D, cam: Camera, e: EyeSpot, c: Projected, shut: number, glint: number): void {
  const pa = project(cam, add(e.c, e.a));
  const pb = project(cam, add(e.c, e.b));
  const A = { x: pa.x - c.x, y: pa.y - c.y };
  const B = { x: pb.x - c.x, y: pb.y - c.y };
  ctx.save();
  ctx.transform(A.x, A.y, -B.x, -B.y, c.x, c.y);
  const unit = 1 / Math.max(1, Math.hypot(A.x, A.y));
  // The white eye-ring, a little open at the back where the bonnet takes over.
  ctx.fillStyle = '#f3efe4';
  ctx.beginPath();
  ctx.ellipse(-0.05, 0.05, 1.42, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // The eye: dark brown iris, black pupil, wet.
  const g = ctx.createRadialGradient(-0.2, 0.25, 0.05, 0, 0, 1);
  g.addColorStop(0, '#5a3524');
  g.addColorStop(0.55, '#2c170f');
  g.addColorStop(1, '#0b0604');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1, 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#050303';
  ctx.beginPath();
  ctx.ellipse(0.03, -0.02, 0.5, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.2 * unit;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1, 0.96, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Catchlights: one bright, one soft.
  ctx.fillStyle = `rgba(255,255,255,${0.95 * glint})`;
  ctx.beginPath();
  ctx.ellipse(-0.32, 0.38, 0.24, 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.35 * glint})`;
  ctx.beginPath();
  ctx.ellipse(0.38, -0.36, 0.12, 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  if (shut > 0.01) {
    // The lid comes down from above (feathered black), its edge inked.
    const y = 1.45 - 2.9 * Math.min(1, shut);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(-0.05, 0.05, 1.45, 1.33, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#e6ddd2';
    ctx.beginPath();
    ctx.rect(-1.6, y, 3.2, 3.2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4 * unit;
    ctx.beginPath();
    ctx.ellipse(0, y, 1.1, 0.25, 0, Math.PI, 0, true);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the spines

export function hull(points: readonly { x: number; y: number }[]): { x: number; y: number }[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cr = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: { x: number; y: number }[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cr(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: { x: number; y: number }[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cr(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function poly(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

const SOCKET: RGB = [150, 70, 82];

/**
 * The spines as pale keratin cones raking back towards the throat: a dark
 * socket and a soft shadow behind each on the flesh, the cone lit on one
 * flank, a bright edge, a fine ink line. `glow(s)` (0 .. 1) brightens a spine
 * (a light running down them).
 */
export function spineItems(cam: Camera, spines: readonly Spine[], light: Light, glow: (s: Spine) => number = () => 0): Item[] {
  const items: Item[] = [];
  for (const s of spines) {
    const p = project(cam, s.base);
    const t = project(cam, s.tip);
    if (p.z < NEAR || t.z < NEAR) continue;
    const view = norm(sub(cam.eye, s.base));
    // Seen from under the surface it grows from: hidden.
    if (dot(s.out, view) < -0.05) continue;
    items.push({ depth: Math.min(p.z, t.z) - 0.02, draw: (ctx) => drawSpine(ctx, cam, s, p, t, view, light, glow(s)) });
  }
  return items;
}

function drawSpine(ctx: CanvasRenderingContext2D, cam: Camera, s: Spine, p: Projected, t: Projected, view: V3, light: Light, g0: number): void {
  {
    const ring = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return project(cam, add(s.base, add(scale(s.side, s.r * Math.cos(a)), scale(s.back, s.r * Math.sin(a)))));
    });
    const size = Math.hypot(t.x - p.x, t.y - p.y);
    const occ = 1 - light.deep * Math.pow(1 - s.depth, 1.4);
    // Its shadow on the flesh, falling back towards the throat.
    const sh = [
      project(cam, add(s.base, scale(s.side, s.r))),
      project(cam, add(s.base, add(scale(s.back, s.h * 1.15), scale(s.side, s.r * 0.25)))),
      project(cam, add(s.base, add(scale(s.back, s.h * 1.15), scale(s.side, -s.r * 0.25)))),
      project(cam, add(s.base, scale(s.side, -s.r))),
    ];
    ctx.fillStyle = `rgba(70,16,28,${(0.3 * occ).toFixed(3)})`;
    poly(ctx, sh);
    ctx.fill();
    ctx.fillStyle = css(scaleRGB(SOCKET, occ));
    poly(ctx, ring);
    ctx.fill();
    // The cone.
    const outline = hull([...ring, t]);
    const nL = norm(add(scale(s.out, 0.55), scale(s.side, -0.85)));
    const nR = norm(add(scale(s.out, 0.55), scale(s.side, 0.85)));
    const nT = norm(add(scale(s.out, 0.9), scale(s.back, -0.4)));
    const paint: Paint = { rgb: SPINE, gloss: 0.55, wet: 0.5 };
    const tone = (n: V3): string => {
      const c = shade(paint, n, view, light, s.depth);
      return css([c[0] + 90 * g0, c[1] + 80 * g0, c[2] + 60 * g0]);
    };
    const left = project(cam, add(s.base, scale(s.side, -s.r)));
    const right = project(cam, add(s.base, scale(s.side, s.r)));
    const g = ctx.createLinearGradient(left.x, left.y, right.x, right.y);
    g.addColorStop(0, tone(nL));
    g.addColorStop(0.45, tone(nT));
    g.addColorStop(1, tone(nR));
    ctx.fillStyle = g;
    poly(ctx, outline);
    ctx.fill();
    // Its root fading into the flesh.
    const rg = ctx.createLinearGradient(p.x, p.y, t.x, t.y);
    rg.addColorStop(0, `rgba(196,112,120,${(0.55 * occ).toFixed(3)})`);
    rg.addColorStop(0.35, 'rgba(196,112,120,0)');
    ctx.fillStyle = rg;
    ctx.fill();
    // A bright edge on the lit flank, from the base to the point.
    const lit = dot(nL, light.dir) > dot(nR, light.dir) ? left : right;
    ctx.strokeStyle = `rgba(255,250,240,${(Math.min(0.85, 0.35 + 0.5 * g0) * occ).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.8, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(lit.x + (p.x - lit.x) * 0.3, lit.y + (p.y - lit.y) * 0.3);
    ctx.lineTo(t.x + (p.x - t.x) * 0.06, t.y + (p.y - t.y) * 0.06);
    ctx.stroke();
    ctx.strokeStyle = `rgba(27,26,31,${(0.62 * Math.max(0.35, occ)).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.7, Math.min(2, size * 0.035));
    poly(ctx, outline);
    ctx.stroke();
  }
}

const scaleRGB = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/** The throat: a dark hole between the palate and the floor, darkest in its middle. */
export function throatItem(cam: Camera, loop: readonly V3[]): Item | null {
  const pts = loop.map((p) => project(cam, p));
  if (pts.some((p) => p.z < NEAR)) return null;
  return { depth: Math.max(...pts.map((p) => p.z)) + 0.5, draw: (ctx) => drawThroat(ctx, pts) };
}

function drawThroat(ctx: CanvasRenderingContext2D, pts: readonly Projected[]): void {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const r = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy)));
  const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
  g.addColorStop(0, '#040102');
  g.addColorStop(0.5, '#12030a');
  g.addColorStop(1, '#4a1720');
  ctx.save();
  ctx.fillStyle = g;
  poly(ctx, pts);
  ctx.fill();
  ctx.restore();
}

