import type { DriveFamily } from '../logic/parts';
import { noiseBuffer } from './synth';

/** How quickly a loop follows what's asked of it, seconds (a smooth ramp, never a click). */
const GLIDE = 0.12;

/** Each drive's engine: base pitch (Hz), the rise at full speed, and how hard the treads clatter. */
const ENGINE: Readonly<Record<DriveFamily, { readonly base: number; readonly rise: number; readonly clatter: number; readonly whine: number }>> = {
  wheels: { base: 46, rise: 34, clatter: 0, whine: 0.2 },
  halftracks: { base: 40, rise: 30, clatter: 0.5, whine: 0.1 },
  tracks: { base: 34, rise: 26, clatter: 1, whine: 0 },
  hover: { base: 70, rise: 60, clatter: 0, whine: 1 },
};

/**
 * The sounds that run on while a mission plays: the player's engine (its
 * pitch follows the speed; treads clatter faster as it rolls), the wind of
 * a sandstorm or blizzard, and the cargo helicopter's rotor. Each is built
 * once and only its level and pitch change.
 */
export class Loops {
  private readonly out: GainNode;
  private readonly engine: { osc: OscillatorNode; sub: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; clatterLfo: OscillatorNode; clatterDepth: GainNode; clatter: GainNode; whine: OscillatorNode; whineGain: GainNode };
  private readonly wind: { filter: BiquadFilterNode; gain: GainNode; t: number };
  private readonly rotor: { lfo: OscillatorNode; gain: GainNode; pan: StereoPannerNode };
  private readonly sources: AudioScheduledSourceNode[] = [];

  constructor(private readonly ctx: AudioContext, dest: AudioNode) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.engine = this.buildEngine();
    this.wind = this.buildWind();
    this.rotor = this.buildRotor();
    for (const s of this.sources) s.start();
  }

  /** Fades every loop in or out (a mission starting, the pause menu, the results). */
  setActive(on: boolean): void {
    this.ramp(this.out.gain, on ? 1 : 0, on ? 0.3 : 0.15);
  }

  /** The player's engine: which drive, its loudness (0..1) and revs (0..1). */
  setEngine(drive: DriveFamily, level: number, rev: number): void {
    const e = ENGINE[drive];
    const f = e.base + e.rise * rev;
    this.ramp(this.engine.osc.frequency, f);
    this.ramp(this.engine.sub.frequency, f / 2);
    this.ramp(this.engine.filter.frequency, 180 + rev * 420);
    this.ramp(this.engine.gain.gain, level * 0.11);
    // Treads: the clatter's rate follows the speed, and it falls silent standing still.
    this.ramp(this.engine.clatterLfo.frequency, 4 + rev * 14);
    this.ramp(this.engine.clatter.gain, e.clatter * rev * level * 0.05);
    this.ramp(this.engine.whine.frequency, 380 + rev * 520);
    this.ramp(this.engine.whineGain.gain, e.whine * level * (0.25 + rev * 0.75) * 0.012);
  }

  /** The storm's wind: 0 calm … 1 at its height; a blizzard whistles higher than sand. */
  setWind(level: number, blizzard: boolean): void {
    this.wind.t += 1;
    const sway = Math.sin(this.wind.t / 47) * 0.25 + Math.sin(this.wind.t / 13) * 0.1;
    this.ramp(this.wind.filter.frequency, (blizzard ? 1100 : 650) * (1 + sway), 0.4);
    this.ramp(this.wind.gain.gain, level * 0.22, 0.5);
  }

  /** The helicopter's rotor: how loud (0: out of earshot) and where (pan -1..1). */
  setRotor(level: number, pan: number): void {
    this.ramp(this.rotor.gain.gain, level * 0.2);
    this.ramp(this.rotor.pan.pan, pan);
  }

  destroy(): void {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // Already stopped.
      }
    }
    this.out.disconnect();
  }

  private ramp(p: AudioParam, value: number, glide = GLIDE): void {
    const t = this.ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(value, t, glide);
  }

  private noiseSource(): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx);
    src.loop = true;
    this.sources.push(src);
    return src;
  }

  private osc(type: OscillatorType, freq: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    this.sources.push(o);
    return o;
  }

  private buildEngine(): Loops['engine'] {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.out);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;
    filter.connect(gain);
    const osc = this.osc('sawtooth', 34);
    osc.connect(filter);
    const sub = this.osc('square', 17);
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    sub.connect(subGain).connect(filter);
    // Tread clatter: band-passed noise chopped by a fast square LFO.
    const clatter = ctx.createGain();
    clatter.gain.value = 0;
    clatter.connect(this.out);
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const clatterLfo = this.osc('square', 6);
    const clatterDepth = ctx.createGain();
    clatterDepth.gain.value = 0.5;
    clatterLfo.connect(clatterDepth).connect(chop.gain);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1300;
    band.Q.value = 1.5;
    this.noiseSource().connect(band).connect(chop).connect(clatter);
    // A hover fan's (or wheels' gearbox) whine.
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0;
    whineGain.connect(this.out);
    const whine = this.osc('triangle', 400);
    whine.connect(whineGain);
    return { osc, sub, filter, gain, clatterLfo, clatterDepth, clatter, whine, whineGain };
  }

  private buildWind(): Loops['wind'] {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.out);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.9;
    this.noiseSource().connect(filter).connect(gain);
    return { filter, gain, t: 0 };
  }

  private buildRotor(): Loops['rotor'] {
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner();
    pan.connect(this.out);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(pan);
    // Blade thwacks: low noise chopped at about 13 beats a second.
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const lfo = this.osc('square', 13);
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(chop.gain);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    this.noiseSource().connect(low).connect(chop).connect(gain);
    return { lfo, gain, pan };
  }
}
