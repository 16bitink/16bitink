/// <reference types="vite/client" />
import { esc } from './dom';

/**
 * Every picture the UI shows, behind one manifest. Files live in src/ui/img
 * (see its LIST.md); a key maps to a file by name:
 *   portrait-dewy, portrait-sulo_stern   portraits/   the five officials (and moods)
 *   resident-hedgehog                    portraits/   a resident's bust (Complaint.animal)
 *   tool-street, group-roads, ov-flow, bar-trips   tools/
 *   tech-<TechDef.icon>                  tech/
 *   city-1..5, title, end-replaced, end-done, cover   pictures/
 *   mat-paper, mat-leather, mat-tape, mat-plate, mat-seal, mat-stamp, letter   materials/
 * `setPics` swaps any key to another URL (a test, a re-skin).
 */
const files = import.meta.glob<string>('./img/**/*.webp', { query: '?url', import: 'default', eager: true });
const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) byName.set(path.replace(/^\.\/img\//, '').replace(/\.webp$/, ''), url);

const CITY_FILES = ['', 'saffron_bay', 'old_harbour', 'twin_isles', 'seven_hills', 'cross_rivers'] as const;
const FIXED: Readonly<Record<string, string>> = {
  title: 'pictures/menu_key_art', 'end-replaced': 'pictures/end_replaced', 'end-done': 'pictures/end_city_done', cover: 'pictures/cover_square',
  letter: 'materials/envelope', 'mat-paper': 'materials/paper', 'mat-leather': 'materials/desk_leather', 'mat-wood': 'materials/desk_wood',
  'mat-tape': 'materials/tape', 'mat-plate': 'materials/plate_blank', 'mat-seal': 'materials/wax_seal', 'mat-stamp': 'materials/stamp_ring',
};

/** The file path (without folder prefix rules) a key resolves to. */
export function fileOf(key: string): string | null {
  const fixed = FIXED[key];
  if (fixed) return fixed;
  const [kind, rest = ''] = [key.slice(0, key.indexOf('-')), key.slice(key.indexOf('-') + 1)];
  switch (kind) {
    case 'portrait': case 'resident': return `portraits/${rest}`;
    case 'tool': return `tools/${rest}`;
    case 'group': return `tools/group_${rest.toLowerCase()}`;
    case 'ov': return `tools/ov_${rest}`;
    case 'bar': return `tools/bar_${rest}`;
    case 'tech': return `tech/${rest}`;
    case 'city': return CITY_FILES[Number(rest)] ? `pictures/city_${CITY_FILES[Number(rest)]}` : null;
    default: return null;
  }
}

const overrides = new Map<string, string>();
export const setPics = (map: Readonly<Record<string, string>>): void => {
  for (const [k, v] of Object.entries(map)) overrides.set(k, v);
};

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** The picture's URL; a missing file gives a blank pixel (and a console note), never a broken image. */
export function picUrl(key: string): string {
  const o = overrides.get(key);
  if (o) return o;
  const f = fileOf(key);
  const url = f ? byName.get(f) : undefined;
  if (url) return url;
  if (f !== null || key) console.debug(`[inkroad] no picture for ${key}`);
  return BLANK;
}

/** An <img> for a picture key. */
export const pic = (key: string, cls = ''): string => `<img class="pic ${esc(cls)}" src="${picUrl(key)}" alt="" draggable="false">`;
