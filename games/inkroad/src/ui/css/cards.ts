/** Cards: year start, review, year end, letters, replaced, done. */
export const CARDS_CSS = `
.ikr .cards{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:26px 12px 12px;background:rgba(30,36,34,.5);animation:ikr-fade .2s both}
@keyframes ikr-fade{from{opacity:0}}
.ikr .card{position:relative;width:min(760px,100%);max-height:100%;overflow:hidden;padding:34px 28px 22px;display:flex;flex-direction:column;gap:14px;animation:ikr-rise .28s cubic-bezier(.2,1.1,.4,1) both;touch-action:pan-y;overscroll-behavior:contain}
@keyframes ikr-rise{from{transform:translateY(24px) rotate(.6deg);opacity:0}}
.ikr .endimg{width:100%;height:150px;object-fit:cover;border:2px solid var(--ink);border-radius:4px}
.ikr .cbody{overflow:auto;display:flex;flex-direction:column;gap:14px;min-height:0;flex:1 1 auto;padding:4px 2px;overscroll-behavior:contain;touch-action:pan-y}
.ikr .card .head,.ikr .card .foot{flex:none}
.ikr .card.still{animation:none}
.ikr .card .head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.ikr .card .head .sub{font:700 22px/1 var(--hand);color:var(--ink2);margin-top:4px}
.ikr .card .foot{display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:2px}
.ikr .card.peek{align-self:flex-end;max-height:none;width:min(560px,100%);padding:10px 14px}
.ikr .cards.peeking{background:transparent;align-items:flex-end;pointer-events:none}
.ikr .cards.peeking .card{pointer-events:auto}
.ikr .cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.ikr .sec{display:flex;flex-direction:column;gap:8px}
.ikr .speakers{display:flex;flex-direction:column;gap:12px}
.ikr .speaker{display:flex;gap:12px;align-items:flex-start}
.ikr .speaker .pic{width:76px;height:76px;flex:none;border-radius:10px;border:2px solid var(--ink);background:var(--paper2)}
.ikr .speaker.again{margin-top:-6px}
.ikr .speaker.again .pic{border:0;background:none}
.ikr .speech{position:relative;background:#fffaf0;border:2px solid var(--ink);border-radius:12px;padding:8px 12px;font:700 22px/1.05 var(--hand)}
.ikr .speech::before{content:'';position:absolute;left:-9px;top:20px;width:14px;height:14px;background:#fffaf0;border-left:2px solid var(--ink);border-bottom:2px solid var(--ink);transform:rotate(45deg)}
.ikr .speech small{display:block;font:800 14px/1.1 var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--ink2);margin-bottom:3px}
.ikr .plan li,.ikr .tips li{margin-left:18px;font-size:var(--fs)}
.ikr .plan,.ikr .tips{margin:0;padding:0}
.ikr .chip{display:inline-flex;gap:6px;align-items:center;border:2px solid var(--ink);border-radius:20px;padding:3px 10px 3px 4px;font-weight:700;font-size:var(--fs-s);background:var(--paper2)}
.ikr .chip .pic{width:26px;height:26px}
.ikr .ledger{display:grid;grid-template-columns:1fr auto;gap:3px 12px;font-variant-numeric:tabular-nums}
.ikr .ledger .t{font-weight:800;border-top:2px solid var(--ink);padding-top:4px;margin-top:3px}
.ikr .ledger .r{text-align:right}
.ikr .cmp{display:flex;gap:10px;align-items:baseline}
.ikr .cmp b{font:800 34px/1 var(--serif)}
.ikr .complaint{display:flex;gap:10px;align-items:center;padding:6px 8px;border:2px solid var(--ink);border-radius:8px;background:#fffaf0;cursor:pointer;text-align:left;min-height:48px;width:100%}
.ikr .complaint .pic{width:34px;height:34px;flex:none;border-radius:6px}
.ikr .complaint p{font:700 20px/1.05 var(--hand)}
.ikr .complaint small{display:block;font:600 var(--fs-s)/1.2 var(--sans);color:var(--ink2)}
.ikr .stepper{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center}
.ikr .stepper .v{min-width:56px;text-align:center;font-weight:800;font-variant-numeric:tabular-nums}
.ikr .stepper .btn{width:44px;padding:0;font-size:22px;box-shadow:0 2px 0 var(--ink)}
.ikr .stepper.closed{opacity:.5}
.ikr .toggle{display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:44px;width:100%;text-align:left;background:none;border:0;padding:0;cursor:pointer;font-weight:600}
.ikr .toggle i{flex:none;width:46px;height:26px;border:2px solid var(--ink);border-radius:14px;background:var(--paper2);position:relative}
.ikr .toggle i::after{content:'';position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:50%;background:var(--ink);transition:left .15s}
.ikr .toggle.on i{background:var(--teal2)}
.ikr .toggle.on i::after{left:22px;background:#fff}
.ikr .commission{border:2px solid var(--ink);border-radius:8px;padding:8px 10px;background:#fffaf0;display:flex;flex-direction:column;gap:4px}
.ikr .commission.taken{border-color:var(--teal);background:#e6f1ee}
.ikr .plates{display:flex;gap:14px;justify-content:center;padding:10px 4px 6px;flex-wrap:wrap}
.ikr .plate{position:relative;width:210px;height:62px;display:grid;place-items:center start;padding-left:26px;background:var(--tex-plate) center/100% 100% no-repeat;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
.ikr .plate .ptxt{font:900 15px/1 var(--serif);letter-spacing:.08em;text-transform:uppercase;color:var(--ink);opacity:.45}
.ikr .plate.got .ptxt{opacity:1}
.ikr .plate .pstamp{position:absolute;right:-8px;top:-8px;width:62px;height:62px;display:grid;place-items:center;animation:ikr-slam .4s cubic-bezier(.2,1.4,.4,1) both;animation-delay:var(--d,0s);mix-blend-mode:multiply}
.ikr .plate .pstamp .ring{position:absolute;inset:0;width:100%;height:100%}
.ikr .plate .pstamp b{position:relative;font:900 18px/1 var(--serif);color:#8a3a2a;transform:rotate(-8deg)}
.ikr .plate.still .pstamp{animation:none}
.ikr .numplate{display:inline-block;font:900 26px/1 var(--serif);letter-spacing:.14em;padding:12px 30px;color:var(--ink);background:var(--tex-plate) center/100% 100% no-repeat;min-width:120px;text-align:center}
.ikr .seal{width:52px;height:54px;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}
.ikr .techs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ikr .tech{display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;padding:10px 8px;min-height:140px;height:auto;border:2px solid var(--ink);border-radius:8px;background:#fffaf0;cursor:pointer;box-shadow:0 3px 0 var(--ink)}
.ikr .tech .pic{width:44px;height:44px}
.ikr .tech b{font:800 16px/1.1 var(--serif)}
.ikr .tech span{font-size:var(--fs-s);line-height:1.2}
.ikr .tech.on{background:linear-gradient(#d3e8e6,#a9d0cf);transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
.ikr .letter{padding:34px 26px 18px;overflow:visible}
.ikr .letter .body{font:700 26px/1.1 var(--hand)}
.ikr .letter .sign{font:700 24px/1 var(--hand);text-align:right}
.ikr .spot{display:flex;gap:10px;align-items:center;width:100%;text-align:left;min-height:48px;padding:6px 10px}
.ikr .spot b{flex:none;width:30px;height:30px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:15px}
.ikr .years{display:flex;flex-wrap:wrap;gap:8px}
.ikr .years .btn{min-width:48px;padding:0 10px}
`;

export const CARDS_CSS_2 = `
.ikr .tabs{display:flex;gap:6px;flex:none}
.ikr .tab{flex:1;padding:0 6px;box-shadow:0 2px 0 var(--ink)}
.ikr .pane{display:flex;flex-direction:column;gap:12px}
.ikr .supportline{position:relative;height:16px;border:2px solid var(--ink);border-radius:8px;background:rgba(42,40,50,.12);overflow:hidden}
.ikr .supportline i{position:absolute;left:0;top:0;bottom:0;width:var(--s);background:var(--teal)}
.ikr .supportline b{position:absolute;top:-2px;bottom:-2px;width:3px;background:var(--ink)}
.ikr .envelope{position:relative;display:flex;flex-direction:column;align-items:center;padding-top:6px}
.ikr .envelope .env{position:absolute;bottom:-34px;left:50%;width:min(340px,70%);margin-left:calc(min(340px,70%) / -2);z-index:2;animation:ikr-env 1.1s .5s ease-in both;pointer-events:none}
@keyframes ikr-env{0%{opacity:1;transform:translateY(0) rotateX(0)}60%{opacity:1}100%{opacity:0;transform:translateY(60px) rotateX(70deg)}}
.ikr .paperleaf{width:100%;display:flex;flex-direction:column;gap:12px;padding:14px 18px;background:#fffdf4;border:2px solid var(--ink);border-radius:4px;box-shadow:0 2px 0 rgba(42,40,50,.3);animation:ikr-leaf .7s .8s cubic-bezier(.2,1.1,.4,1) both}
@keyframes ikr-leaf{from{transform:translateY(46px) scale(.96);opacity:0}}
.ikr .letter .sulo{width:70px;height:70px;border-radius:8px;border:2px solid var(--ink);background:var(--paper2)}
.ikr .letter .facts .chip{font-size:16px;padding:4px 12px 4px 6px}
.ikr .letter .facts .chip .pic{width:28px;height:28px}
.ikr .letter .seal{margin-left:auto}
.ikr .letter.still .envelope .env{animation:none;opacity:0}
.ikr .letter.still .paperleaf{animation:none}
`;
