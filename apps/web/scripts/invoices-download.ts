/**
 * Downloads the tax invoices of a period as PDFs, for the accountant: the
 * same files buyers download from their account, rebuilt from Stripe (no
 * database needed). Like alienart.io's invoice download, files go to
 *
 *   invoices/YYYY-MM/<uae|global>/Invoice-<number>.pdf
 *
 * "uae" holds the invoices that charged tax, "global" the rest. Refunded
 * purchases are left out.
 *
 *   pnpm invoices:download                         # last month
 *   pnpm invoices:download 2026-10-01 2026-12-01   # [start, end), UTC dates
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Stripe from 'stripe';
import { isPaidSession } from '../src/lib/fulfil';
import { invoiceFromStripe } from '../src/lib/invoices/issue';
import { renderInvoicePdf } from '../src/lib/invoices/pdf';

const OUT_DIR = path.resolve(import.meta.dirname, '../invoices');
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** [start, end) as unix seconds: the dates given, or last month. */
function period(args: readonly string[]): { start: Date; end: Date } {
  const [from, to] = args;
  if (from || to) {
    if (!from || !to || !DATE.test(from) || !DATE.test(to)) throw new Error('Give both dates as YYYY-MM-DD: start (inclusive) and end (exclusive)');
    return { start: new Date(`${from}T00:00:00Z`), end: new Date(`${to}T00:00:00Z`) };
  }
  const now = new Date();
  return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) };
}

/** Whether the checkout's payment was refunded in full. */
function refunded(session: Stripe.Checkout.Session): boolean {
  const intent = session.payment_intent;
  const charge = typeof intent === 'object' && intent ? intent.latest_charge : null;
  return typeof charge === 'object' && charge !== null && charge.refunded;
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing environment variable STRIPE_SECRET_KEY');
  const stripe = new Stripe(key);
  const { start, end } = period(process.argv.slice(2).filter((a) => !a.startsWith('-')));
  console.info(`Invoices paid ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)} (end excluded)`);

  const counts = { downloaded: 0, uae: 0, global: 0, refunded: 0, notNumbered: 0 };
  const sessions = stripe.checkout.sessions.list({
    status: 'complete', limit: 100,
    created: { gte: Math.floor(start.getTime() / 1000), lt: Math.floor(end.getTime() / 1000) },
    expand: ['data.payment_intent.latest_charge'],
  });
  for await (const session of sessions) {
    if (!session.livemode || !isPaidSession(session) || !session.metadata?.game) continue;
    if (refunded(session)) {
      counts.refunded++;
      continue;
    }
    const invoice = await invoiceFromStripe(stripe, session);
    if (!invoice) {
      counts.notNumbered++;
      console.warn(`  no Stripe invoice yet for a ${session.metadata.game} purchase of ${new Date(session.created * 1000).toISOString().slice(0, 10)}: run invoices:backfill`);
      continue;
    }
    const region = invoice.tax > 0 ? 'uae' : 'global';
    const dir = path.join(OUT_DIR, invoice.issuedAt.toISOString().slice(0, 7), region);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `Invoice-${invoice.number}.pdf`), await renderInvoicePdf(invoice));
    counts.downloaded++;
    counts[region]++;
    console.info(`  ${invoice.number}  ${invoice.issuedAt.toISOString().slice(0, 10)}  ${invoice.game}  ${region}`);
  }
  console.info('Summary', counts, `→ ${OUT_DIR}`);
}

main().catch((err: unknown) => {
  console.error('[invoices-download] failed', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
