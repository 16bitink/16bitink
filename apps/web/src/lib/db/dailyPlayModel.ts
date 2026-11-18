import mongoose, { Schema, type Model } from 'mongoose';

/** One player's best play of one game's daily on one date. */
export interface DailyPlayDoc {
  /** `u:<user id>` when signed in, else `v:<visitor id>` (the browser's analytics id). */
  readonly player: string;
  readonly game: string;
  /** The daily's local date, YYYY-MM-DD. */
  readonly date: string;
  readonly result: 'win' | 'lose';
  readonly seconds: number;
  readonly breakIn?: number;
  readonly shells: number;
  /** Played after its date. */
  readonly late: boolean;
}

const dailyPlaySchema = new Schema<DailyPlayDoc>(
  {
    player: { type: String, required: true },
    game: { type: String, required: true },
    date: { type: String, required: true },
    result: { type: String, enum: ['win', 'lose'], required: true },
    seconds: { type: Number, required: true, min: 0 },
    breakIn: { type: Number, min: 0 },
    shells: { type: Number, required: true, min: 0 },
    late: { type: Boolean, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'dailyplays' },
);
dailyPlaySchema.index({ player: 1, game: 1, date: 1 }, { unique: true });
// Percentiles for one game and date.
dailyPlaySchema.index({ game: 1, date: 1, result: 1, seconds: 1 });
// A player's history across games.
dailyPlaySchema.index({ player: 1, date: 1 });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const DailyPlayModel: Model<DailyPlayDoc> =
  (mongoose.models.DailyPlay as Model<DailyPlayDoc> | undefined) ?? mongoose.model<DailyPlayDoc>('DailyPlay', dailyPlaySchema);
