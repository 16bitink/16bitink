import type { KeyValueStore, ProgressStore } from '@16bitink/game-sdk';
import { mount } from '../src/index';
import { SAVE_KEY, SAVE_VERSION } from '../src/logic/save';
import { newProgress, type Progress } from '../src/logic/workshop';
import { qnum, query, setReady } from './boot';

// Set by vite.config.ts from DEV_UNLOCK / DEV_ALL_LEVELS when the dev server starts.
declare const __DEV_UNLOCK__: boolean;
declare const __DEV_ALL_LEVELS__: boolean;

/**
 * The whole game, as the website mounts it. `DEV_UNLOCK=true npm run dev`
 * plays as an owner. For snapshots (dev/snap.mjs "index.html?screen=…"):
 *   ?screen=menu|map|briefing|workshop|results|mission|ending   which screen to open
 *   ?level=N        the level for briefing, results and mission
 *   ?save=mid       a mid-chapter save (levels 1–4 passed, intel, Corporal) in memory, not localStorage
 *   ?save=won       the war won (all 50 passed, General, Mk V tank), for ?screen=ending
 *   ?tab=wingmen    with screen=workshop: the tab to open (gun, hull, drive, gadgets, wingmen)
 *   ?xp=N           with save=mid: the rank XP (e.g. 380, so results show a promotion)
 *   ?account=mid    signed in, with that save (mid, tiers, won) in the account; ?account=empty: none yet.
 *                   An in-memory host.progress: window.__account holds what was pushed to it.
 */
function midSave(): Progress {
  const p = newProgress();
  return {
    ...p,
    xp: qnum('xp', 620),
    intel: { cannon: 9, medium: 4, halftracks: 6, machinegun: 5, rockets: 2, wheels: 3 },
    intelTotal: { cannon: 12, medium: 7, halftracks: 9, machinegun: 5, rockets: 2, wheels: 3 },
    unlocked: [...p.unlocked, 'cannon', 'medium'],
    mk: { ...p.mk, cannon: 1, medium: 1 },
    research: { cannon: { damage: 1 } },
    medals: { 1: [true, true, false], 2: [true, true, true], 3: [true, false, false], 4: [true, false, true] },
    loadout: { gun: { family: 'cannon', mk: 1 }, hull: { family: 'medium', mk: 1 }, drive: { family: 'wheels', mk: 1 } },
  };
}

/** Late game, for checking the Mk tier colours: the three guns at Mk III, IV and V. */
function tiersSave(): Progress {
  const p = newProgress();
  return {
    ...midSave(),
    xp: qnum('xp', 9000),
    intel: { machinegun: 60, cannon: 40, rockets: 30 },
    unlocked: [...p.unlocked, 'cannon', 'rockets'],
    mk: { ...p.mk, machinegun: 3, cannon: 4, rockets: 5 },
    loadout: { gun: { family: 'rockets', mk: 5 }, hull: { family: 'light', mk: 1 }, drive: { family: 'wheels', mk: 1 } },
    gadgetIntel: { mines: 12, oil: 2, smoke: 5 },
    gadgetMk: { mines: 3, oil: 5, smoke: 2 },
  };
}

/** The war won (?save=won): all 50 levels passed with most medals, a General on a Mk V tank (for ?screen=ending). */
function wonSave(): Progress {
  const t = tiersSave();
  const medals = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, [true, i % 3 !== 0, i % 4 !== 0] as const]));
  return {
    ...t,
    xp: 12900,
    medals,
    intelTotal: { machinegun: 520, cannon: 380, medium: 600, halftracks: 450, light: 460, wheels: 300, hover: 260, rail: 90 },
    unlocked: [...t.unlocked, 'medium', 'halftracks', 'hover', 'rail'],
    loadout: { gun: { family: 'cannon', mk: 5 }, hull: { family: 'medium', mk: 5 }, drive: { family: 'halftracks', mk: 5 } },
  };
}

function memoryStore(seed: string | null): KeyValueStore {
  const m = new Map<string, string>();
  if (seed) m.set(SAVE_KEY, seed);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** A signed-in player's account, in memory: as the website's, load gives the copy and save stores it. */
function memoryAccount(seed: Progress | null): ProgressStore & { data: unknown; saves: number } {
  const acct = {
    data: seed ? JSON.parse(JSON.stringify({ v: SAVE_VERSION, progress: seed, sound: true, seenBlueprints: false, gadget: 'mines' })) as unknown : null,
    saves: 0,
    load: () => Promise.resolve(acct.data),
    save: (data: unknown) => {
      acct.data = JSON.parse(JSON.stringify(data)) as unknown;
      acct.saves += 1;
      console.info('[dev] pushed to the account', acct.data);
      return Promise.resolve();
    },
  };
  return acct;
}

const presetOf = (name: string | null): Progress | null => (name === 'mid' ? midSave() : name === 'tiers' ? tiersSave() : name === 'won' ? wonSave() : null);
const accountPreset = query.get('account');
const account = accountPreset ? memoryAccount(presetOf(accountPreset)) : undefined;
(window as unknown as { __account: unknown }).__account = account;

const preset = query.get('save');
const presetSave = presetOf(preset);
const storage = presetSave ? memoryStore(JSON.stringify({ v: SAVE_VERSION, progress: presetSave, sound: true })) : preset === 'new' ? memoryStore(null) : window.localStorage;
const parent = document.getElementById('game')!;
const handle = mount(parent, {
  unlocked: __DEV_UNLOCK__,
  allLevelsOpen: __DEV_ALL_LEVELS__,
  storage,
  progress: account,
  signedIn: account !== undefined,
  // As the website serves it to owners: JSON over the wire.
  loadContent: async () => JSON.parse(JSON.stringify((await import('../content/paid')).INKTANKS_PAID_LEVELS)) as unknown,
  onBuy: () => alert('Checkout would open here'),
  onSignIn: () => alert('Sign-in would open here'),
  price: '$4.99',
  onExit: () => alert('Exit to catalog'),
});
const app = await handle.app;
await app.ready;
const level = qnum('level', 1);
const screen = query.get('screen') ?? 'menu';
if (screen === 'map') app.map();
else if (screen === 'briefing') app.open(level);
else if (screen === 'workshop') app.workshop(() => app.map(), 'Map', (query.get('tab') ?? undefined) as Parameters<typeof app.workshop>[2]);
else if (screen === 'results') app.devResults(level);
else if (screen === 'mission') app.devPlay(level);
else if (screen === 'ending') app.ending();
(window as unknown as { __app: unknown }).__app = app;
setTimeout(setReady, screen === 'mission' ? 1000 + qnum('demo', 3) * 1000 : 900);
