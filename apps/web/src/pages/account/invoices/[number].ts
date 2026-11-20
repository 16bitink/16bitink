import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { findInvoiceByNumber } from '../../../lib/db/invoiceRepo';
import { findPurchase } from '../../../lib/db/purchaseRepo';
import { findRole } from '../../../lib/db/userRepo';
import { canDownloadInvoice, INVOICE_NUMBER } from '../../../lib/invoices/invoice';
import { renderInvoicePdf } from '../../../lib/invoices/pdf';
import { signInPageUrl } from '../../../lib/buyFlow';
import { currentUser } from '../../../lib/owner';

export const prerender = false;

const notFound = (): Response => new Response('Invoice not found', { status: 404, headers: { 'cache-control': 'no-store' } });

/**
 * One invoice as a PDF, for the account that owns its purchase (or an admin).
 * Someone else's number answers 404, the same as a number that doesn't exist.
 */
export const GET: APIRoute = async ({ params, cookies, redirect }) => {
  const number = params.number ?? '';
  const user = await currentUser(cookies);
  if (!user) return redirect(signInPageUrl(`/account/invoices/${encodeURIComponent(number)}`), 303);
  if (!INVOICE_NUMBER.test(number)) return notFound();

  try {
    await db();
    const invoice = await findInvoiceByNumber(number);
    if (!invoice) return notFound();
    const [purchase, role] = await Promise.all([findPurchase(invoice.sessionId), findRole(user.userId)]);
    if (!canDownloadInvoice(purchase?.userId ?? null, user.userId, role === 'admin')) return notFound();
    const pdf = await renderInvoicePdf(invoice);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="invoice-${number}.pdf"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[invoice] could not render', { number, err });
    return new Response('Could not load this invoice. Please try again in a minute.', { status: 500, headers: { 'cache-control': 'no-store' } });
  }
};
