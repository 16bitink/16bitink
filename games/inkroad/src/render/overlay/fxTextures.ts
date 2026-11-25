import type Phaser from 'phaser';
import { hash2 } from '../noise';
import { ctxOf, makeCanvas } from '../tiles';

/** The small drawn marks the effects use: rings, stars, dust, horns, notes, warnings. */
function texture(scene: Phaser.Scene, key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): void {
  if (scene.textures.exists(key)) return;
  const c = makeCanvas(size, size);
  draw(ctxOf(c), size);
  scene.textures.addCanvas(key, c);
}

export function drawFxTextures(scene: Phaser.Scene): void {
  texture(scene, 'fx-ring', 256, (g, s) => {
    g.strokeStyle = '#2f8f92';
    g.lineWidth = 12;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2 - 10, 0, Math.PI * 2);
    g.stroke();
  });
  texture(scene, 'fx-star', 48, (g, s) => {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#4a3a34';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.13 : s * 0.46; const a = (i / 8) * Math.PI * 2; g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); }
    g.closePath();
    g.fill();
    g.stroke();
  });
  texture(scene, 'fx-dust', 64, (g, s) => {
    const f = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    f.addColorStop(0, 'rgba(226,200,156,0.9)');
    f.addColorStop(1, 'rgba(226,200,156,0)');
    g.fillStyle = f;
    g.fillRect(0, 0, s, s);
  });
  texture(scene, 'fx-cloud', 96, (g, s) => {
    const lumps = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2, r: s * (0.15 + 0.05 * hash2(i, 1, 12)) }));
    const pad = (grow: number, colour: string): void => {
      g.fillStyle = colour;
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.26 + grow, 0, Math.PI * 2);
      for (const l of lumps) { g.moveTo(s / 2, s / 2); g.arc(s / 2 + Math.cos(l.a) * s * 0.22, s / 2 + Math.sin(l.a) * s * 0.22, l.r + grow, 0, Math.PI * 2); }
      g.fill();
    };
    pad(2.6, 'rgba(96,74,54,0.75)');
    pad(0, '#f2e2c0');
    g.globalAlpha = 0.55;
    g.translate(-3, -4);
    pad(-6, '#fff8e8');
  });
  texture(scene, 'fx-honk', 96, (g, s) => horn(g, s, '#3a322b'));
  texture(scene, 'fx-toot', 96, (g, s) => note(g, s));
  texture(scene, 'fx-thump', 256, (g, s) => {
    g.translate(s / 2, s / 2);
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + (hash2(i, 1, 3) - 0.5) * 0.14;
      const r0 = s * (0.36 + 0.03 * hash2(i, 2, 3));
      const r1 = s * (0.42 + 0.07 * hash2(i, 3, 3));
      g.strokeStyle = 'rgba(58,50,43,0.85)';
      g.lineWidth = 3 + 3 * hash2(i, 4, 3);
      g.beginPath();
      g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      g.stroke();
    }
  });
  texture(scene, 'fx-warn', 96, (g, s) => {
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(s / 2, 8);
    g.lineTo(s - 8, s - 10);
    g.lineTo(8, s - 10);
    g.closePath();
    g.fillStyle = '#f0b64a';
    g.fill();
    g.strokeStyle = '#3a322b';
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = '#3a322b';
    g.fillRect(s / 2 - 4, s * 0.36, 8, s * 0.28);
    g.fillRect(s / 2 - 4, s * 0.72, 8, 9);
  });
}

/** Three pen strokes from a horn, the thickest in the middle, on a thin paper halo. */
function horn(g: CanvasRenderingContext2D, s: number, ink: string): void {
  g.lineCap = 'round';
  const strokes = [[-1.28, 0.34, 0.74, 7], [-0.78, 0.3, 0.95, 10], [-0.28, 0.34, 0.74, 7]] as const;
  for (const [wide, colour] of [[8, 'rgba(251,245,230,0.95)'], [0, ink]] as const) {
    for (const [a, r0, r1, w] of strokes) {
      g.strokeStyle = colour;
      g.lineWidth = w + wide;
      g.beginPath();
      g.moveTo(6 + Math.cos(a) * r0 * s * 0.6, s - 6 + Math.sin(a) * r0 * s * 0.6);
      g.quadraticCurveTo(6 + Math.cos(a - 0.08) * r1 * s * 0.6, s - 6 + Math.sin(a - 0.08) * r1 * s * 0.6, 6 + Math.cos(a) * r1 * s * 0.85, s - 6 + Math.sin(a) * r1 * s * 0.85);
      g.stroke();
    }
  }
}

/** A happy toot: a little inked note. */
function note(g: CanvasRenderingContext2D, s: number): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [wide, colour] of [[10, '#fbf5e6'], [0, '#2f7f5c']] as const) {
    g.strokeStyle = colour;
    g.fillStyle = colour;
    g.lineWidth = 7 + wide;
    g.beginPath();
    g.moveTo(s * 0.36, s * 0.74);
    g.lineTo(s * 0.36, s * 0.24);
    g.lineTo(s * 0.74, s * 0.16);
    g.lineTo(s * 0.74, s * 0.64);
    g.moveTo(s * 0.36, s * 0.36);
    g.lineTo(s * 0.74, s * 0.28);
    g.stroke();
    for (const [x, y] of [[0.27, 0.76], [0.65, 0.66]] as const) {
      g.beginPath();
      g.ellipse(s * x, s * y, s * 0.11, s * 0.085, -0.4, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = Math.max(1, wide);
      g.stroke();
      g.lineWidth = 7 + wide;
    }
  }
}
