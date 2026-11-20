import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { BACKFILL_KEY, backfillStripeInvoice, invoiceForBackfill, invoiceForCheckout } from '../src/lib/invoices/issue';

const paid = {
  id: 'cs_live_1', object: 'checkout.session', status: 'complete', payment_status: 'paid', amount_total: 499, currency: 'usd',
  livemode: true, created: 1_794_211_589, metadata: { game: 'inkfish' }, customer: 'cus_1', invoice: null,
  invoice_creation: { enabled: false }, total_details: { amount_tax: 0 }, customer_details: null,
} as unknown as Stripe.Checkout.Session;

async function* iterate<T>(items: T[]): AsyncGenerator<T> {
  yield* items;
}

function fakeStripe(opts: { session?: Partial<Stripe.Checkout.Session>; invoices?: Partial<Stripe.Invoice>[] } = {}) {
  const invoices = {
    retrieve: vi.fn(async (id: string) => ({ id, number: 'ABCD1234-0007' })),
    list: vi.fn(() => iterate(opts.invoices ?? [])),
    create: vi.fn(async () => ({ id: 'in_new', status: 'draft' })),
    finalizeInvoice: vi.fn(async (id: string) => ({ id, status: 'open' })),
    pay: vi.fn(async (id: string) => ({ id, status: 'paid', number: 'ABCD1234-0001' })),
  };
  const stripe = {
    invoices,
    invoiceItems: { create: vi.fn(async () => ({ id: 'ii_1' })) },
    checkout: { sessions: { retrieve: vi.fn(async () => ({ ...paid, ...opts.session })) } },
  };
  return { stripe: stripe as unknown as Stripe, invoices, items: stripe.invoiceItems };
}

describe('invoice for a checkout', () => {
  it('numbers it with the Stripe invoice Checkout made', async () => {
    const { stripe } = fakeStripe();
    const inv = await invoiceForCheckout(stripe, { ...paid, invoice: 'in_9' } as Stripe.Checkout.Session);
    expect(inv).toMatchObject({ number: 'ABCD1234-0007', stripeInvoiceId: 'in_9', sessionId: 'cs_live_1' });
  });

  it('asks Stripe again when the event snapshot has no invoice yet', async () => {
    const { stripe } = fakeStripe({ session: { invoice: 'in_late' } });
    expect((await invoiceForCheckout(stripe, paid))?.stripeInvoiceId).toBe('in_late');
  });

  it('retries (throws) while an invoice that will come is missing', async () => {
    const { stripe } = fakeStripe({ session: { invoice_creation: { enabled: true } as Stripe.Checkout.Session.InvoiceCreation } });
    await expect(invoiceForCheckout(stripe, paid)).rejects.toThrow(/no Stripe invoice yet/);
  });

  it('has none for an old checkout or an unpaid one', async () => {
    const { stripe } = fakeStripe();
    expect(await invoiceForCheckout(stripe, paid)).toBeNull();
    expect(await invoiceForCheckout(stripe, { ...paid, payment_status: 'unpaid' } as Stripe.Checkout.Session)).toBeNull();
  });
});

describe('backfilling a Stripe invoice', () => {
  it('makes one paid out of band, dated the day of the purchase', async () => {
    const { stripe, invoices, items } = fakeStripe();
    const inv = await backfillStripeInvoice(stripe, paid);
    expect(inv.number).toBe('ABCD1234-0001');
    expect(invoices.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_1', auto_advance: false, effective_at: paid.created, metadata: { [BACKFILL_KEY]: 'cs_live_1', game: 'inkfish' },
    }), { idempotencyKey: 'invoice-backfill-cs_live_1' });
    expect(items.create).toHaveBeenCalledWith(expect.objectContaining({ invoice: 'in_new', amount: 499, currency: 'usd' }), expect.anything());
    expect(invoices.pay).toHaveBeenCalledWith('in_new', { paid_out_of_band: true });
  });

  it('reuses the one an earlier run paid, and finishes one it left open', async () => {
    const done = fakeStripe({ invoices: [{ id: 'in_old', status: 'paid', number: 'X-1', metadata: { [BACKFILL_KEY]: 'cs_live_1' } }] });
    expect((await backfillStripeInvoice(done.stripe, paid)).id).toBe('in_old');
    expect(done.invoices.create).not.toHaveBeenCalled();

    const open = fakeStripe({ invoices: [{ id: 'in_open', status: 'open', metadata: { [BACKFILL_KEY]: 'cs_live_1' } }] });
    await backfillStripeInvoice(open.stripe, paid);
    expect(open.invoices.create).not.toHaveBeenCalled();
    expect(open.invoices.finalizeInvoice).not.toHaveBeenCalled();
    expect(open.invoices.pay).toHaveBeenCalledWith('in_open', { paid_out_of_band: true });
  });

  it('adds the line to a draft an interrupted run left empty, before numbering it', async () => {
    const { stripe, items, invoices } = fakeStripe({ invoices: [{ id: 'in_draft', status: 'draft', lines: { data: [] } as unknown as Stripe.ApiList<Stripe.InvoiceLineItem>, metadata: { [BACKFILL_KEY]: 'cs_live_1' } }] });
    await backfillStripeInvoice(stripe, paid);
    expect(invoices.create).not.toHaveBeenCalled();
    expect(items.create).toHaveBeenCalledWith(expect.objectContaining({ invoice: 'in_draft', amount: 499 }), expect.anything());
    expect(items.create.mock.invocationCallOrder[0]).toBeLessThan(invoices.finalizeInvoice.mock.invocationCallOrder[0]);
  });

  it('refuses a checkout that charged tax', async () => {
    const { stripe, invoices } = fakeStripe();
    await expect(backfillStripeInvoice(stripe, { ...paid, total_details: { amount_tax: 25 } } as Stripe.Checkout.Session)).rejects.toThrow(/charged tax/);
    expect(invoices.create).not.toHaveBeenCalled();
  });

  it('refuses a checkout without a customer', async () => {
    const { stripe } = fakeStripe();
    await expect(backfillStripeInvoice(stripe, { ...paid, customer: null } as Stripe.Checkout.Session)).rejects.toThrow();
  });
});

describe('saving a backfilled invoice when Stripe reports it paid', () => {
  it('issues it for the checkout it is tagged with, dated the day of the purchase', async () => {
    const { stripe } = fakeStripe();
    const inv = await invoiceForBackfill(stripe, { id: 'in_b', number: 'ABCD1234-0002', metadata: { [BACKFILL_KEY]: 'cs_live_1' } } as unknown as Stripe.Invoice);
    expect(inv).toMatchObject({ number: 'ABCD1234-0002', stripeInvoiceId: 'in_b', sessionId: 'cs_live_1', issuedAt: new Date(paid.created * 1000) });
  });

  it('ignores every other invoice, and an unpaid checkout', async () => {
    const { stripe } = fakeStripe();
    expect(await invoiceForBackfill(stripe, { id: 'in_c', number: 'X-1', metadata: { game: 'inkfish' } } as unknown as Stripe.Invoice)).toBeNull();
    const unpaid = fakeStripe({ session: { payment_status: 'unpaid' } });
    expect(await invoiceForBackfill(unpaid.stripe, { id: 'in_b', number: 'X-1', metadata: { [BACKFILL_KEY]: 'cs_live_1' } } as unknown as Stripe.Invoice)).toBeNull();
  });
});
