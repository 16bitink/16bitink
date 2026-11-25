import { BOIL } from '../../../../src/art/palette';
import { VIDEO } from '../../short';
import { type Camera, IDENTITY, type M4, norm, projOf, type V3, viewOf } from './math';
import { hex, type Mesh } from './mesh';
import { FRAG, INK_FRAG, QUAD_VERT, SHADOW_FRAG, SHADOW_VERT, VERT } from './shaders';

/**
 * Paints 3D models as ink-and-wash pictures: a colour pass at twice the
 * size, then pen lines along every edge of form, wobbling with the line
 * boil. The result is a canvas with a clear background, laid over the
 * painted backdrop by the 2D context.
 */
export interface Light {
  readonly dir: V3;
  readonly key: string;
  readonly keyK: number;
  readonly sky: string;
  readonly ground: string;
  readonly rim: string;
  readonly rimK?: number;
  readonly rimDir: V3;
  readonly fog?: string;
  readonly fogFrom?: number;
  readonly fogTo?: number;
  /** 0..1: how lit the bus's windows are. */
  readonly glow?: number;
}

export interface Item {
  readonly mesh: Mesh;
  readonly model?: M4;
  readonly look?: readonly [number, number];
  readonly clipY?: number;
  /** Casts no shadow on the ground. */
  readonly noShadow?: boolean;
}

export interface Scene {
  readonly camera: Camera;
  readonly light: Light;
  readonly items: readonly Item[];
  readonly boil: number;
  /** The ground's height, for the shadows; none without. */
  readonly ground?: number;
  readonly outer?: number;
  readonly inner?: number;
}

const SS = 2;
const NEAR = 0.1;
const FAR = 90;
const FLOATS = 15;
const [W, H] = [VIDEO.width, VIDEO.height];

interface Buffers {
  readonly vao: WebGLVertexArrayObject;
  readonly vbo: WebGLBuffer;
  readonly ibo: WebGLBuffer;
  readonly count: number;
}

export interface Painter {
  /** The models, painted; a fresh call replaces it. */
  paint(s: Scene): HTMLCanvasElement;
  /** Their shadows on the ground, soft, black on clear. */
  shadows(s: Scene): HTMLCanvasElement;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`titanoboa shader: ${gl.getShaderInfoLog(s)}`);
    gl.attachShader(p, s);
  }
  ['aPos', 'aNor', 'aUv', 'aLoc', 'aCol', 'aMat'].forEach((a, i) => gl.bindAttribLocation(p, i, a));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`titanoboa program: ${gl.getProgramInfoLog(p)}`);
  return p;
}

function pack(m: Mesh): Float32Array {
  const out = new Float32Array(m.pos.length * FLOATS);
  m.pos.forEach((p, i) => out.set([...p, ...m.nor[i]!, ...m.uv[i]!, ...m.loc[i]!, ...m.col[i]!, m.mat[i]!], i * FLOATS));
  return out;
}

export function makePainter(): Painter {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true })!;
  if (!gl) throw new Error('titanoboa: WebGL2 is not available');
  const paintP = program(gl, VERT, FRAG);
  const shadeP = program(gl, SHADOW_VERT, SHADOW_FRAG);
  const inkP = program(gl, QUAD_VERT, INK_FRAG);

  const texture = (internal: number, format: number, type: number): WebGLTexture => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, W * SS, H * SS, 0, format, type, null);
    const filter = format === gl.DEPTH_COMPONENT ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const colT = texture(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
  const dataT = texture(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const depthT = texture(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colT, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, dataT, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthT, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

  const quad = gl.createVertexArray()!;
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const kept = new WeakMap<Mesh, Buffers>();
  // Live meshes (rebuilt every frame) must give their buffers back.
  const recent: Buffers[] = [];
  const upload = (m: Mesh): Buffers => {
    const have = kept.get(m);
    if (have) return have;
    const vao = gl.createVertexArray()!;
    const [vbo, ibo] = [gl.createBuffer()!, gl.createBuffer()!];
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, pack(m), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(m.tri), gl.STATIC_DRAW);
    let at = 0;
    [3, 3, 2, 3, 3, 1].forEach((size, i) => {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, size, gl.FLOAT, false, FLOATS * 4, at * 4);
      at += size;
    });
    const b = { vao, vbo, ibo, count: m.tri.length };
    kept.set(m, b);
    recent.push(b);
    if (recent.length > 120) {
      const old = recent.shift()!;
      gl.deleteVertexArray(old.vao);
      gl.deleteBuffer(old.vbo);
      gl.deleteBuffer(old.ibo);
      for (const k of [...ids]) if (kept.get(k) === old) { kept.delete(k); ids.delete(k); }
    }
    ids.add(m);
    return b;
  };
  const ids = new Set<Mesh>();

  const u = (p: WebGLProgram, name: string): WebGLUniformLocation | null => gl.getUniformLocation(p, name);
  const v3 = (p: WebGLProgram, name: string, v: V3): void => gl.uniform3f(u(p, name), v[0], v[1], v[2]);
  const common = (p: WebGLProgram, s: Scene): void => {
    gl.useProgram(p);
    gl.uniformMatrix4fv(u(p, 'uView'), false, viewOf(s.camera) as number[]);
    gl.uniformMatrix4fv(u(p, 'uProj'), false, projOf(s.camera, W, H, NEAR, FAR) as number[]);
    v3(p, 'uLight', norm(s.light.dir));
  };
  const draw = (p: WebGLProgram, it: Item): void => {
    gl.uniformMatrix4fv(u(p, 'uModel'), false, (it.model ?? IDENTITY) as number[]);
    const b = upload(it.mesh);
    gl.bindVertexArray(b.vao);
    gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_INT, 0);
  };
  const begin = (): void => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, W * SS, H * SS);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  };
  const ink = (s: Scene, alpha: number): void => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(inkP);
    [colT, dataT, depthT].forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u(inkP, ['uCol', 'uData', 'uDepth'][i]!), i);
    });
    gl.uniform2f(u(inkP, 'uPx'), 1 / W, 1 / H);
    gl.uniform1f(u(inkP, 'uNear'), NEAR);
    gl.uniform1f(u(inkP, 'uFar'), FAR);
    gl.uniform1f(u(inkP, 'uOuter'), s.outer ?? 2.6);
    gl.uniform1f(u(inkP, 'uInner'), s.inner ?? 1.1);
    gl.uniform1f(u(inkP, 'uSeed'), ((s.boil % BOIL) + BOIL) % BOIL);
    gl.uniform1f(u(inkP, 'uInkAlpha'), alpha);
    v3(inkP, 'uInk', hex('#0d0b0a'));
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const small = document.createElement('canvas');
  small.width = Math.round(W / 14);
  small.height = Math.round(H / 14);
  const soft = small.getContext('2d')!;
  soft.imageSmoothingQuality = 'high';

  return {
    paint(s: Scene): HTMLCanvasElement {
      begin();
      common(paintP, s);
      const l = s.light;
      const tint = (c: string, k = 1): V3 => hex(c).map((x) => x * k) as unknown as V3;
      v3(paintP, 'uEye', s.camera.eye);
      v3(paintP, 'uKey', tint(l.key, l.keyK));
      v3(paintP, 'uSky', tint(l.sky));
      v3(paintP, 'uGroundCol', tint(l.ground));
      v3(paintP, 'uRim', tint(l.rim, l.rimK ?? 1));
      v3(paintP, 'uRimDir', norm(l.rimDir));
      v3(paintP, 'uFog', tint(l.fog ?? '#000000'));
      gl.uniform1f(u(paintP, 'uFogFrom'), l.fogFrom ?? 500);
      gl.uniform1f(u(paintP, 'uFogTo'), l.fogTo ?? 1000);
      gl.uniform1f(u(paintP, 'uGlow'), l.glow ?? 0.5);
      gl.uniform1f(u(paintP, 'uSeed'), 0);
      s.items.forEach((it, i) => {
        gl.uniform1f(u(paintP, 'uClipY'), it.clipY ?? -1000);
        gl.uniform1f(u(paintP, 'uId'), i % 10);
        gl.uniform2f(u(paintP, 'uLook'), it.look?.[0] ?? 0, it.look?.[1] ?? 0);
        draw(paintP, it);
      });
      ink(s, 1);
      return canvas;
    },
    shadows(s: Scene): HTMLCanvasElement {
      begin();
      gl.disable(gl.DEPTH_TEST);
      common(shadeP, s);
      gl.uniform1f(u(shadeP, 'uGround'), s.ground ?? 0);
      for (const it of s.items) if (!it.noShadow) draw(shadeP, it);
      ink(s, 0);
      soft.clearRect(0, 0, small.width, small.height);
      soft.drawImage(canvas, 0, 0, small.width, small.height);
      return small;
    },
  };
}
