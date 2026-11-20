import type { InvoiceRecord } from '../invoices/invoice';
import { Invoice, type InvoiceDoc } from './invoiceModel';

const FIELDS = '-_id -__v -createdAt -updatedAt';

/**
 * Saves an issued invoice. Safe to call twice (webhook retries, the backfill):
 * the first write wins, so an issued invoice never changes.
 */
export async function saveInvoice(record: InvoiceRecord): Promise<void> {
  await Invoice.updateOne({ sessionId: record.sessionId }, { $setOnInsert: record }, { upsert: true });
}

export async function findInvoiceByNumber(number: string): Promise<InvoiceRecord | null> {
  return Invoice.findOne({ number }, FIELDS).lean<InvoiceDoc>().exec();
}

/** The invoices of these purchases (by checkout session), newest first. */
export async function findInvoicesForSessions(sessionIds: readonly string[]): Promise<InvoiceRecord[]> {
  if (sessionIds.length === 0) return [];
  return Invoice.find({ sessionId: { $in: sessionIds } }, FIELDS).sort({ issuedAt: -1 }).lean<InvoiceDoc[]>().exec();
}

/** Which of these purchases already have an invoice. */
export async function sessionsWithInvoices(sessionIds: readonly string[]): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();
  const docs = await Invoice.find({ sessionId: { $in: sessionIds } }, 'sessionId -_id').lean<{ sessionId: string }[]>().exec();
  return new Set(docs.map((d) => d.sessionId));
}
