"""Per-frame (30 fps) voice loudness for Dewy's lip sync, 0..1 (RMS mapped from -40..-12 dBFS,
the same as apps/web/scripts/duo/render.py).

  python3 envelope.py <short>/voice.mp3 [<short>/envelope.json]

Writes a JSON array of numbers; the short imports it and passes { words, envelope } to dewy.ts.
Needs ffmpeg and numpy.
"""
import json
import math
import subprocess
import sys

import numpy as np

FPS = 30
SR = 22050


def envelope(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    samples = np.frombuffer(raw, dtype=np.float32)
    hop = SR // FPS  # 735
    out = []
    for i in range(len(samples) // hop + 1):
        chunk = samples[i * hop:(i + 1) * hop]
        db = 20 * math.log10(max(1e-6, float(np.sqrt(np.mean(chunk ** 2))))) if len(chunk) else -120
        out.append(round(min(1.0, max(0.0, (db + 40) / 28)), 3))
    return out


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    dest = sys.argv[2] if len(sys.argv) == 3 else sys.argv[1].rsplit('.', 1)[0] + '-envelope.json'
    env = envelope(sys.argv[1])
    json.dump(env, open(dest, 'w'))
    print(f'{dest}: {len(env)} frames ({len(env) / FPS:.1f} s)')
