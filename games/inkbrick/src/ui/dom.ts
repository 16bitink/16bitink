import { CSS } from './css';
import type { Shells } from '../app/save';
import { artUrl } from '../render/art';

/** Small DOM helpers for the screens: escaped text, a screen layer, click wiring by data-act. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export type Actions = Readonly<Record<string, (el: HTMLElement) => void>>;

/** Fills `root` with a screen and wires every [data-act] element to its action. */
export function render(root: HTMLElement, className: string, html: string, acts: Actions): HTMLElement {
  root.className = `screen ${className}`;
  root.innerHTML = html;
  root.hidden = false;
  for (const el of root.querySelectorAll<HTMLElement>('[data-act]')) {
    const act = acts[el.dataset.act!];
    if (act) el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!(el as HTMLButtonElement).disabled) act(el);
    });
  }
  return root;
}

export function clear(root: HTMLElement): void {
  root.innerHTML = '';
  root.hidden = true;
}

/** A shell or heart icon: the painted image when the art has it, else the CSS shape. */
function icon(cls: string, on: boolean, onKey: string, offKey: string, extra = ''): string {
  const url = artUrl(on ? onKey : offKey);
  return url ? `<img class="${cls} art${on ? ' on' : ''}" src="${url}" alt="" ${extra}>` : `<span class="${cls}${on ? ' on' : ' off'}" ${extra}></span>`;
}

export const shellIcon = (on: boolean): string => icon('shell', on, 'shell-icon', 'shell-empty');

export const shellsHtml = (m: Shells | undefined, pop: readonly boolean[] = []): string =>
  [0, 1, 2].map((i) => icon(`shell${pop[i] ? ' pop' : ''}`, m?.[i] === true, 'shell-icon', 'shell-empty', `style="animation-delay:${0.3 + i * 0.3}s"`)).join('');

export const heartsHtml = (lives: number, of = 3): string =>
  Array.from({ length: of }, (_, i) => icon('heart', i < lives, 'heart', 'heart-empty')).join('');

export const clock = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const STYLE_ID = 'inkbrick-style';
export function injectStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  doc.head.appendChild(s);
}

export interface CardButton {
  readonly label: string;
  readonly run: () => void;
  readonly kind?: 'go' | 'gold' | 'sea';
}

/** A modal card over the current screen. */
export function showCard(root: HTMLElement, title: string, lines: readonly string[], buttons: readonly CardButton[], dismiss?: () => void): void {
  const acts: Record<string, () => void> = {};
  const btns = buttons.map((b, i) => {
    acts[`b${i}`] = b.run;
    return `<button class="btn ${b.kind ?? ''}" data-act="b${i}">${esc(b.label)}</button>`;
  }).join('');
  if (dismiss) acts.bg = dismiss;
  render(root, 'card', `<div class="panel col center" data-act="none"><h2 class="t44">${esc(title)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<div class="row wrap center">${btns}</div></div>`, acts);
  if (dismiss) root.addEventListener('click', (e) => {
    if (e.target === root) dismiss();
  }, { once: true });
}

/** The boot screen; returns the progress setter. */
export function showBoot(root: HTMLElement): (f: number) => void {
  render(root, 'sea', '<div class="col center"><h1 class="t64 light">InkBrick</h1><p class="light">Skip is waxing the raft…</p><div class="boot-bar"><i></i></div></div>', {});
  const bar = root.querySelector<HTMLElement>('.boot-bar i');
  return (f) => {
    if (bar) bar.style.width = `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`;
  };
}
