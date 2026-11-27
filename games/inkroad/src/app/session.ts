import type { GameHost } from '@16bitink/game-sdk';
import type { SoundBoard } from '../audio/sound';
import type { CityDef, CityView, Command, Letter, Phase, Quote } from '../sim/types';
import { seasonLine, shownYear } from '../ui/format';
import type { Play } from '../ui/play';
import { LoadingSheet } from '../ui/veils';
import type { Speed } from '../ui/types';
import type { Deps } from './deps';
import { citySeed } from './deps';
import { citySave, recordAuto, recordYearEnd, recordYearStart, type SaveData } from './save';
import { Tracker } from './tracker';
import type { WorldPort } from './worldPort';

export const MAX_FRAME_S = 0.1;
const NIGHT_MS = 2000;

export interface SessionIo {
  readonly host: GameHost;
  readonly deps: Deps;
  readonly root: HTMLElement;
  readonly stage: HTMLElement;
  readonly play: Play;
  readonly sound: SoundBoard;
  save(): SaveData;
  setSave(s: SaveData): void;
  toDesk(): void;
  /** Name of the next city to sell at the end of this one, or null. */
  nextCityName(cityNo: number): string | null;
}

/** One open city: the sim, its world, the speed, and what each phase shows and saves. */
export class Session {
  city!: CityView;
  world!: WorldPort;
  speed: Speed = 1;
  readonly tracker: Tracker;
  private phase: Phase | null = null;
  private held = false;
  private letters: Letter[] = [];
  private problem: string | null = null;
  private readonly sheet: LoadingSheet;
  private dusk: ReturnType<typeof setTimeout> | undefined;
  private lastSpeed: Speed = 1;
  /** The guide's wishes: the day stands still, or runs at another pace. */
  private guided = { hold: false, rate: 1 };

  constructor(private readonly io: SessionIo, readonly def: CityDef, readonly cityNo: number, year: number, useAuto = false) {
    this.tracker = new Tracker(io.host.track);
    const snap = this.snapshotOf(year, useAuto);
    this.build(snap, year);
    if (year > 1 && snap === null) this.problem = `Year ${shownYear({ def, year })} had no saved start, so the city surveyed its way there.`;
    const sheet = new LoadingSheet(io.root, cityNo, def.name);
    this.sheet = sheet;
    this.world = io.deps.createWorld(io.stage, this.city, {
      onHint: (t) => { io.play.guide.noteHint(t); io.play.toast(t); }, onProgress: (f) => sheet.progress(f), onDrawn: () => io.play.pinned(),
      onBuilt: (cmd, q) => this.built(cmd, q),
    });
    this.world.ready.then(() => sheet.done(), () => sheet.remove());
  }

  /** Something drawn was built. A flyover is one job: its tool goes back in the drawer. */
  private built(cmd: Command, q: Quote): void {
    if (!q.ok) return;
    this.io.sound.play('thump');
    if (cmd.t !== 'flyover') return;
    this.world.setTool(null);
    this.world.select(null);
  }

  private snapshotOf(year: number, useAuto = false): unknown | null {
    const c = citySave(this.io.save(), this.cityNo);
    if (useAuto && c.auto && c.auto.year === year) return c.auto.snap;
    return year > 1 ? (c.years[String(year)] ?? null) : null;
  }

  /** (Re)creates the city. A snapshot the city refuses means year 1 of this city, never a crash. */
  private build(snap: unknown | null, year = 1): void {
    const seed = citySeed(this.cityNo);
    try {
      this.city = snap === null && year > 1
        ? this.io.deps.content.cityAtYear(this.def, seed, year)
        : this.io.deps.content.createCity(this.def, seed, snap);
    } catch (e) {
      console.error('[inkroad] could not load the saved year; starting the city again', e);
      this.problem = 'That saved year could not be read, so the city starts again from year 1.';
      this.city = this.io.deps.content.createCity(this.def, seed, null);
    }
    this.phase = null;
    this.letters = [];
  }

  get cardOpen(): boolean {
    return this.phase !== 'day';
  }

  setSpeed(s: Speed): void {
    this.speed = s;
    if (s === 0) return;
    this.lastSpeed = s;
    this.held = false;
  }

  /** The guide stops the day while a step is read, or runs it faster to the point. */
  pace(hold: boolean, rate: number): void {
    if (this.guided.hold !== hold || this.guided.rate !== rate) this.guided = { hold, rate };
  }

  /** Space: stop, or go on at the speed it had. */
  togglePause(): void {
    this.setSpeed(this.speed === 0 ? this.lastSpeed : 0);
  }

  /** Blur or a hidden tab: stop the clock. */
  hold(on: boolean): void {
    this.held = on;
    if (on && this.speed !== 0) {
      this.speed = 0;
      this.io.play.toast('Paused');
    }
  }

  retryYear(year: number): void {
    this.tracker.leave();
    this.build(this.snapshotOf(year), year);
    this.world.setCity(this.city);
  }

  apply(cmd: Command): Quote {
    const q = this.city.apply(cmd);
    if (!q.ok) {
      this.io.sound.play('error');
      if (q.why) this.io.play.toast(q.why);
    }
    return q;
  }

  next(): void {
    this.setSpeed(this.speed === 0 ? this.lastSpeed : this.speed);
    this.apply({ t: 'next' });
  }

  /** One frame of real time: advance the day, pass events on, notice a new phase. */
  frame(dt: number): void {
    const step = Math.min(MAX_FRAME_S, Math.max(0, dt));
    const running = this.city.phase === 'day' && this.speed > 0 && !this.held && !this.guided.hold;
    if (running) {
      this.tracker.tick(step);
      this.city.advance(step * this.speed * this.guided.rate);
    }
    const events = this.city.drainEvents();
    if (events.length) {
      this.io.sound.onEvents(events);
      this.world.handleEvents(events);
      for (const e of events) {
        if (e.t === 'letter') this.letters.push(e.letter);
        else if (e.t === 'toast') this.io.play.toast(e.text, e.who);
      }
    }
    this.io.sound.setTraffic(running ? this.city.cars.count : 0);
    if (this.city.phase !== this.phase) this.onPhase(this.city.phase);
  }

  private onPhase(p: Phase): void {
    const was = this.phase;
    this.phase = p;
    this.world.setInputEnabled(p === 'day');
    clearTimeout(this.dusk);
    if (p === 'day') {
      this.io.play.cards.hide();
      this.io.play.dusk.lift();
    } else if (was === 'day' && p !== 'yearStart') this.nightfall(p);
    else this.card(p);
  }

  /** The end of a day: two seconds of night over the lit city, then the card. */
  private nightfall(p: Phase): void {
    this.world.select(null);
    this.world.setTool(null);
    this.io.play.dusk.fall(this.city.season + this.city.year);
    this.io.sound.play('night');
    this.dusk = setTimeout(() => this.card(p), NIGHT_MS);
  }

  private card(p: Phase): void {
    if (p === 'yearStart') this.yearStart();
    else if (p === 'review') this.review();
    else if (p === 'yearEnd') this.yearEnd();
    else if (p === 'replaced') this.replaced();
    else this.cityDone();
  }

  private yearStart(): void {
    const { city, io } = this;
    this.persist((s) => recordYearStart(s, this.cityNo, city.year, safeSave(city)));
    this.tracker.start(this.tracker.ref(this.cityNo, city.year, city.def.years[city.year - 1]?.name ?? `Year ${city.year}`));
    io.sound.play('chime');
    if (this.problem) io.play.toast(this.problem);
    this.problem = null;
    io.play.cards.show('yearStart');
  }

  private review(): void {
    const { city } = this;
    this.persist((s) => recordAuto(s, this.cityNo, city.year, city.season, safeSave(city)));
    this.tracker.progress(`${seasonLine(city.year, city.season)}, approval ${Math.round(city.approval)}`);
    this.showLetters();
  }

  /** New Council letters first, one after another, then the review card. */
  private showLetters(): void {
    const l = this.letters.shift();
    if (!l) return this.io.play.cards.show('review');
    this.io.play.cards.show('letter', { letter: { l, n: this.city.letters.length - this.letters.length }, then: () => this.showLetters() });
  }

  private yearEnd(): void {
    const { city } = this;
    const plates = city.plates[city.year - 1] ?? 0;
    this.persist((s) => recordYearEnd(s, this.cityNo, city.year, plates));
    this.tracker.end('win', plates, undefined, `${plates} of 3 plates`);
    this.io.play.cards.show('yearEnd');
  }

  private replaced(): void {
    const { city } = this;
    this.tracker.end('lose', undefined, city.replacedWhy?.text.slice(0, 80), seasonLine(city.year, city.season));
    this.io.play.cards.show('replaced');
  }

  private cityDone(): void {
    const next = this.io.nextCityName(this.cityNo);
    if (next && !this.io.host.unlocked) this.io.host.track?.({ type: 'offer_view', where: 'free_end' });
    this.io.play.cards.show('cityDone');
  }

  private persist(fn: (s: SaveData) => SaveData): void {
    this.io.setSave(fn(this.io.save()));
  }

  destroy(): void {
    clearTimeout(this.dusk);
    this.sheet.remove();
    this.io.play.dusk.lift();
    this.tracker.leave();
    this.world.destroy();
    this.io.play.show(false);
    this.io.sound.setTraffic(0);
  }
}

/** The city's snapshot, or null if it will not produce one (the save then just skips it). */
function safeSave(city: CityView): unknown {
  try {
    return city.save();
  } catch (e) {
    console.warn('[inkroad] could not snapshot the city', e);
    return null;
  }
}
