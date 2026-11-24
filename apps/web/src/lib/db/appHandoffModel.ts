import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * A sign-in proven outside the app's web view (Google's sheet, Apple's),
 * waiting for the web view to collect it (see lib/appSignIn.ts). Kept by the
 * SHA-256 of its token, never the token; works once; gone at `expiresAt`.
 */
export interface AppHandoffDoc {
  readonly _id: Types.ObjectId;
  readonly tokenHash: string;
  readonly kind: 'google' | 'apple';
  /** The account's id at Google or Apple. */
  readonly providerId: string;
  /** Verified, lower-cased. */
  readonly email: string;
  readonly name: string;
  /** Where to go once signed in: a path on this site. */
  readonly ret: string;
  /** Set when the web view collected it. */
  readonly usedAt?: Date;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

const appHandoffSchema = new Schema<AppHandoffDoc>(
  {
    tokenHash: { type: String, required: true },
    kind: { type: String, enum: ['google', 'apple'], required: true },
    providerId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    ret: { type: String, required: true },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'apphandoffs' },
);
appHandoffSchema.index({ tokenHash: 1 }, { unique: true });
appHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const AppHandoff: Model<AppHandoffDoc> =
  (mongoose.models.AppHandoff as Model<AppHandoffDoc> | undefined) ?? mongoose.model<AppHandoffDoc>('AppHandoff', appHandoffSchema);
