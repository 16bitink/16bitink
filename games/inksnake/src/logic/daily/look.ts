import type { LevelDef } from '../../level/types';
import { FOG_SIGHT } from './params';

/**
 * How a level is lit: night (`dark`), or fog (the night layer with a far
 * wider ring of sight, misty rather than dark). Null: daylight.
 */
export function nightOf(level: LevelDef): { readonly fog: boolean; readonly sight: number } | null {
  if (level.rule === 'fog') return { fog: true, sight: FOG_SIGHT };
  return level.dark ? { fog: false, sight: 1 } : null;
}
