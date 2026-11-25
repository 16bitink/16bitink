/** Small DOM helpers: escaped text, a click router by data-act, the one-time style tag. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export type ActFn = (value: string, el: HTMLElement) => void;

/**
 * Click routing for one container: `<button data-act="tool" data-v="street">`
 * calls acts.tool('street'). Range inputs with data-act call it on every input.
 * The container's markup can be replaced freely; the listeners stay.
 */
export class Router {
  private acts = new Map<string, ActFn>();

  constructor(root: HTMLElement) {
    root.addEventListener('click', (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-act]');
      if (!el || !root.contains(el) || el.tagName === 'INPUT' || (el as HTMLButtonElement).disabled) return;
      const fn = this.acts.get(el.dataset.act!);
      if (!fn) return;
      e.stopPropagation();
      fn(el.dataset.v ?? '', el);
    });
    root.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement | null;
      if (!el || el.tagName !== 'INPUT' || !el.dataset.act) return;
      this.acts.get(el.dataset.act)?.(el.value, el);
    });
  }

  /** Replaces the actions (a screen changed). */
  set(map: Readonly<Record<string, ActFn>>): void {
    this.acts = new Map(Object.entries(map));
  }

  add(map: Readonly<Record<string, ActFn>>): void {
    for (const [k, v] of Object.entries(map)) this.acts.set(k, v);
  }
}

/** A div with a class, appended to `parent`. */
export function div(parent: HTMLElement, className: string, html = ''): HTMLElement {
  const el = parent.ownerDocument.createElement('div');
  el.className = className;
  if (html) el.innerHTML = html;
  parent.appendChild(el);
  return el;
}

/** Sets text or an attribute only when it changed, so per-frame updates cost nothing when nothing moved. */
export class Binder {
  private readonly last = new Map<string, string>();

  constructor(private readonly root: HTMLElement) {}

  private find(key: string): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`[data-k="${key}"]`);
  }

  text(key: string, value: string): void {
    if (this.last.get(`t:${key}`) === value) return;
    this.last.set(`t:${key}`, value);
    const el = this.find(key);
    if (el) el.textContent = value;
  }

  attr(key: string, name: string, value: string): void {
    const id = `a:${key}:${name}`;
    if (this.last.get(id) === value) return;
    this.last.set(id, value);
    this.find(key)?.setAttribute(name, value);
  }

  css(key: string, name: string, value: string): void {
    const id = `c:${key}:${name}`;
    if (this.last.get(id) === value) return;
    this.last.set(id, value);
    this.find(key)?.style.setProperty(name, value);
  }

  cls(key: string, name: string, on: boolean): void {
    const id = `k:${key}:${name}`;
    const v = on ? '1' : '0';
    if (this.last.get(id) === v) return;
    this.last.set(id, v);
    this.find(key)?.classList.toggle(name, on);
  }
}

/** Runs `fn` when `value` differs from the last time under `key` (a cheap dirty check for innerHTML). */
export class Dirty {
  private readonly last = new Map<string, unknown>();
  changed(key: string, value: unknown): boolean {
    if (this.last.get(key) === value) return false;
    this.last.set(key, value);
    return true;
  }
}
