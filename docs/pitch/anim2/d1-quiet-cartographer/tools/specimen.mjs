// tools/specimen.mjs - the SPECIMEN SHEET: every mark and every state of the Quiet Cartographer, drawn by the skin's own draw.tile on real units of the real data (not a mock-up), on the flat night and day
// grounds, at 1x and at 4x for the anatomy.  shots/specimen-night.png and shots/specimen-day.png (DPR 2).  The lettering is the skin's own (QC Sans).
//   node tools/specimen.mjs
import path from 'node:path';
import { open, setScene, shot, D1, stopServer } from './lib.mjs';

const SPEC_JS = (style) => `(async () => {
  const S = window.__studio; const E = S.engine; const K = window.__skinKit; const skin = E.kernel.skins.get(E.tok('skin.id')); const spec = E.spec(); const U = (id) => E.battle.units.get(id);
  const day = ${JSON.stringify(style === 'day')}; const ground = day ? '#dfe1dd' : '#26323f'; const ink = day ? '#14202c' : '#eef3f8'; const muted = day ? '#46525f' : '#aab6c4'; const rule = day ? 'rgba(20,32,44,.18)' : 'rgba(255,255,255,.16)';
  const find = (f) => [...E.battle.units.values()].find(f);
  const inf = { union: U('U-71PA'), confederate: U('C-53VA') }; const cav = { union: find((u) => u.arm === 'cavalry' && u.side === 'union' && u.kind === 'regiment'), confederate: find((u) => u.arm === 'cavalry' && u.side === 'confederate' && u.kind === 'regiment') };
  const art = { union: U('U-ART-A4US'), confederate: find((u) => u.arm === 'artillery' && u.side === 'confederate' && u.kind === 'battery') }; const unk = find((u) => u.side === 'unknown' && u.kind === 'regiment');
  const idonly = find((u) => !u.inOob && u.side === 'confederate' && u.kind === 'regiment'); const brig = { union: U('U-II-2-1'), confederate: U('C-I-3-3') }; const div = { union: U('U-II-2'), confederate: U('C-I-3') }; const corps = { union: U('U-II'), confederate: U('C-I') };
  const cv = document.createElement('canvas'); const W = 1500; const H = 1190; const dpr = devicePixelRatio; cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'position:fixed;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:99999;background:' + ground; document.body.append(cv);
  const c = cv.getContext('2d'); c.fillStyle = ground; c.fillRect(0, 0, cv.width, cv.height);
  const F = '"QC Sans", "Liberation Sans", sans-serif'; let n = 0; const text = (s, x, y, o = {}) => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.font = (o.w || 400) + ' ' + (o.s || 11) + 'px ' + F; c.fillStyle = o.c || ink; c.textBaseline = 'alphabetic'; c.textAlign = o.a || 'left'; c.fillText(s, x, y); };
  const mk = (u, o = {}) => { const age = o.age ?? 0; const sel = !!o.sel; const z = o.zoom ?? 16.5; const sz = skin.sizer.leaf(spec, u, z, sel); return { key: 'sp' + (n++), kind: 'leaf', ids: [u.id], n: 1, w: sz.w, h: sz.h, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, side: u.side, arm: u.arm, short: u.short, fname: null, badge: null, nameKind: null, ratio: o.ratio ?? 1, strength: 100, disposition: 'Line of Battle', selected: sel, unit: u, ageTicks: age, ageMin: age, ageMax: age, moving: false, members: null, displaced: false, x: 0, y: 0, ax: 0, ay: 0, label: null, travelling: false }; };
  const mkAgg = (o) => { const sz = skin.sizer.agg(spec, { short: o.short, name: o.name || null, badge: o.badge, kind: o.kind, side: o.side, n: +o.badge, zoom: o.zoom ?? 16.5 }); return { key: 'sp' + (n++), kind: 'agg', ids: ['a', 'b'], n: +o.badge, w: sz.w, h: sz.h, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, side: o.side, arm: 'mixed', short: o.short, fname: o.name || null, badge: o.badge, nameKind: o.kind, ratio: 1, strength: 100, disposition: null, selected: false, unit: null, ageTicks: o.age ?? 0, ageMin: 0, ageMax: o.age ?? 0, moving: false, members: [], displaced: false, x: 0, y: 0, ax: 0, ay: 0, label: null, travelling: false }; };
  const env = (z, S4) => ({ dpr: dpr * S4, zoom: z, timeMs: 0, tok: E.tok, spec, view: { dx: 0, dy: 0 } });
  const put = (t, x, y, S4 = 1, z = 16.5, hover = false) => { if (hover) K.setHover(t.key); else K.setHover(null); c.save(); c.setTransform(dpr * S4, 0, 0, dpr * S4, x * dpr / S4 * S4, y * dpr); c.translate(x / S4 * 0, 0); c.restore(); c.save(); c.setTransform(dpr * S4, 0, 0, dpr * S4, x * dpr, y * dpr); c.globalAlpha = 1; skin.draw.tile(c, t, env(z, S4)); c.restore(); K.setHover(null); return t; };
  const row = (title, y) => { text(title, 28, y, { w: 700, s: 13 }); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.strokeStyle = rule; c.lineWidth = 1; c.beginPath(); c.moveTo(28, y + 8.5); c.lineTo(W - 28, y + 8.5); c.stroke(); };
  // items: [{ t, S4, z, caption, caption2, hover }] laid out left to right on one baseline y, each item centred in its own width, captions below
  const lay = (items, y, cap) => { let x = 40; for (const it of items) { const w = Math.max(it.t.w * it.S4, 96); put(it.t, x + w / 2, y, it.S4, it.z, it.hover); text(it.caption, x + w / 2, cap, { c: muted, a: 'center' }); if (it.caption2) text(it.caption2, x + w / 2, cap + 14, { c: muted, a: 'center' }); x += w + 34; } return x; };
  text('Quiet Cartographer, ' + (day ? 'day atlas' : 'night survey') + ': every mark and state, drawn by the skin on real units (scale noted under each; 1x is the real size)', 28, 34, { w: 700, s: 16 });
  text('Real records: 71st Pennsylvania, 53rd Virginia, the brigades of Harrow and Armistead, II Corps. The ground is flat on purpose: the marks on the real aerial are in the scene pictures.', 28, 54, { c: muted });
  row('Arm is the shape, side is the colour (fresh)', 92);
  const r1 = []; for (const sd of ['union', 'confederate']) for (const [nm, pick] of [['infantry', inf], ['cavalry', cav], ['artillery', art]]) r1.push({ t: mk(pick[sd], { zoom: 14.5 }), S4: 3, z: 14.5, caption: nm, caption2: sd + ' (3x)' }); r1.push({ t: mk(unk, { zoom: 14.5 }), S4: 3, z: 14.5, caption: 'side unknown', caption2: 'hatched, never a side colour (3x)' });
  lay(r1, 150, 196);
  row('One device for a stale fix: the mark hollows (Computed from the age of the latest keyframe)', 242);
  const r2 = []; for (const [nm, age] of [['fresh: 0 ticks', 0], ['half a day: 168', 168], ['carried: 225 and more', 260]]) for (const sd of ['union', 'confederate']) r2.push({ t: mk(sd === 'union' ? inf.union : inf.confederate, { age, zoom: 14.5 }), S4: 3, z: 14.5, caption: nm, caption2: sd + ' (3x)' });
  r2.push({ t: mk(idonly, { zoom: 14.5 }), S4: 3, z: 14.5, caption: 'italic code: id only', caption2: 'no order-of-battle record (3x)' });
  lay(r2, 304, 350);
  row('Hover and selection (3x): the mark grows its name and, selected, the strength hairline (Modelled)', 392);
  { const h = mk(inf.union, { zoom: 14.5 }); const sl = mk(inf.union, { zoom: 14.5, sel: true, ratio: 0.62 }); lay([{ t: h, S4: 3, z: 14.5, hover: true, caption: 'hover', caption2: 'a faint ring' }, { t: sl, S4: 3, z: 14.5, caption: 'selected, strength 62 %', caption2: 'ring, name, hairline' }, { t: mk(inf.union, { zoom: 16.5 }), S4: 3, z: 16.5, caption: 'zoom 16.5, not selected', caption2: 'the name has grown in' }], 450, 496); }
  row('The same mark grows with the map (1x, the real size): code only, then the name; a formation names itself earlier', 538);
  { let x = 40; for (const z of [13, 14, 15, 16.5]) { const a = mk(inf.union, { zoom: z }); put(a, x + a.w / 2, 580, 1, z); const b = mk(brig.union, { zoom: z }); put(b, x + b.w / 2, 612, 1, z); const d = mk(div.union, { zoom: z }); put(d, x + d.w / 2, 646, 1, z); const k = mk(corps.union, { zoom: z }); put(k, x + k.w / 2, 682, 1, z); text('zoom ' + z, x, 716, { c: muted }); x += 360; } }
  row('Formations are standards; the echelon is the size: brigade, division, corps (3x)', 750);
  { const r = []; for (const sd of ['union', 'confederate']) for (const [nm, pick] of [['brigade', brig], ['division', div], ['corps', corps]]) { const t = mk(pick[sd], { zoom: 14.5 }); r.push({ t, S4: 2, z: 14.5, caption: nm, caption2: sd + ' (2x)' }); } lay(r, 810, 856); }
  row('A crowd merges into a standard that says what it stands for, and carries the count (Computed: placement records, never men) (2x)', 896);
  { const r = []; for (const [nm, o] of [['one formation', { short: 'II/2/1', name: "Harrow's Bde", badge: '4', kind: 'brigade', side: 'union' }], ['a corps', { short: 'II', name: '2nd Corps', badge: '9', kind: 'corps', side: 'union' }], ['both sides', { short: 'Both sides', badge: '12', kind: 'contact', side: 'mixed' }], ['one side, several corps', { short: 'I, II Corps +2', badge: '27', kind: 'scope', side: 'confederate' }], ['carried forward', { short: 'XI Corps', badge: '6', kind: 'scope', side: 'union', age: 300 }]]) r.push({ t: mkAgg(o), S4: 2, z: 16.5, caption: nm }); lay(r, 952, 998); }
  row('A displaced mark keeps its true position: a pin and a hairline (drawn when the mark is more than 18 px away; always on hover or selection)', 1040);
  { const t = mk(inf.union, { zoom: 14.5 }); put(t, 150, 1100, 2, 14.5); c.setTransform(dpr, 0, 0, dpr, 0, 0); const col = day ? '#14202c' : '#f7fafd'; c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(70, 1136); c.lineTo(122, 1108); c.stroke(); c.beginPath(); c.arc(70, 1136, 3, 0, 6.3); c.fillStyle = col; c.fill(); text('true position (Modelled)', 40, 1164, { c: muted }); text('the mark stands at most ' + E.tok('layout.dMaxPx') + ' px from it; beyond that it merges into a standard', 300, 1110, { c: muted }); }
  return { n };
})()`;

for (const style of ['night', 'day']) {
  const s = await open({ dpr: 2, profile: 'specimen', w: 1500, h: 1200 });
  try {
    await setScene(s.page, { tick: 551, lat: 39.8117, lng: -77.2347, zoom: 16.5, safe: false, popups: false, style: style === 'day' ? 'day' : null, steps: 40 });
    await s.page.evaluate(() => { window.__skinKit.setClock({ now: () => 1e7 }); });
    const r = await s.page.evaluate(SPEC_JS(style));
    await s.page.waitForTimeout(300);
    await shot(s.page, path.join(D1, 'shots', `specimen-${style}.png`), { clip: { x: 0, y: 0, width: 1500, height: 1190 } });
    console.log('specimen', style, JSON.stringify(r), s.errors.filter((e) => !/404/.test(e)).slice(0, 2));
  } finally { await s.close(); }
}
await stopServer();
