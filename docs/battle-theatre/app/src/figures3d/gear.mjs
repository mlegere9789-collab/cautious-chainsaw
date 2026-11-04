// Equipment generators: accoutrements (belt, cartridge box, cap pouch, bayonet scabbard, canteen, haversack, knapsack, blanket roll, gum blanket, sash, cavalry belt set ...), shoulder arms, handguns,
// swords and sabres, instruments, staffs. Dimensions of arms come from kit/weapons.json (overall/barrel inches, where the record has them; the rest are PLAUSIBLE-PROCEDURAL placeholders marked
// `dims: 'gap'` in the weapon table, tier gap G17); everything else (box sizes, strap widths) is plausible-procedural (TIERS.json F-GEAR-DIMS).
import { v3, m4, qAxisAngle, clamp } from './mathlib.mjs';
import { Mesh, loft, tube, ellipsoid, box, lathe, strap, limbProfile, quad4 } from './meshkit.mjs';
import { BI, H, torsoAt, RES, NEUTRAL, skinTorsoBoth } from './body.mjs';
import { MAT } from './palette.mjs';
import { M1861 } from './rifle-spec.mjs';
import { seam, stitches, button, rivet, roundBox, pathTube, strands } from './detail.mjs';

const IN = 0.0254;
const rigidTo = b => () => [[b, 1]];
// a point on the (clothed) torso surface at height y, lateral x, front (+1) or back (-1), offset off metres
export function bodyPt(x, y, side, off = 0.02, shape = NEUTRAL) { const t = torsoAt(y, shape), q = clamp(x / (t.rx + off), -0.97, 0.97); return [x, y, t.cz + side * (t.rz + off) * Math.sqrt(1 - q * q)]; }
const pathAcross = (a, b, steps, sideFn, off, shape) => { const pts = []; for (let i = 0; i <= steps; i++) { const t = i / steps, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; pts.push(bodyPt(x, y, sideFn(t), off, shape)); } return pts; };

// ---------------------------------------------------------------- LOD0 accoutrement detail (all plausible-procedural; the cartridge-box and belt-plate devices are drawn as an oval with a raised field and the letters U S, no regulation drawing was read)
// a brass oval plate built facing +z at the origin: bevelled rim, raised field, and the letters U and S as 1.2 mm strokes; rotated 180 degrees about z when `upside` (the kit's upside-down belt plate)
function ovalPlate(mesh, c, rx, ry, { skinFn, upside = false, letters = true, mat = MAT.BRASS } = {}) {
  const m = new Mesh('plate'), U = [1, 0, 0], V = [0, 1, 0], ring = (z, a, b) => ({ c: [0, 0, z], u: U, v: V, ru: a, rv: b });
  loft(m, [ring(0.0, rx, ry), ring(0.0016, rx * 0.985, ry * 0.985), ring(0.0027, rx * 0.93, ry * 0.93), ring(0.0027, rx * 0.88, ry * 0.88), ring(0.0034, rx * 0.84, ry * 0.84)], { sides: 32, mat, capStart: true, capEnd: true });
  if (letters) {
    const sc = rx / 0.035, pU = [[-0.0160, 0.0085], [-0.0160, -0.0030], [-0.0135, -0.0085], [-0.0095, -0.0100], [-0.0055, -0.0085], [-0.0030, -0.0030], [-0.0030, 0.0085]].map(([x, y]) => [x * sc, y * sc * (ry / 0.024), 0.0042]);
    const pS = [[0.0150, 0.0070], [0.0100, 0.0092], [0.0035, 0.0080], [0.0030, 0.0030], [0.0075, 0.0000], [0.0145, -0.0030], [0.0140, -0.0082], [0.0080, -0.0098], [0.0025, -0.0075]].map(([x, y]) => [x * sc, y * sc * (ry / 0.024), 0.0042]);
    for (const pts of [pU, pS]) for (let i = 0; i + 1 < pts.length; i++) tube(m, pts[i], pts[i + 1], [[0, 0.0012], [1, 0.0012]], { sides: 4, mat, smoothNormals: false, capStart: i === 0, capEnd: i + 2 === pts.length });
  }
  const base = mesh.nv; mesh.append(m, m4.trs(c, upside ? [0, 0, 1, 0] : [0, 0, 0, 1])); if (skinFn) mesh.setSkin(skinFn, base, mesh.nv); return base;
}
function beltDetail(mesh, plate, t, e, shape) {
  const pel = () => [[BI.pelvis, 1]], z0 = t.cz + t.rz + e, rad = (x, y) => v3.norm([x / ((t.rx + e) ** 2), 0, (bodyZ(x) - t.cz) / ((t.rz + e) ** 2)]), bodyZ = x => t.cz + (t.rz + e) * Math.sqrt(Math.max(0.02, 1 - (x / (t.rx + e)) ** 2));
  if (plate === 'oval_us' || plate === 'upside_down') { const b = ovalPlate(mesh, [0, 1.007, z0 + 0.0005], 0.036, 0.0255, { skinFn: pel, upside: plate === 'upside_down' }); if (plate === 'upside_down') for (let i = b; i < mesh.nv; i++) mesh.flags[i] = 1; }
  else if (plate === 'rect_eagle') {
    roundBox(mesh, [0, 1.007, z0 + 0.002], [0.036, 0.0025, 0.026], 0.002, { mat: MAT.BRASS, skinFn: pel, m: Float64Array.from([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]), sides: 16 });
    ellipsoid(mesh, [0, 1.004, z0 + 0.0062], [0.007, 0.010, 0.0022], 10, 7, { mat: MAT.BRASS, skinFn: pel }); ellipsoid(mesh, [0, 1.018, z0 + 0.0062], [0.0036, 0.0036, 0.0022], 8, 5, { mat: MAT.BRASS, skinFn: pel });
    for (const sx of [-1, 1]) { tube(mesh, [sx * 0.005, 1.010, z0 + 0.0060], [sx * 0.026, 1.016, z0 + 0.0058], [[0, 0.0050], [1, 0.0012]], { sides: 6, mat: MAT.BRASS, skinFn: pel, ex: 1, ey: 0.4, capStart: true, capEnd: true }); tube(mesh, [sx * 0.004, 0.996, z0 + 0.0060], [sx * 0.012, 0.990, z0 + 0.0058], [[0, 0.0020], [1, 0.0010]], { sides: 5, mat: MAT.BRASS, skinFn: pel, capStart: true, capEnd: true }); }
  } else { roundBox(mesh, [0, 1.007, z0 + 0.0035], [0.016, 0.0025, 0.010], 0.002, { mat: MAT.IRON, skinFn: pel, m: Float64Array.from([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]), sides: 12 }); }
  // keepers: two leather loops each side of the plate; the tongue (belt end) lying over the belt; edge stitching top and bottom (front 190 degrees)
  for (const x of [-0.078, 0.078]) { const z = bodyZ(x) + 0.0018; roundBox(mesh, [x, 1.007, z], [0.0075, 0.0225, 0.0030], 0.0015, { mat: MAT.LEATHER_BLACK, skinFn: pel, sides: 12 }); }
  { const pts = []; for (let i = 0; i <= 8; i++) { const x = -0.16 + 0.07 * i / 8; pts.push([x, 1.007, bodyZ(x) + 0.0006]); } seam(mesh, pts, p => rad(p[0], p[1]), { w: 0.034, h: 0.0016, mat: MAT.LEATHER_BLACK, skinFn: pel }); }
  for (const y of [0.9915, 1.0225]) { const pts = []; for (let i = 0; i <= 18; i++) { const x = -0.17 + 0.34 * i / 18; pts.push([x, y, bodyZ(x) + 0.0008]); } stitches(mesh, pts, p => rad(p[0], p[1]), { count: 36, skinFn: pel, lift: 0.0004 }); }
  void shape;
}
function cartboxDetail(mesh, c, opt, b) {
  const rb = () => [[b, 1]], zf = c[2] + 0.0365;
  if (opt.army !== 'confederate') ovalPlate(mesh, [c[0], c[1] + 0.036, zf + 0.0005], 0.022, 0.0165, { skinFn: rb });
  { const pts = [[-0.088, 0.073], [0.088, 0.073], [0.088, -0.001], [0.0, -0.007], [-0.088, -0.001], [-0.088, 0.073]].map(([x, y]) => [c[0] + x, c[1] + y, zf + 0.0006]); const dense = []; for (let i = 0; i + 1 < pts.length; i++) for (let k = 0; k < 4; k++) dense.push(v3.lerp(pts[i], pts[i + 1], k / 4)); dense.push(pts[pts.length - 1]); stitches(mesh, dense, () => [0, 0, 1], { count: 46, skinFn: rb, lift: 0.0004 }); }
  roundBox(mesh, [c[0], c[1] + 0.001, zf - 0.0005], [0.012, 0.007, 0.0018], 0.001, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 10 });                         // flap tab
  rivet(mesh, [c[0], c[1] - 0.004, zf + 0.0020], [0, 0, 1], 0.0048, { mat: MAT.BRASS, skinFn: rb, sides: 10 });
  for (const sx of [-0.05, 0.05]) roundBox(mesh, [c[0] + sx, c[1] + 0.034, c[2] - 0.031], [0.007, 0.066, 0.0036], 0.0015, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 12 });          // belt loops on the back: they run up behind the belt (0.985-1.03) so the box hangs from it
  { const pts = [[-0.086, 0.052], [0.086, 0.052]].map(([x, y]) => [c[0] + x, c[1] + y, zf - 0.0035]); seam(mesh, pts, () => [0, 0, 1], { w: 0.004, h: 0.0014, mat: MAT.LEATHER_BLACK, skinFn: rb }); }   // flap hinge ridge
}
function accDetail(kind, mesh, lod, opt, shape) {
  if (lod !== 0) return;
  switch (kind) {
    case 'cap_pouch': { const b = BI.pelvis, rb = () => [[b, 1]], c = [-0.075, 0.975, 0.128 + 0.014]; stitches(mesh, [[-0.103, 0.997, c[2] + 0.0006], [-0.047, 0.997, c[2] + 0.0006], [-0.047, 0.953, c[2] + 0.0006], [-0.103, 0.953, c[2] + 0.0006], [-0.103, 0.997, c[2] + 0.0006]].flatMap((p, i, a) => i + 1 < a.length ? [0, 1, 2, 3].map(k => v3.lerp(p, a[i + 1], k / 4)) : [p]), () => [0, 0, 1], { count: 28, skinFn: rb, lift: 0.0004 });
      rivet(mesh, [-0.075, 0.964, c[2] + 0.0014], [0, 0, 1], 0.0050, { mat: MAT.BRASS, skinFn: rb, sides: 10 }); roundBox(mesh, [-0.075, 0.985, c[2] - 0.0005], [0.012, 0.010, 0.0016], 0.001, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 10 });
      for (const sx of [-0.095, -0.055]) roundBox(mesh, [sx, 0.985, 0.116], [0.006, 0.020, 0.0026], 0.0012, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 10 }); break; }
    case 'bayonet_scabbard': { const b = BI.gear_scabbard, rb = () => [[b, 1]]; tube(mesh, [0.1845, 0.470, 0.0095], [0.1865, 0.50, 0.0105], [[0, 0.0082], [1, 0.0105]], { sides: 12, mat: MAT.BRASS, skinFn: rb, capStart: true, capEnd: false });    // brass tip
      tube(mesh, [0.1775, 0.925, 0.0245], [0.1785, 0.905, 0.0235], [[0, 0.0140], [1, 0.0146]], { sides: 14, mat: MAT.BRASS, skinFn: rb, capStart: true, capEnd: true });                                                        // throat
      stitches(mesh, [[0.158, 0.945, 0.0425], [0.202, 0.945, 0.0425], [0.202, 0.914, 0.0425], [0.158, 0.914, 0.0425], [0.158, 0.945, 0.0425]].flatMap((p, i, a) => i + 1 < a.length ? [0, 1, 2].map(k => v3.lerp(p, a[i + 1], k / 3)) : [p]), () => [0, 0, 1], { count: 22, skinFn: rb, lift: 0.0004 });
      for (const sy of [0.5, 1]) seam(mesh, Array.from({ length: 7 }, (_, i) => [0.1805 + (sy === 1 ? 0.007 : -0.007), 0.9 - (0.9 - 0.52) * sy * i / 6, 0.0155 - 0.034 * sy * i / 6 + 0.0]), () => [0, 0, 1], { w: 0.003, h: 0.0012, mat: MAT.LEATHER_BLACK, skinFn: rb, caps: false }); break; }
    case 'canteen': { const b = BI.gear_canteen, rb = () => [[b, 1]], cx = 0.205, cy = 0.955, cz = -0.08, R0 = 0.0995, radial = p => v3.norm([p[0] - cx, p[1] - cy, 0]);
      const rim = Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [cx + Math.cos(a) * R0, cy + Math.sin(a) * R0, cz]; }); seam(mesh, rim, radial, { w: 0.005, h: 0.0016, mat: MAT.BLANKET, skinFn: rb });             // cover seam round the rim
      for (const zz of [-0.0285, 0.0285]) { const ring = Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [cx + Math.cos(a) * 0.088, cy + Math.sin(a) * 0.088, cz + zz]; }); stitches(mesh, ring, () => [0, 0, Math.sign(zz)], { count: 30, skinFn: rb, lift: 0.0005 }); }
      for (const a of [0.5, 2.6, 4.5]) roundBox(mesh, [cx + Math.cos(a) * (R0 + 0.002), cy + Math.sin(a) * (R0 + 0.002), cz], [0.0085, 0.0100, 0.0050], 0.001, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 10, m: m4.trs([0, 0, 0], qAxisAngle([0, 0, 1], a)) });
      tube(mesh, [cx, 1.052, cz], [cx, 1.080, cz], [[0, 0.0105], [0.5, 0.0095], [1, 0.0125]], { sides: 12, mat: MAT.WOOD, skinFn: rb, capStart: false, capEnd: true });                                    // stopper
      { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; pts.push([cx + Math.sin(a) * 0.021, 1.050 + Math.sin(a * 2) * 0.003, cz + (1 - Math.cos(a)) * 0.012]); } for (let i = 0; i < 10; i++) tube(mesh, pts[i], pts[i + 1], [[0, 0.0011], [1, 0.0011]], { sides: 4, mat: MAT.TIN, skinFn: rb, smoothNormals: false }); }
      break; }
    case 'haversack': { const b = BI.gear_haversack, rb = () => [[b, 1]], c = [-0.215, 0.975, -0.075], xf = c[0] - 0.003 - 0.022;
      { const pts = [[-0.143, 0.145], [0.143, 0.145], [0.143, 0.030], [-0.143, 0.030], [-0.143, 0.145]].map(([z, y]) => [xf - 0.0006, c[1] + y, c[2] + z]); const dense = []; for (let i = 0; i + 1 < pts.length; i++) for (let k = 0; k < 4; k++) dense.push(v3.lerp(pts[i], pts[i + 1], k / 4)); dense.push(pts[pts.length - 1]); stitches(mesh, dense, () => [-1, 0, 0], { count: 40, skinFn: rb, lift: 0.0004 }); }
      button(mesh, [xf - 0.0005, c[1] + 0.045, c[2]], [-1, 0, 0], 0.0105, { mat: MAT.CANVAS, skinFn: rb, holes: 4, sides: 14 });
      for (const z of [-0.05, 0.05]) roundBox(mesh, [xf + 0.0035, c[1] + 0.115, c[2] + z], [0.0035, 0.018, 0.0085], 0.001, { mat: MAT.CANVAS, skinFn: rb, sides: 10 }); break; }
    case 'knapsack': { const b = BI.gear_pack, rb = () => [[b, 1]], zb = -0.155 - 0.055;
      for (const sx of [-0.06, 0.06]) { roundBox(mesh, [sx, 1.30, zb - 0.0035], [0.012, 0.0150, 0.0032], 0.0015, { mat: MAT.BRASS, skinFn: rb, sides: 10 }); roundBox(mesh, [sx, 1.30, zb - 0.0066], [0.0100, 0.0105, 0.0016], 0.001, { mat: MAT.IRON, skinFn: rb, sides: 8 }); roundBox(mesh, [sx, 1.38, zb - 0.0016], [0.010, 0.060, 0.0012], 0.0006, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 8 }); }
      { const pts = [[-0.148, 1.405], [0.148, 1.405], [0.148, 1.135], [-0.148, 1.135], [-0.148, 1.405]].map(([x, y]) => [x, y, zb - 0.0006]); const dense = []; for (let i = 0; i + 1 < pts.length; i++) for (let k = 0; k < 6; k++) dense.push(v3.lerp(pts[i], pts[i + 1], k / 6)); dense.push(pts[pts.length - 1]); stitches(mesh, dense, () => [0, 0, -1], { count: 56, skinFn: rb, lift: 0.0004 }); }
      { const m = new Mesh('r'); for (const sx of [-0.15, 0.15]) rivet(mesh, [sx, 1.27, -0.155], [sx > 0 ? 1 : -1, 0, 0], 0.0045, { mat: MAT.BRASS, skinFn: rb, sides: 8 }); void m; } break; }
    case 'blanket_roll': { const sk2 = p => [[BI.spine3, 0.5], [BI.gear_blanket, 0.5]]; for (const f of [0.17, 0.55, 0.82]) { const base = [[0.10, 1.43, -0.02], [0.14, 1.40, 0.05], [0.05, 1.25, 0.15], [-0.10, 1.08, 0.15], [-0.20, 0.97, 0.09], [-0.19, 1.05, -0.14], [-0.02, 1.25, -0.17], [0.11, 1.40, -0.10]], i = Math.floor(f * 8), p = v3.lerp(base[i], base[(i + 1) % 8], (f * 8) % 1); tube(mesh, v3.add(p, [-0.045, -0.045, 0]), v3.add(p, [0.045, 0.045, 0]), [[0, 0.0034], [1, 0.0034]], { sides: 5, mat: MAT.ROPE, skinFn: sk2, capStart: true, capEnd: true, disp: null }); } break; }
    case 'tin_cup': { const rb = () => [[BI.gear_canteen, 1]], pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI; pts.push([0.262 + Math.cos(a) * 0.0105, 0.89 + Math.sin(a) * 0.0235, -0.06]); } for (let i = 0; i < 10; i++) tube(mesh, pts[i], pts[i + 1], [[0, 0.0030], [1, 0.0030]], { sides: 6, mat: MAT.TIN, skinFn: rb, smoothNormals: false }); break; }
    default: break;
  }
  void shape;
}

// ---------------------------------------------------------------- accoutrements. kind -> Mesh (rest pose, world coordinates). opt: { shape, army, variant }
export function buildAccoutrement(kind, lod, opt = {}) {
  const mesh = new Mesh('acc:' + kind), shape = opt.shape ?? NEUTRAL, R = RES[lod], sk = skinTorsoBoth();
  const torsoN = p => { const t = torsoAt(clamp(p[1], 0.5, 1.46), shape); return v3.norm([p[0] / (t.rx * t.rx), 0, (p[2] - t.cz) / (t.rz * t.rz)]); };
  const strapTo = (pts, w, mat, skin) => strap(mesh, pts, w, 0.004, { mat, skinFn: skin ?? sk, sides: 4, smoothNormals: false, nrm: torsoN });
  switch (kind) {
    case 'belt': {                                                                                   // waist belt with a plate (opt.plate: oval_us | rect_eagle | plain | upside_down)
      const t = torsoAt(1.0, shape); const e = 0.046;      // the waist belt lies over the sash (e 0.040) and the coat (ease 0.014-0.034): a thin belt at 0.034 let the sash show through the coat folds as red patches
      loft(mesh, [{ c: [0, 0.985, t.cz], u: [1, 0, 0], v: [0, 0, 1], ru: t.rx + e, rv: t.rz + e }, { c: [0, 1.03, t.cz], u: [1, 0, 0], v: [0, 0, 1], ru: t.rx + e, rv: t.rz + e }], { sides: R.torso, mat: MAT.LEATHER_BLACK, skinFn: rigidTo(BI.pelvis), capStart: false });
      if (lod === 0) beltDetail(mesh, opt.plate ?? 'oval_us', t, e, shape);
      break;
    }
    case 'cartbox': {                                                                                // right hip, 40 rounds (US) or CS copy; opt.sling for the shoulder sling
      const b = BI.gear_cartbox, c = [-0.185, 0.905, 0.045];
      if (lod === 0) { roundBox(mesh, c, [0.085, 0.060, 0.030], 0.004, { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(b), sides: 20 }); roundBox(mesh, [c[0], c[1] + 0.035, c[2] + 0.002], [0.090, 0.040, 0.0345], 0.004, { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(b), sides: 20 }); cartboxDetail(mesh, c, opt, b); }
      else { box(mesh, c, [0.085, 0.060, 0.030], { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(b) }); if (lod <= 1) box(mesh, [c[0], c[1] + 0.035, c[2] + 0.002], [0.090, 0.040, 0.0345], { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(b) }); }
      if (opt.sling) strapTo(pathAcross([0.13, 1.42], [-0.20, 0.92], 8, t => (t < 0.5 ? 1 : 1), 0.028, shape), 0.045, MAT.LEATHER_BLACK);
      break;
    }
    case 'cap_pouch': { const b = BI.pelvis; box(mesh, [-0.075, 0.975, 0.128], [0.030, 0.026, 0.014], { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(b) }); if (lod === 0) ellipsoid(mesh, [-0.075, 0.985, 0.143], [0.008, 0.008, 0.002], 6, 3, { mat: MAT.BRASS, skinFn: rigidTo(b) }); break; }
    case 'bayonet_scabbard': {                                                                      // left hip, hanging in a frog, tip behind the thigh
      const b = BI.gear_scabbard; loft(mesh, [0, 0.5, 1].map((t, i) => ({ c: [0.18 + 0.01 * t, 0.93 - 0.50 * t, 0.025 - 0.03 * t], u: [1, 0, 0], v: [0, 0, 1], ru: 0.014 - 0.006 * t, rv: 0.011 - 0.004 * t })), { sides: [8, 5, 4][lod], mat: MAT.LEATHER_BLACK, skinFn: rigidTo(b), capStart: true, capEnd: true });
      if (lod === 0) { box(mesh, [0.18, 0.935, 0.03], [0.022, 0.03, 0.012], { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(b) }); ellipsoid(mesh, [0.185, 0.50, 0.01], [0.008, 0.012, 0.008], 6, 3, { mat: MAT.BRASS, skinFn: rigidTo(b) }); }
      break;
    }
    case 'canteen': {                                                                               // drum canteen on the hip behind the haversack side; cloth cover; strap over the opposite shoulder
      const b = BI.gear_canteen, ax = [0, 0, 1]; const prof = lod === 0 ? [[0, -0.030], [0.04, -0.0295], [0.075, -0.0285], [0.088, -0.0265], [0.095, -0.0225], [0.0985, -0.0135], [0.0995, 0], [0.0985, 0.0135], [0.095, 0.0225], [0.088, 0.0265], [0.075, 0.0285], [0.04, 0.0295], [0, 0.030]] : [[0, -0.03], [0.085, -0.028], [0.097, -0.02], [0.099, 0], [0.097, 0.02], [0.085, 0.028], [0, 0.03]];
      const cmesh = new Mesh('c'); lathe(cmesh, prof, [28, 8, 5][lod], { mat: opt.wood ? MAT.WOOD : MAT.BLANKET, skinFn: rigidTo(b), closed: true });
      mesh.append(cmesh, m4.trs([0.205, 0.955, -0.08], qAxisAngle([1, 0, 0], Math.PI / 2 + 0.05)));
      if (lod <= 1) tube(mesh, [0.205, 1.045, -0.08], [0.205, 1.07, -0.08], [[0, 0.012], [1, 0.011]], { sides: 6, mat: MAT.TIN, skinFn: rigidTo(b), capStart: true, capEnd: true });
      void ax; break;
    }
    case 'haversack': {                                                                             // right hip rear; painted canvas; strap over the left shoulder
      const b = BI.gear_haversack, c = [-0.215, 0.975, -0.075];
      box(mesh, c, [0.020, 0.140, 0.140], { mat: opt.painted ? MAT.CANVAS : MAT.CANVAS, skinFn: rigidTo(b), flag: opt.painted ? 2 : 0 });
      if (lod <= 1) box(mesh, [c[0] - 0.003, c[1] + 0.085, c[2]], [0.022, 0.060, 0.143], { mat: MAT.CANVAS, skinFn: rigidTo(b) });
      break;
    }
    case 'knapsack': {                                                                              // box on the back with a rolled blanket on top; opt.fur for the Berdan fur-covered pack
      const b = BI.gear_pack; box(mesh, [0, 1.27, -0.155], [0.150, 0.150, 0.055], { mat: opt.fur ? MAT.BLANKET : MAT.CANVAS, skinFn: rigidTo(b) });
      if (lod <= 1) { const rm = new Mesh('r'); tube(rm, [-0.19, 0, 0], [0.19, 0, 0], limbProfile(0.052, 0.052, 2, 0.12), { sides: [12, 6, 4][lod], mat: MAT.BLANKET, skinFn: rigidTo(BI.gear_blanket), capStart: false }); mesh.append(rm, m4.translation([0, 1.465, -0.155])); }
      if (lod === 0) for (const s of [1, -1]) strapTo([[s * 0.09, 1.40, -0.115], [s * 0.095, 1.42, 0.0], [s * 0.10, 1.40, 0.075], [s * 0.07, 1.18, 0.12], [s * 0.05, 1.03, 0.09]], 0.035, MAT.LEATHER_BLACK);
      break;
    }
    case 'blanket_roll': {                                                                          // horse-collar roll over the left shoulder, tied at the right hip
      const pts = [[0.10, 1.43, -0.02], [0.14, 1.40, 0.05], [0.05, 1.25, 0.15], [-0.10, 1.08, 0.15], [-0.20, 0.97, 0.09], [-0.19, 1.05, -0.14], [-0.02, 1.25, -0.17], [0.11, 1.40, -0.10]].map(p => p); const sm = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let k = 0; k < 3; k++) sm.push(v3.lerp(a, b, k / 3)); }
      strap(mesh, sm, 0.085, 0.085, { mat: MAT.BLANKET, skinFn: p => [[BI.spine3, 0.5], [BI.gear_blanket, 0.5]], sides: [8, 5, 4][lod], smoothNormals: true }); break;
    }
    case 'gum_blanket': tube(mesh, [-0.17, 1.465, -0.20], [0.17, 1.465, -0.20], limbProfile(0.04, 0.04, 2, 0.1), { sides: [10, 5, 4][lod], mat: MAT.GUM_RUBBER, skinFn: rigidTo(BI.gear_pack), capStart: false }); break;
    case 'tin_cup': tube(mesh, [0.262, 0.87, -0.06], [0.262, 0.915, -0.06], [[0, 0.032], [1, 0.038]], { sides: [10, 6, 4][lod], mat: MAT.TIN, skinFn: rigidTo(BI.gear_canteen), capStart: true, capEnd: false }); break;
    case 'sash': {                                                                                  // waist sash (Zouave: wider) with two tails
      const t = torsoAt(1.04, shape), wide = opt.wide ? 0.07 : 0.05;
      loft(mesh, [{ c: [0, 1.04 - wide, t.cz], u: [1, 0, 0], v: [0, 0, 1], ru: t.rx + 0.040, rv: t.rz + 0.040 }, { c: [0, 1.04 + wide, t.cz], u: [1, 0, 0], v: [0, 0, 1], ru: t.rx + 0.040, rv: t.rz + 0.040 }], { sides: R.torso, mat: MAT.SASH, skinFn: rigidTo(BI.pelvis), capStart: false });
      if (lod <= 1) tube(mesh, [0.13, 1.0, t.cz + t.rz], [0.15, 0.78, t.cz + t.rz + 0.01], [[0, 0.018], [0.35, 0.026], [0.8, 0.030], [1, 0.026]], { sides: 8, mat: MAT.SASH, skinFn: rigidTo(BI.gear_sash_tail), capStart: true, capEnd: true, ex: 1, ey: 0.45, disp: (a, i, v) => 0.003 * Math.sin(a * 2 + v * 38) * (i > 0 ? 1 : 0) });
      break;
    }
    case 'poncho': { const rings = torsoRingsPoncho(shape, [8, 4, 2][lod]); loft(mesh, rings, { sides: R.torso, mat: MAT.GUM_RUBBER, skinFn: sk }); break; }
    case 'overcoat_roll': tube(mesh, [-0.19, 1.455, -0.19], [0.19, 1.455, -0.19], limbProfile(0.06, 0.06, 2, 0.1), { sides: [10, 5, 4][lod], mat: MAT.TROUSERS, skinFn: rigidTo(BI.gear_blanket), capStart: false }); break;
    case 'shelter_half': box(mesh, [0, 1.46, -0.19], [0.15, 0.022, 0.05], { mat: MAT.CANVAS, skinFn: rigidTo(BI.gear_blanket) }); break;
    case 'tools': { tube(mesh, [-0.10, 1.05, -0.20], [-0.10, 1.55, -0.20], [[0, 0.014], [1, 0.012]], { sides: 6, mat: MAT.WOOD, skinFn: rigidTo(BI.gear_pack), capStart: true, capEnd: true }); box(mesh, [-0.10, 1.57, -0.20], [0.06, 0.07, 0.006], { mat: MAT.IRON, skinFn: rigidTo(BI.gear_pack) }); break; }
    case 'cavalry_set': {                                                                           // M1858 sword belt, holster butt-forward on the right, carbine box and sling
      const t = torsoAt(1.0, shape), e = 0.034;
      loft(mesh, [{ c: [0, 0.975, t.cz], u: [1, 0, 0], v: [0, 0, 1], ru: t.rx + e, rv: t.rz + e }, { c: [0, 1.03, t.cz], u: [1, 0, 0], v: [0, 0, 1], ru: t.rx + e, rv: t.rz + e }], { sides: R.torso, mat: MAT.LEATHER_BLACK, skinFn: rigidTo(BI.pelvis), capStart: false });
      if (lod <= 1) { box(mesh, [-0.195, 0.86, 0.045], [0.026, 0.085, 0.060], { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(BI.gear_cartbox) }); box(mesh, [-0.195, 0.935, 0.06], [0.02, 0.03, 0.03], { mat: MAT.WOOD, skinFn: rigidTo(BI.gear_cartbox), flag: 0 }); box(mesh, [-0.16, 0.86, -0.07], [0.04, 0.055, 0.025], { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(BI.gear_cartbox) }); }
      if (lod === 0) strapTo(pathAcross([0.13, 1.42], [-0.20, 1.0], 8, () => 1, 0.026, shape), 0.04, MAT.LEATHER_BLACK);
      break;
    }
    default: throw new Error('unknown accoutrement ' + kind);
  }
  accDetail(kind, mesh, lod, opt, shape);
  if (kind === 'canteen') {                                                                         // the drum hangs flat against the left hip: its faces look outward (+x), not forward
    mesh.transform(m4.mul(m4.translation([CANTEEN_C[0], CANTEEN_C[1], CANTEEN_C[2]]), m4.mul(m4.trs([0, 0, 0], qAxisAngle([0, 1, 0], Math.PI / 2)), m4.translation([-0.205, -0.955, 0.08]))));
    if (lod === 0) slingLoop(mesh, { shoulder: -1, lugs: canteenLugs(), w: 0.025, mat: MAT.LEATHER_BLACK, shape, off: 0.024, torsoN });
  } else if (kind === 'haversack' && lod === 0) slingLoop(mesh, { shoulder: 1, lugs: haversackLugs(), w: 0.030, mat: MAT.CANVAS, shape, off: 0.026, torsoN });
  mesh.meta = { closed: false, openOk: true }; return mesh;
}
// ---- the hanging gear touches: a shoulder strap is a closed loop, so it runs down the FRONT and the BACK of the torso from the shoulder crest to the two lugs of the bag or drum; each run follows the clothed torso
// surface (bodyPt) and blends into the lug in the last fifth, where the strap runs through the lug loop. (Before: one run only, ending on the torso at the wrong side: the canteen and haversack hung loose.)
export const CANTEEN_C = [0.215, 0.950, -0.060], CANTEEN_R = 0.0995;
export const canteenLugs = () => [[CANTEEN_C[0] + 0.006, CANTEEN_C[1] + CANTEEN_R * Math.cos(0.70), CANTEEN_C[2] + CANTEEN_R * Math.sin(0.70)], [CANTEEN_C[0] + 0.006, CANTEEN_C[1] + CANTEEN_R * Math.cos(0.70), CANTEEN_C[2] - CANTEEN_R * Math.sin(0.70)]];
export const haversackLugs = () => [[-0.212, 1.110, 0.030], [-0.212, 1.110, -0.180]];
function slingLoop(mesh, { shoulder, lugs, w, mat, shape, off, torsoN }) {
  const S = [shoulder * 0.115, 1.436], skin = () => [[BI.spine2, 0.6], [BI.pelvis, 0.4]];
  [1, -1].forEach((side, k) => {
    const lug = lugs[k], pts = [], N = 12;
    for (let i = 0; i <= N; i++) { const t = i / N, x = S[0] + (lug[0] - S[0]) * t, y = S[1] + (lug[1] - S[1]) * t, b = bodyPt(x, y, side, off * (i === 0 ? 0.8 : 1), shape), u = smoothstepLocal(0.86, 1, t);
      pts.push([lerpN(b[0], lug[0], u), lerpN(b[1], lug[1], u), lerpN(b[2], lug[2], u)]); }
    strap(mesh, pts, w, 0.004, { mat, skinFn: skin, sides: 4, smoothNormals: false, nrm: p => (p[1] > 1.40 ? [0, 1, 0] : torsoN(p)) });
    const e = pts[pts.length - 1]; roundBox(mesh, [e[0], e[1] + 0.003, e[2]], [0.003, 0.009, w * 0.55], 0.001, { mat: MAT.BRASS, skinFn: rigidTo(BI.gear_haversack), sides: 8 });          // buckle / lug at the end of the run
  });
}
const lerpN = (a, b, t) => a + (b - a) * t, smoothstepLocal = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function torsoRingsPoncho(shape, n) { const rings = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), y = 1.46 - t * 0.75, tt = torsoAt(Math.min(1.44, y), shape); rings.push({ c: [0, y, tt.cz], u: [1, 0, 0], v: [0, 0, 1], ru: tt.rx + 0.08 + 0.1 * t, rv: tt.rz + 0.08 + 0.1 * t }); } return rings; }

// ---------------------------------------------------------------- long arms. Built in the prop frame: butt toe at the origin (world rest = the prop_long bone head), +y = muzzle, +z = the lock-side/front direction used for sights.
// spec: { overall_in, barrel_in, bore_in, kind: rifle_musket|carbine|musketoon|repeater_tube|henry|scoped, bands, brass_furniture, scope, tube_under, butt_trap, dims: 'record'|'gap' }
// SOCKET CONFORMANCE (ANIM3D-NOTES section 8, rifle-spec.mjs): the grips of the animation meet this mesh at the M1861 numbers: wrist (small of the stock) 0.30 m, lock 0.46 m, lower band 0.85 m, upper band
// 1.15 m from the butt toe of the 56 in. arm; other arms scale those positions by overall length / 56 in.
// Traits by weapon name (tier plausible-procedural; the presence of sling swivels and the breech-loading action shapes are NOT looked up: register EG-FIG-0010):
export const ARM_TRAITS = name => {
  const n = name || ''; const breech = /sharps|burnside|gallager|smith_carbine|merrill|spencer|henry|revolving/.test(n);
  return { breech, lever: /sharps|burnside|gallager|smith_carbine|merrill|hankins/.test(n), spencer: /spencer/.test(n), henry: /henry/.test(n), swivels: /enfield|whitworth|kerr|lorenz|carbine|musketoon|sharps|spencer|henry|richmond/.test(n) && !/m18(41|55|61|63)/.test(n), percussionLock: !/spencer|henry|burnside/.test(n) };
};
export function buildLongArm(spec, lod, opt = {}) {
  const mesh = new Mesh('arm:' + (opt.name ?? spec.kind)), L = spec.overall_in * IN, B = spec.barrel_in * IN, yb = L - B, bore = (spec.bore_in ?? 0.58) * IN, bands = spec.bands ?? 3, F0 = lod === 0, tr = ARM_TRAITS(opt.name);
  const mw = spec.stock_mat ?? MAT.WOOD, sk = rigidTo(BI.prop_long), ox = opt.origin ?? H('prop_long'), P = (x, y, z) => [x + ox[0], y + ox[1], z + ox[2]];
  const sd = [24, 6, 4][lod], K = L / (56 * IN);                                                                    // K scales the M1861 layout to this arm
  const yWrist = M1861.wrist * K, yLock = M1861.lock * K, yLower = M1861.lower_band * K, yUpper = M1861.upper_band * K;
  // stock: from the butt plate to just short of the muzzle; z is the drop direction (toward -z = underside). The wrist ring sits exactly at yWrist (the grip position of the animation).
  const sRings = [[0.0, 0.020, 0.058, -0.040], [0.025, 0.0205, 0.0545, -0.037], [0.07, 0.0195, 0.047, -0.031], [0.14 * K, 0.0165, 0.036, -0.018], [0.22 * K, 0.0155, 0.0315, -0.010], [yWrist, 0.0148, 0.0290, -0.006], [yWrist + 0.07 * K, 0.0152, 0.0320, -0.004], [yLock + 0.07 * K, 0.0155, 0.0290, -0.002], [Math.max(yLock + 0.18 * K, yb * 0.8), 0.0140, 0.0245, -0.001], [yb + 0.40 * B, 0.013, 0.021, -0.001], [yb + 0.75 * B, 0.0125, 0.0200, -0.0015], [L - 0.07, 0.012, 0.019, -0.002]].filter((r, i, a) => i === 0 || r[0] > a[i - 1][0] + 1e-3);
  const keep = F0 ? sRings : lod === 1 ? [sRings[0], sRings[3], sRings[5], sRings[sRings.length - 1]] : [sRings[0], sRings[sRings.length - 1]];
  loft(mesh, keep.map(([y, rx, rz, cz]) => ({ c: P(0, y, cz), u: [1, 0, 0], v: [0, 0, 1], ru: rx, rv: rz })), { sides: sd, mat: mw, skinFn: sk, capStart: true, capEnd: true });
  // barrel (steel), from the breech to the muzzle; rings give the breech swell and the muzzle taper
  const barrelProf = F0 ? [[0, bore * 1.45], [0.04, bore * 1.38], [0.15, bore * 1.20], [0.5, bore * 1.06], [0.9, bore * 0.99], [0.97, bore * 1.02], [1, bore * 0.98]] : [[0, bore * 1.35], [0.15, bore * 1.15], [1, bore * 0.98]];
  tube(mesh, P(0, yb - 0.05, 0.020), P(0, L, 0.020), barrelProf, { sides: sd + 2, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });
  if (lod <= 1 && bands > 0) {
    const bandYs = bands === 3 ? [yLower, (yLower + yUpper) / 2, yUpper] : bands === 2 ? [yLower, yUpper] : [yUpper];
    for (const y of bandYs) if (spec.bands !== 0) tube(mesh, P(0, y - 0.011, 0.012), P(0, y + 0.011, 0.012), F0 ? [[0, 0.0190], [0.12, 0.0200], [0.5, 0.0197], [0.88, 0.0200], [1, 0.0190]] : [[0, 0.0195], [1, 0.0195]], { sides: sd + 2, mat: spec.brass_furniture ? MAT.BRASS : MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });
  }
  if (F0) longArmDetail(mesh, spec, opt, { L, B, yb, bore, K, yWrist, yLock, yLower, yUpper, tr, P, sk, sd });
  if (spec.tube_under) tube(mesh, P(0, yb + 0.02, -0.0145), P(0, L - 0.03, -0.0145), [[0, 0.0075], [1, 0.0075]], { sides: sd, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });
  if (spec.scope && lod <= 1) tube(mesh, P(0, yb + 0.0, 0.050), P(0, yb + B * 0.62, 0.050), [[0, 0.010], [0.5, 0.0085], [1, 0.0105]], { sides: sd, mat: MAT.GUNMETAL, skinFn: sk, capStart: true, capEnd: true });
  if (spec.butt_trap && lod === 0) box(mesh, P(0, 0.07, -0.042), [0.010, 0.04, 0.006], { mat: MAT.BRASS, skinFn: sk });
  if (opt.bayonet === 'fixed') bayonet(mesh, lod, P, sk, L, sd);
  mesh.meta = { closed: false, openOk: true, sockets: { butt: [0, 0, 0], wrist: [0, yWrist, 0], lock_nipple: [0.012, yLock, 0.03], small_of_stock: [0, yWrist, 0], lower_band: [0, yLower, 0.012], upper_band: [0, yUpper, 0.012], fore_end: [0, yUpper, 0], muzzle: [0, L, 0.02], ramrod_head: [0, L - 0.03, -0.004], bayonet_tip: [0.026, L + 0.457, 0.012] }, frame: 'prop_long (offsets relative to the butt toe)', overall_m: L, barrel_m: B, socket_basis: 'ANIM3D-NOTES section 8: M1861 wrist 0.30, lock 0.46, lower band 0.85, upper band 1.15 m; other arms scale by length/56 in.', traits: tr };
  return mesh;
}
// ---- LOD0 furniture: butt plate with screws, lock (plate, hammer, bolster, cone, screws), trigger guard and trigger, tang, sights, ramrod with head and pipes, band springs, sling swivels, side screws
function longArmDetail(mesh, spec, opt, G) {
  const { L, B, yb, bore, K, yWrist, yLock, yLower, yUpper, tr, P, sk } = G, brassF = !!spec.brass_furniture, FM = brassF ? MAT.BRASS : MAT.IRON, steel = MAT.STEEL;
  // butt plate (curved slab, toe and heel tangs) with two screws
  loft(mesh, [{ c: P(0, 0.0015, -0.0415), u: [1, 0, 0], v: [0, 0, 1], ru: 0.0205, rv: 0.0575 }, { c: P(0, 0.0045, -0.0415), u: [1, 0, 0], v: [0, 0, 1], ru: 0.0207, rv: 0.0578 }], { sides: 22, mat: FM, skinFn: sk, capStart: true, capEnd: true });
  tube(mesh, P(0, 0.004, 0.0165), P(0, 0.075, 0.0100), [[0, 0.0033], [1, 0.0028]], { sides: 8, mat: FM, skinFn: sk, ex: 4.5, ey: 0.45, capStart: true, capEnd: true });             // heel tang
  tube(mesh, P(0, 0.004, -0.098), P(0, 0.090, -0.082), [[0, 0.0033], [1, 0.0028]], { sides: 8, mat: FM, skinFn: sk, ex: 4.5, ey: 0.45, capStart: true, capEnd: true });           // toe tang
  for (const z of [0.003, -0.075]) rivet(mesh, P(0, 0.048 - (z > 0 ? 0 : 0), z), [1, 0, 0], 0.0038, { mat: FM, skinFn: sk, sides: 8, slot: true });
  // lock plate with bevelled edge, hammer on the side, bolster/cone, screws
  const lx = 0.0215, lc = yLock - 0.012;
  roundBox(mesh, P(lx, lc, 0.011), [0.0042, 0.060, 0.0165], 0.003, { mat: steel, skinFn: sk, sides: 14 });
  roundBox(mesh, P(-lx, lc, 0.011), [0.0034, 0.045, 0.0130], 0.003, { mat: steel, skinFn: sk, sides: 12 });                                                                   // side plate on the opposite flank
  for (const [dy, dz] of [[0.050, 0.014], [-0.044, 0.013]]) { rivet(mesh, P(lx + 0.0042, lc + dy, dz), [1, 0, 0], 0.0030, { mat: FM, skinFn: sk, sides: 8, slot: true }); rivet(mesh, P(-lx - 0.0034, lc + dy * 0.8, dz * 0.9), [-1, 0, 0], 0.0030, { mat: FM, skinFn: sk, sides: 8, slot: true }); }
  if (tr.percussionLock) {
    const hy = yLock - 0.045;
    tube(mesh, P(lx + 0.004, hy, 0.002), P(lx + 0.004, hy + 0.030, 0.026), [[0, 0.0050], [0.5, 0.0040], [1, 0.0034]], { sides: 8, mat: steel, skinFn: sk, ex: 0.7, capStart: true, capEnd: true });                // hammer neck
    ellipsoid(mesh, P(lx + 0.004, hy + 0.034, 0.030), [0.0040, 0.0100, 0.0085], 10, 6, { mat: steel, skinFn: sk });                                                                             // hammer head (comb and nose)
    tube(mesh, P(lx + 0.004, hy + 0.040, 0.034), P(lx + 0.004, hy + 0.058, 0.024), [[0, 0.0034], [1, 0.0018]], { sides: 6, mat: steel, skinFn: sk, capStart: true, capEnd: true });                 // spur
    ellipsoid(mesh, P(lx + 0.004, hy + 0.003, 0.0), [0.0044, 0.0076, 0.0076], 10, 6, { mat: steel, skinFn: sk });                                                                               // tumbler boss
    const cy = yLock + 0.002; lathe(mesh, [[0, 0.0], [0.0075, 0], [0.0075, 0.004], [0.0055, 0.004], [0.0045, 0.012], [0.0030, 0.0125], [0.0020, 0.0125], [0, 0.0125]], 6, { center: P(0.0115, cy, 0.0305), mat: steel, skinFn: sk, closed: true, phase: 0.2 });   // cone/nipple (hex)
    box(mesh, P(0.0115, cy, 0.0285), [0.007, 0.012, 0.0095], { mat: steel, skinFn: sk });                                                                                                           // bolster
  } else { box(mesh, P(0, lc, 0.0235), [0.016, 0.040, 0.006], { mat: MAT.BRASS, skinFn: sk }); }
  // tang strap along the top of the wrist, trigger plate, guard bow (arc of 10 rings), trigger
  box(mesh, P(0, yb + 0.045, 0.0285), [0.0055, 0.050, 0.0015], { mat: steel, skinFn: sk });
  { const arc = []; for (let i = 0; i <= 12; i++) { const t = i / 12, y = yWrist - 0.07 * K + t * (0.30 * K), z = -0.026 - 0.030 * Math.sin(t * Math.PI) * (tr.lever ? 1.6 : 1); arc.push(P(0, y, z)); }
    const rings = arc.map((p, i) => { const tg = v3.norm(v3.sub(arc[Math.min(12, i + 1)], arc[Math.max(0, i - 1)])); return { c: p, u: [1, 0, 0], v: v3.norm(v3.cross(tg, [1, 0, 0])), ru: 0.0042, rv: 0.0028 }; });
    loft(mesh, rings, { sides: 8, mat: FM, skinFn: sk, capStart: true, capEnd: true }); }
  tube(mesh, P(0, yWrist + 0.01 * K, -0.0235), P(0, yWrist + 0.03 * K, -0.045), [[0, 0.0028], [1, 0.0016]], { sides: 6, mat: steel, skinFn: sk, capStart: true, capEnd: true });             // trigger
  roundBox(mesh, P(0, yWrist - 0.075 * K, -0.0235), [0.0058, 0.034, 0.0022], 0.002, { mat: FM, skinFn: sk, sides: 10 });
  // sights: rear sight base with a flip leaf and slide, front sight blade on its band
  const ry = yb + 0.19; box(mesh, P(0, ry, 0.0345), [0.0085, 0.014, 0.0085], { mat: steel, skinFn: sk });
  box(mesh, P(0, ry + 0.006, 0.0465), [0.0030, 0.0125, 0.0020], { mat: steel, skinFn: sk }); box(mesh, P(0, ry + 0.006, 0.0488), [0.0042, 0.0030, 0.0020], { mat: steel, skinFn: sk });
  box(mesh, P(0, ry - 0.012, 0.0405), [0.0100, 0.0030, 0.0035], { mat: steel, skinFn: sk });
  tube(mesh, P(0, L - 0.012, 0.0245), P(0, L - 0.012, 0.0365), [[0, 0.0034], [1, 0.0016]], { sides: 6, mat: steel, skinFn: sk, ex: 0.8, ey: 1, capStart: true, capEnd: true });
  box(mesh, P(0.0, L - 0.034, 0.0320), [0.0045, 0.0090, 0.0045], { mat: steel, skinFn: sk });                                                                                                     // bayonet stud
  // ramrod: rod, flared head, three pipes (thimbles) under the barrel
  if (spec.kind === 'rifle_musket' || spec.kind === 'musket' || spec.kind === 'scoped') {
    tube(mesh, P(0, yb + 0.12, -0.004), P(0, L - 0.05, -0.004), [[0, 0.0031], [1, 0.0031]], { sides: 8, mat: steel, skinFn: sk, capStart: true, capEnd: false });
    lathe(mesh, [[0, 0], [0.0031, 0], [0.0036, 0.004], [0.0075, 0.016], [0.0092, 0.020], [0.0082, 0.022], [0.0031, 0.0215], [0, 0.0215]], 14, { center: P(0, L - 0.050, -0.004), mat: steel, skinFn: sk, closed: true });
    for (const y of [yb + 0.12, (yLower + yUpper) / 2 - 0.05, L - 0.06]) tube(mesh, P(0, y - 0.012, -0.0135), P(0, y + 0.012, -0.0135), [[0, 0.0062], [1, 0.0062]], { sides: 10, mat: FM, skinFn: sk, capStart: true, capEnd: true });
  }
  // band springs and swivels
  for (const y of (spec.bands === 3 ? [yLower, (yLower + yUpper) / 2, yUpper] : spec.bands === 2 ? [yLower, yUpper] : [])) {
    tube(mesh, P(0, y - 0.045, 0.0185), P(0, y - 0.012, 0.0165), [[0, 0.0024], [1, 0.0018]], { sides: 6, mat: steel, skinFn: sk, ex: 2.2, ey: 0.6, capStart: true, capEnd: true });
    rivet(mesh, P(0.0196, y, 0.012), [1, 0, 0], 0.0030, { mat: steel, skinFn: sk, sides: 8, slot: true });
  }
  if (tr.swivels) for (const [y, z] of [[yWrist - 0.075 * K, -0.0235 - 0.03], [(yLower + yUpper) / 2, -0.0085]]) {
    const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2; pts.push(P(Math.cos(a) * 0.0085, y + Math.sin(a) * 0.0085 * 1.2, z - 0.0085)); }
    for (let i = 0; i < 12; i++) tube(mesh, pts[i], pts[i + 1], [[0, 0.0018], [1, 0.0018]], { sides: 5, mat: steel, skinFn: sk, smoothNormals: false });
  }
  if (tr.lever) { tube(mesh, P(0, yWrist - 0.05 * K, -0.058), P(0, yWrist + 0.08 * K, -0.062), [[0, 0.003], [1, 0.003]], { sides: 7, mat: FM, skinFn: sk, capStart: true, capEnd: true }); }
  void bore; void B; void opt;
}
// ---- socket bayonet: a socket with rings, locking collar and clasp slot, and a three-sided blade with fullers (18 in.)
function bayonet(mesh, lod, P, sk, L, sd) {
  const F0 = lod === 0;
  if (!F0) {
    tube(mesh, P(0.020, L - 0.07, 0.012), P(0.020, L + 0.03, 0.012), [[0, 0.0135], [1, 0.0125]], { sides: sd, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });
    tube(mesh, P(0.028, L + 0.0, 0.012), P(0.026, L + 0.46, 0.012), [[0, 0.0105], [1, 0.0008]], { sides: 3, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true }); return;
  }
  const o = P(0.0, 0, 0), sx = 0.020, sz = 0.012;
  lathe(mesh, [[0.0112, 0], [0.0138, 0.003], [0.0138, 0.008], [0.0124, 0.010], [0.0124, 0.030], [0.0146, 0.032], [0.0146, 0.038], [0.0128, 0.040], [0.0128, 0.088], [0.0112, 0.090], [0.0110, 0.098], [0.0108, 0.098]], 24, { center: [o[0] + sx, o[1] + L - 0.07, o[2] + sz], mat: MAT.STEEL, skinFn: sk, closed: false, flip: false });
  lathe(mesh, [[0.0148, 0.0], [0.0165, 0.003], [0.0165, 0.012], [0.0148, 0.015]], 24, { center: [o[0] + sx, o[1] + L - 0.045, o[2] + sz], mat: MAT.STEEL, skinFn: sk, closed: false });          // locking collar
  box(mesh, [o[0] + sx + 0.0128, o[1] + L - 0.040, o[2] + sz], [0.0018, 0.020, 0.0030], { mat: MAT.IRON, skinFn: sk });                                                                     // clasp slot (dark)
  box(mesh, [o[0] + sx + 0.0128, o[1] + L - 0.014, o[2] + sz], [0.0018, 0.0035, 0.0070], { mat: MAT.IRON, skinFn: sk });
  // blade: triangular section with three concave fullers (rfn), tapering to a point, 8 rings
  const bl = 0.457, rings = []; for (let i = 0; i <= 9; i++) { const t = i / 9, r = 0.0112 * (1 - 0.86 * t) + 0.0008; rings.push({ c: [o[0] + 0.0275 - 0.002 * t, o[1] + L + 0.0 + bl * t, o[2] + sz], u: [1, 0, 0], v: [0, 0, 1], ru: r, rv: r, rfn: a => 1.0 - 0.22 * Math.cos(3 * a) * (i === 9 ? 0 : 1) }); }
  loft(mesh, rings, { sides: 18, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });
}
// revolvers: frame + cylinder + barrel + grip; built at the origin pointing +z (muzzle), hand grip down; placed in a holster at the hip or in the hand by animation (prop_long frame is the long arm only)
export function buildHandgun(spec, lod, opt = {}) {
  const mesh = new Mesh('pistol:' + (opt.name ?? spec.kind)), sk = rigidTo(opt.bone ?? BI.gear_cartbox), P = (x, y, z) => v3.add([x, y, z], opt.origin ?? [0, 0, 0]), sd = [8, 5, 4][lod], Lb = (spec.barrel_in ?? 7.5) * IN;
  tube(mesh, P(0, 0.012, 0.05), P(0, 0.012, 0.05 + Lb), [[0, 0.0105], [1, 0.0085]], { sides: sd, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });
  tube(mesh, P(0, 0.01, 0.0), P(0, 0.01, 0.05), [[0, 0.0175], [1, 0.0175]], { sides: sd + 2, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });                    // cylinder
  box(mesh, P(0, 0.0, -0.045), [0.010, 0.020, 0.040], { mat: MAT.WOOD, skinFn: sk });
  if (lod === 0) {
    box(mesh, P(0, -0.05, -0.062), [0.011, 0.045, 0.022], { mat: MAT.WOOD, skinFn: sk });                                                                         // grip
    for (let c = 0; c < 6; c++) { const a = c / 6 * Math.PI * 2, y = 0.01 + Math.cos(a) * 0.0115, x = Math.sin(a) * 0.0115; tube(mesh, P(x, y, -0.006), P(x, y, 0.0005), [[0, 0.0030], [1, 0.0034]], { sides: 8, mat: MAT.IRON, skinFn: sk, capStart: true, capEnd: true }); }   // chambers (caps of the cylinder)
    pathTube(mesh, Array.from({ length: 10 }, (_, i) => { const a = i / 9 * Math.PI; return P(0, -0.012 - Math.sin(a) * 0.025, -0.02 + 0.075 * (i / 9) * 0.4 + (1 - Math.cos(a)) * 0.02); }), 0.0028, { sides: 6, mat: MAT.STEEL, skinFn: sk });   // trigger guard
    tube(mesh, P(0, 0.028, -0.062), P(0, 0.052, -0.080), [[0, 0.008], [1, 0.005]], { sides: 8, mat: MAT.STEEL, skinFn: sk, ex: 0.5, capStart: true, capEnd: true });  // hammer
    tube(mesh, P(0, 0.0, 0.052), P(0, -0.012, 0.145), [[0, 0.0065], [1, 0.0060]], { sides: 8, mat: MAT.STEEL, skinFn: sk, capStart: true, capEnd: true });         // loading lever
    for (const sx of [-1, 1]) rivet(mesh, P(sx * 0.0115, 0.002, -0.025), [sx, 0, 0], 0.0030, { mat: MAT.STEEL, skinFn: sk, sides: 8, slot: true });
    ellipsoid(mesh, P(0, 0.0185, 0.05 + Lb - 0.004), [0.0020, 0.0040, 0.0020], 6, 4, { mat: MAT.STEEL, skinFn: sk }); }
  mesh.meta = { closed: false, openOk: true }; return mesh;
}
export function buildHolster(lod, opt = {}) { const m = new Mesh('holster'), c = opt.origin ?? [-0.20, 0.80, 0.06]; if (lod === 0) { const rb = () => [[BI.gear_cartbox, 1]]; roundBox(m, c, [0.026, 0.090, 0.055], 0.006, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 18 }); roundBox(m, [c[0] - 0.0, c[1] + 0.055, c[2]], [0.028, 0.040, 0.057], 0.006, { mat: MAT.LEATHER_BLACK, skinFn: rb, sides: 18 }); rivet(m, [c[0] + 0.0, c[1] + 0.02, c[2] + 0.0575], [0, 0, 1], 0.006, { mat: MAT.BRASS, skinFn: rb, sides: 10 }); stitches(m, [[c[0] - 0.024, c[1] - 0.085, c[2] + 0.056], [c[0] - 0.024, c[1] + 0.02, c[2] + 0.056]], () => [0, 0, 1], { count: 14, skinFn: rb, lift: 0.0004 }); stitches(m, [[c[0] + 0.024, c[1] - 0.085, c[2] + 0.056], [c[0] + 0.024, c[1] + 0.02, c[2] + 0.056]], () => [0, 0, 1], { count: 14, skinFn: rb, lift: 0.0004 }); } else box(m, c, [0.026, 0.090, 0.055], { mat: MAT.LEATHER_BLACK, skinFn: rigidTo(BI.gear_cartbox) }); m.meta = { closed: false, openOk: true }; return m; }

// ---------------------------------------------------------------- swords. Built in the prop_sword frame: the guard/hilt at the bone head (0.17, 0.92, 0.02), blade along -y; opt.curve = radius of the blade arc (m) for sabres.
export function buildSword(spec, lod, opt = {}) {
  const mesh = new Mesh('sword:' + (opt.name ?? spec.kind)), sk = rigidTo(BI.prop_sword), H = BI.prop_sword, ox = [0.17, 0.92, 0.02];
  const bl = spec.blade_in * IN, w = (spec.blade_w ?? 0.034) / 2, curve = spec.curve ?? 0, steps = [8, 3, 1][lod];
  const pts = []; for (let i = 0; i <= steps; i++) { const t = i / steps, s = t * bl; let z = 0; if (curve) z = (1 - Math.cos(s / curve)) * curve * -0.8; pts.push(v3.add(ox, [0, -s, z])); }
  for (let i = 0; i < steps; i++) tube(mesh, pts[i], pts[i + 1], [[0, w * (1 - 0.35 * i / steps)], [1, w * (1 - 0.35 * (i + 1) / steps)]], { sides: 4, mat: MAT.STEEL, skinFn: sk, ex: 1, ey: 0.14, capStart: i === 0, capEnd: i === steps - 1, phase: Math.PI / 4, smoothNormals: false });
  if (lod <= 1) {
    box(mesh, v3.add(ox, [0, 0.012, 0]), [0.055, 0.008, 0.012], { mat: MAT.BRASS, skinFn: sk });                                    // guard
    tube(mesh, v3.add(ox, [0, 0.012, 0]), v3.add(ox, [0, 0.105, 0]), [[0, 0.013], [1, 0.011]], { sides: 6, mat: spec.grip_mat ?? MAT.LEATHER_BLACK, skinFn: sk, capStart: true, capEnd: true });  // grip
    ellipsoid(mesh, v3.add(ox, [0, 0.112, 0]), [0.016, 0.014, 0.016], 6, 4, { mat: MAT.BRASS, skinFn: sk });                        // pommel
    if (lod === 0 && spec.knuckle_bow) tube(mesh, v3.add(ox, [0.05, 0.01, 0]), v3.add(ox, [0.015, 0.10, 0]), [[0, 0.004], [1, 0.004]], { sides: 4, mat: MAT.BRASS, skinFn: sk, capStart: true, capEnd: true });
  }
  if (lod === 0) {                                                                                  // fuller, ricasso, wire-wrapped grip, quillon and knuckle bow, langet, pommel button
    const fb = []; for (let i = 0; i <= 12; i++) { const t = i / 12, s = t * bl * 0.92 + 0.02; fb.push(v3.add(ox, [0.0, -s, curve ? (1 - Math.cos(s / curve)) * curve * -0.8 + 0.0 : 0])); }
    pathTube(mesh, fb, t => 0.0020 * (1 - 0.6 * t), { sides: 5, mat: MAT.STEEL, skinFn: sk }); void w;
    for (let i = 0; i < 18; i++) { const y = 0.018 + i * 0.0049; tube(mesh, v3.add(ox, [0, y, 0]), v3.add(ox, [0, y + 0.0014, 0]), [[0, 0.0135], [1, 0.0135]], { sides: 10, mat: MAT.STEEL, skinFn: sk, capStart: false, capEnd: false }); }
    tube(mesh, v3.add(ox, [-0.055, 0.012, 0]), v3.add(ox, [0.055, 0.012, 0]), [[0, 0.0045], [0.5, 0.0035], [1, 0.0045]], { sides: 8, mat: MAT.BRASS, skinFn: sk, capStart: true, capEnd: true });
    tube(mesh, v3.add(ox, [0, -0.002, 0]), v3.add(ox, [0, -0.045, 0]), [[0, 0.010], [1, 0.006]], { sides: 8, mat: MAT.STEEL, skinFn: sk, ex: 1.4, ey: 0.5, capStart: true, capEnd: true });
    if (spec.knuckle_bow) pathTube(mesh, Array.from({ length: 10 }, (_, i) => { const a = i / 9 * Math.PI * 0.62; return v3.add(ox, [0.055 * Math.cos(a) * 0.9 + 0.0, 0.012 + 0.095 * Math.sin(a), 0.0]); }), 0.0034, { sides: 6, mat: MAT.BRASS, skinFn: sk });
  }
  mesh.meta = { closed: false, openOk: true, blade_m: bl }; return mesh;
}
// the scabbard (rest state: hangs from the left hip, blade inside)
export function buildScabbard(spec, lod, opt = {}) {
  const mesh = new Mesh('scabbard:' + (opt.name ?? spec.kind)), bl = (spec.blade_in + 1) * IN, curve = spec.curve ?? 0, steps = [6, 2, 1][lod], pts = [], ox = [0.17, 0.92, 0.02];
  for (let i = 0; i <= steps; i++) { const t = i / steps, s = t * bl; let z = 0; if (curve) z = (1 - Math.cos(s / curve)) * curve * -0.8; pts.push(v3.add(ox, [0.012 + 0.02 * t, -s - 0.02, z - 0.02 * t])); }
  const mat = spec.steel_scabbard ? MAT.STEEL : MAT.LEATHER_BLACK;
  for (let i = 0; i < steps; i++) tube(mesh, pts[i], pts[i + 1], [[0, 0.020 - 0.008 * i / steps], [1, 0.020 - 0.008 * (i + 1) / steps]], { sides: [8, 5, 4][lod], mat, skinFn: rigidTo(BI.gear_scabbard), ex: 1, ey: 0.5, capStart: i === 0, capEnd: i === steps - 1, smoothNormals: true });
  if (lod === 0) { for (const t of [0.3, 0.75]) { const i = Math.min(steps - 1, Math.floor(t * steps)), p = pts[i]; tube(mesh, v3.add(p, [-0.001, 0.008, 0]), v3.add(p, [-0.001, -0.008, 0]), [[0, 0.0235], [1, 0.0235]], { sides: 14, mat: MAT.BRASS, skinFn: rigidTo(BI.gear_scabbard), ex: 1, ey: 0.55, capStart: false }); rivet(mesh, v3.add(p, [0.026, 0, 0]), [1, 0, 0], 0.0045, { mat: MAT.BRASS, skinFn: rigidTo(BI.gear_scabbard), ring: true, sides: 8 }); }
    const e = pts[pts.length - 1]; tube(mesh, v3.add(e, [0, 0.07, 0]), v3.add(e, [0, -0.012, 0]), [[0, 0.0125], [1, 0.0035]], { sides: 10, mat: MAT.BRASS, skinFn: rigidTo(BI.gear_scabbard), ex: 1, ey: 0.5, capStart: false, capEnd: true }); }
  mesh.meta = { closed: false, openOk: true }; return mesh;
}

// ---------------------------------------------------------------- instruments
export function buildInstrument(kind, lod) {
  const mesh = new Mesh('instr:' + kind), sk = rigidTo(BI.prop_instr);
  if (kind === 'drum') { const prof = [[0, -0.14], [0.17, -0.14], [0.17, -0.12], [0.165, 0.12], [0.17, 0.12], [0.17, 0.14], [0, 0.14]]; const dm = new Mesh('d'); lathe(dm, prof, [18, 8, 6][lod], { mat: MAT.DRUM_SKIN, skinFn: sk, closed: true }); mesh.append(dm, m4.trs([0.0, 0.78, 0.26], qAxisAngle([1, 0, 0], Math.PI / 2 - 0.35))); if (lod <= 1) tube(mesh, [-0.15, 0.62, 0.34], [0.15, 0.62, 0.34], [[0, 0.004], [1, 0.004]], { sides: 4, mat: MAT.ROPE, skinFn: sk, capStart: true, capEnd: true });
    if (lod === 0) { const c = [0.0, 0.78, 0.26], ax = [0, Math.sin(0.35 + 0), Math.cos(0.35)], u = [1, 0, 0], v = v3.norm(v3.cross(ax, u)); const zig = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, rr = 0.172, h = (i % 2 ? 0.125 : -0.125); zig.push(v3.add(c, v3.add(v3.mul(u, Math.cos(a) * rr), v3.add(v3.mul(v, Math.sin(a) * rr), v3.mul(ax, h))))); } pathTube(mesh, zig, 0.0022, { sides: 4, mat: MAT.ROPE, skinFn: sk }); for (const h of [-0.14, 0.14]) { const ring = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; ring.push(v3.add(c, v3.add(v3.mul(u, Math.cos(a) * 0.175), v3.add(v3.mul(v, Math.sin(a) * 0.175), v3.mul(ax, h))))); } pathTube(mesh, ring, 0.006, { sides: 6, mat: MAT.WOOD, skinFn: sk, closed: true }); } } }
  else if (kind === 'fife') tube(mesh, [-0.15, 1.0, 0.25], [0.15, 1.0, 0.25], [[0, 0.011], [1, 0.011]], { sides: [8, 5, 4][lod], mat: MAT.WOOD, skinFn: sk, capStart: true, capEnd: true });
  else if (kind === 'bugle') { tube(mesh, [-0.05, 1.0, 0.25], [0.12, 1.0, 0.25], [[0, 0.007], [1, 0.007]], { sides: 6, mat: MAT.BRASS, skinFn: sk, capStart: true, capEnd: true }); const bm = new Mesh('b'); lathe(bm, [[0.0, 0], [0.008, 0.01], [0.03, 0.12], [0.075, 0.22], [0.075, 0.215], [0.026, 0.115], [0.005, 0.01]], [14, 8, 6][lod], { mat: MAT.BRASS, skinFn: sk, closed: true }); mesh.append(bm, m4.trs([0.12, 1.0, 0.25], qAxisAngle([0, 0, 1], -Math.PI / 2))); }
  else if (kind === 'wigwag') { tube(mesh, [0.0, 0.0, 0.2], [0.0, 2.4, 0.2], [[0, 0.015], [1, 0.012]], { sides: 6, mat: MAT.WOOD, skinFn: sk, capStart: true, capEnd: true }); quad4(mesh, [0, 2.4, 0.2], [0.0, 2.4, 0.2], [0.0, 2.4, 0.2], [0, 2.4, 0.2], { mat: MAT.FLAG_WHITE, skinFn: sk }); }
  else if (kind === 'stretcher') { box(mesh, [0, 0.9, 0.0], [0.28, 0.01, 1.0], { mat: MAT.CANVAS, skinFn: sk }); for (const s of [1, -1]) tube(mesh, [s * 0.29, 0.9, -1.1], [s * 0.29, 0.9, 1.1], [[0, 0.02], [1, 0.02]], { sides: 6, mat: MAT.WOOD, skinFn: sk, capStart: true, capEnd: true }); }
  else throw new Error('unknown instrument ' + kind);
  mesh.meta = { closed: false, openOk: true }; return mesh;
}
// a flag staff (prop_pole frame: ferrule at the origin, +y up): ash staff of 9 ft with a brass spearhead
export function buildStaff(lod, opt = {}) {
  const mesh = new Mesh('staff'), sk = rigidTo(BI.prop_pole), h = opt.height ?? 2.74, x0 = H('prop_pole');
  tube(mesh, x0, v3.add(x0, [0, h, 0]), [[0, 0.016], [1, 0.014]], { sides: [10, 6, 4][lod], mat: MAT.WOOD, skinFn: sk, capStart: true, capEnd: true });
  tube(mesh, v3.add(x0, [0, h, 0]), v3.add(x0, [0, h + 0.17, 0]), [[0, 0.016], [0.3, 0.014], [1, 0.0]], { sides: [10, 6, 4][lod], mat: MAT.BRASS, skinFn: sk, capStart: true, capEnd: false });
  if (lod === 0) {                                                                                   // ferrule, spearhead ridge and socket ring, cord and tassel, brass rings
    tube(mesh, x0, v3.add(x0, [0, 0.07, 0]), [[0, 0.006], [0.2, 0.019], [1, 0.0175]], { sides: 14, mat: MAT.IRON, skinFn: sk, capStart: true, capEnd: false });
    const top = v3.add(x0, [0, h, 0]); tube(mesh, v3.add(top, [0, -0.06, 0]), v3.add(top, [0, -0.04, 0]), [[0, 0.0215], [1, 0.0215]], { sides: 14, mat: MAT.BRASS, skinFn: sk, capStart: true, capEnd: true });
    pathTube(mesh, Array.from({ length: 16 }, (_, i) => { const t = i / 15; return v3.add(top, [0.0 + Math.sin(t * 3.14) * 0.07, -0.08 - t * 0.28 + Math.sin(t * 6) * 0.01, 0.02 * Math.sin(t * 4)]); }), 0.0024, { sides: 5, mat: MAT.GOLD, skinFn: sk });
    strands(mesh, 14, i => ({ p: v3.add(top, [0.0, -0.36, 0.0]), dir: [((i % 5) - 2) * 0.12, -1, ((i % 3) - 1) * 0.12] }), { len: 0.09, r: 0.0016, mat: MAT.GOLD, skinFn: sk, curl: 0.002, seed: 71, segs: 2 });
    for (let k = 0; k < 4; k++) tube(mesh, v3.add(x0, [0, 0.9 + k * 0.55, 0]), v3.add(x0, [0, 0.905 + k * 0.55, 0]), [[0, 0.0175], [1, 0.0175]], { sides: 10, mat: MAT.BRASS, skinFn: sk, capStart: true, capEnd: true }); }
  mesh.meta = { closed: false, openOk: true, top: v3.add(x0, [0, h, 0]) }; return mesh;
}
