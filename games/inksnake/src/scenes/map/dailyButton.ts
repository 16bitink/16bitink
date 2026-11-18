import Phaser from 'phaser';
import { BLUE, INK_HEX, LEAF, PAPER_FILL, RED_HEX } from '../../art/palette';
import { getSound } from '../../host';
import type { LevelDef } from '../../level/types';
import { snakeHead } from '../daily/cardKit';
import { HAND_FONT } from '../ui';
import { toView } from '../hidpi';

/** The page's header: plum, a colour no level's nest uses (eggs, red ring, blue ink). */
const PLUM = 0x6a3f8f;
const PAPER_HEX = Number.parseInt(PAPER_FILL.slice(1), 16);
const LEAF_HEX = Number.parseInt(LEAF.slice(1), 16);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
/** A press that moves further than this (CSS px) is a drag of the map, not a tap. */
const TAP_SLOP = 12;
/** The idle nudge while today's hunt is unplayed, ms between pulses. */
const PULSE_EVERY = 4200;
/** Events whose page gets a candy-cane corner; any other event gets a red star. */
const CANDY_EVENTS: readonly string[] = ['christmasEve', 'christmas', 'boxingDay'];

export interface DailyButtonOpts {
  readonly x: number;
  readonly y: number;
  /** The page's size, interface units (at least 64 CSS px on a phone). */
  readonly w: number;
  readonly h: number;
  /** The label's font size, units. */
  readonly label: number;
  /** Today, YYYY-MM-DD. */
  readonly date: string;
  readonly onOpen: () => void;
}

/**
 * The daily hunt's way in from the map: a painted calendar page fixed on
 * the screen's right side (it doesn't scroll with the map), today's month
 * on a plum header and the day big, the day's snake in the corner and
 * "Daily hunt" under it. Unplayed: a red dot and a gentle pulse every few
 * seconds. Played: a green check, still. It's not a level: it has its own
 * shape and colour, off the trail.
 */
export class DailyButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly page: Phaser.GameObjects.Container;
  private readonly marks: Phaser.GameObjects.Graphics;
  private pulse: Phaser.Time.TimerEvent | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly o: DailyButtonOpts) {
    const { w, h } = o;
    const head = h * 0.3;
    const g = scene.add.graphics();
    // Shadow, page, header, the two rings it hangs from.
    g.fillStyle(INK_HEX, 0.16).fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 6);
    g.fillStyle(PAPER_HEX, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.fillStyle(PLUM, 0.95).fillRoundedRect(-w / 2, -h / 2, w, head, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.lineStyle(2, INK_HEX, 0.85).strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    for (const rx of [-w * 0.24, w * 0.24]) {
      g.fillStyle(PAPER_HEX, 1).fillCircle(rx, -h / 2 + 2, 3.2);
      g.lineStyle(1.6, INK_HEX, 0.9).strokeCircle(rx, -h / 2 + 2, 3.2);
    }
    const [, month, day] = o.date.split('-').map(Number);
    const monthText = scene.add.text(0, -h / 2 + head / 2 + 1, MONTHS[(month ?? 1) - 1] ?? '', {
      fontFamily: HAND_FONT, fontSize: `${Math.round(head * 0.72)}px`, color: '#fffaf0', padding: { x: 2, y: 2 },
    }).setOrigin(0.5);
    const dayText = scene.add.text(0, head / 2 + 1, String(day ?? ''), {
      fontFamily: HAND_FONT, fontSize: `${Math.round(h * 0.5)}px`, color: BLUE, padding: { x: 2, y: 4 },
    }).setOrigin(0.5);
    this.marks = scene.add.graphics();
    this.page = scene.add.container(0, 0, [g, monthText, dayText, this.marks]);
    const label = scene.add.text(0, h / 2 + 6 + o.label * 0.6, 'Daily hunt', {
      fontFamily: HAND_FONT, fontSize: `${o.label}px`, color: BLUE, stroke: '#fffaf0', strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(0.5);
    this.root = scene.add.container(o.x, o.y, [this.page, label]);
    this.wire(w, h + o.label * 1.6);
    this.setPlayed(false);
  }

  /** The page's and label's box, interface units (presses there aren't on the map under it). */
  get box(): { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } {
    const { x, y, w, h, label } = this.o;
    return { x0: x - w / 2 - 6, y0: y - h / 2 - 6, x1: x + w / 2 + 6, y1: y + h / 2 + 8 + label * 1.4 };
  }

  /** The day's snake in the corner, and the event's motif on an event day. */
  setLevel(level: LevelDef): void {
    const { w, h } = this.o;
    const s = this.scene;
    if (!this.root.active) return;
    this.page.add(snakeHead(s, level.snake, -w / 2 + w * 0.2, h / 2 - h * 0.16, h * 0.28).setAngle(-120));
    if (!level.event) return;
    const g = s.add.graphics();
    if (CANDY_EVENTS.includes(level.event)) {
      // A candy cane's stripes across the header's top-right corner.
      const c = w * 0.34;
      for (let i = 0; i < 5; i++) {
        g.fillStyle(i % 2 ? PAPER_HEX : RED_HEX, 1);
        const a = (i / 5) * c;
        const b = ((i + 1) / 5) * c;
        g.fillPoints([
          new Phaser.Math.Vector2(w / 2 - c + a, -h / 2), new Phaser.Math.Vector2(w / 2 - c + b, -h / 2),
          new Phaser.Math.Vector2(w / 2, -h / 2 + c - b), new Phaser.Math.Vector2(w / 2, -h / 2 + c - a),
        ], true);
      }
    } else {
      g.fillStyle(RED_HEX, 0.95).fillPoints(star(w / 2 - w * 0.17, -h / 2 + h * 0.15, h * 0.11, h * 0.05), true);
    }
    this.page.addAt(g, 3);
  }

  /** Unplayed: a red dot and the idle pulse. Played: a green check, no pulse. */
  setPlayed(played: boolean): void {
    if (!this.root.active) return;
    const { w, h } = this.o;
    const g = this.marks.clear();
    const x = w / 2 - 2;
    const y = -h / 2 + 2;
    if (played) {
      const r = h * 0.15;
      g.fillStyle(LEAF_HEX, 1).fillCircle(x, y, r).lineStyle(1.6, 0xfffaf0, 1).strokeCircle(x, y, r);
      g.lineStyle(2.4, 0xfffaf0, 1).beginPath().moveTo(x - r * 0.5, y).lineTo(x - r * 0.1, y + r * 0.42).lineTo(x + r * 0.55, y - r * 0.4).strokePath();
    } else {
      g.fillStyle(RED_HEX, 1).fillCircle(x, y, h * 0.09).lineStyle(1.6, 0xfffaf0, 1).strokeCircle(x, y, h * 0.09);
    }
    this.pulse?.remove();
    this.pulse = played ? null : this.scene.time.addEvent({
      delay: PULSE_EVERY, loop: true,
      callback: () => this.scene.tweens.add({ targets: this.page, scale: 1.08, angle: 3, duration: 260, yoyo: true, ease: 'Sine.InOut' }),
    });
  }

  /** A tap (not a drag) opens the hunt's card; the page presses in while held. */
  private wire(w: number, h: number): void {
    const zone = this.scene.add.zone(0, h / 2 - this.o.h / 2, w + 12, h + 12).setInteractive({ useHandCursor: true });
    this.root.add(zone);
    let at: { x: number; y: number } | null = null;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      at = toView(p.x, p.y);
      this.page.setScale(0.95);
    });
    zone.on('pointerout', () => {
      at = null;
      this.page.setScale(1);
    });
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      const from = at;
      at = null;
      this.page.setScale(1);
      const to = toView(p.x, p.y);
      if (!from || Math.hypot(from.x - to.x, from.y - to.y) > TAP_SLOP) return;
      getSound(this.scene)?.play('click');
      this.o.onOpen();
    });
  }
}

/** A five-pointed star's points. */
function star(x: number, y: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? inner : outer;
    return new Phaser.Math.Vector2(x + Math.cos(a) * k, y + Math.sin(a) * k);
  });
}
