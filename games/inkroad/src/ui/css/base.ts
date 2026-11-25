/** Tokens and the paper kit: panels, tape, buttons, stamps, coins. */
export const BASE_CSS = `
.ikr{--paper:#f6eedb;--paper2:#eadfc3;--ink:#2a2832;--ink2:#5b5663;--teal:#2c7a80;--teal2:#3c9aa1;--gold:#c8962a;--sand:#d8c398;--ochre:#a8691f;--red:#b83227;--felt:#33423d;
  --hand:'Caveat',cursive;--serif:'Source Serif 4',Georgia,serif;--sans:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --fs:16px;--fs-s:14px;--hand-fs:22px;--tap:44px;
  position:fixed;inset:0;overflow:hidden;font:400 var(--fs)/1.3 var(--sans);color:var(--ink);user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.ikr *,.ikr *::before,.ikr *::after{box-sizing:border-box}
.ikr button{font:inherit;color:inherit}
.ikr .stage{position:absolute;inset:0;background:#cdbf9b}
.ikr .layer{position:absolute;inset:0}
.ikr [hidden]{display:none!important}
.ikr .pic{display:block;object-fit:contain;pointer-events:none}
.ikr .hand{font:700 var(--hand-fs)/1 var(--hand)}
.ikr .dim{color:var(--ink2)}
.ikr .small{font-size:var(--fs-s)}
.ikr .row{display:flex;gap:10px;align-items:center}
.ikr .col{display:flex;flex-direction:column;gap:10px}
.ikr .wrap{flex-wrap:wrap}
.ikr .grow{flex:1 1 0;min-width:0}
.ikr .center{justify-content:center;text-align:center;align-items:center}
.ikr h1,.ikr h2,.ikr h3,.ikr p{margin:0}
.ikr h2{font:800 26px/1.1 var(--serif);letter-spacing:.01em}
.ikr h3{font:800 14px/1.1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ink2)}

.ikr .paper{background:var(--tex-paper,#f6eedb) 0 0/256px,linear-gradient(170deg,#faf3e1,#efe4c8);background-blend-mode:multiply;border:2px solid var(--ink);border-radius:8px;
  box-shadow:0 3px 0 rgba(42,40,50,.9),0 10px 22px -6px rgba(20,22,26,.45),inset 0 0 0 1px rgba(255,255,255,.55)}
.ikr .taped{position:relative}
.ikr .taped::before{content:'';position:absolute;top:-33px;left:50%;width:96px;height:56px;margin-left:-48px;transform:rotate(-2.5deg);
  background:var(--tex-tape) center/100% 100% no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3));pointer-events:none}
.ikr .taped.left::before{left:34px;margin-left:0;transform:rotate(-6deg)}
.ikr .taped.right::before{left:auto;right:34px;margin-left:0;transform:rotate(5deg)}

.ikr .btn{font:700 var(--fs)/1.1 var(--sans);min-height:var(--tap);padding:0 18px;border:2px solid var(--ink);border-radius:8px;cursor:pointer;
  background:linear-gradient(#fcf6e6,#eadfc2);box-shadow:0 3px 0 var(--ink);transition:transform .06s,box-shadow .06s,filter .1s;touch-action:manipulation}
.ikr .btn:hover{filter:brightness(1.05)}
.ikr .btn:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
.ikr .btn:disabled{opacity:.45;pointer-events:none;box-shadow:0 1px 0 var(--ink)}
.ikr .btn.go{background:linear-gradient(var(--teal2),var(--teal));color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.25)}
.ikr .btn.gold{background:linear-gradient(#efc866,var(--gold))}
.ikr .btn.hidden{display:none}
.ikr .btn.big{min-height:52px;font-size:19px;padding:0 28px}
.ikr .btn.sm{padding:0 12px}
.ikr .btn.on{background:linear-gradient(#cfe5e3,#a9d0cf);box-shadow:inset 0 2px 0 rgba(0,0,0,.18),0 1px 0 var(--ink);transform:translateY(2px)}
.ikr .iconbtn{width:var(--tap);height:var(--tap);padding:0;display:grid;place-items:center}
.ikr .iconbtn .pic{width:28px;height:28px}

.ikr .stamp{display:inline-block;font:900 17px/1 var(--serif);letter-spacing:.16em;text-transform:uppercase;color:var(--stampc,var(--ink));
  border:3px double currentColor;padding:6px 12px;border-radius:6px;transform:rotate(-5deg);opacity:.9;mix-blend-mode:multiply;filter:url(#ikr-rough);white-space:nowrap}
.ikr .stamp.red{--stampc:var(--red)}
.ikr .stamp.teal{--stampc:var(--teal)}
.ikr .stamp.big{font-size:26px;padding:8px 18px;border-width:4px}
.ikr .stamp.slam{animation:ikr-slam .38s cubic-bezier(.2,1.4,.4,1) both}
@keyframes ikr-slam{0%{transform:rotate(-14deg) scale(2.6);opacity:0}60%{opacity:1}100%{transform:rotate(-5deg) scale(1);opacity:.9}}

.ikr .coin{font-weight:800;font-variant-numeric:tabular-nums}
.ikr .coin::before{content:'';display:inline-block;width:.78em;height:.78em;margin-right:.3em;vertical-align:-.06em;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#f6d980,var(--gold) 70%);border:1.5px solid var(--ink);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)}
.ikr .num{font-variant-numeric:tabular-nums}
.ikr .up{color:var(--teal)}
.ikr .down{color:var(--ochre)}
.ikr .warn{color:var(--ochre);font-weight:600}
.ikr hr{border:0;border-top:2px dashed rgba(42,40,50,.28);margin:2px 0;width:100%}
`;
