import type { GameHost, OfferPlace } from '@16bitink/game-sdk';
import { isPhone } from '@16bitink/game-sdk';
import { SoundBoard } from '../audio/sound';
import { YEARS_PER_CITY } from '../sim/constants';
import type { CityDef } from '../sim/types';
import { CITY_META, statusOf } from '../ui/cityMeta';
import { musicUrl } from '../audio/music';
import { showDesk } from '../ui/desk';
import { Router } from '../ui/dom';
import { COVER_HTML, hideEsc, showEsc } from '../ui/escMenu';
import { showMenu } from '../ui/menu';
import { Play } from '../ui/play';
import { DEFS_HTML, injectStyles } from '../ui/styles';
import type { PlayActs, Speed, UiEnv } from '../ui/types';
import { AccountSync } from './accountSync';
import type { Deps } from './deps';
import { bindKeys } from './input';
import { citySave, parseSave, savedYears, SAVE_KEY, serializeSave, type SaveData } from './save';
import { Session } from './session';

/**
 * The whole game: menu, city desk, a city session, the Esc menu, saves and
 * account sync, sound, pause on blur, the "turn your phone" cover.
 */
export class App {
  private readonly root: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly screen: HTMLElement;
  private readonly screenRouter: Router;
  private readonly escLayer: HTMLElement;
  private readonly escRouter: Router;
  private readonly cover: HTMLElement;
  private readonly play: Play;
  private readonly sound: SoundBoard;
  private readonly account: AccountSync;
  private readonly defs = new Map<number, CityDef>();
  private session: Session | null = null;
  private save: SaveData;
  private note: string | null;
  private deskWall: number | null = null;
  private escSpeed: Speed | null = null;
  private raf = 0;
  private lastMs = 0;
  private phone = false;
  private readonly offKeys: () => void;
  readonly ready: Promise<void>;

  constructor(parent: HTMLElement, private readonly host: GameHost, private readonly deps: Deps) {
    injectStyles(parent.ownerDocument);
    this.root = document.createElement('div');
    this.root.className = 'ikr';
    this.root.innerHTML = `${DEFS_HTML}<div class="stage"></div><div class="screen" hidden></div><div class="cards" hidden style="z-index:30"></div><div class="cover"></div>`;
    parent.appendChild(this.root);
    const [, stage, screen, esc, cover] = Array.from(this.root.children) as HTMLElement[];
    this.stage = stage!;
    this.screen = screen!;
    this.escLayer = esc!;
    this.cover = cover!;
    this.cover.innerHTML = COVER_HTML;
    this.screenRouter = new Router(this.screen);
    this.escRouter = new Router(this.escLayer);
    const loaded = parseSave(this.read());
    this.save = loaded.save;
    this.note = loaded.problem ? 'Your saved game could not be read, so it starts fresh.' : null;
    this.account = new AccountSync(host.progress, { current: () => this.save, adopt: (s) => this.adopt(s) });
    this.sound = new SoundBoard(!this.save.sound);
    this.play = new Play(this.root, () => this.env(), () => this.nextCityName(this.session?.cityNo ?? 1), (i) => this.rereadLetter(i), host.storage ?? null);
    this.root.addEventListener('click', (e) => {
      const b = (e.target as Element | null)?.closest?.('button');
      if (!b) return;
      this.sound.play('click');
      b.blur(); // so Space pauses instead of pressing it again
    });
    this.offKeys = bindKeys({
      setSpeed: (s) => this.session?.setSpeed(s), hasCity: () => this.session !== null && this.escSpeed === null,
      togglePause: () => this.togglePause(), menu: () => this.openEsc(), mute: () => this.toggleSound(),
      back: () => this.session?.world.back() ?? false,
    });
    addEventListener('resize', this.layout);
    addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onBlur);
    this.layout();
    this.ready = this.boot();
    this.raf = requestAnimationFrame(this.loop);
  }

  // Boot, save ----------------------------------------------------------

  private async boot(): Promise<void> {
    this.host.loading?.progress(0.2, 'Unrolling the maps...');
    for (const d of this.deps.content.free()) this.defs.set(d.number, d);
    await Promise.all([this.loadPaid(), this.account.pull()]);
    this.menu();
    requestAnimationFrame(() => this.host.loading?.ready());
  }

  private async loadPaid(): Promise<void> {
    if (!this.host.unlocked) return;
    try {
      for (const d of this.deps.content.installPaid(await this.host.loadContent())) this.defs.set(d.number, d);
    } catch (e) {
      console.error('[inkroad] failed to load the full game', e);
      this.note = 'Could not load the full game. Check your connection and reload.';
    }
  }

  private read(): string | null {
    try {
      return this.host.storage?.getItem(SAVE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private store(): void {
    try {
      this.host.storage?.setItem(SAVE_KEY, serializeSave(this.save));
    } catch (e) {
      console.warn('[inkroad] could not save', e);
    }
  }

  private adopt(s: SaveData): void {
    this.save = s;
    this.store();
  }

  private setSave(s: SaveData): void {
    this.save = s;
    this.store();
    this.account.schedule();
  }

  // Env for the UI ------------------------------------------------------

  private env(): UiEnv {
    const s = this.session!;
    return {
      city: s.city, world: s.world, acts: this.acts, phone: this.phone, speed: s.speed, owned: this.host.unlocked,
      price: this.host.price ?? null, reached: citySave(this.save, s.cityNo).reached, cityNo: s.cityNo, savedYears: savedYears(citySave(this.save, s.cityNo)), card: this.play.cards.kind,
    };
  }

  private readonly acts: PlayActs = {
    apply: (c) => this.session!.apply(c),
    setSpeed: (s) => this.session?.setSpeed(s),
    menu: () => this.openEsc(),
    next: () => this.session?.next(),
    retryYear: (y) => this.session?.retryYear(y),
    toDesk: () => this.desk(),
    buy: (w) => this.buy(w),
    sfx: (id) => this.sound.playNamed(id),
    pace: (hold, rate) => this.session?.pace(hold, rate),
    slow: () => this.session?.setSpeed(1),
    toast: (text, who) => this.play.toast(text, who),
  };

  private nextCityName(no: number): string | null {
    const next = CITY_META[no];
    return next && statusOf(next, [...this.defs.keys()], this.host.unlocked) === 'paid' ? next.name : null;
  }

  private rereadLetter(i: number): void {
    const s = this.session;
    const l = s?.city.letters[i];
    if (s && l) this.play.cards.show('letter', { letter: { l, n: i + 1 }, then: () => this.play.cards.show(s.city.phase === 'review' ? 'review' : 'yearStart') });
  }

  private buy(where: OfferPlace): void {
    this.account.flush();
    this.host.onBuy(where);
  }

  // Screens -------------------------------------------------------------

  menu(): void {
    this.leaveCity();
    const last = this.save.last;
    showMenu(this.screen, this.screenRouter, {
      started: last !== null, sound: this.save.sound, note: this.note,
      resume: last ? `${this.defs.get(last.city)?.name ?? 'City'}, year ${(last.city - 1) * YEARS_PER_CITY + last.year}` : null,
    }, {
      cont: () => (last ? this.start(last.city, last.year, true) : this.start(1, 1)),
      desk: () => this.desk(),
      sound: () => {
        this.toggleSound();
        this.menu();
      },
      exit: () => {
        this.account.flush();
        this.host.onExit();
      },
    });
  }

  desk(): void {
    this.leaveCity();
    const yearNames: Record<number, readonly string[]> = {};
    for (const [no, d] of this.defs) yearNames[no] = d.years.map((y) => y.name);
    showDesk(this.screen, this.screenRouter, {
      save: this.save, owned: this.host.unlocked, price: this.host.price ?? null, sound: this.save.sound, yearNames, wall: this.deskWall, allOpen: this.host.allLevelsOpen === true, note: this.note,
    }, {
      play: (c, y) => this.start(c, y),
      buy: () => this.buy('locked'),
      wall: (c) => {
        this.deskWall = c;
        if (c) this.host.track?.({ type: 'offer_view', where: 'locked' });
        this.desk();
      },
      menu: () => this.menu(),
      sound: () => {
        this.toggleSound();
        this.desk();
      },
    });
  }

  private start(cityNo: number, year: number, useAuto = false): void {
    const def = this.defs.get(cityNo);
    if (!def) {
      this.deskWall = cityNo;
      return this.desk();
    }
    this.note = null;
    this.leaveCity();
    this.deskWall = null;
    this.screen.hidden = true;
    hideEsc(this.escLayer);
    const c = citySave(this.save, cityNo);
    const y = this.host.allLevelsOpen ? Math.min(year, 10) : Math.min(year, Math.max(1, c.reached), 10);
    this.session = new Session({
      host: this.host, deps: this.deps, root: this.root, stage: this.stage, play: this.play, sound: this.sound,
      save: () => this.save, setSave: (s) => this.setSave(s), toDesk: () => this.desk(), nextCityName: (n) => this.nextCityName(n),
    }, def, cityNo, y, useAuto);
    this.play.show(true);
    this.sound.playMusic(musicUrl(def.style));
    this.layout();
  }

  private leaveCity(): void {
    this.session?.destroy();
    this.session = null;
    this.sound.playMusic(null);
    this.escSpeed = null;
    hideEsc(this.escLayer);
    this.play.show(false);
    this.screen.hidden = false;
  }

  // Esc menu, sound, pause ---------------------------------------------

  private openEsc(): void {
    const s = this.session;
    if (!s) return;
    if (this.escSpeed !== null) return this.closeEsc();
    this.escSpeed = s.speed;
    s.setSpeed(0);
    this.renderEsc(s);
  }

  private renderEsc(s: Session): void {
    showEsc(this.escLayer, this.escRouter, this.save.sound, !this.play.guide.off, {
      guide: () => {
        this.play.guide.setOff(!this.play.guide.off);
        this.renderEsc(s);
      },
      resume: () => this.closeEsc(),
      restart: () => {
        this.closeEsc();
        s.retryYear(s.city.year);
      },
      sound: () => {
        this.toggleSound();
        this.renderEsc(s);
      },
      desk: () => this.desk(),
    });
  }

  private closeEsc(): void {
    hideEsc(this.escLayer);
    if (this.escSpeed !== null) this.session?.setSpeed(this.escSpeed);
    this.escSpeed = null;
  }

  private togglePause(): void {
    this.session?.togglePause();
  }

  private toggleSound(): void {
    this.setSave({ ...this.save, sound: !this.save.sound });
    this.sound.setMuted(!this.save.sound);
  }

  private readonly onBlur = (): void => {
    if (document.visibilityState === 'hidden' || !document.hasFocus()) this.session?.hold(true);
  };

  private readonly layout = (): void => {
    const w = this.root.clientWidth || innerWidth;
    const h = this.root.clientHeight || innerHeight;
    this.phone = isPhone({ width: w, height: h });
    this.root.classList.toggle('phone', this.phone);
    const upright = this.phone && h > w;
    this.cover.classList.toggle('on', upright);
    if (upright) this.session?.hold(true);
  };

  private readonly loop = (ms: number): void => {
    const dt = this.lastMs ? (ms - this.lastMs) / 1000 : 0;
    this.lastMs = ms;
    try {
      this.session?.frame(dt);
      this.play.update(ms);
    } catch (e) {
      console.error('[inkroad] frame failed', e);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Dev: the open session (window.__app.session). */
  get current(): Session | null {
    return this.session;
  }

  /** Dev and tests: open a city and year straight away. */
  devPlay(cityNo: number, year: number): void {
    this.start(cityNo, year);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.offKeys();
    removeEventListener('resize', this.layout);
    removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onBlur);
    this.account.flush();
    this.session?.destroy();
    this.sound.destroy();
    this.root.remove();
  }
}
