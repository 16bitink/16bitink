import type { MatchReport } from '../logic/match/report';
import { bonusText } from '../logic/mission/bonus';
import type { Outcome } from '../logic/mission/outcome';
import type { LevelDef } from '../logic/level/types';
import { newlyAffordable } from '../logic/blueprints';
import { familyName, FAMILIES, MK_COLOUR, partLabel } from '../logic/parts';
import { perksOf, rankOf, toNextRank, type RankId } from '../logic/rank';
import type { Progress } from '../logic/workshop';
import { bpAmount, workshopButton } from './blueprint';
import { clock, esc, render } from './dom';
import { partIcon } from './tankArt';
import { GADGET_NAME } from '../logic/match/gadgets';
import { GADGETS } from '../logic/match/types';
import { gadgetIconUrl } from '../scenes/mission/hud';
import { rankLine, strapBig } from './rankArt';

/** What each rank brings (design doc "Military ranks" and "Rank perks"), for the promotion moment. Only what the game really does. */
export const RANK_UNLOCKS: Readonly<Record<RankId, string>> = {
  private: 'The workshop and 1 repair kit',
  corporal: 'You carry 2 repair kits',
  sergeant: 'Mk II parts and gadgets in the workshop',
  staffSergeant: 'Supply drop (R): once a level, a crate with a repair kit and your gun a Mk up lands where you aim',
  lieutenant: 'Mk III parts and gadgets in the workshop',
  captain: 'A wingman: Thistle\'s tank fights beside you (your tank, a Mk lower), except on Recon missions',
  major: 'Mk IV parts and gadgets · artillery strike (F): once a level, a heavy blast where you aim after 2.5 s',
  colonel: 'A second wingman: Rowan joins Thistle',
  brigadier: 'Mk V parts and gadgets · ace prototypes you\'ve fitted can go on your tank in the workshop',
  general: 'The top rank: a General\'s gold-braided boards',
};

export interface ResultsData {
  readonly def: LevelDef;
  readonly title: string;
  readonly report: MatchReport;
  readonly outcome: Outcome;
  readonly xpBefore: number;
  readonly xpAfter: number;
  /** Progress before and after the mission, to show what became affordable. */
  readonly before: Progress;
  readonly after: Progress;
  /** The next button: a level to play, the full-game offer, the ending (level 50 won), or nothing. */
  readonly next: { readonly kind: 'level'; readonly n: number } | { readonly kind: 'offer'; readonly label: string } | { readonly kind: 'ending' } | { readonly kind: 'none'; readonly note: string | null };
}

export interface ResultsActions {
  readonly retry: () => void;
  readonly map: () => void;
  readonly next: () => void;
  readonly workshop: () => void;
}

const failText = (reason: string): string => (reason === 'destroyed' ? 'Your tank was destroyed' : reason === 'time' ? 'Out of time' : reason.charAt(0).toUpperCase() + reason.slice(1));

/** After a mission: win or fail, medals (new ones pop in), blueprints per family, XP and a promotion. */
export function showResults(root: HTMLElement, d: ResultsData, a: ResultsActions): void {
  const { def, report: r, outcome: o } = d;
  const lines = [d.title, bonusText(def.bonus[0]), bonusText(def.bonus[1])];
  const medals = lines.map((t, i) => `<div class="bonus${o.medals[i] ? '' : ' dimt'}"><span class="medal${o.medals[i] ? ' on' : ''}${o.fresh[i] ? ' pop' : ''}" style="animation-delay:${0.3 + i * 0.4}s"></span>${esc(t)}${o.fresh[i] ? ' <span class="green t12">new</span>' : ''}</div>`).join('');
  const intel = FAMILIES.filter((f) => (r.intel[f] ?? 0) > 0)
    .map((f) => `${partIcon({ family: f, mk: 1 })}<span>${esc(familyName(f))}</span><span class="bpn">${bpAmount(r.intel[f] ?? 0, true, f)}</span>`).join('')
    + GADGETS.filter((g) => (r.gadgetIntel?.[g] ?? 0) > 0).map((g) => {
      const url = gadgetIconUrl(g);
      return `<span class="ic">${url ? `<img src="${url}" alt="">` : ''}</span><span>${esc(GADGET_NAME[g])}</span><span class="bpn">+${r.gadgetIntel[g]}</span>`;
    }).join('');
  const ready = newlyAffordable(d.before, d.after);
  const readyHtml = ready.length > 0
    ? `<div class="ready-line">Upgrade ready: ${esc(ready.slice(0, 2).map((u) => u.label).join(', '))}${ready.length > 2 ? ` +${ready.length - 2} more` : ''}</div>`
    : '';
  // A family taken from the enemy (a level's prize) is now in the workshop.
  const won = o.prize && !d.before.unlocked.includes(o.prize) && d.after.unlocked.includes(o.prize) ? o.prize : null;
  const prizeHtml = (won ? `<div class="ready-line">${partIcon({ family: won, mk: 1 })} ${esc(familyName(won))} unlocked: fit it in the workshop for any mission</div>` : '') + protoHtml(d.before, d.after);
  const before = rankOf(d.xpBefore);
  const after = rankOf(d.xpAfter);
  const promoted = after.xp > before.xp;
  const up = toNextRank(d.xpAfter);
  const share = up ? (d.xpAfter - after.xp) / (up.next.xp - after.xp) : 1;
  const nextBtn = d.next.kind === 'level' ? `<button class="btn go" data-act="next">Level ${d.next.n}</button>` : d.next.kind === 'offer' ? `<button class="btn gold" data-act="next">${esc(d.next.label)}</button>` : d.next.kind === 'ending' ? '<button class="btn gold endnext" data-act="next">Victory!</button>' : '';
  render(root, 'dark', `
    <div class="panel sheet rise">
      <div class="row spread"><div class="t36 ${o.passed ? 'gold' : 'red'}">${o.passed ? 'Mission passed' : esc(failText(r.reason))}</div>
        <div class="t12 dimt">Level ${def.number} · ${esc(def.name)} · ${clock(r.time)} · ${r.kills} kills</div></div>
      <div class="cols">
        <div class="col"><div class="dimt t12">Medals</div>${medals}
          ${o.passed ? '' : '<div class="t12 dimt">Blueprints you picked up are yours to keep. Retry from the start.</div>'}</div>
        <div class="col">
          <div class="dimt t12">Blueprints collected: ${bpAmount(r.intelCount + Object.values(r.gadgetIntel ?? {}).reduce((a, b) => a + (b ?? 0), 0))}</div>
          <div class="bplist">${intel || '<span class="dimt t12" style="grid-column:1/-1">None this time</span>'}</div>
          ${prizeHtml}${readyHtml}
          <div class="dimt t12">Rank</div>
          <div class="row spread">${rankLine(after)}<span class="green">+${o.xp} XP</span></div>
          <div class="bar"><i class="xp" style="width:${Math.round(share * 100)}%"></i></div>
          <div class="t12 dimt">${up ? `${up.need} XP to ${esc(up.next.name)}` : 'Top rank'}</div>
        </div>
      </div>
      ${promoted ? `<div class="promo">${strapBig(after)}<div class="t12 dimt">Promoted!</div><div class="t36 gold">${esc(after.name)}</div><div class="t12">${esc(RANK_UNLOCKS[after.id])}</div></div>` : ''}
      ${d.next.kind === 'none' && d.next.note ? `<div class="t12 dimt center row">${esc(d.next.note)}</div>` : ''}
      <div class="row center"><button class="btn" data-act="map">Map</button>${workshopButton(d.after)}<button class="btn${o.passed ? '' : ' go'}" data-act="retry">${o.passed ? 'Play again' : 'Retry'}</button>${o.passed ? nextBtn : ''}</div>
    </div>`, { ...a });
}

/** Ace prototypes kept by this mission: fit them in the workshop (a Brigadier), or once you are one. */
function protoHtml(before: Progress, after: Progress): string {
  const fresh = after.protos.filter((q) => !before.protos.some((o) => o.family === q.family && o.mk >= q.mk));
  if (fresh.length === 0) return '';
  const when = perksOf(after.xp).protoParts ? 'fit it in the workshop' : 'a Brigadier can fit it in the workshop';
  return fresh.map((q) => `<div class="ready-line">${partIcon(q)} Ace prototype kept: <span style="color:${MK_COLOUR[q.mk].light}">${esc(partLabel(q))}</span>, ${when}</div>`).join('');
}
