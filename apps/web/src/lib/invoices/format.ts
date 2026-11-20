/** "$4.99 USD" from 499 and "usd". */
export function money(minor: number, currency: string): string {
  const code = currency.toUpperCase();
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(minor / 100);
  return `${formatted} ${code}`;
}

/** "November 09, 2026": dates are UTC, as Stripe stores them. */
export function invoiceDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}
