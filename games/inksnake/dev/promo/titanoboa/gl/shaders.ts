import { SKIN_GLSL } from './skins';

/** The GLSL of the painted models: a colour pass (washes, scales, wet light) and an ink pass over its edges. */
export const VERT = `#version 300 es
in vec3 aPos; in vec3 aNor; in vec2 aUv; in vec3 aLoc; in vec3 aCol; in float aMat;
uniform mat4 uModel, uView, uProj;
out vec3 vWorld; out vec3 vNor; out vec2 vUv; out vec3 vLoc; out vec3 vCol; flat out float vMat; out float vDepth;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vNor = mat3(uModel) * aNor;
  vUv = aUv; vLoc = aLoc; vCol = aCol; vMat = aMat;
  vec4 e = uView * w;
  vDepth = -e.z;
  gl_Position = uProj * e;
}`;

/** Flattened onto the ground along the light, for the cast shadows. */
export const SHADOW_VERT = `#version 300 es
in vec3 aPos;
uniform mat4 uModel, uView, uProj; uniform vec3 uLight; uniform float uGround;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  float h = max(0.0, w.y - uGround);
  w.xyz -= uLight * (h / max(0.25, uLight.y));
  w.y = uGround;
  gl_Position = uProj * uView * w;
}`;
export const SHADOW_FRAG = `#version 300 es
precision highp float;
layout(location = 0) out vec4 o;
void main() { o = vec4(0.0, 0.0, 0.0, 1.0); }`;

export const FRAG = `#version 300 es
precision highp float;
in vec3 vWorld; in vec3 vNor; in vec2 vUv; in vec3 vLoc; in vec3 vCol; flat in float vMat; in float vDepth;
uniform vec3 uEye, uLight, uKey, uSky, uGroundCol, uRim, uRimDir, uFog; uniform float uFogFrom, uFogTo, uClipY, uId, uWet, uGlow, uSeed;
uniform vec2 uLook; uniform mat4 uView;
layout(location = 0) out vec4 oCol; layout(location = 1) out vec4 oData;

${SKIN_GLSL}

void main() {
  if (vWorld.y < uClipY) discard;
  vec3 n = normalize(vNor);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) n = -n;
  Skin s = skinOf(int(vMat + 0.5), n, v);
  n = normalize(n + s.bump);
  // Washes: a smooth turn of the form broken into three soft-edged bands, as laid with a brush.
  float grain = fbm(vLoc.xy * 9.0 + vLoc.z * 7.0 + vUv * 2.0);
  float lam = dot(n, uLight);
  float w = lam * 0.62 + 0.38 + (grain - 0.5) * 0.16;
  float bands = 0.34 * smoothstep(0.16, 0.24, w) + 0.36 * smoothstep(0.42, 0.52, w) + 0.3 * smoothstep(0.72, 0.86, w);
  float lit = mix(clamp(w, 0.0, 1.0), bands, 0.45);
  vec3 amb = mix(uGroundCol, uSky, n.y * 0.5 + 0.5);
  vec3 c = s.col * (amb + uKey * lit);
  // The wet light and the rim of the sky behind.
  vec3 h = normalize(uLight + v);
  float sp = pow(max(0.0, dot(n, h)), s.hard) * s.gloss;
  c += uKey * sp * smoothstep(0.0, 0.3, lam + 0.25);
  float fres = pow(1.0 - max(0.0, dot(n, v)), 3.0);
  c += uRim * fres * smoothstep(-0.1, 0.6, dot(n, uRimDir)) * (0.35 + 0.65 * s.gloss + 0.2);
  c = mix(c, s.col, s.self);
  c *= 0.94 + 0.12 * (fbm(gl_FragCoord.xy * 0.006 + uSeed * 3.0) );
  c = mix(c, uFog, clamp((vDepth - uFogFrom) / max(0.001, uFogTo - uFogFrom), 0.0, 1.0));
  vec3 nv = mat3(uView) * n;
  oCol = vec4(c, 1.0);
  oData = vec4(normalize(mat3(uView) * normalize(vNor)) * 0.5 + 0.5, (uId * 24.0 + s.part) / 255.0);
}`;

export const QUAD_VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

export const INK_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uCol, uData, uDepth; uniform vec2 uPx; uniform float uNear, uFar, uOuter, uInner, uSeed, uInkAlpha; uniform vec3 uInk;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
void main() {
  vec2 px = uPx;
  vec2 q = vUv / px;
  vec2 wob = (vec2(vn(q * 0.018 + uSeed * 11.0), vn(q * 0.018 + 40.0 + uSeed * 7.0)) - 0.5) * 3.0 * px;
  vec4 c = texture(uCol, vUv);
  vec2 uv = vUv + wob;
  float press = 0.65 + 0.7 * vn(q * 0.011 + 9.0);
  float a0 = texture(uCol, uv).a;
  vec4 d0 = texture(uData, uv);
  float z0 = lin(texture(uDepth, uv).r);
  float outer = 0.0, inner = 0.0;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.7853981634;
    vec2 dir = vec2(cos(ang), sin(ang)) * px;
    vec2 uo = uv + dir * uOuter * press;
    vec2 ui = uv + dir * uInner * press;
    float a1 = texture(uCol, uo).a;
    outer = max(outer, abs(a1 - a0));
    float zo = lin(texture(uDepth, uo).r);
    outer = max(outer, step(0.5, min(a0, a1)) * smoothstep(0.045, 0.09, abs(zo - z0) / min(zo, z0)));
    vec4 d1 = texture(uData, ui);
    float both = step(0.5, min(a0, texture(uCol, ui).a));
    inner = max(inner, both * step(0.5 / 255.0, abs(d1.a - d0.a)));
    vec3 n0 = d0.xyz * 2.0 - 1.0, n1 = d1.xyz * 2.0 - 1.0;
    inner = max(inner, both * smoothstep(0.35, 0.75, 1.0 - dot(n0, n1)) * 0.8);
  }
  float ink = max(outer, inner * 0.75) * uInkAlpha;
  o = mix(vec4(c.rgb * c.a, c.a), vec4(uInk, 1.0), ink);
}`;
