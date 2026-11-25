/** The slim toolbar: a column of group buttons with a fly-out of that group's tools. Laptop only; phones have their own in phone.ts. */
export const SLIM_CSS = `
.ikr:not(.phone) .tools.slim{display:flex;flex-direction:column;gap:7px;padding:7px;grid-template-columns:none}
.ikr:not(.phone) .slim .tgrp{position:relative;display:block}
.ikr:not(.phone) .slim .tgrp>.gname{display:none}
.ikr:not(.phone) .slim .tgrp>.gbtn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:76px;height:60px;padding:2px 0 0;position:relative;box-shadow:0 2px 0 var(--ink)}
.ikr:not(.phone) .slim .gbtn .pic{width:30px;height:30px}
.ikr:not(.phone) .slim .gbtn.on,.ikr:not(.phone) .slim .tgrp.open>.gbtn{background:linear-gradient(#d3e8e6,#a3cdcb)}
.ikr:not(.phone) .slim .trow{display:none;position:absolute;left:86px;top:0;grid-template-columns:repeat(var(--n,1),76px);gap:7px 6px;padding:8px;background:var(--tex-paper) 0 0/256px,#f4ebd6;border:2px solid var(--ink);border-radius:8px;box-shadow:0 3px 0 var(--ink);z-index:4}
.ikr:not(.phone) .slim .tgrp.open .trow{display:grid}
.ikr:not(.phone) .slim .tgrp.has-on>.gbtn::after{content:'';position:absolute;left:8px;right:8px;bottom:3px;height:4px;border-radius:2px;background:var(--teal)}
@media (max-height:640px){.ikr:not(.phone) .slim .tgrp>.gbtn{height:52px}.ikr:not(.phone) .slim .gbtn .pic{width:24px;height:24px}}
`;
