import { Loops } from './loops';
import { loadSamples, SAMPLE_GAIN } from './samples';
import { canPlay, spatial, type Cue, type SfxId, type View } from './sfx';
import { synthesize } from './synth';

/** Gestures that may start audio (browsers block it before one). */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
/** Overall loudness. */
const MASTER = 0.7;
/** Quieter than this isn't worth the nodes. */
const INAUDIBLE = 0.03;
/** Repeated sounds (a machine gun's belt) vary their pitch this much either way. */
const JITTER = 0.06;
/** Sounds that keep their exact pitch (tunes and the interface). */
const TUNED: ReadonlySet<SfxId> = new Set(['pickup', 'intel', 'flagUp', 'flagLost', 'win', 'lose', 'click', 'radio', 'siren', 'horn']);

/**
 * The game's sound, as the other games': one audio context per mounted game,
 * started on the first click or key (browsers block audio before one), quiet
 * while the tab is hidden, muted when the save says so. Effects play once;
 * the mission's running sounds (engine, wind, rotor) live in `loops`.
 */
export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private loopsNow: Loops | null = null;
  private loopsWanted = false;
  private readonly last = new Map<string, number>();
  /** The recordings, once fetched (see samples.ts). */
  private samples: ReadonlyMap<SfxId, readonly AudioBuffer[]> = new Map();
  private mutedNow: boolean;
  private readonly unlock = (): void => this.start();
  private readonly onVisibility = (): void => {
    if (!this.ctx) return;
    void (document.hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
  };

  constructor(muted: boolean) {
    this.mutedNow = muted;
    for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, this.unlock, { capture: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  get muted(): boolean {
    return this.mutedNow;
  }

  setMuted(muted: boolean): void {
    this.mutedNow = muted;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : MASTER, this.ctx.currentTime, 0.03);
  }

  /** Plays a cue: placed in the world and heard from `view`, or in the player's ear when it has no place. */
  play(cue: Cue, view?: View): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.mutedNow || ctx.state !== 'running') return;
    const place = cue.x !== undefined && cue.y !== undefined && view ? spatial({ x: cue.x, y: cue.y }, view) : { pan: 0, gain: 1 };
    const gain = place.gain * (cue.gain ?? 1);
    if (gain < INAUDIBLE || !canPlay(cue.id, performance.now(), this.last)) return;
    const level = ctx.createGain();
    level.gain.value = gain;
    const panner = ctx.createStereoPanner();
    panner.pan.value = place.pan;
    level.connect(panner).connect(this.master);
    const jitter = TUNED.has(cue.id) ? 1 : 1 + (Math.random() * 2 - 1) * JITTER;
    const pitch = (cue.pitch ?? 1) * jitter;
    const takes = this.samples.get(cue.id);
    if (takes && takes.length > 0) this.playSample(ctx, takes[Math.floor(Math.random() * takes.length)]!, level, cue.id, pitch, place.gain);
    else synthesize(cue.id, { ctx, out: level, t: ctx.currentTime + 0.005, pitch });
    // Let the graph go once the sound has surely finished (the longest runs under 3 s).
    setTimeout(() => panner.disconnect(), 3500);
  }

  /** A recording: farther off sounds duller (a low-pass closes as it fades), and pitch shifts by playback rate. */
  private playSample(ctx: AudioContext, buf: AudioBuffer, out: AudioNode, id: SfxId, pitch: number, near: number): void {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pitch;
    const trim = ctx.createGain();
    trim.gain.value = SAMPLE_GAIN[id] ?? 1;
    const dull = ctx.createBiquadFilter();
    dull.type = 'lowpass';
    dull.frequency.value = 1200 + near * near * 18000;
    src.connect(dull).connect(trim).connect(out);
    src.start(ctx.currentTime + 0.005);
  }

  /** A button's click. */
  click(): void {
    this.play({ id: 'click' });
  }

  /** The running sounds, once audio has started (null before the first gesture). */
  get loops(): Loops | null {
    return this.loopsNow;
  }

  /** Turns the mission's running sounds on or off (they fade). */
  setLoops(on: boolean): void {
    this.loopsWanted = on;
    this.loopsNow?.setActive(on);
  }

  destroy(): void {
    for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, this.unlock, { capture: true });
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.loopsNow?.destroy();
    this.loopsNow = null;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }

  private start(): void {
    if (this.ctx) {
      // Not only 'suspended': iOS leaves it 'interrupted' after a call, Siri or the lock screen.
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed' && !document.hidden) void this.ctx.resume().catch(() => undefined);
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.mutedNow ? 0 : MASTER;
    this.master.connect(this.ctx.destination);
    this.loopsNow = new Loops(this.ctx, this.master);
    this.loopsNow.setActive(this.loopsWanted);
    void loadSamples(this.ctx).then((m) => {
      if (this.ctx) this.samples = m;
    });
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }
}
