// Field artillery models: the tube (12-pdr Napoleon, 3-inch Ordnance rifle, 10-/20-pdr Parrott, howitzers, 6-pdr, James, Whitworth, and a marked-gap generic for the pieces with no record), the field
// carriage with 14-spoke wheels, the limber and the caisson, and the gun-crew implements (rammer/sponge staff, handspike). Tube lengths and bores are the kit/weapons.json piece table (tier inferred:
// the table's sources are weak); outer profiles, carriage and wheel sizes are PLAUSIBLE-PROCEDURAL (TIERS.json F-GUN-PROFILE, F-GUN-CARRIAGE). No gun is placed before its battery arrives (history layer).
import { v3, m4, qAxisAngle } from './mathlib.mjs';
import { Mesh, loft, tube, ellipsoid, box, lathe, limbProfile } from './meshkit.mjs';
import { gunRig } from './skeleton.mjs';
import { MAT } from './palette.mjs';
import { rivet, roundBox, pathTube, stitches } from './detail.mjs';

const GI = gunRig.index, GB = n => gunRig.bones[GI[n]].head, IN = 0.0254, rig = b => () => [[GI[b], 1]];
// piece table: tube_length_in / bore_in from kit/weapons.json artillery.pieces (table cells); material class bronze|iron; style = profile family
export const PIECES = {
  '6pdr_field_gun': { tube_in: 60, bore_in: 3.67, mat: 'bronze', style: 'smoothbore', label: '6-pdr field gun' },
  napoleon_12pdr_m1857: { tube_in: 66, bore_in: 4.62, mat: 'bronze', style: 'napoleon', label: 'M1857 12-pdr Napoleon' },
  '12pdr_howitzer': { tube_in: 53, bore_in: 4.62, mat: 'bronze', style: 'howitzer', label: '12-pdr howitzer' },
  '12pdr_mountain_howitzer': { tube_in: 33, bore_in: 4.62, mat: 'bronze', style: 'howitzer', label: '12-pdr mountain howitzer', small: true },
  '24pdr_howitzer': { tube_in: 64, bore_in: 5.82, mat: 'bronze', style: 'howitzer', label: '24-pdr howitzer' },
  '10pdr_parrott': { tube_in: 74, bore_in: 3.0, mat: 'iron', style: 'parrott', label: '10-pdr Parrott' },
  '3inch_ordnance_rifle': { tube_in: 69, bore_in: 3.0, mat: 'iron', style: 'ordnance', label: '3-inch Ordnance rifle' },
  '14pdr_james_rifle': { tube_in: 60, bore_in: 3.8, mat: 'bronze', style: 'smoothbore', label: '14-pdr James rifle' },
  '20pdr_parrott': { tube_in: 84, bore_in: 3.67, mat: 'iron', style: 'parrott', label: '20-pdr Parrott' },
  '12pdr_whitworth': { tube_in: 104, bore_in: 2.75, mat: 'iron', style: 'whitworth', label: '12-pdr Whitworth (breechloader)' },
  blakely_12pdr: { tube_in: 72, bore_in: 3.5, mat: 'gap', style: 'parrott', label: '12-pdr Blakely (no dimensions in the record: GAP generic)', gap: true },
  '3inch_navy_rifle': { tube_in: 69, bore_in: 3.0, mat: 'gap', style: 'ordnance', label: '3-inch Navy rifle (no dimensions in the record: GAP generic)', gap: true },
  ames_rifled_bronze_napoleon: { tube_in: 66, bore_in: 4.62, mat: 'gap', style: 'napoleon', label: 'Ames rifled bronze Napoleon (no dimensions in the record: GAP generic)', gap: true },
};
const matOf = p => (p.mat === 'bronze' ? MAT.BRONZE : p.mat === 'iron' ? MAT.IRON : MAT.GAP);

// the tube: revolve the outer profile around z (breech at -a, muzzle at +b), with the bore recess at the muzzle. Positions in rig coordinates (trunnion axis at the barrel bone head).
export function buildTube(pieceId, lod) {
  const P = PIECES[pieceId]; if (!P) throw new Error('unknown piece ' + pieceId);
  const L = P.tube_in * IN, mesh = new Mesh('tube:' + pieceId), bh = GB('barrel'), a = 0.42 * L, b = L - a, bore = P.bore_in * IN / 2;
  // profile (radius, axial coordinate) from the cascabel to the muzzle face and down the bore; shaped per style
  const R0 = { napoleon: 0.148, smoothbore: 0.125, howitzer: 0.150, parrott: 0.118, ordnance: 0.098, whitworth: 0.095 }[P.style] * (P.small ? 0.55 : 1), Rm = { napoleon: 0.112, smoothbore: 0.098, howitzer: 0.122, parrott: 0.085, ordnance: 0.074, whitworth: 0.07 }[P.style] * (P.small ? 0.55 : 1), sw = P.style === 'napoleon' || P.style === 'smoothbore' ? 1.08 : 1.0;
  const n = lod === 0 ? 24 : lod === 1 ? 5 : 3, prof = [[0, -a - 0.13], [0.045, -a - 0.12], [0.03, -a - 0.07], [R0 * 0.9, -a - 0.04]];
  const at = t => { const y = -a + t * (L - 0.05); let r = R0 + (Rm - R0) * Math.min(1, t * 1.25); if (P.style === 'parrott' && t < 0.34) r = R0 * 1.12 + (R0 - R0 * 1.12) * t / 0.34 * 0.3; if (t > 0.94) r *= sw; return [r, y]; };
  for (let i = 0; i <= n; i++) prof.push(at(i / n));
  prof.push([Rm * sw * 1.02, b], [bore * 1.4, b], [bore, b - 0.01], [bore, b - 0.20], [0, b - 0.20]);
  const tm = new Mesh('t'); lathe(tm, prof, [48, 10, 6][lod], { mat: matOf(P), skinFn: rig('barrel'), closed: true });
  mesh.append(tm, m4.trs([bh[0], bh[1], bh[2]], qAxisAngle([1, 0, 0], Math.PI / 2)));
  if (lod <= 1) { for (const s of [1, -1]) tube(mesh, [bh[0] + s * 0.07, bh[1], bh[2]], [bh[0] + s * 0.20, bh[1], bh[2]], [[0, 0.045], [1, 0.045]], { sides: [14, 7, 5][lod], mat: matOf(P), skinFn: rig('barrel'), capStart: true, capEnd: true }); }   // trunnions
  if (P.style === 'parrott' && lod === 0) tube(mesh, [bh[0], bh[1], bh[2] - a * 0.55], [bh[0], bh[1], bh[2] - a * 0.2], [[0, R0 * 1.15], [1, R0 * 1.15]], { sides: 24, mat: MAT.IRON, skinFn: rig('barrel'), capStart: true, capEnd: true });   // the wrought-iron breech reinforcing band
  if (lod === 0) {                                                                                    // mouldings: reinforce ring, chase ring, muzzle astragal, cascabel button; vent field, sight seat, lifting (dolphin-free) lugs
    const ring = (t, rr, w, mat) => { const y = -a + t * (L - 0.05), rm = new Mesh('r'); lathe(rm, [[rr - 0.004, -w], [rr + 0.006, -w * 0.6], [rr + 0.008, 0], [rr + 0.006, w * 0.6], [rr - 0.004, w], [rr - 0.004, -w]], 48, { mat, skinFn: rig('barrel'), closed: true }); mesh.append(rm, m4.trs([bh[0], bh[1], bh[2] + y], qAxisAngle([1, 0, 0], Math.PI / 2))); };
    const rAt = t => R0 + (Rm - R0) * Math.min(1, t * 1.25);
    ring(0.30, rAt(0.30), 0.016, matOf(P)); ring(0.62, rAt(0.62), 0.012, matOf(P)); ring(0.93, rAt(0.93), 0.010, matOf(P));
    const cb = new Mesh('c'); lathe(cb, [[0, 0.0], [0.040, 0.005], [0.048, 0.03], [0.036, 0.07], [0.052, 0.10], [0.058, 0.13], [0.040, 0.16], [0.0, 0.17]], 24, { mat: matOf(P), skinFn: rig('barrel'), closed: true }); mesh.append(cb, m4.trs([bh[0], bh[1], bh[2] - a - 0.30], qAxisAngle([1, 0, 0], -Math.PI / 2)));
    roundBox(mesh, [bh[0], bh[1] + R0 * 0.97, bh[2] - a + 0.18], [0.035, 0.012, 0.06], 0.004, { mat: matOf(P), skinFn: rig('barrel'), sides: 12 });
    roundBox(mesh, [bh[0], bh[1] + Rm * 1.02, bh[2] + b - 0.14], [0.006, 0.014, 0.006], 0.002, { mat: MAT.IRON, skinFn: rig('barrel'), sides: 8 });
    for (const s of [1, -1]) rivet(mesh, [bh[0] + s * (0.20), bh[1], bh[2]], [s, 0, 0], 0.050, { mat: MAT.IRON, skinFn: rig('barrel'), sides: 18 });
  }
  mesh.meta = { closed: false, openOk: true, muzzle_z_m: bh[2] + b, vent_z_m: bh[2] - a + 0.18, trunnion: bh, tube_m: L, bore_m: bore * 2, piece: pieceId };
  return mesh;
}
// wheel of 14 spokes (rolls about x): hub, spokes, felloes, iron tire. radius 0.725 m (PLAUSIBLE-PROCEDURAL)
function wheel(mesh, c, bone, lod, side) {
  const r = 0.725, nSp = lod === 0 ? 14 : lod === 1 ? 7 : 0, sk = rig(bone), w = new Mesh('w');
  tube(w, [-0.06, 0, 0], [0.06, 0, 0], limbProfile(0.085, 0.085, 1, 0.1), { sides: [14, 8, 6][lod], mat: MAT.CARRIAGE_PAINT, skinFn: sk, capStart: false });
  tube(w, [-0.045, 0, 0], [0.045, 0, 0], [[0, 0.72], [1, 0.72]].map(([t, rr]) => [t, rr]), { sides: [28, 14, 10][lod], mat: MAT.CARRIAGE_PAINT, skinFn: sk, capStart: false, ex: 1, ey: 1 });
  if (lod === 2) { mesh.append(w, m4.translation(c)); return; }
  for (let k = 0; k < nSp; k++) { const a = k / nSp * Math.PI * 2; tube(w, [0, Math.cos(a) * 0.08, Math.sin(a) * 0.08], [0, Math.cos(a) * 0.66, Math.sin(a) * 0.66], [[0, 0.028], [1, 0.02]], { sides: lod === 0 ? 8 : 4, mat: MAT.CARRIAGE_PAINT, skinFn: sk, capStart: true, capEnd: true }); }
  tube(w, [-0.04, 0, 0], [0.04, 0, 0], [[0, r], [1, r]], { sides: [64, 16, 10][lod], mat: MAT.IRON, skinFn: sk, capStart: false });
  if (lod === 0) {                                                                                      // felloe joints, tire nails, nave bands and cap, linchpin
    for (let k = 0; k < 28; k++) { const a = (k + 0.5) / 28 * Math.PI * 2; rivet(w, [0.042, Math.cos(a) * r, Math.sin(a) * r], [1, 0, 0], 0.011, { mat: MAT.IRON, skinFn: sk, sides: 8 }); }
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.2; tube(w, [0, Math.cos(a) * 0.700, Math.sin(a) * 0.700], [0, Math.cos(a) * 0.726, Math.sin(a) * 0.726], [[0, 0.022], [1, 0.022]], { sides: 6, mat: MAT.CARRIAGE_PAINT, skinFn: sk, capStart: true, capEnd: true, ex: 1.8 }); }
    for (const x of [-0.052, 0.052]) tube(w, [x - 0.012, 0, 0], [x + 0.012, 0, 0], [[0, 0.098], [1, 0.098]], { sides: 24, mat: MAT.IRON, skinFn: sk, capStart: false });
    rivet(w, [0.070, 0, 0], [1, 0, 0], 0.045, { mat: MAT.IRON, skinFn: sk, sides: 20 }); tube(w, [0.05, 0.03, 0], [0.05, 0.075, 0], [[0, 0.007], [1, 0.005]], { sides: 6, mat: MAT.IRON, skinFn: sk, capStart: true, capEnd: true });
  }
  mesh.append(w, m4.translation(c));
  void side;
}
export function buildCarriage(lod, opt = {}) {
  const mesh = new Mesh('carriage'), sk = rig('carriage');
  for (const s of [1, -1]) {                                                                                    // cheeks (flasks): tapering planks from the trunnion to the trail end
    const pts = [[s * 0.26, 0.95, 0.35], [s * 0.26, 0.82, -0.40], [s * 0.20, 0.55, -1.30], [s * 0.12, 0.42, -2.15]];
    for (let i = 0; i < 3; i++) tube(mesh, pts[i], pts[i + 1], [[0, 0.085], [1, 0.075]], { sides: 4, mat: MAT.CARRIAGE_PAINT, skinFn: i < 2 ? sk : rig('trail'), ex: 0.45, ey: 1.0, capStart: i === 0, capEnd: i === 2, phase: Math.PI / 4, smoothNormals: false });
  }
  tube(mesh, [-0.80, 0.60, 0.0], [0.80, 0.60, 0.0], [[0, 0.05], [1, 0.05]], { sides: [10, 6, 4][lod], mat: MAT.IRON, skinFn: sk, capStart: true, capEnd: true });         // axle
  box(mesh, [0, 0.72, -0.15], [0.26, 0.05, 0.16], { mat: MAT.CARRIAGE_PAINT, skinFn: sk });                    // axle bed / transom
  if (lod <= 1) { tube(mesh, [0, 0.46, -2.1], [0, 0.46, -2.28], limbProfile(0.045, 0.045, 1, 0.3), { sides: 8, mat: MAT.IRON, skinFn: rig('trail'), capStart: true, capEnd: true }); tube(mesh, [0, 0.75, -1.1], [0, 0.95, -0.2], [[0, 0.018], [1, 0.018]], { sides: 5, mat: MAT.IRON, skinFn: rig('elev_screw'), capStart: true, capEnd: true }); }  // lunette ring, elevating screw
  if (lod === 0) {                                                                                      // cheek bolts and plates, axle bands and caps, trail handles, trunnion plates
    for (const s of [1, -1]) { for (let i = 0; i < 6; i++) { const t = i / 5; rivet(mesh, [s * (0.26 + 0.0 + 0.04), 0.93 - 0.40 * t, 0.30 - 0.7 * t], [s, 0, 0], 0.012, { mat: MAT.IRON, skinFn: sk, sides: 8 }); }
      roundBox(mesh, [s * 0.30, 0.95, 0.0], [0.006, 0.05, 0.09], 0.002, { mat: MAT.IRON, skinFn: sk, sides: 10 }); roundBox(mesh, [s * 0.72, 0.60, 0.0], [0.045, 0.058, 0.058], 0.004, { mat: MAT.IRON, skinFn: sk, sides: 14 });
      pathTube(mesh, Array.from({ length: 12 }, (_, i) => { const a = i / 11 * Math.PI; return [s * 0.21, 0.40 + Math.sin(a) * 0.05, -1.60 - 0.0 + (1 - Math.cos(a)) * 0.05]; }), 0.008, { sides: 6, mat: MAT.IRON, skinFn: rig('trail') }); }
  }
  wheel(mesh, GB('wheel_L'), 'wheel_L', lod, 1); wheel(mesh, GB('wheel_R'), 'wheel_R', lod, -1);
  mesh.meta = { closed: false, openOk: true }; return mesh;
}
export function buildLimber(lod) {
  const mesh = new Mesh('limber'), lr = GB('limber_root');
  box(mesh, [0, 0.98, lr[2]], [0.40, 0.26, 0.40], { mat: MAT.CARRIAGE_PAINT, skinFn: rig('limber_root') });                                      // ammunition chest
  box(mesh, [0, 1.26, lr[2] - 0.02], [0.42, 0.03, 0.43], { mat: MAT.CARRIAGE_PAINT, skinFn: rig('limber_chest_lid') });
  tube(mesh, [-0.8, 0.60, lr[2]], [0.8, 0.60, lr[2]], [[0, 0.05], [1, 0.05]], { sides: [10, 6, 4][lod], mat: MAT.IRON, skinFn: rig('limber_root'), capStart: true, capEnd: true });
  tube(mesh, [0, 0.65, lr[2] - 0.2], [0, 0.62, lr[2] - 2.3], [[0, 0.05], [1, 0.035]], { sides: [10, 6, 4][lod], mat: MAT.CARRIAGE_PAINT, skinFn: rig('limber_pole'), capStart: true, capEnd: true });   // draught pole
  if (lod === 0) { for (const s of [1, -1]) { roundBox(mesh, [s * 0.41, 1.10, lr[2]], [0.012, 0.16, 0.12], 0.004, { mat: MAT.IRON, skinFn: rig('limber_root'), sides: 10 }); roundBox(mesh, [s * 0.43, 1.0, lr[2]], [0.015, 0.03, 0.05], 0.004, { mat: MAT.IRON, skinFn: rig('limber_root'), sides: 10 }); rivet(mesh, [s * 0.76, 0.60, lr[2]], [s, 0, 0], 0.05, { mat: MAT.IRON, skinFn: rig('limber_root'), sides: 14 }); }
    for (let i = 0; i < 6; i++) rivet(mesh, [-0.35 + 0.14 * i, 1.28, lr[2] - 0.40], [0, 0.4, -1], 0.012, { mat: MAT.IRON, skinFn: rig('limber_chest_lid'), sides: 8 }); }
  wheel(mesh, GB('limber_wheel_L'), 'limber_wheel_L', lod, 1); wheel(mesh, GB('limber_wheel_R'), 'limber_wheel_R', lod, -1);
  mesh.meta = { closed: false, openOk: true }; return mesh;
}
export function buildCaisson(lod) {
  const mesh = new Mesh('caisson'), cr = GB('caisson_root');
  box(mesh, [0, 1.02, cr[2]], [0.42, 0.30, 0.72], { mat: MAT.CARRIAGE_PAINT, skinFn: rig('caisson_root') });
  box(mesh, [0, 1.34, cr[2]], [0.44, 0.03, 0.74], { mat: MAT.CARRIAGE_PAINT, skinFn: rig('caisson_lid') });
  tube(mesh, [-0.8, 0.60, cr[2]], [0.8, 0.60, cr[2]], [[0, 0.05], [1, 0.05]], { sides: [10, 6, 4][lod], mat: MAT.IRON, skinFn: rig('caisson_root'), capStart: true, capEnd: true });
  wheel(mesh, GB('caisson_wheel_L'), 'caisson_wheel_L', lod, 1); wheel(mesh, GB('caisson_wheel_R'), 'caisson_wheel_R', lod, -1);
  if (lod <= 1) { const sp = new Mesh('s'); tube(sp, [-0.05, 0, 0], [0.05, 0, 0], [[0, 0.62], [1, 0.62]], { sides: [20, 10, 6][lod], mat: MAT.CARRIAGE_PAINT, skinFn: rig('spare_wheel'), capStart: false }); mesh.append(sp, m4.translation(GB('spare_wheel'))); }
  mesh.meta = { closed: false, openOk: true }; return mesh;
}
// crew implements: the rammer/sponge staff (No. 1) and the handspike (No. 3), prop bones of the gun rig
export function buildCrewImplement(kind, lod) {
  const mesh = new Mesh('impl:' + kind);
  if (kind === 'rammer') { const o = GB('rammer'); tube(mesh, o, v3.add(o, [0, 1.9, 0]), [[0, 0.016], [1, 0.016]], { sides: 6, mat: MAT.WOOD, skinFn: rig('rammer'), capStart: true, capEnd: true }); tube(mesh, v3.add(o, [0, 1.9, 0]), v3.add(o, [0, 2.2, 0]), [[0, 0.055], [1, 0.055]], { sides: [12, 7, 5][lod], mat: MAT.BLANKET, skinFn: rig('rammer'), capStart: true, capEnd: true }); }
  else { const o = GB('handspike'); tube(mesh, o, v3.add(o, [0, 1.6, 0]), [[0, 0.03], [1, 0.02]], { sides: 6, mat: MAT.WOOD, skinFn: rig('handspike'), capStart: true, capEnd: true }); }
  mesh.meta = { closed: false, openOk: true }; return mesh;
}
export function buildGunSet(pieceId, lod) { const m = new Mesh('gun:' + pieceId); const t = buildTube(pieceId, lod); m.append(t); m.append(buildCarriage(lod)); m.meta = { ...t.meta, closed: false, openOk: true }; return m; }
