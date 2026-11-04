// Flags, colours and guidons. Cloth meshes (hoist along the staff, wave weight per vertex for the wind/animation pass) and procedural patterns (RGBA textures).
// EVIDENCE RULES (CLAUDE.md Law cl.4, brief): the repository documents NO regimental or state colour description and no Gettysburg-specific Confederate pattern (PDF B.6.5 G11: Gettysburg pattern open).
//  * US national colour: stars and stripes, 13 stripes, STAR COUNT 34 (tier INFERRED: the count in law on 1-3 July 1863 was set by admissions before 4 July 1863; West Virginia, admitted 20 June 1863,
//    could take the 35th star only on 4 July 1863. The statute (3 Stat. 415), the admission acts of Kansas and West Virginia, the NPS statement of 33 stars to 3 July 1861 and the state order were READ on 2026-11-04 (evidence.mjs: the statutory count is documented); that each colour carried it stays inferred: register EG-FIG-0002). The star ARRANGEMENT is
//    plausible-procedural (period flags varied; no regiment's arrangement is documented here).
//  * Regimental colour (every Union infantry regiment): NOT drawn from any record. A plain flag of a neutral GAP colour with hatching marks it (tier gap; EG-FIG-0003). The kit item
//    `regimental_color_union` says "pattern not specified in B.6".
//  * Irish Brigade green flag (kit item flag_green_irish, tier inferred): a plain green field, device unspecified (the harp etc. is not in any record), edge-hatched as a gap.
//  * Confederate: the ANV square battle flag of the documented TYPE (PDF p.70: St Andrew's cross, 12 stars as printed there, deep red wool), tier plausible-procedural until the Gettysburg regimental pattern is
//    confirmed; flag_state intact | torn | bearer_down is carried as printed. Stars: SOURCE CONFLICT carried as a scenario (ANV_STAR_SCENARIOS): 12 as the PDF page 70 prints (default, owner's governing text) and 13 as the
//    NPS pages state for the type and for the 13th Alabama's Gettysburg flag (evidence FIG-EV-ANV-13-STARS). The default is not an owner decision: PENDING OWNER (EG-FIG-0005).
//  * Cavalry guidon: swallow-tail, stars and stripes with the regimental designation, per the kit item label (unsourced in the notes: tier gap-inferred); the designation text is not drawn.
import { v3 } from './mathlib.mjs';
import { Mesh } from './meshkit.mjs';
import { BI, H } from './body.mjs';
import { MAT, COLOUR } from './palette.mjs';

export const FLAG_KINDS = ['us_national', 'us_regimental_gap', 'irish_green_gap', 'anv_battle', 'cav_guidon', 'ambulance_gap'];
export const FLAG_STATES = ['intact', 'torn', 'bearer_down'];
export const US_STARS = 34;
// cloth size in metres (hoist, fly): PLAUSIBLE-PROCEDURAL (F-FLAG-SIZE); real sizes by arm and issue are not in the repository
export const FLAG_SIZE = { us_national: [1.65, 1.90], us_regimental_gap: [1.65, 1.90], irish_green_gap: [1.65, 1.90], anv_battle: [1.0, 1.0], cav_guidon: [0.70, 1.05], ambulance_gap: [0.9, 1.2] };
const NS = { us_national: [4, 3], us_regimental_gap: [4, 3], irish_green_gap: [4, 3], anv_battle: [4, 3], cav_guidon: [4, 3], ambulance_gap: [4, 3] };

// ---- cloth geometry. In the prop_pole frame: the hoist edge runs down the staff top, the fly extends toward +x. nx x ny quads; wave weight in the vertex flag byte (0 at the hoist .. 255 at the fly edge).
export function buildFlagCloth(kind, state, lod, opt = {}) {
  const [hoist, fly] = FLAG_SIZE[kind], mesh = new Mesh(`flag:${kind}:${state}`), x0 = H('prop_pole'), top = (opt.top ?? 2.60), sk = () => [[BI.prop_pole, 1]];
  const nx = [44, 5, 1][lod], ny = [32, 4, 1][lod], swallow = kind === 'cav_guidon', ids = [];
  for (let j = 0; j <= ny; j++) { ids[j] = []; for (let i = 0; i <= nx; i++) {
    const u = i / nx, v = j / ny; let xf = u * fly; if (swallow && u > 0.62) { const cut = (u - 0.62) / 0.38 * 0.5 * hoist; if (Math.abs(v - 0.5) * hoist < cut) { ids[j][i] = -1; continue; } }
    const sag = state === 'bearer_down' ? 0.35 * v * hoist * u : 0, y = top - v * hoist * (state === 'bearer_down' ? 0.5 : 1) - sag * 0.0, wave = u * (0.03 * Math.sin(v * 5 + u * 3) + 0.012 * Math.sin(v * 13 - u * 7) * (lod === 0 ? 1 : 0)) + (lod === 0 ? u * u * 0.01 * Math.sin(v * 21) : 0);
    ids[j][i] = mesh.vert([x0[0] + xf, x0[1] + y, x0[2] + wave], [0, 0, 1], u, v, kind === 'us_national' ? MAT.FLAG_WHITE : kind === 'anv_battle' ? MAT.FLAG_RED : MAT.GAP, sk(), Math.round(u * 255));
  } }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = ids[j][i], b = ids[j][i + 1], c = ids[j + 1][i], d = ids[j + 1][i + 1]; if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    if (state === 'torn' && lod === 0) { const h = (i * 7 + j * 13 + 3) % 11; if (i > nx - 5 && h < 3) continue; if (i > nx - 3 && h < 5) continue; }                                           // ragged fly edge and holes
    mesh.tri(a, c, b); mesh.tri(b, c, d);                                                                                                                                 // one layer; meta.doubleSided tells the renderer to draw both faces
  }
  mesh.meta = { closed: false, openOk: true, uvUnit: 'unit', doubleSided: true, cloth: true, hoist_m: hoist, fly_m: fly, kind, state };
  return mesh;
}

// ---- procedural patterns: RGBA8, width = fly px, height = hoist px
const rgba = c => [c[0], c[1], c[2], 255];
function star(buf, W, H_, cx, cy, r, col) {                                                                    // five-pointed star by point-in-polygon on a small box
  const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.382 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H_ - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
    let ins = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) ins = !ins; }
    if (ins) buf.set(col, (y * W + x) * 4);
  }
}
/** Star-count scenarios of the ANV battle flag (a source conflict, not decided): pdf_p70 = 12 stars on the arms; nps = 13 (the 12 plus a centre star; NPS states the count, not the arrangement: the centre star is plausible-procedural). */
export const ANV_STAR_SCENARIOS = { pdf_p70: { stars: 12, source: 'PDF p.70 (cites FOTW, not read)' }, nps: { stars: 13, source: 'NPS Antietam flags page; NPS 13th Alabama battle flag article (evidence FIG-EV-ANV-13-STARS)' } };
export const ANV_STAR_DEFAULT = 'pdf_p70';                                                                    // PENDING OWNER: the default view of the conflicting sources is the owner's decision (Law cl.6)
export function flagPattern(kind, state = 'intact', W = 256, Hh = 192, opts = {}) {
  const buf = new Uint8Array(W * Hh * 4), put = (x, y, c) => buf.set(c, (y * W + x) * 4);
  const red = rgba(COLOUR.flag_red), white = rgba(COLOUR.flag_white), blue = rgba(COLOUR.flag_blue), gap = rgba(COLOUR.gap_marker);
  if (kind === 'us_national' || kind === 'cav_guidon') {
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) put(x, y, Math.floor(y / Hh * 13) % 2 === 0 ? red : white);
    const cw = Math.round(W * 0.42), ch = Math.round(Hh * 7 / 13); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) put(x, y, blue);
    const rows = [6, 5, 6, 5, 6, 6]; let n = 0; for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r]; k++) { const x = (k + 0.5 + (rows[r] === 5 ? 0.5 : 0)) / 6 * cw, y = (r + 0.5) / rows.length * ch; star(buf, W, Hh, x, y, Math.min(cw / 6, ch / rows.length) * 0.42, white); n++; }
    buf[3] = 255; if (n !== US_STARS) throw new Error('star count ' + n);
  } else if (kind === 'anv_battle') {
    const f = rgba(COLOUR.anv_red), b = rgba(COLOUR.anv_blue); for (let i = 0; i < W * Hh; i++) buf.set(f, i * 4);
    const bw = 0.17, ew = 0.03;                                                                              // saltire half-width and white edge, in unit square units
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const u = x / (W - 1), v = y / (Hh - 1), d = Math.min(Math.abs(u - v), Math.abs(u + v - 1)) / Math.SQRT2; if (d < bw / 2 + ew) put(x, y, d < bw / 2 ? b : white); }
    let n = 0; for (let k = 0; k < 4; k++) for (let s = 0; s < 3; s++) { const t = 0.16 + s * 0.12, ux = k < 2 ? t : 1 - t, uy = (k % 2 === 0) ? t : 1 - t; star(buf, W, Hh, ux * W, uy * Hh, W * 0.034, white); n++; }
    const sc = ANV_STAR_SCENARIOS[opts.anvScenario ?? ANV_STAR_DEFAULT]; if (!sc) throw new Error('anv scenario ' + opts.anvScenario);
    if (sc.stars === 13) { star(buf, W, Hh, 0.5 * W, 0.5 * Hh, W * 0.034, white); n++; }
    if (n !== sc.stars) throw new Error('anv stars');
    // (the 12 stars follow the PDF page 70 count; centre star omitted: the arrangement is plausible-procedural)
  } else {
    const base = kind === 'irish_green_gap' ? rgba(COLOUR.flag_green) : gap; for (let i = 0; i < W * Hh; i++) buf.set(base, i * 4);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const edge = Math.min(x, y, W - 1 - x, Hh - 1 - y) < 10; if ((((x + y) >> 3) & 1) === 0 && (kind !== 'irish_green_gap' || edge)) put(x, y, [Math.round(base[0] * 0.6), Math.round(base[1] * 0.6), Math.round(base[2] * 0.6), 255]); }       // hatching = marked gap
  }
  if (state === 'torn') for (let y = 0; y < Hh; y++) for (let x = Math.round(W * 0.78); x < W; x++) { const h = ((x * 73856093) ^ (y * 19349663)) >>> 0; if (h % 1000 < 40 + (x - W * 0.78) * 2.2) buf[(y * W + x) * 4 + 3] = 0; }
  return { width: W, height: Hh, rgba: buf };
}
// tier / evidence record of each flag kind (also written into TIERS.json)
export const FLAG_EVIDENCE = {
  us_national: { tier: 'inferred', stars: US_STARS, note: 'stars and stripes; 34 stars: the 1818 act and the admission acts of Kansas (1861) and West Virginia (star effective 4 July 1863) were read (evidence FIG-EV-*), the 33 earlier stars were not; arrangement and size plausible-procedural' },
  us_regimental_gap: { tier: 'gap', note: 'regimental colour pattern not specified in any repository record (kit item regimental_color_union); drawn as a hatched GAP-colour flag', register: 'EG-FIG-0003' },
  irish_green_gap: { tier: 'inferred', note: 'kit item flag_green_irish: a green flag (the 28th MA First the only usable green flag); device and size not in any record: plain green with hatched edge', register: 'EG-FIG-0003' },
  anv_battle: { tier: 'plausible-procedural', note: 'ANV square battle flag of the documented type (PDF B.6.5 p.70: 12 stars; NPS: 13 stars on the 13th Alabama Gettysburg flag and the type; selectable scenario, PENDING OWNER); other brigades\' regimental patterns open (G11)', register: 'EG-FIG-0005', evidence: 'FIG-EV-ANV-13-STARS', scenarios: ANV_STAR_SCENARIOS, default_scenario: ANV_STAR_DEFAULT },
  cav_guidon: { tier: 'gap', note: 'swallow-tail guidon with stars and stripes and designation, "unsourced in the notes" (kit item guidon_swallowtail_cav); designation not drawn', register: 'EG-FIG-0003' },
  ambulance_gap: { tier: 'gap', note: 'Ambulance Corps flag: pattern not in any record', register: 'EG-FIG-0003' },
};
