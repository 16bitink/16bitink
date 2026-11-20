import { esc, render } from './dom';

export interface CardButton {
  readonly label: string;
  /** Runs on a click, with the button (to relabel it in place). */
  readonly run: (button: HTMLElement) => void;
  readonly kind?: 'go' | 'gold';
}

/**
 * A small card over whatever is showing: the full-game offer on a paid
 * level, "coming" on a chapter still being made, the pause menu. A tap
 * outside the panel runs `dismiss`, when given.
 */
export function showCard(root: HTMLElement, title: string, lines: readonly string[], buttons: readonly CardButton[], dismiss?: () => void): void {
  const acts: Record<string, (el: HTMLElement) => void> = {};
  const btns = buttons.map((b, i) => {
    acts[`b${i}`] = b.run;
    return `<button class="btn${b.kind ? ` ${b.kind}` : ''}" data-act="b${i}">${esc(b.label)}</button>`;
  }).join('');
  if (dismiss) acts.dismiss = dismiss;
  const backdrop = dismiss ? '<div data-act="dismiss" style="position:absolute;inset:0"></div>' : '';
  render(root, 'dim', `${backdrop}<div class="panel modal rise"><div class="t36 gold">${esc(title)}</div>${lines.map((l) => `<div>${esc(l)}</div>`).join('')}<div class="row center">${btns}</div></div>`, acts);
}
