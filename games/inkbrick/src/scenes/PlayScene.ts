import Phaser from 'phaser';
import type { SoundBoard } from '../audio/sound';
import { boardLayout, type BoardLayout } from '../render/layout';
import { boardKey, ensureArt, playArtKeys, preloadArt, surroundTexture } from '../render/art';
import { BricksView } from '../render/bricksView';
import { Fx, SHOUTS } from '../render/fx';
import { PADDLE_Y, PiecesView, type Looks } from '../render/piecesView';
import { Lantern } from '../render/lantern';
import { ensureSoftTextures } from '../render/softTextures';
import { StonesView } from '../render/stonesView';
import { DevProbe } from './devProbe';
import type { BoardView, SimPort } from '../render/port';
import { BOARD_H, BOARD_W, STEP, type LevelDef, type SimEvent, type SimInput } from '../sim/types';
import { PlayInput } from './playInput';

/**
 * A level on the board: steps the sim at its fixed 1/120 s, draws its view,
 * and turns its events into the juice (the break-in's slow-mo, shake, Skip's
 * cheer and shout; chips, blasts, splits, the crumble) and sounds. The DOM
 * HUD and cards are the app's; this scene reports through `hooks`.
 */
export const HAND_FONT = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';
const SLOWMO_RATE = 0.25;
const SLOWMO_MS = 300;
const SLOWMO_EASE_MS = 250;
const MAX_FRAME_S = 0.1;
const END_DELAY_MS = 1100;
const HUD_EVERY_MS = 100;
const CHEER_MS = 1200;

export interface PlayOutcome {
  readonly result: 'win' | 'lose';
  readonly seconds: number;
  readonly breakIn: number | null;
  readonly heartsLost: number;
}

export interface HudState {
  readonly lives: number;
  readonly broken: number;
  readonly breakable: number;
  readonly t: number;
  readonly held: boolean;
  /** Brumm's hits left, or null on a level without him. */
  readonly bossHits: number | null;
  readonly bossTotal: number | null;
}

export interface PlayHooks {
  hud(h: HudState): void;
  layout(l: BoardLayout): void;
  end(o: PlayOutcome): void;
  pauseKey(): void;
}

export interface PlayOptions {
  readonly level: LevelDef;
  readonly port: SimPort;
  readonly looks: Looks;
  readonly sound: SoundBoard;
  readonly surround: string;
  readonly hooks: PlayHooks;
  /** Dev only: drives the raft instead of the pointer. */
  readonly autopilot?: (port: SimPort) => SimInput | null;
}

export class PlayScene extends Phaser.Scene {
  private board!: Phaser.GameObjects.Container;
  private backdrop!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private bricks!: BricksView;
  private pieces!: PiecesView;
  private stones!: StonesView;
  private lantern: Lantern | null = null;
  private probe: DevProbe | null = null;
  private fx!: Fx;
  private input2!: PlayInput;
  private acc = 0;
  private slowmo = 0;
  private hudIn = 0;
  private paused = false;
  private ended = false;
  private breakIn: number | null = null;
  private heartsLost = 0;
  private lastBreak = { x: BOARD_W / 2, y: BOARD_H / 2 };
  private recentBreaks: number[] = [];
  private cssLayout!: BoardLayout;

  constructor(key: string, private readonly opts: PlayOptions) {
    super({ key });
  }

  preload(): void {
    preloadArt(this, playArtKeys(this.opts.level.chapter));
  }

  create(): void {
    ensureArt(this, playArtKeys(this.opts.level.chapter));
    ensureSoftTextures(this);
    const { level, looks } = this.opts;
    this.backdrop = this.textures.exists(this.opts.surround)
      ? this.add.image(0, 0, this.opts.surround).setOrigin(0.5)
      : this.add.rectangle(0, 0, 10, 10, 0x1d3a44).setOrigin(0.5);
    this.board = this.add.container(0, 0);
    const bk = boardKey(level.chapter);
    this.board.add(this.textures.exists(bk)
      ? this.add.image(0, 0, bk).setOrigin(0, 0).setDisplaySize(BOARD_W, BOARD_H)
      : this.add.rectangle(0, 0, BOARD_W, BOARD_H, 0x2f6f78).setOrigin(0, 0).setStrokeStyle(4, 0x14110c));
    this.bricks = new BricksView(this, this.board, level);
    this.pieces = new PiecesView(this, this.board, looks, level);
    this.stones = new StonesView(this, this.board, looks.trail, level.dark ? 'stone-dark' : 'stone');
    this.fx = new Fx(this, this.board, HAND_FONT);
    this.input2 = new PlayInput(this, (x) => this.toBoardX(x), () => this.opts.hooks.pauseKey());
    this.scale.on('resize', this.fit, this);
    this.fit();
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this));
    this.draw(this.opts.port.view(), 0);
    // After the first draw, so the pieces made then (shutters, spinners) sit in the dark too.
    if (level.dark) this.lantern = new Lantern(this, this.board);
    if (import.meta.env.DEV) {
      this.probe = new DevProbe();
      this.probe.emit = (e) => this.onEvent(e);
    }
  }

  private get dpr(): number {
    return this.game.scale.zoom > 0 ? 1 / this.game.scale.zoom : 1;
  }

  private fit(): void {
    const dpr = this.dpr;
    const w = this.scale.width;
    const h = this.scale.height;
    this.cssLayout = boardLayout(w / dpr, h / dpr);
    const l = this.cssLayout;
    this.board.setPosition(l.x * dpr, l.y * dpr).setScale(l.scale * dpr);
    if (this.backdrop instanceof Phaser.GameObjects.Image) {
      // Board image px are drawn at half a board px: device px per image px = scale * dpr / 2.
      const sized = surroundTexture(this, this.opts.surround, w, h, (l.scale * dpr) / 2);
      if (this.backdrop.texture.key !== sized) {
        const old = this.backdrop.texture.key;
        this.backdrop.setTexture(sized);
        if (old.includes('@') && old !== sized) this.textures.remove(old);
      }
      const cover = Math.max(w / this.backdrop.width, h / this.backdrop.height);
      this.backdrop.setPosition(w / 2, h / 2).setScale(cover);
    } else this.backdrop.setPosition(w / 2, h / 2).setSize(w, h);
    this.opts.hooks.layout(l);
  }

  /** Screen (game px) x to board px. */
  private toBoardX(screenX: number): number {
    const l = this.cssLayout;
    return (screenX / this.dpr - l.x) / l.scale;
  }

  setPaused(p: boolean): void {
    this.paused = p;
    if (this.input2) this.input2.enabled = !p;
  }

  override update(_time: number, deltaMs: number): void {
    if (this.paused || this.ended) return;
    const port = this.opts.port;
    this.fx.frame();
    this.acc = Math.min(this.acc + Math.min(deltaMs / 1000, MAX_FRAME_S) * this.rate(deltaMs), MAX_FRAME_S);
    while (this.acc >= STEP && !this.ended) {
      this.acc -= STEP;
      const auto = this.opts.autopilot;
      const driven = auto ? auto(port) : null;
      const manual = driven ? null : this.input2.take(port.view().paddleX);
      port.step(driven ?? manual!);
      for (const e of port.drainEvents()) this.onEvent(e);
    }
    this.draw(port.view(), deltaMs);
    this.probe?.frame(deltaMs);
  }

  /** Sim seconds per real second: slowed at the break-in, then eased back. */
  private rate(deltaMs: number): number {
    if (this.slowmo <= 0) return 1;
    this.slowmo -= deltaMs;
    if (this.slowmo > SLOWMO_EASE_MS) return SLOWMO_RATE;
    return SLOWMO_RATE + (1 - SLOWMO_RATE) * (1 - Math.max(0, this.slowmo) / SLOWMO_EASE_MS);
  }

  private draw(v: BoardView, deltaMs: number): void {
    this.bricks.sync(v);
    this.pieces.sync(v, deltaMs);
    this.stones.sync(v);
    this.lantern?.sync(v, PADDLE_Y);
    this.hudIn -= deltaMs;
    if (this.hudIn <= 0) {
      this.hudIn = HUD_EVERY_MS;
      this.opts.hooks.hud({ lives: v.lives, broken: v.broken, breakable: v.breakable, t: v.t, held: v.held, bossHits: v.boss ? v.boss.hitsLeft : null, bossTotal: v.boss ? v.boss.hits : null });
    }
  }

  private cascadePitch(): number {
    const now = this.time.now;
    this.recentBreaks = this.recentBreaks.filter((t) => now - t < 1000);
    this.recentBreaks.push(now);
    return Math.min(2, 1 + this.recentBreaks.length * 0.02);
  }

  private onEvent(e: SimEvent): void {
    const s = this.opts.sound;
    switch (e.type) {
      case 'bounce':
        if (e.on === 'paddle') this.pieces.swat(e.x, this.opts.port.view().paddleX);
        s.play(e.on === 'paddle' ? 'paddle' : e.on === 'stone' ? 'stone' : 'bounce');
        return;
      case 'hit':
        this.bricks.hit(e.brick);
        s.play('hit');
        return;
      case 'break':
        this.bricks.hide(e.brick);
        this.lastBreak = { x: e.x, y: e.y };
        this.fx.breakAt(e.x, e.y, e.kind);
        s.play('break', this.cascadePitch());
        return;
      case 'blast':
        this.fx.blast(e.x, e.y);
        this.cameras.main.shake(140, 0.006);
        s.play('blast');
        return;
      case 'split':
        this.probe?.mark('split');
        this.fx.pop(this.lastBreak.x, this.lastBreak.y, `x3! ${e.balls}`, '#ffd0f0');
        s.play('split');
        return;
      case 'pickup':
        this.fx.pop(this.opts.port.view().paddleX, 860, e.kind === 'wide' ? 'Wide raft!' : e.kind === 'plus3' ? '+3 stones!' : 'Fireball!', '#c0ffd8');
        s.play('pickup');
        return;
      case 'breakIn':
        this.probe?.mark('breakIn');
        this.onBreakIn();
        return;
      case 'lifeLost':
        this.heartsLost++;
        this.pieces.pose('shrug', CHEER_MS);
        this.cameras.main.shake(200, 0.008);
        s.play('lifeLost');
        return;
      case 'bossHit':
        this.probe?.mark('bossHit');
        this.pieces.bossHit();
        this.fx.pop(e.x, e.y, e.hitsLeft > 0 ? `Oof! ${e.hitsLeft} to go` : 'Got him!', '#ffe680', 30);
        this.cameras.main.shake(180, 0.008);
        s.play('blast', 1.4);
        return;
      case 'crumble':
        this.bricks.shiver();
        this.cameras.main.shake(400, 0.005);
        s.play('crumble');
        return;
      case 'cleared':
      case 'failed':
        this.finish(e.type === 'cleared' ? 'win' : 'lose');
        return;
      default:
        return;
    }
  }

  private onBreakIn(): void {
    if (this.breakIn === null) this.breakIn = this.opts.port.view().t;
    this.slowmo = SLOWMO_MS + SLOWMO_EASE_MS;
    this.cameras.main.shake(260, 0.01);
    this.pieces.pose('cheer', CHEER_MS);
    this.fx.shout(SHOUTS[Math.floor(Math.random() * SHOUTS.length)]!, BOARD_W / 2, BOARD_H * 0.42);
    this.opts.sound.play('breakIn');
  }

  private finish(result: 'win' | 'lose'): void {
    if (this.ended) return;
    this.ended = true;
    this.opts.sound.play(result);
    if (result === 'win') this.cameras.main.flash(300, 255, 240, 200);
    const outcome: PlayOutcome = { result, seconds: this.opts.port.view().t, breakIn: this.breakIn, heartsLost: this.heartsLost };
    this.time.delayedCall(END_DELAY_MS, () => this.opts.hooks.end(outcome));
  }
}
