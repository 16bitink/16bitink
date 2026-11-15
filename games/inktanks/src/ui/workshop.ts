import { armourAgainst, damageTaken } from '../logic/damage';
import { DRIVE_FAMILIES, FAMILY_CHAPTER, familyName, GUN_FAMILIES, HULL_FAMILIES, HULLS, MAX_MK, MK_COLOUR, partLabel, roman, slotOf, withPart, type Family, type Slot } from '../logic/parts';
import { perksOf, rankOf, RANKS } from '../logic/rank';
import { bpAmount } from './blueprint';
import { fireRate, RESEARCH_MAX, RESEARCH_STEP, researchSteps, tankStats, type ResearchLine } from '../logic/stats';
import { fit, GADGET_MK_COST, gadgetMkOf, LINES_BY_SLOT, MK_COST, MK_RANK, ownedPart, protoOf, type NextMk, raiseGadget, raiseMk, research, researchCost, UNLOCK_COST, unlock, type Progress, type Result } from '../logic/workshop';
import { gadgetText, nextTierText } from '../logic/gadgetTiers';
import { GADGET_NAME } from '../logic/match/gadgets';
import { GADGETS, type GadgetKind } from '../logic/match/types';
import { gadgetIconUrl } from '../scenes/mission/hud';
import { esc, render } from './dom';
import { mkBadge, mkChip, partIcon, partName, tankCanvas } from './tankArt';
import { fitValid, setWingman, wingmanLoadoutFor, wingmanLock, wingmanPart, withFamily } from '../logic/wingmanFit';
import { WINGMAN_NAMES } from '../logic/match/wingmen';
import { rankLine } from './rankArt';

/**
 * The workshop between missions: your tank in the middle with its stats,
 * a tab per slot (gun, hull, drive) listing that slot's families with
 * their blueprints, and the buttons to unlock a family, raise its Mk (rank-gated)
 * or research its lines. Every change goes through src/logic/workshop.ts.
 */
const SLOTS: readonly { slot: Slot; name: string; families: readonly Family[] }[] = [
  { slot: 'gun', name: 'Gun', families: GUN_FAMILIES },
  { slot: 'hull', name: 'Hull', families: HULL_FAMILIES },
  { slot: 'drive', name: 'Drive', families: DRIVE_FAMILIES },
];
const LINE_NAMES: Readonly<Record<ResearchLine, string>> = { damage: 'Damage', reload: 'Reload', armour: 'Armour', hp: 'HP', speed: 'Speed', grip: 'Grip' };
const rankName = (id: string): string => RANKS.find((r) => r.id === id)?.name ?? id;
const famName = familyName;
const PCT = Math.round(RESEARCH_STEP * 100);

/** The workshop's tabs: a slot's families, the gadgets, or the wingmen's tanks. */
export type WorkshopTab = Slot | 'gadgets' | 'wingmen';
type Tab = WorkshopTab;

/** A later chapter's family (the Mortar) shows once you've found its blueprints, not as a locked card from the start. */
const listed = (p: Progress, f: Family): boolean => !FAMILY_CHAPTER[f] || p.unlocked.includes(f) || (p.intelTotal[f] ?? 0) > 0 || protoOf(p, f) !== null;

export interface WorkshopActions {
  readonly change: (p: Progress) => void;
  readonly back: () => void;
  readonly backLabel: string;
  /** The tab to open on (default the gun). */
  readonly tab?: WorkshopTab;
}

export function showWorkshop(root: HTMLElement, start: Progress, a: WorkshopActions): void {
  let p = start;
  let tab: Tab = a.tab ?? 'gun';
  let note = '';
  // Only the first draw rises in; a redraw after a click (even a refused one) swaps in place, keeping the scroll.
  let first = true;
  const apply = (r: Result, done: string): void => {
    if (!r.ok) {
      note = r.reason;
    } else {
      p = r.progress;
      note = done;
      a.change(p);
    }
    draw();
  };
  const draw = (): void => {
    const scroll = root.scrollTop;
    render(root, 'dark', html(p, tab, note, a.backLabel, first), {
      back: a.back,
      tab: (el) => {
        tab = el.dataset.slot as Tab;
        note = '';
        draw();
      },
      unlock: (el) => apply(unlock(p, el.dataset.f as Family), `${famName(el.dataset.f as Family)} unlocked`),
      mk: (el) => {
        const f = el.dataset.f as Family;
        const r = raiseMk(p, f);
        // The fitted part of that family is raised with it.
        const fitted = r.ok && p.loadout[slotOf(f)].family === f && !p.loadout[slotOf(f)].proto ? fit(r.progress, withPart(r.progress.loadout, ownedPart(r.progress, f)!)) : r;
        apply(fitted, `${famName(f)} raised to Mk ${roman(r.ok ? r.progress.mk[f] ?? 1 : 1)}`);
      },
      fit: (el) => {
        const f = el.dataset.f as Family;
        apply(fit(p, withPart(p.loadout, ownedPart(p, f) ?? { family: f, mk: 1 })), `${famName(f)} fitted`);
      },
      gmk: (el) => {
        const g = el.dataset.g as GadgetKind;
        const r = raiseGadget(p, g);
        apply(r, `${GADGET_NAME[g]} raised to Mk ${roman(r.ok ? gadgetMkOf(r.progress, g) : 1)}`);
      },
      fitproto: (el) => {
        const q = protoOf(p, el.dataset.f as Family);
        if (q) apply(fit(p, withPart(p.loadout, q)), `Prototype ${famName(q.family)} Mk ${roman(q.mk)} fitted`);
      },
      wfam: (el) => {
        const i = Number(el.dataset.i);
        const f = el.dataset.f as Family;
        apply(setWingman(p, i, withFamily(p, i, f)), `${WINGMAN_NAMES[i]}: ${famName(f)} fitted`);
      },
      wmirror: (el) => {
        const i = Number(el.dataset.i);
        apply(setWingman(p, i, null), `${WINGMAN_NAMES[i]} matches your tank again`);
      },
      research: (el) => apply(research(p, el.dataset.f as Family, el.dataset.line as ResearchLine), `${LINE_NAMES[el.dataset.line as ResearchLine]} researched`),
    });
    root.querySelector('.pic')!.appendChild(tankCanvas(p.loadout, innerHeight > 560 ? 2 : 1));
    for (const el of root.querySelectorAll<HTMLElement>('.wpic')) el.appendChild(tankCanvas(wingmanLoadoutFor(p, Number(el.dataset.i)), innerHeight > 560 ? 1.5 : 1));
    root.scrollTop = scroll;
    first = false;
  };
  draw();
}

function statsHtml(p: Progress): string {
  const s = tankStats(p.loadout, p.research);
  const dps = damageTaken(s.gun.damage, s.gun.family, 'halftracks', armourAgainst(HULLS.medium, s.gun.family)) * s.gun.shots * fireRate(s.gun);
  const rows: [string, number][] = [['HP', s.maxHp], ['Speed', s.speed], ['Damage/s', dps], ['Range', s.gun.range]];
  return rows.map(([k, v]) => `<span class="dimt">${k}</span><span>${Math.round(v)}</span>`).join('');
}

function html(p: Progress, tab: Tab, note: string, backLabel: string, rise: boolean): string {
  const rank = rankOf(p.xp);
  const tabs = SLOTS.map((s) => `<button class="btn small${s.slot === tab ? ' gold' : ''}" data-act="tab" data-slot="${s.slot}">${s.name}: ${esc(famName(p.loadout[s.slot].family))}</button>`).join('')
    + `<button class="btn small${tab === 'gadgets' ? ' gold' : ''}" data-act="tab" data-slot="gadgets">Gadgets</button>`
    + `<button class="btn small${tab === 'wingmen' ? ' gold' : ''}" data-act="tab" data-slot="wingmen">Wingmen</button>`;
  const cards = tab === 'wingmen' ? WINGMAN_NAMES.map((_, i) => wingmanCard(p, i)).join('') : tab === 'gadgets' ? GADGETS.map((g) => gadgetCard(p, g)).join('') : SLOTS.find((s) => s.slot === tab)!.families.filter((f) => listed(p, f)).map((f) => famCard(p, f)).join('');
  return `
    <div class="panel sheet${rise ? ' rise' : ''}">
      <div class="row spread"><span class="t36 gold">Workshop</span>${rankLine(rank, ` <span class="t12 dimt">${p.xp} XP</span>`)}<button class="btn small" data-act="back">${esc(backLabel)}</button></div>
      <div class="explain">${tab === 'wingmen' ? 'Your wingmen fit your parts one Mk below yours. Pick a gun, hull and drive for each from the families you’ve unlocked.' : tab === 'gadgets' ? 'Gadgets earn their own blueprints: one each time you use it, more for each enemy it hits, and spare charges from crates when you’re full.' : 'Destroy enemy tanks to collect blueprints of their parts, then spend them here to upgrade yours. Each part has its own blueprints.'}</div>
      <div class="cols">
        <div class="col" style="flex:0 0 auto;align-items:center"><div class="pic"></div><div class="intelrow t12">${statsHtml(p)}</div></div>
        <div class="col" style="flex:1 1 auto">
          <div class="row">${tabs}</div>
          <div class="slots${tab === 'wingmen' ? ' wings' : ''}">${cards}</div>
          <div class="t12 ${note.startsWith('needs') || note.includes('not') ? 'red' : 'green'}">${esc(note) || '&nbsp;'}</div>
        </div>
      </div>
    </div>`;
}

/** A cost button: bright when payable, dimmed with "need N more" when short, locked with the rank when gated. */
function costBtn(f: Family, label: string, cost: number, have: number, attrs: string, lockedBy: string | null, extra = ''): string {
  const bp = bpAmount(cost, false, f);
  if (lockedBy) return `<button class="btn small dim" ${attrs} data-blocked="1"><span>${label} ${bp}</span><span class="why2"><i class="lock"></i>needs ${esc(lockedBy)}</span></button>`;
  if (have < cost) return `<button class="btn small dim" ${attrs}><span>${label} ${extra}${bp}</span><span class="why2">need ${cost - have} more</span></button>`;
  return `<button class="btn small gold" ${attrs}><span>${label} ${extra}${bp}</span></button>`;
}

function famCard(p: Progress, f: Family): string {
  const have = p.intel[f] ?? 0;
  const unlocked = p.unlocked.includes(f);
  const onTank = p.loadout[slotOf(f)];
  const fitted = onTank.family === f && !onTank.proto;
  const mk = p.mk[f] ?? 1;
  const acts: string[] = [];
  let goal = UNLOCK_COST;
  if (!unlocked) {
    acts.push(costBtn(f, 'Unlock', UNLOCK_COST, have, `data-act="unlock" data-f="${f}"`, null));
  } else {
    if (!fitted) acts.push(`<button class="btn small go" data-act="fit" data-f="${f}">Fit</button>`);
    if (mk < MAX_MK) {
      const next = (mk + 1) as NextMk;
      const rankOk = perksOf(p.xp).maxMk >= next;
      goal = MK_COST[next];
      acts.push(costBtn(f, mkChip(next), MK_COST[next], have, `data-act="mk" data-f="${f}"`, rankOk ? null : rankName(MK_RANK[next])));
    }
    for (const line of LINES_BY_SLOT[slotOf(f)] as readonly ResearchLine[]) {
      const steps = researchSteps(p.research, f, line);
      const cost = researchCost(p, f, line);
      const pips = `<span class="pips">${Array.from({ length: RESEARCH_MAX }, (_, i) => `<u${i < steps ? ' class="on"' : ''}></u>`).join('')}</span>`;
      if (cost === null) acts.push(`<button class="btn small dim" disabled><span>${LINE_NAMES[line]} maxed ${pips}</span></button>`);
      else acts.push(costBtn(f, `${LINE_NAMES[line]} +${PCT}%`, cost, have, `data-act="research" data-f="${f}" data-line="${line}"`, null, ''));
    }
  }
  const share = Math.min(1, have / goal);
  return `<div class="fam${fitted ? ' fitted' : ''}${unlocked ? '' : ' locked'}">
    ${partIcon({ family: f, mk: unlocked ? mk : 1 })}
    <div class="famhead">${esc(famName(f))}${unlocked ? ` <span class="t12" style="color:${MK_COLOUR[mk].light}">Mk ${roman(mk)}</span>` : ' <span class="t12 dimt">locked</span>'}${fitted ? ' <span class="t12 green">fitted</span>' : ''}</div>
    <div class="bpline"><span class="t12">${esc(famName(f))} blueprints:</span><span class="big">${bpAmount(have, false, f)}</span></div>
    <div class="bar wide"><i style="width:${Math.round(share * 100)}%"></i></div>
    <div class="acts">${acts.join('')}</div>
    ${protoRow(p, f)}
  </div>`;
}

/** An ace's prototype you've kept (Brigadier perk): its Mk in the rarity colour, and a Fit button once you hold the rank. */
function protoRow(p: Progress, f: Family): string {
  const q = protoOf(p, f);
  if (!q) return '';
  const on = p.loadout[slotOf(f)];
  const fitted = on.proto === true && on.family === f && on.mk === q.mk;
  const ok = perksOf(p.xp).protoParts;
  const btn = fitted ? '<span class="t12 green">fitted</span>'
    : ok ? `<button class="btn small go" data-act="fitproto" data-f="${f}">Fit</button>`
      : `<button class="btn small dim" data-act="fitproto" data-f="${f}" data-blocked="1"><span>Fit</span><span class="why2"><i class="lock"></i>needs ${esc(rankName('brigadier'))}</span></button>`;
  return `<div class="row" style="align-items:center;gap:8px">${partIcon(q)}<span class="t12">Ace prototype <span style="color:${MK_COLOUR[q.mk].light}">Mk ${roman(q.mk)}</span></span>${btn}</div>`;
}

/** A wingman's card: name, tank, and a gun / hull / drive picker from your unlocked families at a Mk below yours. */
function wingmanCard(p: Progress, i: number): string {
  const name = WINGMAN_NAMES[i]!;
  const lock = wingmanLock(p, i);
  if (lock) {
    // No name until the rank brings them (owner, Nov 15): a locked card is just "Wingman 2".
    return `<div class="fam wing locked"><div class="famhead">Wingman ${i + 1}</div>
      <div class="t12 why2"><i class="lock"></i>needs ${esc(lock)}</div></div>`;
  }
  const picked = fitValid(p, p.wingmen?.[i]);
  const l = wingmanLoadoutFor(p, i);
  const rows = SLOTS.map(({ slot, name: slotName, families }) => {
    const opts = families.filter((f) => p.unlocked.includes(f)).map((f) => {
      const part = wingmanPart(p, f);
      const on = l[slot].family === f;
      return `<button class="wopt${on ? ' on' : ''}" data-act="wfam" data-i="${i}" data-f="${f}" title="${esc(partLabel(part))}">${partIcon(part)}</button>`;
    }).join('');
    return `<div class="wrow"><span class="t12 dimt">${slotName}</span><div class="wopts">${opts}</div></div>`;
  }).join('');
  const parts = [l.gun, l.hull, l.drive].map(partName).join(' · ');
  return `<div class="fam wing">
    <div class="famhead">${esc(name)} <span class="t12 dimt">${picked ? 'your pick' : 'matches your tank'}</span></div>
    <div class="wpic" data-i="${i}"></div>
    <div class="t12 wparts">${parts}</div>
    ${rows}
    ${picked ? `<div class="acts"><button class="btn small" data-act="wmirror" data-i="${i}">Match my tank</button></div>` : ''}
  </div>`;
}

/** A gadget's blueprints as "[icon] 5": its own icon, since gadgets have no blueprint sheet. */
const gadgetBp = (g: GadgetKind, n: number): string => {
  const url = gadgetIconUrl(g);
  return `<span class="bpn">${url ? `<img class="bp" src="${url}" alt="">` : ''} ${n}</span>`;
};

function gadgetCard(p: Progress, g: GadgetKind): string {
  const have = p.gadgetIntel[g] ?? 0;
  const mk = gadgetMkOf(p, g);
  const url = gadgetIconUrl(g);
  const acts: string[] = [];
  let goal = GADGET_MK_COST[2];
  let nextLine = '';
  if (mk < MAX_MK) {
    const next = (mk + 1) as NextMk;
    const cost = GADGET_MK_COST[next];
    goal = cost;
    nextLine = `<div class="t12 grule">Next: ${mkBadge(next)} ${esc(nextTierText(g, next))}</div>`;
    const attrs = `data-act="gmk" data-g="${g}"`;
    const label = `${mkChip(next)} ${gadgetBp(g, cost)}`;
    if (perksOf(p.xp).maxMk < next) acts.push(`<button class="btn small dim" ${attrs} data-blocked="1"><span>${label}</span><span class="why2"><i class="lock"></i>needs ${esc(rankName(MK_RANK[next]))}</span></button>`);
    else if (have < cost) acts.push(`<button class="btn small dim" ${attrs}><span>${label}</span><span class="why2">need ${cost - have} more</span></button>`);
    else acts.push(`<button class="btn small gold" ${attrs}><span>${label}</span></button>`);
  } else acts.push('<button class="btn small dim" disabled><span>Top tier</span></button>');
  const share = mk >= MAX_MK ? 1 : Math.min(1, have / goal);
  return `<div class="fam">
    <span class="ic">${url ? `<img src="${url}" alt="">` : g.slice(0, 3)}${mkBadge(mk)}</span>
    <div class="famhead">${esc(GADGET_NAME[g])} <span class="t12" style="color:${MK_COLOUR[mk].light}">Mk ${roman(mk)}</span></div>
    <div class="t12 dimt grule">${esc(gadgetText(g, mk))}</div>
    <div class="bpline"><span class="t12">${esc(GADGET_NAME[g])} blueprints:</span><span class="big">${gadgetBp(g, have)}</span></div>
    <div class="bar wide"><i style="width:${Math.round(share * 100)}%"></i></div>
    ${nextLine}
    <div class="acts">${acts.join('')}</div>
  </div>`;
}
