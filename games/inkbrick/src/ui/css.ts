/**
 * InkBrick's screens and HUD in InkFish's ink look: pale paper, frames drawn
 * as wobbly fountain-pen lines (an SVG rect pushed about by a turbulence
 * filter, re-traced faintly), flat muted fills, no gradients or glow.
 * Caveat (the site serves it) for every word. Scoped under .ikb so nothing
 * leaks into the site's page. Phones get bigger text.
 */
import { ART_STYLE } from '../art/style';
import { CSS_PAINT } from './cssPaint';

const INK = '#1b1a1f';

/** A 9-slice frame: a wobbly inked rect with `fill`, an optional ink "lip" below (buttons). */
function inkFrame(fill: string, seed: number, lip = false): string {
  const wob = `<filter id='w' x='-5%' y='-5%' width='110%' height='110%'><feTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='2' seed='${seed}'/><feDisplacementMap in='SourceGraphic' scale='3.4'/></filter>`;
  const under = lip ? `<rect x='5' y='10' width='110' height='105' rx='10' fill='${INK}'/>` : '';
  const body = `<rect x='5' y='5' width='110' height='${lip ? 104 : 110}' rx='10' fill='${fill}' stroke='${INK}' stroke-width='2.6'/>`;
  const ghost = `<rect x='6.5' y='3.8' width='108' height='${lip ? 106 : 112}' rx='11' fill='none' stroke='${INK}' stroke-width='1' opacity='0.28'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>${wob}<g filter='url(#w)'>${under}${body}${ghost}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** border-image for a frame: 24 px corners, the fill stretched behind the content. */
const frame = (fill: string, seed: number, lip = false, px = 22): string =>
  `border: ${px}px solid transparent; border-radius: 0; border-image: ${inkFrame(fill, seed, lip)} 26 fill / ${px}px stretch; background: none;`;

const CSS_INK = `
.ikb { position: absolute; inset: 0; overflow: hidden; background: #e2ded5; color: #1b1a1f; touch-action: none; user-select: none; -webkit-user-select: none;
  font: 600 22px/1.2 Caveat, "Patrick Hand", "Comic Sans MS", cursive; --paper: #f4eddc; --ink: #1b1a1f; --sea: #9fbfd6; --gold: #e2b95a; --dim: #6a6258; --coral: #c8644e; --leaf: #a8b98e; }
.ikb * { box-sizing: border-box; }
.ikb [hidden] { display: none !important; }
.ikb .stage, .ikb .stage canvas { position: absolute; inset: 0; display: block; }
.ikb .screen { position: absolute; inset: 0; z-index: 4; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
.ikb .screen.card { z-index: 6; background: rgba(226, 222, 213, 0.72); }
.ikb .screen.sea { background: #e9e5dc; }
.ikb h1, .ikb h2, .ikb h3, .ikb p { margin: 0; font-weight: 700; }
.ikb .t64 { font-size: 64px; line-height: 0.95; } .ikb .t44 { font-size: 44px; line-height: 1; } .ikb .t32 { font-size: 32px; line-height: 1.05; } .ikb .t18 { font-size: 18px; }
.ikb .dim { color: var(--dim); } .ikb .gold { color: #9a6a1a; } .ikb .coral { color: var(--coral); } .ikb .light { color: var(--ink); }
.ikb .panel { position: relative; ${frame('#f4eddc', 3, false, 24)} padding: 6px 10px; max-width: min(560px, 96vw); max-height: 100%; overflow-y: auto; overflow-x: hidden; margin: auto; }
.ikb .tz { width: 96px; height: 80px; flex: none; }
.ikb .tz-pic { position: relative; overflow: hidden; } .ikb .tz-pic img { position: absolute; display: block; }
.ikb .tz-brumm { width: 125%; left: -12.5%; top: 2%; } .ikb .tz-wall { left: 0; top: 0; width: 100%; height: 100%; } .ikb .tz > * { display: block; width: 100% !important; height: 100% !important; }
.ikb .row { display: flex; align-items: center; gap: 10px; } .ikb .col { display: flex; flex-direction: column; gap: 10px; }
.ikb .wrap { flex-wrap: wrap; } .ikb .center { justify-content: center; text-align: center; align-items: center; } .ikb .spread { justify-content: space-between; }
.ikb .btn { font: inherit; font-size: 28px; color: var(--ink); ${frame('#e4cf9c', 5, true, 14)} padding: 0 10px 4px; min-height: 52px; cursor: pointer; white-space: nowrap; }
.ikb .btn:hover { filter: brightness(1.06); } .ikb .btn:active { transform: translateY(3px); }
.ikb .btn.go { ${frame('#a8b98e', 7, true, 14)} } .ikb .btn.gold { ${frame('#e2b95a', 9, true, 14)} } .ikb .btn.sea { ${frame('#9fbfd6', 11, true, 14)} } .ikb .btn.small { font-size: 22px; min-height: 40px; padding: 0 4px 2px; }
.ikb .btn[disabled] { filter: grayscale(0.8) opacity(0.6); cursor: default; transform: none; }
.ikb .shell { display: inline-block; width: 26px; height: 22px; margin: 0 3px; background: #d8c8a8; border: 2px solid var(--ink); border-radius: 50% 50% 40% 40% / 70% 70% 30% 30%; vertical-align: -3px; }
.ikb img.shell.art, .ikb img.heart.art { background: none; border: 0; border-radius: 0; clip-path: none; object-fit: contain; width: 26px; height: 30px; }
.ikb img.heart.art { width: 30px; height: 27px; }
.ikb .shell.on { background: #d6b0c0; }
.ikb .shell.pop { animation: ikb-pop 0.6s cubic-bezier(.2,1.6,.4,1) both; }
@keyframes ikb-pop { from { transform: scale(0.1) rotate(-30deg); } to { transform: scale(1) rotate(0); } }
.ikb .heart { display: inline-block; width: 28px; height: 26px; margin: 0 2px; background: #c8644e; border: 2px solid var(--ink); clip-path: path('M14 25 C 2 16 0 10 0 7 C 0 2 4 0 7 0 C 10 0 13 2 14 5 C 15 2 18 0 21 0 C 24 0 28 2 28 7 C 28 10 26 16 14 25 Z'); }
.ikb .heart.off { background: #8a7a68; opacity: 0.45; }
.ikb .menu-panel { min-width: min(440px, 92vw); }
@media (min-width: 1200px) and (min-height: 800px) { .ikb .menu-panel { transform: scale(1.3); } }
/* The chapter map */
.ikb .map { position: absolute; inset: 0; }
.ikb .map .sea-art { position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 40%, #e8d8a8 0 18%, transparent 19%), radial-gradient(ellipse at 70% 60%, #e8d8a8 0 14%, transparent 15%), linear-gradient(160deg, #6fb0b0, #2f6f78 60%, #1d3a44); background-size: cover; background-position: center; }
.ikb .map .top { position: absolute; left: 0; right: 0; top: 0; padding: max(10px, env(safe-area-inset-top)) 14px 0; display: flex; gap: 10px; align-items: center; justify-content: space-between; z-index: 2; }
.ikb .map .place { position: absolute; transform: translate(-50%, -50%); text-align: center; color: #fff6dc; text-shadow: 0 2px 0 #1a1208, 0 0 8px rgba(0,0,0,0.5); font-size: 30px; pointer-events: none; white-space: nowrap; }
.ikb .map .node { position: absolute; transform: translate(-50%, -50%); width: 46px; height: 46px; border-radius: 50%; border: 3px solid var(--ink); background: var(--paper); font: inherit; font-size: 22px; cursor: pointer; padding: 0; box-shadow: 0 3px 0 var(--ink); }
.ikb .map .node.done { background: #f6dc9a; } .ikb .map .node.next { background: #8cc87a; animation: ikb-bob 1.2s ease-in-out infinite; }
.ikb .map .node.locked { background: #b8ac98; color: #6a5e4e; } .ikb .map .node.paid { background: #c8b8d8; }
.ikb .map .node.boss { width: 58px; height: 58px; border-width: 4px; }
.ikb .map .node .m { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); font-size: 13px; white-space: nowrap; color: #fff6dc; text-shadow: 0 1px 0 #000; }
@keyframes ikb-bob { 50% { transform: translate(-50%, -58%); } }
.ikb .map .daily-btn { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); z-index: 2; }
/* The HUD beside the board */
.ikb .hud { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.ikb .hud .side { position: absolute; top: 0; bottom: 0; display: flex; flex-direction: column; gap: 16px; justify-content: center; padding: 20px; color: var(--ink); }
.ikb .hud .side .panel { color: var(--ink); text-shadow: none; padding: 12px 16px; }
.ikb .hud .strip { position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; gap: 8px; color: var(--ink); font-size: 28px; }
.ikb .hud button { pointer-events: auto; }
.ikb .hud [data-k="hearts"] { display: flex; flex-shrink: 0; align-items: center; }
.ikb .hud .strip img.heart.art { width: 26px; height: 24px; }
.ikb .hud .bar { height: 14px; border: 2px solid var(--ink); border-radius: 7px 5px 8px 4px; background: #f4eddc; overflow: hidden; min-width: 90px; }
.ikb .hud .bar i { display: block; height: 100%; background: #d6b0c0; }
.ikb .hud .beat { color: #9a6a1a; }
.ikb .hint { position: absolute; left: 50%; transform: translateX(-50%); z-index: 3; color: var(--ink); font-size: clamp(20px, 7vw, 30px); pointer-events: none; text-align: center; white-space: nowrap; }
/* The calendar */
.ikb .cal { border-collapse: separate; border-spacing: 4px; margin: 0 auto; }
.ikb .cal th { font-size: 18px; color: var(--dim); }
.ikb .cal td { width: 44px; height: 40px; text-align: center; border-radius: 10px; font-size: 20px; position: relative; }
.ikb .cal td.day { background: #ebe4d3; } .ikb .cal td.future { opacity: 0.4; }
.ikb .cal td.played { background: #e2b95a; border: 2px solid var(--ink); border-radius: 9px 6px 10px 5px; }
.ikb .cal td.late { background: #ebe4d3; border: 2px dashed var(--ink); }
.ikb .cal td.today { box-shadow: 0 0 0 3px var(--coral); }
.ikb .cal td.pick { cursor: pointer; } .ikb .cal td.pick:hover { filter: brightness(0.92); }
/* The wardrobe */
.ikb .looks { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.ikb .look { font: inherit; font-size: 20px; border: 2px solid var(--ink); border-radius: 12px 8px 13px 7px; background: #ebe4d3; padding: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ikb .look.on { background: #e2b95a; } .ikb .look[disabled] { opacity: 0.5; cursor: default; }
.ikb .look .pic { width: 120px; height: 44px; border-radius: 10px; border: 2px solid var(--ink); background-size: contain; background-repeat: no-repeat; background-position: center; }
.ikb .done-row { position: sticky; bottom: -6px; padding: 6px 0 2px; background: linear-gradient(transparent, #f4eddc 30%); }
.ikb .boot-bar { width: 260px; height: 16px; border: 2.5px solid var(--ink); border-radius: 9px 6px 10px 5px; overflow: hidden; background: #f4eddc; }
.ikb .boot-bar i { display: block; height: 100%; width: 0; background: #a8b98e; transition: width 0.2s; }
@media (max-width: 600px), (max-height: 500px) {
  .ikb { font-size: 26px; }
  .ikb .btn { font-size: 30px; min-height: 56px; }
  .ikb .panel { padding: 10px 12px; }
  .ikb .panel.col { gap: 5px; }
  .ikb .panel p { line-height: 1.05; }
  .ikb .panel h2.t44 { font-size: 38px; }
  .ikb .panel .t32 { font-size: 28px; }
  .ikb .tz { width: 78px; height: 65px; }
  .ikb .teaser { padding: 6px 10px !important; gap: 10px !important; }
  .ikb .btns { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; width: 100%; }
  .ikb .btns .btn { grid-column: span 2; }
  .ikb .btns .btn { min-height: 48px; font-size: 25px; padding: 0 2px 3px; border-left-width: 9px; border-right-width: 9px; border-image-width: 14px 9px; }
  .ikb .btns .sea { grid-column: 1 / -1; }
  .ikb .btns .menu { grid-column: span 1; min-height: 48px; font-size: 20px; padding: 0 2px 3px; }
  .ikb .look-line .btn { display: inline-block; vertical-align: middle; }
  .ikb .cal-link { font-size: 15px; }
  .ikb .looks { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .ikb .look { font-size: 17px; padding: 4px 2px; gap: 2px; line-height: 1; }
  .ikb .look .pic { width: 92%; height: 34px; }
  .ikb .look .t18 { font-size: 14px; }
  .ikb .wardrobe h3.t32 { font-size: 24px; }
}
@media (max-width: 380px), (max-height: 780px) and (max-width: 600px) {
  .ikb { font-size: 22px; }
  .ikb .panel { padding: 8px 10px; }
  .ikb .panel.col { gap: 3px; }
  .ikb .panel h2.t44 { font-size: 34px; }
  .ikb .panel .t32 { font-size: 24px; }
  .ikb .tz { width: 66px; height: 55px; }
  .ikb .teaser { padding: 4px 8px !important; gap: 8px !important; }
  .ikb .btns { gap: 5px; }
  .ikb .btns .btn { min-height: 42px; font-size: 22px; }
  .ikb .btns .menu { min-height: 42px; font-size: 18px; }
  .ikb .btn.small { min-height: 34px; font-size: 20px; }
  .ikb .t64 { font-size: 52px; }
  .ikb .map .node { width: 50px; height: 50px; font-size: 24px; }
  .ikb .map .node .m { display: none; }
}
`;

/** Goals, rules and daily pearls (2026-11-18): the same in both art sets. */
const CSS_VARIETY = `
.ikb .rule-ic { width: 34px; height: 34px; flex: none; vertical-align: middle; }
.ikb .rule-ic.big { width: 44px; height: 44px; }
.ikb .rule-banner { display: flex; flex-direction: column; gap: 6px; text-align: left; padding: 8px 12px; margin-bottom: 8px; background: #f4eddc; border: 2.5px solid #1b1a1f; border-radius: 14px 9px 15px 8px; box-shadow: 0 3px 0 #1b1a1f; }
.ikb .rb-row { display: flex; align-items: center; gap: 10px; }
.ikb .rb-row .rule-ic { width: 46px; height: 46px; }
.ikb .rb-row div { display: flex; flex-direction: column; line-height: 1.02; }
.ikb .rb-row b { font-size: 28px; } .ikb .rb-row span { font-size: 21px; color: #4a443d; }
.ikb .hint.fresh { white-space: normal; display: flex; flex-direction: column; align-items: stretch; gap: 4px; font-size: 26px; transform: translate(-50%, -50%); }
.ikb .hint .tip { color: #6a6258; }
/* The launch words sit over bricks or the tide line: a parchment halo keeps them readable. */
.ikb .hint:not(.night) { text-shadow: 0 0 3px #f4eddc, 0 0 6px #f4eddc, 0 0 10px #f4eddc; }
.ikb .hint:not(.night) .rule-banner { text-shadow: none; }
.ikb .hint.fresh:not(.night) > .t18 { align-self: center; background: rgba(244, 237, 220, 0.92); border-radius: 9px 6px 10px 5px; padding: 1px 10px; }
.ikb .hint.night, .ikb .hint.night .tip { color: #efe6d2; text-shadow: 0 1px 3px #1b1a1f; }
.ikb .hint.night .rule-banner { color: var(--ink); text-shadow: none; }
.ikb .goal-k { display: flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 32px; white-space: nowrap; }
.ikb .goal-k:empty { display: none; }
.ikb .goal-k b { font-size: 34px; }
.ikb .gk-ic { width: 34px; height: 34px; object-fit: contain; } .ikb .gk-ic.big { width: 44px; height: 44px; }
.ikb .gk-stack { position: relative; display: inline-block; width: 44px; height: 44px; } .ikb .gk-stack img { position: absolute; left: 0; top: 0; }
.ikb .hud .side .goal-k { font-size: 30px; }
.ikb .hud .bar { position: relative; }
.ikb .hud .bar .need { position: absolute; top: -3px; bottom: -3px; width: 3px; margin-left: -1.5px; background: #1b1a1f; }
.ikb .hud .bar { overflow: visible; }
.ikb .hud .bar i { border-radius: 5px 3px 6px 3px; }
.ikb .hud .bar .need::after { content: ''; position: absolute; left: 1px; top: -9px; border: 5px solid transparent; border-left: 8px solid #c8644e; border-right: 0; }
.ikb .hud .bar.passed i { background: #e2b04a; }
.ikb .shell-labels { display: flex; justify-content: center; gap: 6px; font-size: 17px; color: #6a6258; }
.ikb .shell-labels span { width: 110px; text-align: center; line-height: 1; }
.ikb .tomorrow-ic { width: 52px; height: 52px; flex: none; }
.ikb .cal td .pearl-mark { position: absolute; right: -5px; top: -7px; width: 22px; height: 22px; }
.ikb .pearl-line { display: flex; align-items: center; justify-content: center; gap: 6px; }
.ikb .pearl-line img { width: 26px; height: 26px; }
@media (max-width: 600px), (max-height: 500px) {
  .ikb .rb-row b { font-size: 26px; } .ikb .rb-row span { font-size: 20px; }
  .ikb .hud .strip { padding: 0 6px; gap: 6px; }
  .ikb .shell-labels span { width: 92px; font-size: 15px; }
}
`;

/** The screens' style sheet for the active art set (src/art/style.ts). */
export const CSS = (ART_STYLE === 'ink' ? CSS_INK : CSS_PAINT) + CSS_VARIETY;
