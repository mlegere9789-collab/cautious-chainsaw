// tools/specimen.mjs - THE SPECIMEN SHEETS: every encoding of the language drawn by the skin's own draw functions (no mock-up) on the real ground, in the paper and the aerial family, at DPR 3.
// Side and arm, echelon, age, strength, identity, a crowd, the states (rest, hover, selected, arriving), the name growing out of the mark, a displaced mark with its leader and pin.
//   node tools/specimen.mjs   ->  shots/specimen-*.jpg (JPEG q92)
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, ROOT } from './lib.mjs';

async function sheetInPage({ skinId, backdropId }) {
  const S = window.__studio; const E = S.engine; E.tuning.set('skin.id', skinId); E.tuning.set('backdrop.id', backdropId);
  const skin = E.kernel.skins.get(skinId); const P = skin.skin.P; const spec = E.spec(); const dpr = 3; const kit = window.__skinKit;
  const COLS = 8; const CW = 172; const RH = 78; const groups = 5; const W = COLS * CW + 20; const H = 56 + groups * RH + 24;
  const cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:99999`; cv.id = 'specimen'; document.body.append(cv); const c = cv.getContext('2d');
  // the real ground under the specimen
  const b = globalThis.__realBackdrop; const be = E.kernel.backdrops.get(backdropId); const cam = { lng: -77.2347, lat: 39.8117, zoom: 16.4, w: W, h: H };
  c.setTransform(dpr, 0, 0, dpr, 0, 0); for (let i = 0; i < 3; i++) { const view = { w: W, h: H, camera: cam, mpp: 1, toScreen: () => [0, 0] }; be.draw(c, view, E.battle, E.tok); for (let k = 0; k < 400 && (b.animating || (b.aerial && !b.aerial.idle()) || (b.shade && !b.shade.idle())); k++) { await new Promise((r) => setTimeout(r, 20)); be.draw(c, view, E.battle, E.tok); } }
  // a paper veil so the captions read; the marks stand on the ground itself
  const ink = P['text.ink']; const halo = P['text.halo'];
  const mkTile = (o) => {
    const sz = skin.size(spec, { text: o.short, kind: o.kind || 'regiment', echelon: o.ech || 0, agg: !!o.agg, nameKind: o.nameKind || null, side: o.side, n: o.n || 1 });
    const u = o.agg ? null : { id: 'sp-' + o.short, kind: o.kind || 'regiment', arm: o.arm || 'infantry', side: o.side, inOob: !o.idOnly, parentSource: 'oob', chain: [], echelon: o.ech || 0 };
    return { key: 'sp:' + o.short + ':' + Math.random().toString(36).slice(2), kind: o.agg ? 'agg' : 'leaf', ids: o.agg ? ['a', 'b', 'c'] : [u.id], n: o.n || 1, x: 0, y: 0, px: 0, py: 0, ax: 0, ay: 0, hx: sz.hx, hy: 0, w: Math.ceil(sz.w), h: sz.h, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, travelling: false, displaced: false,
      side: o.side, arm: o.arm || (o.agg ? 'mixed' : 'infantry'), short: o.short, badge: o.agg ? String(o.n || 3) : null, nameKind: o.nameKind || null, nSides: o.nSides || null, ratio: o.ratio ?? 1, strength: 500, disposition: 'Line of Battle', selected: !!o.selected, unit: u, ageTicks: o.age || 0, ageMin: o.age || 0, ageMax: o.age || 0, moving: false, members: null, label: null };
  };
  const envOf = () => ({ dpr, zoom: 16.4, timeMs: 0, tok: E.tok, spec, data: null, camera: E.camera, size: [W, H], places: null, toScreen: () => [0, 0] });
  const draw = (t, cx, cy, n = 1) => { for (let i = 0; i < n; i++) { c.setTransform(dpr * t.scale, 0, 0, dpr * t.scale, cx * dpr, cy * dpr); c.globalAlpha = t.opacity; skin.draw.tile(c, t, envOf()); } c.globalAlpha = 1; };
  const cap = (txt, x, y) => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.font = `600 11px Inter, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.strokeStyle = halo; c.lineWidth = 3.4; c.strokeText(txt, x, y); c.fillStyle = ink; c.fillText(txt, x, y); };
  const title = (txt, y) => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.font = `600 17px "Source Serif 4", serif`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.strokeStyle = halo; c.lineWidth = 4; c.strokeText(txt, 16, y); c.fillStyle = ink; c.fillText(txt, 16, y); };
  title(`Dispatch · ${skin.label} · every encoding, drawn by the skin's own code`, 22);
  const cell = (g, i, t, caption, o = {}) => { const gx = 16 + i * CW; const gy = 56 + g * RH + 22; const cx = gx + 16 + t.hx; const cy = gy; if (o.hover) kit.setHover(t.key); else kit.setHover(null); t.x = cx; t.y = cy; t.px = cx - t.hx; t.py = cy; draw(t, cx, cy, o.n || 50); kit.setHover(null); if (o.label) { const L = { text: o.label, opacity: 1, x0: cx + t.w / 2, y0: cy - t.h / 2, x1: cx + t.w / 2 + 120, y1: cy + t.h / 2 }; t.label = L; c.setTransform(dpr, 0, 0, dpr, L.x0 * dpr, L.y0 * dpr); c.globalAlpha = 1; skin.draw.label(c, t, envOf()); } cap(caption, gx, gy + 31); };
  const U = (short, o = {}) => mkTile({ short, side: 'union', ...o }); const C = (short, o = {}) => mkTile({ short, side: 'confederate', ...o });
  let g = 0;
  [[U('14 VT'), 'Union · circle, saltire'], [U('2 PA', { arm: 'cavalry' }), 'cavalry · slash'], [U('B4US', { arm: 'artillery' }), 'artillery · dot'], [C('53 VA'), 'Confederate · square'], [C('3 GA', { arm: 'cavalry' }), 'cavalry'], [C('A1AL', { arm: 'artillery' }), 'artillery'], [mkTile({ short: '10 AL', side: 'unknown', idOnly: true }), 'contested · hatched'], [mkTile({ short: 'Both sides', side: 'mixed', agg: true, n: 6, nameKind: 'both', nSides: { union: 3, confederate: 3, unknown: 0 } }), 'both sides · half and half']].forEach(([t, k], i) => cell(g, i, t, k)); g++;
  [[U('1/3', { kind: 'battalion', ech: 1 }), 'battalion · larger'], [U('I/2/1', { kind: 'brigade', ech: 2 }), 'brigade · 1 pip'], [U('II/3', { kind: 'division', ech: 3 }), 'division · 2 pips'], [U('II', { kind: 'corps', ech: 4 }), 'corps · 3 pips'], [C('I/1/1', { kind: 'brigade', ech: 2 }), 'Confederate · point'], [mkTile({ short: "Harrow's Bde", side: 'union', agg: true, n: 5, nameKind: 'brigade' }), 'crowd of 5 · a brigade'], [mkTile({ short: 'II Corps & others', side: 'confederate', agg: true, n: 12, nameKind: 'side' }), 'crowd of 12 · a corps'], [mkTile({ short: 'Union, 1 contested', side: 'mixed', agg: true, n: 5, nameKind: 'both', nSides: { union: 4, confederate: 0, unknown: 1 } }), 'contested within a crowd']].forEach(([t, k], i) => cell(g, i, t, k)); g++;
  [0, 0.34, 0.67, 1].forEach((a, i) => cell(g, i, U('11 NY', { age: 225 * a, ageMax: 225 * a }), `Union · age ${Math.round(a * 100)}%`)); [0, 0.34, 0.67, 1].forEach((a, i) => cell(g, 4 + i, C('12 NC', { age: 225 * a }), `Confederate · age ${Math.round(a * 100)}%`)); g++;
  [1, 0.8, 0.55, 0.3, 0.05].forEach((r, i) => cell(g, i, U('8 OH', { ratio: r }), `ring · ${['4', '3', '2', '1', '0'][i]} of 4`)); cell(g, 5, U('9 MA', { idOnly: true }), 'id only · italic'); { const t = U('7 WV'); t.displaced = true; cell(g, 6, t, 'displaced · pin', { n: 50 }); c.setTransform(dpr, 0, 0, dpr, 0, 0); const gx = 16 + 6 * CW; const gy = 56 + g * RH + 22; const dcx = gx + 16; skin.draw.leader(c, t, envOf(), [dcx - 28, gy + 20], [dcx + t.hx, gy]); c.setTransform(dpr, 0, 0, dpr, (dcx - 28) * dpr, (gy + 20) * dpr); skin.draw.pin(c, t, envOf()); } g++;
  { const t0 = U('53 VA'); cell(g, 0, t0, 'at rest'); const t1 = U('53 VA'); cell(g, 1, t1, 'hover · ring, lift', { hover: true }); const t2 = U('53 VA', { selected: true }); cell(g, 2, t2, 'selected · amber'); const t3 = U('53 VA', {}); t3.entering = true; t3.scale = 0.92; t3.opacity = 0.7; cell(g, 3, t3, 'arriving · fade, grow', { n: 3 });
    const t4 = U('53 VA'); cell(g, 4, t4, 'code', { n: 50 }); const t5 = U('53 VA'); cell(g, 5, t5, 'name grown', { label: '53rd Virginia Infantry' }); const t6 = mkTile({ short: 'I/1/1', side: 'confederate', kind: 'brigade', ech: 2 }); cell(g, 6, t6, 'name grown, brigade', { label: "Armistead's Brigade" }); }
  const info = { w: W, h: H };
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return info;
}
const srv = await serve(); const b = await launch({ width: 1300, height: 560, dpr: 3 });
try {
  const sets = [['paper', 'dispatch-paper', 'real-paper'], ['aerial', 'dispatch-aerial', 'real-dim'], ['paper-cvd', 'dispatch-paper/cvd', 'real-paper'], ['aerial-contrast', 'dispatch-aerial/contrast', 'real-dim']];
  for (const [name, skinId, bd] of sets) {
    await open(b.page, `scene=fresh2&tick=556&zoom=16&style=${skinId.startsWith('dispatch-aerial') ? 'dispatch-aerial' : 'dispatch-paper'}&set=${encodeURIComponent(JSON.stringify({ 'popup.enabled': false }))}`, { steps: 40 });
    await b.page.evaluate(sheetInPage, { skinId, backdropId: bd });
    const el = await b.page.$('#specimen'); const OUTD = path.join(ROOT, 'shots', process.env.D4_ROUND || 'round-1'); fs.mkdirSync(OUTD, { recursive: true }); const file = path.join(OUTD, `specimen-${name}.jpg`); await el.screenshot({ path: file, type: 'jpeg', quality: 92 }); console.log('wrote', path.relative(ROOT, file));
  }
  if (b.errors.length) console.log('errors', b.errors.slice(0, 5));
} finally { await b.close(); srv.close(); }
