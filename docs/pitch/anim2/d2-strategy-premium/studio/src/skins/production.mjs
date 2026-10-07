// skins/production.mjs - the SHIPPED tile look, reproduced for the before/after comparison (production function lS, report 01 section 3.1):
//   a thin bar (width = strength / 4 px up to 120, height 8, cavalry 4) rotated by (bearing - 90) degrees, Union #3a6bc4 / Confederate #c43a3a by the id PREFIX (so the 10 contested ids are
//   drawn Union blue, as in production), guns as a 2 px outline with a centre line, skirmishers as a dashed line, a 7 px disposition dot above the centre, a black name label from the id.
// This skin does NOT follow the footprint contract (a rotated 120 px bar leaves its box) and it keeps the shipped honesty problems on purpose (report 01 section 4: T4, T5, T6, T7, T8);
// it is not registered in the Studio's skin list and only the production mode selects it.  The colours are the shipped ones, read from the bundle.
const UNION = '#3a6bc4'; const CONF = '#c43a3a'; const UNION_B = '#1a3a7a'; const CONF_B = '#7a1a1a';
const DISP = { 'Charging Line': '#ff4422', 'Skirmish Line': '#66aaff', 'Chaotic Retreat': '#ff8800', 'Line of March': '#aaaaaa', Reserve: '#226622', Bivouac: '#555555', 'Deployed Artillery': '#f5c518', 'Limbered Artillery': '#c8a84a', 'Mounted Cavalry': '#44aa44', 'Dismounted Cavalry': '#88cc88' };

export const PRODUCTION_SKIN = {
  id: 'production', hidden: true, noHover: true, label: 'Production (reproduction of the shipped tiles)', version: '1.0',
  footprint: {},
  draw: {
    tile(c, t, env) {
      const union = t.ids[0].startsWith('U-'); const fill = union ? UNION : CONF; const border = union ? UNION_B : CONF_B; const w = t.barW; const h = t.barH; const dpr = env.dpr || 1;
      c.save(); c.rotate(((t.bearing || 0) - 90) * Math.PI / 180);
      if (t.selected) { c.shadowColor = '#e8d5a3'; c.shadowBlur = 14 * dpr; }
      else if (t.engaged) { c.shadowColor = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(env.timeMs / 300))})`; c.shadowBlur = 8 * dpr; }
      if (t.art) { c.strokeStyle = fill; c.lineWidth = 2; c.strokeRect(-w / 2, -h / 2 - 1, w, h + 2); c.beginPath(); c.moveTo(-w / 4, 0); c.lineTo(w / 4, 0); c.stroke(); }
      else if (t.skirm) { c.setLineDash([4, 3]); c.strokeStyle = fill; c.lineWidth = 2; c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.stroke(); c.setLineDash([]); }
      else { c.fillStyle = fill; c.globalAlpha = t.selected ? 1 : 0.88; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = border; c.lineWidth = 1; c.strokeRect(-w / 2, -h / 2, w, h); }
      c.shadowBlur = 0; c.globalAlpha = 1; c.restore();
      c.beginPath(); c.arc(0, -7, 3.5, 0, Math.PI * 2); c.fillStyle = DISP[t.disposition] || fill; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 1; c.stroke();
    },
    label(c, t) {
      const L = t.label; const lw = L.x1 - L.x0; const lh = L.y1 - L.y0; const union = t.ids[0].startsWith('U-');
      c.font = `bold ${L.px}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; const tw = c.measureText(L.text).width;
      c.fillStyle = 'rgba(0,0,0,0.72)'; c.fillRect(lw / 2 - tw / 2 - 3, 0, tw + 6, lh); c.fillStyle = union ? '#aaccff' : '#ffbbaa'; c.fillText(L.text, lw / 2, lh / 2);
    },
    leader(c, t, env, a, b) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = t.ids[0].startsWith('U-') ? 'rgba(80,120,200,0.4)' : 'rgba(180,80,60,0.4)'; c.lineWidth = 0.5; c.stroke(); },
  },
  legend() {
    return [
      { swatch: UNION, text: 'Union bar (id prefix U-). The 10 ids with Confederate state codes are drawn Union blue here, as in production.', evidence: 'Contested' },
      { swatch: CONF, text: 'Confederate bar (id prefix C-)', evidence: 'Documented' },
      { swatch: '#999', text: 'Bar width = strength / 4 px, at most 120 px: it saturates at 480 men, 49.9 % of keyframe rows are at the cap (01-current-tiles-jitter.md, T6)', evidence: 'Computed' },
      { swatch: '#ff4422', text: 'Dot above the bar = disposition; six dispositions share the same bar and differ only by this dot', evidence: 'Computed' },
      { swatch: '#fff', text: 'White pulse = a Union and a Confederate unit within 40 screen px: a function of zoom, not of contact (T8)', evidence: 'Computed' },
    ];
  },
};
