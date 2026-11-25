import Phaser from 'phaser';
import { CELL } from '../sim/constants';
import type { CityEvent, CityView, Pt, ToolId } from '../sim/types';
import { CarLayer } from '../render/cars/carLayer';
import { ParkedCars } from '../render/cars/parkedCars';
import { DEPTH } from '../render/depths';
import { smooth } from '../render/geom';
import { Ground, type GroundScale } from '../render/ground/chunks';
import { tunnelMask } from '../render/ground/tunnels';
import { Arrows } from '../render/overlay/arrows';
import { FlowLayer } from '../render/overlay/flow';
import { Fx } from '../render/overlay/fx';
import { JamLayer } from '../render/overlay/jams';
import { GhostLayer } from '../render/overlay/ghostLayer';
import { FootprintLayer } from '../render/overlay/footprints';
import { Glows } from '../render/overlay/glows';
import { Lights } from '../render/overlay/lights';
import { nightOf } from '../render/daylight';
import { Marks } from '../render/overlay/marks';
import { SelectLayer } from '../render/overlay/selectLayer';
import { ZoneLayer } from '../render/overlay/zone';
import type { Pictures } from '../render/pictures';
import { TILT } from '../render/projection';
import { PAPER } from '../render/style';
import { Boats } from '../render/upright/boats';
import { Decks } from '../render/upright/decks';
import { Ferries } from '../render/upright/ferries';
import { LotsView } from '../render/upright/lots';
import { UprightAtlas } from '../render/upright/pieces';
import { Scenery } from '../render/upright/scenery';
import { Stops } from '../render/upright/stops';
import { Tolls } from '../render/upright/tolls';
import { Things } from '../render/upright/things';
import { Camera } from './camera';
import type { Overlay, Selection } from './port';
import { sinks } from './tools/make';

/**
 * The city drawn: builds every layer from a CityView, follows its changes and
 * moves the Phaser camera. It knows nothing of tools or the DOM; the Desk
 * (desk.ts) drives it.
 */
const MAX_FRAME_S = 0.1;
const MAX_DAY_STEP_S = 0.5;
const FAR = { from: 0.56, to: 0.42 } as const; // CSS px per plan px: cars fade into flow lines
const SINK = 0.13; // how faint standing things get with a tool in hand
const SINK_RATE = 7;
const ARROWS_EVERY_S = 1;
const BAKE_PER_FRAME = 1;
const GROUND_PAD = 8;
const POP_AFTER_MS = 40; // the new signs are standing by then
const ROOF = 4;
const EDGE_CSS = 70; // a bubble's car must be this far inside the screen
const STUCK = 4;
const TALK_ANGER = 0.08;
const TALK_TOP = 170; // css px: there is room over the car
const TALK_AWAY = 150; // plan px from a junction, so the bubble does not cover it
const VIEW_PAD = 150; // plan px drawn past the screen, for tall things

export interface SceneHooks {
  /** Before anything is drawn. */
  frame(dt: number): void;
  /** After the layers are up to date: ghosts. */
  after(dt: number): void;
  ready(): void;
}

/** The crossroads the city lives round: the junction with most arms, nearest the open lots. */
export function openingView(city: Pick<CityView, 'junctions' | 'lots' | 'def'>): Pt {
  const open = city.lots.filter((l) => l.level > 0);
  const n = Math.max(1, open.length);
  const mid = { x: open.reduce((s, l) => s + (l.gx + l.w / 2) * CELL, 0) / n, y: open.reduce((s, l) => s + (l.gy + l.h / 2) * CELL, 0) / n };
  const far = (j: { x: number; y: number }): number => Math.hypot(j.x - mid.x, j.y - mid.y);
  const real = city.junctions.filter((j) => !j.ramp && j.arms.length > 2);
  const best = [...real].sort((a, b) => b.arms.length - a.arms.length || far(a) - far(b))[0];
  return best ? { x: best.x, y: best.y } : mid;
}

export class WorldScene extends Phaser.Scene {
  readonly rig = new Camera();
  ground!: Ground;
  cars!: CarLayer;
  arrows!: Arrows;
  ghosts!: GhostLayer;
  private footprints!: FootprintLayer;
  fx!: Fx;
  jams!: JamLayer;
  overlay: Overlay = 'none';
  selection: Selection = null;
  tool: ToolId | null = null;
  frames: number[] = [];
  private things!: Things;
  private lots!: LotsView;
  private scenery!: Scenery;
  private decks!: Decks;
  private stops!: Stops;
  private boats!: Boats;
  private parked!: ParkedCars;
  private flow!: FlowLayer;
  private nightfall!: Lights;
  private glows!: Glows;
  private marks!: SelectLayer;
  private words!: Marks;
  private tolls!: Tolls;
  private ferries!: Ferries;
  private zone!: ZoneLayer;
  private version = -1;
  private groundLots: CityView['lots'] | null = null;
  private groundParks: CityView['carParks'] | null = null;
  private year = -1;
  private arrowsIn = 0;
  private sink = 1;
  private lastClock = 0;
  private talks = 0;
  private readonly pose = { x: 0, y: 0, z: 0, a: 0, len: 14, wid: 7, slowing: false };
  private dpr = 1;
  private up = false;

  constructor(private readonly pics: Pictures, public city: CityView, private readonly hooks: SceneHooks, private readonly groundScale: GroundScale) {
    super({ key: 'World' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PAPER);
    this.cars = new CarLayer(this, this.pics, { ground: DEPTH.cars, upright: DEPTH.upright });
    this.glows = new Glows(this, DEPTH.lights - 1);
    this.build();
    this.nightfall = new Lights(this, DEPTH.lights, DEPTH.night);
    this.marks = new SelectLayer(this, DEPTH.flat + 6);
    this.zone = new ZoneLayer(this, DEPTH.flat + 5, DEPTH.marks - 1);
    this.words = new Marks(this, DEPTH.marks - 1);
    this.arrows = new Arrows(this, DEPTH.marks);
    this.ghosts = new GhostLayer(this, DEPTH.ghost);
    this.footprints = new FootprintLayer(this, DEPTH.marks);
    this.jams = new JamLayer(this, DEPTH.flat + 4);
    this.fx = new Fx(this, DEPTH.fx, {
      wave: (node) => this.jams.wave(node),
      carsNear: (at, reach, n) => this.cars.near(at.x, at.y, reach, n),
      popThings: (at, reach) => this.time.delayedCall(POP_AFTER_MS, () => this.things.popNear(at.x, at.y, reach)),
    });
    this.rig.setMap(this.ground.land.map);
    this.rig.jump(openingView(this.city), this.rig.startZoom);
    this.ground.bakeBase();
    this.up = true;
    this.hooks.ready();
  }

  /** Everything that depends on which city this is. */
  private build(): void {
    this.ground = new Ground(this, this.pics, this.city, this.groundScale, DEPTH.ground);
    const atlas = new UprightAtlas(this.textures, this.pics, this.city.def);
    this.boats = new Boats(this, atlas, this.city, this.ground.roads, DEPTH.shadow + 1);
    this.things = new Things(this, atlas, { shadow: DEPTH.shadow, upright: DEPTH.upright });
    this.lots = new LotsView(this, this.things);
    this.scenery = new Scenery(this.things, this.city);
    this.decks = new Decks(this, this.things, this.pics, DEPTH.upright);
    this.stops = new Stops(this.things);
    this.tolls = new Tolls(this, DEPTH.upright);
    this.ferries = new Ferries(this, this.pics, DEPTH.shadow + 2);
    this.parked = new ParkedCars(this, this.cars, DEPTH.cars - 1);
    this.flow = new FlowLayer(this, DEPTH.flat);
    this.version = -1;
    this.groundLots = null;
    this.follow();
  }

  /** Swap the city. The same map keeps its land, its trees and the camera. */
  setCity(city: CityView): void {
    const old = this.city.def.id;
    const same = city.def.id === old;
    this.city = city;
    if (!this.up) return;
    this.arrows.hide();
    this.selection = null;
    this.cars.clear();
    if (same) { this.version = -1; this.follow(); return; }
    this.ground.destroy();
    this.boats.clear();
    this.decks.clear();
    this.tolls.clear();
    this.ferries.clear();
    this.lots.clear();
    this.parked.clear();
    this.things.clear();
    this.flow.destroy();
    for (const key of this.textures.getTextureKeys()) if (key.startsWith(`up-${old}-`)) this.textures.remove(key);
    this.build();
    this.rig.setMap(this.ground.land.map);
    this.ground.bakeBase();
    this.rig.jump(openingView(city), this.rig.startZoom);
  }

  /** Notice what changed in the city since the last frame. */
  private follow(): void {
    const c = this.city;
    const net = c.version !== this.version;
    const blocks = c.lots !== this.groundLots || c.year !== this.year || (c.carParks !== this.groundParks && c.carParks.length !== this.groundParks?.length);
    this.lots.sync(c);
    this.parked.sync(c);
    if (net || blocks) {
      this.version = c.version;
      this.groundLots = c.lots;
      this.year = c.year;
      this.ground.refresh(c);
      const mask = tunnelMask(this.ground.roads.roads);
      this.cars.setHidden((x, y) => mask.hides(x, y));
      this.scenery.refresh(c, this.ground.roads);
      this.flow.dirty();
      this.glows.rebuild(c, this.scenery.lampSpots);
    }
    this.decks.refresh(c);
    this.groundParks = c.carParks;
    this.stops.refresh(c, this.ground.roads);
    this.tolls.refresh(c, this.ground.roads);
    this.ferries.refresh(c);
  }

  fit(w: number, h: number, dpr: number): void {
    this.dpr = dpr;
    this.rig.setSize({ w, h });
  }

  play(list: readonly CityEvent[]): void {
    if (!this.up) return;
    if (list.some((e) => e.t === 'built')) this.follow(); // the effects need the new shapes
    this.fx.play(list, this.city, this.ground.roads);
  }

  override update(_t: number, deltaMs: number): void {
    const dt = Math.min(MAX_FRAME_S, deltaMs / 1000);
    this.frames.push(deltaMs);
    if (this.frames.length > 240) this.frames.shift();
    this.hooks.frame(dt);
    this.follow();
    this.rig.update(dt);
    this.applyCamera();
    const view = this.rig.view(VIEW_PAD);
    this.ground.update(this.rig.view(GROUND_PAD), this.rig.zoom * this.dpr, BAKE_PER_FRAME);
    this.things.cull(view);
    const far = smooth((FAR.from - this.rig.zoom) / (FAR.from - FAR.to));
    this.cars.update(this.city.cars, this.city.clock, dt, view, 1 - far);
    this.jams.update(this.dayStep(), dt, this.city, view);
    this.flow.update(dt, this.city, this.ground.roads, this.overlay, far, view);
    this.nightfall.update(dt, this.city, this.cars, 1 - far);
    this.glows.update(nightOf(this.city.hour));
    this.marks.update(dt, this.city, this.selection, this.tool === 'bus' || this.tool === 'tram' || this.tool === 'metro' || this.tool === 'boat');
    this.words.update(dt, this.city, this.overlay, this.rig.zoom);
    this.updateArrows(dt);
    this.boats.update(dt);
    this.ferries.update(dt);
    this.zone.update(this.city, this.tool, this.rig.zoom);
    this.sinkStanding(dt);
    this.fx.update(dt, this.rig.zoom);
    this.hooks.after(dt);
    this.ghosts.update(dt, this.rig.zoom);
  }

  /** How much of the day has passed since the last frame. */
  private dayStep(): number {
    const step = Math.min(MAX_DAY_STEP_S, Math.max(0, this.city.clock - this.lastClock));
    this.lastClock = this.city.clock;
    return step;
  }

  private applyCamera(): void {
    const cam = this.cameras.main;
    const z = this.rig.zoom * this.dpr;
    cam.setZoom(z);
    cam.setScroll(this.rig.x - cam.width / 2, this.rig.y - cam.height / 2);
    this.nightfall.frame(this.rig.x, this.rig.y, cam.width / z, cam.height / z);
  }

  private updateArrows(dt: number): void {
    this.arrows.update(dt, this.rig.zoom);
    if (this.arrows.node === null) return;
    this.arrowsIn -= dt;
    if (this.arrowsIn > 0) return;
    this.arrowsIn = ARROWS_EVERY_S;
    this.arrows.refresh(this.city);
  }

  private sinkStanding(dt: number): void {
    const goal = sinks(this.tool) ? SINK : this.overlay !== 'none' ? 0.5 : 1;
    this.sink += (goal - this.sink) * (1 - Math.exp(-SINK_RATE * dt));
    if (Math.abs(goal - this.sink) < 0.004) this.sink = goal;
    this.things.setFade(this.sink);
    this.footprints.update(this.city, this.sink);
  }

  /** A car's roof in CSS px, while it is on screen. */
  carAt(slot: number, uid: number): Pt | null {
    if (!this.up || !this.cars.holds(slot, uid) || !this.cars.pose(slot, this.pose)) return null;
    const p = this.rig.toCss(this.pose, Math.max(0, this.pose.z) + ROOF);
    return this.rig.onScreen(p, EDGE_CSS) ? p : null;
  }

  /** Someone who has waited a while and can be seen: a different one each time. */
  talker(): { readonly slot: number; readonly uid: number } | null {
    const c = this.city.cars;
    const stuck: number[] = [];
    for (let i = 0; i < c.count; i++) if (c.alive[i] === 1 && c.speed[i]! < STUCK && c.anger[i]! > TALK_ANGER && (this.carAt(i, c.uid[i]!)?.y ?? 0) > TALK_TOP) stuck.push(i);
    const clear = stuck.filter((i) => this.ground.roads.joins.every((j) => j.arms.length < 3 || Math.hypot(j.j.x - c.x[i]!, j.j.y - c.y[i]!) > TALK_AWAY));
    const pick = clear.length > 0 ? clear : stuck;
    const slot = pick[this.talks++ % Math.max(1, pick.length)];
    return slot === undefined ? null : { slot, uid: c.uid[slot]! };
  }

  /** Where the pen's ellipse of a plan circle would be: the ground's squash. */
  static readonly squash = TILT;

  centre(): Pt {
    return { x: this.rig.x, y: this.rig.y / TILT };
  }
}
