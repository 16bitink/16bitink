import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import { App } from './app/app';
import type { Deps } from './app/deps';
import { realDeps } from './app/realDeps';
import { GAME_VERSION } from './version';

/**
 * InkRoad: the headless sim in src/sim, the city in src/city, the Phaser world
 * in src/scenes, the DOM screens in src/ui, the flow in src/app, sound in src/audio.
 * Dev page: dev/index.html.
 */
export const GAME_ID = 'inkroad';

/** Mounts InkRoad into `parent` with the given content and world (the real ones from src/app/realDeps.ts). */
export function mountWith(parent: HTMLElement, host: GameHost, deps: Deps): GameHandle & { readonly app: App } {
  const app = new App(parent, host, deps);
  return { app, destroy: () => app.destroy() };
}

export function mount(parent: HTMLElement, host: GameHost): GameHandle {
  return mountWith(parent, host, realDeps());
}

const inkroad: GameModule = { mount, version: GAME_VERSION };
export default inkroad;
