import Phaser from 'phaser';
import { isPhone } from '@16bitink/game-sdk';
import type { CityView } from '../sim/types';
import type { GroundScale } from '../render/ground/chunks';
import { Pictures } from '../render/pictures';
import { PAPER } from '../render/style';
import { installProbe } from './devProbe';
import { Desk } from './desk';
import { PointerRig } from './pointer';
import type { CreateWorld, Overlay, WorldCallbacks, WorldOptions, WorldPort } from './port';
import { WorldScene } from './WorldScene';

/** Builds the Phaser world in `parent` and hands back its port. */
const MAX_DPR = 2;
/** Phones (low), plain and dense laptop screens. */
const GROUND = {
  low: { base: 1, outer: 0.6, detail: 2.56, pool: 10 }, high: { base: 1.28, outer: 0.8, detail: 2.8, pool: 16 }, sharp: { base: 1.28, outer: 0.8, detail: 3, pool: 24 },
} as const satisfies Record<string, GroundScale>;
const FOCUS_MS = 650;
const SHARP_DPR = 1.5;

interface Stage { readonly w: number; readonly h: number; readonly dpr: number }

function measure(parent: HTMLElement): Stage {
  return { w: Math.max(1, parent.clientWidth || innerWidth), h: Math.max(1, parent.clientHeight || innerHeight), dpr: Math.min(MAX_DPR, Math.max(1, devicePixelRatio || 1)) };
}

function groundScale(parent: HTMLElement, o: WorldOptions): GroundScale {
  const s = measure(parent);
  const phone = isPhone({ width: s.w, height: s.h });
  const q = o.quality ?? (phone ? 'low' : 'high');
  return q === 'low' ? GROUND.low : s.dpr >= SHARP_DPR ? GROUND.sharp : GROUND.high;
}

function makeGame(parent: HTMLElement, s: Stage): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.WEBGL, parent, width: Math.ceil(s.w * s.dpr), height: Math.ceil(s.h * s.dpr), backgroundColor: PAPER,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / s.dpr },
    render: { powerPreference: 'high-performance', antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', preserveDrawingBuffer: false },
    input: { mouse: false, touch: false, keyboard: false }, audio: { noAudio: true }, banner: false, scene: [],
  });
}

/** The Master Plan is lettered by hand into the ground, so the font must be there first. */
async function loadHand(): Promise<void> {
  try {
    await document.fonts.load('600 17px Caveat');
  } catch (e) {
    console.warn('[inkroad] the hand font did not load', e);
  }
}

export const createWorld: CreateWorld = (parent, city, callbacks = {}, opts = {}) => new World(parent, city, callbacks, opts);

class World implements WorldPort {
  readonly ready: Promise<void>;
  overlay: Overlay = 'none';
  private readonly game: Phaser.Game;
  private scene: WorldScene | null = null;
  private desk: Desk | null = null;
  private pointer: PointerRig | null = null;
  private readonly watch: ResizeObserver;
  private dead = false;
  private inputOn = true;
  private waiting: (() => void)[] = [];
  private pics: Pictures | null = null;

  constructor(private readonly parent: HTMLElement, private city: CityView, private cb: WorldCallbacks, private readonly opts: WorldOptions) {
    this.game = makeGame(parent, measure(parent));
    this.watch = new ResizeObserver(() => this.resize());
    this.watch.observe(parent);
    this.ready = this.start();
    this.ready.catch((e: unknown) => console.error('[inkroad] the world did not start', e));
  }

  private async start(): Promise<void> {
    const [pics] = await Promise.all([Pictures.load(this.city.def.style, (f) => this.cb.onProgress?.(f)), loadHand()]);
    if (this.dead) return;
    this.pics = pics;
    if (!this.game.isBooted) await new Promise<void>((done) => this.game.events.once(Phaser.Core.Events.READY, () => done()));
    if (this.dead) return;
    await new Promise<void>((done) => {
      const scene = new WorldScene(pics, this.city, {
        frame: (dt) => this.cb.frame?.(dt),
        after: () => this.after(),
        ready: () => done(),
      }, groundScale(this.parent, this.opts));
      const s = measure(this.parent);
      scene.fit(s.w, s.h, s.dpr);
      this.scene = scene;
      this.desk = new Desk(scene, this.cb);
      this.game.scene.add('World', scene, true);
    });
    if (this.dead) return;
    this.connect();
    this.waiting.forEach((f) => f());
    this.waiting = [];
  }

  /** Pointer events on the canvas, as plan points for the desk. */
  private connect(): void {
    const scene = this.scene!;
    const desk = this.desk!;
    const rig = scene.rig;
    this.pointer = new PointerRig(this.game.canvas, {
      tap: (p, touch) => { desk.touch = touch; desk.tap(rig.toPlan(p)); },
      dragStart: (p, map) => !map && desk.dragStart(rig.toPlan(p)),
      drag: (p) => desk.drag(rig.toPlan(p)),
      dragEnd: (p) => desk.dragEnd(rig.toPlan(p)),
      dragCancel: () => desk.dragCancel(),
      pan: (dx, dy) => rig.pan(dx, dy),
      fling: (vx, vy) => rig.fling(vx, vy),
      zoom: (at, f, instant) => rig.zoomAt(at, f, instant),
      hover: (p) => { desk.hover = p ? rig.toPlan(p) : null; if (p) desk.touch = false; },
      press: () => rig.stop(),
    });
    this.pointer.enabled = this.inputOn;
    this.game.canvas.style.touchAction = 'none';
    if (this.opts.probe) installProbe(scene, desk);
  }

  private after(): void {
    this.desk?.draw();
    if (this.scene?.rig.moved) this.cb.onCamera?.();
    this.cb.onDrawn?.();
  }

  /** Run now, or once the world is up. */
  private when(f: (s: WorldScene, d: Desk) => void): void {
    if (this.pointer && this.scene && this.desk) f(this.scene, this.desk);
    else this.waiting.push(() => { if (this.scene && this.desk) f(this.scene, this.desk); });
  }

  get tool(): WorldPort['tool'] { return this.desk?.tool ?? null; }
  get ghost(): WorldPort['ghost'] { return this.desk?.ghost ?? null; }
  get selection(): WorldPort['selection'] { return this.scene?.selection ?? null; }

  setCallbacks(c: WorldCallbacks): void { this.cb = c; this.desk?.setCallbacks(c); }

  setCity(city: CityView): void {
    this.city = city;
    const swap = (): void => this.when((s, d) => { if (this.city === city) { s.setCity(city); d.reset(); } });
    if (!this.pics || this.pics.style === city.def.style) return swap();
    this.pics.add(city.def.style).then(swap, (e: unknown) => console.error('[inkroad] the city\'s pictures did not load', e));
  }

  setTool: WorldPort['setTool'] = (tool, o) => this.when((_s, d) => d.setTool(tool, o));

  setOverlay(o: Overlay): void {
    this.overlay = o;
    this.when((s) => { s.overlay = o; });
  }

  select: WorldPort['select'] = (sel) => this.when((_s, d) => d.select(sel));
  handleEvents: WorldPort['handleEvents'] = (list) => this.when((s) => s.play(list));
  confirm: WorldPort['confirm'] = () => this.desk?.confirm() ?? null;
  cancel(): void { this.desk?.cancel(); }
  undoStop(): void { this.desk?.undo(); }
  startFlyover: WorldPort['startFlyover'] = (node, move = null, level = 1) => this.when((_s, d) => d.startFlyover(node, move, level));
  focusOn: WorldPort['focusOn'] = (at, o = {}) => this.when((s) => s.rig.focus(at, o.zoom, o.ms ?? FOCUS_MS));
  overview(ms = FOCUS_MS): void { this.when((s) => s.rig.overview(ms)); }

  zoomBy(factor: number): void {
    this.when((s) => s.rig.zoomAt({ x: this.parent.clientWidth / 2, y: this.parent.clientHeight / 2 }, factor));
  }

  point: WorldPort['point'] = (at) => this.when((s) => s.fx.point(at));
  setInsets: WorldPort['setInsets'] = (i) => this.when((s) => s.rig.setInsets(i));

  setInputEnabled(on: boolean): void {
    this.inputOn = on;
    if (!this.pointer) return;
    this.pointer.enabled = on;
    if (!on) this.pointer.release();
  }

  screenOf: WorldPort['screenOf'] = (at) => this.scene?.rig.toCss(at) ?? null;
  worldOf: WorldPort['worldOf'] = (css) => this.scene?.rig.toPlan(css) ?? css;

  carAt: WorldPort['carAt'] = (slot, uid) => this.scene?.carAt(slot, uid) ?? null;
  talker: WorldPort['talker'] = () => this.scene?.talker() ?? null;

  screenshot(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.game.renderer.snapshot((img) => {
        if (!(img instanceof HTMLImageElement)) { reject(new Error('InkRoad: no screenshot')); return; }
        fetch(img.src).then((r) => r.blob()).then(resolve, reject);
      });
    });
  }

  resize(): void {
    if (this.dead) return;
    const s = measure(this.parent);
    const w = Math.ceil(s.w * s.dpr);
    const h = Math.ceil(s.h * s.dpr);
    if (w !== this.game.scale.width || h !== this.game.scale.height) this.game.scale.resize(w, h);
    if (Math.abs(this.game.scale.zoom - 1 / s.dpr) > 1e-6) this.game.scale.setZoom(1 / s.dpr);
    this.scene?.fit(s.w, s.h, s.dpr);
  }

  setPaused(on: boolean): void {
    if (this.dead) return;
    if (on) this.game.loop.sleep();
    else this.game.loop.wake();
  }

  destroy(): void {
    this.dead = true;
    this.watch.disconnect();
    this.pointer?.destroy();
    this.game.destroy(true);
  }
}
