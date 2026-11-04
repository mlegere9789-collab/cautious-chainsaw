// The clip library: registers every ClipDef (code-authored), bakes clips lazily and caches them by id, computes the content hash of each baked clip (FNV-1a over the float bytes: the "content-hash cache" of the plan's Section C),
// and writes the catalogue that goes to data/anim3d/clips.json (id, family, rig, duration, loop, fps, frames, tier, sources, gap, root speed, stance fractions, content hash).
import { Rig } from './rig.mjs';
import { HumanSolver } from './figure-pose.mjs';
import { bakeClip, Clip } from './clipdef.mjs';
import { gaitDef } from './locomotion.mjs';
import { fireCycleDef } from './musketry.mjs';
import { infantryDefs } from './clips-infantry.mjs';
import { fallDefs } from './clips-fall.mjs';
import { artilleryDefs } from './clips-artillery.mjs';
import { miscDefs } from './clips-misc.mjs';
import { horseDef, horseIdleDef, horseFallDef, riderGaitDef, riderActionDefs } from './clips-cavalry.mjs';
import { g9Defs } from './clips-g9.mjs';
import * as POSE from './poses.mjs';
import { VARIANTS, variantKind, variantDef } from './variants.mjs';

// FNV-1a 32-bit over the bytes of a Float32Array (deterministic; the catalogue uses it as the clip's content hash)
export function hashFloats(f32) { const u = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength); let h = 2166136261 >>> 0; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); }

// the gait x carry combinations that exist as clips (the speed selector in unit-anim.mjs picks among them)
export const GAIT_CLIPS = [
  ['common_time', 'shoulder'], ['common_time', 'order'], ['quick_time', 'shoulder'], ['quick_time', 'rss'], ['quick_time', 'atwill'], ['route_step', 'atwill'], ['route_step', 'rss'],
  ['double_quick', 'run'], ['double_quick', 'trail'], ['double_quick_urgent', 'run'], ['run', 'run'], ['backward', 'shoulder'],
];
export const gaitId = (gait, carry) => `march_${gait}_${carry}`;

export class ClipLibrary {
  constructor(skeleton) {
    this.skeleton = skeleton; this.rig = new Rig(skeleton.human, 'human'); this.horseRig = skeleton.horse ? new Rig(skeleton.horse, 'horse') : null; this.gunRig = skeleton.gun ? new Rig(skeleton.gun, 'gun') : null;
    this.solver = new HumanSolver(this.rig); this.defs = new Map(); this.clips = new Map(); this.order = [];
    this._registerAll();
  }
  register(def) { if (this.defs.has(def.id)) throw new Error('duplicate clip id ' + def.id); this.defs.set(def.id, def); this.order.push(def.id); return def; }
  _registerAll() {
    for (const [g, c] of GAIT_CLIPS) this.register(gaitDef({ id: gaitId(g, c), gait: g, carry: c }));
    this.register(gaitDef({ id: 'march_run_lookback', gait: 'run', carry: 'run', label: 'running retreat, looking back', tier: 'plausible-procedural', after: (spec, ph) => { spec.set('hdE', -4, 44 * Math.sin(2 * Math.PI * ph * 0.5), 0).set('nkE', 0, 0, 0); } }));
    this.register(gaitDef({ id: 'march_quick_trail', gait: 'quick_time', carry: 'trail', label: 'quick time at trail arms' }));
    for (const p of ['stand', 'kneel', 'lie']) this.register(fireCycleDef({ id: 'fire_cycle_' + p, posture: p }));
    for (const d of [...infantryDefs(), ...fallDefs(), ...artilleryDefs(), ...miscDefs(), ...riderActionDefs(), ...g9Defs()]) this.register(d);
    for (const g of ['walk', 'trot', 'canter', 'gallop']) this.register(riderGaitDef(g));
    if (this.horseRig) { for (const g of ['walk', 'trot', 'canter', 'gallop']) this.register(horseDef(this.horseRig, g)); this.register(horseIdleDef(this.horseRig)); this.register(horseFallDef(this.horseRig)); }
    this.register(this._gunRecoilDef());
    this._registerVariants();
  }
  // variants 1..5 of every crowd state (variants.mjs); variantsOf: base id -> [base id, v1, ..., v5]
  _registerVariants() { this.variantsOf = new Map(); for (const id of this.order.slice()) { const d = this.defs.get(id), kind = variantKind(id, d); if (!kind) continue; const ids = [id]; for (let v = 1; v < VARIANTS; v++) { const vd = this.register(variantDef(d, v, kind)); ids.push(vd.id); } this.variantsOf.set(id, ids); } }
  _gunRecoilDef() {
    const rig = this.gunRig; return { id: 'gun_recoil', loop: false, dur: 2.4, fps: 60, family: 'gun', rig: 'gun', meta: { label: 'Gun carriage recoil and run-up, wheels rolling back and forward', tier: 'plausible-procedural', gap: 'G-ANIM-04', src: ['ART-FA-14', 'ART-GB-23'], recoilM: 1.2, rootSpeed: 0 },
      bakeFrame: (t, out) => { out.fill(0); for (let s = 0; s < rig.nCore; s++) out[s * 4 + 3] = 1; const car = rig.index.carriage, ts = rig.transSlot[car]; const back = 0.28, hold = 0.15, up = 1.8, R = 1.2; let z = 0; if (t < back) { const u = t / back; z = R * (1 - (1 - u) * (1 - u)); } else if (t < back + hold) z = R; else if (t < back + hold + up) { const u = (t - back - hold) / up; z = R * (1 - u * u * (3 - 2 * u)); }
        out[rig.OFF_TRANS + ts * 3 + 2] = -z; const roll = -z / 0.725; for (const w of ['wheel_L', 'wheel_R']) { const b = rig.index[w], s = rig.coreSlot[b]; const h = roll / 2; out[s * 4] = Math.sin(h); out[s * 4 + 3] = Math.cos(h); }
        const bar = rig.index.barrel, bs = rig.coreSlot[bar]; const lift = t < back ? -1.4 * Math.sin(Math.PI * t / back) * Math.PI / 180 : 0; out[bs * 4] = Math.sin(lift / 2); out[bs * 4 + 3] = Math.cos(lift / 2); return out; } };
  }
  has(id) { return this.defs.has(id); }
  def(id) { const d = this.defs.get(id); if (!d) throw new Error('unknown clip ' + id); return d; }
  rigFor(def) { return def.rig === 'horse' ? this.horseRig : def.rig === 'gun' ? this.gunRig : this.rig; }
  get(id) {
    let c = this.clips.get(id); if (c) return c;
    const d = this.def(id), rig = this.rigFor(d);
    if (d.bakeFrame) { // FK-authored (horse, gun): sample the frame function
      const fps = d.fps || 60, N = d.loop ? Math.round(d.dur * fps) : Math.round(d.dur * fps) + 1, data = new Float32Array(N * rig.frameLen), tmp = new Float32Array(rig.frameLen);
      for (let i = 0; i < N; i++) { const t = d.loop ? (i / N) * d.dur : Math.min(d.dur, i / fps); d.bakeFrame(t, tmp); data.set(tmp, i * rig.frameLen); }
      c = new Clip(d, rig, d.loop ? N / d.dur : fps, N, data);
    } else c = bakeClip(this.solver, d);
    c.hash = hashFloats(c.data); this.clips.set(id, c); return c;
  }
  clipAt(index) { return this.clips.get(this.order[index]) || this.get(this.order[index]); }          // the baked clip of a clip INDEX (the index of ClipSel.a / .b): one Map lookup, no string building
  ids() { return this.order.slice(); }
  bakeAll() { for (const id of this.order) this.get(id); return this.clips.size; }
  catalogue() {
    return this.order.map(id => { const d = this.defs.get(id), c = this.get(id), m = d.meta || {};
      return { id, family: d.family || m.family || '', rig: d.rig || 'human', label: m.label || id, durS: +d.dur.toFixed(4), loop: !!d.loop, fps: +c.fps.toFixed(3), frames: c.n, floats: c.data.length, tier: m.tier || 'inferred', src: m.src || [], gap: m.gap || null,
        rootSpeed: m.rootSpeed ?? null, stepsPerMin: m.stepsPerMin ?? null, stepM: m.stepM ?? null, gait: m.gait || null, carry: m.carry || null, posture: m.posture || null, motions: m.motions ?? null, regulated: m.regulated ?? null, fallStyle: m.fallStyle || null,
        propB: d.propB || null, props: m.props || null, role: m.role || null, pairedWith: m.pairedWith || null, segments: m.segments ? m.segments.map(s => ({ id: s.id, t0: +s.t0.toFixed(4), t1: +s.t1.toFixed(4) })) : null, fireAtS: m.fireAt ?? m.fireAtS ?? null, hash: c.hash }; });
  }
}
export { POSE };
