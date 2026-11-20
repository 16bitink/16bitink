/**
 * Numbers the live purchases paid before Checkout created Stripe invoices.
 * For each paid checkout without one it makes a Stripe invoice marked paid
 * out of band (it takes the next Stripe number; nobody is charged again) and
 * tags it with the checkout. Stripe then sends `invoice.paid` to the
 * production webhook, which saves our invoice: this script needs only Stripe.
 * (The webhook endpoint must listen to `invoice.paid`: README, Deploy step 4.)
 *
 *   pnpm invoices:backfill          # dry run: lists what it would number
 *   pnpm invoices:backfill --apply  # makes the Stripe invoices
 *
 * Safe to run again: a Stripe invoice made by an earlier run is reused.
 */
import Stripe from 'stripe';
import { isPaidSession } from '../src/lib/fulfil';
import { BACKFILL_KEY, backfillStripeInvoice, findBackfillInvoice } from '../src/lib/invoices/issue';

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing environment variable STRIPE_SECRET_KEY');
  const apply = process.argv.includes('--apply');
  const stripe = new Stripe(key);

  const todo: Stripe.Checkout.Session[] = [];
  for await (const s of stripe.checkout.sessions.list({ status: 'complete', limit: 100 })) {
    if (s.livemode && isPaidSession(s) && s.metadata?.game && !s.invoice) todo.push(s);
  }
  console.info(`${todo.length} paid checkouts from before Checkout made invoices${apply ? '' : ' (dry run)'}`);

  for (const s of todo.sort((a, b) => a.created - b.created)) {
    const label = `${new Date(s.created * 1000).toISOString().slice(0, 10)} ${s.metadata?.game} ${s.amount_total} ${s.currency} ${s.customer_details?.address?.country ?? '??'}`;
    const done = await findBackfillInvoice(stripe, s);
    if (done) {
      console.info(`  already ${done.number}: ${label}`);
      continue;
    }
    if (!apply) {
      console.info(`  would number: ${label}`);
      continue;
    }
    const invoice = await backfillStripeInvoice(stripe, s);
    console.info(`  ${invoice.number} (${invoice.status}, ${BACKFILL_KEY} set): ${label}`);
  }
}

main().catch((err: unknown) => {
  console.error('[invoices-backfill] failed', err);
  process.exitCode = 1;
});
