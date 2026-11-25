/** The surveyor's desk: menu, city cards, year stamps, buy wall, turn cover, Esc menu. */
export const SCREENS_CSS = `
.ikr .screen{position:absolute;inset:0;z-index:12;overflow:auto;touch-action:pan-y;
  background:var(--tex-leather,#2e3b37) 0 0/384px;color:var(--ink)}
.ikr .screen::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:0;
  background:linear-gradient(90deg,transparent 49.4%,rgba(255,255,255,.5) 50%,transparent 50.6%) 0 0/48px 48px,linear-gradient(0deg,transparent 49.4%,rgba(255,255,255,.5) 50%,transparent 50.6%) 0 0/48px 48px}
.ikr .menu{min-height:100%;display:flex;align-items:center;justify-content:flex-start;padding:20px 20px 20px 4vw;position:relative;background:var(--menu-art) center/cover no-repeat}
.ikr .menu .sheet{width:min(400px,100%);padding:46px 34px 26px;display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center}
.ikr .menu .logo{position:relative;font:900 76px/1 var(--serif);letter-spacing:.01em;padding:0 12px 18px;margin-top:8px}
.ikr .menu .logo span{color:var(--teal)}
.ikr .menu .logo::after{content:'';position:absolute;left:-8px;right:-8px;bottom:2px;height:13px;border-radius:7px;border:2px solid var(--ink);
  background:repeating-linear-gradient(90deg,var(--gold) 0 16px,transparent 16px 30px) center/100% 3px no-repeat,#4a4854;transform:rotate(-1.2deg);box-shadow:0 2px 0 rgba(42,40,50,.35)}
.ikr .menu .tag{font:700 24px/1 var(--hand);color:var(--ink2)}
.ikr .menu .art{width:100%;height:150px;border:2px solid var(--ink);border-radius:6px;object-fit:cover;object-position:75% 50%}
.ikr .menu .btns{display:flex;flex-direction:column;gap:10px;width:min(300px,100%)}
.ikr .menu .btns .row{justify-content:center}
.ikr .menu .plate-line{display:flex;gap:10px;align-items:center;font-size:var(--fs-s);font-weight:600}
.ikr .deskhead{display:flex;justify-content:space-between;align-items:center;padding:14px 18px 0;position:relative}
.ikr .deskhead h2{color:#f6eedb;font-size:30px}
.ikr .deskhead .sub{font:700 22px/1 var(--hand);color:#d8c9a4}
.ikr .cities{display:flex;gap:18px;padding:22px 24px 30px;position:relative;align-items:flex-start;flex-wrap:wrap;justify-content:center}
.ikr .citycard{width:min(420px,100%);padding:16px 16px 14px;display:flex;flex-direction:column;gap:10px}
.ikr .citycard:nth-child(odd){transform:rotate(-.5deg)}
.ikr .citycard:nth-child(even){transform:rotate(.4deg)}
.ikr .citycard .cimg{width:100%;height:120px;border:2px solid var(--ink);border-radius:4px;object-fit:cover}
.ikr .citycard.locked .cimg{filter:grayscale(.7) brightness(.9)}
.ikr .citycard h2{font-size:23px}
.ikr .citycard .blurb{font-size:var(--fs-s);color:var(--ink2);line-height:1.25}
.ikr .citycard .badge{font-size:14px;padding:4px 8px;flex:none}
.ikr .yrow{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}
.ikr .ystamp{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:48px;padding:3px 0;border:2px solid var(--ink);border-radius:6px;background:#fffaf0;cursor:pointer;font-weight:800;font-size:15px}
.ikr .ystamp:disabled{opacity:.4;cursor:default}
.ikr .ystamp.now{background:linear-gradient(#e9f3f1,#c4e0dd);border-color:var(--teal)}
.ikr .ystamp .pips{display:flex;gap:2px}
.ikr .ystamp .pips i{width:7px;height:7px;border-radius:50%;border:1.5px solid var(--ink);background:transparent}
.ikr .ystamp .pips i.on{background:var(--teal)}
.ikr .wall{padding:22px 26px;max-width:480px;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center}
.ikr .cover{position:absolute;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:var(--tex-leather,#2e3b37) 0 0/384px;color:#f6eedb;text-align:center;flex-direction:column;gap:14px;padding:30px}
.ikr .cover.on{display:flex}
.ikr .cover .rot{width:64px;height:100px;border:5px solid #f6eedb;border-radius:12px;animation:ikr-turn 2.4s ease-in-out infinite}
@keyframes ikr-turn{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
.ikr .cover p{font:700 30px/1.1 var(--hand)}
.ikr .esc{padding:22px 26px;width:min(380px,100%);gap:10px}
`;

