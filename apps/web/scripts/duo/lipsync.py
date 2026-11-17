"""
Mouth shapes and blinks for the hosts, one key per video frame.

Shapes follow the classic cartoon mouth chart (the art in art/mouth/):
  A closed (M B P)   B barely open (most consonants)   C half open (EH, I, L, TH)
  D wide (AH)        E tall oval (OH)                   F small round (OO, W)
The shape comes from the spelling of the word being said (Scribe word timings);
the loudness of the voice decides when the mouth shuts and how wide it opens,
so the timing follows the real audio even where the spelling guess is rough.
"""
import re

UNITS = re.compile(r'ough|augh|tion|oo|ou|ow|oa|oi|oy|ew|ee|ea|ei|ie|ai|ay|au|aw|ar|er|ir|or|ur|th|sh|ch|ph|wh|ck|ng|qu|[a-z]')
SHAPES = {
    'A': {'m', 'b', 'p'},
    'D': {'a', 'ai', 'ay', 'ar', 'augh'},
    'E': {'o', 'oa', 'or', 'oi', 'oy', 'ou', 'ow', 'ough', 'au', 'aw'},
    'F': {'oo', 'ew', 'w', 'wh', 'qu'},
    'C': {'e', 'ee', 'ea', 'ei', 'ie', 'i', 'y', 'u', 'er', 'ir', 'ur', 'l', 'th', 'tion'},
}
VOWELS = (SHAPES['D'] | SHAPES['E'] | SHAPES['F'] | SHAPES['C']) - {'l', 'th', 'w', 'wh', 'qu'}
SILENT, LOUD = 0.15, 0.8        # voice level (0..1) below which the mouth shuts / above which it opens wider
IN_WORD_SILENT = 0.06           # inside a word only real silence shuts it: soft consonants are quiet but open
LEAD = 0.035                    # mouths move a frame before the sound, as animators time them
BLINK = ['half', 'blink', 'blink', 'half']


def shape_of(unit):
    for key, units in SHAPES.items():
        if unit in units:
            return key
    return 'B'


def word_units(text):
    """The word as (shape, weight) pieces: vowels take twice as long as consonants."""
    word = re.sub(r'[^a-z]', '', text.lower())
    if len(word) > 2 and word.endswith('e') and word[-2] not in 'aeiou':
        word = word[:-1]                                     # silent final e: "stole" -> "stol"
    units = UNITS.findall(word) or ['a']
    return [(shape_of(u), 2.0 if u in VOWELS else 1.0) for u in units]


def shape_at(word, t):
    units = word_units(word['text'])
    total = sum(w for _, w in units)
    pos = (t - word['start']) / max(1e-3, word['end'] - word['start']) * total
    for key, weight in units:
        pos -= weight
        if pos < 0:
            return key
    return units[-1][0]


def by_level(key, level, silent=SILENT):
    if level < silent:
        return 'A'
    if key == 'D' and level < 0.5:
        return 'C'
    if key in ('B', 'C') and level > LOUD:
        return 'C' if key == 'B' else 'D'
    return key


def smooth(keys):
    """No shape held for a single frame, except that a lone closed frame is stretched to two."""
    out = list(keys)
    for i in range(1, len(out) - 1):
        if out[i] is None or out[i] == out[i - 1] or out[i] == out[i + 1]:
            continue
        if out[i] == 'A':
            out[i + 1] = 'A'
        else:
            out[i] = out[i - 1] if out[i - 1] is not None else out[i + 1]
    return out


def mouth_track(words, lines, level, fps):
    """{who: [shape or None per frame]}: None while that host is not speaking."""
    n = len(level)
    track = {line['who']: [None] * n for line in lines}
    spoken = [w for w in words if w['type'] == 'word']
    for line in lines:
        mine = [w for w in spoken if line['start'] - 0.1 <= w['start'] <= line['end'] + 0.1]
        for i in range(max(0, round(line['start'] * fps)), min(n, round(line['end'] * fps))):
            t = i / fps + LEAD
            word = next((w for w in mine if w['start'] <= t < w['end']), None)
            key = shape_at(word, t) if word else ('B' if level[i] > 0.35 else 'A')
            track[line['who']][i] = by_level(key, level[i], IN_WORD_SILENT if word else SILENT)
    return {who: smooth(keys) for who, keys in track.items()}


def blink_track(n, fps, seed):
    """Blink keys (or None) per frame: a blink every 2.4-5.4 s, the gap varying by host."""
    out = [None] * n
    t, k = 1.2 + seed % 1.7, 0
    while True:
        start = round(t * fps)
        if start + len(BLINK) >= n:
            return out
        for j, key in enumerate(BLINK):
            out[start + j] = key
        k += 1
        t += 2.4 + ((seed * 7919 + k * 104729) % 1000) / 1000 * 3.0
