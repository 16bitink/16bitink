/**
 * A touch screen with no mouse (phones, tablets): the raft gets the
 * thumbstick and the hints say "Tap". Dev pages may force it with ?stick=1|0.
 */
function fromQuery(): boolean | null {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search).get('stick');
  return q === '1' ? true : q === '0' ? false : null;
}

const matches = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches;

export const TOUCH_SCREEN: boolean = fromQuery() ?? matches('(hover: none) and (pointer: coarse)');
