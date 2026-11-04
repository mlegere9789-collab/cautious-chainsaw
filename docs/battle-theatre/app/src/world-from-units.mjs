// The renderer's world built from a history layer's units, instead of the prototype's placeholder crowd (render/prototype/src/world.mjs buildWorld).
// One world unit per layer unit, in layer order, so the stage's index i is the same in both. A unit the layer does not draw has zero figures.
// A drawn unit has exactly `strength.drawn` figures: one soldier instanced per figure, no cap. Where the figure comes from (a printed number, or a procedural share
// with a declared basis) is the layer's business and is shown on the unit's card.
// Contract 1.3 additions:
//  * a unit with a printed change of formation (formation.changes) gets a SECOND slot layout (world unit .alt, .altFormation, .baseFormation); the stage blends between the two;
//  * a drawn battery with a STATED gun count gets that many pieces and a nine-man detachment each, taken out of the battery's own figures (the total stays the strength figure); the groups of crew are
//    appended after the layer's units (world.extra) and follow the battery. A battery without a stated count gets no gun (the layer says so on its card). Limbers, caissons and teams have no model.
//  * the per-figure variation scalar (sold1.w) comes from the figure's kit manifest when the layer offers one (layer.figureVari), else from the prototype's hash.
import { mulberry32, hsh } from '../../render/prototype/src/math.mjs';
import { UNIT_STRIDE } from '../../render/prototype/src/world.mjs';
import { slots, slotKind } from './layout.mjs';
export const HIDDEN = 1e6;
const bearingToH = deg => Math.PI - deg * Math.PI / 180;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// The nine posts of a field-gun detachment, in the gun's frame (x right, z toward the muzzle; origin at the axle), metres. Positions are the manual's (FIELDART-1863 paras 95-96: drill/drill_artillery.json
// ART-FA-03..09); the metric values assume a carriage of about 1.5 m track and 2.8 m of trail (the repository holds no carriage dimensions): tier inferred for the post, plausible-procedural for the metres.
// [role, x, z]
export const CREW_POSTS = [['gunner', 0, -2.8], ['No. 1', 1.4, 0.8], ['No. 2', -1.4, 0.8], ['No. 3', 1.4, -0.2], ['No. 4', -1.4, -0.2], ['No. 5', -1.4, -5.1], ['No. 6', 0, -10.8], ['No. 7', -1.4, -10.8], ['No. 8', -1.0, -14.5]];
export const GUN_INTERVAL_M = 14;                // between pieces: the prototype's value; the drill texts read hold no interval (tuning value)
export const GUN_PERIOD_S = 40;                  // visual cadence of a piece: inside both printed ranges (PDF 20-30 s, manuals 30-60 s: DEC-008, provisional builder choice, the owner decides)

export function worldFromUnits(T, geo, layer, { seed = 1863 } = {}) {
  const rnd = mulberry32(seed), units = [], sold0 = [], extra = [], guns = [], pending = []; let count = 0;
  const vari = [];                                   // per figure variation scalar from a manifest, when the layer offers one (layer.figureVari)
  layer.units.forEach((u, i) => {
    const n = u.drawn ? u.strength.drawn : 0, kind = n ? slotKind(u) : 'none', team = u.side === 'union' ? 0 : 1, klass = u.arm === 'cavalry' ? 1 : 0;
    const sl = layer.slotOf(u.id); let x0 = 0, z0 = 0, heading = 0; if (sl) { [x0, z0] = geo.xz(sl.lng, sl.lat); heading = bearingToH(sl.heading_deg ?? 0); }
    const G = n && u.guns && u.guns.status === 'drawn' && n >= u.guns.count * CREW_POSTS.length ? u.guns.count : 0, nOwn = n - G * CREW_POSTS.length;
    const w = { team, klass, kind, x0, z0, heading, clip: 0, vx: 0, vz: 0, tRef: 0, id: i, first: count, count: nOwn, figures: n, guns: G };
    if (nOwn) { let fi = 0; for (const s of slots(kind, nOwn, rnd)) { sold0.push(s[0], s[1], rnd(), i); vari.push(layer.figureVari ? layer.figureVari(u.id, fi++) : null); count++; } }
    // a second layout for a unit that changes formation (blended by the stage); drawn from its own generator so that nothing else in the world moves
    const changes = (u.formation && u.formation.changes) || [];
    if (nOwn && changes.length && klass === 0 && (kind === 'col' || kind === 'line')) {
      const altKind = kind === 'col' ? 'line' : 'col', r2 = mulberry32((seed ^ fnv(u.id)) >>> 0), a = slots(altKind, nOwn, r2);
      w.alt = new Float32Array(nOwn * 2); a.forEach((s, k) => { w.alt[k * 2] = s[0]; w.alt[k * 2 + 1] = s[1]; });
      w.baseFormation = kind === 'col' ? 'column_fours' : 'line'; w.altFormation = kind === 'col' ? 'line' : 'column_fours';
    }
    units.push(w);
    if (G) pending.push({ i, G, u, team, nOwn });
  });
  // pieces abreast ahead of each battery's block, each with its detachment: appended after the layer's units (world.extra) so that unit index = layer index
  for (const { i, G, u, team, nOwn } of pending) {
    const depth = Math.ceil(nOwn / 4) * 1.0, ahead = depth / 2 + 12, g0 = guns.length;
    for (let g = 0; g < G; g++) {
      const gx = (g - (G - 1) / 2) * GUN_INTERVAL_M, ui = units.length;
      guns.push([HIDDEN, HIDDEN, 0, team, GUN_PERIOD_S * (0.9 + 0.2 * rnd()), g * GUN_PERIOD_S / G + rnd() * 1.5, 2.6 + rnd(), u.guns.range_5deg_m || 1000]);
      const cw = { team, klass: 0, kind: 'crew', x0: 0, z0: 0, heading: 0, clip: 0, vx: 0, vz: 0, tRef: 0, id: ui, first: count, count: CREW_POSTS.length, gun: g0 + g, crew: true, parent: i };
      let k = 0; for (const [, px, pz] of CREW_POSTS) { sold0.push(px, pz, rnd(), ui); vari.push(layer.figureVari ? layer.figureVari(u.id, nOwn + g * CREW_POSTS.length + k) : null); k++; count++; }
      extra.push({ parent: i, dx: gx, dz: ahead, dh: 0, gun: g0 + g }); units.push(cw);
    }
  }
  const S = count, sold = new Float32Array(Math.max(S, 1) * 4), s1 = new Float32Array(Math.max(S, 1) * 4); sold.set(sold0);
  for (let i = 0; i < S; i++) { const r2 = hsh(i * 5 + 11); s1[i * 4] = 1e9; s1[i * 4 + 1] = Math.floor(r2 * 3); s1[i * 4 + 2] = r2; s1[i * 4 + 3] = vari[i] != null ? vari[i] : hsh(i * 7 + 3); }   // fall time 1e9: losses belong to the history layer's state events
  const uf = new Float32Array(units.length * UNIT_STRIDE);
  units.forEach((u, i) => { const o = i * UNIT_STRIDE; uf[o] = u.x0; uf[o + 1] = u.z0; uf[o + 2] = u.heading; uf[o + 3] = u.clip; uf[o + 4] = 0; uf[o + 5] = 0; uf[o + 6] = u.team; uf[o + 7] = u.klass; uf[o + 8] = 0; uf[o + 9] = -1; uf[o + 10] = u.first; uf[o + 11] = u.count; });
  units.forEach(u => {
    let r = 0; for (let k = 0; k < u.count; k++) { const sx = sold[(u.first + k) * 4], sz = sold[(u.first + k) * 4 + 1]; r = Math.max(r, Math.hypot(sx, sz)); }
    if (u.alt) for (let k = 0; k < u.count; k++) r = Math.max(r, Math.hypot(u.alt[k * 2], u.alt[k * 2 + 1]));
    u.radius = r + 3;
  });
  // the renderer needs at least one gun record; with none drawn this one is parked far outside every frustum and no unit refers to it
  const gl = guns.length ? guns : [[HIDDEN, HIDDEN, 0, 0, 1e12, 0, 3, 800]], gf = new Float32Array(gl.length * 8); gl.forEach((g, i) => gf.set(g, i * 8));
  const mounted = units.filter(u => u.klass === 1).reduce((a, u) => a + u.count, 0);
  const comp = { soldiers: S, units: units.length, guns: guns.length, batteries: new Set(guns.map(g => g.parent)).size, mounted, horses: mounted, crew: units.filter(u => u.crew).reduce((a, u) => a + u.count, 0), union: units.filter(u => u.team === 0).reduce((a, u) => a + u.count, 0), confederate: units.filter(u => u.team === 1).reduce((a, u) => a + u.count, 0) };
  return { T, units, extra, unitF: uf, sold, sold1: s1, guns: gl, gunF: gf, show: { line: { x: 0, z: 0, heading: 0 } }, comp, count: S };
}
