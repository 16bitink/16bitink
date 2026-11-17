"""
Renders a horizontal (16:9) Gus & Pip episode: gameplay full-frame, Gus in the
bottom-left corner and Pip in the bottom-right on a transparent background
(soft shadows only), word-by-word captions between them, optional title cards
and wordless reactions to game moments. See docs/duo-characters.md.

  python3 apps/web/scripts/duo/render_long.py apps/web/scripts/duo/episodes/long1.json [--stills t1,t2 <dir>]

The episode file names the footage (one 1920 x 1080 file, already cut), the
voice track, the timeline, the word timings, an optional music bed and the
output. Shares the hosts, captions and audio helpers with render.py.
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFont

import lipsync
import render as base

W, H, FPS = 1920, 1080, base.FPS
CAPTION_Y, CAPTION_MAX_W = 1000, 1060
GUS_AT, PIP_AT = (235, H + 38), (1690, H - 18)   # (centre x, bottom y) of each host
HOST_SCALE = 0.98


def load(ep_path):
    ep = json.loads(Path(ep_path).read_text())
    root = Path(ep_path).parent
    resolve = lambda key: (root / ep[key]).resolve()
    timeline = json.loads(resolve('timeline').read_text())
    words = json.loads(resolve('words').read_text())['words']
    return ep, resolve, timeline, words


def make_hosts(art, mouths):
    return (base.Host('gus', art['gus'], GUS_AT[0], GUS_AT[1], HOST_SCALE, 'neutral', mouths.get('gus')),
            base.Host('pip', art['pip'], PIP_AT[0], PIP_AT[1], HOST_SCALE, 'neutral', mouths.get('pip')))


def reaction(ep, who, t):
    """A wordless pose from the episode's reactions list (a death, a big gulp), if one is on now."""
    for r in ep.get('reactions', []):
        if r['at'] <= t < r['at'] + r.get('dur', 1.6) and who in r:
            return r[who]
    return None


def draw_cards(frame, ep, t, font):
    for card in ep.get('cards', []):
        if card['at'] <= t < card['until']:
            k = min(1.0, (t - card['at']) / 0.2, (card['until'] - t) / 0.2)
            size = round(font.size * (0.9 + 0.1 * k))
            base.draw_label(frame, card['text'], (W / 2, 92), font.font_variant(size=size), (255, 255, 255))


def compose(frame, ep, hosts, chunks, fonts, lines, t, level_now, tracks, i):
    now, prev = base.host_state(lines, t)
    for host in hosts:
        speaking = bool(now and now['who'] == host.who)
        mouth = tracks['mouth'].get(host.who, [None] * (i + 1))[i]
        blink = tracks['blink'][host.who][i]
        pose, key = base.pose_and_mouth(host, now, prev, mouth, blink)
        react = None if speaking else reaction(ep, host.who, t)
        if react:
            pose, key = react, blink
        host.set_pose(pose, key)
    for host in sorted(hosts, key=lambda h: bool(now and now['who'] == h.who)):
        speaking = bool(now and now['who'] == host.who)
        host.draw(frame, t, speaking, level_now if speaking else 0.0)
    base.draw_label(frame, ep['credit'], (W - 170, 44), fonts['small'], (255, 255, 255))
    draw_cards(frame, ep, t, fonts['card'])
    base.draw_caption(frame, chunks, t, fonts['caption'], CAPTION_Y, CAPTION_MAX_W)


def mix_audio(ep, resolve, out_audio):
    """Voices on top; the footage's own sound and the music bed (looped) underneath, ducked while anyone talks."""
    inputs = ['-i', str(resolve('footage')), '-i', str(resolve('voices'))]
    graph = ["[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=3[v][sc1][sc2]"]
    beds = []
    if ep.get('footage_has_audio'):
        graph.append(f"[0:a]volume={ep.get('game_gain', 1.0)}[g0];[g0][sc1]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=300[g]")
        beds.append('[g]')
    else:
        graph.append('[sc1]anullsink')
    if ep.get('music'):
        inputs += ['-stream_loop', '-1', '-i', str(resolve('music'))]
        graph.append(f"[2:a]aresample=48000,volume={ep.get('music_gain', 0.18)}[m0];"
                     "[m0][sc2]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=500[m]")
        beds.append('[m]')
    else:
        graph.append('[sc2]anullsink')
    graph.append(f"[v]{''.join(beds)}amix=inputs={1 + len(beds)}:normalize=0:duration=first,"
                 "loudnorm=I=-14:TP=-2:LRA=11,alimiter=limit=0.63:level=disabled[a]")
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(graph),
                    '-map', '[a]', '-ar', '48000', str(out_audio)], check=True)


def setup(ep_path):
    ep, resolve, timeline, words = load(ep_path)
    voice, sr = base.read_wav(resolve('voices'))
    n = round(timeline['end'] * FPS)
    level = base.envelope(voice, sr, n + 1)
    hosts = make_hosts(base.load_art(), base.load_mouths())
    chunks = base.caption_chunks(words, timeline['lines'], ep.get('caption_fixes', {}))
    tracks = {'mouth': lipsync.mouth_track(words, timeline['lines'], level, FPS),
              'blink': {'gus': lipsync.blink_track(n + 1, FPS, 1), 'pip': lipsync.blink_track(n + 1, FPS, 2)}}
    fonts = {'caption': ImageFont.truetype(base.FONT, 76), 'small': ImageFont.truetype(base.FONT, 34),
             'card': ImageFont.truetype(base.FONT, 72)}
    return ep, resolve, timeline, level, hosts, chunks, fonts, tracks, n


def render(ep_path):
    ep, resolve, timeline, level, hosts, chunks, fonts, tracks, n = setup(ep_path)
    out = resolve('output')
    audio = out.with_suffix('.mix.wav')
    mix_audio(ep, resolve, audio)
    dec = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', str(resolve('footage')), '-vf', f'fps={FPS},scale={W}:{H}',
                            '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                            '-r', str(FPS), '-i', '-', '-i', str(audio), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
                            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
                            str(out)], stdin=subprocess.PIPE)
    size = W * H * 3
    last = None
    for i in range(n):
        raw = dec.stdout.read(size)
        if len(raw) == size:
            last = raw
        frame = Image.frombuffer('RGB', (W, H), last, 'raw', 'RGB', 0, 1).convert('RGBA')
        compose(frame, ep, hosts, chunks, fonts, timeline['lines'], i / FPS, level[i], tracks, i)
        enc.stdin.write(frame.convert('RGB').tobytes())
        if i % 300 == 0:
            print(f'{i / FPS:6.1f}s / {timeline["end"]:.1f}s', flush=True)
    enc.stdin.close()
    enc.wait()
    dec.terminate()
    audio.unlink(missing_ok=True)
    print('wrote', out)


def stills(ep_path, times, out_dir):
    ep, resolve, timeline, level, hosts, chunks, fonts, tracks, n = setup(ep_path)
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    for t in times:
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(t), '-i', str(resolve('footage')), '-frames:v', '1',
                              '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                             capture_output=True, check=True).stdout
        frame = Image.frombuffer('RGB', (W, H), raw, 'raw', 'RGB', 0, 1).convert('RGBA')
        for h in hosts:
            h.pop = 0.0
        i = min(n, round(t * FPS))
        compose(frame, ep, hosts, chunks, fonts, timeline['lines'], t, level[i], tracks, i)
        frame.convert('RGB').save(Path(out_dir) / f'still-{t:06.2f}.png')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[2] == '--stills':
        stills(sys.argv[1], [float(v) for v in sys.argv[3].split(',')], sys.argv[4])
    else:
        render(sys.argv[1])
