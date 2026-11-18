import Phaser from 'phaser';
import { PAPER, PAPER_HEX } from '../art/palette';
import { getHost, getSound, trackOffer } from '../host';
import { isFreeEnd, levelById, levelOrder, loadedLevels, nextLevel } from '../level/levels';
import { screenScene, screenSize, uiScaleOf, viewSize } from './hidpi';
import { SnakePortrait } from './result/snakePortrait';
import { loseContent } from './result/loseContent';
import { pickTip } from './result/tips';
import { twistTexts } from '../level/twistText';
import type { LevelDef } from '../level/types';
import type { LossCause } from '../logic/world';
import { WIN, winContent } from './result/winContent';
import { inkButton, inkText } from './ui';
import { cardFit, uprightScreen } from './uiLayout';
import { isPhone, sizer, type Sizer } from './uiSizes';
import { freePaper, paperCard, softenBoard, spot } from './uiPaint';

export interface ResultData {
  readonly levelId: string;
  readonly won: boolean;
  readonly time: number;
  readonly blots: number;
  readonly livesLost: number;
  readonly score: number;
  /** How long the snake grew, board px. */
  readonly length: number;
  /** Most meals caught in one coil. */
  readonly bestCoil: number;
  readonly eaten: number;
  /** Fastest clear before this one, if the level had been cleared. */
  readonly previousBest?: number;
  /** How far the goal got, 0..1 (for a loss: how close it came). */
  readonly progress?: number;
  /** How a loss came: the last life lost to what, or a rush's clock. */
  readonly lostBy?: LossCause;
}

const SOFT_INK = '#4a463e';
const CARD = { w: 540, h: 550 } as const;
const SEED = 31;
/** The title block sits right of the snake's portrait. */
const TITLE_X = 62;
/** The snake's portrait: its centre, from the card's left edge and top. */
const PORTRAIT = { x: 118, y: 132 } as const;
/** An upright phone's card is narrower, so it draws bigger on the narrow screen; its title block sits nearer the portrait. */
const PHONE = { w: 460, titleX: 66, portraitX: 96 } as const;
const BUTTONS = { primary: 438, secondary: 506 } as const;
/** A phone's card is this much taller, for its bigger buttons. */
const PHONE_EXTRA = 30;
/** Which tip shows after the next loss, kept for the session. */
const TIP_TURN = 'resultTipTurn';

interface Action {
  readonly label: string;
  readonly run: () => void;
}

/**
 * After a level, a card over the stilled, blurred board: cleared (the
 * snake grinning, ink blots stamping down, the score counting up, what's
 * next) or caught out (the snake glum, how close it came, a tip), and
 * what to do now. Enter takes the main button.
 */
export class ResultScene extends Phaser.Scene {
  private portrait: SnakePortrait | null = null;
  /** Set while the card is laid out again for a resized screen: no entrance, same tip. */
  private relaid = false;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    screenScene(this, true);
    const def = levelById(data.levelId) ?? loadedLevels()[0]!;
    const view = viewSize(this);
    const css = screenSize(this);
    const unblur = softenBoard(this);
    // Over the board when it's held behind; plain paper when it isn't.
    const behind = this.scene.isPaused('Game');
    if (!behind) this.cameras.main.setBackgroundColor(PAPER);
    const shade = this.add.rectangle(0, 0, view.width, view.height, PAPER_HEX, behind ? 0.55 : 0).setOrigin(0).setInteractive();
    // On a phone the buttons draw at least TOUCH_MIN tall, a touch gap apart: the card grows to hold them.
    const phone = isPhone(css);
    const narrow = phone && uprightScreen(css.width, css.height);
    const size = { w: narrow ? PHONE.w : CARD.w, h: CARD.h + (phone ? PHONE_EXTRA : 0) };
    const titleX = narrow ? PHONE.titleX : TITLE_X;
    const portraitX = -size.w / 2 + (narrow ? PHONE.portraitX : PORTRAIT.x);
    const fit = cardFit(view, size, uprightScreen(css.width, css.height) ? 1.4 : 1, phone);
    const z = sizer(phone, uiScaleOf(this) * fit);
    const top = -size.h / 2;
    const card = this.add.container(view.width / 2, view.height / 2);
    card.add([this.add.zone(0, 0, size.w, size.h).setInteractive(), paperCard(this, 0, 0, size.w, size.h, SEED, { tapes: ['tl', 'tr'], rule: true, leaf: !data.won })]);
    card.add(spot(this, portraitX, top + PORTRAIT.y, 86, data.won ? 'sun' : 'rain'));
    this.portrait = new SnakePortrait(this, def.snake, portraitX, top + PORTRAIT.y, data.won ? 'happy' : 'glum', 1.08);
    card.add(this.portrait.root);
    const n = levelOrder().indexOf(def.id) + 1;
    card.add(inkText(this, titleX, top + WIN.level, `Level ${n} · ${def.name}`, z.text(23, 'body'), SOFT_INK));
    if (data.won) winContent(this, card, data, def, top, titleX, z, narrow);
    else loseContent(this, card, data, top, titleX, this.nextTip(def), z, narrow ? PHONE.w - 70 : undefined);
    const primary = this.buttons(card, data, top, z);
    card.setScale(fit * 0.92).setAlpha(0).setY(view.height / 2 + 18);
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 200 });
    this.tweens.add({ targets: card, scale: fit, alpha: 1, y: view.height / 2, duration: 280, ease: 'Back.Out' });
    if (!this.relaid) getSound(this)?.play('card');
    this.relaid = false;
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) primary?.run();
    });
    // A resize lays the card out afresh (without its entrance).
    const relayout = (): void => {
      this.relaid = true;
      this.scene.restart(data);
    };
    this.scale.once('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', relayout);
      unblur();
      freePaper(this, size.w, size.h, SEED);
      this.portrait = null;
    });
  }

  update(time: number): void {
    this.portrait?.update(time);
  }

  /** The tip after this loss, then the next one in turn. */
  /** A tip for the loss: every other one is about the level's own twist, if it has one. */
  private nextTip(level: LevelDef): string {
    const next = (this.registry.get(TIP_TURN) as number | undefined) ?? 0;
    const turn = this.relaid ? Math.max(0, next - 1) : next;
    this.registry.set(TIP_TURN, turn + 1);
    const own = twistTexts(level);
    if (own.length && turn % 2 === 0) return own[(turn / 2) % own.length]!.tip;
    return pickTip(Math.floor(turn / (own.length ? 2 : 1)), !this.sys.game.device.os.desktop);
  }

  /** Leaves for scene `key`, letting the held board go unless it's the game being started afresh. */
  private go(key: 'Game' | 'Menu', data?: object): void {
    if (key !== 'Game') this.scene.stop('Game');
    this.scene.start(key, data);
  }

  /** The main button and the small ones under it; returns the main action, for Enter. */
  private buttons(card: Phaser.GameObjects.Container, data: ResultData, top: number, z: Sizer): Action | null {
    const host = getHost(this);
    const next = nextLevel(data.levelId);
    const replay = (): void => this.go('Game', { levelId: data.levelId });
    const map = (): void => this.go('Menu');
    let primary: Action | null;
    if (!data.won) primary = { label: 'Try again', run: replay };
    else if (next) primary = { label: 'Next level', run: () => this.go('Game', { levelId: next.id }) };
    else if (isFreeEnd(data.levelId) && !host.unlocked && host.price) {
      primary = { label: `Full game · ${host.price}`, run: () => host.onBuy('free_end') };
      trackOffer(this, 'free_end');
    } else primary = null;
    const big = z.tap(62);
    const smallH = z.tap(50);
    const y = top + BUTTONS.primary + (big - 62) / 2;
    // The small buttons sit under the main one, a touch gap clear of it.
    const y2 = Math.max(top + BUTTONS.secondary, y + big / 2 + z.gap(12) + smallH / 2);
    if (primary) card.add(inkButton(this, 0, y, primary.label, primary.run, { width: 260, height: big, size: 34, kind: 'leaf' }));
    else card.add(inkText(this, 0, y, 'More chapters are on the way!', 28));
    if (data.won && next) card.add(inkText(this, 0, top + WIN.peek, `Next up: ${levelOrder().indexOf(next.id) + 1} · ${next.name}`, z.text(21), SOFT_INK));
    const small = data.won ? [{ label: 'Replay', run: replay }, { label: 'Map', run: map }] : [{ label: 'Level map', run: map }];
    small.forEach((b, i) => card.add(inkButton(this, small.length === 1 ? 0 : (i - 0.5) * 180, y2, b.label, b.run, { width: 160, height: smallH, size: z.text(25, 'body') })));
    return primary;
  }
}
