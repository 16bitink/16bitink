import type Stripe from 'stripe';
import { isPaidSession } from '../fulfil';
import { invoiceFromCheckout, itemDescription, type InvoiceRecord } from './invoice';

/**
 * Issuing invoices from Stripe. The Stripe client is passed in (not read from
 * lib/stripe.ts) so the backfill script can run outside the Astro server.
 */

const idOf = (v: string | { readonly id: string } | null): string | null => (v === null ? null : typeof v === 'string' ? v : v.id);

/**
 * The invoice for a paid checkout, or null when it has no Stripe invoice
 * (checkouts made before invoice creation was turned on: see the backfill).
 * Throws when Stripe has not numbered the invoice yet, so a webhook retries.
 */
export async function invoiceForCheckout(stripe: Stripe, session: Stripe.Checkout.Session): Promise<InvoiceRecord | null> {
  if (!isPaidSession(session)) return null;
  // A webhook event is a snapshot (its retries resend it): ask Stripe again when the invoice isn't on it yet.
  const current = session.invoice ? session : await stripe.checkout.sessions.retrieve(session.id);
  const invoiceId = idOf(current.invoice);
  if (!invoiceId) {
    if (current.invoice_creation?.enabled) throw new Error(`Checkout ${session.id} has no Stripe invoice yet`);
    return null;
  }
  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoiceFromCheckout(current, invoice);
}

/** Metadata that ties a backfilled Stripe invoice to the checkout it stands for. */
export const BACKFILL_KEY = 'checkout_session';

/** The paid backfill invoice of a checkout from before invoice creation, if the backfill has run. Read-only. */
export async function findBackfillInvoice(stripe: Stripe, session: Stripe.Checkout.Session): Promise<Stripe.Invoice | null> {
  const customer = idOf(session.customer);
  if (!customer) return null;
  for await (const inv of stripe.invoices.list({ customer, status: 'paid', limit: 100 })) {
    if (inv.metadata?.[BACKFILL_KEY] === session.id) return inv;
  }
  return null;
}

/**
 * The invoice of any paid checkout, rebuilt from Stripe: the same record the
 * webhook saved (both are made from the checkout and its Stripe invoice).
 * Null when it has no Stripe invoice yet (backfill not run).
 */
export async function invoiceFromStripe(stripe: Stripe, session: Stripe.Checkout.Session): Promise<InvoiceRecord | null> {
  const own = await invoiceForCheckout(stripe, session);
  if (own) return own;
  const backfilled = await findBackfillInvoice(stripe, session);
  return backfilled?.id ? invoiceFromCheckout(session, { id: backfilled.id, number: backfilled.number }) : null;
}

/**
 * A Stripe invoice for a checkout paid before invoices were created at
 * checkout: made now and marked paid out of band, so it takes the next
 * Stripe invoice number without charging the customer again. Reuses one
 * made by an earlier run, so running twice never numbers a purchase twice.
 */
export async function backfillStripeInvoice(stripe: Stripe, session: Stripe.Checkout.Session): Promise<Stripe.Invoice> {
  const customer = idOf(session.customer);
  const game = session.metadata?.game;
  if (!customer || !game || !isPaidSession(session)) throw new Error(`Checkout ${session.id} is not a paid purchase with a customer`);
  // The Stripe invoice has one tax-free line: a checkout that charged tax would get a Stripe invoice that disagrees with ours.
  if ((session.total_details?.amount_tax ?? 0) > 0) throw new Error(`Checkout ${session.id} charged tax: backfill it by hand`);
  const description = itemDescription(game);
  const addItem = (invoice: string): Promise<unknown> => stripe.invoiceItems.create({
    customer, invoice, currency: session.currency ?? 'usd', amount: session.amount_total ?? 0, description,
  }, { idempotencyKey: `invoice-backfill-item-${session.id}` });

  for await (const existing of stripe.invoices.list({ customer, limit: 100 })) {
    if (existing.metadata?.[BACKFILL_KEY] === session.id && existing.status !== 'void') {
      if (existing.status === 'paid') return existing;
      // A run stopped between making the draft and its line: add the line before numbering it.
      if (existing.status === 'draft' && existing.id && (existing.lines?.data.length ?? 0) === 0) await addItem(existing.id);
      return finishBackfill(stripe, existing, session.id);
    }
  }

  const draft = await stripe.invoices.create({
    customer,
    currency: session.currency ?? 'usd',
    collection_method: 'charge_automatically',
    auto_advance: false,
    pending_invoice_items_behavior: 'exclude',
    effective_at: session.created,
    description,
    metadata: { [BACKFILL_KEY]: session.id, game },
  }, { idempotencyKey: `invoice-backfill-${session.id}` });
  if (!draft.id) throw new Error(`Stripe made a backfill invoice for ${session.id} with no id`);
  await addItem(draft.id);
  return finishBackfill(stripe, draft, session.id);
}

async function finishBackfill(stripe: Stripe, invoice: Stripe.Invoice, sessionId: string): Promise<Stripe.Invoice> {
  const id = invoice.id;
  if (!id) throw new Error(`A backfill invoice for ${sessionId} has no id`);
  const open = invoice.status === 'draft' ? await stripe.invoices.finalizeInvoice(id, { auto_advance: false }) : invoice;
  return open.status === 'paid' ? open : stripe.invoices.pay(id, { paid_out_of_band: true });
}

/**
 * The invoice a backfilled Stripe invoice stands for, once Stripe reports it
 * paid (`invoice.paid`): the production server saves it, so the backfill
 * script needs only Stripe. Null for every other invoice (Checkout's own are
 * issued on `checkout.session.completed`).
 */
export async function invoiceForBackfill(stripe: Stripe, stripeInvoice: Stripe.Invoice): Promise<InvoiceRecord | null> {
  const sessionId = stripeInvoice.metadata?.[BACKFILL_KEY];
  if (!sessionId || !stripeInvoice.id) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!isPaidSession(session)) return null;
  return invoiceFromCheckout(session, { id: stripeInvoice.id, number: stripeInvoice.number });
}
