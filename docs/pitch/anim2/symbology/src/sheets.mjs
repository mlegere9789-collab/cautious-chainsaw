// src/sheets.mjs - HTML for the symbol sheets (rendered to PNG by tools/sheets.mjs in the real Chrome).  Vector, so they stay sharp at any zoom; every number printed on them comes from the build.
import { SIDES, ARMS, LABEL, ECHELONS, STATES, baseKey } from './common.mjs';
import { CHIPS, CHIP_TEXT, GAUGE_BINS } from './chips.mjs';
import { BADGE_SHAPES, BADGE_TEXT, DIV_COLOURS, ARMSETS } from './overlays.mjs';
import { luminance, contrast } from './colour.mjs';

export const BACKDROPS = [
  { id: 'forest', hex: '#21321a', label: 'Forest (measured, 5th to 20th luminance percentile of two satellite screenshots)' },
  { id: 'field', hex: '#4e613e', label: 'Field (measured, median)' },
  { id: 'pale', hex: '#899371', label: 'Pale field (measured, top 5%)' },
  { id: 'soil', hex: '#c9bf9f', label: 'Bare soil / stubble (assumed, not measured)' },
  { id: 'paper', hex: '#ebe6da', label: 'Paper (the prototype\'s light ground)' },
  { id: 'ink', hex: '#14181d', label: 'Ink (the prototype\'s dark ground)' },
];

const css = `
*{box-sizing:border-box}body{margin:0;background:#f4f2ec;color:#1b1f24;font:13px/1.45 'Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.page{padding:28px 32px 36px}h1{font:600 26px/1.2 'Segoe UI',sans-serif;margin:0 0 4px}h2{font:600 17px/1.3 'Segoe UI';margin:26px 0 8px}h3{font:600 13px/1.3 'Segoe UI';margin:14px 0 6px;color:#44505c}
.sub{color:#56626e;margin:0 0 12px;max-width:1500px}.small{font-size:11.5px;color:#56626e}.row{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
table.n{border-collapse:collapse;font-size:12.5px;max-width:1500px}table.n td,table.n th{border-top:1px solid #d5d1c6;padding:5px 12px 5px 0;text-align:left;vertical-align:top}table.n th{font-weight:600;color:#33404c}
.pill{display:inline-block;padding:0 7px;border-radius:9px;font-size:11px;font-weight:600;margin-right:4px}.nato{background:#dbe7f5;color:#17406e}.wargame{background:#e9e4d0;color:#5b4a14}.invented{background:#efdcdc;color:#7a2a22}
.panel{border-radius:10px;padding:12px 14px 14px;position:relative}.panel .t{font:600 11.5px 'Segoe UI';letter-spacing:.02em;margin:0 0 8px}
.grid{display:grid;gap:0}.cell{position:relative;overflow:visible}.cell .cap{position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:10px;line-height:1.1;opacity:.85}
.grid>.cell,.grid>.rl{border-top:1px solid rgba(128,128,128,.22)}.hd{font-size:10.5px;text-align:center;opacity:.8;align-self:end;padding-bottom:3px}.rl{font-size:11px;align-self:center;padding-right:8px;opacity:.9;white-space:nowrap}
.sw{display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-3px;margin-right:6px;border:1px solid rgba(0,0,0,.25)}
code{font:11.5px Consolas,monospace;background:#e7e3d8;padding:0 4px;border-radius:3px}
.lbl{font:600 11px 'Segoe UI';padding:2px 7px;border-radius:5px;display:inline-block}
`;

export const place = (s, z, x, y, extra = '') => `<div style="position:absolute;left:${(x - s.ax * z).toFixed(2)}px;top:${(y - s.ay * z).toFixed(2)}px;width:${s.w * z}px;height:${s.h * z}px;${extra}">${s.svg.replace('<svg ', `<svg style="display:block;width:${s.w * z}px;height:${s.h * z}px" `)}</div>`;

/** one cell: a sprite centred on its anchor in a w x h box, with an optional caption */
export function cell(s, z, w, h, cap = '') { return `<div class="cell" style="width:${w}px;height:${h}px">${s ? place(s, z, w / 2, h / 2 - (cap ? 6 : 0)) : ''}${cap ? `<div class="cap">${cap}</div>` : ''}</div>`; }

const conventions = {
  nato: { nato: ['Frame shape = affiliation: rectangle (friend) for the Union, diamond (hostile) for the Confederacy, quatrefoil (unknown) for the 10 contested ids', 'Arm icons: saltire X = infantry, single diagonal = cavalry, filled circle = field artillery', 'Echelon marks above the frame: I battery, II battalion, III regiment, X brigade, XX division, XXX corps, XXXX army'],
    wargame: ['Horse artillery as the gun dot over the cavalry slash (counter practice; NATO has no horse artillery symbol)'],
    invented: ['Flat plates with a light and a dark ring, soft shadow, top light (NATO draws line work)', 'The diamond means "the other army", not "hostile"; shape repeats colour so the sides differ without colour', 'Plate size grows with echelon (NATO frames are one size)', 'Split plate for an aggregate of both sides; dotted ring for a carried-forward position', 'Sharpshooters: saltire with a scope ring', 'Formation (brigade and up): a thin inner outline, no arm claimed because the data gives none'] },
  shield: { nato: ['The echelon marks (bars and X) for battalion and up, moved into a header band of the shield'], wargame: ['Gun wheel for artillery (the NATO field-artillery circle drawn as a spoked wheel); horse artillery = wheel over slash'],
    invented: ['The rounded shield, the double chevron (infantry), the horse head (cavalry), the target (sharpshooters), the three dots (a formation is composed of units)', 'Plate size grows with echelon; regiments and batteries carry no echelon mark (they are the unit of account)', 'Dotted ring for a carried-forward position; split shield for an aggregate of both sides'] },
  minimal: { nato: [], wargame: ['Solid geometric markers coloured by side and sized by importance (general cartographic practice, no standard)'],
    invented: ['Circle = infantry, triangle = cavalry, square = artillery, diamond = horse artillery, circle with a dot = sharpshooters', 'Hexagon = formation (brigade, division, corps); the number of nested outlines is the echelon (1, 2, 3, 4)', 'Dotted ring for a carried-forward position; split marker for both sides'] },
};

const ul = (a) => (a.length ? `<ul style="margin:0;padding-left:16px">${a.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<span class="small">none</span>');
export function namingTable(langId) { const c = conventions[langId]; return `<table class="n"><tr><th style="width:27%"><span class="pill nato">NATO / APP-6 / MIL-STD-2525</span></th><th style="width:27%"><span class="pill wargame">Common wargame / map practice</span></th><th><span class="pill invented">Invented here</span></th></tr><tr><td>${ul(c.nato)}</td><td>${ul(c.wargame)}</td><td>${ul(c.invented)}</td></tr></table>`; }

/** layout metrics of a set of sprites around their anchors */
export function metricsOf(list) { const m = { l: 0, r: 0, u: 0, d: 0 }; for (const s of list) { m.l = Math.max(m.l, s.ax); m.r = Math.max(m.r, s.w - s.ax); m.u = Math.max(m.u, s.ay); m.d = Math.max(m.d, s.h - s.ay); } return m; }
export function anchoredCell(s, z, m, cap = '', capH = 15) { const w = Math.ceil((m.l + m.r) * z + 10); const h = Math.ceil((m.u + m.d) * z + 10 + capH); return `<div class="cell" style="width:${w}px;height:${h}px">${s ? place(s, z, 5 + m.l * z, 5 + m.u * z) : ''}${cap ? `<div class="cap">${cap}</div>` : ''}</div>`; }

/** The vocabulary of one language on one backdrop: three side panels (Union, Confederate, contested): unit-level arms x echelons, then the formations, each with the data's unit counts */
export function vocabSection({ lang, sprites, needed, bg, bgLabel, z = 2.2 }) {
  const base = sprites.filter((s) => s.group === 'base'); const by = new Map(base.map((s) => [s.key, s])); const count = new Map(needed.specs.map((s) => [`${s.side}/${s.arm}/${s.ech}`, s.units]));
  const dark = luminance(bg) < 0.25; const fg = dark ? '#e8ecef' : '#1b1f24'; const mU = metricsOf(base.filter((b) => b.spec.arm !== 'formation')); const mF = metricsOf(base.filter((b) => b.spec.arm === 'formation')); const cwU = Math.ceil((mU.l + mU.r) * z + 10); const cwF = Math.ceil((mF.l + mF.r) * z + 10);
  const unitCols = ['battery', 'regiment', 'battalion']; const formCols = ['brigade', 'division', 'corps', 'army'];
  const unitArms = ARMS.filter((a) => a !== 'formation');
  let html = `<h3>${bgLabel} <span class="small">${bg}</span></h3><div class="row">`;
  for (const side of ['union', 'confederate', 'unknown']) {
    const head = (cols, extra) => `<div></div>` + cols.map((c) => `<div class="hd">${LABEL.ech[c]}</div>`).join('') + (extra ? `<div class="hd">${extra}</div>` : '');
    html += `<div class="panel" style="background:${bg};color:${fg}"><div class="t">${LABEL.side[side].toUpperCase()}</div>`;
    html += `<div class="grid" style="grid-template-columns:96px repeat(${unitCols.length + 1},${cwU}px)">${head(unitCols, 'Carried (regiment)')}`;
    for (const arm of unitArms) {
      html += `<div class="rl">${LABEL.arm[arm]}</div>`;
      for (const ech of unitCols) { const n = count.get(`${side}/${arm}/${ech}`); html += anchoredCell(by.get(baseKey(lang, { side, arm, ech, state: 'fresh' })), z, mU, n ? `${n} unit${n > 1 ? 's' : ''}` : ''); }
      html += anchoredCell(by.get(baseKey(lang, { side, arm, ech: 'regiment', state: 'carried' })), z, mU);
    }
    html += `</div><div style="height:10px"></div><div class="grid" style="grid-template-columns:96px repeat(${formCols.length + 1},${cwF}px)">${head(formCols, 'Carried (brigade)')}<div class="rl">Formation</div>`;
    for (const ech of formCols) { const n = count.get(`${side}/formation/${ech}`); html += anchoredCell(by.get(baseKey(lang, { side, arm: 'formation', ech, state: 'fresh' })), z, mF, n ? `${n} unit${n > 1 ? 's' : ''}` : ''); }
    html += anchoredCell(by.get(baseKey(lang, { side, arm: 'formation', ech: 'brigade', state: 'carried' })), z, mF);
    html += `</div></div>`;
  }
  return html + `</div>`;
}

/** states and marks on all backdrops: the same symbols at 1x pixel size in a row on each backdrop */
export function backdropStrip({ lang, sprites, z = 1, items }) {
  const by = new Map(sprites.map((s) => [s.key, s])); let html = '';
  for (const b of BACKDROPS) {
    const fg = luminance(b.hex) < 0.25 ? '#e8ecef' : '#1b1f24';
    html += `<div class="panel" style="background:${b.hex};color:${fg};margin-bottom:6px;padding:8px 14px"><div class="t" style="margin:0 0 4px">${b.label} <span style="opacity:.7">${b.hex}</span></div><div style="display:flex;gap:${Math.round(18 * z)}px;align-items:center;flex-wrap:wrap;min-height:${Math.round(66 * z)}px">`;
    for (const key of items) { const s = by.get(key); if (!s) continue; html += `<div style="position:relative;width:${Math.round((s.w) * z)}px;height:${Math.round((s.h) * z)}px">${place(s, z, s.ax * z, s.ay * z)}</div>`; }
    html += `</div></div>`;
  }
  return html;
}

export const wrap = (title, body, extraCss = '') => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}${extraCss}</style></head><body><div class="page">${body}</div></body></html>`;
export { css };

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// composition: how a skin puts the layers together.  The atlas index carries the same anchors, so a skin does exactly this with drawImage (runtime/atlas.mjs).
/** absolute-positioned HTML of one tile with optional layers.  (x, y) = where the unit's TRUE POSITION is (the anchor).  L = lookup(key) -> sprite. */
export function composeTile(L, { lang, spec, z, x, y, ring = null, chip = null, gauge = null, badge = null, dim = 1 }) {
  const base = L(baseKey(lang, spec)); if (!base) return '';
  let html = '';
  if (ring) { const r = L(`${lang}/ring/${ring}/${base.sil}`); if (r) html += place(r, z, x, y); }
  html += place(base, z, x, y, dim < 1 ? `opacity:${dim}` : '');
  const ox = x - base.ax * z; const oy = y - base.ay * z;
  if (chip) { const c = L(`chip/${chip}`); if (c) html += place(c, z, ox + base.anchors.ne[0] * z, oy + base.anchors.ne[1] * z); }
  if (gauge !== null) { const g = L(`gauge/${gauge}`); if (g) html += place(g, z, ox + base.anchors.below[0] * z, oy + base.anchors.below[1] * z + (g.h / 2 - 0.5) * z); }
  if (badge) { const b = L(`badge/${badge}`); if (b) html += place(b, z, ox + base.anchors.left[0] * z - (b.w / 2 - 2) * z, oy + base.anchors.left[1] * z); }
  return html;
}
