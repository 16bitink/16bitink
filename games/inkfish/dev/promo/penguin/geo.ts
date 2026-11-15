/**
 * The little 3D the penguin short needs: points, rotations, rigid frames and
 * a pinhole camera. The penguin is modelled in centimetres (it stands about
 * 72 cm tall), so the camera can move from the whole bird on the ice into its
 * open bill and down its throat with one consistent perspective.
 */

export interface V3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
export const add = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: V3, k: number): V3 => v3(a.x * k, a.y * k, a.z * k);
export const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const len = (a: V3): number => Math.hypot(a.x, a.y, a.z);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return v3(a.x / l, a.y / l, a.z / l);
};
export const mix3 = (a: V3, b: V3, u: number): V3 => v3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);

/** A rotation as its three columns (where the local x, y and z axes point). */
export interface M3 {
  readonly x: V3;
  readonly y: V3;
  readonly z: V3;
}

export const IDENTITY: M3 = { x: v3(1, 0, 0), y: v3(0, 1, 0), z: v3(0, 0, 1) };

export const rotate = (m: M3, p: V3): V3 => add(add(scale(m.x, p.x), scale(m.y, p.y)), scale(m.z, p.z));
export const compose = (a: M3, b: M3): M3 => ({ x: rotate(a, b.x), y: rotate(a, b.y), z: rotate(a, b.z) });

/** About the x axis (a nod: +a dips +z down towards -y). */
export function rotX(a: number): M3 {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return { x: v3(1, 0, 0), y: v3(0, c, s), z: v3(0, -s, c) };
}
/** About the y axis (a turn: +a swings +z towards +x). */
export function rotY(a: number): M3 {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return { x: v3(c, 0, -s), y: v3(0, 1, 0), z: v3(s, 0, c) };
}
/** About the z axis (a roll: +a swings +x towards +y). */
export function rotZ(a: number): M3 {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return { x: v3(c, s, 0), y: v3(-s, c, 0), z: v3(0, 0, 1) };
}

/** A rigid frame: local points are rotated by `m`, then moved to `o`. */
export interface Rig {
  readonly o: V3;
  readonly m: M3;
}

export const RIG0: Rig = { o: v3(0, 0, 0), m: IDENTITY };
export const place = (r: Rig, p: V3): V3 => add(r.o, rotate(r.m, p));
export const turnBy = (r: Rig, d: V3): V3 => rotate(r.m, d);
/** A child frame at local `o`, turned by `m`, inside `parent`. */
export const child = (parent: Rig, o: V3, m: M3 = IDENTITY): Rig => ({ o: place(parent, o), m: compose(parent.m, m) });

// ---------------------------------------------------------------- the camera

export interface Camera {
  readonly eye: V3;
  /** Unit vectors: right, up and forward (into the picture). */
  readonly right: V3;
  readonly up: V3;
  readonly fwd: V3;
  /** Screen px at unit depth. */
  readonly focal: number;
  /** Where the line of sight lands on screen. */
  readonly cx: number;
  readonly cy: number;
}

/** A camera at `eye` looking at `at`, `roll` radians about its line of sight. */
export function lookAt(eye: V3, at: V3, focal: number, cx: number, cy: number, roll = 0): Camera {
  const fwd = norm(sub(at, eye));
  const worldUp = Math.abs(fwd.y) > 0.98 ? v3(0, 0, 1) : v3(0, 1, 0);
  const right0 = norm(cross(fwd, worldUp));
  const up0 = cross(right0, fwd);
  const [c, s] = [Math.cos(roll), Math.sin(roll)];
  const right = add(scale(right0, c), scale(up0, s));
  const up = add(scale(up0, c), scale(right0, -s));
  return { eye, right, up, fwd, focal, cx, cy };
}

/** A point in camera space: x right, y up, z depth. */
export function toCamera(cam: Camera, p: V3): V3 {
  const d = sub(p, cam.eye);
  return v3(dot(d, cam.right), dot(d, cam.up), dot(d, cam.fwd));
}

export interface Projected {
  readonly x: number;
  readonly y: number;
  /** Depth in front of the camera (cm); <= NEAR means behind it. */
  readonly z: number;
}

export const NEAR = 0.4;

export function project(cam: Camera, p: V3): Projected {
  const c = toCamera(cam, p);
  const z = Math.max(c.z, 1e-3);
  return { x: cam.cx + (cam.focal * c.x) / z, y: cam.cy - (cam.focal * c.y) / z, z: c.z };
}

/** Screen px per cm at a point (for line weights and sprite sizes). */
export function pxPerCm(cam: Camera, p: V3): number {
  return cam.focal / Math.max(NEAR, toCamera(cam, p).z);
}

/** A world point in a frame's local coordinates. */
export function unplace(r: Rig, p: V3): V3 {
  const d = sub(p, r.o);
  return v3(dot(d, r.m.x), dot(d, r.m.y), dot(d, r.m.z));
}
