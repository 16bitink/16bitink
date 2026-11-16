// Writes the ninth long-form video's captions (YouTube subtitles) from its word timings:
//   node dev/promo/everysize/saveSrt.mjs   -> promo/longform/9 - every size in the ocean.srt
import { saveSrt } from '../saveSrt.mjs';

await saveSrt('everysize', '9 - every size in the ocean.srt');
