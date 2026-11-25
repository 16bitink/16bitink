import { esc, Router } from './dom';
import { musicLabel, toggleMusic } from '../audio/musicPref';
import { picUrl } from './pics';

export interface MenuData { readonly started: boolean; readonly sound: boolean; readonly note: string | null; readonly resume: string | null }
export interface MenuActs { cont(): void; desk(): void; sound(): void; exit(): void }

/** The title screen: a sheet on the surveyor's desk. */
export function showMenu(el: HTMLElement, router: Router, d: MenuData, a: MenuActs): void {
  el.hidden = false;
  el.innerHTML = `<div class="menu" style="--menu-art:url('${picUrl('title')}')"><div class="paper taped sheet">
    <div class="logo">Ink<span>Road</span></div><div class="tag">You run the roads. Everyone has an opinion.</div>
    ${d.note ? `<p class="warn small">${esc(d.note)}</p>` : ''}
    <div class="btns"><button class="btn go big" data-act="cont">${d.started ? 'Continue' : 'Start'}</button>
      ${d.resume ? `<span class="small dim">${esc(d.resume)}</span>` : ''}
      <button class="btn" data-act="desk">City desk</button>
      <div class="row"><button class="btn sm" data-act="sound">Sound ${d.sound ? 'on' : 'off'}</button><button class="btn sm" data-act="music">${musicLabel()}</button><button class="btn sm" data-act="exit">Exit</button></div></div></div></div>`;
  router.set({ cont: a.cont, desk: a.desk, sound: a.sound, exit: a.exit, music: (_v, el) => { toggleMusic(); el.textContent = musicLabel(); } });
}
