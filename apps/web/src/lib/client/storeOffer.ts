import { appBilling, canBuyHere, storePrice } from './appBilling';

/**
 * The offer as the page renders it is the website's: the site's price, a
 * one-time purchase, a key to redeem. Inside the app it has to match what the
 * app can do. Where it can't sell (iOS, for now) no offer shows at all, since
 * store review rejects one that leads nowhere; where it sells through Google
 * Play, the price is the one Play will charge (local currency included).
 *
 * Marked in the page with:
 * - `data-offer`: hidden where the app can't sell;
 * - `data-nosale="…"`: the text instead, where the app can't sell;
 * - `data-price-tpl="… {price} …"`: the text with the store's price, where the app sells.
 */

/** The text for one marked element, or null to hide it; undefined leaves it as the page rendered it. */
export async function offerText(el: HTMLElement, game: string): Promise<string | null | undefined> {
  if (!canBuyHere()) {
    if (el.dataset.nosale !== undefined) return el.dataset.nosale;
    return el.dataset.offer !== undefined ? null : undefined;
  }
  const tpl = el.dataset.priceTpl;
  if (!tpl || !appBilling()) return undefined;
  const price = await storePrice(game);
  return price ? tpl.replace('{price}', price) : undefined;
}

/** Applies offerText to every marked element under `root`. */
export async function applyStoreOffer(game: string, root: ParentNode = document): Promise<void> {
  const els = root.querySelectorAll<HTMLElement>('[data-offer], [data-nosale], [data-price-tpl]');
  await Promise.all([...els].map(async (el) => {
    const text = await offerText(el, game);
    if (text === null) {
      el.hidden = true;
      // Some of these are display: flex or block in CSS, which would beat the hidden attribute.
      el.style.display = 'none';
    } else if (text !== undefined) {
      el.textContent = text;
    }
  }));
}
