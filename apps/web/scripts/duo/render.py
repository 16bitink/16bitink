"""
Renders a Gus & Pip gameplay short: the owner's recording, cropped to 9:16 and
following the player, with the two co-hosts reacting at the bottom and
word-by-word captions. See docs/duo-characters.md.

  python3 apps/web/scripts/duo/render.py apps/web/scripts/duo/episodes/ep1.json

The episode file names the recording, the cut, the voice track, the timeline
(who says what, when, and with which expressions), the word timings (Scribe)
and the player track. Every input is made by the steps in the doc; this script
only draws and encodes. Needs ffmpeg, Pillow and numpy.
"""
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import lipsync

HERE = Path(__file__).resolve().parent
OUT_W, OUT_H, FPS = 1080, 1920, 30
SRC_W, SRC_H = 1920, 1080
PANEL_H = 640                       # the hosts' "cam" panel at the top; gameplay fills the rest
ZOOM = 2.0                          # source px -> output px
CROP_W, CROP_H = round(OUT_W / ZOOM), round((OUT_H - PANEL_H) / ZOOM)  # 540 x 640 of the recording
PLAYER_AT = (OUT_W / 2, 1000)       # where the player sits on screen: the middle of the clear area below the panel
CAPTION_Y = 770                     # caption baseline, just under the panel
SAFE_TOP, SAFE_BOTTOM = 270, 1250   # Shorts UI covers above and below
COLOURS = {'gus': (255, 201, 60), 'pip': (142, 227, 239)}
FONT = str(HERE / 'fonts' / 'LuckiestGuy-Regular.ttf')


# ---------- inputs ----------

def load_episode(path):
    ep = json.loads(Path(path).read_text())
    base = Path(path).parent
    resolve = lambda key: (base / ep[key]).resolve()
    timeline = json.loads(resolve('timeline').read_text())
    words = json.loads(resolve('words').read_text())['words']
    track = json.loads(resolve('track').read_text())
    return ep, resolve, timeline, words, track


def read_wav(path):
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return data, sr


def envelope(samples, sr, n_frames):
    """Loudness per video frame, 0..1 (RMS mapped from -40..-12 dBFS)."""
    hop = sr // FPS
    env = np.zeros(n_frames)
    for i in range(n_frames):
        chunk = samples[i * hop:(i + 1) * hop]
        if len(chunk):
            db = 20 * math.log10(max(1e-6, float(np.sqrt(np.mean(chunk ** 2)))))
            env[i] = min(1.0, max(0.0, (db + 40) / 28))
    return env


def load_art():
    art = {}
    for p in sorted((HERE / 'art').glob('*.png')):
        who, pose = p.stem.split('-', 1)
        art.setdefault(who, {})[pose] = Image.open(p).convert('RGBA')
    return art


def load_mouths():
    """{who: {pose: {key: image}}} from art/mouth/<who>-<pose>-<key>.png (see build_art.py)."""
    mouths = {}
    for p in sorted((HERE / 'art' / 'mouth').glob('*.png')):
        who, rest = p.stem.split('-', 1)
        pose, key = rest.rsplit('-', 1)
        mouths.setdefault(who, {}).setdefault(pose, {})[key] = Image.open(p).convert('RGBA')
    return mouths


# ---------- the gameplay ----------

def crop_centre(track, t, ep):
    """Smoothed player position in source px; eases to the end card's centre at the end."""
    pos = np.array(track['pos'])
    i = min(len(pos) - 1, max(0.0, t * track['fps']))
    lo, hi = int(i), min(len(pos) - 1, int(i) + 1)
    x, y = pos[lo] + (pos[hi] - pos[lo]) * (i - lo)
    card = ep.get('end_card')
    if card and t > card['at']:
        k = min(1.0, (t - card['at']) / 0.4)
        k = k * k * (3 - 2 * k)
        x, y = x + (card['centre'][0] - x) * k, y + (card['centre'][1] - y) * k
    return x, y


def gameplay_frame(raw, track, t, ep):
    x, y = crop_centre(track, t, ep)
    left = x - PLAYER_AT[0] / ZOOM
    top = y - (PLAYER_AT[1] - PANEL_H) / ZOOM
    left = min(max(0, left), SRC_W - CROP_W)
    top = min(max(0, top), SRC_H - CROP_H)
    src = Image.frombuffer('RGB', (SRC_W, SRC_H), raw, 'raw', 'RGB', 0, 1)
    box = tuple(round(v) for v in (left, top, left + CROP_W, top + CROP_H))
    frame = Image.new('RGBA', (OUT_W, OUT_H))
    frame.paste(src.crop(box).resize((OUT_W, OUT_H - PANEL_H), Image.LANCZOS), (0, PANEL_H))
    return frame


def cam_panel():
    """The hosts' panel: a deep ink-blue wash, lighter behind them, with an ink rule and a soft shadow at the seam."""
    yy, xx = np.mgrid[0:OUT_H, 0:OUT_W]
    glow = np.exp(-(((xx - OUT_W / 2) / 620) ** 2 + ((yy - 470) / 330) ** 2))
    rgb = np.stack([22 + 26 * glow, 40 + 36 * glow, 56 + 40 * glow], -1)
    alpha = np.where(yy < PANEL_H, 255, 0)
    seam = (yy >= PANEL_H) & (yy < PANEL_H + 26)
    alpha = np.where(seam, (90 * (1 - (yy - PANEL_H) / 26)).astype(int), alpha)
    rgb = np.where(seam[..., None], 10, rgb)
    rule = (yy >= PANEL_H - 6) & (yy < PANEL_H)
    rgb = np.where(rule[..., None], np.array([16, 20, 28]), rgb)
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')


def make_hosts(art, mouths=None):
    mouths = mouths or {}
    return (Host('gus', art['gus'], 300, PANEL_H - 22, 1.25, 'neutral', mouths.get('gus')),
            Host('pip', art['pip'], 785, PANEL_H - 52, 1.2, 'neutral', mouths.get('pip')))


def draw_overlays(frame, ep, gus, pip, small, t):
    draw_label(frame, 'GUS', (gus.x, PANEL_H - 36), small, COLOURS['gus'])
    draw_label(frame, 'PIP', (pip.x, PANEL_H - 36), small, COLOURS['pip'])
    card = ep.get('end_card')
    if not card or t < card['at']:
        draw_label(frame, ep['credit'], (OUT_W / 2, SAFE_BOTTOM - 30), small, (255, 255, 255))


# ---------- the hosts ----------

class Host:
    def __init__(self, who, art, x, bottom, scale, idle, mouths=None):
        self.who, self.art, self.x, self.bottom, self.base = who, art, x, bottom, scale
        self.mouths = mouths or {}
        self.pose, self.idle, self.key = idle, idle, None
        self.size = scale
        self.shadows = {}
        self.pop = 0.0

    @staticmethod
    def _shadow(img):
        a = img.getchannel('A').filter(ImageFilter.GaussianBlur(9))
        s = Image.new('RGBA', img.size, (10, 16, 24, 0))
        s.putalpha(a.point(lambda v: int(v * 0.55)))
        return s

    def set_pose(self, pose, key=None):
        if pose != self.pose and pose.startswith('puff') and not self.pose.startswith('puff'):
            self.pop = 1.0
        self.pose = pose
        self.key = key if pose in self.mouths else None

    def image(self):
        """The picture for the current pose (and mouth or blink, if the pose has a mouth set), with its shadow."""
        img = self.mouths[self.pose][self.key or 'A'] if self.pose in self.mouths else self.art[self.pose]
        name = (self.pose, self.key)
        if name not in self.shadows:
            self.shadows[name] = self._shadow(img)
        return img, self.shadows[name]

    def draw(self, frame, t, speaking, level):
        target = self.base * (1.06 if speaking else 0.95)
        self.size += (target - self.size) * 0.25
        self.pop *= 0.82
        bob = -level * 14 if speaking else 3 * math.sin(t * 2.6 + self.x)
        if self.who == 'pip':
            bob += 7 * math.sin(t * 1.7)
        scale = self.size * (1 + 0.14 * self.pop)
        img, shadow = self.image()
        w, h = round(img.width * scale), round(img.height * scale)
        img_s = img.resize((w, h), Image.LANCZOS)
        sh_s = shadow.resize((w, h), Image.LANCZOS)
        x, y = round(self.x - w / 2), round(self.bottom - h + bob)
        frame.alpha_composite(sh_s, (x + 8, y + 12))
        frame.alpha_composite(img_s, (x, y))


def host_state(lines, t):
    """The line being spoken now and the one most recently finished."""
    current, previous = None, None
    for line in lines:
        if line['start'] <= t < line['end']:
            current = line
        if line['end'] <= t:
            previous = line
    return current, previous


def pose_and_mouth(host, line_now, line_prev, mouth, blink):
    """Pose and mouth key for one frame. A speaker whose pose has a mouth set lip-syncs on it
    (`mouth` from lipsync.mouth_track); other poses fall back to open = pose, shut = rest.
    Blinks show whenever the pose has a set and the mouth is shut."""
    speaking = bool(line_now and line_now['who'] == host.who)
    if speaking and line_now['pose'] in host.mouths:
        pose, key = line_now['pose'], mouth or 'A'
    else:
        pose, key = pose_for(host, line_now, line_prev, speaking and mouth not in (None, 'A')), 'A'
    if key == 'A' and blink and pose in host.mouths and blink in host.mouths[pose]:
        key = blink
    return pose, key


def pose_for(host, line_now, line_prev, open_mouth):
    if line_now and line_now['who'] == host.who:
        return line_now['pose'] if open_mouth else line_now['rest']
    if line_now:
        return line_now.get('other', host.idle)
    if line_prev:
        return line_prev['rest'] if line_prev['who'] == host.who else line_prev.get('other', host.idle)
    return host.idle


# ---------- captions ----------

def caption_chunks(words, lines, fixes):
    """Groups of up to three words, split at punctuation, tagged with the speaker."""
    chunks, cur = [], []
    def speaker(w):
        for line in lines:
            if line['start'] - 0.1 <= w['start'] <= line['end'] + 0.1:
                return line['who']
        return 'gus'
    for w in (w for w in words if w['type'] == 'word'):
        text = fixes.get(w['text'], w['text'])
        item = {'text': text.upper(), 'start': w['start'], 'end': w['end'], 'who': speaker(w)}
        if cur and (cur[-1]['who'] != item['who'] or len(cur) == 3):
            chunks.append(cur); cur = []
        cur.append(item)
        if text[-1] in ',.?!—-…':
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    for i, c in enumerate(chunks):
        nxt = chunks[i + 1][0]['start'] if i + 1 < len(chunks) else c[-1]['end'] + 0.6
        c_end = min(nxt, c[-1]['end'] + 0.5)
        for w in c:
            w['chunk_end'] = c_end
    return chunks


def draw_caption(frame, chunks, t, font, y, max_width=None):
    for chunk in chunks:
        if chunk[0]['start'] <= t < chunk[0]['chunk_end']:
            break
    else:
        return
    age = t - chunk[0]['start']
    size_k = 1.0 + 0.18 * max(0.0, 1 - age / 0.12)
    f = font.font_variant(size=round(font.size * size_k))
    words = [w['text'] for w in chunk]
    space = f.getlength(' ')
    widths = [f.getlength(w) for w in words]
    total = sum(widths) + space * (len(words) - 1)
    limit = max_width or frame.width - 120
    if total > limit:
        f = f.font_variant(size=round(f.size * limit / total))
        space, widths = f.getlength(' '), [f.getlength(w) for w in words]
        total = sum(widths) + space * (len(words) - 1)
    d = ImageDraw.Draw(frame)
    x = (frame.width - total) / 2
    for w, width in zip(chunk, widths):
        said = w['start'] <= t
        fill = COLOURS[w['who']] if said else (255, 255, 255)
        d.text((x, y), w['text'], font=f, fill=fill, anchor='ls', stroke_width=9, stroke_fill=(16, 20, 28))
        x += width + space


def draw_label(frame, text, centre, font, colour):
    d = ImageDraw.Draw(frame)
    d.text(centre, text, font=font, fill=colour, anchor='mm', stroke_width=6, stroke_fill=(16, 20, 28))


# ---------- audio ----------

def mix_audio(ep, resolve, out_audio):
    """Game sound from the recording under the voices, ducked while anyone talks."""
    src, voices = resolve('recording'), resolve('voices')
    start, end = ep['cut']
    graph = (
        f"[0:a]atrim=0:{end - start},asetpts=PTS-STARTPTS,volume={ep.get('game_gain', 1.0)}[g];"
        "[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=2[v][sc];"
        "[g][sc]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=300[gd];"
        "[gd][v]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-2:LRA=11,alimiter=limit=0.63:level=disabled[a]"
    )
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(start), '-i', str(src), '-i', str(voices),
                    '-filter_complex', graph, '-map', '[a]', '-ar', '48000', str(out_audio)], check=True)


# ---------- main ----------

def render(ep_path):
    ep, resolve, timeline, words, track = load_episode(ep_path)
    lines, duration = timeline['lines'], timeline['end']
    n_frames = round(duration * FPS)
    voice, sr = read_wav(resolve('voices'))
    level = envelope(voice, sr, n_frames)
    art = load_art()
    gus, pip = make_hosts(art, load_mouths())
    chunks = caption_chunks(words, lines, ep.get('caption_fixes', {}))
    mouth = lipsync.mouth_track(words, lines, level, FPS)
    blink = {'gus': lipsync.blink_track(n_frames, FPS, 1), 'pip': lipsync.blink_track(n_frames, FPS, 2)}
    cap_font = ImageFont.truetype(FONT, 88)
    small = ImageFont.truetype(FONT, 40)
    big = ImageFont.truetype(FONT, 150)
    panel = cam_panel()
    out = resolve('output')
    out.parent.mkdir(parents=True, exist_ok=True)
    audio = out.with_suffix('.m4a.wav')
    mix_audio(ep, resolve, audio)

    start = ep['cut'][0]
    dec = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-ss', str(start), '-i', str(resolve('recording')),
                            '-vf', f'fps={FPS},scale={SRC_W}:{SRC_H}', '-frames:v', str(n_frames),
                            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{OUT_W}x{OUT_H}', '-r', str(FPS), '-i', '-', '-i', str(audio),
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
                            '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)],
                           stdin=subprocess.PIPE)
    frame_bytes = SRC_W * SRC_H * 3
    last_raw = None
    for i in range(n_frames):
        t = i / FPS
        raw = dec.stdout.read(frame_bytes)
        if len(raw) == frame_bytes:
            last_raw = raw
        frame = gameplay_frame(last_raw, track, t, ep)
        frame.alpha_composite(panel)
        now, prev = host_state(lines, t)
        for host in (gus, pip):
            m = mouth.get(host.who, [None] * n_frames)[i]
            host.set_pose(*pose_and_mouth(host, now, prev, m, blink[host.who][i]))
        for host in sorted((gus, pip), key=lambda h: bool(now and now['who'] == h.who)):
            speaking = bool(now and now['who'] == host.who)
            host.draw(frame, t, speaking, level[i] if speaking else 0.0)
        draw_overlays(frame, ep, gus, pip, small, t)
        part = ep.get('part_card')
        if part and t >= part['at']:
            k = min(1.0, (t - part['at']) / 0.15)
            draw_label(frame, part['text'], (OUT_W / 2, CAPTION_Y - 40),
                       big.font_variant(size=round(130 * (1.3 - 0.3 * k))), COLOURS['gus'])
        else:
            draw_caption(frame, chunks, t, cap_font, CAPTION_Y)
        enc.stdin.write(frame.convert('RGB').tobytes())
        if i % 150 == 0:
            print(f'{t:5.1f}s / {duration:.1f}s', flush=True)
    enc.stdin.close()
    enc.wait()
    dec.terminate()
    audio.unlink(missing_ok=True)
    print('wrote', out)


def stills(ep_path, times, out_dir):
    """One composed frame per time, for checking the layout before a full render."""
    ep, resolve, timeline, words, track = load_episode(ep_path)
    lines = timeline['lines']
    voice, sr = read_wav(resolve('voices'))
    level = envelope(voice, sr, round(timeline['end'] * FPS) + 1)
    art, mouths = load_art(), load_mouths()
    chunks = caption_chunks(words, lines, ep.get('caption_fixes', {}))
    mouth = lipsync.mouth_track(words, lines, level, FPS)
    cap_font, small = ImageFont.truetype(FONT, 88), ImageFont.truetype(FONT, 40)
    panel = cam_panel()
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    for t in times:
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(ep['cut'][0] + t), '-i', str(resolve('recording')),
                              '-frames:v', '1', '-vf', f'scale={SRC_W}:{SRC_H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                             capture_output=True, check=True).stdout
        frame = gameplay_frame(raw, track, t, ep)
        frame.alpha_composite(panel)
        now, prev = host_state(lines, t)
        lv = level[min(len(level) - 1, round(t * FPS))]
        hosts = make_hosts(art, mouths)
        i = min(len(level) - 1, round(t * FPS))
        for h in hosts:
            speaking = bool(now and now['who'] == h.who)
            h.size = h.base * (1.06 if speaking else 0.95)
            h.set_pose(*pose_and_mouth(h, now, prev, mouth.get(h.who, [None] * len(level))[i], None))
            h.pop = 0.0
            h.draw(frame, t, speaking, lv if speaking else 0.0)
        draw_overlays(frame, ep, *hosts, small, t)
        draw_caption(frame, chunks, t, cap_font, CAPTION_Y)
        frame.convert('RGB').save(Path(out_dir) / f'still-{t:05.2f}.png')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[2] == '--stills':
        stills(sys.argv[1], [float(v) for v in sys.argv[3].split(',')], sys.argv[4])
    else:
        render(sys.argv[1])
