import type { GameEvent, GameHost, OfferPlace } from '@16bitink/game-sdk';
import { SoundBoard } from '../audio/sound';
import { chapterOf, CHAPTERS, FREE_LEVELS, gate, hasLevel, installPaidLevels, levelFor, TOTAL_LEVELS, type GateContext } from '../level/index';
import { surroundKey } from '../render/art';
import type { PlayOutcome } from '../scenes/PlayScene';
import type { LevelDef } from '../sim/types';
import { clear, showBoot, showCard } from '../ui/dom';
import { showMap } from '../ui/mapScreen';
import { showMenu } from '../ui/menu';
import { showResults, type NextStep } from '../ui/results';
import { showWardrobe } from '../ui/wardrobe';
import { AccountSync } from './accountSync';
import { DailyFlow } from './dailyFlow';
import { longDate } from './dates';
import { nextMilestone, wornLook } from './milestones';
import { PlayRun, shellsFor, type RunSpec } from './playRun';
import { cleared, parseSave, recordClear, recordDailyPearl, SAVE_KEY, serializeSave, shellCount, type SaveData } from './save';
import { Stage } from './stage';

/**
 * The whole game: boot → menu → coast map → level → win/lose card → map, the
 * daily (dailyFlow.ts) and Skip's looks. Progress is saved through
 * host.storage after every change and to the account (host.progress) soon
 * after; paid levels come from host.loadContent.
 */
export class App {
  private readonly root: HTMLElement;
  private readonly screen: HTMLElement;
  private readonly card: HTMLElement;
  private readonly hudEl: HTMLElement;
  private readonly stage: Stage;
  private readonly sound: SoundBoard;
  private readonly account: AccountSync;
  private readonly pulled: Promise<void>;
  readonly daily: DailyFlow | null;
  private save: SaveData;
  private note: string | null;
  private paidError: string | null = null;
  private run: PlayRun | null = null;
  private mapChapter = 0;
  private days = 0;
  /** Bumped on every screen change, so a late answer never redraws a screen that's gone. */
  private view = 0;
  private bootDone!: () => void;
  readonly ready = new Promise<void>((resolve) => {
    this.bootDone = resolve;
  });

  constructor(parent: HTMLElement, private readonly host: GameHost) {
    this.root = document.createElement('div');
    this.root.className = 'ikb';
    this.root.innerHTML = '<div class="stage"></div><div class="hud" hidden></div><div class="screen"></div><div class="screen card" hidden></div>';
    parent.appendChild(this.root);
    const [stageEl, hud, screen, card] = Array.from(this.root.children) as HTMLElement[];
    this.hudEl = hud!;
    this.screen = screen!;
    this.card = card!;
    const loaded = parseSave(this.read());
    this.save = loaded.save;
    this.note = loaded.problem ? 'Your saved game could not be read, so it starts fresh.' : null;
    this.account = new AccountSync(host.progress, { current: () => this.save, adopt: (s) => this.adopt(s) });
    this.pulled = this.account.pull();
    this.sound = new SoundBoard(!this.save.sound);
    this.root.addEventListener('click', (e) => {
      if ((e.target as Element | null)?.closest?.('button')) this.sound.click();
    });
    this.daily = host.daily ? new DailyFlow(host.daily, this.dailyApp()) : null;
    const bar = showBoot(this.screen);
    host.loading?.progress(0, 'Skip is waxing the raft…');
    this.stage = this.makeStage(stageEl!, bar);
  }

  /** The Phaser stage; if the browser can't draw it, the player sees why (and the site's loader hides). */
  private makeStage(el: HTMLElement, bar: (f: number) => void): Stage {
    const host = this.host;
    try {
      return this.tryStage(el, bar);
    } catch (e) {
      console.error('[inkbrick] could not start drawing', e);
      host.loading?.failed?.(`stage: ${e instanceof Error ? e.message : String(e)}`);
      host.loading?.ready();
      showCard(this.card, 'InkBrick can’t draw here', ['This browser could not start its graphics (WebGL).', 'Try another browser, or turn on hardware acceleration.'], [{ label: 'Back', run: () => host.onExit() }]);
      throw e;
    }
  }

  private tryStage(el: HTMLElement, bar: (f: number) => void): Stage {
    const host = this.host;
    return new Stage(el, {
      progress: (f) => {
        bar(f);
        host.loading?.progress(f * 0.9, 'Skip is waxing the raft…');
      },
      loadError: (what) => console.error(`[inkbrick] could not load ${what}`),
      ready: () => void this.booted(),
    });
  }

  private async booted(): Promise<void> {
    await Promise.all([this.loadPaid(), this.pulled, this.refreshDays()]);
    const ch = this.host.daily?.challenge;
    if (ch && this.daily) void this.daily.open(ch.date);
    else this.menu();
    requestAnimationFrame(() => {
      this.host.loading?.ready();
      this.bootDone();
    });
  }

  private async refreshDays(): Promise<void> {
    if (this.daily) this.days = await this.daily.fetchTotal(this.days);
  }

  private async loadPaid(): Promise<void> {
    if (!this.host.unlocked) return;
    try {
      installPaidLevels(await this.host.loadContent());
      this.paidError = null;
    } catch (e) {
      console.error('[inkbrick] failed to load the full game', e);
      this.paidError = 'Could not load the full game. Check your connection and try again.';
    }
  }

  // Saving -------------------------------------------------------------

  private read(): string | null {
    try {
      return this.host.storage?.getItem(SAVE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private adopt(s: SaveData): void {
    this.save = s;
    this.store();
  }

  private persist(s: SaveData): void {
    this.save = s;
    this.store();
    this.account.schedule();
  }

  private store(): void {
    try {
      this.host.storage?.setItem(SAVE_KEY, serializeSave(this.save));
    } catch (e) {
      console.warn('[inkbrick] could not save', e);
    }
  }

  private track(e: GameEvent): void {
    try {
      this.host.track?.(e);
    } catch {
      // A stat must never break the game.
    }
  }

  private buy(where: OfferPlace): void {
    this.account.flush();
    this.host.onBuy(where);
  }

  private get gateCtx(): GateContext {
    return { cleared: (n) => cleared(this.save, n), owned: this.host.unlocked, allOpen: this.host.allLevelsOpen === true };
  }

  private endRun(): void {
    this.run?.destroy();
    this.run = null;
  }

  private looks(): RunSpec['looks'] {
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(location.search);
      if (q.has('raft') || q.has('trail')) return { raft: q.has('raft') ? `raft-${q.get('raft')}` : '', trail: q.has('trail') ? `trail-${q.get('trail')}` : '' };
    }
    return { raft: wornLook(this.save.raft, this.days), trail: wornLook(this.save.trail, this.days) };
  }

  private toggleSound(): boolean {
    this.persist({ ...this.save, sound: !this.save.sound });
    this.sound.setMuted(!this.save.sound);
    return this.save.sound;
  }

  // Screens ------------------------------------------------------------

  menu(): void {
    this.endRun();
    clear(this.card);
    const view = ++this.view;
    const today = this.daily?.today() ?? null;
    const draw = (playedToday: boolean): void => showMenu(this.screen, {
      today, playedToday, totalDays: this.days, next: nextMilestone(this.days), sound: this.save.sound, note: this.note, started: shellCount(this.save) > 0,
    }, {
      play: () => {
        this.note = null;
        this.map(this.firstOpenChapter());
      },
      daily: () => void this.daily?.open(this.daily.today()),
      calendar: () => void this.daily?.calendar(),
      looks: () => this.wardrobe(() => this.menu()),
      sound: () => {
        this.toggleSound();
        this.menu();
      },
      exit: () => {
        this.account.flush();
        this.host.onExit();
      },
    });
    draw(false);
    void this.daily?.playedToday().then((p) => p && view === this.view && draw(true));
  }

  /** The chapter with the first level still to clear (where Continue goes). */
  private firstOpenChapter(): number {
    for (let n = 1; n <= TOTAL_LEVELS; n++) if (!cleared(this.save, n)) return chapterOf(n).index;
    return CHAPTERS.length - 1;
  }

  map(chapter = this.mapChapter): void {
    this.endRun();
    clear(this.card);
    this.view++;
    this.mapChapter = chapter;
    const ch = CHAPTERS[chapter]!;
    if (!this.host.unlocked && ch.first > FREE_LEVELS) this.track({ type: 'offer_view', where: 'map' });
    showMap(this.screen, {
      chapter, gate: (n) => gate(n, this.gateCtx), shells: (n) => this.save.shells[String(n)], name: (n) => levelFor(n)?.name ?? null,
      owned: this.host.unlocked, price: this.host.price ?? null, today: this.daily?.today() ?? null,
    }, {
      level: (n) => this.open(n),
      chapter: (i) => this.map(i),
      buy: () => this.buy('map'),
      daily: () => void this.daily?.open(this.daily.today()),
      menu: () => this.menu(),
    });
  }

  /** Opens a level through the gate: play it, or a card saying why not. */
  open(n: number): void {
    const g = gate(n, this.gateCtx);
    const ch = chapterOf(n);
    const close = (): void => clear(this.card);
    if (g === 'play') return this.play(levelFor(n)!);
    if (g === 'locked') return showCard(this.card, `Level ${n}`, [`Clear Level ${n - 1} first.`], [{ label: 'OK', run: close }], close);
    if (g === 'paywall') {
      this.track({ type: 'offer_view', where: 'locked' });
      return showCard(this.card, ch.name, [`Levels ${FREE_LEVELS + 1}–${TOTAL_LEVELS} are the full game.`, 'One-time purchase, no ads.'], [
        { label: 'Not now', run: close },
        { label: `Unlock${this.host.price ? ` · ${this.host.price}` : ''}`, run: () => this.buy('locked'), kind: 'gold' },
      ], close);
    }
    if (this.host.unlocked && this.paidError && n > FREE_LEVELS) {
      return showCard(this.card, ch.name, [this.paidError], [{ label: 'Try again', run: () => void this.loadPaid().then(() => this.map()), kind: 'go' }], close);
    }
    showCard(this.card, `Level ${n}`, ['Still being made. New levels arrive as free updates.'], [{ label: 'OK', run: close }], close);
  }

  private startRun(level: LevelDef, spec: Omit<RunSpec, 'level' | 'looks' | 'surround' | 'soundOn'>, end: (o: PlayOutcome) => void, quit: (o: PlayOutcome | null, retry: boolean) => void): void {
    this.endRun();
    clear(this.screen);
    clear(this.card);
    this.view++;
    this.run = new PlayRun({ stage: this.stage, hudRoot: this.hudEl, cardRoot: this.card, sound: this.sound },
      { ...spec, level, looks: this.looks(), surround: surroundKey(level.chapter || 1), soundOn: this.save.sound },
      { end, retry: (o) => quit(o, true), leave: (o) => quit(o, false), toggleSound: () => this.toggleSound() });
  }

  play(level: LevelDef): void {
    this.mapChapter = chapterOf(level.number).index;
    const ref = { level: level.id, n: level.number, name: level.name };
    this.track({ ...ref, type: 'level_start' });
    this.startRun(level, {
      hud: { title: `Level ${level.number}`, subtitle: level.name, par: level.par, tip: level.tip ?? null, beat: null, cheats: this.host.cheats === true, level },
      leaveLabel: 'Map',
    }, (o) => this.results(level, o), (o, retry) => {
      this.track({ ...ref, type: 'level_end', result: 'quit', seconds: Math.round(o?.seconds ?? 0), progress: retry ? 'restarted' : 'left' });
      if (retry) this.play(level);
      else this.map();
    });
  }

  private nextStep(n: number, won: boolean): NextStep {
    const g = gate(n + 1, { ...this.gateCtx, cleared: (k) => cleared(this.save, k) });
    if (n === FREE_LEVELS && !this.host.unlocked && won) {
      this.track({ type: 'offer_view', where: 'free_end' });
      return { kind: 'offer', label: `Full game${this.host.price ? ` · ${this.host.price}` : ''}` };
    }
    if (n >= TOTAL_LEVELS) return { kind: 'none', note: 'Brumm is beaten and the coves are open. Well played!' };
    if (g === 'play') return { kind: 'level', n: n + 1 };
    if (g === 'coming' && won) return { kind: 'none', note: 'More levels are on their way as free updates.' };
    return { kind: 'none', note: null };
  }

  private results(level: LevelDef, o: PlayOutcome): void {
    const n = level.number;
    const got = shellsFor(o, level);
    const had = this.save.shells[String(n)] ?? [false, false, false];
    if (o.result === 'win' || got.some(Boolean)) this.persist(recordClear(this.save, n, got, o.seconds));
    this.track({ level: level.id, n, name: level.name, type: 'level_end', result: o.result, seconds: Math.round(o.seconds), score: got.filter(Boolean).length,
      ...(o.result === 'lose' ? { cause: 'out of hearts' } : {}), progress: `${o.breakIn !== null ? 'broke in' : 'never broke in'}, ${o.heartsLost} hearts lost` });
    const next = this.nextStep(n, o.result === 'win');
    showResults(this.card, {
      title: `Level ${n}: ${level.name}`, won: o.result === 'win', seconds: o.seconds, breakIn: o.breakIn,
      shells: this.save.shells[String(n)] ?? got, fresh: got.map((g, i) => g && !had[i]), best: this.save.best[String(n)] ?? null, next,
      level, share: o.share ?? 0,
    }, {
      retry: () => this.play(level),
      map: () => this.map(),
      next: () => (next.kind === 'level' ? this.open(next.n) : this.buy('free_end')),
    });
  }

  wardrobe(back: () => void): void {
    const draw = (): void => showWardrobe(this.card, { totalDays: this.days, raft: wornLook(this.save.raft, this.days), trail: wornLook(this.save.trail, this.days) }, {
      pick: (slot, key) => {
        this.persist({ ...this.save, [slot]: key });
        draw();
      },
      back,
    });
    draw();
  }

  private dailyApp(): ConstructorParameters<typeof DailyFlow>[1] {
    return {
      screen: this.screen, card: this.card, owned: this.host.unlocked, price: this.host.price ?? null,
      playDaily: (level, date, beat, done) => {
        const ref = { level: `daily-${date}`, n: 0, name: level.name };
        this.track({ ...ref, type: 'level_start' });
        this.startRun(level, {
          hud: { title: 'Daily', subtitle: `${longDate(date)} · ${level.name}`, par: level.par, tip: level.tip ?? null, beat, cheats: this.host.cheats === true, level },
          leaveLabel: 'Menu',
        }, (o) => {
          this.track({ ...ref, type: 'level_end', result: o.result, seconds: Math.round(o.seconds) });
          done(o);
        }, (o, retry) => {
          this.track({ ...ref, type: 'level_end', result: 'quit', seconds: Math.round(o?.seconds ?? 0) });
          if (retry) void this.daily?.open(date);
          else this.menu();
        });
      },
      setTotalDays: (n) => (this.days = n),
      totalDays: () => this.days,
      menu: () => this.menu(),
      looks: (back) => this.wardrobe(back),
      buy: (w) => this.buy(w),
      track: (e) => this.track(e),
      endRun: () => this.endRun(),
      foundPearl: (date) => this.persist(recordDailyPearl(this.save, date)),
      pearls: () => this.save.pearls,
    };
  }

  /** Dev autoplay (dev/main.ts): where the raft should go now, CSS px, or null when nothing is playing. */
  devAimX(): number | null {
    return this.run?.devAimX() ?? null;
  }

  /** Dev pages: straight into level n. */
  devPlay(n: number): void {
    const l = levelFor(n);
    if (l && hasLevel(n)) this.play(l);
    else this.open(n);
  }

  destroy(): void {
    this.account.flush();
    this.endRun();
    this.sound.destroy();
    this.stage.destroy();
    this.root.remove();
  }
}
