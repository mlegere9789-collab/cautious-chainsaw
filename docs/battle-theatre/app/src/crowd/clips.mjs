// CLIP BANK: the clips of the ANIMATION library baked into BONE-MATRIX TEXTURES (anim3d/bake.mjs layout 1: three vec4 per bone, v' = M v for a vertex in rest coordinates), one for the human mid skeleton (36 bones)
// and one for the horse (41 bones). The shader blends two baked frames and two clips; nothing here is per figure. Layout: TWO frames side by side per texture row, so 16,384 frames fit the 8,192-row limit of a
// WebGL2 context. RGBA16F (half floats; error 1e-3 relative, see bake.mjs). Frames are re-sampled from the clip's own 60 Hz bake at BANK_FPS (30) with the clip's nlerp, so a looping clip keeps its length.
// Clips are baked on first use (the solver costs 30 to 150 ms a clip), a core set before the first frame (`CORE`); a texture row range is marked dirty when it is written and the backend uploads only that.
// Variant clips (crowd variety, anim3d/variants.mjs) are used at LOD0 only; at LOD1 and LOD2 a figure plays the base clip of its variant (its own phase and rate stay).
import { sampleClip } from '../anim3d/clipdef.mjs';
import { half } from '../anim3d/bake.mjs';

export const BANK_FPS = 30, BANK_MAX_FRAMES = 360;     // a clip is sampled at 30 Hz, or less when it is long (a 40 s gun-crew loop is stored at 9 Hz, 360 frames)
export const CORE = [
  'march_common_time_shoulder', 'march_common_time_order', 'march_quick_time_shoulder', 'march_quick_time_rss', 'march_quick_time_atwill', 'march_route_step_atwill', 'march_route_step_rss', 'march_double_quick_run', 'march_double_quick_trail',
  'march_double_quick_urgent_run', 'march_run_run', 'march_run_lookback', 'stand_shoulder', 'stand_order', 'stand_rss', 'stand_rest', 'ready_from_shoulder', 'shoulder_from_ready', 'fire_cycle_stand', 'fire_cycle_kneel', 'fire_cycle_lie',
  'fall_back', 'fall_front', 'fall_side_left', 'fall_side_right', 'fall_knee_first', 'fall_spin', 'fall_clutch_wound', 'fall_drop_rifle',
  'lie_dead_back', 'lie_dead_front', 'lie_dead_side_left', 'lie_dead_side_right', 'lie_wounded_back', 'lie_wounded_front', 'lie_wounded_side_left', 'lie_wounded_side_right',
  'gun_crew_gunner', 'gun_crew_n1', 'gun_crew_n2', 'gun_crew_n3', 'gun_crew_n4', 'gun_crew_n5', 'gun_crew_n6', 'gun_crew_n7', 'gun_crew_n8', 'gun_crew_chief',
  'sleep_side', 'sit_fire', 'cook_stir', 'eat_hardtack', 'stand_picket', 'dig_shovel', 'chop_axe', 'lay_stone', 'march_carry_rail', 'carry_litter_front', 'carry_litter_rear',
  'rider_walk', 'rider_trot', 'rider_canter', 'rider_gallop', 'rider_sabre_carry', 'rider_carbine_fire', 'horse_walk', 'horse_trot', 'horse_canter', 'horse_gallop', 'horse_idle', 'horse_fall',
];

class Bank {
  constructor(rig, list, name, capFrames) {
    this.name = name; this.rig = rig; this.list = list; this.nb = list.length; this.tpf = this.nb * 3; this.width = this.tpf * 2; this.capFrames = capFrames; this.rows = capFrames / 2; this.next = 0;
    this.data = new Uint16Array(this.width * this.rows * 4); this.dirty = null; this.byClip = new Map(); this.pose = rig.newPose(); this.fk = rig.newFK(); this.fr = rig.newFrame(); this.M = new Float32Array(this.nb * 12);
  }
  add(clip, idx) {
    const fps0 = Math.min(BANK_FPS, BANK_MAX_FRAMES / clip.dur), n = clip.loop ? Math.max(1, Math.round(clip.dur * fps0)) : Math.round(clip.dur * fps0) + 1;
    if (this.next + n > this.capFrames) throw new Error(`clip bank ${this.name} is full (${this.capFrames} frames)`);
    const rig = this.rig, f0 = this.next; this.next += n;
    for (let f = 0; f < n; f++) {
      const t = clip.loop ? (f / n) * clip.dur : Math.min(clip.dur, f / fps0);
      sampleClip(clip, t, this.fr); rig.expandFrame(this.fr, this.pose); rig.fk(this.pose, this.fk); rig.skin(this.fk, this.M, this.list);
      const g = f0 + f, o = ((g >> 1) * this.width + (g & 1) * this.tpf) * 4; for (let q = 0; q < this.nb * 12; q++) this.data[o + q] = half(this.M[q]);
    }
    const e = { idx, f0, n, fps: clip.loop ? n / clip.dur : fps0, loop: clip.loop, dur: clip.dur }; this.byClip.set(idx, e);
    const r0 = f0 >> 1, r1 = (f0 + n - 1) >> 1; this.dirty = this.dirty ? [Math.min(this.dirty[0], r0), Math.max(this.dirty[1], r1)] : [r0, r1]; return e;
  }
  takeDirty() { const d = this.dirty; this.dirty = null; return d; }
}

export class ClipBank {
  constructor(lib, capHuman = 16384, capHorse = 1024) {
    this.lib = lib; this.rig = this.lib.rig; this.index = new Map(this.lib.order.map((id, i) => [id, i]));
    this.human = new Bank(this.rig, this.rig.lod.mid.bones, 'human', capHuman); this.horse = new Bank(this.lib.horseRig, Array.from({ length: this.lib.horseRig.n }, (_, i) => i), 'horse', capHorse);
    this.baseOf = new Int32Array(this.lib.order.length); for (let i = 0; i < this.baseOf.length; i++) this.baseOf[i] = i;
    for (const [base, ids] of (this.lib.variantsOf || new Map())) { const bi = this.index.get(base); for (const v of ids) this.baseOf[this.index.get(v)] = bi; }
    this.bakeMs = 0;
  }
  bankOf(idx) { return this.lib.def(this.lib.order[idx]).rig === 'horse' ? this.horse : this.human; }
  // the entry of clip INDEX idx (the base clip of a variant), baked on first use
  ensure(idx) {
    const b = this.baseOf[idx], bank = this.bankOf(b); let e = bank.byClip.get(b); if (e) return e;
    const t0 = performance.now(); const clip = this.lib.clipAt(b); e = bank.add(clip, b); this.bakeMs += performance.now() - t0; return e;
  }
  // rows for clip time ta (seconds): writes [row0, row1, frac] into out starting at o
  rows(idx, ta, out, o) {
    const e = this.ensure(idx); let x = ta * e.fps, i0, i1;
    if (e.loop) { x = x % e.n; if (x < 0) x += e.n; i0 = Math.floor(x); i1 = i0 + 1 >= e.n ? 0 : i0 + 1; } else if (x <= 0) { x = 0; i0 = i1 = 0; } else if (x >= e.n - 1) { x = e.n - 1; i0 = i1 = e.n - 1; } else { i0 = Math.floor(x); i1 = i0 + 1; }
    out[o] = e.f0 + i0; out[o + 1] = e.f0 + i1; out[o + 2] = x - i0; return e;
  }
  prebakeIds(ids) { return ids.filter(id => this.index.has(id)).map(id => this.index.get(id)); }
  // generator: one clip per step (the caller yields to the event loop between steps)
  *prebake(ids = CORE) { for (const i of this.prebakeIds(ids)) { this.ensure(i); yield i; } }
  stats() { return { clips: this.human.byClip.size + this.horse.byClip.size, humanFrames: this.human.next, horseFrames: this.horse.next, bakeMs: Math.round(this.bakeMs), bytes: (this.human.data.byteLength + this.horse.data.byteLength) }; }
}
