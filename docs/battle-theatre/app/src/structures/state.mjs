// A port of tools/bt/check_structures.py `state_at` (the pure function of PDF gates Q07, Q08, Q09): the state of a structure, wall, fence or work at a time, in a named scenario.
// The result depends only on (id, time, scenario, seed) and the three JSON files, so scrubbing in any order gives the same answers. tests/structures3d.test.mjs checks this port
// against the Python function for every record, part and scenario at a grid of times; any difference fails the test. Times are naive local mean time, as printed.
const MIN = 60000;
export const parseIso = s => { if (!s) return null; const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(s); if (!m) throw new Error('bad time ' + s); return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]); };
export const isoOf = ms => new Date(ms).toISOString().slice(0, 16);
const isEnd = ms => { const d = new Date(ms); return d.getUTCHours() === 23 && d.getUTCMinutes() === 59; };
const endOf = ms => (ms != null && isEnd(ms) ? ms + MIN : ms);
const P = parseIso;

// ---- sha256 (synchronous, for the seeded stage shares of a work; the same bytes as Python's hashlib.sha256)
const K256 = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
export function sha256(bytes) {
  const l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb); m.set(bytes); m[l] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(nb - 4, (l * 8) >>> 0); dv.setUint32(nb - 8, Math.floor(l * 8 / 4294967296));
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64), rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < nb; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) >>> 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) { const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0, t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0; }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer); for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i]); return out;
}
export function stageShares(workId, seed = 0) {
  const h = sha256(new TextEncoder().encode(`${seed}:${workId}`)), w = [0, 1, 2, 3].map(i => 1 + h[i] / 255), s = w[0] + w[1] + w[2] + w[3]; return w.map(x => x / s);
}
export const STAGE_NAMES = { 0: 'bare ground', 1: 'layout', 2: 'felling and gathering', 3: 'stacking', 4: 'head logs and concealment', 5: 'completed', 6: 'damaged' };

// ---- the engine over the data
export function makeStateEngine({ structures, sched, works, hospitals = null }) {
  const byId = new Map(structures.structures.map(s => [s.id, s])), rows = sched.rows, partIds = new Set(structures.structures.flatMap(s => (s.parts || []).map(p => p.id)));
  const rowsByObj = new Map(); for (const r of rows) for (const o of r.object_ids) (rowsByObj.get(o) || rowsByObj.set(o, []).get(o)).push(r);
  const hospIds = new Set((hospitals ? hospitals.hospitals.map(h => h.id) : []));
  const W = works.works;
  const pickA = (win, begin) => { const t = begin && begin.length ? begin : win; if (!t) return null; return P(t[2] || t[0] || t[1]); };
  const pickB = (win, finish) => { const t = finish && finish.length ? finish : win; if (!t) return null; return P(t[2] || t[1] || t[0]); };
  function expand(row, scenario) {
    const sc = (row.scenarios || {})[scenario], t = row.time; let win = t.window, begin = t.begin, finish = t.finish, gran = t.granularity; const flags = [];
    if (row.out_of_battle_scope) return [[], ['out_of_battle_scope']];
    if (sc) {
      flags.push('scenario:' + scenario);
      if (sc.no_change) return [[], [...flags, 'scenario_suppresses_change']];
      win = sc.window !== undefined ? sc.window : win; begin = sc.begin !== undefined ? sc.begin : begin; finish = sc.finish !== undefined ? sc.finish : finish; gran = sc.gran !== undefined ? sc.gran : gran;
    }
    if (row.phases && row.phases.length) {
      let prev = row.from_state; const out = [];
      for (const ph of row.phases) {
        let w = ph.window;
        if (sc && ph.state === 'Open' && sc.phase_open) w = sc.phase_open; else if (ph.scenarios && scenario in ph.scenarios) w = ph.scenarios[scenario].window;
        const a = P(w[2] || w[0] || w[1]), b = endOf(P(w[2] || w[1] || w[0]));
        out.push({ id: row.id + ':' + ph.state, frm: prev, to: ph.state, a, b, gran: 'date', flags, row: row.id }); prev = ph.state;
      }
      return [out, flags];
    }
    let a = pickA(win, begin), b = pickB(win, finish);
    if (a == null && b == null) return [[], [...flags, 'unscheduled_no_window']];
    if (a == null) { a = b; flags.push('earliest_not_printed_placed_at_latest'); }
    if (b == null || b < a) b = a;
    return [[{ id: row.id, frm: row.from_state, to: row.to_state, a, b: (gran !== 'clock' || isEnd(b)) ? endOf(b) : b, gran, flags, row: row.id }], flags];
  }
  function fencePseudoRows(sid) {
    const s = byId.get(sid), out = [];
    if (s && sid.startsWith('FEN-')) {
      (s.state_changes || []).forEach((ch, i) => {
        if (ch.schedule_row || !ch.window || !ch.window.length) return;
        const w = ch.window, a = P(w[0] || w[1]), b = endOf(P(w[1] || w[0])); if (a == null) return;
        out.push({ id: `${sid}:chg${i}`, frm: '(not printed in B.8.3)', to: ch.to_state, a, b, gran: ch.time_parse === 'date' ? 'date' : 'clock', flags: ['from_fence_table'], row: null });
      });
    }
    return out;
  }
  function rowsFor(sid, scenario) {
    const out = [], notes = [];
    for (const r of rowsByObj.get(sid) || []) { const [pr, fl] = expand(r, scenario); out.push(...pr); if (!pr.length) notes.push([r.id, fl]); }
    out.push(...fencePseudoRows(sid)); return [out, notes];
  }
  function workState(wid, t, scenario, seed) {
    const w = W[wid], res = { structure_id: wid, time: isoOf(t), scenario, kind: 'work' };
    if (!w.construction_applies) return Object.assign(res, { state: `no_construction (${w.why_not || ''})`, present: null, stage: null, order: -1, status: 'not_a_construction' });
    const b = { ...w.begin }, f = { ...w.finish }, sc = (w.scenarios || {})[scenario];
    if (sc) {
      if ('begin_earliest' in sc) { b.earliest = sc.begin_earliest; b.default = null; }
      if ('begin_latest' in sc) b.latest = sc.begin_latest; if ('begin_gran' in sc) b.gran = sc.begin_gran;
      if ('finish_earliest' in sc) f.earliest = sc.finish_earliest; if ('finish_latest' in sc) f.latest = sc.finish_latest;
      res.scenario_applied = scenario;
    }
    const be = P(b.earliest), bd = P(b.default); let bl = P(b.latest), fl = P(f.latest); if (fl != null) fl = endOf(fl); if (bl != null && b.gran === 'date') bl = endOf(bl);
    const dmg = w.damage_stage, startClock = bd != null ? bd : (be != null && be === bl ? be : null);
    if (b.gran === 'clock' && startClock != null && f.gran === 'clock' && fl != null && fl > startClock) {
      let st, order, nm;
      if (t < startClock) { st = 0; order = 0; nm = STAGE_NAMES[0]; }
      else if (t >= fl) { st = 5; order = 5; nm = STAGE_NAMES[5]; }
      else {
        const frac = (t - startClock) / (fl - startClock), sh = stageShares(wid, seed); let c = 0; st = 4;
        for (let i = 0; i < sh.length; i++) { c += sh[i]; if (frac < c) { st = i + 1; break; } }
        order = st; nm = STAGE_NAMES[st];
      }
      Object.assign(res, { present: st > 0, stage: st, status: st > 0 && st < 5 ? 'stage_split_plausible_procedural' : 'certain_by_window', state: `stage ${st}: ${nm}`, order, stage_tier: st > 0 && st < 5 ? 'plausible-procedural' : 'documented window' });
      if (dmg) {
        const da = P(dmg.begin), dl = P(dmg.finish_latest);
        if (t >= da) { if (t >= dl) Object.assign(res, { stage: 6, state: 'stage 6: damaged', order: 6, status: 'inferred_damage_state_derived_window', present: true }); else Object.assign(res, { stage: 5, state: 'stage 5 -> 6: damage in progress (E-11 shelling)', order: 5.5, status: 'transitioning_derived_window', present: true }); }
      }
      if (w.reentry && t < P('1863-07-03T00:00') && res.stage === 5) res.flag = w.reentry;
      return res;
    }
    const floor = be != null ? be : P(b.date);
    if (floor == null) return Object.assign(res, { state: 'unscheduled (no printed date)', present: null, stage: null, order: 0.5, status: 'open_gap' });
    if (t < floor) Object.assign(res, { state: 'stage 0: bare ground', present: false, stage: 0, order: 0, status: 'certain_before_documented_start' });
    else if (bl != null && t >= bl && (fl == null || t < fl)) Object.assign(res, { state: 'under construction, stage not resolved', present: true, stage: null, order: 2, status: 'partial_window' });
    else if (fl != null && t >= fl) Object.assign(res, { state: 'built / existing, stage not resolved', present: true, stage: null, order: 5, status: 'after_documented_finish' });
    else Object.assign(res, { state: 'indeterminate (start within printed window; no clock)', present: null, stage: null, order: 1, status: 'indeterminate_window' });
    if (dmg && res.order >= 2 && t >= P(dmg.begin)) Object.assign(res, { state: 'damaged (derived window)', stage: 6, order: 6, present: true });
    return res;
  }
  const cmp = (x, y) => x.a - y.a || x.b - y.b || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  function stateAt(id, timeIso, scenario = 'default', seed = 0) {
    const t = typeof timeIso === 'number' ? timeIso : P(timeIso), base = id.split('#')[0];
    if (!byId.has(base) && !hospIds.has(base) && !rowsByObj.has(base)) throw new Error('unknown structure id: ' + id);
    if (id.includes('#') && !partIds.has(id)) throw new Error('unknown part id: ' + id);
    const s = byId.get(base);
    if (s && s.kind === 'avenue_not_in_1863') return { structure_id: id, time: isoOf(t), scenario, state: 'does_not_exist_in_1863', status: 'never_placed', present: false, rows: [] };
    if (s && /^E-\d\d$/.test(base) && W[base]) return workState(base, t, scenario, seed);
    const [rs, notes] = rowsFor(id, scenario);
    if (s && s.preexisting === true && s.kind === 'preexisting_wall_or_fence' && !rs.length) return { structure_id: id, time: isoOf(t), scenario, state: 'present at frame one (pre-existing; no construction)', status: 'certain', present: true, rows: [] };
    const res = { structure_id: id, time: isoOf(t), scenario, rows: [], suppressed: notes.map(n => n[0]).sort() };
    const started = rs.filter(r => r.a <= t);
    if (!rs.length) return Object.assign(res, { state: 'no scheduled state (initial state unspecified in B.8.7)', status: 'no_rows', present: null });
    if (!started.length) { const first = [...rs].sort(cmp)[0]; return Object.assign(res, { state: first.frm, status: 'before_all_documented_changes', present: true, rows: [first.id] }); }
    const sorted = [...started].sort(cmp), cur = sorted.at(-1); res.rows = sorted.map(r => r.id); res.flags = cur.flags;
    if (t >= cur.b && cur.a <= cur.b && !(cur.a === cur.b && t < cur.a)) Object.assign(res, { state: cur.to, status: 'after', present: true });
    else if (cur.gran === 'date' || cur.gran === 'date_start') Object.assign(res, { state: `indeterminate within date window: ${cur.frm ?? 'None'} -> ${cur.to ?? 'None'}`, status: 'indeterminate_date_only', present: null, from_state: cur.frm, to_state: cur.to });
    else { const span = cur.b - cur.a; Object.assign(res, { state: `transitioning: ${cur.frm ?? 'None'} -> ${cur.to ?? 'None'}`, status: 'transitioning', present: true, from_state: cur.frm, to_state: cur.to, progress: Math.round((t - cur.a) / span * 1e6) / 1e6 }); }
    return res;
  }
  function scenariosFor(id) {
    const out = new Set(['default']);
    for (const r of rowsByObj.get(id) || []) for (const k of Object.keys(r.scenarios || {})) out.add(k);
    if (W[id]) for (const k of Object.keys(W[id].scenarios || {})) out.add(k);
    return [...out].sort();
  }
  return { stateAt, scenariosFor, rowsFor: id => (rowsByObj.get(id) || []).map(r => r.id), knows: id => byId.has(id.split('#')[0]) || hospIds.has(id) || rowsByObj.has(id), rowsByObj, byId };
}
