"""InkRoad audio build: raw ElevenLabs takes in dev/audio/raw -> src/audio/music/*.mp3 (seamless loops, ~-20 LUFS),
src/audio/sfx/*.mp3 (mono, trimmed, peak-normalised) and src/audio/tracks.ts (loop points and sfx files).
  python3 dev/audio/make_audio.py
Loop trick as InkHeroes: find where a take best meets its own start, blend the end into the start, keep 0.5 s of loop
either side so an encoder's delay never reaches the loop points; the player loops the decoded buffer between the points."""
import re
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[1]
RAW = HERE / 'raw'
MUSIC = GAME / 'src' / 'audio' / 'music'
SFX = GAME / 'src' / 'audio' / 'sfx'
RATE = 44100
PAD = 0.5
HEAD, SEARCH, WINDOW, FRAME, HOP, BANDS = 3.0, (4.0, 32.0), 5.0, 4096, 882, 48
BLEND = 2.5
LUFS = -20.0
PEAK = 0.89  # -1 dBFS
TRACKS = ('gulf', 'oldtown', 'islands', 'hills', 'rivers', 'menu')
# sfx id -> (raw take, peak dBFS, loop). Loops are seamless crossfades.
SFX_FILES = {
    'horn1': ('horn1', -4, False), 'horn2': ('horn2', -4, False), 'horn3': ('horn3', -4, False), 'truck': ('truck', -4, False),
    'toots': ('toots', -4, False), 'stamp': ('stamp', -3, False), 'coins': ('coins', -6, False), 'till': ('till', -6, False),
    'digger': ('digger', -8, False), 'hammer': ('hammer', -6, False), 'flyover': ('flyover', -5, False), 'cleared': ('cleared', -6, False),
    'letter': ('letter', -6, False), 'badstamp': ('badstamp', -4, False), 'tram': ('tram', -6, False), 'ship': ('ship', -10, False),
    'traffic': ('traffic', -10, True), 'crickets': ('crickets', -12, True), 'page': ('page', -8, False), 'tap': ('tap', -6, False), 'plate': ('plate', -3, False),
}


def decode(path: Path, ch: int = 2) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', str(ch), '-ar', str(RATE), '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).copy()


def encode(audio: np.ndarray, out: Path, bitrate: str) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', str(audio.shape[1]), '-ar', str(RATE), '-i', '-', '-b:a', bitrate, str(out)],
                   input=audio.astype(np.float32).tobytes(), check=True)


def spectrum(audio: np.ndarray) -> np.ndarray:
    mono = audio.mean(axis=1)
    starts = np.arange(0, len(mono) - FRAME, HOP)
    frames = np.stack([mono[i:i + FRAME] for i in starts]) * np.hanning(FRAME)
    power = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    edges = np.unique(np.geomspace(3, FRAME // 2, BANDS + 1).astype(int))
    bands = np.stack([power[:, a:b].sum(axis=1) for a, b in zip(edges, edges[1:])], axis=1)
    level = np.log1p(bands * 1e3)
    return level / (np.linalg.norm(level, axis=1, keepdims=True) + 1e-9)


def best_join(audio: np.ndarray) -> tuple[int, float]:
    sound = spectrum(audio)
    win = int(WINDOW * RATE / HOP)
    want = sound[int(HEAD * RATE / HOP):][:win]
    first = int((len(audio) / RATE - SEARCH[1]) * RATE / HOP)
    last = int((len(audio) / RATE - SEARCH[0]) * RATE / HOP) - win
    scores = [float((want * sound[at:at + win]).sum(axis=1).mean()) for at in range(first, last)]
    at = first + int(np.argmax(scores))
    return nudge(audio, at * HOP), max(scores)


def nudge(audio: np.ndarray, at: int) -> int:
    mono = audio.mean(axis=1)
    head, size, reach = int(HEAD * RATE), RATE // 2, RATE // 20
    want = mono[head:head + size]
    return at - reach + int(np.argmax([np.dot(want, mono[i:i + size]) for i in range(at - reach, at + reach)]))


def lufs(audio: np.ndarray) -> float:
    r = subprocess.run(['ffmpeg', '-nostats', '-f', 'f32le', '-ac', str(audio.shape[1]), '-ar', str(RATE), '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                       input=audio.astype(np.float32).tobytes(), capture_output=True)
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr.decode())[-1])


def build_music(track: str) -> tuple[float, float, float]:
    audio = decode(RAW / f'{track}.mp3')
    start = int(HEAD * RATE)
    end, score = best_join(audio)
    blend = int(BLEND * RATE)
    loop = audio[start:end].copy()
    u = np.linspace(0, 1, blend, dtype=np.float32)[:, None]
    loop[-blend:] = loop[-blend:] * np.cos(u * np.pi / 2) + audio[start - blend:start] * np.sin(u * np.pi / 2)
    loop *= 10 ** ((LUFS - lufs(loop)) / 20)
    loop *= min(1.0, PEAK / np.abs(loop).max())
    pad = int(PAD * RATE)
    encode(np.concatenate([loop[-pad:], loop, loop[:pad]]), MUSIC / f'{track}.mp3', '96k')
    size = (MUSIC / f'{track}.mp3').stat().st_size
    print(f'{track}: loop {len(loop) / RATE:.1f}s join {score:.2f} {lufs(loop):.1f} LUFS peak {20 * np.log10(np.abs(loop).max()):.1f} dB, {size // 1024} KB')
    return PAD, PAD + len(loop) / RATE, score


def trim(a: np.ndarray, thresh: float = 0.003) -> np.ndarray:
    loud = np.where(np.abs(a[:, 0]) > thresh)[0]
    if not len(loud):
        return a
    return a[max(0, loud[0] - int(0.005 * RATE)): min(len(a), loud[-1] + int(0.06 * RATE))]


def build_sfx(name: str, take: str, peak_db: float, loop: bool) -> None:
    a = decode(RAW / f'{take}.mp3', 1)
    if loop:
        x = int(1.0 * RATE)
        u = np.linspace(0, 1, x, dtype=np.float32)[:, None]
        body = a[x:].copy()
        body[-x:] = a[-x:] * np.cos(u * np.pi / 2) + a[:x] * np.sin(u * np.pi / 2)  # the tail fades into what led the start
        a = body
    else:
        a = trim(a)
        fade = int(0.02 * RATE)
        a[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
    a = a * (10 ** (peak_db / 20) / np.abs(a).max())
    encode(a, SFX / f'{name}.mp3', '64k')
    print(f'sfx {name}: {len(a) / RATE:.2f}s peak {20 * np.log10(np.abs(a).max()):.1f} dB, {(SFX / f"{name}.mp3").stat().st_size // 1024} KB')


def write_tracks(points: dict[str, tuple[float, float]]) -> None:
    lines = ['// Generated by dev/audio/make_audio.py: do not edit by hand.']
    lines += [f"import {t}Url from './music/{t}.mp3?url';" for t in points]
    lines += [f"import {s}Url from './sfx/{s}.mp3?url';" for s in SFX_FILES]
    lines += ['', '/** Each music track, with the seconds its loop runs between (the file has 0.5 s of loop on either side). */',
              'export const MUSIC_TRACKS: Readonly<Record<string, { readonly url: string; readonly loopStart: number; readonly loopEnd: number }>> = {']
    lines += [f'  {t}: {{ url: {t}Url, loopStart: {a}, loopEnd: {b:.3f} }},' for t, (a, b) in points.items()]
    lines += ['};', '', '/** The sound-effect files by name. */', 'export const SFX_URLS: Readonly<Record<string, string>> = {']
    lines += [f'  {s}: {s}Url,' for s in SFX_FILES]
    lines += ['};', '']
    (GAME / 'src' / 'audio' / 'tracks.ts').write_text('\n'.join(lines))


if __name__ == '__main__':
    pts = {}
    for t in TRACKS:
        a, b, _ = build_music(t)
        pts[t] = (a, b)
    for n, (take, db, loop) in SFX_FILES.items():
        build_sfx(n, take, db, loop)
    write_tracks(pts)
