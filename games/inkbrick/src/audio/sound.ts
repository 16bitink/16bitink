import { MIN_GAP_MS, VOICES, type SfxId } from './synth';

/**
 * Plays the synth sounds, throttled per sound so a cascade of breaks is a
 * patter, not a roar. The AudioContext starts on the first user gesture
 * (browsers require it); until then sounds are skipped silently.
 */
const MASTER_GAIN = 0.7;

export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly last = new Map<SfxId, number>();
  private readonly unlock = (): void => this.start();

  constructor(private muted: boolean) {
    addEventListener('pointerdown', this.unlock, { capture: true });
    addEventListener('keydown', this.unlock, { capture: true });
  }

  private start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      console.warn('[inkbrick] no audio', e);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : MASTER_GAIN;
  }

  /** Plays a sound now; `pitch` lets a cascade climb. */
  play(id: SfxId, pitch = 1): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last.get(id) ?? -Infinity) < MIN_GAP_MS[id]) return;
    this.last.set(id, now);
    try {
      VOICES[id]({ ctx: this.ctx, out: this.master, t: this.ctx.currentTime, pitch });
    } catch (e) {
      console.warn(`[inkbrick] sound ${id} failed`, e);
    }
  }

  click(): void {
    this.play('click');
  }

  destroy(): void {
    removeEventListener('pointerdown', this.unlock, { capture: true });
    removeEventListener('keydown', this.unlock, { capture: true });
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
