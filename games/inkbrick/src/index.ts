import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import { App } from './app/app';
import { injectStyles } from './ui/dom';
import { GAME_VERSION } from './version';

/**
 * InkBrick: the headless physics in src/sim (shared with bots, the lab and
 * the daily generator), the board scene in src/scenes and src/render, the
 * DOM screens in src/ui, the flow in src/app. Dev page: dev/index.html.
 */
export const GAME_ID = 'inkbrick';

/** Mounts InkBrick into `parent`, filling it completely and tracking its size. */
export function mount(parent: HTMLElement, host: GameHost): GameHandle & { readonly app: App } {
  injectStyles(parent.ownerDocument);
  const app = new App(parent, host);
  return { app, destroy: () => app.destroy() };
}

const inkbrick: GameModule = { mount, version: GAME_VERSION };
export default inkbrick;
