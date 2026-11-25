/** Colours, the octopus's skin ramps, and the light that falls on a surface. */

export type Rgb = readonly [number, number, number];
export const rgb = (c: Rgb, a = 1): string => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const mix = (a: Rgb, b: Rgb, u: number): Rgb => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
export const clamp = (v: number): number => Math.max(0, Math.min(1, v));
export const sstep = (a: number, b: number, v: number): number => {
  const u = clamp((v - a) / (b - a));
  return u * u * (3 - 2 * u);
};

/** Colours from deep shade to full light. */
export type Ramp = readonly Rgb[];
export const SKIN: Ramp = [[30, 9, 10], [92, 31, 16], [176, 70, 24], [226, 120, 48], [250, 170, 92], [255, 219, 164]];
/** The pale underside the suckers sit on. */
export const ORAL: Ramp = [[58, 22, 20], [140, 74, 52], [206, 132, 94], [238, 184, 140], [252, 218, 182], [255, 240, 218]];
export const SUCKER_RIM: Rgb = [250, 228, 200];

export const rampAt = (ramp: Ramp, v: number): Rgb => {
  const x = clamp(v) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  return mix(ramp[i]!, ramp[i + 1]!, x - i);
};

/** The light on a scene: the direction to the key light (screen x, y down, z to the viewer), and a coloured rim light. */
export interface Light {
  readonly key: readonly [number, number, number];
  readonly ambient: number;
  readonly rim: readonly [number, number, number];
  readonly rimColour: Rgb;
  readonly rimK: number;
  /** Wet shine, 0..1. */
  readonly wet?: number;
  /** A colour everything is seen through (water, dusk), and how much. */
  readonly tint?: Rgb;
  readonly tintK?: number;
}

export const unit = (v: readonly [number, number, number]): readonly [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Skin colour for a surface normal. */
export function lit(ramp: Ramp, n: readonly [number, number, number], light: Light): Rgb {
  const k = unit(light.key);
  const r = unit(light.rim);
  const lam = Math.max(0, n[0] * k[0] + n[1] * k[1] + n[2] * k[2]);
  const ao = 0.72 + 0.28 * Math.max(0, n[2]);
  let c = rampAt(ramp, (light.ambient + (1 - light.ambient) * lam ** 1.15) * ao);
  const rim = Math.max(0, n[0] * r[0] + n[1] * r[1] + n[2] * r[2]) ** 2 * (1 - Math.max(0, n[2])) ** 1.3;
  c = mix(c, light.rimColour, clamp(rim * light.rimK));
  if (light.wet) {
    const h = unit([k[0], k[1], k[2] + 1]);
    c = mix(c, [255, 246, 226], light.wet * Math.max(0, n[0] * h[0] + n[1] * h[1] + n[2] * h[2]) ** 34);
  }
  return light.tint ? mix(c, light.tint, light.tintK ?? 0) : c;
}
