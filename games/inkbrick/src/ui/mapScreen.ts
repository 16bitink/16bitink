import type { Shells } from '../app/save';
import { CHAPTERS, type Gate } from '../level/index';
import { MAP_POINTS } from '../art/manifest';
import { artUrl } from '../render/art';
import { esc, render, shellsHtml } from './dom';

/**
 * The coast map: the five places along the top (tap one to go there), the
 * picked place's ten level nodes on a winding path over its painting, and
 * the Daily button. Numbers run on (Kelp Cove 1-10, Ice Floe 11-20, ...).
 */
export interface MapData {
  readonly chapter: number;
  readonly gate: (n: number) => Gate;
  readonly shells: (n: number) => Shells | undefined;
  readonly name: (n: number) => string | null;
  readonly owned: boolean;
  readonly price: string | null;
  readonly today: string | null;
}

export interface MapActs {
  level(n: number): void;
  chapter(i: number): void;
  buy(): void;
  daily(): void;
  menu(): void;
}

/** Node centres in % of the screen: across in landscape, upward in portrait. */
export function nodeSpot(i: number, portrait: boolean): { x: number; y: number } {
  if (portrait) return { x: 50 + Math.sin(i * 1.15) * 28, y: 88 - i * 6.6 };
  return { x: 9 + i * 9.2, y: 62 + Math.sin(i * 0.95) * 16 };
}

function nodeHtml(n: number, d: MapData, pos: string): string {
  const g = d.gate(n);
  const s = d.shells(n);
  const cls = g === 'paywall' ? 'paid' : g === 'locked' || g === 'coming' ? 'locked' : s?.[0] ? 'done' : 'next';
  const boss = n % 10 === 0 ? ' boss' : '';
  const title = d.name(n) ?? `Level ${n}`;
  const mark = s?.[0] ? `<span class="m">${shellsHtml(s)}</span>` : '';
  return `<button class="node ${cls}${boss}" style="${pos}" data-act="n${n}" title="${esc(title)}">${n}${mark}</button>`;
}

/** The coast map image's size (the manifest's MAP_POINTS are in its px). */
const MAP_W = 1920;
const MAP_H = 1080;
/** Room kept under the last node of a trail (map image px): the map is cropped on wide screens. */
const TRAIL_BOTTOM = 190;

/** Landscape: a level's node near its place on the coast, winding down from it (map image px). */
function clusterSpot(n: number): { x: number; y: number } {
  const ch = Math.floor((n - 1) / 10);
  const i = (n - 1) % 10;
  const p = MAP_POINTS[ch]!;
  // Wind down 50 px a step, closer together when the trail would run off the bottom of the map.
  const step = Math.min(50, (MAP_H - TRAIL_BOTTOM - (p.y + 80)) / 9);
  return { x: p.x + Math.sin(i * 1.3) * 85, y: p.y + 80 + i * step };
}

/** Landscape: a pin on each place of the painted coast (the map image covers the screen). */
function pinsHtml(d: MapData, w: number, h: number): string {
  const s = Math.max(w / MAP_W, h / MAP_H);
  const ox = (w - MAP_W * s) / 2;
  const oy = (h - MAP_H * s) / 2;
  return CHAPTERS.map((c) => {
    const p = MAP_POINTS[c.index]!;
    const on = c.index === d.chapter;
    const locked = c.first > 10 && !d.owned;
    return `<button class="btn small pin ${on ? 'gold' : locked ? '' : 'sea'}" style="position:absolute;left:${ox + p.x * s}px;top:${oy + p.y * s}px;transform:translate(-50%,-50%);z-index:1" data-act="c${c.index}">${esc(c.name)}</button>`;
  }).join('');
}

/** Portrait: the place's name between arrows to the neighbouring places. */
function switcherHtml(d: MapData): string {
  const ch = CHAPTERS[d.chapter]!;
  const prev = d.chapter > 0 ? `<button class="btn small sea" data-act="c${d.chapter - 1}">‹</button>` : '<span></span>';
  const next = d.chapter < CHAPTERS.length - 1 ? `<button class="btn small sea" data-act="c${d.chapter + 1}">›</button>` : '<span></span>';
  return `<div class="row">${prev}<b class="light t32">${esc(ch.name)}</b>${next}</div>`;
}

/** The screen's size in px; the window's when the screen hasn't been laid out yet. */
export function screenSize(root: HTMLElement): { w: number; h: number } {
  const w = root.clientWidth;
  const h = root.clientHeight;
  if (w > 0 && h > 0) return { w, h };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function showMap(root: HTMLElement, d: MapData, a: MapActs): void {
  const ch = CHAPTERS[d.chapter]!;
  // The screen is hidden during a run and measures 0×0: show it before placing pins and nodes in px.
  root.hidden = false;
  const { w, h } = screenSize(root);
  const portrait = h > w;
  const acts: Record<string, () => void> = { menu: a.menu, daily: a.daily, buy: a.buy };
  CHAPTERS.forEach((c) => (acts[`c${c.index}`] = () => a.chapter(c.index)));
  const cover = Math.max(w / MAP_W, h / MAP_H);
  const at = (n: number, i: number): string => {
    if (portrait) {
      const p = nodeSpot(i, true);
      return `left:${p.x}%;top:${p.y}%`;
    }
    const p = clusterSpot(n);
    return `left:${(w - MAP_W * cover) / 2 + p.x * cover}px;top:${(h - MAP_H * cover) / 2 + p.y * cover}px`;
  };
  const shown = portrait ? Array.from({ length: 10 }, (_, i) => ch.first + i) : Array.from({ length: 50 }, (_, i) => i + 1);
  const nodes = shown.map((n) => {
    acts[`n${n}`] = () => a.level(n);
    return nodeHtml(n, d, at(n, (n - 1) % 10));
  }).join('');
  const bg = portrait ? (artUrl(ch.surround) ?? artUrl('map')) : artUrl('map');
  const offer = !d.owned && ch.first > 10
    ? `<div class="panel col center" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2"><h2 class="t32">${esc(ch.name)}</h2><p>Levels 11–50 are the full game.</p><p class="dim">One-time purchase, no ads.</p><button class="btn gold" data-act="buy">Unlock${d.price ? ` · ${esc(d.price)}` : ''}</button></div>`
    : '';
  render(root, 'mapwrap', `<div class="map">
    <div class="sea-art"${bg ? ` style="background-image:url(${bg})"` : ''}></div>
    <div class="top"><button class="btn small" data-act="menu">Menu</button>${portrait ? switcherHtml(d) : ''}<span></span></div>
    ${portrait ? '' : pinsHtml(d, w, h)}
    <div class="place" style="left:50%;top:${portrait ? 16 : 5}%"><span class="t18">Levels ${ch.first}–${ch.last} · ${esc(ch.blurb)}</span></div>
    ${nodes}${offer}
    ${d.today ? '<button class="btn gold daily-btn" data-act="daily">Daily</button>' : ''}
  </div>`, acts);
}
