import { artUrl } from '../art/manifest';
import { div, esc } from './dom';
import { pic } from './pics';

/** The painted sheet shown while a city's pictures load: its picture, and a car that drives along as they arrive. */
export class LoadingSheet {
  private readonly el: HTMLElement;

  constructor(root: HTMLElement, cityNo: number, name: string) {
    this.el = div(root, 'loading', `<div class="sheet paper taped">${pic(`city-${cityNo}`)}<b>Unrolling ${esc(name)}...</b><div class="lane"><i></i><img src="${artUrl('v/taxi') ?? ''}" alt=""></div></div>`);
  }

  progress(f: number): void {
    this.el.style.setProperty('--f', f.toFixed(3));
  }

  done(): void {
    this.progress(1);
    this.el.classList.add('off');
    setTimeout(() => this.el.remove(), FADE_MS);
  }

  remove(): void {
    this.el.remove();
  }
}
const FADE_MS = 500;

const LINES = ['Night falls', 'The lamps come on', 'The streets go quiet', 'Time to count the coins'] as const;

/** Night over the city: two seconds of dark blue between the day and the review. */
export class Dusk {
  private readonly el: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = div(root, 'dusk', '<div class="say"><span class="moon"></span><b></b></div>');
  }

  fall(n: number): void {
    this.el.querySelector('b')!.textContent = LINES[n % LINES.length]!;
    this.el.classList.add('on');
  }

  lift(): void {
    this.el.classList.remove('on');
  }
}
