import type { Short } from '../short';
import { drawText, PAPER_ON_INK } from '../swallowyou/text';
import { drawDolphin, prepareDolphin } from './art/dolphin';
import { drawGannetDive, prepareGannet } from './art/gannet';
import { drawJelly, prepareJelly } from './art/jelly';
import { LARVA } from './art/larva';
import { drawPerson } from './art/person';
import { drawStopwatch, drawYou } from './hud';
import { drawGlobe, drawMapCard, drawRun, GIBRALTAR, SOUTH_AFRICA, WEST_AUSTRALIA } from './maps';
import { drawWhaling } from './scenes';
import { T } from './timeline';

/**
 * A preview page for the ninth long-form video's new drawings
 * (`?video=everysize-kit`): the larva, the mauve stinger, the diving gannet,
 * the common dolphin, the swimmer, the three maps, the globe, the stopwatch
 * and the YOU arrow; `&only=ship` shows the whaling ship full frame, `&only=<name>` any one big.
 */

const W = 1920;
const H = 1080;

type Entry = { readonly name: string; readonly draw: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) => void };

const ENTRIES: readonly Entry[] = [
  { name: 'larva', draw: (c, x, y, w, _h, t) => LARVA.draw(c, x, y, w * 0.85, 0, t, { beat: t * 9 }) },
  { name: 'jelly', draw: (c, x, y, w, h, t) => drawJelly(c, x, y - h * 0.3, Math.min(w * 0.45, h * 0.35), t) },
  { name: 'gannet', draw: (c, x, y, w, h, t) => drawGannetDive(c, x + w * 0.05, y + h * 0.3, w * 0.6, 1.2, t, { x: x - w * 0.12, y: y - h * 0.25 }) },
  { name: 'dolphin', draw: (c, x, y, w, _h, t) => drawDolphin(c, x, y, w * 0.85, 0, t, 1) },
  { name: 'person', draw: (c, x, y, w, _h, t) => drawPerson(c, x, y, w * 0.75, 1, t) },
  { name: 'stopwatch', draw: (c, x, y, _w, _h, t) => {
    c.save();
    c.translate(x - 1790, y - 158);
    drawStopwatch(c, t + T.inch, 1);
    c.restore();
    drawYou(c, x - 180, y + 120, t, 1, 0.8);
  } },
  { name: 'safrica', draw: (c, x, y, w, h, t) => drawMapCard(c, SOUTH_AFRICA, { x: x - w * 0.45, y: y - h * 0.42, w: w * 0.9, h: h * 0.84 }, t, 1, (p) => drawRun(c, p, t, (t % 3) / 3)) },
  { name: 'gibraltar', draw: (c, x, y, w, h, t) => drawMapCard(c, GIBRALTAR, { x: x - w * 0.45, y: y - h * 0.42, w: w * 0.9, h: h * 0.84 }, t, 1) },
  { name: 'waustralia', draw: (c, x, y, w, h, t) => drawMapCard(c, WEST_AUSTRALIA, { x: x - w * 0.45, y: y - h * 0.42, w: w * 0.9, h: h * 0.84 }, t, 1) },
  { name: 'globe', draw: (c, x, y, w, h, t) => drawGlobe(c, x, y, Math.min(w, h) * 0.4, t, 1) },
];

export async function createEverysizeKit(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  prepareJelly();
  prepareGannet();
  prepareDolphin();
  LARVA.prepare();
  if (only === 'ship') return { loopSeconds: 4, draw: (t) => drawWhaling(ctx, T.people + t), audio: async () => new Blob([], { type: 'audio/wav' }) };
  const list = only ? ENTRIES.filter((e) => e.name === only) : ENTRIES;
  if (list.length === 0) throw new Error(`No drawing "${only}": use one of ship, ${ENTRIES.map((e) => e.name).join(', ')}`);
  const cols = only ? 1 : 4;
  const rows = Math.ceil(list.length / cols);
  const cw = W / cols;
  const ch = H / rows;
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3f7fa8');
    g.addColorStop(1, '#16405f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    list.forEach((e, i) => {
      const x = (i % cols) * cw + cw / 2;
      const y = Math.floor(i / cols) * ch + ch / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - cw / 2, y - ch / 2, cw, ch);
      ctx.clip();
      e.draw(ctx, x, y, cw, ch, t);
      ctx.restore();
      drawText(ctx, e.name, { x, y: y + ch / 2 - 24, size: 30, maxWidth: cw - 20 }, 700, 1, PAPER_ON_INK);
    });
    ctx.restore();
  };
  return { loopSeconds: 4, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
