import { LETTERS_TO_LOSE } from '../../sim/constants';
import type { Letter } from '../../sim/types';
import { esc } from '../dom';
import { dateLine } from '../format';
import { pic } from '../pics';

const BAR_NAMES = { trips: 'Trips', parking: 'Parking', cost: 'Cost', streets: 'Streets' } as const;

/** The Council's letter: an envelope that opens, Sulo (stern), the approval, the worst bar, and which letter of three. */
export function letterCard(l: Letter, n: number, year = l.year): string {
  const left = LETTERS_TO_LOSE - n;
  return `<div class="card paper letter"><div class="envelope">${pic('letter', 'env')}<div class="paperleaf">
      <div class="head"><div class="row">${pic('portrait-sulo_stern', 'sulo')}<div><h2>The Council writes</h2><div class="sub">${dateLine(year, l.season)}, from Sulo</div></div></div>
        <span class="stamp red big slam">Letter ${n} of ${LETTERS_TO_LOSE}</span></div>
      <p class="body">${esc(l.text)}</p>
      <div class="row wrap facts"><span class="chip">Approval <b>${Math.round(l.approval)}</b></span><span class="chip">${pic(`bar-${l.worst}`)}Worst: <b>${BAR_NAMES[l.worst]}</b></span></div>
    </div></div>
    <div class="foot"><span class="small dim grow">${left <= 0 ? 'That was the last letter.' : left === 1 ? 'One more and you are replaced.' : `${left} more and you are replaced.`}</span>${pic('mat-seal', 'seal')}<button class="btn go" data-act="close">Understood</button></div></div>`;
}
