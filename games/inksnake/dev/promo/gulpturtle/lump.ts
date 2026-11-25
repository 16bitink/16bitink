import { ramp } from '../short';
import { drawBody, type BodyPose, type Pt, type Strip } from '../sprites';
import { type AH, SEAM_LINES, SHELL_FROM, SHELL_TO } from './shape';

/**
 * The skin over the shell: the game's strip, stretched pale over the dome,
 * with the shell's scutes pressing through as faint ridges.
 */

/** One place on the body: its spine point on screen, the way up, and its place along the turtle. */
export interface SkinPlace {
  readonly a: number;
  readonly p: Pt;
  /** Unit vector to the dome's side, screen px per world unit included. */
  readonly up: Pt;
  readonly top: number;
  readonly bottom: number;
}

/** Where the lip is along the turtle while the jaws are round it, and how much of one there is (1 .. 0). */
export interface LipFade {
  readonly a: number;
  readonly alpha: number;
}

/** How far behind the lip the skin is thick: not yet pale, the scutes not yet through. */
const LIP_FADE = 150;

const STRETCHED = '220,216,132';

/** Body places run from the rim back, so `a` falls along them. */
function placeAt(body: readonly SkinPlace[], a: number): SkinPlace | null {
  const first = body[0]!;
  const last = body[body.length - 1]!;
  if (a > first.a || a < last.a) return null;
  const i = Math.min(body.length - 1, Math.max(0, Math.round(((first.a - a) / (first.a - last.a)) * (body.length - 1))));
  return body[i]!;
}

/** The seams' lines laid on the skin, `lift` px up, only where the skin is out of the mouth. */
function tracePath(ctx: CanvasRenderingContext2D, body: readonly SkinPlace[], line: readonly AH[], size: number, lift: number): void {
  ctx.beginPath();
  let open = false;
  for (let i = 0; i + 1 < line.length; i++) {
    const [u, v] = [line[i]!, line[i + 1]!];
    const steps = Math.max(1, Math.ceil(Math.abs(v.a - u.a) / 16));
    for (let s = 0; s <= steps; s++) {
      const a = u.a + ((v.a - u.a) * s) / steps;
      const h = (u.h + ((v.h - u.h) * s) / steps) * size;
      const at = placeAt(body, a);
      if (!at) {
        open = false;
        continue;
      }
      const q = { x: at.p.x + at.up.x * h, y: at.p.y + at.up.y * h - lift };
      if (open) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
      open = true;
    }
  }
  ctx.stroke();
}

function paleOver(ctx: CanvasRenderingContext2D, body: readonly SkinPlace[], zoom: number, alpha: number, shown: (a: number) => number): void {
  // In strips across the body, each as pale as the skin there is stretched, over a soft edge top and bottom.
  for (let i = 0; i + 2 < body.length; i += 2) {
    const [s, e] = [body[i]!, body[i + 2]!];
    const stretch = (s.top + s.bottom) / 150 - 1;
    const pale = alpha * shown(s.a) * Math.min(0.46, 0.3 * Math.max(0, stretch));
    if (pale < 0.01) continue;
    const hi = { x: s.p.x + s.up.x * s.top, y: s.p.y + s.up.y * s.top };
    const lo = { x: s.p.x - s.up.x * s.bottom, y: s.p.y - s.up.y * s.bottom };
    const g = ctx.createLinearGradient(hi.x, hi.y, lo.x, lo.y);
    g.addColorStop(0, `rgba(${STRETCHED},${pale * 0.35})`);
    g.addColorStop(0.3, `rgba(${STRETCHED},${pale})`);
    g.addColorStop(0.65, `rgba(${STRETCHED},${pale * 0.8})`);
    g.addColorStop(1, `rgba(${STRETCHED},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hi.x, hi.y);
    ctx.lineTo(e.p.x + e.up.x * e.top, e.p.y + e.up.y * e.top);
    ctx.lineTo(e.p.x - e.up.x * e.bottom, e.p.y - e.up.y * e.bottom);
    ctx.lineTo(lo.x, lo.y);
    ctx.closePath();
    ctx.fill();
  }
  // The ridge of the dome catches the light.
  const crown = placeAt(body, 450);
  if (!crown) return;
  const c = { x: crown.p.x + crown.up.x * crown.top * 0.62, y: crown.p.y + crown.up.y * crown.top * 0.62 };
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(Math.atan2(crown.up.y, crown.up.x) + Math.PI / 2);
  ctx.scale(1, 0.36);
  const r = 190 * zoom;
  const shine = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  shine.addColorStop(0, `rgba(255,252,222,${0.3 * alpha})`);
  shine.addColorStop(1, 'rgba(255,252,222,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
}

/** The body strip and, over a swallowed shell, its pale stretched skin and scutes. The caller has clipped to the body's outline. */
export function drawSkin(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, pose: BodyPose, body: readonly SkinPlace[], size: number, zoom: number, lip: LipFade): void {
  drawBody(ctx, strip, boil, pose);
  const shown = body.filter((b) => b.a > SHELL_FROM - 60 && b.a < SHELL_TO + 60);
  const alpha = ramp(size, 0.25, 0.8);
  if (shown.length < 8 || alpha <= 0) return;
  ctx.save();
  const fade = (a: number): number => 1 - lip.alpha * (1 - ramp(lip.a - a, 10, LIP_FADE));
  paleOver(ctx, shown, zoom, alpha, fade);
  // The scutes' ridges come up out of the thicker skin by the lip.
  const [near, far] = [lip.a - 10, lip.a - LIP_FADE].map((a) => placeAt(shown, a) ?? shown[0]!) as [SkinPlace, SkinPlace];
  const ridge = (rgb: string, strength: number): CanvasGradient | string => {
    if (lip.alpha <= 0 || near === far) return `rgba(${rgb},${strength})`;
    const g = ctx.createLinearGradient(near.p.x, near.p.y, far.p.x, far.p.y);
    g.addColorStop(0, `rgba(${rgb},${strength * (1 - lip.alpha)})`);
    g.addColorStop(1, `rgba(${rgb},${strength})`);
    return g;
  };
  const [dark, light] = [ridge('36,40,10', 0.42 * alpha), ridge('255,252,214', 0.3 * alpha)];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const line of SEAM_LINES) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 9 * zoom;
    tracePath(ctx, shown, line, size, 0);
    ctx.strokeStyle = light;
    ctx.lineWidth = 5 * zoom;
    tracePath(ctx, shown, line, size, 7 * zoom);
  }
  ctx.restore();
}
