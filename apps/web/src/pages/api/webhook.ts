import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { db } from '../../lib/db';
import { saveInvoice } from '../../lib/db/invoiceRepo';
import { savePurchase, setPaymentStatus } from '../../lib/db/purchaseRepo';
import { invoiceForBackfill, invoiceForCheckout } from '../../lib/invoices/issue';
import { requireEnv } from '../../lib/env';
import { purchaseFromSession } from '../../lib/purchases';
import { stripeClient } from '../../lib/stripe';

export const prerender = false;

const intentId = (v: string | { id: string } | null): string | null => (v === null ? null : typeof v === 'string' ? v : v.id);

/** Applies one verified Stripe event to the purchases database. */
async function apply(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object;
      const purchase = purchaseFromSession(session);
      if (purchase) {
        await savePurchase(purchase);
        console.info('[webhook] purchase saved', { event: event.id, session: purchase.sessionId, game: purchase.game });
        // A failure throws: the event answers 500 and Stripe retries (both saves are idempotent).
        const invoice = await invoiceForCheckout(stripeClient(), session);
        if (invoice) {
          await saveInvoice(invoice);
          console.info('[webhook] invoice issued', { event: event.id, number: invoice.number });
        } else {
          console.warn('[webhook] paid checkout has no Stripe invoice', { event: event.id, session: purchase.sessionId });
        }
      }
      return;
    }
    case 'invoice.paid': {
      // Only invoices made by the backfill script (purchases from before Checkout created invoices).
      const invoice = await invoiceForBackfill(stripeClient(), event.data.object);
      if (invoice) {
        await saveInvoice(invoice);
        console.info('[webhook] backfilled invoice issued', { event: event.id, number: invoice.number });
      }
      return;
    }
    case 'charge.refunded': {
      const charge = event.data.object;
      // A partial refund (a goodwill discount) leaves the game owned.
      const intent = intentId(charge.payment_intent);
      if (charge.refunded && intent) {
        console.info('[webhook] refund: purchase revoked', { event: event.id, changed: await setPaymentStatus(intent, 'refunded') });
      }
      return;
    }
    case 'charge.dispute.created': {
      const intent = intentId(event.data.object.payment_intent);
      if (intent) console.info('[webhook] chargeback: purchase revoked', { event: event.id, changed: await setPaymentStatus(intent, 'disputed') });
      return;
    }
    case 'charge.dispute.closed': {
      const dispute = event.data.object;
      const intent = intentId(dispute.payment_intent);
      if (intent && dispute.status === 'won') {
        console.info('[webhook] chargeback won: purchase restored', { event: event.id, changed: await setPaymentStatus(intent, 'paid') });
      }
      return;
    }
    default:
      return;
  }
}

/**
 * Stripe webhook: signature-verified, and idempotent (purchases are keyed by
 * checkout session; status changes are absolute). A database failure answers
 * 500 so Stripe retries the event later.
 */
export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripeClient().webhooks.constructEventAsync(payload, signature, requireEnv('STRIPE_WEBHOOK_SECRET'));
  } catch (err) {
    console.warn('[webhook] signature verification failed', err instanceof Error ? err.message : 'unknown error');
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    await db();
    await apply(event);
  } catch (err) {
    console.error('[webhook] could not apply event', { event: event.id, type: event.type, err });
    return new Response('Could not process event', { status: 500 });
  }
  return new Response('ok');
};
