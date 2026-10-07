// popups/legend.mjs - P-12, the LEGEND.  The product's legend describes a renderer that no longer exists: its swatches match the colour the tiles are drawn in for 3 of 11 dispositions, and its
// "Size" tab says "dot radius scales with strength" about bars that are capped at 120 px (02-popups.md F-13).  This legend cannot drift: its rows are the ACTIVE SKIN's own legend() (every
// skin states what each mark claims, with the site's evidence label), read live, and each swatch is drawn by the skin's own code, so switching skin changes the legend with it.
//
// Strategy Premium: the legend has 21 rows, too many for a floating card on a crowded map (the first version fell back to its pill on every busy scene: iteration 2).  Closed it is a small pill; the
// pill opens the READING PANEL (the rail, a bottom sheet on a phone), where the map makes room and nothing is covered: an annotated mark first (what each part of a banner says), then the rows grouped
// by what they encode, then the ground (what the photograph is and is not) and the place marks.  If a skin has no legend() the panel says so instead of inventing one.
import { ev } from './kit.mjs';
import { CHANNELS } from '../skins/semantics.mjs';
import { paintSpec } from '../skins/premium.mjs';
import { placeSwatch } from '../render/places.mjs';

const SLOT_ALT = { tl: 'bl', bl: 'tl', tr: 'br', br: 'tr' };

/** the annotated mark: a regiment banner enlarged, five callouts naming what each part says (drawn by the skin's own painter).  Each leader leaves its dot straight up (the three upper callouts) or straight down (the two lower ones)
 *  and turns once, so no leader crosses the cloth, the arm sign or the code. */
function anatomy(skin) {
  return (g, w, h) => {
    g.clearRect(0, 0, w, h); const P = skin.P; const cx = 88; const cy = h * 0.57;
    g.save(); g.translate(cx, cy); const d = paintSpec(g, skin, { code: '14 VT', side: 'union', arm: 'infantry', ech: 0, ratio: 0.8 }, { w: 160, h: 74, up: true }); g.restore();
    const sc = d.scale; const ring = P['geo.ring']; const left = cx - d.w / 2; const top = cy - d.h / 2; const bottom = cy + d.h / 2; const right = cx + d.w / 2;
    // the dot of each callout on the mark, the y of the turn, and the label
    const items = [
      { t: 'Staff', x: left + (ring + 0.6) * sc, y: top + (ring - 1.4) * sc, ty: 12 },
      { t: 'Short code', x: left + (ring + P['geo.hoist0'] + P['geo.padL'] + 8) * sc, y: cy - 0.17 * d.h, ty: 28 },
      { t: 'Cloth and fly: the side', x: right - (ring + 10) * sc, y: top + (ring + 1.5) * sc, ty: 44 },
      { t: 'Gilt line: strength', x: cx + 8 * sc, y: bottom - (ring + 2.5) * sc, ty: h - 30 },
      { t: 'Hoist band: the arm', x: left + (ring + P['geo.hoist0'] / 2) * sc, y: bottom - (ring + 0.5) * sc, ty: h - 12 },
    ];
    g.font = '600 11px "Barlow Semi Condensed", "Bahnschrift SemiCondensed", "Segoe UI", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineWidth = 1;
    const x1 = 198;
    for (const it of items) {
      g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(it.x, it.ty); g.lineTo(x1 - 8, it.ty); g.strokeStyle = 'rgba(233,201,123,0.7)'; g.stroke();
      g.beginPath(); g.arc(it.x, it.y, 2.4, 0, 6.2832); g.fillStyle = '#f3d98a'; g.fill(); g.strokeStyle = 'rgba(6,10,16,0.8)'; g.stroke();
      g.fillStyle = '#f3ecda'; g.fillText(it.t, x1, it.ty);
    }
  };
}

export const legend = {
  id: 'legend', label: 'Legend', group: 'popup-legend', enabled: (tok) => tok('popup.legend.enabled'),
  preview(api) { api.host.act('legend:legend', 'toggle'); },
  doc: 'The legend (P-12), generated from the active skin’s legend(): a pill on the map, the reading panel when opened; every row has the site’s evidence label and a swatch drawn by the skin itself.',
  toolbar: [],
  update(frame, api) {
    const tok = api.tok; const skinId = tok('skin.id'); const skin = api.engine.kernel.skins.has(skinId) ? api.engine.kernel.skins.get(skinId) : null; const rows = skin && skin.legend ? skin.legend() : [];
    const slot = tok('popup.legend.slot'); const slots = [slot, SLOT_ALT[slot]];
    const pill = { id: 'pill', level: 'compact', w: 104, h: 42, content: { label: 'Legend. Activate to open the reading panel.', blocks: [{ t: 'pill', id: 'toggle', label: 'Legend', icon: 'list', expanded: false }] } };
    // the panel: grouped rows
    const groups = []; for (const r of rows) { let g = groups.find((x) => x.ch === r.channel); if (!g) groups.push(g = { ch: r.channel, rows: [] }); g.rows.push(r); }
    const bd = api.engine.kernel.backdrops.has(tok('backdrop.id')) ? api.engine.kernel.backdrops.get(tok('backdrop.id')) : null; const real = bd && bd.caption;
    const premium = skin && skin.family === 'premium';
    const blocks = [];
    if (!rows.length) blocks.push({ t: 'p', size: 'sm', muted: true, text: 'The active skin does not publish a legend.' });
    else {
      if (premium) blocks.push({ t: 'title', text: 'How to read a mark', level: 3 }, { t: 'canvas', w: 336, h: 172, label: 'A banner with its parts named: staff, hoist band, cloth and fly, code and strength line', paint: anatomy(skin.skin) });
      for (const g of groups) { const def = CHANNELS[g.ch]; blocks.push({ t: 'title', text: def ? def.title : g.ch, level: 3 }, { t: 'swatches', rows: g.rows.map((r) => ({ swatch: r.swatch, text: def && r.text.startsWith(def.title + ': ') ? r.text.slice(def.title.length + 2) : r.text, ev: r.evidence })) }); }
      if (real) {
        blocks.push({ t: 'title', text: 'The ground', level: 3 }, { t: 'swatches', rows: [
          { swatch: 'linear-gradient(135deg, #5a6350, #343c2f 55%, #232a21)', text: bd.caption, ev: 'Measured' },
          { swatch: placeSwatch('measured'), text: 'Filled dot: a place whose position was measured against the elevation model (a hill moved to its summit)', ev: 'Measured' },
          { swatch: placeSwatch('modelled'), text: 'Open ring: the site’s own position of the place', ev: 'Modelled' },
          { swatch: placeSwatch('doubt'), text: 'Open ring with an italic name: a landmark check found no building of that name at the mark', ev: 'Contested' }] });
      }
      blocks.push({ t: 'chips', items: [ev('Computed', 'every swatch is drawn by the active skin', 'The rows are read from the active skin each time, and each swatch is painted by the skin’s own code, so they cannot describe a renderer that is not drawing.')] });
    }
    const doc = { key: 'legend', tone: 'info', kicker: 'Legend', title: skin ? `Reading the marks: ${skin.label}` : 'Legend', content: { blocks }, subjects: null, version: `${skinId}|${rows.length}|${tok('backdrop.id')}` };
    return [{ key: 'legend', kind: 'hud', tier: 'S', tone: 'info', priority: 5, slots, version: `${skinId}|${rows.length}`, forms: [pill], doc, actions: { toggle: (a, card) => { a.host.openRail('legend:legend'); void card; } } }];
  },
};
