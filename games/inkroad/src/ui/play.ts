import type { Selection } from '../app/worldPort';
import { Cards } from './cards';
import { CarBubble } from './carBubble';
import { div, Dirty, esc, Router } from './dom';
import { opensMonth, pct, signed } from './format';
import { GhostBar, HintBar, KindBar } from './ghostBar';
import { goalInfo } from '../guide/goalInfo';
import type { Store } from '../guide/progress';
import { Advisor } from './guide/advisor';
import { GuideUi } from './guide/controller';
import { TopBar } from './hud';
import { JamBadges } from './jamBadges';
import { OFFICIALS } from './cards/shell';
import { pic } from './pics';
import { SelectionPanel } from './selection';
import { Toolbar } from './toolbar';
import { Tray } from './tray';
import type { PlayActs, UiEnv } from './types';
import { Dusk } from './veils';

export const INSET_EVERY_MS = 400;
const COVER_PAD = 90; // css px: room for the arrows
const UNCOVER_MS = 320;
const BOTTOM = 70;
const GOAL_TIP_MS = 12_000;
const BAR_NAMES = [['trips', 'Trips'], ['parking', 'Parking'], ['cost', 'Cost'], ['streets', 'Streets']] as const;

/** Everything on screen while a city is open: HUD pieces, the selection panel, the guide, the advisor and the card layer. */
export class Play {
  readonly cards: Cards;
  private readonly hud: HTMLElement;
  private readonly top: TopBar;
  private readonly toolbar: Toolbar;
  private readonly tray: Tray;
  private readonly ghost: GhostBar;
  private readonly hint: HintBar;
  private readonly kinds: KindBar;
  private readonly sel: SelectionPanel;
  readonly guide: GuideUi;
  private readonly advisor: Advisor;
  private readonly badges: JamBadges;
  private readonly bubble: CarBubble;
  readonly dusk: Dusk;
  private readonly pop: HTMLElement;
  private readonly projects: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly dirty = new Dirty();
  private lastInsetMs = 0;
  private popOpen: 'bars' | 'goal' | null = null;
  private lastSel: Selection = null;
  /** What the tool and overlay columns cover, CSS px. */
  private sides = { left: 0, right: 0 };

  constructor(private readonly root: HTMLElement, private readonly env: () => UiEnv, nextCity: () => string | null, openLetter: (i: number) => void, store: Store | null = null) {
    this.hud = div(root, 'hud');
    const router = new Router(this.hud);
    const acts: PlayActs = this.proxyActs();
    const world = (): UiEnv['world'] => this.env().world;
    const live = div(this.hud, 'live');
    this.bubble = new CarBubble(div(live, 'carbubble'), world, () => this.sides);
    this.badges = new JamBadges(div(live, 'tags'), router, world, () => this.env().acts.sfx('click'));
    this.top = new TopBar(div(this.hud, 'bar paper'), router, acts, () => this.togglePop('bars'), () => this.togglePop('goal'));
    this.toolbar = new Toolbar(div(this.hud, 'tools paper'), router, (t) => this.env().world?.setTool(t));
    this.tray = new Tray(div(this.hud, 'ovs paper'), div(this.hud, 'ticker paper'), div(this.hud, 'env paper'), router, world, openLetter);
    this.ghost = new GhostBar(div(this.hud, 'ghostbar paper'), router, world, () => this.env().acts.sfx('build'), (why) => {
      this.env().acts.sfx('error');
      this.toast(why);
    });
    this.hint = new HintBar(div(this.hud, 'hintbar paper'), router, world);
    this.kinds = new KindBar(div(this.hud, 'kinds paper'), router, world);
    this.sel = new SelectionPanel(div(this.hud, 'sel paper'), router, world, () => ({ city: this.env().city, acts: this.env().acts, world: this.env().world }));
    this.projects = div(this.hud, 'projects');
    router.add({ project: (v) => { const p = this.env().city.projects.find((x) => x.id === Number(v)); const at = p?.line[0]; if (at) this.env().world?.focusOn(at); } });
    router.add({ goalshow: () => this.showGoal() });
    this.pop = div(this.hud, 'pop paper');
    this.pop.hidden = true;
    this.toastEl = div(this.hud, 'toast paper');
    this.toastEl.hidden = true;
    this.dusk = new Dusk(root);
    this.cards = new Cards(div(root, 'cards'), env, nextCity);
    this.guide = new GuideUi(root, env, store);
    this.advisor = new Advisor(this.hud, router, env, (t) => this.guide.tip(t));
    this.hud.hidden = true;
    if (typeof addEventListener === 'function') {
      addEventListener('keydown', (e) => {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON')) return;
        this.key(e);
      });
    }
  }

  private proxyActs(): PlayActs {
    const a = (): PlayActs => this.env().acts;
    return { apply: (c) => a().apply(c), setSpeed: (s) => { if (s > 0) this.guide.released(); a().setSpeed(s); }, menu: () => a().menu(), next: () => a().next(), retryYear: (y) => a().retryYear(y), toDesk: () => a().toDesk(), buy: (w) => a().buy(w), sfx: (i) => a().sfx(i), pace: (h, r) => a().pace(h, r), slow: () => a().slow(), toast: (t, w) => a().toast(t, w) };
  }

  show(on: boolean): void {
    this.hud.hidden = !on;
    if (!on) {
      this.cards.hide();
      this.guide.hide();
    }
  }

  /** Enter finishes the road being drawn, then builds it; Backspace drops its last point. Not while a card is up. */
  key(e: { readonly key: string; preventDefault(): void }): void {
    const world = this.env().world;
    if (this.hud.hidden || this.cards.kind !== null || !world?.tool || document.querySelector('.card.esc')) return;
    if (e.key === 'Enter') { if (!world.finish()) this.ghost.build(); }
    else if (e.key === 'Backspace') { e.preventDefault(); world.undoStop(); }
  }

  /** A line at the top; `who` (an official) shows their face. Picking the zone tool says where its price is set. */
  toast(text: string, who = ''): void {
    this.toastEl.innerHTML = `${who in OFFICIALS ? pic(`portrait-${who}`) : ''}<span>${esc(text)}</span>`;
    this.toastEl.hidden = false;
    this.toastEl.style.animation = 'none';
    void this.toastEl.offsetWidth;
    this.toastEl.style.animation = '';
  }

  /** The dial opens its numbers on a phone; the goal chip says what the goal is. */
  private togglePop(what: 'bars' | 'goal'): void {
    this.popOpen = this.popOpen === what || (what === 'bars' && !this.env().phone) ? null : what;
    this.pop.hidden = !this.popOpen;
    this.dirty.changed('pop', '');
  }

  private showGoal(): void {
    const g = goalInfo(this.env().city);
    this.togglePop('goal');
    const at = g.at;
    if (at) this.guide.tip({ who: 'sulo', why: g.text, say: () => g.how, target: () => ({ t: 'spot', at, r: g.r }), until: () => false, look: [at], ms: GOAL_TIP_MS });
  }

  update(nowMs: number): void {
    if (this.hud.hidden) return;
    const env = this.env();
    const { city, world } = env;
    this.root.classList.toggle('hassel', !!world?.selection && world.selection.kind !== 'car' && world.tool !== 'flyover' && world.tool !== 'underpass');
    this.root.classList.toggle('hasghost', !!world?.ghost);
    this.root.classList.toggle('carding', this.cards.kind !== null);
    this.top.update(city, env.speed);
    this.toolbar.render(this.guide.tools(city.tools), city.newTools);
    this.toolbar.mark(world?.tool ?? null);
    if (this.dirty.changed('zone', world?.tool === 'zone') && world?.tool === 'zone') this.toast('The zone charge is set at the night review', 'miko');
    this.tray.update(city.complaints, city.letters, world?.overlay ?? 'none', nowMs, !!city.special?.ageing);
    this.ghost.update(world?.ghost ?? null, city.money);
    this.hint.update(world?.tool ?? null, !!world?.ghost, world?.touch ?? false, world?.points ?? 0);
    this.kinds.update(world?.tool ?? null, city.parkKinds, !!world?.ghost);
    const sel = world?.selection ?? null;
    const lifting = world?.tool === 'flyover' || world?.tool === 'underpass'; // the arrows are what matters then
    this.sel.update(sel?.kind === 'car' || lifting ? null : sel, city, nowMs);
    this.badges.update(city, nowMs);
    this.bubble.update(city, nowMs, this.cards.kind !== null || sel !== null || world?.tool != null || env.speed === 0);
    this.guide.parkKind = this.kinds.current;
    this.guide.update(nowMs);
    this.advisor.update(nowMs, this.guide.busy);
    this.root.classList.toggle('advising', this.advisor.showing);
    this.projectChips(city);
    this.popover(env);
    this.insets(nowMs, sel !== this.lastSel);
    if (sel !== this.lastSel) this.uncover(sel);
    this.lastSel = sel;
  }

  /** A junction picked under its own panel glides out into the open. */
  private uncover(sel: Selection): void {
    const world = this.env().world;
    if (!world || sel?.kind !== 'junction' || !sel.at) return;
    const p = world.screenOf(sel.at);
    const r = this.root.getBoundingClientRect();
    const panel = this.hud.querySelector<HTMLElement>('.sel')!.getBoundingClientRect();
    if (p && p.x > panel.left - r.left - COVER_PAD && p.y < panel.bottom - r.top + COVER_PAD) world.focusOn(sel.at, { ms: UNCOVER_MS });
  }

  /** The map moved: what is pinned to it follows, in the same frame. */
  pinned(): void {
    if (this.hud.hidden) return;
    this.badges.draw();
    this.bubble.draw();
    this.guide.pinned();
  }

  private projectChips(city: UiEnv['city']): void {
    const list = city.projects;
    this.projects.hidden = list.length === 0;
    if (!this.dirty.changed('projects', `${list.map((p) => `${p.id}:${p.left}`).join(',')}|${city.phase}:${city.month}`)) return;
    this.projects.innerHTML = list.map((p) => `<button class="chip" data-act="project" data-v="${p.id}">${p.level > 0 ? 'Flyover' : 'Underpass'}: opens in <b>${opensMonth(city, p.left)}</b></button>`).join('');
  }

  private popover(env: UiEnv): void {
    this.pop.hidden = !this.popOpen;
    if (!this.popOpen) return;
    const { city } = env;
    if (this.popOpen === 'goal') return this.goalPop(city);
    const key = `${city.bars.trips}|${city.bars.parking}|${city.bars.cost}|${city.bars.streets}|${city.goal.text}`;
    if (!this.dirty.changed('pop', key)) return;
    this.pop.innerHTML = `<div class="col">${BAR_NAMES.map(([k, n]) => `<div class="kv"><span>${n}</span><b>${pct(city.bars[k] / 100)}</b></div>`).join('')}<div class="kv"><span>Next month</span><b>${signed(city.forecast.nextMonth)}</b></div><hr><p class="small">${esc(city.goal.text)}</p></div>`;
  }

  private goalPop(city: UiEnv['city']): void {
    const g = goalInfo(city);
    if (!this.dirty.changed('pop', `${g.text}|${g.at?.x ?? ''}`)) return;
    this.pop.innerHTML = `<div class="col goalpop"><h3>This year's goal</h3><p><b>${esc(g.text)}</b></p><p>${esc(g.how)}</p>${g.at ? '<button class="btn" data-act="goalshow">Show me where</button>' : ''}</div>`;
  }

  /** Tells the world how much of the screen the HUD covers, so "focus" centres in the free part. */
  private insets(nowMs: number, now: boolean): void {
    const world = this.env().world;
    if (!world || (!now && nowMs - this.lastInsetMs < INSET_EVERY_MS)) return;
    this.lastInsetMs = nowMs;
    const r = this.root.getBoundingClientRect();
    const tools = this.hud.querySelector<HTMLElement>('.tools')!.getBoundingClientRect();
    const bar = this.hud.querySelector<HTMLElement>('.bar')!.getBoundingClientRect();
    const ovs = this.hud.querySelector<HTMLElement>('.ovs')!.getBoundingClientRect();
    const sel = this.hud.querySelector<HTMLElement>('.sel')!;
    const edge = ovs.width > 0 ? ovs.left : r.right; // the guide may hide the views
    this.sides = { left: Math.max(0, tools.right - r.left), right: r.right - edge };
    this.root.style.setProperty('--toolsw', `${Math.round(tools.right - r.left)}px`);
    world.setInsets({
      top: Math.round(bar.bottom - r.top), left: Math.round(Math.max(0, tools.right - r.left)),
      right: Math.round(r.right - (sel.hidden ? edge : sel.getBoundingClientRect().left)), bottom: Math.max(BOTTOM, Math.round(this.guide.bottomCover)),
    });
  }
}
