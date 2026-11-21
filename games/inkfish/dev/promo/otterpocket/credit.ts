import { drawTextLine } from '../captions';
import { PAPER_ON_DARK } from '../credit';
import { VIDEO, window01 } from '../short';

/**
 * This short sells InkBrick (Skip the sea otter's game), so it carries
 * InkBrick's credit instead of InkFish's, in the same style and timing as
 * ../credit.ts: small under the captions, fading in 40% of the way through
 * and gone 0.6 s before the loop point.
 */
export const CREDIT = { text: 'InkBrick · 16bit.ink/brick', y: 1292, size: 46, alpha: 0.75 } as const;
const FADE_S = 0.4;
const IN_AT = 0.4;
const GONE_BEFORE_S = 0.6;

/** How much of the credit shows at loop time `t`. */
export const creditAt = (t: number, loopSeconds: number): number =>
  CREDIT.alpha * window01(t, IN_AT * loopSeconds, loopSeconds - GONE_BEFORE_S, FADE_S);

export function drawCredit(ctx: CanvasRenderingContext2D, t: number, loopSeconds: number): void {
  const alpha = creditAt(t, loopSeconds);
  if (alpha > 0) drawTextLine(ctx, CREDIT.text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, alpha, PAPER_ON_DARK);
}
