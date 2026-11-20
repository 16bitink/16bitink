import { describe, expect, it } from 'vitest';
import { usdToAed } from '../src/lib/invoices/aed';
import { invoiceDate, money } from '../src/lib/invoices/format';
import {
  canDownloadInvoice, countryName, INVOICE_NUMBER, invoiceFromCheckout, taxLabel, taxRate, type InvoiceSessionLike,
} from '../src/lib/invoices/invoice';
import { renderInvoicePdf } from '../src/lib/invoices/pdf';
import { taxIdName } from '../src/lib/invoices/taxIds';
import { transliterate } from '../src/lib/invoices/transliterate';

const session: InvoiceSessionLike = {
  id: 'cs_live_1', created: 1_794_211_589, livemode: true, currency: 'usd', amount_total: 499,
  total_details: { amount_tax: 0 }, metadata: { game: 'inksnake' },
  customer_details: {
    name: 'Ada Lovelace', business_name: null, email: 'ada@example.com',
    address: { line1: '1 Main St.', line2: 'Apt #4', city: 'Sydney', state: 'NSW', postal_code: '2000', country: 'AU' },
    tax_ids: null,
  },
};

describe('issuing an invoice from a checkout', () => {
  it('takes the Stripe number and freezes who bought what', () => {
    const inv = invoiceFromCheckout(session, { id: 'in_1', number: 'ABCD1234-0001' });
    expect(inv).toMatchObject({
      number: 'ABCD1234-0001', stripeInvoiceId: 'in_1', sessionId: 'cs_live_1', game: 'inksnake', currency: 'usd',
      subtotal: 499, tax: 0, total: 499, livemode: true, issuedAt: new Date(1_794_211_589_000),
      items: [{ description: 'InkSnake full game (one-time purchase)', quantity: 1, unitAmount: 499 }],
      billTo: { name: 'Ada Lovelace', email: 'ada@example.com', addressLines: ['1 Main St.', 'Apt #4', 'Sydney, NSW, 2000'], country: 'Australia', countryCode: 'AU', taxId: null },
    });
  });

  it('splits tax out of the total', () => {
    const inv = invoiceFromCheckout({ ...session, amount_total: 524, total_details: { amount_tax: 25 } }, { id: 'in_1', number: 'A-1' });
    expect([inv.subtotal, inv.tax, inv.total]).toEqual([499, 25, 524]);
    expect(inv.items[0].unitAmount).toBe(499);
    expect(taxRate(inv)).toBe(5.01);
  });

  it('bills a business by its name and tax ID', () => {
    const inv = invoiceFromCheckout({
      ...session,
      customer_details: { ...session.customer_details!, business_name: 'Ada Ltd', tax_ids: [{ type: 'eu_vat', value: 'DE123456789' }] },
    }, { id: 'in_1', number: 'A-1' });
    expect(inv.billTo.name).toBe('Ada Ltd');
    expect(inv.billTo.taxId).toEqual({ type: 'EU VAT', value: 'DE123456789' });
  });

  it('copes with a checkout that has no buyer details', () => {
    const inv = invoiceFromCheckout({ ...session, customer_details: null }, { id: 'in_1', number: 'A-1' });
    expect(inv.billTo).toEqual({ name: '', email: '', addressLines: [], country: '', countryCode: null, taxId: null });
  });

  it('refuses an invoice Stripe has not numbered yet, and a checkout with no game', () => {
    expect(() => invoiceFromCheckout(session, { id: 'in_1', number: null })).toThrow(/no number/);
    expect(() => invoiceFromCheckout({ ...session, metadata: {} }, { id: 'in_1', number: 'A-1' })).toThrow(/no game/);
  });
});

describe('invoice rules', () => {
  it('has no tax rate without tax', () => {
    expect(taxRate({ subtotal: 499, tax: 0 })).toBe(0);
    expect(taxRate({ subtotal: 0, tax: 10 })).toBe(0);
    expect(taxRate({ subtotal: 1000, tax: 50 })).toBe(5);
  });

  it('calls US tax sales tax and the rest VAT', () => {
    expect(taxLabel('US')).toBe('Sales tax');
    expect(taxLabel('AE')).toBe('VAT');
    expect(taxLabel(null)).toBe('VAT');
  });

  it('lets only the owner or an admin download', () => {
    expect(canDownloadInvoice('u1', 'u1', false)).toBe(true);
    expect(canDownloadInvoice('u1', 'u2', false)).toBe(false);
    expect(canDownloadInvoice(null, 'u2', false)).toBe(false);
    expect(canDownloadInvoice(null, 'u2', true)).toBe(true);
  });

  it('accepts Stripe invoice numbers only', () => {
    expect(INVOICE_NUMBER.test('ABCD1234-0001')).toBe(true);
    expect(INVOICE_NUMBER.test('../etc')).toBe(false);
    expect(INVOICE_NUMBER.test('abcd-0001')).toBe(false);
  });

  it('names countries and tax IDs', () => {
    expect(countryName('AE')).toBe('United Arab Emirates');
    expect(countryName(null)).toBe('');
    expect(taxIdName('gb_vat')).toBe('UK VAT');
    expect(taxIdName('nope')).toBe('Tax ID');
  });

  it('converts tax to AED at the peg', () => {
    expect(usdToAed(1)).toBe(3.67);
    expect(usdToAed(0.25)).toBe(0.92);
  });

  it('formats money and dates like alienart.io invoices', () => {
    expect(money(499, 'usd')).toBe('$4.99 USD');
    expect(money(1999, 'eur')).toBe('€19.99 EUR');
    expect(invoiceDate(new Date('2026-11-09T23:30:00Z'))).toBe('November 09, 2026');
  });
});

describe('printable text', () => {
  it('keeps Latin-1 and address punctuation', () => {
    expect(transliterate('José Müller, 1 Main St., Apt #4')).toBe('José Müller, 1 Main St., Apt #4');
  });

  it('spells other scripts in Latin letters', () => {
    expect(transliterate('Иван  Петров')).toBe('Ivan Petrov');
    expect(transliterate('Đặng')).toBe('Dang');
  });

  it('drops what it cannot spell', () => {
    expect(transliterate('東京 Tokyo')).toBe('Tokyo');
  });
});

describe('the invoice PDF', () => {
  it('renders a PDF', async () => {
    const inv = invoiceFromCheckout({ ...session, customer_details: { ...session.customer_details!, address: { ...session.customer_details!.address!, country: 'AE' } }, amount_total: 524, total_details: { amount_tax: 25 } }, { id: 'in_1', number: 'ABCD1234-0001' });
    const pdf = await renderInvoicePdf(inv);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
