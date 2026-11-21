import { NO_SAFE_AREA, safeAreaIn, type SafeArea } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { ART_RES } from '../art/palette';

/**
 * Device pixels per CSS pixel the canvas renders at. Capped at the resolution
 * textures are baked at: beyond that only lines and text gain, at a steep
 * fill-rate cost on phones.
 */
export const DPR = typeof window === 'undefined' ? 1 : Math.min(ART_RES, Math.max(1, window.devicePixelRatio || 1));

/** The screen size the interface is laid out for; smaller screens (phones) draw it smaller, as InkFish's uiScale does. */
const UI_DESIGN = { w: 760, h: 560 } as const;
/** Never smaller than this, so buttons stay big enough for a finger. */
const MIN_UI = 0.55;
/** Scenes drawn at a reduced interface scale (see screenScene). */
const uiScales = new WeakMap<Phaser.Scene, number>();

/** The interface scale `scene` draws at (1 unless set up scaled by screenScene). */
export function uiScaleOf(scene: Phaser.Scene): number {
  return uiScales.get(scene) ?? 1;
}

/**
 * How far the notch, rounded corners and home bar reach into the game. The
 * site's play page lets the game fill the whole screen: the world runs under
 * them, while every layout here keeps out of them.
 */
let safe: SafeArea = NO_SAFE_AREA;

/** Measures the safe area again: call before the game is resized (mount does). */
export function measureSafeArea(parent: Element): void {
  safe = safeAreaIn(parent);
}

/** The whole canvas in CSS pixels, notch and home bar included: for what must cover the screen. */
export function fullScreenSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width / DPR, height: scene.scale.height / DPR };
}

/** The screen in CSS pixels that the interface is laid out in (the safe part), whatever scale it draws at. */
export function screenSize(scene: Phaser.Scene): { width: number; height: number } {
  const full = fullScreenSize(scene);
  return { width: Math.max(0, full.width - safe.left - safe.right), height: Math.max(0, full.height - safe.top - safe.bottom) };
}

/** A position on screen in CSS pixels (as the world camera shows it) in the interface's CSS pixels (see screenSize). */
export function screenToView(x: number, y: number): { x: number; y: number } {
  return { x: x - safe.left, y: y - safe.top };
}

/** How big the interface draws on a screen of this CSS size: 1 on a laptop, less on a phone. */
export function uiScaleFor(width: number, height: number): number {
  return Phaser.Math.Clamp(Math.min(width / UI_DESIGN.w, height / UI_DESIGN.h), MIN_UI, 1);
}

/**
 * The game is sized in device pixels so it renders crisply, but every layout
 * is written in CSS pixels. This is the viewport in those layout units, or,
 * for a scene drawn at a reduced interface scale, in its larger layout units.
 */
export function viewSize(scene: Phaser.Scene): { width: number; height: number } {
  const s = uiScales.get(scene) ?? 1;
  const { width, height } = screenSize(scene);
  return { width: width / s, height: height / s };
}

/** A screen position (pointer x/y, downX/downY) in CSS pixels, or in `scene`'s layout units when given. */
export function toView(x: number, y: number, scene?: Phaser.Scene): { x: number; y: number } {
  const s = (scene && uiScales.get(scene)) ?? 1;
  return { x: (x / DPR - safe.left) / s, y: (y / DPR - safe.top) / s };
}

/** Camera zoom as seen on screen, without the device-pixel factor. */
export function screenZoom(cam: Phaser.Cameras.Scene2D.Camera): number {
  return cam.zoom / DPR;
}

/**
 * A fixed overlay camera: CSS-pixel coordinates from the safe area's top-left
 * (see screenSize), drawn at device resolution. Its viewport is the safe area,
 * following the screen as it resizes or turns.
 */
export function uiCamera(cam: Phaser.Cameras.Scene2D.Camera): Phaser.Cameras.Scene2D.Camera {
  const { scene } = cam;
  const follow = (): void => {
    const { width, height } = scene.scale;
    cam.setViewport(safe.left * DPR, safe.top * DPR, Math.max(1, width - (safe.left + safe.right) * DPR), Math.max(1, height - (safe.top + safe.bottom) * DPR));
  };
  follow();
  scene.scale.on('resize', follow);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off('resize', follow));
  return cam.setOrigin(0).setZoom(DPR);
}

/** Rasterizes every Text the scene creates at device resolution, so it stays sharp. */
export function crispText(scene: Phaser.Scene): void {
  if (DPR === 1) return;
  const onAdded = (obj: Phaser.GameObjects.GameObject): void => {
    if (obj instanceof Phaser.GameObjects.Text && obj.style.resolution < DPR) obj.setResolution(DPR);
  };
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded));
}

/**
 * Sets up a scene whose main camera is a plain fixed screen (menus, HUD, cards).
 * `scaled` draws it smaller on small screens (see uiScaleFor), following the
 * screen as it resizes or turns: its layout then works in viewSize's units.
 */
export function screenScene(scene: Phaser.Scene, scaled = false): void {
  crispText(scene);
  if (!scaled) {
    uiScales.delete(scene);
    uiCamera(scene.cameras.main);
    return;
  }
  uiCamera(scene.cameras.main);
  const apply = (): void => {
    const { width, height } = screenSize(scene);
    const s = uiScaleFor(width, height);
    uiScales.set(scene, s);
    scene.cameras.main.setOrigin(0).setZoom(DPR * s);
  };
  apply();
  scene.scale.on('resize', apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off('resize', apply));
}
