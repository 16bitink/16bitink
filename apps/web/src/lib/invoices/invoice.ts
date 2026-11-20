import { findGame } from '../../data/games';
import { isPass, PASS } from '../../data/pass';
import { taxIdName } from './taxIds';

/**
 * A tax invoice for one purchase, as issued: a frozen copy of who bought
 * what, so the PDF reads the same however often it is downloaded and however
 * the buyer later changes their details in Stripe. Pure rules only; storage
 * is in db/invoiceRepo.ts, the PDF in invoices/pdf.ts.
 */

export interface InvoiceParty {
  readonly name: string;
  readonly email: string;
  /** Street, unit, city line: whatever the buyer gave, in order. */
  readonly addressLines: readonly string[];
  /** The country as printed, e.g. "Australia". */
  readonly country: string;
  /** ISO code, kept apart from the name because tax rules key off it. */
  readonly countryCode: string | null;
  readonly taxId: { readonly type: string; readonly value: string } | null;
}

export interface InvoiceItem {
  readonly description: string;
  readonly quantity: number;
  /** Smallest currency unit, before tax. */
  readonly unitAmount: number;
}

export interface InvoiceRecord {
  /** Stripe's invoice number (the same numbering as alienart.io's invoices). */
  readonly number: string;
  readonly stripeInvoiceId: string;
  /** The Checkout Session it was paid with: links the invoice to its purchase. */
  readonly sessionId: string;
  readonly game: string;
  /** When the purchase was paid: the date of supply and of issue. */
  readonly issuedAt: Date;
  readonly currency: string;
  readonly items: readonly InvoiceItem[];
  /** Smallest currency unit. subtotal + tax = total. */
  readonly subtotal: number;
  readonly tax: number;
  readonly total: number;
  readonly billTo: InvoiceParty;
  readonly paymentMethod: string;
  readonly livemode: boolean;
}

/** The fields of a Stripe Checkout Session an invoice is made from. */
export interface InvoiceSessionLike {
  readonly id: string;
  readonly created: number;
  readonly livemode: boolean;
  readonly currency: string | null;
  readonly amount_total: number | null;
  readonly total_details: { readonly amount_tax: number } | null;
  readonly metadata: Record<string, string> | null;
  readonly customer_details: {
    readonly name: string | null;
    readonly business_name?: string | null;
    readonly email: string | null;
    readonly address: {
      readonly line1: string | null;
      readonly line2: string | null;
      readonly city: string | null;
      readonly state: string | null;
      readonly postal_code: string | null;
      readonly country: string | null;
    } | null;
    readonly tax_ids: readonly { readonly type: string; readonly value: string | null }[] | null;
  } | null;
}

/** The fields of the Stripe invoice that numbers it. */
export interface StripeInvoiceLike {
  readonly id: string;
  readonly number: string | null;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** "AU" → "Australia"; an unknown code prints as itself. */
export function countryName(code: string | null): string {
  if (!code) return '';
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** What the invoice says was bought: the same words as the card statement. */
export function itemDescription(game: string): string {
  const title = isPass(game) ? PASS.title : (findGame(game)?.title ?? game);
  return `${title} full game (one-time purchase)`;
}

function billTo(details: InvoiceSessionLike['customer_details']): InvoiceParty {
  const a = details?.address;
  const cityLine = [a?.city, a?.state, a?.postal_code].filter((s): s is string => !!s).join(', ');
  const taxId = details?.tax_ids?.find((t) => !!t.value);
  return {
    name: details?.business_name || details?.name || '',
    email: details?.email ?? '',
    addressLines: [a?.line1, a?.line2, cityLine].filter((s): s is string => !!s),
    country: countryName(a?.country ?? null),
    countryCode: a?.country ?? null,
    taxId: taxId?.value ? { type: taxIdName(taxId.type), value: taxId.value } : null,
  };
}

/**
 * The invoice for a paid checkout, numbered by its Stripe invoice. Throws
 * when Stripe has not numbered it yet (still a draft), so the caller retries.
 */
export function invoiceFromCheckout(session: InvoiceSessionLike, stripeInvoice: StripeInvoiceLike): InvoiceRecord {
  if (!stripeInvoice.number) throw new Error(`Stripe invoice ${stripeInvoice.id} has no number yet`);
  const game = session.metadata?.game;
  if (!game) throw new Error(`Checkout ${session.id} names no game`);
  const total = session.amount_total ?? 0;
  const tax = session.total_details?.amount_tax ?? 0;
  const subtotal = total - tax;
  return {
    number: stripeInvoice.number,
    stripeInvoiceId: stripeInvoice.id,
    sessionId: session.id,
    game,
    issuedAt: new Date(session.created * 1000),
    currency: (session.currency ?? 'usd').toLowerCase(),
    items: [{ description: itemDescription(game), quantity: 1, unitAmount: subtotal }],
    subtotal,
    tax,
    total,
    billTo: billTo(session.customer_details),
    paymentMethod: 'Card (Stripe)',
    livemode: session.livemode,
  };
}

/** The tax rate charged, as a percentage to two decimals (0 when no tax). */
export function taxRate(inv: Pick<InvoiceRecord, 'subtotal' | 'tax'>): number {
  if (inv.tax <= 0 || inv.subtotal <= 0) return 0;
  return Math.round((inv.tax / inv.subtotal) * 100 * 100) / 100;
}

/** US states charge sales tax; everywhere else it is VAT/GST, printed as VAT like alienart.io. */
export function taxLabel(countryCode: string | null): string {
  return countryCode === 'US' ? 'Sales tax' : 'VAT';
}

/** Invoice numbers as they appear in URLs: Stripe's `ABCD1234-0001` shape. */
export const INVOICE_NUMBER = /^[A-Z0-9]{1,12}-[0-9]{1,8}$/;

/** Who may download an invoice: the account that owns its purchase now (purchases are claimed after checkout), or an admin. */
export function canDownloadInvoice(owner: string | null, viewer: string, viewerIsAdmin: boolean): boolean {
  return viewerIsAdmin || (owner !== null && owner === viewer);
}
