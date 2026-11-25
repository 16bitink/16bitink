/** How each material is painted: colour, gloss and bump by place. Pasted into the fragment shader. */
export const SKIN_GLSL = `
struct Skin { vec3 col; float gloss; float hard; float self; float part; vec3 bump; };
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.13 + 7.1) + 0.15 * vnoise(p * 4.4 + 3.7); }
vec3 rgb(int h) { return vec3(float((h >> 16) & 255), float((h >> 8) & 255), float(h & 255)) / 255.0; }

/** Diamond scales: x the edge (1 inside .. 0 on the line), y a glint on its front, z a random per scale. Fades out where too small to see. */
vec3 diamonds(vec2 q) {
  vec2 ab = vec2(q.x + q.y, q.x - q.y);
  vec2 id = floor(ab), f = fract(ab) - 0.5;
  float w = max(fwidth(ab.x), fwidth(ab.y));
  float seen = 1.0 - smoothstep(0.28, 0.6, w);
  float e = 0.5 - max(abs(f.x), abs(f.y));
  float edge = mix(0.86, smoothstep(0.02, 0.13 + w, e), seen);
  vec2 g = vec2(f.x + f.y, f.x - f.y);
  float glint = seen * smoothstep(0.34, 0.06, length(g - vec2(-0.16, 0.2)));
  return vec3(edge, glint, mix(0.5, hash2(id), seen));
}

/** Titanoboa's back: dark olive-brown, big round lighter saddles edged in black, rings along the flank, a pale yellowish belly. */
vec3 boaPattern(vec2 uv, out float belly) {
  float P = 3.3;
  float k = floor(uv.x / P);
  float du = uv.x - (k + 0.5) * P;
  float av = abs(uv.y);
  vec2 nq = vec2(uv.x * 1.6, uv.y * 1.9);
  float warp = (fbm(nq) - 0.5) * 0.5 + (hash2(vec2(k, 3.0)) - 0.5) * 0.12;
  float mott = fbm(nq * 2.3 + 11.0);
  vec3 col = mix(rgb(0x2a2717), rgb(0x4c4526), smoothstep(0.6, 2.1, av));
  col = mix(col, rgb(0x15130b), smoothstep(0.52, 0.8, mott) * 0.55);
  float d = length(vec2(du / (P * 0.385), av / 1.28)) + warp;
  vec3 saddle = mix(rgb(0xb7a565), rgb(0x83753d), smoothstep(0.0, 0.8, d));
  saddle = mix(saddle, rgb(0x4d4424), smoothstep(0.55, 0.85, fbm(nq * 3.1 + 4.0)) * 0.6);
  col = mix(col, rgb(0x0d0b07), smoothstep(1.2, 1.02, d));
  col = mix(col, saddle, smoothstep(0.96, 0.84, d));
  // The flank's rings, under the gaps between the saddles.
  float du2 = uv.x - (floor(uv.x / P + 0.5)) * P;
  float d2 = length(vec2(du2 / (P * 0.2), (av - 1.72) / 0.4)) + warp * 0.7;
  col = mix(col, rgb(0x0f0c07), smoothstep(1.15, 0.95, d2));
  col = mix(col, rgb(0x9a8a50), smoothstep(0.72, 0.55, d2));
  belly = smoothstep(2.02, 2.3, av + warp * 0.35);
  vec3 bel = mix(rgb(0xd8c88c), rgb(0xa99a60), smoothstep(0.45, 0.75, fbm(nq * 1.7 + 30.0)));
  float flecks = smoothstep(0.63, 0.7, vnoise(vec2(uv.x * 4.0, uv.y * 5.0)));
  bel = mix(bel, rgb(0x2d2613), flecks * 0.75);
  return mix(col, bel, belly);
}

Skin boaSkin() {
  Skin s; float belly;
  vec3 c = boaPattern(vUv, belly);
  float N = 44.0;
  vec3 sc = diamonds(vec2(vUv.x, vUv.y) * N / 6.2831853);
  float shut = smoothstep(0.06, 0.16, abs(fract(vUv.x * 2.2) - 0.5));
  c *= mix(0.62 + 0.38 * sc.x, 0.74 + 0.26 * shut, belly);
  c *= 0.9 + 0.2 * sc.z;
  s.col = c + sc.y * 0.07 * (1.0 - belly);
  s.gloss = 0.16 + 0.5 * sc.y * sc.z + 0.12 * sc.x; s.hard = 22.0; s.self = 0.0; s.part = 1.0; s.bump = vec3(0.0);
  return s;
}

/** The head, by place: snout +x, up +y, mouth's corner near x = 0.2; every length a share of the head's. */
Skin headSkin() {
  Skin s;
  vec3 p = vLoc; float az = abs(p.z);
  float lipY = -0.06;
  float around = atan(az, p.x - 0.45);
  vec2 nq = vec2(p.x * 9.0 + p.y * 4.0, az * 9.0 + p.y * 5.0);
  float mott = fbm(nq);
  vec3 col = mix(rgb(0x332f1b), rgb(0x565030), smoothstep(0.2, -0.04, p.y));
  col = mix(col, rgb(0x191609), smoothstep(0.52, 0.75, mott) * 0.6);
  // The dark arrow along the crown and the pale panels beside it.
  float crown = smoothstep(0.1, 0.15, p.y);
  float panel = smoothstep(0.03, 0.012, abs(az - 0.085 - 0.1 * (0.62 - p.x) * step(p.x, 0.62)) - 0.03) * crown * smoothstep(0.78, 0.6, p.x);
  col = mix(col, rgb(0x8f8149), panel * 0.75);
  col = mix(col, rgb(0x110f08), smoothstep(0.045, 0.02, az) * crown * smoothstep(0.75, 0.5, p.x) * 0.8);
  // The black stripe from the eye back to the jaw's corner.
  float sy = mix(0.02, 0.085, clamp((p.x - 0.1) / 0.5, 0.0, 1.0));
  float stripe = smoothstep(0.05, 0.03, abs(p.y - sy) + (mott - 0.5) * 0.03) * smoothstep(0.68, 0.6, p.x) * smoothstep(0.1, 0.16, az);
  col = mix(col, rgb(0x0e0c07), stripe * 0.92);
  float under = smoothstep(0.035, 0.02, abs(p.y - sy + 0.062)) * smoothstep(0.66, 0.6, p.x) * smoothstep(0.12, 0.16, az);
  col = mix(col, rgb(0xa8985a), under * 0.8);
  // Lip scales, pale, each edged dark, a dark bar on every third.
  float lipBand = smoothstep(0.078, 0.066, abs(p.y - lipY)) * step(-0.2, p.x);
  float n = around * 8.0 + p.x * 4.0;
  float w = max(0.06, fwidth(n));
  float gap = smoothstep(0.02, 0.06 + w, 0.5 - abs(fract(n) - 0.5));
  vec3 lip = mix(rgb(0xc9b878), rgb(0x8d7d48), smoothstep(0.02, 0.07, p.y - lipY));
  lip = mix(lip, rgb(0x2a2211), smoothstep(0.5, 0.62, fbm(vec2(n * 0.9, p.y * 30.0))) * 0.75 * smoothstep(0.06, 0.12, az));
  col = mix(col, lip * (0.35 + 0.65 * gap), lipBand);
  // The throat and chin.
  float chin = smoothstep(-0.14, -0.2, p.y);
  col = mix(col, mix(rgb(0xd3c488), rgb(0x8c7d4a), smoothstep(0.5, 0.75, mott)), chin);
  // Small scales all over.
  vec3 sc = diamonds(vUv * 19.0);
  col *= mix(1.0, 0.58 + 0.42 * sc.x, 1.0 - lipBand);
  col *= 0.88 + 0.24 * mix(0.5, sc.z, 1.0 - lipBand);
  // The eye's socket and the nostril.
  float ed = length(p - vec3(0.655, 0.085, sign(p.z) * 0.19));
  col *= 0.35 + 0.65 * smoothstep(0.055, 0.1, ed);
  float nd = length((p - vec3(0.945, 0.035, sign(p.z) * 0.085)) * vec3(0.8, 1.2, 1.0));
  col = mix(rgb(0x050403), col, smoothstep(0.018, 0.03, nd));
  // The edge of the mouth, dark and wet.
  col *= 0.5 + 0.5 * smoothstep(0.0, 0.014, abs(p.y - lipY));
  s.col = col + sc.y * 0.06 * (1.0 - lipBand);
  s.gloss = 0.22 + 0.45 * sc.y * sc.z; s.hard = 26.0; s.self = 0.0; s.part = 1.0; s.bump = vec3(0.0);
  return s;
}

Skin eyeSkin() {
  Skin s;
  vec3 a = normalize(vCol * 2.0 - 1.0);
  vec3 d = normalize(vLoc);
  vec3 b = normalize(vec3(0.0, 1.0, 0.0) - a * a.y);
  vec3 cr = cross(a, b);
  vec2 q = vec2(dot(d, cr), dot(d, b)) - vec2(uLook.y - uLook.x * sign(a.z), 0.0);
  float r = length(q);
  float rays = vnoise(vec2(atan(q.y, q.x) * 9.0, r * 3.0));
  vec3 iris = mix(rgb(0xe8b63c), rgb(0x7a5312), smoothstep(0.1, 0.7, r));
  iris = mix(iris, rgb(0xf7de7a), rays * 0.4 * smoothstep(0.7, 0.2, r));
  vec3 c = mix(iris, rgb(0x17110a), smoothstep(0.72, 0.8, r));
  c = mix(rgb(0x050403), c, smoothstep(0.0, 0.05, length(vec2(q.x / 0.17, q.y / 0.72)) - 0.95));
  c *= 0.55 + 0.45 * smoothstep(0.75, 0.2, q.y);
  s.col = c; s.gloss = 1.6; s.hard = 90.0; s.self = 0.55; s.part = 5.0; s.bump = vec3(0.0);
  return s;
}

/** Distances to the nearest and next cell's middle: for pebbly scales. */
vec2 cells(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 d = vec2(9.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = g + 0.5 + 0.38 * (vec2(hash2(i + g), hash2(i + g + 17.0)) - 0.5) * 2.0 - f;
    float l = length(o);
    if (l < d.x) d = vec2(l, d.x); else if (l < d.y) d.y = l;
  }
  return d;
}

Skin crocSkin() {
  Skin s;
  // uv.x along the body (0 snout .. 1 tail), uv.y the angle from the back.
  float av = abs(vUv.y);
  float mott = fbm(vec2(vUv.x * 24.0, vUv.y * 2.2));
  vec3 col = mix(rgb(0x6e5530), rgb(0xa78550), smoothstep(0.5, 1.9, av + (mott - 0.5) * 0.5));
  float tail = smoothstep(0.58, 0.68, vUv.x);
  // Ragged crossbands, bold on the tail, broken on the body.
  float wav = sin(vUv.x * 58.0 + (mott - 0.5) * 3.4 + av * 0.5);
  float band = smoothstep(0.1, 0.5, wav) * smoothstep(2.3, 1.5, av + (mott - 0.5)) * smoothstep(0.22, 0.28, vUv.x);
  col = mix(col, rgb(0x2c2012), band * mix(0.6, 0.9, tail));
  float belly = smoothstep(1.95, 2.4, av + (mott - 0.5) * 0.4);
  col = mix(col, rgb(0xe6d6a2), belly);
  float back = smoothstep(1.3, 1.1, av + (mott - 0.5) * 0.12) * smoothstep(0.17, 0.2, vUv.x);
  // Flanks: smooth small rounded scales, hardly edged.
  vec2 wc = cells(vec2(vUv.x * 120.0, vUv.y * 9.5));
  float w = max(fwidth(vUv.x) * 120.0, fwidth(vUv.y) * 9.5);
  float seen = 1.0 - smoothstep(0.35, 0.8, w);
  float peb = smoothstep(0.02, 0.22, wc.y - wc.x);
  col *= mix(1.0, 0.8 + 0.22 * peb, seen * (1.0 - back) * (1.0 - 0.6 * belly));
  // The back: six long rows of bony scutes, each its own size, keeled, dark skin between.
  float lane = vUv.y / 0.4;
  float r = floor(lane);
  float sx = vUv.x * 34.0 + hash2(vec2(r, 4.0)) * 0.9 + 0.16 * sin(vUv.x * 61.0 + r * 2.3);
  float id = floor(sx);
  float h = hash2(vec2(id, r));
  vec2 f = vec2(fract(sx) - 0.5, fract(lane) - 0.5);
  f.y += (h - 0.5) * 0.14;
  float size = 0.36 + 0.1 * h - 0.04 * abs(r + 0.5);
  float d = pow(pow(abs(f.x) / 0.46, 2.6) + pow(abs(f.y) / (size + 0.06), 2.6), 1.0 / 2.6);
  float aw = max(0.05, fwidth(sx) * 1.6);
  float sc = smoothstep(1.02 + aw, 0.9 - aw, d);
  vec3 bone = mix(col * 1.22, col * 0.86, smoothstep(-0.3, 0.4, f.x)) * (0.86 + 0.3 * h);
  bone += 0.1 * smoothstep(0.1, 0.0, abs(f.y + 0.05)) * smoothstep(0.5, 0.1, d);
  bone *= 1.0 - 0.4 * smoothstep(0.06, 0.0, abs(f.y - 0.06)) * smoothstep(0.85, 0.3, d);
  vec3 skin = col * 0.5;
  col = mix(col, mix(skin, bone, sc), back * (1.0 - smoothstep(0.5, 1.0, fwidth(sx))));
  s.col = col; s.gloss = 0.14 + 0.16 * sc * back; s.hard = 20.0; s.self = 0.0; s.part = 6.0; s.bump = vec3(0.0);
  return s;
}

Skin fishSkin() {
  Skin s;
  float av = abs(vUv.y);
  vec3 col = mix(rgb(0x3c4a33), rgb(0x8a8a4c), smoothstep(0.3, 1.6, av));
  col = mix(col, rgb(0xd9b878), smoothstep(1.6, 2.5, av));
  float mott = fbm(vec2(vUv.x * 14.0, vUv.y * 4.0));
  col = mix(col, rgb(0x232a1c), smoothstep(0.55, 0.72, mott) * 0.55 * smoothstep(2.2, 1.2, av));
  // Big overlapping scales.
  vec2 q = vec2(vUv.x * 30.0, vUv.y * 3.6);
  q.x += 0.5 * mod(floor(q.y), 2.0);
  vec2 f = fract(q) - vec2(0.5, 0.5);
  float body = smoothstep(0.2, 0.24, vUv.x);
  float arc = length(vec2(f.x * 0.95 - 0.12, f.y));
  float line = smoothstep(0.1, 0.02, abs(arc - 0.46));
  col *= 1.0 - 0.45 * line * body;
  col += 0.1 * smoothstep(0.3, 0.0, length(f + vec2(0.1, 0.2))) * body;
  s.col = col; s.gloss = 0.5; s.hard = 26.0; s.self = 0.0; s.part = 7.0; s.bump = vec3(0.0);
  return s;
}

/** The school bus, painted by place (metres: rear 0 .. front, y up, half width 1.2). */
Skin busSkin(vec3 n) {
  Skin s;
  vec3 p = vLoc; float side = step(0.75, abs(vUv.x));
  vec3 yel = rgb(0xf2a90e);
  vec3 col = mix(rgb(0xd98a06), yel, smoothstep(0.6, 1.6, p.y));
  float part = 12.0;
  float gl = 0.35;
  if (abs(p.z) > 1.02 && p.x < 11.2) {
    float rails = 0.0;
    for (int i = 0; i < 3; i++) rails = max(rails, smoothstep(0.06, 0.045, abs(p.y - (0.92 + 0.4 * float(i)))));
    col = mix(col, rgb(0x14120e), rails);
    // Windows, a row of them, split across the middle; the door near the front on the near side.
    float wx = (p.x - 0.35) / 0.93;
    vec2 f = vec2(fract(wx), (p.y - 1.86) / 0.72);
    float win = step(0.07, f.x) * step(f.x, 0.93) * step(0.0, f.y) * step(f.y, 1.0) * step(0.0, wx) * step(wx, 10.0);
    float door = step(9.95, p.x) * step(p.x, 10.95) * step(0.55, p.y) * step(p.y, 2.72);
    float frame = step(0.03, f.x) * step(f.x, 0.97) * step(-0.06, f.y) * step(f.y, 1.06) * step(0.0, wx) * step(wx, 10.0);
    col = mix(col, rgb(0x1b1712), max(frame, door));
    vec2 df = vec2(fract((p.x - 9.95) / 0.5), fract((p.y - 0.62) / 0.7));
    float dwin = door * step(0.12, df.x) * step(df.x, 0.88) * step(0.06, df.y) * step(df.y, 0.94);
    float g = max(win, dwin);
    vec3 glass = mix(rgb(0x3b2a1c), rgb(0xffc46a), smoothstep(1.7, 2.55, p.y + 0.12 * sin(p.x * 5.0)) * 0.9);
    glass = mix(glass, rgb(0x241a14), smoothstep(0.33, 0.28, length(vec2(f.x - 0.5, (f.y - 0.12) * 0.9))) * win * 0.85);
    glass += 0.22 * smoothstep(0.06, 0.0, abs(fract(p.x * 0.42 + p.y * 0.5) - 0.5) - 0.06);
    glass = mix(glass, rgb(0x100d0a), step(abs(f.y - 0.5), 0.035) * win);
    col = mix(col, glass, g);
    part += 2.0 * max(frame, door);
    s.self = 0.6 * g * uGlow;
    // Black lettering bars' place on the band under the roof.
    col = mix(col, rgb(0xe89a08), step(2.72, p.y) * 0.5);
  } else if (p.x > 11.1 && p.y > 1.7) {
    // The windscreen, and the sign and lights over it.
    vec2 q = vec2(p.z / 1.02, (p.y - 1.86) / 0.66);
    float ws = step(abs(q.x), 1.0) * step(0.0, q.y) * step(q.y, 1.0);
    float post = step(abs(q.x), 0.04);
    vec3 glass = mix(rgb(0x2a1e18), rgb(0xd99a50), q.y * 0.75) + 0.2 * smoothstep(0.1, 0.0, abs(fract(q.x * 0.6 - q.y * 0.35) - 0.5) - 0.1);
    col = mix(col, mix(glass, rgb(0x14110c), post), ws);
    float sign = step(abs(p.z), 0.62) * step(2.58, p.y) * step(p.y, 2.86);
    col = mix(col, rgb(0x17130c), sign * 0.0);
    float lamp = 1.0 - step(0.12, length(vec2(abs(p.z) - 0.9, p.y - 2.72)));
    float lamp2 = 1.0 - step(0.1, length(vec2(abs(p.z) - 0.62, p.y - 2.74)));
    col = mix(col, rgb(0xd32a16), lamp); col = mix(col, rgb(0xffb020), lamp2);
    s.self = max(lamp, lamp2) * 0.7; part += ws * 2.0 + max(lamp, lamp2) * 4.0;
  }
  col *= 0.9 + 0.2 * fbm(vec2(p.x * 1.3, p.y * 2.0));
  col *= 0.72 + 0.28 * smoothstep(0.5, 1.1, p.y + 0.15 * fbm(p.xy * 3.0));
  s.col = col; s.gloss = gl; s.hard = 30.0; s.part = part; s.bump = vec3(0.0);
  return s;
}

Skin skinOf(int m, vec3 n, vec3 v) {
  Skin s;
  s.col = vCol; s.gloss = 0.06; s.hard = 14.0; s.self = 0.0; s.part = float(m); s.bump = vec3(0.0);
  if (m == 1) return boaSkin();
  if (m == 2) return headSkin();
  if (m == 5) return eyeSkin();
  if (m == 6) return crocSkin();
  if (m == 7) return fishSkin();
  if (m == 14) return busSkin(n);
  if (m == 3) {
    float f = fbm(vLoc.xz * 14.0);
    float deep = smoothstep(0.95, 0.25, vLoc.x);
    s.col = mix(rgb(0x94504e), rgb(0x26090d), deep) * (0.85 + 0.3 * f);
    s.gloss = 0.2; s.hard = 24.0;
  } else if (m == 4) {
    s.col = mix(rgb(0xf3e8c8), rgb(0xcbb27a), smoothstep(0.5, 0.0, vUv.x * 0.15)); s.gloss = 0.5;
  } else if (m == 8) {
    float g = smoothstep(0.1, 0.0, abs(fract(vLoc.x * 0.9 + vLoc.y * 0.8) - 0.5) - 0.07);
    s.col = vCol + 0.18 * g; s.gloss = 0.8; s.hard = 50.0;
  } else if (m == 9) {
    float f = fbm(vWorld.xy * 7.0 + vWorld.z * 3.0);
    s.col = mix(vCol, vCol * vec3(0.66, 0.58, 0.48), smoothstep(0.48, 0.75, f) * 0.75);
    s.col *= 0.7 + 0.3 * smoothstep(0.0, 0.012, abs(fbm(vWorld.xy * 5.0 + 3.0) - 0.47));
    s.col *= 0.92 + 0.16 * vnoise(vWorld.xy * 60.0);
    s.gloss = 0.1;
  } else if (m == 10) {
    float f = fbm(vLoc.xy * 4.0);
    float l = fbm(vec2(vLoc.x * 0.8 + vLoc.y * 0.2, vLoc.y * 9.0 + f * 2.0));
    s.col = mix(vCol, vCol * 0.6, smoothstep(0.4, 0.7, l) * 0.7);
    s.col = mix(s.col, vCol * 1.18, smoothstep(0.5, 0.8, fbm(vLoc.xy * 34.0 + 3.0)) * 0.3);
    s.gloss = 0.02;
  } else if (m == 11) {
    float t = 0.5 + 0.5 * sin(vLoc.x * 150.0) * sin(vLoc.y * 150.0);
    s.col = vCol * (0.86 + 0.14 * t) * (0.88 + 0.24 * fbm(vLoc.xy * 3.0 + vLoc.z)); s.gloss = 0.02;
  } else if (m == 12) {
    s.gloss = 0.6; s.hard = 40.0; s.col = vCol * (0.92 + 0.16 * fbm(vLoc.xy * 2.0));
  } else if (m == 13) {
    s.self = 1.0; s.col = vCol;
  } else if (m == 15) {
    float ray = smoothstep(0.1, 0.3, abs(fract(vUv.x * 13.0) - 0.5));
    s.col = vCol * (0.62 + 0.38 * ray) * (0.9 + 0.2 * fbm(vUv * 9.0)); s.gloss = 0.25;
  } else if (m == 17) {
    // Wet swamp ground: mud, moss, fallen leaves, puddles that mirror the sky.
    vec2 g = vWorld.xz;
    float a = fbm(g * 0.9), b = fbm(g * 3.3 + 5.0);
    s.col = mix(rgb(0x7d724c), rgb(0xa4966a), b);
    s.col = mix(s.col, rgb(0x83924f), smoothstep(0.5, 0.66, a) * 0.8);
    s.col *= 0.82 + 0.36 * fbm(g * 14.0);
    for (int k = 0; k < 3; k++) {
      vec2 q = g * (2.6 + float(k) * 0.9) + float(k) * 13.7;
      vec2 id = floor(q); vec2 f = fract(q) - 0.5 - (vec2(hash2(id), hash2(id + 9.0)) - 0.5) * 0.5;
      float an = hash2(id + 3.0) * 6.28; f = mat2(cos(an), -sin(an), sin(an), cos(an)) * f;
      float lf = length(vec2(f.x * 2.2, f.y * (5.2 + 4.0 * abs(f.x))));
      float on = step(0.5, hash2(id + 21.0));
      vec3 lc = mix(rgb(0x9a6c34), rgb(0x7c8a3c), hash2(id + 31.0));
      lc = mix(lc, lc * 0.5, smoothstep(0.02, 0.0, abs(f.y)));
      s.col = mix(s.col, lc * 0.8, on * smoothstep(0.62, 0.55, lf));
    }
    float pool = smoothstep(0.6, 0.64, fbm(g * 0.55 + 20.0));
    s.col = mix(s.col, mix(rgb(0x5f8480), rgb(0xa9cfc0), fbm(g * vec2(0.8, 6.0))), pool);
    s.gloss = 0.05 + 0.5 * pool; s.hard = 18.0; s.part = 17.0;
  } else if (m == 16) {
    s.col = vCol * (0.9 + 0.2 * fbm(vLoc.xy * 8.0)); s.gloss = 0.12;
  }
  return s;
}
`;
