import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * A Sign in with Apple nonce (lib/apple.ts) that has signed someone in, so
 * it can't again: kept by the SHA-256 of the nonce, gone once it would have
 * expired anyway.
 */
export interface UsedAppleNonceDoc {
  readonly _id: Types.ObjectId;
  readonly nonceHash: string;
  readonly expiresAt: Date;
}

const usedAppleNonceSchema = new Schema<UsedAppleNonceDoc>(
  {
    nonceHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'usedapplenonces' },
);
usedAppleNonceSchema.index({ nonceHash: 1 }, { unique: true });
usedAppleNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const UsedAppleNonce: Model<UsedAppleNonceDoc> =
  (mongoose.models.UsedAppleNonce as Model<UsedAppleNonceDoc> | undefined) ??
  mongoose.model<UsedAppleNonceDoc>('UsedAppleNonce', usedAppleNonceSchema);
