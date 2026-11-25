import { picUrl } from './pics';
import { BASE_CSS } from './css/base';
import { BEACH_CSS } from './css/beach';
import { CARDS_CSS, CARDS_CSS_2 } from './css/cards';
import { LIVE_CSS } from './css/live';
import { GUIDE_CSS } from './css/guide';
import { HUD_CSS } from './css/hud';
import { PHONE_CSS } from './css/phone';
import { SCREENS_CSS } from './css/screens';
import { SLIM_CSS } from './css/slim';

const STYLE_ID = 'ikr-styles';

/** Adds InkRoad's one stylesheet to the page (once). The phone layer comes last. */
export function injectStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement('style');
  el.id = STYLE_ID;
  const tex = (k: string): string => `url("${picUrl(k)}")`;
  const vars = `.ikr{--tex-paper:${tex('mat-paper')};--tex-leather:${tex('mat-leather')};--tex-tape:${tex('mat-tape')};--tex-plate:${tex('mat-plate')}}`;
  el.textContent = vars + BASE_CSS + HUD_CSS + CARDS_CSS + CARDS_CSS_2 + SCREENS_CSS + SLIM_CSS + BEACH_CSS + PHONE_CSS + LIVE_CSS + GUIDE_CSS;
  doc.head.appendChild(el);
}

/** The ink-roughening filter the stamps use; one hidden svg in the root. */
export const DEFS_HTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ikr-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.7"/></filter></svg>';
