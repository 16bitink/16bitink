import { VIDEO, type Short } from '../../short';
import { DEWY_KEYS, TALKING_KEYS, drawDewy, loadDewy, type SpeechWord } from '../dewy';
import { faceAt } from '../lipsync';

/** Kit preview: all nine Dewy busts on a mid-tone sea-blue, so cut edges show; the seven talking ones lip-sync a fake line
 *  (words spread over the loop, loudness 0.55 inside a word) and blink in the gaps. The label shows the live mouth key. Not recorded. */
const W = VIDEO.width;
const H = VIDEO.height;
const COLS = 3;
const LOOP_S = 6;
const FRAMES = 30;
const FAKE_LINE = 'Mama boo oh well bad tea we too moo hello big eat pop bee oops ma bob no way'.split(' ');
const WORD_S = 0.3;
const WORDS: readonly SpeechWord[] = FAKE_LINE.map((text, i) => ({ text, start: 0.3 + i * (WORD_S + 0.07), end: 0.3 + i * (WORD_S + 0.07) + WORD_S }));
const ENVELOPE: readonly number[] = Array.from({ length: LOOP_S * FRAMES + 1 }, (_, f) => (WORDS.some((w) => f / FRAMES >= w.start && f / FRAMES < w.end) ? 0.55 : 0));

export async function createDewyKit(ctx: CanvasRenderingContext2D): Promise<Short> {
  const dewy = await loadDewy();
  const draw = (t: number): void => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#4f86a8');
    g.addColorStop(1, '#2f6a8c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const cellW = W / COLS;
    const cellH = H / 3;
    DEWY_KEYS.forEach((key, i) => {
      const cx = (i % COLS) * cellW + cellW / 2;
      const cy = Math.floor(i / COLS) * cellH;
      const talks = (TALKING_KEYS as readonly string[]).includes(key);
      drawDewy(ctx, dewy, { t, x: cx, y: cy + cellH - 50, width: cellW * 0.86, from: key, speech: talks ? { words: WORDS, envelope: ENVELOPE, blinkSeed: i } : undefined });
      const face = talks ? faceAt(WORDS, ENVELOPE, t, i) : null;
      ctx.font = '600 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(face ? `${key}  ${face.eyes ?? face.mouth}` : key, cx, cy + cellH - 12);
    });
  };
  return { loopSeconds: LOOP_S, draw, audio: async () => new Blob([]) };
}
