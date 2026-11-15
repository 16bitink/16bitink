import { evict, MUSIC_FADE_S } from './musicPlan';
import { MUSIC_TRACKS, type TrackId } from './tracks';

/** Tracks kept decoded: the theme and a mission's track, back and forth, needn't load each time. */
const KEPT = 2;

/**
 * The background music on the game's audio context (as InkHeroes'). A looping
 * track repeats between its loop points on Web Audio with no gap; one without
 * (the victory theme) plays once. Tracks crossfade; `level` is the bed
 * everything sits on, so the mission can lower it under the effects.
 */
export class MusicPlayer {
  private wanted: TrackId | null = null;
  private now: { id: TrackId; source: AudioBufferSourceNode; fade: GainNode } | null = null;
  private readonly decoded = new Map<TrackId, Promise<AudioBuffer>>();
  private readonly level: GainNode;

  constructor(private readonly ctx: AudioContext, out: AudioNode, level: number) {
    this.level = ctx.createGain();
    this.level.gain.value = level;
    this.level.connect(out);
  }

  /** What is playing or about to (for tests and the dev page). */
  get playing(): TrackId | null {
    return this.now?.id ?? null;
  }

  /** Moves the bed to `to`, easing over `seconds`. */
  setLevel(to: number, seconds = 0.4): void {
    this.level.gain.setTargetAtTime(to, this.ctx.currentTime, seconds / 3);
  }

  /** Plays `id` (fading out what played before); the same track carries on; null fades to silence. */
  play(id: TrackId | null): void {
    this.wanted = id;
    if (this.now?.id === id) return;
    this.fadeOut();
    if (!id) return;
    void this.buffer(id).then((buffer) => {
      if (this.wanted === id && this.now?.id !== id) this.begin(id, buffer);
    }).catch((e) => {
      console.warn(`[inktanks] could not load the ${id} music`, e);
      this.decoded.delete(id);
    });
  }

  destroy(): void {
    this.wanted = null;
    this.now?.source.stop();
    this.now = null;
    this.level.disconnect();
  }

  private buffer(id: TrackId): Promise<AudioBuffer> {
    const known = this.decoded.get(id);
    if (known) {
      this.decoded.delete(id);
      this.decoded.set(id, known);
      return known;
    }
    const loading = fetch(MUSIC_TRACKS[id].url).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.arrayBuffer();
    }).then((data) => this.ctx.decodeAudioData(data));
    this.decoded.set(id, loading);
    for (const old of evict([...this.decoded.keys()], KEPT)) this.decoded.delete(old);
    return loading;
  }

  private begin(id: TrackId, buffer: AudioBuffer): void {
    const { loopStart, loopEnd } = MUSIC_TRACKS[id];
    const t = this.ctx.currentTime;
    const fade = this.ctx.createGain();
    fade.gain.setValueAtTime(0, t);
    fade.gain.linearRampToValueAtTime(1, t + MUSIC_FADE_S);
    fade.connect(this.level);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    if (loopEnd !== null) {
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
    }
    source.connect(fade);
    source.start(t, loopEnd !== null ? loopStart : 0);
    source.onended = () => {
      fade.disconnect();
      if (this.now?.source === source) this.now = null;
    };
    this.now = { id, source, fade };
  }

  private fadeOut(): void {
    const last = this.now;
    if (!last) return;
    this.now = null;
    const t = this.ctx.currentTime;
    last.fade.gain.cancelScheduledValues(t);
    last.fade.gain.setValueAtTime(last.fade.gain.value, t);
    last.fade.gain.linearRampToValueAtTime(0, t + MUSIC_FADE_S);
    last.source.stop(t + MUSIC_FADE_S);
  }
}
