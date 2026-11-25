"""Textures: cut swatches, seamless, tone. usage build_tex.py"""
import colorsys
import numpy as np
from PIL import Image, ImageFilter
import artlib as A

def cell(path, col, row, cols=4, rows=2, m=12):
    im = Image.open(path).convert("RGB")
    cw, ch = im.width / cols, im.height / rows
    box = (round(col * cw + m), round(row * ch + m), round((col + 1) * cw - m), round((row + 1) * ch - m))
    c = im.crop(box)
    s = min(c.size)
    x, y = (c.width - s) // 2, (c.height - s) // 2
    return c.crop((x, y, x + s, y + s))

def tone(img, contrast=1.0, blur=0.0, hue=None, sat=1.0, val=1.0):
    a = np.asarray(img, np.float32) / 255
    if blur:
        a = np.asarray(img.filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255
    m = a.mean((0, 1))
    a = np.clip(m + (a - m) * contrast, 0, 1)
    if hue is not None or sat != 1 or val != 1:
        h = np.array(Image.fromarray((a * 255).astype(np.uint8)).convert("HSV"), np.float32)
        if hue is not None:
            h[..., 0] = hue * 255
        h[..., 1] = np.clip(h[..., 1] * sat, 0, 255)
        h[..., 2] = np.clip(h[..., 2] * val, 0, 255)
        return Image.fromarray(h.astype(np.uint8), "HSV").convert("RGB")
    return Image.fromarray((a * 255).astype(np.uint8))

def make(name, src, blend=1.0, **kw):
    sq = tone(src, **kw)
    t = A.seamless(sq, 512, blend)
    A.save_tex(t, name)
    return t

if __name__ == "__main__":
    import sys
    G = "raw/gulf-textures.png"
    # gulf: sand calmer
    make("tex-sand", cell(G, 0, 0), contrast=0.55, blur=2.2)
    make("tex-asphalt", cell(G, 1, 0), contrast=0.8)
    make("tex-paving", cell(G, 2, 0), contrast=0.85)
    make("tex-grass", cell(G, 0, 1), contrast=0.8, blur=0.8)
    make("tex-water", cell(G, 1, 1), contrast=0.8)
    make("tex-deep", cell(G, 2, 1), contrast=0.8)
    make("tex-buslane", cell(G, 3, 1), contrast=1.3, hue=0.07, sat=0.6, val=0.95)
    N = "raw/tex-new.png"
    make("tex-rock", cell(N, 0, 0), contrast=0.7, blur=0.8)
    make("tex-plaza", cell(N, 1, 0), contrast=0.8)
    make("tex-works", cell(N, 2, 0), contrast=0.6, blur=1.2)
    make("tex-concrete", cell(N, 3, 0), contrast=0.9)
    make("tex-wash", cell(N, 0, 1), contrast=0.7, blur=1.5)
