/**
 * Official AED/USD peg (UAE Central Bank, since 1997): a fixed statutory rate,
 * never "refreshed" from an FX feed. UAE FTA rules require a tax invoice in a
 * currency other than AED to state the tax in AED and the rate applied.
 */
export const AED_PER_USD = 3.6725;

export const UAE_COUNTRY_CODE = 'AE';

/** A USD amount in AED at the peg, rounded to fils. */
export function usdToAed(usd: number): number {
  return Math.round(usd * AED_PER_USD * 100) / 100;
}
