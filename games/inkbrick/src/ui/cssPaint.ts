/**
 * The first (watercolour) look of InkBrick's screens and HUD, kept for ?art=paint and rollback: paper panels with an inked edge and a
 * watercolour wash, Caveat (the site serves it) for every word. Scoped
 * under .ikb so nothing leaks into the site's page. Phones get bigger text.
 */
export const CSS_PAINT = `
.ikb { position: absolute; inset: 0; overflow: hidden; background: #1d3a44; color: #2a1d10; touch-action: none; user-select: none; -webkit-user-select: none;
  font: 600 22px/1.2 Caveat, "Patrick Hand", "Comic Sans MS", cursive; --paper: #f6ecd4; --ink: #2a1d10; --sea: #2f6f78; --gold: #e8a830; --dim: #7a6850; --coral: #e0603c; --leaf: #4a8a4a; }
.ikb * { box-sizing: border-box; }
.ikb [hidden] { display: none !important; }
.ikb .stage, .ikb .stage canvas { position: absolute; inset: 0; display: block; }
.ikb .screen { position: absolute; inset: 0; z-index: 4; display: flex; align-items: center; justify-content: center; padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
.ikb .screen.card { z-index: 6; background: rgba(20, 28, 30, 0.55); }
.ikb .screen.sea { background: radial-gradient(ellipse at 50% 30%, #6fb0b0 0%, #2f6f78 55%, #1d3a44 100%); }
.ikb h1, .ikb h2, .ikb h3, .ikb p { margin: 0; font-weight: 700; }
.ikb .t64 { font-size: 64px; line-height: 0.95; } .ikb .t44 { font-size: 44px; line-height: 1; } .ikb .t32 { font-size: 32px; line-height: 1.05; } .ikb .t18 { font-size: 18px; }
.ikb .dim { color: var(--dim); } .ikb .gold { color: #b87810; } .ikb .coral { color: var(--coral); } .ikb .light { color: #fff6dc; text-shadow: 0 2px 0 rgba(0,0,0,0.35); }
.ikb .panel { position: relative; background: var(--paper); border: 3px solid var(--ink); border-radius: 18px 14px 20px 12px / 14px 20px 12px 18px; padding: 18px 22px;
  box-shadow: inset 0 0 40px rgba(180, 140, 80, 0.35), 0 6px 0 rgba(0,0,0,0.25); max-width: min(560px, 96vw); max-height: 96%; overflow: auto; }
.ikb .tz { width: 62px; height: 100px; flex: none; } .ikb .tz > * { display: block; width: 100%; height: 100%; box-sizing: border-box; }
.ikb .row { display: flex; align-items: center; gap: 10px; } .ikb .col { display: flex; flex-direction: column; gap: 10px; }
.ikb .wrap { flex-wrap: wrap; } .ikb .center { justify-content: center; text-align: center; align-items: center; } .ikb .spread { justify-content: space-between; }
.ikb .btn { font: inherit; font-size: 28px; color: var(--ink); background: #f0d79a; border: 3px solid var(--ink); border-radius: 14px 10px 16px 9px; padding: 6px 20px 8px; min-height: 52px; cursor: pointer;
  box-shadow: 0 4px 0 var(--ink); white-space: nowrap; }
.ikb .btn:hover { filter: brightness(1.06); } .ikb .btn:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.ikb .btn.go { background: #8cc87a; } .ikb .btn.gold { background: #f2b840; } .ikb .btn.sea { background: #8ad0d8; } .ikb .btn.small { font-size: 22px; min-height: 40px; padding: 2px 12px 4px; }
.ikb .btn[disabled] { filter: grayscale(0.8) opacity(0.6); cursor: default; transform: none; }
.ikb .shell { display: inline-block; width: 26px; height: 22px; margin: 0 3px; background: #d8c8a8; border: 2px solid var(--ink); border-radius: 50% 50% 40% 40% / 70% 70% 30% 30%; vertical-align: -3px; }
.ikb img.shell.art, .ikb img.heart.art { background: none; border: 0; border-radius: 0; clip-path: none; object-fit: contain; width: 26px; height: 30px; }
.ikb img.heart.art { width: 30px; height: 27px; }
.ikb .shell.on { background: radial-gradient(circle at 50% 80%, #fff0d8, #f0a0b0); }
.ikb .shell.pop { animation: ikb-pop 0.6s cubic-bezier(.2,1.6,.4,1) both; }
@keyframes ikb-pop { from { transform: scale(0.1) rotate(-30deg); } to { transform: scale(1) rotate(0); } }
.ikb .heart { display: inline-block; width: 28px; height: 26px; margin: 0 2px; background: #e0603c; border: 2px solid var(--ink); clip-path: path('M14 25 C 2 16 0 10 0 7 C 0 2 4 0 7 0 C 10 0 13 2 14 5 C 15 2 18 0 21 0 C 24 0 28 2 28 7 C 28 10 26 16 14 25 Z'); }
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
.ikb .hud .side { position: absolute; top: 0; bottom: 0; display: flex; flex-direction: column; gap: 16px; justify-content: center; padding: 20px; color: #fff6dc; text-shadow: 0 2px 0 #1a1208; }
.ikb .hud .side .panel { color: var(--ink); text-shadow: none; padding: 12px 16px; }
.ikb .hud .strip { position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; gap: 8px; color: #fff6dc; text-shadow: 0 2px 0 #1a1208; font-size: 28px; }
.ikb .hud button { pointer-events: auto; }
.ikb .hud [data-k="hearts"] { display: flex; flex-shrink: 0; align-items: center; }
.ikb .hud .strip img.heart.art { width: 26px; height: 24px; }
.ikb .hud .bar { height: 14px; border: 2px solid var(--ink); border-radius: 8px; background: #d8c8a8; overflow: hidden; min-width: 90px; }
.ikb .hud .bar i { display: block; height: 100%; background: linear-gradient(90deg, #f0a0b0, #f6dc9a); }
.ikb .hud .beat { color: #ffe680; }
.ikb .hint { position: absolute; left: 50%; transform: translateX(-50%); z-index: 3; color: #fff6dc; text-shadow: 0 2px 0 #1a1208; font-size: 30px; pointer-events: none; text-align: center; white-space: nowrap; }
/* The calendar */
.ikb .cal { border-collapse: separate; border-spacing: 4px; margin: 0 auto; }
.ikb .cal th { font-size: 18px; color: var(--dim); }
.ikb .cal td { width: 44px; height: 40px; text-align: center; border-radius: 10px; font-size: 20px; position: relative; }
.ikb .cal td.day { background: #ece0c4; } .ikb .cal td.future { opacity: 0.4; }
.ikb .cal td.played { background: #f2b840; border: 2px solid var(--ink); }
.ikb .cal td.late { background: #ece0c4; border: 3px dashed #b87810; }
.ikb .cal td.today { box-shadow: 0 0 0 3px var(--coral); }
.ikb .cal td.pick { cursor: pointer; } .ikb .cal td.pick:hover { filter: brightness(0.92); }
/* The wardrobe */
.ikb .looks { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.ikb .look { font: inherit; font-size: 20px; border: 3px solid var(--ink); border-radius: 12px; background: #ece0c4; padding: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ikb .look.on { background: #f2b840; } .ikb .look[disabled] { opacity: 0.5; cursor: default; }
.ikb .look .pic { width: 90px; height: 30px; border-radius: 10px; border: 2px solid var(--ink); background-size: contain; background-repeat: no-repeat; background-position: center; }
.ikb .boot-bar { width: 260px; height: 16px; border: 3px solid var(--ink); border-radius: 10px; overflow: hidden; background: #d8c8a8; }
.ikb .boot-bar i { display: block; height: 100%; width: 0; background: #8cc87a; transition: width 0.2s; }
@media (max-width: 600px), (max-height: 500px) {
  .ikb { font-size: 26px; }
  .ikb .btn { font-size: 30px; min-height: 56px; }
  .ikb .panel { padding: 14px 16px; }
  .ikb .t64 { font-size: 52px; }
  .ikb .map .node { width: 50px; height: 50px; font-size: 24px; }
  .ikb .map .node .m { display: none; }
}
`;
