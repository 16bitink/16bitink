import type { Overlay } from '../scenes/port';

export const OVERLAYS: readonly Exclude<Overlay, 'none' | 'condition'>[] = ['flow', 'parking', 'anger', 'money'];
/** Cities whose roads wear out add a map of how worn they are. */
export const overlaysFor = (ageing: boolean): readonly Exclude<Overlay, 'none'>[] => (ageing ? [...OVERLAYS, 'condition'] : OVERLAYS);
