import { esc } from './dom';

/** The full-game offer, as a block inside a card or a screen. The button asks the host to start checkout. */
export function buyBlock(cityName: string, price: string | null): string {
  return `<div class="paper wall" style="max-width:none"><h2>${esc(cityName)} is in the full game</h2>
    <p>A whole new city of trouble, and ten more years to fix it.</p><p class="small dim">One-time purchase, no ads.</p>
    <button class="btn gold big" data-act="buy">Unlock${price ? ` for ${esc(price)}` : ''}</button></div>`;
}
