import { INK, PAPER } from '../../../src/art/pen';
import type { Short } from '../short';
import { drawText, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import type { SharkArt, SharkPose } from './art/contract';
import { SHARK_IDS, type SharkId } from './art/ids';
import { prepareMeals } from './art/meals';
import { MISSING_SHARKS, prepareSharks } from './art/roster';
import { drawYouFigure } from './art/you';
import { STEPS, YOU_M } from './ladder';

/**
 * The art kit for the shark size comparison (`?video=sharksize-kit`): every
 * shark of the video through the contract (art/contract.ts) at ONE common
 * scale, on three rows of sand, each row starting with you at 5 ft 9 in;
 * placeholders say so on their bodies. `&only=<id>` shows one shark big
 * with the contract's guides: the snout tip (red cross), the length bracket
 * it must fill exactly, the mouth point (yellow dot) and the gulp opening
 * and shutting. Art agents check their paintings here.
 */

const W = 1920;
const H = 1080;
const MEGALODON_M = 16.4;

const LENGTH: Readonly<Record<SharkId, number>> = {
  ...(Object.fromEntries(STEPS.map((s) => [s.id, s.length])) as Record<Exclude<SharkId, 'megalodon'>, number>),
  megalodon: MEGALODON_M,
};

const ROWS: readonly (readonly SharkId[])[] = [
  ['lanternshark', 'cookiecutter', 'dogfish', 'blacktip', 'bull', 'mako'],
  ['hammerhead', 'tiger', 'greenland', 'greatWhite', 'basking'],
  ['whaleShark', 'megalodon'],
];

function backdrop(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a6a96');
  g.addColorStop(1, '#0f3250');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawRows(ctx: CanvasRenderingContext2D, art: Readonly<Record<SharkId, SharkArt>>, t: number): void {
  const k = 62;
  const grounds = [300, 640, 1040];
  drawText(ctx, `ONE SCALE: ${k} PX = 1 M · YOU = 5 FT 9 IN · 1.75 M`, { x: W / 2, y: 40, size: 34, maxWidth: 1800 }, 700, 1, PAPER_ON_INK);
  ROWS.forEach((row, r) => {
    const ground = grounds[r]!;
    ctx.fillStyle = 'rgba(168,148,108,0.8)';
    ctx.fillRect(0, ground, W, 6);
    drawYouFigure(ctx, 60, ground, YOU_M * k, t);
    let x = 120;
    row.forEach((id, i) => {
      const len = LENGTH[id] * k;
      const pose: SharkPose = { x, y: ground - (0.06 + 0.12 * LENGTH[id]) * k - 6, length: len, gulp: 0.5 + 0.5 * Math.sin(t * 2), t };
      art[id].draw(ctx, pose);
      const label = `${art[id].name}${art[id].painted ? '' : ' (PLACEHOLDER)'}`;
      drawText(ctx, label, { x: x + Math.max(len, 90) / 2, y: ground + 26 + (i % 2) * 26, size: 22, maxWidth: Math.max(160, len) }, 700, 1, art[id].painted ? PAPER_ON_INK : YELLOW_ON_INK);
      x += Math.max(len, 60) + 50;
    });
  });
}

/** One shark big, with the contract's guides. */
function drawOne(ctx: CanvasRenderingContext2D, a: SharkArt, t: number): void {
  const len = 1500;
  const pose: SharkPose = { x: 210, y: 560, length: len, gulp: 0.5 + 0.5 * Math.sin(t * 1.6), t };
  ctx.fillStyle = 'rgba(168,148,108,0.8)';
  ctx.fillRect(0, 900, W, 8);
  drawYouFigure(ctx, 110, 900, (YOU_M / LENGTH[a.id]) * len, t);
  a.draw(ctx, pose);
  ctx.save();
  ctx.strokeStyle = '#ff3b30';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pose.x - 16, pose.y);
  ctx.lineTo(pose.x + 16, pose.y);
  ctx.moveTo(pose.x, pose.y - 16);
  ctx.lineTo(pose.x, pose.y + 16);
  ctx.moveTo(pose.x, 960);
  ctx.lineTo(pose.x + len, 960);
  ctx.moveTo(pose.x, 940);
  ctx.lineTo(pose.x, 980);
  ctx.moveTo(pose.x + len, 940);
  ctx.lineTo(pose.x + len, 980);
  ctx.stroke();
  const m = a.mouthAt(pose);
  ctx.fillStyle = '#ffcf33';
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(m.x, m.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, `${a.name} · ${LENGTH[a.id]} M · ${a.painted ? 'PAINTED' : 'PLACEHOLDER'}`, { x: W / 2, y: 60, size: 44, maxWidth: 1800 }, 700, 1, PAPER_ON_INK);
  drawText(ctx, 'red cross = snout tip · red bracket = total length · yellow dot = mouth · gulp animates', { x: W / 2, y: 1030, size: 30, maxWidth: 1800 }, 500, 1, PAPER_ON_INK);
  drawText(ctx, `depth ${a.depth.toFixed(2)} · top ${a.top.toFixed(2)} (measured)`, { x: W / 2, y: 110, size: 28, maxWidth: 1200 }, 500, 1, { fill: PAPER, halo: INK });
}

export async function createSharksizeKit(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  const art = await prepareSharks();
  await prepareMeals();
  if (only && !SHARK_IDS.includes(only as SharkId)) throw new Error(`No shark "${only}": use one of ${SHARK_IDS.join(', ')}`);
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    backdrop(ctx);
    if (only) drawOne(ctx, art[only as SharkId], t);
    else {
      drawRows(ctx, art, t);
      drawText(ctx, `Still placeholders: ${MISSING_SHARKS.join(', ') || 'none'}`, { x: W / 2, y: 1070 - 10, size: 26, maxWidth: 1800 }, 500, 1, YELLOW_ON_INK);
    }
    ctx.restore();
  };
  return { loopSeconds: 4, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
