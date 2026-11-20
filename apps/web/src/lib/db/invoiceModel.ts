import mongoose, { Schema, type Model } from 'mongoose';
import type { InvoiceRecord } from '../invoices/invoice';

/** An issued invoice: one per purchase, never edited after it is written. */
export type InvoiceDoc = InvoiceRecord;

// `type` is a field here, not Mongoose's type keyword.
const taxIdSchema = new Schema({ type: { type: String, required: true }, value: { type: String, required: true } }, { _id: false });

const partySchema = new Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    addressLines: { type: [String], default: [] },
    country: { type: String, default: '' },
    countryCode: { type: String, default: null },
    taxId: { type: taxIdSchema, default: null },
  },
  { _id: false },
);

const itemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitAmount: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema<InvoiceDoc>(
  {
    number: { type: String, required: true, unique: true },
    stripeInvoiceId: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true, unique: true },
    game: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    currency: { type: String, required: true },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true, min: 0 },
    billTo: { type: partySchema, required: true },
    paymentMethod: { type: String, required: true },
    livemode: { type: Boolean, required: true },
  },
  { timestamps: true, collection: 'invoices' },
);

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const Invoice: Model<InvoiceDoc> =
  (mongoose.models.Invoice as Model<InvoiceDoc> | undefined) ?? mongoose.model<InvoiceDoc>('Invoice', invoiceSchema);
