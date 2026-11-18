import type { DailyStanding } from '@16bitink/game-sdk';
import { isBetterPlay, toStanding, type GameDay, type PlayResult, type StandingCounts } from '../daily';
import { DailyPlayModel } from './dailyPlayModel';

const DUPLICATE_KEY = 11000;
const isDuplicateKey = (err: unknown): boolean => (err as { code?: unknown } | null)?.code === DUPLICATE_KEY;

export interface DailyPlayWrite extends PlayResult {
  readonly player: string;
  readonly game: string;
  readonly date: string;
  readonly shells: number;
  readonly late: boolean;
}

type Stored = PlayResult & { readonly late: boolean };

const keyOf = (w: DailyPlayWrite): { player: string; game: string; date: string } => ({ player: w.player, game: w.game, date: w.date });

const fields = (w: DailyPlayWrite): Record<string, unknown> => ({
  result: w.result,
  seconds: w.seconds,
  shells: w.shells,
  ...(w.breakIn === undefined ? {} : { breakIn: w.breakIn }),
});

/**
 * Saves a play, keeping the player's best for that game and date. `late` only
 * stays true if every play of the day was late. Returns the play that is kept.
 */
export async function saveDailyPlay(write: DailyPlayWrite): Promise<PlayResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const kept = await DailyPlayModel.findOne(keyOf(write), 'result seconds breakIn late -_id').lean<Stored>().exec();
    if (!kept) {
      try {
        await DailyPlayModel.create({ ...keyOf(write), ...fields(write), late: write.late });
        return write;
      } catch (err) {
        if (!isDuplicateKey(err)) throw err;
        continue; // Another request created it first: compare with that one.
      }
    }
    const late = kept.late && write.late;
    if (isBetterPlay(write, kept)) {
      await DailyPlayModel.updateOne(keyOf(write), { $set: { ...fields(write), late }, ...(write.breakIn === undefined ? { $unset: { breakIn: '' } } : {}) });
      return write;
    }
    if (late !== kept.late) await DailyPlayModel.updateOne(keyOf(write), { $set: { late } });
    return kept;
  }
  throw new Error('Could not save the daily play');
}

/** How many players there are and where `play` stands among them, for one game's date. */
export async function dailyStanding(game: string, date: string, play: PlayResult): Promise<DailyStanding> {
  const day = { game, date };
  const [players, withBreakIn, slowerBreakIn, wins, slowerWins] = await Promise.all([
    DailyPlayModel.countDocuments(day),
    DailyPlayModel.countDocuments({ ...day, breakIn: { $exists: true } }),
    play.breakIn === undefined ? 0 : DailyPlayModel.countDocuments({ ...day, breakIn: { $gt: play.breakIn } }),
    DailyPlayModel.countDocuments({ ...day, result: 'win' }),
    DailyPlayModel.countDocuments({ ...day, result: 'win', seconds: { $gt: play.seconds } }),
  ]);
  const counts: StandingCounts = { players, withBreakIn, slowerBreakIn, wins, slowerWins };
  return toStanding(play, counts);
}

/** A player's played days across every game, oldest first. */
export async function dailyHistory(players: readonly string[]): Promise<readonly GameDay[]> {
  const docs = await DailyPlayModel.find({ player: { $in: players } }, 'game date result late seconds -_id')
    .sort({ date: 1 })
    .lean<GameDay[]>()
    .exec();
  return docs.map((d) => ({ game: d.game, date: d.date, result: d.result, late: d.late, seconds: d.seconds }));
}
