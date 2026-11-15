import { chapterMap } from '../content/chapterMaps';
import { CHAPTERS, gate, medalCount, nextLevel, spotState, type GateContext } from '../logic/campaign';
import { rankOf } from '../logic/rank';
import type { Progress } from '../logic/workshop';
import { workshopButton } from './blueprint';
import { esc, medalsHtml, render } from './dom';
import { rankLine } from './rankArt';

export interface MapData {
  readonly progress: Progress;
  /** The chapter shown, 0-based. */
  readonly chapter: number;
  readonly gate: GateContext;
  /** Level names by number, for the spots' labels. */
  readonly names: (n: number) => string | null;
  /** World point → CSS px over the canvas (the chapter map scene's camera). */
  readonly project: (x: number, y: number) => { x: number; y: number };
}

export interface MapActions {
  readonly level: (n: number) => void;
  /** A chapter chip (index 0–4) other than the one shown. */
  readonly chapter: (index: number) => void;
  readonly workshop: () => void;
  readonly menu: () => void;
  /** Once level 50 is won: back to the victory screen. */
  readonly ending: (() => void) | null;
}

/**
 * The level select over the chapter's painting: the ten spots on its road
 * with their medals, locked ones dimmed, the next one bobbing; chips for
 * the five chapters along the bottom (2–5 "coming" or locked).
 */
export function showMap(root: HTMLElement, d: MapData, a: MapActions): () => void {
  const next = nextLevel(d.gate);
  const rank = rankOf(d.progress.xp);
  const ch = CHAPTERS[d.chapter] ?? CHAPTERS[0]!;
  const SPOTS = chapterMap(ch.index).spots;
  const spots = SPOTS.map((_, i) => {
    const n = ch.first + i;
    const st = spotState(n, d.gate, next);
    const name = d.names(n);
    return `<button class="spot ${st}" data-act="level" data-n="${n}" aria-label="Level ${n}${name ? `: ${esc(name)}` : ''}">${n}</button>
      <div class="spotmedals" data-n="${n}">${st === 'locked' ? '' : medalsHtml(d.progress.medals[n])}</div>
      ${n === next && name ? `<div class="spotname" data-n="${n}">${esc(name)}</div>` : ''}`;
  }).join('');
  const chips = CHAPTERS.map((c) => {
    const here = c.index === ch.index;
    let medals = 0;
    for (let n = c.first; n <= c.last; n++) medals += medalCount(d.progress.medals, n);
    const g = gate(c.first, d.gate);
    const sub = here ? `${medals} / 30` : g === 'paywall' ? 'full game' : g === 'coming' ? 'coming' : `${medals} / 30`;
    return `<button class="chip${here ? ' here' : ''}" data-act="chapter" data-i="${c.index}">${c.index + 1}. ${esc(c.name)}<b>${sub}</b></button>`;
  }).join('');
  render(root, 'map', `
    ${spots}
    <div class="panel top"><span class="t12 dimt">Chapter ${ch.index + 1}</span> <span class="gold">${esc(ch.name)}</span> <span class="t12">${rankLine(rank)}</span></div>
    <div class="corner left"><button class="btn small" data-act="menu">Menu</button>${a.ending ? '<button class="btn small gold" data-act="ending">Victory</button>' : ''}</div>
    <div class="corner right">${workshopButton(d.progress, 'small')}</div>
    <div class="chapters">${chips}</div>`, {
    level: (el) => a.level(Number(el.dataset.n)),
    chapter: (el) => {
      const i = Number(el.dataset.i);
      if (i !== ch.index) a.chapter(i);
    },
    workshop: a.workshop,
    menu: a.menu,
    ending: () => a.ending?.(),
  });
  const place = (): void => {
    // Spots are smaller on a phone (screensCss): medals and the name keep to the spot's own size.
    const size = root.querySelector<HTMLElement>('.spot')?.offsetWidth || 56;
    for (const el of root.querySelectorAll<HTMLElement>('[data-n]')) {
      const s = SPOTS[Number(el.dataset.n) - ch.first]!;
      const p = d.project(s.x, s.y);
      const dy = el.classList.contains('spotmedals') ? Math.round(size * 0.61) : el.classList.contains('spotname') ? -Math.round(size * 1.1) : 0;
      // A narrow screen (a 4:3 iPad) can crop the painting's edge: keep the spot whole on screen.
      const half = size / 2 + 4;
      el.style.left = `${Math.round(Math.min(Math.max(p.x, half), root.clientWidth - half))}px`;
      el.style.top = `${Math.round(p.y + dy)}px`;
    }
  };
  place();
  const ro = new ResizeObserver(() => requestAnimationFrame(place));
  ro.observe(root);
  return () => ro.disconnect();
}
