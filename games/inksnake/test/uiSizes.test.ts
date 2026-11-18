import { describe, expect, it } from 'vitest';
import { cardFit, hudPlan } from '../src/scenes/uiLayout';
import {
  interfaceScale, isPhone, MAP_NODE, mapZoom, PHONE_CARD_CSS, PHONE_CELL, phoneCardFit, sizer, TEXT_MIN, TOUCH_GAP, TOUCH_MIN,
} from '../src/scenes/uiSizes';

/** As the scenes use them (uiPaint's ROUND, the meter, a long level tag, the cards). */
const ROUND = 54;
const HUD = { button: ROUND, margin: 14, meterH: 50, meterW: 492, tagW: 264 } as const;
const PAUSE = { w: 420, h: 470 } as const;
const RESULT = { w: 460, h: 580 } as const;
const DAILY_W = 440;
const MAP_FIT = { w: 760, h: 560 } as const;

const PHONES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
] as const;

describe('phone UI sizes', () => {
  it('knows a phone held either way from a laptop or a tablet', () => {
    for (const css of PHONES) expect(isPhone(css)).toBe(true);
    expect(isPhone({ width: 1280, height: 760 })).toBe(false);
    expect(isPhone({ width: 768, height: 1024 })).toBe(false);
  });

  it('leaves the laptop layout as it was', () => {
    expect(interfaceScale({ width: 1280, height: 760 })).toBe(1);
    expect(interfaceScale({ width: 600, height: 560 })).toBeCloseTo(600 / 760);
    const z = sizer(false, 0.6);
    expect([z.text(12), z.tap(30), z.gap(2)]).toEqual([12, 30, 2]);
    expect(mapZoom({ width: 1280, height: 760 }, MAP_FIT)).toBeCloseTo(760 / 560);
  });

  for (const css of PHONES) {
    describe(`${css.width}×${css.height}`, () => {
      const ui = interfaceScale(css);
      const view = { width: css.width / ui, height: css.height / ui };

      it('raises text, targets and gaps to the minimums', () => {
        for (const scale of [ui, 0.6, PHONE_CARD_CSS]) {
          const z = sizer(true, scale);
          expect(z.text(10) * scale).toBeGreaterThanOrEqual(TEXT_MIN.small);
          expect(z.text(10, 'body') * scale).toBeGreaterThanOrEqual(TEXT_MIN.body);
          expect(z.tap(30) * scale).toBeGreaterThanOrEqual(TOUCH_MIN);
          expect(z.gap(2) * scale).toBeGreaterThanOrEqual(TOUCH_GAP);
          // Sizes already big enough stay as designed.
          expect(z.text(60)).toBe(60);
        }
      });

      it('draws the HUD buttons a finger wide, a gap apart, on the screen', () => {
        const plan = hudPlan(view, css, ui, false, HUD);
        const b = ROUND * plan.k;
        expect(b * ui).toBeGreaterThanOrEqual(TOUCH_MIN);
        const [a, c] = plan.buttons;
        const apart = Math.max(Math.abs(a!.x - c!.x), Math.abs(a!.y - c!.y)) - b;
        expect(apart * ui).toBeGreaterThanOrEqual(TOUCH_GAP);
        for (const p of plan.buttons) {
          expect(p.x + b / 2).toBeLessThanOrEqual(view.width);
          expect(p.x - b / 2).toBeGreaterThanOrEqual(0);
        }
        // The meter fits across, and the tag stays clear of the buttons.
        expect(HUD.meterW * plan.meter.k).toBeLessThanOrEqual(view.width);
        if (plan.upright) expect(plan.tag.x + HUD.tagW * plan.tag.k).toBeLessThan(Math.min(...plan.buttons.map((p) => p.x)) - b / 2);
      });

      it('keeps the pause and result cards’ buttons at least TOUCH_MIN once fitted', () => {
        for (const card of [PAUSE, RESULT]) {
          const s = ui * cardFit(view, card, 1.45, true);
          expect(sizer(true, s).tap(50) * s).toBeGreaterThanOrEqual(TOUCH_MIN);
          expect(card.w * s).toBeLessThanOrEqual(css.width);
        }
      });

      it('draws the daily cards legibly and the calendar days a finger wide', () => {
        const fit = phoneCardFit(view.width, DAILY_W, ui, 16, TOUCH_MIN / PHONE_CELL);
        expect(DAILY_W * fit * ui).toBeLessThanOrEqual(css.width);
        expect(fit * ui).toBeGreaterThanOrEqual(PHONE_CARD_CSS);
        expect(PHONE_CELL * fit * ui).toBeGreaterThanOrEqual(TOUCH_MIN - 0.5);
      });

      it('zooms the map in so nests can be tapped and names read', () => {
        const zoom = mapZoom(css, MAP_FIT);
        expect(MAP_NODE.d * zoom).toBeGreaterThanOrEqual(TOUCH_MIN);
        expect(MAP_NODE.hit * zoom).toBeGreaterThanOrEqual(TOUCH_MIN);
        expect(MAP_NODE.label * zoom).toBeGreaterThanOrEqual(TEXT_MIN.small);
        expect(MAP_NODE.number * zoom).toBeGreaterThanOrEqual(TEXT_MIN.body);
      });
    });
  }
});
