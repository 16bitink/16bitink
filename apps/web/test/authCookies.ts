import type { AstroCookies } from 'astro';

/** Just enough of AstroCookies for the sign-in routes: a jar we can look into. */
export function fakeCookies(initial: Record<string, string> = {}) {
  const jar = new Map(Object.entries(initial));
  const deleted: string[] = [];
  const cookies = {
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); deleted.push(name); },
  } as unknown as AstroCookies;
  return { cookies, jar, deleted };
}
