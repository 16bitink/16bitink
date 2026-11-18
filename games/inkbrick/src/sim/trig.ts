/**
 * Deterministic trigonometry: a sine table built with + - * / only (no Math.sin, whose last
 * bits differ between engines), read with linear interpolation. Degrees throughout.
 */

const STEPS_PER_DEG = 10;
const TABLE_SIZE = 360 * STEPS_PER_DEG;
const TAYLOR_TERMS = 12;

/** sin(x) for |x| <= pi/2 by its Taylor series (exact IEEE arithmetic, same on every device). */
function taylorSin(x: number): number {
  let term = x;
  let sum = x;
  const x2 = x * x;
  for (let n = 1; n < TAYLOR_TERMS; n++) {
    term = (-term * x2) / ((2 * n) * (2 * n + 1));
    sum += term;
  }
  return sum;
}

const PI = 3.141592653589793;

function detSinDeg(deg: number): number {
  // Reduce to [-90, 90] with sin(180 - d) = sin(d).
  let d = deg % 360;
  if (d < 0) d += 360;
  if (d > 180) d -= 360;
  if (d > 90) d = 180 - d;
  if (d < -90) d = -180 - d;
  return taylorSin((d * PI) / 180);
}

const SIN = new Float64Array(TABLE_SIZE + 1);
for (let i = 0; i <= TABLE_SIZE; i++) SIN[i] = detSinDeg(i / STEPS_PER_DEG);

export function sinDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  const f = d * STEPS_PER_DEG;
  const i = Math.floor(f);
  const t = f - i;
  const a = SIN[i]!;
  const b = SIN[i + 1]!;
  return a + (b - a) * t;
}

export function cosDeg(deg: number): number {
  return sinDeg(deg + 90);
}
