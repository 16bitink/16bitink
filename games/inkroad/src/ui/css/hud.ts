/** The in-play HUD: top bar, toolbar, overlays, tray, ticker, ghost bar, selection panel, coach. */
export const HUD_CSS = `
.ikr .hud{position:absolute;inset:0;pointer-events:none;z-index:5}
.ikr .hud>*{pointer-events:auto}
.ikr .bar{position:absolute;left:8px;right:8px;top:8px;height:64px;display:flex;align-items:center;gap:18px;padding:0 14px}
.ikr .money{display:flex;flex-direction:column;gap:2px;min-width:104px}
.ikr .money b{font:800 24px/1 var(--sans)}
.ikr .money small{font-size:var(--fs-s);font-weight:600}
.ikr .appr{display:flex;align-items:center;gap:12px;cursor:pointer;background:none;border:0;padding:0}
.ikr .dial{width:74px;height:46px;position:relative}
.ikr .dial svg{width:100%;height:100%;overflow:visible}
.ikr .dial b{position:absolute;left:0;right:0;bottom:-2px;text-align:center;font:800 19px/1 var(--sans)}
.ikr .dial .arc{fill:none;stroke-width:9;stroke-linecap:round}
.ikr .bars{display:grid;grid-template-columns:auto 46px 12px auto 46px 12px;gap:4px 6px;align-items:center;font-size:var(--fs-s);font-weight:600}
.ikr .meter{height:8px;border-radius:4px;background:rgba(42,40,50,.16);border:1px solid var(--ink);overflow:hidden}
.ikr .meter i{display:block;height:100%;background:var(--teal);width:var(--w,0%);transition:width .5s}
.ikr .meter.low i{background:var(--ochre)}
.ikr .tri{width:0;height:0;border:5px solid transparent;display:inline-block}
.ikr .tri.up{border-bottom:8px solid var(--teal);border-top:0}
.ikr .tri.down{border-top:8px solid var(--ochre);border-bottom:0}
.ikr .tri.same{width:9px;height:3px;border:0;background:var(--ink2);border-radius:2px}
.ikr .when{display:flex;align-items:center;gap:10px}
.ikr .when svg{width:44px;height:44px}
.ikr .when b{display:block;font:800 17px/1.1 var(--serif)}
.ikr .when small{font-size:var(--fs-s);color:var(--ink2);font-weight:600}
.ikr .speed{display:flex;gap:6px;margin-left:auto}
.ikr .speed .btn{min-width:44px;padding:0 8px;box-shadow:0 2px 0 var(--ink)}
.ikr .pauseglyph{display:inline-block;width:12px;height:14px;border-left:4px solid currentColor;border-right:4px solid currentColor}
.ikr .goalchip{display:flex;gap:10px;align-items:center;font-size:var(--fs);font-weight:600;line-height:1.15;padding-left:16px;border-left:2px dashed rgba(42,40,50,.28)}
.ikr .goalchip small{display:block;font:600 var(--fs-s)/1.2 var(--sans);color:var(--ink2)}
.ikr .goalchip b{font-weight:800;font-variant-numeric:tabular-nums}
.ikr .goalchip .tick{flex:none;width:30px;height:30px;border:2.5px solid var(--ink);border-radius:50%;display:grid;place-items:center;background:#fffaf0;transition:background .3s}
.ikr .goalchip .tick svg{width:18px;height:15px;fill:none;stroke:rgba(42,40,50,.2);stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.ikr .goalchip.met .tick{background:#4f9a5c;animation:ikr-tick .5s cubic-bezier(.2,1.6,.4,1)}
.ikr .goalchip.met .tick svg{stroke:#fff}
.ikr .goalchip.met b{color:#2f6b3a}
@keyframes ikr-tick{0%{transform:scale(.4) rotate(-40deg)}100%{transform:none}}

.ikr .tools{position:absolute;left:8px;top:82px;display:grid;grid-template-columns:repeat(var(--cols,3),76px);grid-auto-flow:row dense;gap:7px 6px;padding:10px 10px 10px}
.ikr .tgrp{display:flex;flex-direction:column;gap:7px;grid-column:span var(--n,1)}
.ikr .tgrp>.gname{font:700 17px/1 var(--hand);color:var(--ink2);padding-left:2px}
.ikr .tgrp>.gbtn{display:none}
.ikr .trow{display:grid;grid-template-columns:repeat(var(--n,1),76px);gap:8px 6px}
.ikr .tbtn{position:relative;width:76px;height:64px;padding:2px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 2px 0 var(--ink)}
.ikr .tl{font:700 14px/1 var(--sans);letter-spacing:-.02em;white-space:nowrap}
.ikr .tbtn .pic{width:34px;height:34px}
.ikr .tbtn.on{background:linear-gradient(#d3e8e6,#a3cdcb)}
.ikr .ribbon{position:absolute;top:-7px;right:-5px;background:var(--gold);border:1.5px solid var(--ink);border-radius:3px;font:900 14px/1 var(--sans);letter-spacing:.02em;padding:1px 4px;transform:rotate(6deg);z-index:1;pointer-events:none}
@media (max-height:800px){.ikr:not(.phone) .tbtn{height:54px}.ikr:not(.phone) .tbtn .pic{width:27px;height:27px}.ikr:not(.phone) .tools{gap:4px 6px;padding:7px 9px}.ikr:not(.phone) .tgrp{gap:5px}}
.ikr .ovs{position:absolute;right:8px;top:82px;display:flex;flex-direction:column;gap:6px;padding:8px}
.ikr .env{position:absolute;left:calc(var(--toolsw,180px) + 10px);top:82px;display:flex;gap:6px;padding:6px 10px;align-items:center}
.ikr .env .btn{width:44px;height:44px;padding:0;display:grid;place-items:center}
.ikr .env .btn .pic{width:30px;height:30px}
.ikr .env .slot{width:44px;height:44px;border:2px dashed rgba(42,40,50,.35);border-radius:8px}
.ikr .ticker{position:absolute;left:8px;bottom:10px;max-width:min(460px,46vw);display:flex;gap:10px;align-items:center;padding:8px 14px 8px 8px;cursor:pointer;text-align:left;min-height:52px}
.ikr .ticker .pic{width:36px;height:36px;flex:none;border-radius:6px}
.ikr .ticker p{font:700 20px/1.05 var(--hand)}
.ikr .ticker small{display:block;font:600 var(--fs-s)/1.2 var(--sans);color:var(--ink2)}
.ikr .ghostbar,.ikr .hintbar{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:14px;align-items:center;padding:10px 14px;max-width:min(680px,94vw)}
.ikr .ghostbar .info,.ikr .hintbar .info{display:flex;flex-direction:column;gap:2px;min-width:0}
.ikr .ghostbar b,.ikr .hintbar b{font:800 18px/1.1 var(--serif)}
.ikr .ghostbar .why{color:var(--ochre);font-weight:600;font-size:var(--fs-s)}
.ikr .kinds{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:8px;padding:8px 10px}
.ikr .sel{position:absolute;right:98px;top:82px;width:330px;max-height:calc(100% - 160px);overflow:auto;padding:14px 16px 16px;overscroll-behavior:contain;touch-action:pan-y}
.ikr .sel{display:flex;flex-direction:column;gap:8px}
.ikr .sel h2{font-size:21px;padding-right:34px}
.ikr .sel .x{position:absolute;right:8px;top:8px;width:36px;height:36px;min-height:36px;padding:0;font-size:20px;box-shadow:0 2px 0 var(--ink)}
.ikr .sel .kv{display:flex;justify-content:space-between;gap:10px;font-size:var(--fs)}
.ikr .sel .kv b{font-variant-numeric:tabular-nums}
.ikr .choices{display:flex;flex-direction:column;gap:9px}
.ikr .choice.btn{position:relative;display:flex;gap:10px;align-items:center;text-align:left;padding:7px 10px 8px 8px;min-height:60px}
.ikr .choice.btn:disabled{opacity:.72}
.ikr .choice.on.btn:disabled{opacity:1;background:linear-gradient(#e4efec,#cfe2df)}
.ikr .choice>svg{width:40px;height:40px;flex:none}
.ikr .ctext{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;font:500 var(--fs-s)/1.2 var(--sans)}
.ikr .cname{display:flex;justify-content:space-between;gap:8px;align-items:baseline;font-size:var(--fs)}
.ikr .cname b{font-weight:800}
.ikr .ctext em{font-style:normal;font-weight:700;color:var(--ink2);font-size:var(--fs-s)}
.ikr .eff{font-weight:800;display:flex;gap:5px;align-items:center}
.ikr .eff::before{content:'';width:0;height:0;border:5px solid transparent}
.ikr .eff.much,.ikr .eff.better{color:#2f6b3a}
.ikr .eff.much::before,.ikr .eff.better::before{border-bottom:8px solid #3f8f4f;border-top:0}
.ikr .eff.same{color:var(--ink2)}
.ikr .eff.same::before{border:0;width:9px;height:3px;border-radius:2px;background:var(--ink2)}
.ikr .eff.worse{color:var(--ochre)}
.ikr .eff.worse::before{border-top:8px solid var(--ochre);border-bottom:0}
.ikr .choice.pick{outline:3px solid var(--gold);outline-offset:1px;background:linear-gradient(#fff8e2,#f6e2ac);animation:ikr-glow 1s ease-in-out infinite alternate}
.ikr .choice.pick.btn{padding-top:15px;margin-top:8px}
.ikr .choice .ribbon{top:-13px;right:8px;transform:rotate(-2deg);font-weight:800;padding:2px 7px}
.ikr .status{font-size:var(--fs);color:var(--ink2)}
.ikr .status b{color:var(--ink)}
.ikr .status.gD b,.ikr .status.gE b,.ikr .status.gF b{color:var(--red)}
.ikr .status.gA b,.ikr .status.gB b{color:#2f6b3a}
.ikr .grade{display:inline-grid;place-items:center;width:30px;height:30px;border:2px solid var(--ink);border-radius:50%;font:800 16px/1 var(--serif);background:#cfe5e3}
.ikr .grade.D,.ikr .grade.E,.ikr .grade.F{background:#f1c9c0;border-color:var(--red);color:var(--red)}
.ikr .grade.C{background:#f3e2b8}
.ikr .split{display:grid;grid-template-columns:1fr auto;gap:0 8px;align-items:center;font-size:var(--fs-s)}
.ikr .split input{grid-column:1/-1}
.ikr input[type=range]{-webkit-appearance:none;appearance:none;height:44px;background:transparent;width:100%;margin:0}
.ikr input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:var(--paper2);border:1.5px solid var(--ink)}
.ikr input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-10px;border-radius:50%;background:var(--gold);border:2px solid var(--ink);box-shadow:0 2px 0 var(--ink)}
.ikr input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:var(--paper2);border:1.5px solid var(--ink)}
.ikr input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--gold);border:2px solid var(--ink)}
.ikr .flowbar{display:flex;height:14px;border:1.5px solid var(--ink);border-radius:4px;overflow:hidden}
.ikr .flowbar i{display:block;background:var(--teal)}
.ikr .flowbar i:nth-child(2n){background:var(--teal2)}
.ikr .flowbar i:nth-child(3n){background:var(--sand)}
.ikr .sel .toggles{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ikr .bubble{display:flex;gap:10px;align-items:flex-start}
.ikr .bubble .pic{width:56px;height:56px;flex:none;border-radius:8px}
.ikr .bubble p{font:700 22px/1.05 var(--hand)}

.ikr .pointer{position:absolute;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;border:4px solid var(--gold);box-shadow:0 0 0 4px rgba(200,150,42,.3);pointer-events:none;animation:ikr-ping 1.2s ease-out infinite;z-index:7}
@keyframes ikr-ping{0%{transform:scale(.7);opacity:1}100%{transform:scale(1.5);opacity:0}}
.ikr .tbtn.hint,.ikr .gbtn.hint{animation:ikr-glow 1s ease-in-out infinite alternate}
@keyframes ikr-glow{to{box-shadow:0 0 0 5px rgba(200,150,42,.65),0 2px 0 var(--ink)}}
.ikr .toast{display:flex;align-items:center;gap:10px;position:absolute;left:50%;top:84px;transform:translateX(-50%);padding:8px 16px;font:700 20px/1.1 var(--hand);z-index:9;pointer-events:none;animation:ikr-toast 3.4s both}
.ikr .toast .pic{width:40px;height:40px;border-radius:50%}
@keyframes ikr-toast{0%{opacity:0;transform:translate(-50%,-10px)}10%,85%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
.ikr .pop .kv{display:flex;justify-content:space-between;gap:12px}
.ikr .pop{position:absolute;left:8px;top:76px;width:300px;padding:14px;z-index:6}

.ikr .iconbtn.lab{width:72px;height:64px;flex-direction:column;gap:2px;display:flex;align-items:center;justify-content:center;padding-top:2px}
.ikr .iconbtn.lab .pic{width:34px;height:34px}
.ikr .hasghost .ticker,.ikr.carding .sel,.ikr.carding .ticker,.ikr.carding .ghostbar,.ikr.carding .hintbar,.ikr.carding .kinds{display:none}
.ikr .projects{position:absolute;left:calc(var(--toolsw,180px) + 260px);top:82px;display:flex;gap:6px;flex-wrap:wrap;max-width:46vw}
.ikr .projects .chip{cursor:pointer;background:var(--paper);min-height:34px;padding:2px 12px 2px 4px}
.ikr .projects .chip b{font-weight:800}
.ikr .hint-row{outline:3px solid var(--gold);animation:ikr-glow 1s ease-in-out infinite alternate}
.ikr .flyhint{display:flex;flex-direction:column;gap:6px;border:2px solid var(--ink);border-radius:8px;padding:8px 10px;background:#fffaf0}
`;
