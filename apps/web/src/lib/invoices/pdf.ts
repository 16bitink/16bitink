import { createElement as h, type ReactElement, type ReactNode } from 'react';
import { Document, Page, StyleSheet, Text, View, renderToBuffer, type Styles } from '@react-pdf/renderer';
import { INVOICE_SELLER } from '../../data/company';
import { AED_PER_USD, UAE_COUNTRY_CODE, usdToAed } from './aed';
import { taxLabel, taxRate, type InvoiceRecord } from './invoice';
import { invoiceDate, money } from './format';
import { transliterate } from './transliterate';

/**
 * The tax invoice PDF: the same layout as alienart.io's invoices (same
 * company), with the 16bit.ink name on top. Built with createElement so the
 * Astro app needs no JSX setup for React.
 */

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 32 },
  section: { margin: 8, padding: 8, flexGrow: 1 },
  brand: { fontSize: 28, fontFamily: 'Helvetica', fontWeight: 'bold', color: '#1b1a1f' },
  title: { fontSize: 24, marginBottom: 16, marginTop: 16 },
  subtitle: { fontSize: 16, marginBottom: 4, marginTop: 8 },
  text: { fontSize: 12, marginBottom: 4 },
  table: { flexDirection: 'column', width: '100%', borderWidth: 1, borderColor: '#000' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000' },
  lastRow: { flexDirection: 'row' },
  colWide: { width: '40%', borderRightWidth: 1, borderColor: '#000', padding: 4 },
  col: { width: '20%', borderRightWidth: 1, borderColor: '#000', padding: 4 },
  colLast: { width: '20%', padding: 4 },
  cell: { fontSize: 10 },
  footer: { position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center', color: 'grey', fontSize: 10 },
});

const line = (text: string, style: Styles[string] = styles.text): ReactElement => h(Text, { style }, text);

function cells(values: readonly string[], last: boolean): ReactElement {
  const colStyles = [styles.colWide, styles.col, styles.col, styles.colLast];
  return h(View, { style: last ? styles.lastRow : styles.row },
    ...values.map((v, i) => h(View, { key: i, style: colStyles[i] }, h(Text, { style: styles.cell }, v))));
}

function itemsTable(inv: InvoiceRecord): ReactElement {
  const rows = inv.items.map((item, i) => cells(
    [item.description, String(item.quantity), money(item.unitAmount, inv.currency), money(item.unitAmount * item.quantity, inv.currency)],
    i === inv.items.length - 1,
  ));
  return h(View, { style: styles.table }, cells(['Description', 'Qty', 'Unit price', 'Amount'], false), ...rows);
}

function billToLines(inv: InvoiceRecord): ReactNode[] {
  const b = inv.billTo;
  const texts = [b.name, ...b.addressLines, b.country].map(transliterate).filter(Boolean);
  if (b.email) texts.push(b.email);
  if (b.taxId) texts.push(`${b.taxId.type}: ${b.taxId.value}`);
  return texts.map((t) => line(t));
}

function totals(inv: InvoiceRecord): ReactNode[] {
  const label = taxLabel(inv.billTo.countryCode);
  const out: ReactNode[] = [
    h(Text, { style: { ...styles.text, marginTop: 8 } }, `Subtotal: ${money(inv.subtotal, inv.currency)}`),
    line(`${label} ${taxRate(inv)}%: ${money(inv.tax, inv.currency)}`),
  ];
  // UAE FTA: a non-AED tax invoice to a UAE buyer states the tax in AED and the rate.
  if (inv.tax > 0 && inv.billTo.countryCode === UAE_COUNTRY_CODE && inv.currency === 'usd') {
    out.push(line(`${label} in AED: AED ${usdToAed(inv.tax / 100).toFixed(2)} (1 USD = ${AED_PER_USD} AED)`));
  }
  out.push(line(`Total: ${money(inv.total, inv.currency)}`, styles.subtitle));
  out.push(line(`Payment method: ${inv.paymentMethod}`));
  out.push(line('Paid in full.'));
  return out;
}

function invoiceDocument(inv: InvoiceRecord): ReactElement {
  const s = INVOICE_SELLER;
  const date = invoiceDate(inv.issuedAt);
  return h(Document, { title: `Invoice ${inv.number}`, author: s.name, creator: s.website },
    h(Page, { size: 'A4', style: styles.page },
      h(View, { style: styles.section },
        line(s.website, styles.brand),
        line('Tax Invoice', styles.title),
        line(`Invoice Number: ${inv.number}`, styles.subtitle),
        line(`Date of issue: ${date}`),
        line(`Date due: ${date}`),
        line(s.name, styles.subtitle),
        ...s.addressLines.map((l) => line(l)),
        line(s.phone),
        line(s.email),
        line(`TRN: ${s.trn}`),
        line('Bill to', styles.subtitle),
        ...billToLines(inv),
        line('Items', styles.subtitle),
        itemsTable(inv),
        ...totals(inv),
      ),
      line('This invoice is auto-generated', styles.footer),
    ),
  );
}

/** The invoice as a PDF file. */
export function renderInvoicePdf(inv: InvoiceRecord): Promise<Buffer> {
  // react-pdf's types want a <Document> element; ours is one, built without JSX.
  return renderToBuffer(invoiceDocument(inv) as Parameters<typeof renderToBuffer>[0]);
}
