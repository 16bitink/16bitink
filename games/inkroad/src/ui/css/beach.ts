/** The Council's beach card. */
export const BEACH_CSS = `
.ikr .ways{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ikr .way{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:2px solid var(--ink);border-radius:8px;background:#fffaf0}
.ikr .way.sell{background:#f7ecd2}
.ikr .way.open{background:#e4f0ee}
.ikr .way .speaker .pic{width:52px;height:52px}
.ikr .way .speech{font-size:20px}
.ikr .lean{font-size:var(--fs)}
.ikr .beachcard .foot .btn{min-height:44px}
.ikr.phone .way{padding:5px 8px;gap:3px}
.ikr.phone .way h3{margin:0}
.ikr.phone .ways{gap:10px}
.ikr.phone .beachcard .head .stamp{padding:2px 10px}
.ikr.phone .way .speaker .pic{width:40px;height:40px}
.ikr.phone .way .speech{padding:5px 9px}
.ikr.phone .way .speech small{display:none}
.ikr.phone .beachcard>.cbody>.speaker .speech small{display:none}
@media (max-width:600px){.ikr .ways{grid-template-columns:1fr}}
`;
