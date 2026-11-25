/** Where things are on screen, in the root's own CSS px. */
export interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export function boxOf(el: Element, root: DOMRect): Box {
  const r = el.getBoundingClientRect();
  return { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height };
}

const visible = (el: HTMLElement): boolean => el.offsetParent !== null && el.offsetWidth > 0;

/** The first of these that can be seen. */
export function firstVisible(root: HTMLElement, sels: readonly string[]): HTMLElement | null {
  for (const s of sels) for (const el of root.querySelectorAll<HTMLElement>(s)) if (visible(el)) return el;
  return null;
}

/** A tool's button, or on a folded toolbar the group that holds it. */
export function toolButton(root: HTMLElement, tool: string): HTMLElement | null {
  return firstVisible(root, [`.tools .tbtn[data-v="${tool}"]`, `.tools .tgrp:has([data-v="${tool}"]) .gbtn`]);
}

export const overlap = (a: Box, b: Box): number =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

export const grow = (b: Box, n: number): Box => ({ x: b.x - n, y: b.y - n, w: b.w + n * 2, h: b.h + n * 2 });

/** Of these places for a panel of size w x h, the one that hides least; ties go to the first. */
export function bestPlace(places: readonly { readonly x: number; readonly y: number }[], size: { readonly w: number; readonly h: number }, avoid: readonly { readonly box: Box; readonly weight: number }[]): number {
  let best = 0;
  let least = Infinity;
  places.forEach((p, i) => {
    const cost = avoid.reduce((n, a) => n + overlap({ ...p, ...size }, a.box) * a.weight, 0);
    if (cost < least - 1) { least = cost; best = i; }
  });
  return best;
}
