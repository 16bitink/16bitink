import type { CityView, Command, Quote } from '../../sim/types';
import { esc } from '../dom';
import { num, pct } from '../format';
import type { PlayActs } from '../types';

export interface PanelCtx { readonly city: CityView; readonly acts: PlayActs; readonly world: import('../../app/worldPort').WorldPort | null }

export const kv = (label: string, value: string): string => `<div class="kv"><span class="dim">${esc(label)}</span><b>${value}</b></div>`;

/** A meter, 0..1, as the HUD's bars. */
export const meter = (frac: number, low = false): string => `<span class="meter${low ? ' low' : ''}" style="--w:${pct(frac)}"><i></i></span>`;

export const priceTag = (q: Quote): string => (q.cost > 0 ? `<small class="coin">${num(q.cost)}</small>` : '<small>free</small>');

/** One on/off switch row that sends a command: label, state, and what it costs. */
export function toggleRow(label: string, on: boolean, act: string, value: string): string {
  return `<button class="toggle${on ? ' on' : ''}" data-act="${act}" data-v="${value}"><span>${esc(label)}</span><i></i></button>`;
}

export const quoted = (city: CityView, cmd: Command): Quote => city.quote(cmd);

/** Sums to 1 after moving slider `i` to `v`: the others share what is left in proportion. */
export function rebalance(split: readonly number[], i: number, v: number): number[] {
  const x = Math.min(0.9, Math.max(0.1, v));
  const rest = split.reduce((a, s, j) => (j === i ? a : a + s), 0);
  const out = split.map((s, j) => (j === i ? x : rest > 0 ? (s / rest) * (1 - x) : (1 - x) / (split.length - 1)));
  return out.map((s) => Math.round(s * 1000) / 1000);
}
