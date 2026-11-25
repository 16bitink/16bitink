import { MUSIC_TRACKS } from './tracks';

/**
 * One looping track per city, by its art style (gulf, oldtown, islands, hills,
 * rivers), and `menu` for the desk and title. Files live in src/audio/music and
 * are made by dev/audio/make_audio.py. A style without a track is silence, and
 * only the file being played is downloaded.
 */
export const musicUrl = (style: string): string | null => MUSIC_TRACKS[style]?.url ?? null;
export const MENU_MUSIC: string | null = musicUrl('menu');

/** The track a url belongs to, for its loop points. */
const trackOf = (url: string) => Object.values(MUSIC_TRACKS).find((t) => t.url === url) ?? null;

/** How long one track takes to give way to the next, seconds. */
const FADE_S = 1.2;
/** Tracks kept decoded: the menu and a city, going back and forth, needn't load each time. */
const KEPT = 2;

/**
 * Background music on the game's audio context. A decoded track loops by
 * itself with no gap between its loop points; the file carries half a second of
 * the loop on either side, so what the MP3 encoder adds is never heard.
 */
export class MusicPlayer {
  private wanted: string | null = null;
  private now: { url: string; source: AudioBufferSourceNode; level: GainNode } | null = null;
  private readonly decoded = new Map<string, Promise<AudioBuffer>>();

  constructor(private readonly ctx: AudioContext, private readonly out: AudioNode) {}

  /** Plays the track at `url`, fading out whatever played before; the same track carries on. */
  play(url: string | null): void {
    this.wanted = url;
    if (this.now?.url === url) return;
    this.fadeOut();
    if (!url || !trackOf(url)) return;
    void this.buffer(url).then((buffer) => {
      if (this.wanted === url && this.now?.url !== url) this.begin(url, buffer);
    }).catch((e) => {
      console.warn('[inkroad] music failed', e);
      this.decoded.delete(url);
    });
  }

  private buffer(url: string): Promise<AudioBuffer> {
    const known = this.decoded.get(url);
    if (known) {
      this.decoded.delete(url);
      this.decoded.set(url, known);
      return known;
    }
    const loading = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`music ${r.status}`);
      return r.arrayBuffer();
    }).then((data) => this.ctx.decodeAudioData(data));
    this.decoded.set(url, loading);
    for (const old of [...this.decoded.keys()].slice(0, -KEPT)) this.decoded.delete(old);
    return loading;
  }

  private begin(url: string, buffer: AudioBuffer): void {
    const track = trackOf(url);
    if (!track) return;
    const t = this.ctx.currentTime;
    const level = this.ctx.createGain();
    level.gain.setValueAtTime(0, t);
    level.gain.linearRampToValueAtTime(1, t + FADE_S);
    level.connect(this.out);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = track.loopStart;
    source.loopEnd = track.loopEnd;
    source.connect(level);
    source.start(t, track.loopStart);
    this.now = { url, source, level };
  }

  private fadeOut(): void {
    const last = this.now;
    if (!last) return;
    this.now = null;
    const t = this.ctx.currentTime;
    last.level.gain.cancelScheduledValues(t);
    last.level.gain.setValueAtTime(last.level.gain.value, t);
    last.level.gain.linearRampToValueAtTime(0, t + FADE_S);
    last.source.stop(t + FADE_S);
    last.source.onended = () => last.level.disconnect();
  }

  stop(): void {
    this.wanted = null;
    this.fadeOut();
  }
}
