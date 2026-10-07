// specimen.mjs - the SPECIMEN SHEET of the language: every part of a mark, every state, every size and the crowd marks, drawn by the skin's own painter (skins/premium.mjs paintSpec: the code that draws the map)
// on the real ground (the basemap's aerial), so the sheet shows what the marks look like where they are used.  Built into dist/specimen.html by build.mjs; tools/specimen.mjs photographs it.
//   dist/specimen.html?ground=dark|field|paper&variant=standard|cvd|contrast
import { PREMIUM } from './skins/premium.mjs';
import { paintSpec } from './skins/premium.mjs';
import { campaignLook, makeRealGround } from './render/real-ground.mjs';
import { LOOKS } from '../../../basemap/src/looks.mjs';

const q = new URLSearchParams(location.search); const W = 1400; const H = +(q.get('h') || 1560); const dpr = +(q.get('dpr') || 2);
const GROUNDS = { dark: { look: 'campaign', lng: -77.2178, lat: 39.8143, z: 16.2 }, field: { look: 'campaign', lng: -77.2412, lat: 39.8021, z: 16.3 }, paper: { look: 'paper', lng: -77.2349, lat: 39.8113, z: 16.2 } };
const G = GROUNDS[q.get('ground') || 'dark']; const variant = q.get('variant') || 'standard';
const skinOut = PREMIUM.find((s) => s.id === (variant === 'standard' ? 'premium' : 'premium/' + variant)) || PREMIUM[0]; const skin = skinOut.skin; const P = skin.P;
const FAM = '"Barlow Semi Condensed", "Bahnschrift SemiCondensed", "Segoe UI", sans-serif'; const SERIF = '"Source Serif 4", Georgia, serif';
const light = G.look === 'paper'; const INK = light ? '#1b1f24' : '#f3ecda'; const DIM = light ? '#4b5058' : '#bab5a3'; const HALO = light ? 'rgba(244,238,224,0.9)' : 'rgba(6,9,13,0.85)';

const cv = document.getElementById('sheet'); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; const c = cv.getContext('2d'); c.scale(dpr, dpr);

function text(s, x, y, o = {}) {
  c.save(); c.font = o.font || `600 12px ${FAM}`; c.textBaseline = 'middle'; c.textAlign = o.align || 'left'; try { c.letterSpacing = o.track || '0px'; } catch { /* none */ }
  if (o.halo !== false) { c.lineJoin = 'round'; c.lineWidth = 3.4; c.strokeStyle = HALO; c.strokeText(s, x, y); }
  c.fillStyle = o.color || INK; c.fillText(s, x, y); c.restore();
}
const title = (s, x, y) => text(s.toUpperCase(), x, y, { font: `700 12px ${FAM}`, track: '1.6px', color: light ? '#7a5a0c' : '#e9c97b' });
const label = (s, x, y) => text(s, x, y, { font: `500 11.5px ${FAM}`, color: DIM, align: 'center' });
const rule = (x0, x1, y) => { c.save(); c.strokeStyle = light ? 'rgba(122,90,12,0.45)' : 'rgba(233,201,123,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.restore(); };
/** a mark at centre (x, y), scaled k */
function mark(x, y, spec, k = 1.5) { c.save(); c.translate(x, y); c.scale(k, k); const r = paintSpec(c, skin, spec); c.restore(); return { w: r.w * k, h: r.h * k }; }

function sheet() {
  const L = 40; const R = W - 40;
  text('Strategy Premium', L, 34, { font: `600 26px ${SERIF}`, halo: true }); text('the language of the marks, drawn by the code that draws the map (skins/premium.mjs) on the real ground', L, 62, { font: `500 13.5px ${FAM}`, color: DIM });
  text(variant === 'standard' ? 'standard palette' : variant === 'cvd' ? 'colour-blind-safe palette' : 'high-contrast palette', R, 34, { font: `600 12px ${FAM}`, color: DIM, align: 'right', track: '1px' });

  // 1. anatomy ----------------------------------------------------------------------------------------------------------------------------------------------
  let y = 100; title('1  Anatomy of a unit mark', L, y); rule(L, R, y + 14);
  const ax = 250; const ay = y + 112; const k = 3.4; const r = mark(ax, ay, { code: '14 VT', side: 'union', arm: 'infantry', ech: 0, ratio: 0.8 }, k);
  const left = ax - r.w / 2; const top = ay - r.h / 2; const bottom = ay + r.h / 2; const ring = P['geo.ring'] * k; const hoist = P['geo.hoist0'] * k;
  const disc = (n, px, py, dy) => { c.save(); c.strokeStyle = light ? 'rgba(122,90,12,0.9)' : 'rgba(243,217,138,0.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + dy * 15); c.stroke(); c.beginPath(); c.arc(px, py, 2.4, 0, 6.2832); c.fillStyle = '#f3d98a'; c.fill(); c.strokeStyle = 'rgba(6,10,16,0.8)'; c.stroke();
    const cy = py + dy * 24; c.beginPath(); c.arc(px, cy, 11, 0, 6.2832); c.fillStyle = light ? '#7a5a0c' : '#f3d98a'; c.fill(); c.strokeStyle = 'rgba(6,10,16,0.8)'; c.stroke(); c.fillStyle = light ? '#fff' : '#20180a'; c.font = `700 13px ${FAM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), px, cy + 0.5); c.restore(); };
  disc(1, left + ring + 1, top + ring - 3, -1); disc(2, left + ring + hoist / 2, top + ring + 2, -1); disc(3, left + ring + hoist + 26 * k, top + ring + 2, -1);
  disc(4, ax + r.w / 2 - 10 * k, bottom - ring - 2, 1); disc(5, ax + 4 * k, bottom - ring - 3 * k, 1); disc(6, left + 6 * k, bottom - 1, 1);
  const rows = [['Staff and finial', 'a gilt pole; formation standards add the ball'], ['Hoist band: the arm', 'crossed muskets = infantry, sabre = cavalry, gun = artillery'], ['Short code', 'Barlow Semi Condensed 600 at 11 px: two sizes, one numeral style'],
    ['Cloth and fly: the side', 'blue and notched = Union, red and pointed = Confederate, gold = not decided'], ['Gilt line: strength', 'this keyframe over the unit\u2019s reference strength (Modelled)'], ['Ground shadow', 'light from the north-west, so it falls south-east']];
  rows.forEach((rw, i) => { const ry = y + 36 + i * 36; c.save(); c.beginPath(); c.arc(560, ry, 11, 0, 6.2832); c.fillStyle = light ? '#7a5a0c' : '#f3d98a'; c.fill(); c.fillStyle = light ? '#fff' : '#20180a'; c.font = `700 13px ${FAM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), 560, ry + 0.5); c.restore();
    text(rw[0], 582, ry - 7, { font: `700 12.5px ${FAM}` }); text(rw[1], 582, ry + 8, { font: `500 12px ${FAM}`, color: DIM }); });
  text('drawn here at 3.4 times its size; on the map it is 63 x 26 px', ax, y + 222, { font: `500 11.5px ${FAM}`, color: DIM, align: 'center' });
  // the same mark at true size on three grounds is the final section

  // 2. size = echelon ----------------------------------------------------------------------------------------------------------------------------------------
  y = 360; title('2  Size tells the formation', L, y); rule(L, R, y + 14);
  const sizes = [['Regiment or battery', { code: '14 VT', ech: 0, arm: 'infantry' }], ['Battalion', { code: '2 ME', ech: 1, arm: 'artillery' }], ['Brigade standard', { code: 'II/2/1', ech: 2, arm: 'formation' }], ['Division standard', { code: 'II/2', ech: 3, arm: 'formation' }], ['Corps standard', { code: 'II', ech: 4, arm: 'formation' }], ['Crowd of 7 records', { code: 'II/2/1', agg: true, count: '7' }]];
  sizes.forEach(([lb, sp], i) => { const x = L + 100 + i * 220; mark(x, y + 66, { side: 'union', ratio: 0.9, ...sp }, 2); label(lb, x, y + 120); });
  text('body heights 22, 24, 30, 34, 38 px; the crowd mark is the heaviest object on the map and carries a gilt count', R, y + 144, { font: `500 11.5px ${FAM}`, color: DIM, align: 'right' });

  // 3. side x arm --------------------------------------------------------------------------------------------------------------------------------------------
  y = 540; title('3  Side by arm (fresh report)', L, y); rule(L, R, y + 14);
  const sides = [['union', 'Union'], ['confederate', 'Confederate'], ['unknown', 'Not decided (Contested)']]; const arms = [['infantry', '14 VT', 0, 'Infantry'], ['cavalry', 'CAV/2', 0, 'Cavalry'], ['artillery', '3 NY', 0, 'Artillery'], ['formation', 'II/2/1', 2, 'Brigade (no arm)'], ['formation', 'II/2', 3, 'Division (no arm)']];
  sides.forEach(([sd, nm], ri) => { text(nm, L, y + 62 + ri * 72, { font: `600 12.5px ${FAM}`, color: DIM }); arms.forEach(([arm, code, ech, lb], ci) => { const x = L + 300 + ci * 210; mark(x, y + 62 + ri * 72, { side: sd, arm, code, ech, ratio: 0.8 }, 1.6); if (ri === 2) label(lb, x, y + 62 + 2 * 72 + 34); }); });

  // 4. states ------------------------------------------------------------------------------------------------------------------------------------------------
  y = 840; title('4  States', L, y); rule(L, R, y + 14);
  const st = [['Fresh report', {}], ['Carried, half a day', { carried: 0.5 }], ['Carried, a day or more', { carried: 1 }], ['Identity from id only', { idOnly: true }], ['In transit (flutter)', { flutter: 1.1 }], ['Hover', { hover: true }], ['Selected', { selected: true }]];
  st.forEach(([lb, o], i) => { const x = L + 80 + i * 190; mark(x, y + 66, { code: '14 VT', side: 'confederate', arm: 'infantry', ratio: 0.7, ...o }, 1.7); label(lb, x, y + 112); });
  const stren = [1, 0.75, 0.5, 0.25]; text('Strength line (Modelled)', L, y + 150, { font: `600 12.5px ${FAM}`, color: DIM }); stren.forEach((v, i) => { const x = L + 300 + i * 190; mark(x, y + 150, { code: '82 NY', side: 'union', arm: 'infantry', ratio: v }, 1.7); label(Math.round(v * 100) + ' %', x, y + 184); });

  // 5. crowds ------------------------------------------------------------------------------------------------------------------------------------------------
  y = 1060; title('5  Crowd marks: no unit is ever hidden', L, y); rule(L, R, y + 14);
  const crowds = [['One formation', { code: 'II/2/1', count: '5', side: 'union' }], ['One side', { code: 'Union', count: '12', side: 'union' }], ['One side', { code: 'Confederate', count: '8', side: 'confederate' }], ['Both sides', { code: 'Both sides', count: '14', side: 'mixed', sides: ['union', 'confederate'] }], ['Contested units', { code: 'Contested', count: '3', side: 'unknown' }], ['A hundred records', { code: 'Union', count: '100', side: 'union' }]];
  crowds.forEach(([lb, o], i) => { const x = L + 100 + i * 220; mark(x, y + 56, { agg: true, ...o }, 1.7); label(lb, x, y + 104); });

  // 6. one object, growing ----------------------------------------------------------------------------------------------------------------------------------
  y = 1200; title('6  One object: the name unfolds into the same banner', L, y); rule(L, R, y + 14);
  [0, 0.25, 0.5, 0.75, 1].forEach((nk, i) => { const x = L + 130 + i * 255; mark(x, y + 56, { code: '14 VT', name: '14th Vermont Volunteer Infantry', nameK: nk, side: 'union', arm: 'infantry', ratio: 0.9 }, 1.6); label(nk === 0 ? 'zoom below 15.6' : nk === 1 ? 'zoom 16.1 and beyond, or pointed at' : Math.round(nk * 100) + ' %', x, y + 124); });
  mark(L + 130, y + 175, { code: 'II/2/1', name: '1st Brigade, 2nd Division, 2nd Corps', nameK: 1, side: 'union', arm: 'formation', ech: 2, ratio: 0.9 }, 1.6); mark(L + 600, y + 175, { code: '3 GA', name: '3rd Georgia Infantry', nameK: 1, side: 'confederate', arm: 'infantry', ratio: 0.6, carried: 1 }, 1.6);

  // 7. true size --------------------------------------------------------------------------------------------------------------------------------------------
  y = 1450; title('7  At true size (1 x), as the map draws them', L, y); rule(L, R, y + 14);
  const real = [{ code: '14 VT', side: 'union', arm: 'infantry' }, { code: '4 AL', side: 'confederate', arm: 'infantry' }, { code: 'CAV/2', side: 'union', arm: 'cavalry', carried: 1 }, { code: '3 NY', side: 'union', arm: 'artillery' }, { code: 'II/2/1', side: 'union', arm: 'formation', ech: 2 }, { code: 'III/1/3', side: 'confederate', arm: 'formation', ech: 2, carried: 0.6 }, { code: 'Union', agg: true, count: '7', side: 'union' }, { code: 'Both sides', agg: true, count: '12', side: 'mixed', sides: ['union', 'confederate'] }, { code: '10 AL', side: 'unknown', arm: 'infantry', idOnly: true }];
  real.forEach((sp, i) => mark(L + 70 + i * 150, y + 50, { ratio: 0.8, ...sp }, 1));
}

async function main() {
  const ground = makeRealGround({ base: q.get('tiles') || undefined }); campaignLook(); const look = LOOKS[G.look]; const cam = { lng: G.lng, lat: G.lat, zoom: G.z, w: W, h: H };
  const paintGround = () => { c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0); const r = ground.backdrop.draw(c, cam, look, { places: false, labels: false, fade: false, direct: false }); c.restore(); return r; };
  for (let i = 0; i < 400; i++) { const r = paintGround(); if (!r.pending && !r.animating) { if (i > 3) break; } await new Promise((res) => setTimeout(res, 60)); }
  paintGround(); c.save(); c.fillStyle = light ? 'rgba(246,240,226,0.34)' : 'rgba(6,9,13,0.38)'; c.fillRect(0, 0, W, H); c.restore();      // a veil keeps the labels readable on any ground
  sheet(); document.body.dataset.ready = '1';
}
main();
