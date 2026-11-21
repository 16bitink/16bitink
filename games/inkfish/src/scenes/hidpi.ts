import { NO_SAFE_AREA, safeAreaIn, type SafeArea } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { ART_RES } from '../art/propArt';

/**
 * Device pixels per CSS pixel the canvas renders at. Capped at the resolution
 * textures are baked at: beyond that only lines and text gain, at a steep
 * fill-rate cost on phones.
 */
export const DPR = typeof window === 'undefined' ? 1 : Math.min(ART_RES, Math.max(1, window.devicePixelRatio || 1));

/**
 * How far the notch, rounded corners and home bar reach into the game. The
 * site's play page lets InkFish fill the whole screen: the sea runs under
 * them, while every layout below keeps out of them.
 */
let safe: SafeArea = NO_SAFE_AREA;

/** Measures the safe area again: call before the game is resized (mount does). */
export function measureSafeArea(parent: Element): void {
  safe = safeAreaIn(parent);
}

/** The whole canvas in CSS pixels, notch and home bar included: for what must cover the screen. */
export function fullViewSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width / DPR, height: scene.scale.height / DPR };
}

/**
 * The game is sized in device pixels so it renders crisply, but every layout
 * is written in CSS pixels. This is the viewport in those layout units: the
 * safe part of it, which UI cameras (uiCamera) put at their top-left.
 */
export function viewSize(scene: Phaser.Scene): { width: number; height: number } {
  const full = fullViewSize(scene);
  return { width: Math.max(0, full.width - safe.left - safe.right), height: Math.max(0, full.height - safe.top - safe.bottom) };
}

/** A screen position (pointer x/y, downX/downY) in the layout's CSS pixels (see viewSize). */
export function toView(x: number, y: number): { x: number; y: number } {
  return { x: x / DPR - safe.left, y: y / DPR - safe.top };
}

/** A position on screen in CSS pixels (as the world camera shows it) in the layout's CSS pixels. */
export function screenToView(x: number, y: number): { x: number; y: number } {
  return { x: x - safe.left, y: y - safe.top };
}

/** Camera zoom as seen on screen, without the device-pixel factor. */
export function screenZoom(cam: Phaser.Cameras.Scene2D.Camera): number {
  return cam.zoom / DPR;
}

/**
 * A fixed overlay camera: CSS-pixel coordinates from the safe area's top-left
 * (see viewSize), drawn at device resolution.
 */
export function uiCamera(cam: Phaser.Cameras.Scene2D.Camera): Phaser.Cameras.Scene2D.Camera {
  const { scene } = cam;
  const follow = (): void => {
    cam.setScroll(-safe.left, -safe.top);
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

/** Sets up a scene whose main camera is a plain fixed screen (menus, HUD, cards). */
export function screenScene(scene: Phaser.Scene): void {
  uiCamera(scene.cameras.main);
  crispText(scene);
}
