import { musicLabel, toggleMusic } from '../audio/musicPref';
import { Router } from './dom';

export interface EscActs { resume(): void; restart(): void; sound(): void; desk(): void; guide(): void }

/** The Esc menu: a small paper card over the paused game. */
export function showEsc(layer: HTMLElement, router: Router, sound: boolean, guide: boolean, a: EscActs): void {
  layer.hidden = false;
  layer.innerHTML = `<div class="card paper taped esc"><h2>Paused</h2>
    <button class="btn go" data-act="resume">Back to work</button><button class="btn" data-act="restart">Restart this year</button>
    <button class="btn" data-act="guide">Guide ${guide ? 'on' : 'off'}</button>
    <button class="btn" data-act="sound">Sound ${sound ? 'on' : 'off'}</button><button class="btn" data-act="music">${musicLabel()}</button><button class="btn" data-act="desk">City desk</button></div>`;
  router.set({ resume: a.resume, restart: a.restart, sound: a.sound, guide: a.guide, desk: a.desk, music: (_v, el) => { toggleMusic(); el.textContent = musicLabel(); } });
}

export function hideEsc(layer: HTMLElement): void {
  layer.hidden = true;
  layer.innerHTML = '';
}

export const COVER_HTML = '<div class="rot"></div><p>Turn your phone sideways</p><p class="small" style="font:600 16px var(--sans)">InkRoad is a wide-screen job.</p>';
