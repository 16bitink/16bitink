/** Phone held sideways: scoped to .ikr.phone, loaded last, so the laptop layout never changes. */
export const PHONE_CSS = `
.ikr.phone{--fs:16px;--fs-s:14px;--hand-fs:24px}
.ikr.phone .bar{height:52px;gap:10px;padding:0 8px;top:6px;left:6px;right:6px}
.ikr.phone .money{min-width:0}
.ikr.phone .money b{font-size:20px}
.ikr.phone .bars,.ikr.phone .money small,.ikr.phone .when small,.ikr.phone .goalchip small{display:none}
.ikr.phone .goalchip{padding-left:10px;gap:7px;font-size:var(--fs-s);white-space:nowrap}
.ikr.phone .goalchip .tick{width:26px;height:26px}
.ikr.phone .goalchip b{font-size:16px}
.ikr.phone .ribbon{width:14px;height:14px;padding:0;border-radius:50%;top:-5px;right:-5px;font-size:0;transform:none}
.ikr.phone .choice .ribbon{width:auto;height:auto;border-radius:3px;font-size:14px;padding:1px 7px;top:-13px;right:8px;transform:rotate(-2deg)}
.ikr.phone .tgrp.open .trow{z-index:4}
.ikr.phone .when svg{width:34px;height:34px}
.ikr.phone .when b{font-size:15px}
.ikr.phone .speed{gap:4px}
.ikr.phone .speed .btn{min-width:44px;padding:0 8px}
.ikr.phone .dial{width:60px;height:38px}
.ikr.phone .dial b{bottom:-1px;font-size:17px}
.ikr.phone .appr{height:44px}
.ikr.phone .tools{display:flex;flex-direction:column;left:6px;top:64px;padding:6px;gap:6px;background:none;border:0;box-shadow:none}
.ikr.phone .tools::before{display:none}
.ikr.phone .tgrp{position:relative}
.ikr.phone .tgrp>.gname{display:none}
.ikr.phone .tgrp>.gbtn{display:grid;place-items:center;width:44px;height:44px;padding:0;position:relative}
.ikr.phone .gbtn .pic{width:30px;height:30px}
.ikr.phone .trow{display:none;position:absolute;left:52px;top:0;flex-direction:row;grid-template-columns:none;display:none;gap:6px;padding:6px;background:var(--tex-paper) 0 0/256px,#f4ebd6;border:2px solid var(--ink);border-radius:8px;box-shadow:0 3px 0 var(--ink);z-index:3}
.ikr.phone .tgrp.open .trow{display:flex}
.ikr.phone .tgrp.open>.gbtn{background:linear-gradient(#d3e8e6,#a3cdcb)}
.ikr.phone .ovs{right:6px;top:64px;padding:0;gap:6px;background:none;border:0;box-shadow:none}
.ikr.phone .env{left:60px;top:58px;padding:2px 6px}
.ikr.phone .sel{right:58px;top:60px;width:min(300px,52vw);max-height:calc(100% - 66px)}
.ikr.phone.hassel .ovs{display:none}
.ikr.phone .ticker{left:60px;bottom:6px;max-width:44vw;min-height:48px}
.ikr.phone .ghostbar,.ikr.phone .hintbar{bottom:6px;padding:6px 10px;gap:10px}
.ikr.phone .ghostbar .btn,.ikr.phone .hintbar .btn{min-height:44px;min-width:44px}
.ikr.phone.hasghost .ticker{display:none}
.ikr.phone .card{padding:16px 18px 14px;gap:10px}
.ikr.phone .card h2{font-size:22px}
.ikr.phone .cols{gap:12px}
.ikr.phone .card .stamp.big{font-size:17px;padding:4px 10px;border-width:3px}
.ikr.phone .card{padding:30px 18px 12px;gap:6px}
.ikr.phone .card .head .sub{display:none}
.ikr.phone .cbody{gap:8px}
.ikr.phone .speaker .pic{width:48px;height:48px}
.ikr.phone .speech{font-size:20px}
.ikr.phone .card .head .sub{font-size:20px}

.ikr.phone .cities{padding:14px 12px 24px;gap:12px}
.ikr.phone .citycard{width:min(380px,92%)}
.ikr.phone .menu .logo{font-size:40px}
.ikr.phone .menu .sheet{padding:18px 22px 16px;gap:8px}
.ikr.phone .menu .sheet{width:min(330px,44vw)}
.ikr.phone .endimg{display:none}
.ikr.phone .techs{gap:6px}
.ikr.phone .tbtn{width:44px;height:44px;padding:0}
.ikr.phone .tbtn .tl,.ikr.phone .gbtn .tl,.ikr.phone .iconbtn.lab .tl{display:none}
.ikr.phone .iconbtn.lab{width:44px;height:44px;padding:0}
.ikr.phone .trow{grid-template-columns:none}
.ikr.phone .plate{width:158px;height:44px;padding-left:16px}
.ikr.phone .plate .ptxt{font-size:14px}
.ikr.phone .plate .pstamp{width:46px;height:46px;top:-4px;right:-6px}
.ikr.phone .numplate{font-size:20px;padding:8px 20px;min-width:0}
.ikr.phone .plates{gap:10px;padding-top:6px}
.ikr.phone .projects .chip{min-height:44px}
.ikr.phone .projects{left:auto;right:58px;top:58px}
.ikr.phone .logo{font-size:54px}
.ikr.phone .tech{min-height:0;padding:6px;gap:3px}
.ikr.phone .tech .pic{width:40px;height:40px}
.ikr.phone .tech span{font-size:14px;line-height:1.15}
.ikr.phone .yrow{grid-template-columns:repeat(5,1fr);gap:6px}
.ikr.phone .sel .x{width:44px;height:44px;min-height:44px}
.ikr.phone .pop{left:6px;top:58px}
@media (max-width:760px){.ikr.phone .when b{display:none}}
@media (max-width:700px){.ikr:not(.phone) .cols{grid-template-columns:1fr}}
`;
