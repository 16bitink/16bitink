import { PHONE_SIDE } from '@16bitink/game-sdk';

/**
 * InkBrick is played upright. A phone held on its side (iPhone Safari can't
 * lock the screen) gets a card over the game asking to turn it, and a level
 * in play pauses (docs/mobile-playbook.md rule 7, the other way round).
 * Tablets keep the side-by-side layout.
 */
export const TURN_MEDIA = `(orientation: landscape) and (max-height: ${PHONE_SIDE - 1}px) and (hover: none) and (pointer: coarse)`;

export const TURN_HTML = '<div class="turn" role="alert"><div class="panel col center"><div class="turn-phone" aria-hidden="true"></div><p class="t32">Turn your phone upright</p><p class="dim">InkBrick plays top to bottom.</p></div></div>';

export const CSS_TURN = `
.ikb .turn { display: none; position: absolute; inset: 0; z-index: 9; align-items: center; justify-content: center; background: rgba(226, 222, 213, 0.94); }
@media ${TURN_MEDIA} { .ikb .turn { display: flex; } }
.ikb .turn-phone { width: 44px; height: 72px; border: 4px solid var(--ink); border-radius: 10px 8px 11px 9px; animation: ikb-turn 1.8s ease-in-out infinite; }
@keyframes ikb-turn { 0%, 25% { transform: rotate(-90deg); } 60%, 100% { transform: rotate(0deg); } }
@media (prefers-reduced-motion: reduce) { .ikb .turn-phone { animation: none; } }
`;

/** Calls `onTurned` now if the phone is on its side, and whenever it is turned so; returns the unsubscribe. */
export function watchTurned(onTurned: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => undefined;
  const q = matchMedia(TURN_MEDIA);
  if (q.matches) queueMicrotask(onTurned);
  const on = (e: MediaQueryListEvent): void => {
    if (e.matches) onTurned();
  };
  q.addEventListener('change', on);
  return () => q.removeEventListener('change', on);
}
