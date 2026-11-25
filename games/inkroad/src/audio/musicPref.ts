/**
 * The music switch, apart from the sound switch: Sound mutes everything, this
 * mutes only the music (and keeps it from downloading). Remembered on the device.
 */
const KEY = 'inkroad.music';
type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

let on = read();

export const isMusicOn = (): boolean => on;

export function setMusicOn(next: boolean): void {
  on = next;
  try {
    localStorage.setItem(KEY, next ? 'on' : 'off');
  } catch (e) {
    console.warn('[inkroad] music setting not saved', e);
  }
  for (const fn of listeners) fn(on);
}

/** Flips the switch and returns the new state. */
export function toggleMusic(): boolean {
  setMusicOn(!on);
  return on;
}

export const musicLabel = (): string => `Music ${on ? 'on' : 'off'}`;

export function onMusicChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
