// Round 3 (2026-10-31) node tests for the figure models: strand cards, skin maps, the shaded rasteriser, eyes, cloth folds, horse LODs, reins, crew posts and the new data files.
//   node --test docs/battle-theatre/app/tests/figures3d-round3.test.mjs      (no browser, no GPU)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { FigureLibrary } from '../src/figures3d/library.mjs';
import { Mesh } from '../src/figures3d/meshkit.mjs';
import { MAT, GLOBAL_MATERIALS } from '../src/figures3d/palette.mjs';
import { headParams, N_HEADS } from '../src/figures3d/head.mjs';
import { bakeHairAtlas, hairAtlasHash, strandTexel, HAIR_TEX } from '../src/figures3d/hairtex.mjs';
import { bakeHeadMaps, skinLook, SKIN_MAP_FLAG, ageYears } from '../src/figures3d/skinmap.mjs';
import { renderShaded } from '../src/figures3d/shaded.mjs';
import { createEnv } from '../src/figures3d/shader.mjs';
import { REIN_HAND } from '../src/figures3d/horse.mjs';
import { TEX_LAYERS, layerIndex } from '../src/figures3d/texmaps.mjs';
import { crewPosts } from '../src/anim3d/drill-tables.mjs';
import { skinMatrices, poseFromClip } from '../tools/fig-anim-pose.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(here, '..'), DATA = path.join(APP, 'data/figures3d'), lib = new FigureLibrary();
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

test('strand cards: the hair atlas is deterministic with coverage-preserving mips; the variants have the intended fibre structure (dense base nearly opaque, straight and curly sparse, tips thin out, the single fibre tapers)', () => {
  const a = bakeHairAtlas(), b = bakeHairAtlas(); assert.equal(hairAtlasHash(a), hairAtlasHash(b)); assert.equal(a.length, 8); assert.equal(a[0].length, HAIR_TEX.mips);
  const cov = (lv, thr = 127) => { let n = 0; for (let i = 0; i < lv.length; i += 4) if (lv[i] > thr) n++; return n / (lv.length / 4); };
  for (let v = 0; v < 8; v++) { const c0 = cov(a[v][0]); for (let m = 1; m < 4; m++) assert.ok(Math.abs(cov(a[v][m]) - c0) < 0.15 + 0.2 * c0, `variant ${v} mip ${m} coverage ${cov(a[v][m])} vs ${c0}`); }
  assert.ok(cov(a[0][0]) > 0.97, 'dense ' + cov(a[0][0])); assert.ok(cov(a[1][0]) > 0.15 && cov(a[1][0]) < 0.6, 'straight ' + cov(a[1][0])); assert.ok(cov(a[3][0]) > 0.1 && cov(a[3][0]) < 0.6);
  const rowCov = (lv, y0, y1) => { let n = 0, t = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < HAIR_TEX.w; x++) { t++; if (lv[(y * HAIR_TEX.w + x) * 4] > 127) n++; } return n / t; };
  assert.ok(rowCov(a[1][0], 460, 512) < 0.8 * rowCov(a[1][0], 20, 72), 'tips thin out'); assert.ok(rowCov(a[6][0], 460, 512) < 0.5 * rowCov(a[6][0], 40, 90), 'single fibre tapers');
  assert.equal(strandTexel(2, 0.37, 0.4).length, 3);
});

test('hair and beards are strand cards at LOD0: card materials with coverage and variant bytes, soft (partial) coverage at the edge, flyaway ribbons, finite metre UV, within the triangle budgets', () => {
  for (const id of ['hair:0', 'hair:1', 'hair:3', 'hair:7', 'beard:3', 'beard:4', 'beard:6']) {
    const m = lib.mesh(id, 0).finalize(); assert.ok(m.meta.cards, id + ' cards'); const mats = new Set(m.mat); assert.ok(mats.has(MAT.HAIR_CARD) || mats.has(MAT.BEARD_CARD), id);
    let partial = 0, full = 0; const variants = new Set(); for (let i = 0; i < m.nv; i++) { const c = m.flags[i] & 31; variants.add(m.flags[i] >> 5); if (c > 0 && c < 31) partial++; if (c === 31) full++; }
    assert.ok(partial > 0.02 * m.nv, `${id} soft edge: ${partial} partial of ${m.nv}`); assert.ok(full > 0.1 * m.nv); assert.ok(variants.has(6), id + ' flyaway ribbons, variants ' + [...variants]);
    for (const x of m.uv) assert.ok(Number.isFinite(x)); assert.ok(m.nt < 5200, id + ' ' + m.nt);
  }
  assert.ok(lib.mesh('hair:6', 0).finalize().flags.some(f => (f >> 5) === 2), 'long styles hang locks');
});

test('the shaded rasteriser: an alpha-to-coverage card covers a fraction of a solid quad and has soft (partial) pixels, a plate casts a shadow, and a render is deterministic', () => {
  const pal = GLOBAL_MATERIALS.map(r => [r[0], r[1], r[2]]), env = createEnv({ palette: pal });
  const quad = (mat, flag) => { const m = new Mesh('q'), sk = [[0, 1]]; const a = m.vert([-0.02, 0, 0], [0, 0, 1], 0, 0, mat, sk, flag), b = m.vert([0.02, 0, 0], [0, 0, 1], 0.026, 0, mat, sk, flag), c = m.vert([0.02, 0.04, 0], [0, 0, 1], 0.026, 0.055, mat, sk, flag), d = m.vert([-0.02, 0.04, 0], [0, 0, 1], 0, 0.055, mat, sk, flag); m.tri(a, b, c); m.tri(a, c, d); return m.finalize(); };
  const card = quad(MAT.HAIR_CARD, 31 | (1 << 5)), solid = quad(MAT.COAT, 0), o = { w: 120, h: 120, ppm: 2400, cy: 0.02, ss: 3, env, bg: [0, 0, 0] };
  const rc = renderShaded([card], o), rs = renderShaded([solid], o);
  const lit = img => { let n = 0, part = 0; for (let i = 0; i < img.w * img.h; i++) { const v = img.rgba[i * 4] + img.rgba[i * 4 + 1] + img.rgba[i * 4 + 2]; if (v > 6) n++; if (v > 20 && v < 150) part++; } return { n, part }; };
  const lc = lit(rc), ls = lit(rs); assert.ok(lc.n < 0.9 * ls.n && lc.n > 0.15 * ls.n, `card ${lc.n} vs solid ${ls.n}`); assert.ok(lc.part > 30, 'soft edges ' + lc.part);
  assert.equal(sha(Buffer.from(renderShaded([card], o).rgba)), sha(Buffer.from(rc.rgba)), 'deterministic');
  const big = quad(MAT.COAT, 0), plate = quad(MAT.COAT, 0); for (let i = 0; i < plate.nv; i++) { plate.pos[i * 3 + 2] += 0.03; plate.pos[i * 3] *= 0.4; plate.pos[i * 3 + 1] = plate.pos[i * 3 + 1] * 0.4 + 0.012; }
  const withS = renderShaded([big, plate], { ...o, ss: 2 }), noS = renderShaded([big, plate], { ...o, ss: 2, env: createEnv({ palette: pal, shadows: false }) }); let d = 0; for (let i = 0; i < withS.w * withS.h; i++) d = Math.max(d, noS.rgba[i * 4] - withS.rgba[i * 4]);
  assert.ok(d > 15, 'shadow darkens by ' + d);
});

test('skin maps: deterministic per head, older heads carry more creases, stubble covers the chin and not the forehead, ages span 17 to 45 years, the skin grid carries flag 64, head-maps.json is current', () => {
  let yi = 0, oi = 0; for (let i = 0; i < N_HEADS; i++) { const a = headParams(i).age; if (a < headParams(yi).age) yi = i; if (a > headParams(oi).age) oi = i; }
  const ys = headParams(yi), os = headParams(oi); assert.ok(ageYears({ age: 0 }) === 17 && ageYears({ age: 1 }) === 45); assert.ok(os.age > ys.age + 0.3, `ages ${ys.age} ${os.age}`);
  const m1 = bakeHeadMaps(os, 256, 128), m2 = bakeHeadMaps(os, 256, 128), mY = bakeHeadMaps(ys, 256, 128); assert.equal(m1.sha256, m2.sha256);
  const cavSum = m => { let s = 0; for (let i = 0; i < m.w * m.h; i++) s += 255 - m.nr[i * 4 + 3]; return s; }; assert.ok(cavSum(m1) > cavSum(mY), 'older head has more cavity (creases)');
  const at = (m, th, ph, ch) => m.am[(Math.round(th / Math.PI * (m.h - 1)) * m.w + Math.round((ph + Math.PI) / (2 * Math.PI) * (m.w - 1))) * 4 + ch];
  let fh = 0, ch = 0; for (let th = 1.25; th < 1.45; th += 0.02) fh = Math.max(fh, at(m1, th, 0, 2)); for (let th = 2.35; th < 2.6; th += 0.02) ch = Math.max(ch, at(m1, th, 0, 2)); assert.ok(ch > 60 && fh < 20, `stubble chin ${ch} forehead ${fh}`);
  const f = lib.mesh('head:3', 0).finalize(); assert.ok(f.flags.filter(x => x === SKIN_MAP_FLAG).length > 1500, 'skin grid flag 64'); assert.ok(skinLook(os).years >= 17 && skinLook(os).years <= 45);
  const J = JSON.parse(fs.readFileSync(path.join(DATA, 'head-maps.json'), 'utf8')); assert.equal(J.heads_hashes.length, N_HEADS); assert.equal(bakeHeadMaps(headParams(1), 512, 256).sha256, J.heads_hashes[1].sha256, 'head-maps.json current');
});

test('eyes are shaded with a radial iris, a limbal ring and a wet highlight: limbal ring darker than the mid iris, collarette lighter than the inner iris, the cornea reflects a window as a bright point, the sclera darkens toward the lids', () => {
  const pal = GLOBAL_MATERIALS.map(r => [r[0], r[1], r[2]]); pal[MAT.IRIS] = [79, 111, 147]; const env = createEnv({ palette: pal }), out = [0, 0, 0], lum = o => 0.3 * o[0] + 0.59 * o[1] + 0.11 * o[2];
  const frag = (mat, th, ph, n) => ({ mat, u: ph * 0.012, v: th * 0.012, n, t: [1, 0, 0], b: [0, 1, 0], tOK: true, view: [0, 0, 1], pos: [0, 0, 0], rest: [0, 0, 0], flags: 0, vr: 0, cov: 0, fp: 0.0002, shadow: 1 });
  const L = (th, ph) => { env.shade(frag(MAT.IRIS, th, ph, [0, 0, 1]), out); return lum(out); };
  let mid = 0, limb = 0, coll = 0, inner = 0; for (let k = 0; k < 24; k++) { const ph = k / 24 * 6.28; mid += L(0.30, ph); limb += L(0.48, ph); coll += L(0.23, ph); inner += L(0.12, ph); }
  assert.ok(limb < 0.6 * mid, `limbal ${limb} mid ${mid}`); assert.ok(coll > inner, 'collarette'); assert.ok(mid > 0);
  const hv = [-0.15, 0.55, 0.82], l = Math.hypot(...hv), w = [hv[0] / l, hv[1] / l, hv[2] / l], h2 = [w[0], w[1], w[2] + 1], hl = Math.hypot(...h2), nrm = [h2[0] / hl, h2[1] / hl, h2[2] / hl];
  env.shade(frag(MAT.IRIS, 0.3, 1, nrm), out); const hi = lum(out); env.shade(frag(MAT.IRIS, 0.3, 1, [0, 0, 1]), out); assert.ok(hi > 3 * lum(out), `highlight ${hi} vs ${lum(out)}`);
  env.shade(frag(MAT.EYE_WHITE, 0.4, 0, [0, 0, 1]), out); const wMid = lum(out); env.shade(frag(MAT.EYE_WHITE, 1.4, 0, [0, 0, 1]), out); assert.ok(lum(out) < wMid, 'sclera darkens toward the lids');
});

test('cloth: coat, sleeves and trousers carry wrinkle bytes (elbow, waist, shoulder, knee, groin, boot break) and vertical drape bytes; the cloth_folds layer exists; the skirt silhouette ripples', () => {
  for (const id of ['coat:sack', 'coat:frock', 'trousers:straight:0:0:M', 'trousers:baggy:0:0:S']) { const m = lib.mesh(id, 0).finalize(); let n = 0, vert = 0; for (let i = 0; i < m.nv; i++) { if ((m.flags[i] & 63) > 8) n++; if (m.flags[i] & 128) vert++; } assert.ok(n > 0.04 * m.nv, `${id} wrinkle bytes ${n}/${m.nv}`); if (id.startsWith('coat')) assert.ok(vert > 0.05 * m.nv, id + ' vertical drape bytes'); }
  assert.ok(TEX_LAYERS.some(l => l.name === 'cloth_folds') && layerIndex.cloth_folds === 17);
  const coat = lib.mesh('coat:sack', 0).finalize(); let lo = 9, hi = -9; for (let i = 0; i < coat.nv; i++) { const y = coat.pos[i * 3 + 1]; if (y > 0.75 && y < 0.95 && Math.abs(coat.pos[i * 3]) > 0.1) { const r = Math.hypot(coat.pos[i * 3], coat.pos[i * 3 + 2]); lo = Math.min(lo, r); hi = Math.max(hi, r); } } assert.ok(hi - lo > 0.05, 'skirt silhouette ripple ' + (hi - lo));
});

test('horse LOD1 and LOD2 are smooth within the triangle budgets; the reins pass through the bridle fist; the rein socket sits on the clip palm socket; the hand mesh is within 3 cm of the fist centre', () => {
  // smoothness: the trunk of LOD1 has 10 stations and LOD2 6 along the back (round 2 had 5 and 4 raw table rows: long flat panels), and the share of coat edges whose end normals differ by more than 55 degrees stays low
  const stations = m => { const zs = new Set(); for (let i = 0; i < m.nv; i++) if (m.mat[i] === MAT.HORSE_COAT && m.pos[i * 3 + 1] > 1.2 && m.pos[i * 3 + 2] > -0.9 && m.pos[i * 3 + 2] < 0.8) zs.add(Math.round(m.pos[i * 3 + 2] * 200)); return zs.size; };
  const sharp = m => { let n = 0, tot = 0; for (let t = 0; t < m.idx.length; t += 3) { if (![0, 1, 2].every(k => m.mat[m.idx[t + k]] === MAT.HORSE_COAT)) continue; for (const [p, q] of [[0, 1], [1, 2], [2, 0]]) { const a = m.idx[t + p], b = m.idx[t + q], d = m.nrm[a * 3] * m.nrm[b * 3] + m.nrm[a * 3 + 1] * m.nrm[b * 3 + 1] + m.nrm[a * 3 + 2] * m.nrm[b * 3 + 2]; tot++; if (Math.acos(Math.min(1, Math.max(-1, d))) > 55 * Math.PI / 180) n++; } } return n / tot; };
  for (const lod of [1, 2]) { const m = lib.mesh('horse:riding', lod).finalize(); assert.ok(m.nt <= (lod === 1 ? 800 : 400), 'tris ' + m.nt); assert.ok(stations(m) >= (lod === 1 ? 9 : 5), `lod ${lod} trunk stations ${stations(m)}`); assert.ok(sharp(m) < (lod === 1 ? 0.5 : 0.65), `lod ${lod} sharp-edge share ${sharp(m)}`); }
  const h0 = lib.mesh('horse:riding', 0).finalize(); let best = 9; for (let i = 0; i < h0.nv; i++) if (h0.mat[i] === MAT.SADDLE_LEATHER && h0.pos[i * 3 + 2] > 0.3 && h0.pos[i * 3 + 2] < 0.7) best = Math.min(best, Math.hypot(h0.pos[i * 3] - REIN_HAND[0], h0.pos[i * 3 + 1] - REIN_HAND[1], h0.pos[i * 3 + 2] - REIN_HAND[2]));
  assert.ok(best < 0.012, 'rein passes the fist centre within ' + best);
  const spec = JSON.parse(fs.readFileSync(path.join(DATA, 'socket-spec.json'), 'utf8')).reins, sk = JSON.parse(fs.readFileSync(path.join(DATA, 'skeleton.json'), 'utf8')), so = sk.horse.sockets.find(s => s.name === 'rein_hand_L'), bone = sk.horse.bones.find(b => b.name === 'tack_rein_L');
  const w = bone.head.map((x, i) => x + so.offset[i]); for (let i = 0; i < 3; i++) assert.ok(Math.abs(w[i] - spec.rein_hand_L.world_rest_m[i]) < 0.002, 'socket ' + w); assert.deepEqual(spec.fist_centre_m, REIN_HAND);
  const clip = skinMatrices('rider_walk', 0.25).clip; assert.ok(clip.rig.socket.grip_L);
  const hands = lib.mesh('hands', 0).finalize(), mine = poseFromClip([hands], 'rider_walk', 0.25, { root: [0, 1.54, 0.04], grip: [0.92, 0.25] })[0]; let c = [0, 0, 0], n = 0; for (let i = 0; i < mine.nv; i++) if (mine.pos[i * 3] > 0) { c[0] += mine.pos[i * 3]; c[1] += mine.pos[i * 3 + 1]; c[2] += mine.pos[i * 3 + 2]; n++; }
  c = c.map(x => x / n); assert.ok(Math.hypot(c[0] - REIN_HAND[0], c[1] - REIN_HAND[1], c[2] - REIN_HAND[2]) < 0.03, 'fist centre ' + c);
});

test('gun crew posts follow the drill tables: Nos. 1 and 2 about 2 ft outside the wheels, Nos. 3 and 4 behind the wheel, the gunner at the trail end; socket-spec.json records the posts and the work-place finding', () => {
  const P = crewPosts(), spec = JSON.parse(fs.readFileSync(path.join(DATA, 'socket-spec.json'), 'utf8')).crew_stations;
  for (const k of ['n1', 'n2']) assert.ok(Math.abs(Math.abs(P[k].x) - (0.78 + 0.61)) < 0.01 && Math.abs(P[k].z) < 0.01, k);
  assert.ok(P.n1.x < 0 && P.n2.x > 0, 'No. 1 right (x negative), No. 2 left'); assert.ok(P.n3.z < -0.73 && P.n4.z < -0.73 && Math.abs(P.n3.x) > 0.78 + 0.5, 'Nos. 3 and 4 outside and behind the wheel'); assert.ok(P.gunner.z <= -2.5);
  assert.ok(Math.abs(spec.posts_m.n1[0] - P.n1.x) < 0.01 && Math.abs(spec.posts_m.n1[1] - P.n1.z) < 0.01 && Math.abs(spec.posts_m.gunner[1] - P.gunner.z) < 0.01); assert.ok(spec.finding.includes('INSIDE the wheel track'));
});

test('round 3 data: materials.json lists the strand-card slots as alpha-to-coverage with the vertex flag byte meaning, hair-cards.json and head-maps.json carry hashes, the new sheets exist', () => {
  const M = JSON.parse(fs.readFileSync(path.join(DATA, 'materials.json'), 'utf8')); assert.equal(M.alpha_modes[MAT.HAIR_CARD], 'alpha-to-coverage'); assert.ok(M.vertex_flag_byte.strand_cards.includes('coverage') && M.vertex_flag_byte.cloth.includes('wrinkle'));
  const H = JSON.parse(fs.readFileSync(path.join(DATA, 'hair-cards.json'), 'utf8')); assert.equal(H.variants.length, 8); assert.equal(H.sha256, hairAtlasHash(bakeHairAtlas()), 'hair-cards.json current'); assert.ok(fs.existsSync(path.join(DATA, 'textures/hair_cards.png')));
  const HM = JSON.parse(fs.readFileSync(path.join(DATA, 'head-maps.json'), 'utf8')); assert.ok(HM.bytes.crowd_24_bc7_MB < 14 && HM.age_years[0] === 17 && HM.age_years[1] === 45);
  for (const f of ['heads_24.png', 'heads_close.png', 'rider_hands_reins.png', 'gun_crew_working.png', 'gun_crew_napoleon.png']) assert.ok(fs.existsSync(path.join(APP, 'tests/shots-figures3d', f)), f);
});
