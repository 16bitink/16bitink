/** How far a notch, rounded corners or the home bar reach in from each edge of the screen, CSS px. */
export interface SafeArea {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const NO_SAFE_AREA: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };

let probe: HTMLElement | null = null;

/**
 * How far the screen's unsafe edges (CSS env(safe-area-inset-*)) reach into
 * `el`. The site's play page lets InkPin fill the whole screen (fullBleed),
 * so the board runs under the notch and the controls keep out of it; where a
 * host already insets the game, nothing is left over. Zero where there is no
 * notch, and outside a browser.
 */
export function safeAreaIn(el: Element): SafeArea {
  const screen = screenSafeArea();
  if (screen === NO_SAFE_AREA) return screen;
  const r = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;
  return {
    top: Math.max(0, screen.top - r.top),
    right: Math.max(0, screen.right - (vw - r.right)),
    bottom: Math.max(0, screen.bottom - (vh - r.bottom)),
    left: Math.max(0, screen.left - r.left),
  };
}

function screenSafeArea(): SafeArea {
  if (typeof document === 'undefined' || !document.body) return NO_SAFE_AREA;
  if (!probe || !probe.isConnected) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(probe);
  }
  const s = getComputedStyle(probe);
  const px = (v: string): number => Math.max(0, parseFloat(v) || 0);
  const a = { top: px(s.paddingTop), right: px(s.paddingRight), bottom: px(s.paddingBottom), left: px(s.paddingLeft) };
  return a.top || a.right || a.bottom || a.left ? a : NO_SAFE_AREA;
}
