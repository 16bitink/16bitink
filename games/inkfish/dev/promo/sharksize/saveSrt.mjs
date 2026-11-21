// Writes the tenth long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/sharksize/saveSrt.mjs   -> promo/longform/10 - shark size comparison.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('sharksize', '10 - shark size comparison.srt');
