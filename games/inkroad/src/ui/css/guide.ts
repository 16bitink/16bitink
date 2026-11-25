/** The guide: the speech box, rings, the hand, the advisor. */
export const GUIDE_CSS = `
.ikr .guide{position:absolute;inset:0;z-index:26;pointer-events:none;overflow:hidden}
.ikr .gsvg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.ikr .gback{fill:none;stroke:rgba(42,40,50,.75);stroke-width:11;stroke-linecap:round;stroke-linejoin:round}
.ikr .gdash{fill:none;stroke:#ffd76a;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 15;animation:ikr-dash .7s linear infinite}
@keyframes ikr-dash{to{stroke-dashoffset:-18}}
.ikr .gback.old{stroke-width:9;stroke:rgba(42,40,50,.55)}
.ikr .gdash.old{stroke:#fff;stroke-width:4;animation-direction:normal;stroke-dasharray:10 12;animation-duration:1.6s}
.ikr .glabel.old{background:#f2ece0}
.ikr .glabel{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;font:800 16px/1 var(--sans);color:var(--ink);background:#ffe9a8;border:2px solid var(--ink);border-radius:6px;padding:6px 10px;box-shadow:0 2px 0 var(--ink)}
.ikr .gring{position:absolute;display:block;border:5px solid #ffcf4a;border-radius:50%;box-shadow:0 0 0 3px rgba(42,40,50,.85),0 0 22px 6px rgba(255,200,60,.75);animation:ikr-gring 1.1s ease-in-out infinite alternate}
.ikr .gring.box{border-radius:12px;border-width:4px}
.ikr .gring.small{border-width:4px}
.ikr .gring.soft{border-style:dashed;border-width:3px;box-shadow:0 0 0 2px rgba(42,40,50,.5);animation:none}
.ikr .gring.hole{border:0;box-shadow:none;animation:none}
.ikr .grings.dim .gring.hole{box-shadow:0 0 60px 30px rgba(22,24,38,.2) inset,0 0 0 200vmax rgba(22,24,38,.4)}
.ikr .grings.dim:not(:has(.hole)) .gring:not(.soft):last-child{animation-name:ikr-gring2;box-shadow:0 0 0 3px rgba(42,40,50,.85),0 0 22px 6px rgba(255,200,60,.75),0 0 0 200vmax rgba(22,24,38,.36)}
@keyframes ikr-gring{from{scale:1}to{scale:1.07}}
@keyframes ikr-gring2{from{border-color:#ffcf4a}to{border-color:#fff3c4}}
.ikr .ghand{position:absolute;left:0;top:0;width:44px;height:56px;filter:drop-shadow(0 4px 4px rgba(0,0,0,.4))}
.ikr .ghand svg{width:100%;height:100%;display:block;transform-origin:16px 4px}
.ikr .ghand.tap svg{animation:ikr-ghand 1.1s ease-in-out infinite}
@keyframes ikr-ghand{0%,100%{transform:translate(10px,14px)}45%,60%{transform:translate(0,0) scale(.92)}}

.ikr .gbox{position:absolute;pointer-events:auto;width:min(600px,calc(100% - 16px));display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:12px 16px 12px 12px;animation:ikr-gbox .3s cubic-bezier(.2,1.4,.4,1)}
@keyframes ikr-gbox{from{opacity:0;transform:translateY(14px) scale(.96)}}
.ikr .gbox>.pic{width:74px;height:74px;border-radius:10px;border:2px solid var(--ink);background:var(--paper2)}
.ikr .gtext{display:flex;flex-direction:column;gap:5px;min-width:0}
.ikr .gwhy{font:600 16px/1.25 var(--sans);color:var(--ink2)}
.ikr .gsay{font:700 26px/1.02 var(--hand);color:var(--ink)}
.ikr .gbtns{display:flex;flex-direction:column;gap:4px;align-items:stretch}
.ikr .gbtns .btn{min-width:96px;min-height:48px}
.ikr .gskip{background:none;border:0;cursor:pointer;font:600 14px/1 var(--sans);color:var(--ink2);text-decoration:underline;min-height:44px;min-width:44px;padding:0 6px}
.ikr .gbul{list-style:none;margin:2px 0 0;padding:0;display:grid;grid-template-columns:1fr;gap:3px}
.ikr .gbul li{display:flex;gap:8px;align-items:center;font:600 16px/1.2 var(--sans)}
.ikr .gbul .pic{width:26px;height:26px}
.ikr .gstop{position:absolute;left:14px;top:-15px;display:flex;gap:7px;align-items:center;font:700 14px/1 var(--sans);background:var(--ink);color:#fff;border-radius:13px;padding:6px 12px}
.ikr .gstop .pauseglyph{width:8px;height:11px;border-width:0 3px}
.ikr .gbox.reward{background:linear-gradient(170deg,#eef8e6,#cfe8c5);border-color:#2f6b3a}
.ikr .gbox.reward .gsay{color:#205a2c}
.ikr .gtick{position:absolute;left:58px;top:58px;width:34px;height:34px;padding:7px 6px;border-radius:50%;background:#4f9a5c;border:2.5px solid #1d4a2a;fill:none;stroke:#fff;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;z-index:1;animation:ikr-tick .5s cubic-bezier(.2,1.6,.4,1)}
.ikr .gh-approval .appr,.ikr.gh-approval .appr,.ikr.gh-goal .goalchip,.ikr.gh-speed [data-k=sp2],.ikr.gh-speed [data-k=sp4],.ikr.gh-ovs .ovs,.ikr.gh-ticker .ticker,.ikr.gh-advisor .advbtn,.ikr.gh-forecast .money small{display:none}
.ikr.guiding .ticker,.ikr.gheld .carbubble{display:none}

.ikr .goalchip{cursor:pointer}
.ikr .advbtn{position:absolute;right:8px;bottom:10px;display:flex;align-items:center;gap:8px;padding:4px 14px 4px 4px;min-height:60px;border-radius:32px;cursor:pointer;font:700 24px/1 var(--hand);color:var(--ink)}
.ikr .advbtn .pic{width:52px;height:52px;border-radius:50%;border:2px solid var(--ink);background:var(--paper2)}
.ikr .advbtn .n{position:absolute;left:40px;top:-6px;min-width:24px;height:24px;border-radius:12px;border:2px solid var(--ink);background:var(--red);color:#fff;font:800 14px/20px var(--sans);text-align:center;padding:0 5px}
.ikr .advbtn .n.ok{background:#4f9a5c}
.ikr .advbtn.wiggle{animation:ikr-wig 1.2s ease-in-out infinite}
@keyframes ikr-wig{0%,60%,100%{rotate:0deg}66%,78%,90%{rotate:-5deg}72%,84%{rotate:5deg}}
.ikr.carding .advbtn{display:none}
.ikr .adv{position:absolute;right:98px;bottom:80px;width:400px;max-height:calc(100% - 170px);overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;z-index:8;overscroll-behavior:contain;touch-action:pan-y}
.ikr .adv h2{font-size:22px;padding-right:44px}
.ikr .adv .x{position:absolute;right:8px;top:8px;width:40px;height:40px;min-height:40px;padding:0}
.ikr .adv .prob{border:2px solid var(--ink);border-radius:8px;background:#fffaf0;padding:9px 11px;display:flex;flex-direction:column;gap:6px}
.ikr .adv .prob.red{border-color:var(--red)}
.ikr .adv .ph{display:flex;gap:10px;align-items:center}
.ikr .adv .ph .pic{width:34px;height:34px;flex:none}
.ikr .adv .ph b{display:block;font:800 16px/1.15 var(--sans)}
.ikr .adv .ph p{font:500 16px/1.2 var(--sans);color:var(--ink2)}
.ikr .adv .ph .btn{margin-left:auto;flex:none;min-height:44px}
.ikr .adv .ans{display:flex;flex-direction:column;gap:6px}
.ikr .adv .ans .btn{display:flex;justify-content:space-between;gap:10px;align-items:center;text-align:left;padding:4px 12px;min-height:44px;box-shadow:0 2px 0 var(--ink)}
.ikr .adv .ans .btn em{font-style:normal;font-weight:600;font-size:14px;color:var(--ink2)}
.ikr .adv li{font:500 16px/1.3 var(--sans);margin-left:18px}
.ikr .adv ul{margin:0;padding:0}

.ikr .brief{display:flex;flex-direction:column;gap:12px}
.ikr .brief .bl{display:grid;grid-template-columns:52px 1fr;gap:14px;align-items:center}
.ikr .brief .bl .pic,.ikr .brief .bl svg{width:48px;height:48px}
.ikr .brief small{display:block;font:800 14px/1.1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);margin-bottom:2px}
.ikr .brief p{font:700 20px/1.2 var(--sans)}
.ikr .card.start{width:min(620px,100%)}
.ikr .brief .pic.round{border-radius:10px;border:2px solid var(--ink);object-fit:cover}
.ikr .goalpop .btn{margin-top:4px}

.ikr.phone .gbox{width:min(440px,56vw);gap:9px;padding:7px 10px 7px 7px}
.ikr.phone .gbox>.pic{width:52px;height:52px}
.ikr.phone .gwhy{font-size:16px;line-height:1.15}
.ikr.phone .gsay{font-size:22px}
.ikr.phone .gbtns .btn{min-width:72px;padding:0 10px;min-height:44px}
.ikr.phone .gtick{left:36px;top:40px;width:28px;height:28px}
.ikr.phone .glabel{font-size:14px;padding:5px 8px}
.ikr.phone .advbtn{right:6px;bottom:6px;min-height:52px;padding:2px;border-radius:50%}
.ikr.phone .advbtn .t{display:none}
.ikr.phone .advbtn .pic{width:48px;height:48px}
.ikr.phone .adv{right:64px;bottom:6px;top:64px;max-height:none;width:min(400px,56vw);padding:10px 12px;gap:8px}
.ikr.phone .adv .x{width:44px;height:44px;min-height:44px}
.ikr.phone .brief p{font-size:18px}
.ikr.phone .brief{gap:8px}
.ikr.phone .brief .bl{grid-template-columns:42px 1fr}
.ikr.phone .brief .bl .pic,.ikr.phone .brief .bl svg{width:40px;height:40px}
`;
