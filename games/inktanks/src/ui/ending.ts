import { TOTAL_LEVELS } from '../logic/campaign';
import { warRecord } from '../logic/ending';
import type { Progress } from '../logic/workshop';
import { esc, render } from './dom';
import { strapBig } from './rankArt';
import { tankCanvas } from './tankArt';

/** The victory painting and the commander, once the art exists; a missing file just leaves it out. */
const victoryArt = import.meta.glob<string>('../art/pixel/ui/victory.png', { eager: true, query: '?url', import: 'default' });
const commanderArt = import.meta.glob<string>('../art/pixel/ui/commander.png', { eager: true, query: '?url', import: 'default' });
const victoryUrl = Object.values(victoryArt)[0] ?? null;
const commanderUrl = Object.values(commanderArt)[0] ?? null;

/** The commander's last words, after level 50 (the friends freed in level 48 go home). */
export const ENDING_LINES: readonly string[] = [
  'Fifty missions, from Private to General.',
  'The Harvester is scrap, and the Iron Hive’s hold on the clans is broken. Tusk, Wisp and Quill have taken their crews home, and the Boars, the Crows and the Weasels lay down their guns.',
  'Our flag flies over Deepwood. The whole Brigade salutes you, General.',
];

export interface EndingActions {
  readonly map: () => void;
  readonly workshop: () => void;
  readonly menu: () => void;
}

const num = (n: number): string => n.toLocaleString('en-US');

/**
 * The end of the war, after level 50, in two steps. First the victory
 * painting fills the screen under "Victory!" (Continue, or a tap anywhere).
 * Then, over the painting dimmed: the commander's last words, the General's
 * shoulder boards, the war in numbers and each chapter's medals. Medals still
 * to win are something to come back for, never a must.
 */
export function showEnding(root: HTMLElement, p: Progress, a: EndingActions): void {
  if (!victoryUrl) {
    showRecord(root, p, a);
    return;
  }
  render(root, 'ending hero', `
    <div class="endhero" data-act="on">
      <img class="endart" src="${victoryUrl}" alt="The Ink Brigade celebrates in the Deepwood clearing">
      <div class="endtitle"><div class="wordmark victory">Victory!</div><div class="gold endsub">The war is won</div>
        <button class="btn gold endnext" data-act="on">Continue</button></div>
    </div>`, { on: () => showRecord(root, p, a) });
}

/** The second step: the war in numbers over the dimmed painting. */
function showRecord(root: HTMLElement, p: Progress, a: EndingActions): void {
  const r = warRecord(p);
  const chapters = r.chapters.map((c, i) => `
    <div class="endchap rise" style="animation-delay:${0.9 + i * 0.12}s">
      <div class="t12 dimt">Chapter ${i + 1}</div><div class="gold">${esc(c.name)}</div>
      <div class="t12"><span class="medal${c.medals > 0 ? ' on' : ''}"></span>${c.medals} / ${c.of}</div>
    </div>`).join('');
  const left = r.medalsLeft > 0
    ? `${r.medalsLeft} medals are still out there: replay any mission from the map.`
    : 'Every medal won. A perfect war.';
  const el = render(root, 'ending record', `
    <div class="sheet">
      <div class="center t36 gold rise">The war is won, General</div>
      <div class="cols">
        <div class="panel endsay rise" style="animation-delay:0.2s">
          ${commanderUrl ? `<img class="commander" src="${commanderUrl}" alt="Your commander">` : ''}
          <div>${ENDING_LINES.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
        </div>
        <div class="panel endrank rise" style="animation-delay:0.5s">
          <div class="promo">${strapBig(r.rank)}<div class="t36 gold">${esc(r.rank.name)}</div></div>
          <div class="endbody"><div class="endtank"></div>
          <dl class="endnums">
            <dt>Missions won</dt><dd>${r.missions} / ${TOTAL_LEVELS}</dd>
            <dt>Medals</dt><dd><span class="medal on"></span>${r.medals} / ${r.medalsOf}</dd>
            <dt>Blueprints collected</dt><dd>${num(r.blueprints)}</dd>
            <dt>Parts unlocked</dt><dd>${r.families}</dd>
            <dt>XP</dt><dd>${num(r.xp)}</dd>
          </dl></div>
        </div>
      </div>
      <div class="endchaps">${chapters}</div>
      <div class="t12 dimt center rise" style="animation-delay:1.6s">${esc(left)}</div>
      <div class="row center"><button class="btn small" data-act="menu">Menu</button><button class="btn" data-act="workshop">Workshop</button><button class="btn go" data-act="map">Map</button></div>
    </div>`, { map: a.map, workshop: a.workshop, menu: a.menu });
  if (victoryUrl) el.style.setProperty('--endart', `url("${victoryUrl}")`);
  root.querySelector('.endtank')!.appendChild(tankCanvas(p.loadout, 2));
}
