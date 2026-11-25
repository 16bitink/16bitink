import { drawTextLine } from '../captions';
import { PAPER_ON_DARK } from '../credit';
import { VIDEO, window01 } from '../short';

/**
 * This short sells InkRoad (running a city's roads), so it carries InkRoad's
 * credit instead of InkFish's, in the same style and timing as ../credit.ts:
 * small under the captions' band, fading in at 10 s (once the CRUNCH has
 * played, so it never covers the burst) and gone 0.6 s before the loop point.
 */
export const CREDIT = { text: 'InkRoad · 16bit.ink/road', y: 1292, size: 46, alpha: 0.9 } as const;
const FADE_S = 0.4;
export const CREDIT_FROM = 10;
const GONE_BEFORE_S = 0.6;

/** How much of the credit shows at loop time `t`. */
export const creditAt = (t: number, loopSeconds: number): number =>
  CREDIT.alpha * window01(t, CREDIT_FROM, loopSeconds - GONE_BEFORE_S, FADE_S);

export function drawCredit(ctx: CanvasRenderingContext2D, t: number, loopSeconds: number): void {
  const alpha = creditAt(t, loopSeconds);
  if (alpha > 0) drawTextLine(ctx, CREDIT.text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, alpha, PAPER_ON_DARK);
}
