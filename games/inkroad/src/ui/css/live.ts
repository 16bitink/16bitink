/** What lives on the map: jam tags, drivers' bubbles, the fall of night, the loading sheet. */
export const LIVE_CSS = `
.ikr .live{position:absolute;inset:0;overflow:hidden;pointer-events:none!important;z-index:0}
.ikr .jamtag{position:absolute;left:0;top:0;width:0;height:0;transition:opacity .4s}
.ikr .jamtag.far{display:none}
.ikr .jamtag.quiet{opacity:0}
.ikr .jamtag>button{position:absolute;left:-4px;bottom:0;pointer-events:auto;cursor:pointer;border:0;background:none;padding:0 0 13px;min-width:52px;min-height:48px;display:flex;align-items:flex-end;transform-origin:8px 100%;
  animation:ikr-tagin .34s cubic-bezier(.2,1.5,.4,1) both;transition:scale .4s}
.ikr .jamtag .face{position:relative;display:flex;align-items:center;gap:5px;font:800 18px/1 var(--sans);font-variant-numeric:tabular-nums;white-space:nowrap;padding:8px 11px;color:var(--ink);border:2px solid var(--ink);border-radius:4px 7px 5px 7px;
  background:linear-gradient(170deg,#fffaf0,#f3e3c0);box-shadow:0 3px 8px rgba(40,26,20,.4);transform:rotate(-3deg)}
.ikr .jamtag .face::after{content:'';position:absolute;left:7px;bottom:-11px;width:0;height:0;border:5px solid transparent;border-top:11px solid var(--ink);border-bottom:0}
.ikr .jamtag[data-g=D] .face{background:linear-gradient(170deg,#fff0e4,#f6cfb6);color:#8d1f14;border-color:#8d1f14}
.ikr .jamtag[data-g=D] .face::after{border-top-color:#8d1f14}
.ikr .jamtag[data-g=E]>button{scale:1.16}
.ikr .jamtag[data-g=F]>button{scale:1.32}
.ikr .jamtag[data-g=E] .face,.ikr .jamtag[data-g=F] .face{color:#fff;background:linear-gradient(170deg,#dd5140,#b12a1d);border-color:#5f130b;text-shadow:0 1px 0 rgba(60,8,4,.5);animation:ikr-tagpulse 1.1s ease-in-out infinite}
.ikr .jamtag[data-g=E] .face::after,.ikr .jamtag[data-g=F] .face::after{border-top-color:#5f130b}
.ikr .jamtag[data-g=F] .face{animation:ikr-tagpulse .8s ease-in-out infinite,ikr-tagshake 1.6s linear infinite}
.ikr .jamtag.done .face{color:#fff;background:linear-gradient(170deg,#5fb06a,#357d47);border-color:#1d4a2a;animation:ikr-tagflip .5s ease-out both;text-shadow:0 1px 0 rgba(10,40,16,.5)}
.ikr .jamtag.done .face::after{border-top-color:#1d4a2a}
.ikr .jamtag.done>button{animation:ikr-tagout .5s 1.7s ease-in both;scale:1.16}
.ikr .jamtag .face svg{width:18px;height:15px;fill:none;stroke:#fff;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
@keyframes ikr-tagin{0%{transform:scale(.2) rotate(14deg);opacity:0}100%{transform:none;opacity:1}}
@keyframes ikr-tagout{100%{transform:translateY(-34px) scale(.8);opacity:0}}
@keyframes ikr-tagpulse{0%,100%{box-shadow:0 3px 8px rgba(40,26,20,.4),0 0 0 0 rgba(214,52,38,.65)}50%{box-shadow:0 3px 8px rgba(40,26,20,.4),0 0 0 9px rgba(214,52,38,0)}}
@keyframes ikr-tagshake{0%,70%,100%{transform:rotate(-3deg)}74%,82%,90%{transform:rotate(-9deg)}78%,86%,94%{transform:rotate(4deg)}}
@keyframes ikr-tagflip{0%{transform:perspective(300px) rotateY(-180deg) scale(1.2)}60%{transform:perspective(300px) rotateY(20deg) scale(1.25)}100%{transform:rotate(-3deg)}}

.ikr .carbubble{position:absolute;left:0;top:0;display:flex;gap:9px;align-items:center;max-width:290px;padding:7px 14px 8px 8px;background:#fffaf0;border:2px solid var(--ink);border-radius:16px 14px 17px 13px;box-shadow:0 3px 0 rgba(42,40,50,.85),0 8px 16px -6px rgba(20,22,26,.4)}
.ikr .carbubble::after{content:'';position:absolute;left:calc(50% + var(--tail,0px) - 7px);bottom:-11px;width:15px;height:13px;background:#fffaf0;border:solid var(--ink);border-width:0 2px 2px 0;transform:skewX(22deg) rotate(38deg);clip-path:polygon(100% 0,100% 100%,0 100%)}
.ikr .carbubble.below::after{bottom:auto;top:-9px;transform:rotate(225deg)}
.ikr .carbubble.in{animation:ikr-bub .26s cubic-bezier(.2,1.5,.4,1)}
.ikr .carbubble .pic{width:46px;height:46px;flex:none;border-radius:50%}
.ikr .carbubble small{display:block;font:700 14px/1.1 var(--sans);color:var(--ink2)}
.ikr .carbubble p{font:700 21px/1.02 var(--hand)}
@keyframes ikr-bub{0%{opacity:0;scale:.6}100%{opacity:1;scale:1}}
.ikr.carding .live{display:none}

.ikr .dusk{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0;transition:opacity 1.1s ease-in-out;display:grid;place-items:center;
  background:radial-gradient(120% 90% at 50% 45%,rgba(24,30,66,.38),rgba(12,14,38,.9))}
.ikr .dusk.on{opacity:1}
.ikr .dusk .say{display:flex;flex-direction:column;align-items:center;gap:12px;opacity:0;transform:translateY(16px);transition:opacity .6s .45s,transform .8s .45s}
.ikr .dusk.on .say{opacity:1;transform:none}
.ikr .dusk .moon{width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 62% 38%,#fff9e6,#efdca6 70%);box-shadow:0 0 0 2px rgba(42,40,50,.7),0 0 46px 14px rgba(255,236,180,.4)}
.ikr .dusk b{font:700 44px/1 var(--hand);color:#fff5da;text-shadow:0 2px 10px rgba(0,0,0,.6)}

.ikr .loading{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:#33423d;background-image:var(--tex-leather);background-size:320px;transition:opacity .45s}
.ikr .loading.off{opacity:0;pointer-events:none}
.ikr .loading .sheet{width:min(440px,78vw);padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px;align-items:center;transform:rotate(-1.2deg)}
.ikr .loading .sheet>.pic{width:100%;height:min(210px,40vh);object-fit:cover;border:2px solid var(--ink);border-radius:4px}
.ikr .loading b{font:700 28px/1 var(--hand)}
.ikr .loading .lane{position:relative;width:100%;height:26px;border-radius:5px;border:2px solid var(--ink);background:#85838a;overflow:hidden}
.ikr .loading .lane::before{content:'';position:absolute;left:0;right:0;top:10px;height:3px;background:repeating-linear-gradient(90deg,#f2ecdf 0 14px,transparent 14px 26px)}
.ikr .loading .lane i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--f,0)*100%);background:rgba(44,122,128,.55);transition:width .25s}
.ikr .loading .lane img{position:absolute;top:3px;left:calc(var(--f,0)*(100% - 40px));width:36px;height:17px;transition:left .25s}
.ikr.phone .loading .sheet{padding:10px 14px 12px;gap:8px}
.ikr.phone .loading .sheet>.pic{height:44vh}
.ikr.phone .carbubble{max-width:250px}
.ikr.phone .dusk b{font-size:34px}
`;
