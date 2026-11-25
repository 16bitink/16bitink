import type { Speed } from '../ui/types';

export interface KeyActs { setSpeed(s: Speed): void; togglePause(): void; menu(): void; mute(): void; hasCity(): boolean }

const NUMBER_SPEED: Readonly<Record<string, Speed>> = { '1': 1, '2': 2, '3': 4 };

/** Space pauses, 1 to 3 pick the speed, Esc opens the menu, M mutes. Returns the remover. */
export function bindKeys(a: KeyActs): () => void {
  const onKey = (e: KeyboardEvent): void => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 'm' || e.key === 'M') return a.mute();
    if (!a.hasCity()) return;
    if (e.key === 'Escape') return a.menu();
    if (e.key === ' ') {
      e.preventDefault();
      return a.togglePause();
    }
    const s = NUMBER_SPEED[e.key];
    if (s) a.setSpeed(s);
  };
  addEventListener('keydown', onKey);
  return () => removeEventListener('keydown', onKey);
}
