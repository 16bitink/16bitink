import { minTextPx, PHONE_MEDIA, TOUCH } from '@16bitink/game-sdk';

/**
 * Phones only, last in the sheet so it wins: the shared minimums of
 * docs/mobile-playbook.md (owner's playtest, 2026-11-20: "make sure all
 * texts and UI elements are big enough on mobile"). Ark Pixel 12 reads at
 * 24 px for main lines and buttons and 18 px (1.5×) for lists, captions and
 * counts; plain fonts (key caps, round buttons) at 16 / 14. Every tap target
 * is at least 44 × 44. Layout tweaks for short screens stay in screensCss.
 */
const PX_BODY = minTextPx('body', 12);
const PX_SMALL = minTextPx('small', 12);
const TEXT_BODY = minTextPx('body');
const TEXT_SMALL = minTextPx('small');
const T = TOUCH.min;

export const PHONE_CSS = `
@media ${PHONE_MEDIA} {
  /* Screens: captions, lists and counts. */
  .ikt .t12, .ikt .explain, .ikt .why, .ikt .btn .why2, .ikt .spotname, .ikt .chip, .ikt .chip b, .ikt .badge,
  .ikt .bplist, .ikt .bplist .bpn, .ikt .bplist .ic em, .ikt .fam .ic, .ikt .fam .ic em, .ikt .endsay, .ikt .endnums, .ikt .endchap,
  .ikt .gpick, .ikt .briefing, .ikt .briefing .enemy b { font-size: ${PX_SMALL}px; }
  .ikt .briefing .objective, .ikt .t36 { font-size: ${PX_BODY}px; }
  .ikt .badge { min-width: 28px; height: 28px; }
  /* Screens: every tap target. */
  .ikt .screen .btn { min-height: ${T}px; min-width: ${T}px; }
  .ikt .screen .btn.small { font-size: ${PX_SMALL}px; min-height: ${T}px; padding: 6px 12px 8px; }
  .ikt .chip { min-height: ${T}px; }
  .ikt .gpick { min-height: ${T}px; }
  .ikt .gpick img { width: 32px; height: 32px; }
  .ikt .briefing .wingline .btn { min-height: ${T}px; }
  .ikt .wopt { min-width: ${T}px; min-height: ${T}px; }
  .ikt .spot { width: ${TOUCH.comfy}px; height: ${TOUCH.comfy}px; font-size: ${PX_BODY}px; }
  /* The map's title would run under the corners: the chips below already light the chapter, and the rank shows on the menu and the results. */
  .ikt .map .top { display: none; }
  /* The workshop's tabs say only the slot: the fitted part shows on its card. */
  .ikt .tabfam { display: none; }
  /* A part's name fits its narrow card ("Machinegun" ran into the next one at 24 px). */
  .ikt .fam .famhead { font-size: ${PX_SMALL}px; overflow-wrap: anywhere; }
  .ikt .spotmedals .medal { width: 12px; height: 12px; }
  /* Mission HUD. */
  .ikt-hud .pausebtn { font-size: ${PX_SMALL}px; min-height: ${T}px; min-width: ${T}px; padding: 6px 14px; }
  .ikt-hud .hpbar { height: 22px; }
  .ikt-hud .hpbar b { font-size: ${PX_SMALL}px; line-height: 22px; }
  .ikt-hud .kits em, .ikt-hud .gadget b, .ikt-hud .card .hint, .ikt-hud .tip { font-size: ${PX_SMALL}px; }
  .ikt-hud .ic em { font-size: ${PX_SMALL}px; right: -2px; bottom: -6px; text-shadow: 0 1px 0 #14110c, 1px 0 0 #14110c, -1px 0 0 #14110c; }
  .ikt-hud .ic.txt { font-size: ${TEXT_BODY}px; }
  .ikt-hud .btn { font-size: ${TEXT_BODY}px; }
  .ikt-hud .repair { font-size: ${TEXT_SMALL}px; }
  .ikt-hud .gadgetbtn b { font-size: ${PX_SMALL}px; }
  /* Key caps mean nothing without a keyboard. */
  .ikt-hud kbd { display: none; }
}
`;
