import type { CityEvent } from '../sim/types';
import { MENU_MUSIC, MusicPlayer } from './music';
import { isMusicOn, onMusicChange } from './musicPref';
import { loadSamples, SAMPLES } from './samples';
import { MIN_GAP_MS, noiseBuffer, SFX_IDS, VOICES, type SfxId } from './synth';

/**
 * Plays the recorded sounds (synth voices where a take is missing), throttled
 * per sound, plus the traffic bed and the music. The AudioContext starts on
 * the first user gesture; until then sounds are skipped silently.
 */
const MASTER_GAIN = 0.7;
export const BED_MAX_GAIN = 0.032;
/** Cars at which the bed is at full busyness. */
export const BED_FULL_CARS = 400;
/** The recorded traffic loop is louder than the noise it replaces. */
const BED_SAMPLE_SCALE = 5;
const MUSIC_GAIN = 0.5;
/** Music level while a card's sound is on, and how long it takes to come back. */
export const DUCK_LEVEL = 0.4;
const DUCK_BACK_S = 0.6;
/** Sounds that speak over the music, with how long the music stays down, ms. */
export const DUCKS: Readonly<Partial<Record<SfxId, number>>> = { stamp: 900, thump: 1100, plate: 1100, letter: 1800, chime: 1800, cleared: 1800, error: 1200, toots: 900 };
/** The horns share a limit: at most this many in HORN_WINDOW_MS, and never closer than HORN_GAP_MS. */
const HORNS: readonly SfxId[] = ['honk', 'truck', 'jam'];
export const HORN_GAP_MS = 320;
export const HORN_WINDOW_MS = 5000;
export const HORN_MAX = 3;
/** Far-off tram and ship, no more often than this (ms) while the city is busy. */
const AMBIENT_EVERY_MS = [35000, 90000] as const;

export const isSfx = (id: string): id is SfxId => (SFX_IDS as readonly string[]).includes(id);

/** The bed's gain and brightness for a number of cars, 0 when quiet. Pure, so it is tested. */
export function bedLevel(cars: number): { readonly gain: number; readonly cutoff: number } {
  const x = Math.min(1, Math.max(0, cars / BED_FULL_CARS));
  return { gain: BED_MAX_GAIN * Math.sqrt(x), cutoff: 160 + 420 * x };
}

/** Whether a horn may sound now, given when the earlier horns did. Pure, so it is tested. */
export function hornAllowed(history: readonly number[], now: number): boolean {
  const recent = history.filter((t) => now - t < HORN_WINDOW_MS);
  if (recent.length >= HORN_MAX) return false;
  return recent.length === 0 || now - recent[recent.length - 1]! >= HORN_GAP_MS;
}

export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bedGain: GainNode | null = null;
  private bedFilter: BiquadFilterNode | null = null;
  private bedSource: AudioBufferSourceNode | null = null;
  private bedIsSample = false;
  private musicBus: GainNode | null = null;
  private player: MusicPlayer | null = null;
  private samples: ReadonlyMap<string, AudioBuffer> = new Map();
  private wantedMusic: string | null = MENU_MUSIC;
  private duckUntil = 0;
  private hornTimes: number[] = [];
  private nextAmbient = performance.now() + AMBIENT_EVERY_MS[0];
  private readonly last = new Map<SfxId, number>();
  private readonly unlock = (): void => this.start();
  private readonly stopMusicWatch: () => void;

  constructor(private muted: boolean) {
    addEventListener('pointerdown', this.unlock, { capture: true });
    addEventListener('keydown', this.unlock, { capture: true });
    this.stopMusicWatch = onMusicChange(() => this.applyMusic());
  }

  private start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = isMusicOn() ? MUSIC_GAIN : 0;
      this.musicBus.connect(this.master);
      this.player = new MusicPlayer(ctx, this.musicBus);
      this.startBed(ctx);
      this.applyMusic();
      void loadSamples(ctx).then((s) => {
        if (this.ctx !== ctx) return;
        this.samples = s;
        this.useSampleBed();
      });
    } catch (e) {
      console.warn('[inkroad] no audio', e);
    }
  }

  private startBed(ctx: AudioContext): void {
    this.bedFilter = ctx.createBiquadFilter();
    this.bedFilter.type = 'lowpass';
    this.bedFilter.frequency.value = 160;
    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0;
    this.bedFilter.connect(this.bedGain).connect(this.master!);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    src.connect(this.bedFilter);
    src.start();
    this.bedSource = src;
  }

  /** Swaps the synth noise for the recorded traffic loop once it has loaded. */
  private useSampleBed(): void {
    const buf = this.samples.get('traffic');
    if (!this.ctx || !buf || !this.bedFilter || this.bedIsSample) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.bedFilter);
    src.start();
    this.bedSource?.stop();
    this.bedSource = src;
    this.bedIsSample = true;
  }

  /** The soft traffic bed, busier with more cars (0 stops it, e.g. paused or in a menu). */
  setTraffic(cars: number): void {
    if (!this.ctx || !this.bedGain || !this.bedFilter) return;
    const { gain, cutoff } = bedLevel(cars);
    const t = this.ctx.currentTime;
    const k = this.bedIsSample ? BED_SAMPLE_SCALE : 1;
    this.bedGain.gain.setTargetAtTime(gain * k, t, 0.4);
    this.bedFilter.frequency.setTargetAtTime(this.bedIsSample ? 600 + cutoff * 8 : cutoff, t, 0.4);
    if (cars > 120) this.maybeAmbient();
  }

  /** A far-off tram bell or ship horn now and then over a busy city. */
  private maybeAmbient(): void {
    const now = performance.now();
    if (now < this.nextAmbient) return;
    const [lo, hi] = AMBIENT_EVERY_MS;
    this.nextAmbient = now + lo + Math.random() * (hi - lo);
    this.play(Math.random() < 0.6 ? 'tram' : 'ship');
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : MASTER_GAIN;
  }

  private playSample(id: SfxId, pitch: number): boolean {
    const spec = SAMPLES[id];
    if (!spec || !this.ctx || !this.master) return false;
    const files = spec.files.filter((f) => this.samples.has(f));
    if (!files.length) return false;
    const buffer = this.samples.get(files[Math.floor(Math.random() * files.length)]!)!;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(spec.gain, t);
    const len = Math.min(buffer.duration / pitch, spec.max ?? Infinity);
    if (spec.max !== undefined && buffer.duration / pitch > spec.max) {
      g.gain.setValueAtTime(spec.gain, t + len - 0.8);
      g.gain.linearRampToValueAtTime(0, t + len);
    }
    src.connect(g).connect(this.master);
    src.start(t);
    src.stop(t + len + 0.05);
    src.onended = () => g.disconnect();
    return true;
  }

  play(id: SfxId, pitch = 1): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last.get(id) ?? -Infinity) < MIN_GAP_MS[id]) return;
    if (HORNS.includes(id)) {
      if (!hornAllowed(this.hornTimes, now)) return;
      this.hornTimes = [...this.hornTimes.filter((t) => now - t < HORN_WINDOW_MS), now];
    }
    this.last.set(id, now);
    try {
      if (!this.playSample(id, pitch)) VOICES[id]({ ctx: this.ctx, out: this.master, t: this.ctx.currentTime, pitch });
      const duck = DUCKS[id];
      if (duck !== undefined) this.duck(duck);
    } catch (e) {
      console.warn(`[inkroad] sound ${id} failed`, e);
    }
  }

  /** Plays a sound by name, ignoring names it does not have. */
  playNamed(id: string): void {
    if (isSfx(id)) this.play(id);
  }

  /** Dips the music under a sound for `ms`, then brings it back. */
  duck(ms: number): void {
    if (!this.ctx || !this.musicBus || !isMusicOn()) return;
    const t = this.ctx.currentTime;
    const back = t + ms / 1000;
    if (back < this.duckUntil) return;
    this.duckUntil = back;
    const g = this.musicBus.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(MUSIC_GAIN * DUCK_LEVEL, t, 0.05);
    g.setTargetAtTime(MUSIC_GAIN, back, DUCK_BACK_S / 3);
  }

  /** The sounds for what the city just did. */
  onEvents(events: readonly CityEvent[]): void {
    for (const e of events) {
      if (e.t === 'built') this.play(e.what === 'control' ? 'thump' : 'build');
      else if (e.t === 'cleared') { this.play('cleared'); this.play('toots'); }
      else if (e.t === 'honk') this.play('honk', 0.9 + Math.random() * 0.3);
      else if (e.t === 'letter') this.play('letter');
      else if (e.t === 'money') this.play('till');
      else if (e.t === 'fine') this.play('cash');
      else if (e.t === 'jammed') this.play('jam');
      else if (e.t === 'opened') this.play('chime');
    }
  }

  /** Music slot: a looping track's url, or null for the menu's. Nothing plays until the player has tapped once. */
  playMusic(url: string | null): void {
    this.wantedMusic = url ?? MENU_MUSIC;
    this.applyMusic();
  }

  /** Starts or stops the track to match the music switch; a track that is off is not downloaded. */
  private applyMusic(): void {
    if (!this.ctx || !this.player || !this.musicBus) return;
    const on = isMusicOn();
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(on ? MUSIC_GAIN : 0, t, 0.15);
    this.duckUntil = 0;
    this.player.play(on ? this.wantedMusic : null);
  }

  destroy(): void {
    removeEventListener('pointerdown', this.unlock, { capture: true });
    removeEventListener('keydown', this.unlock, { capture: true });
    this.stopMusicWatch();
    this.player?.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
