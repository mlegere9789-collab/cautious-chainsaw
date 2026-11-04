// Fires: only those documented in the repository (data/fx3d/fires.json: the Sherfy barn, the Bliss house and barn, the Rock Creek trestle, rail cars at the station), each only inside the window of
// structures/state_schedule.json. A date-only window is NOT turned into an ignition time: inside it the fire is drawn at params.fire.uncertain_intensity and marked "time uncertain" (the structures layer
// draws such a change half and half); after the window the building is a smouldering ruin, never flames. A host that knows the cause calls ignite(id, t) with t inside the window and the fire
// then follows the growth/peak/decline curve from exactly t. Flames never exist before the window start; McPherson barn and the Bliss buildings before Jul 3 are refused by the schedule's own rules.
import { isoToMin } from '../clock.mjs';
import { F, T, rec } from './store.mjs';
import { u01, clamp, smooth, strHash } from './core.mjs';

const secOf = iso => isoToMin(iso) * 60;
const endOf = (iso, gran) => { const s = secOf(iso); return /T23:59$/.test(iso) ? s + 60 : s; };
export const KIND_IDX = { barn: 1, house: 2, small: 3, camp: 4, carcass: 3 };

export class Fires {
  // data: fires.json; P: params; opts: { toXZ(lng, lat) -> [x, z], groundAt(x, z) -> y, scenario: { [fireId]: scenarioName }, contact(pos, t) -> bool (host: is there an enemy/firing line near) }
  constructor(data, P, opts = {}) {
    this.d = data; this.P = P; this.toXZ = opts.toXZ; this.groundAt = opts.groundAt || (() => 0); this.scenario = opts.scenario || {}; this.contact = opts.contact || (() => false);
    this.ign = new Map(); this.host = []; this.refused = []; this.plumeLast = null;
    this.srcs = data.sources.map(s => { const [x, z] = this.toXZ ? this.toXZ(s.pos.lng, s.pos.lat) : [0, 0]; return { ...s, x, z, y: this.groundAt(x, z) }; });
    this.byId = new Map(this.srcs.map(s => [s.id, s]));
  }
  window(s) {
    const sc = s.windows[this.scenario[s.id]] || s.windows.default, a = secOf(sc.window[0]); let b = endOf(sc.window[1]);
    if (s.ruined_by) { const r = secOf(s.ruined_by.t); if (r > a) b = Math.min(b, r); }
    return { a, b, granularity: sc.granularity, basis: sc.basis, ruinedBy: s.ruined_by ? secOf(s.ruined_by.t) : null, scenarioName: this.scenario[s.id] && s.windows[this.scenario[s.id]] ? this.scenario[s.id] : 'default' };
  }
  // the host knows the cause (a shell strike, an order): fire starts at t. Refused outside the documented window.
  ignite(id, t) {
    const s = this.byId.get(id); if (!s) throw new Error('unknown fire ' + id);
    const w = this.window(s);
    if (t < w.a || t > w.b) { this.refused.push({ id, t, why: 'ignition outside the documented window' }); return false; }
    this.ign.set(id, t); return true;
  }
  clearIgnitions() { this.ign.clear(); }
  // {flame, smoke, phase, uncertain, a, b}: flame and smoke levels 0..1
  level(kind, aSec, bSec, t, ignT, ruinedBy, out = {}) {
    const F_ = this.P.fire, S = 0.06, sm = F_.smoulder_h * 3600;
    const g = F_.growth_min[kind] * 60, pk = F_.peak_min[kind] * 60, dc = F_.decline_min[kind] * 60;
    out.uncertain = false; out.flame = 0; out.smoke = 0; out.phase = 'none';
    if (ignT != null) {
      const tau = t - ignT; if (tau < 0) return out;
      let f = tau < g ? smooth(0, g, tau) : tau < g + pk ? 1 : tau < g + pk + dc ? 1 - (tau - g - pk) / dc : 0;
      out.phase = tau < g ? 'growing' : tau < g + pk ? 'burning' : tau < g + pk + dc ? 'declining' : 'ruin';
      if (ruinedBy != null && t > ruinedBy - 600) { f *= 1 - smooth(ruinedBy - 600, ruinedBy, t); if (t >= ruinedBy) out.phase = 'ruin'; }
      const tail = tau > g + pk + dc ? S * Math.max(0, 1 - (tau - g - pk - dc) / sm) : 0;
      out.flame = f; out.smoke = Math.max(f, tail, ruinedBy != null && t >= ruinedBy && tau >= 0 ? S * Math.max(0, 1 - (t - ruinedBy) / sm) : 0); return out;
    }
    if (t < aSec) return out;
    if (t <= bSec) { out.uncertain = true; out.flame = out.smoke = F_.uncertain_intensity; out.phase = 'possible'; return out; }
    const tail = S * Math.max(0, 1 - (t - bSec) / sm); out.smoke = tail; out.phase = tail > 0 ? 'ruin' : 'none'; return out;      // after the window: a smouldering ruin, no flames
  }
  state(id, t, out = {}) {
    const s = this.byId.get(id), w = this.window(s); this.level(s.kind, w.a, w.b, t, this.ign.get(id), w.ruinedBy, out);
    out.id = id; out.window = [w.a, w.b]; out.granularity = w.granularity; out.scenario = w.scenarioName; return out;
  }
  // host-placed fires (carcass piles, camp fires). Returns false and records why when refused.
  addHost(spec) {
    const { id, kind, pos, a, b = null, t } = spec;
    if (kind === 'carcass') { const w0 = secOf(this.d.host_placed.horse_carcass.window[0]); if (a < w0) { this.refused.push({ id, kind, a, why: 'before the documented start of the carcass fires (T3-150: Jul 4)' }); return false; } }
    if (kind === 'camp' && this.contact(pos, a)) { this.refused.push({ id, kind, a, why: 'campfires are not lit on contact lines (PDF: rear fires only)' }); return false; }
    this.host.push({ id, kind, x: pos[0], y: pos[1], z: pos[2], a, b, seed: strHash(id) }); return true;
  }
  // all fire sources alive at t, for drawing: x, y, z, kind, flame, smoke, uncertain, id, height, radius
  active(t, out = []) {
    out.length = 0; const st = {}; const P = this.P.fire;
    for (const s of this.srcs) {
      this.state(s.id, t, st); if (st.flame <= 0 && st.smoke <= 0) continue;
      const hr = P.flame_height_m[s.kind] || P.flame_height_m.small;
      out.push({ id: s.id, x: s.x, y: s.y, z: s.z, kind: s.kind, flame: st.flame, smoke: st.smoke, uncertain: st.uncertain, phase: st.phase, height: hr[0] + (hr[1] - hr[0]) * st.flame, radius: s.kind === 'barn' ? 9 : s.kind === 'house' ? 8 : 3, seed: strHash(s.id), host: false });
    }
    for (const h of this.host) {
      if (t < h.a || (h.b != null && t > h.b)) continue; const small = h.kind !== 'camp';
      out.push({ id: h.id, x: h.x, y: h.y, z: h.z, kind: h.kind, flame: small ? 0.7 : 0.5, smoke: small ? 0.6 : 0.3, uncertain: false, phase: 'burning', height: small ? 2.5 : 0.7, radius: small ? 2 : 0.5, seed: h.seed, host: true });
    }
    return out;
  }
  // plume smoke puffs for the plume ticks in (t0, t1] (ticks are multiples of plume_puff_interval_s: the same range always gives the same puffs)
  emitPlume(t0, t1, sink, air) {
    const P = this.P, F_ = P.fire, dt = F_.plume_puff_interval_s, k0 = Math.floor(t0 / dt) + 1, k1 = Math.floor(t1 / dt); let mass = 0;
    for (let k = k0; k <= k1; k++) {
      const tk = k * dt, act = this.active(tk);
      for (const f of act) {
        if (f.smoke <= 0.005) continue; const rate = f.kind === 'barn' ? F_.smoke_mass_rate_kg_s_barn : f.kind === 'house' ? F_.smoke_mass_rate_kg_s_house : f.kind === 'camp' ? F_.campfire.smoke_mass_rate_kg_s : F_.smoke_mass_rate_kg_s_small;
        const m = rate * f.smoke * dt, u = a => u01(f.seed, k, a, 9), hx = (u(1) - 0.5) * 2 * f.radius, hz = (u(2) - 0.5) * 2 * f.radius, sg = f.kind === 'camp' ? 0.5 : F_.plume_sigma0_m * (0.5 + 0.5 * f.flame);
        sink(rec({ X: f.x + hx, Y: f.y + (f.kind === 'camp' ? 0.6 : f.height * 0.6), Z: f.z + hz, T0: tk, TYPE: T.PLUME, SEED: (f.seed ^ Math.imul(k, 2246822519)) >>> 0, MASS: m, SIG: sg, VB: F_.plume_vb0_ms * (f.kind === 'camp' ? 0.3 : 0.4 + 0.6 * f.flame), TAUB: F_.plume_tau_b_s, TAUD: 1, TAUDIS: air.tauDis * 2, K: air.K * 4, BETA: air.beta, VR: 0.6, G: f.y, LIFE: 240, A2: f.uncertain ? 1 : 0, CAUSE: (f.seed ^ k) >>> 0 }));
        mass += m;
      }
    }
    return mass;
  }
}
// deterministic flicker 0.6..1.0 of a fire light
export const flicker = (P, seed, t) => { const hz = P.fire.flicker_hz, f = hz[0] + (hz[1] - hz[0]) * u01(seed, 0, 0, 3), k = Math.floor(t * f); return 0.6 + 0.4 * (0.5 * u01(seed, k, 1, 3) + 0.5 * u01(seed, k + 1, 1, 3)); };
