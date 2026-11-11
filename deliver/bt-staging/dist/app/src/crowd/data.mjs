// CROWD DATA: one record per drawn figure, from the layer's per-figure kit manifests (figures3d instanceFromHistory), never from Math.random.
// world figure index i  ->  (history unit, index k inside the unit)  ->  manifest  ->  4-word instance record  +  outfit variant  +  LOD classes.
// The result is plain typed arrays (no GPU or DOM objects), so a visit can keep it for the next visit (`warm`).
//   inst        Uint32Array(4 N)   figures3d INSTANCE LAYOUT (variants.mjs): w0 variant | accoutrement mask, w1 head/shape/skin/hair, w2 face/stature/wear/tint, w3 flags/role
//   varInfo     Uint16Array(4 V)   per outfit variant: mid class, accessory class, impostor class, army | flag kind << 8
//   varPal      Uint8Array(4 * 14 * V) per outfit variant: the 14 variant colour slots as RGBA8 (A = 255)
// A figure of a unit whose dress is DISPUTED in the sources (the 140th New York): the record has no single manifest and no default is chosen between the two readings. Its figures are drawn in the army's
// generic infantry dress (the kit's DEFAULT record, tier plausible-procedural) with the gap flag (instance flag 128) set, and the unit is listed in `disputed` for the card and the verification list.
import { createFigureSystem } from '../figures3d/index.mjs';
import { ROW_SLOT_ORDER, VARIANT_ROW_BYTES } from '../figures3d/catalog.mjs';
import { manifestFor, defaultUnitId } from '../history/manifest.mjs';
import { FIGURE_SEED } from '../history/figures.mjs';

export const warm = { key: null, data: null };            // survives a visit: typed arrays and the figure system (CPU only)
const tick = () => new Promise(r => setTimeout(r, 0));
const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// where each world figure comes from: units 0 .. nL-1 are the layer's (own figures k = 0 .. count-1), the units after them are gun crews (k = nOwn + g * crew + j of the parent)
export function figureSources(world, nL) {
  const src = [], next = new Map();
  world.units.forEach((u, ui) => {
    if (ui < nL) { u.layerIndex = ui; u.kBase = 0; if (u.count) src.push({ ui, layer: ui, k0: 0, n: u.count, first: u.first }); }
    else { const p = u.parent, g = next.get(p) || 0, nOwn = world.units[p].count; next.set(p, g + 1); u.layerIndex = p; u.kBase = nOwn + g * u.count; src.push({ ui, layer: p, k0: u.kBase, n: u.count, first: u.first }); }
  });
  return src;
}

export function crowdKey(layer, world) { let h = 2166136261; h = fnv(h, 'crowd1|' + world.count + '|' + layer.units.length); for (const u of layer.units) if (u.drawn) h = fnv(h, u.id + ':' + u.strength.drawn); return h.toString(16); }

// build (time-sliced: never a long task) the instance table of every drawn figure. `progress(frac)` is called between slices.
export async function buildCrowdData({ layer, world, progress = () => {}, sliceMs = 22 }) {
  const key = crowdKey(layer, world); if (warm.key === key && warm.data) return warm.data;
  const figs = layer.figures; if (!figs) return null;
  const sys = createFigureSystem(), nL = layer.units.length, N = world.count, src = figureSources(world, nL);
  const inst = new Uint32Array(N * 4), disputed = new Map(), figureOf = new Int32Array(N * 2);    // figureOf: unit index (layer), k
  const isDisputed = new Map();
  const dispOf = id => { let v = isDisputed.get(id); if (v === undefined) { const ku = figs.kitUnitOf(id), ent = figs.kit.units[ku.kit_unit]; v = !!(ent && ent.variants); isDisputed.set(id, v); } return v; };
  let t0 = performance.now(), done = 0;
  for (const s of src) {
    const u = layer.units[s.layer], dsp = dispOf(u.id);
    for (let j = 0; j < s.n; j++) {
      const i = s.first + j, k = s.k0 + j; let r;
      if (dsp) {
        const side = u.side, arm = u.arm === 'cavalry' ? 'cavalry' : u.arm === 'artillery' ? 'artillery' : 'infantry', date = figs.dateFor(u.id, null, undefined);
        const m = manifestFor(figs.kit, { soldierId: figs.idOf(u.id, k), unitId: defaultUnitId(side, arm), seed: FIGURE_SEED, date, rank: 'private', role: 'rifleman' });
        r = sys.instance(m); r.words[3] = (r.words[3] | 128) >>> 0; disputed.set(u.id, (disputed.get(u.id) || 0) + 1);
      } else r = sys.instanceFromHistory(figs, u.id, k, null, undefined, null);
      if (!r) throw new Error(`no figure record for ${u.id}:${k} (a drawn figure must have a manifest)`);
      inst.set(r.words, i * 4); figureOf[i * 2] = s.layer; figureOf[i * 2 + 1] = k;
    }
    done += s.n; if (performance.now() - t0 > sliceMs) { progress(done / N); await tick(); t0 = performance.now(); }
  }
  // variant table -> GPU rows
  const rows = sys.variantRows(), nV = rows.length / VARIANT_ROW_BYTES, dv = new DataView(rows.buffer, rows.byteOffset, rows.byteLength);
  const varInfo = new Uint16Array(nV * 4), varPal = new Uint8Array(nV * ROW_SLOT_ORDER.length * 4), palOff = VARIANT_ROW_BYTES - ROW_SLOT_ORDER.length * 3;
  for (let v = 0; v < nV; v++) {
    const o = v * VARIANT_ROW_BYTES; varInfo[v * 4] = dv.getUint16(o, true); varInfo[v * 4 + 1] = dv.getUint16(o + 2, true); varInfo[v * 4 + 2] = dv.getUint16(o + 4, true); varInfo[v * 4 + 3] = rows[o + 28] | (rows[o + 26] << 8);      // army (1 = Confederate) | 1-based flag kind << 8
    for (let s = 0; s < ROW_SLOT_ORDER.length; s++) { const q = (v * ROW_SLOT_ORDER.length + s) * 4; varPal[q] = rows[o + palOff + s * 3]; varPal[q + 1] = rows[o + palOff + s * 3 + 1]; varPal[q + 2] = rows[o + palOff + s * 3 + 2]; varPal[q + 3] = 255; }
  }
  const data = { key, sys, inst, varInfo, varPal, nVariants: nV, figureOf, count: N, sources: src, disputed: [...disputed].map(([unit, figures]) => ({ unit, figures })), slots: ROW_SLOT_ORDER.slice(), classes: sys.classes() };
  warm.key = key; warm.data = data; progress(1); return data;
}
export function dropWarm() { warm.key = null; warm.data = null; }
