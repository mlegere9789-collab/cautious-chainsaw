// data/build-memory.mjs - builds data/memory.json: THE BATTLE REMEMBERS.  The ground marks of the casualty-memory device (fx/memory.mjs).
//
//   node data/build-memory.mjs          write data/memory.json
//
// What is DOCUMENTED (secondary source) and what is MODELLED, as the page says it:
//   * the TOTAL a unit lost (killed, wounded and missing together) is the registry figure `cas` in data/popup-data.json (data-src/build/unit_registry.json `casualties`, from the
//     order of battle files; Busey and Martin / the Official Records as the repository ingested them; secondary).  Documented, secondary.
//   * the DAYS a unit was engaged are the registry's `days_engaged` (popup-data `days`).  Documented, secondary.
//   * WHEN the losses fell inside a day is MODELLED: the repository's own apportionment (baseline/dist/data/casualty_apportionment.json) gives each corps a fighting period per day with a
//     tick range and a peak; a unit's loss of that day is spread over that period as a bell curve (sigma 8 ticks, the file's own figure), a unit that fought on several days loses an equal share per day.
//   * WHERE they fell is MODELLED: at the unit's own interpolated position at that tick, scattered by a deterministic hash along a front of about 45 m.
//   * One mark stands for 10 men (killed, wounded or missing).  A unit with no registry figure, no engaged day, or no corps period on a day it was engaged leaves NO mark (never an invented one).
// A mark is a deposit: [tick, lat, lng, side(0 union, 1 confederate), angle(0..255), unitIndex].  The page draws every deposit whose tick is not after the clock.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const ds = JSON.parse(fs.readFileSync(path.join(HERE, 'dataset.json'), 'utf8')); const pop = JSON.parse(fs.readFileSync(path.join(HERE, 'popup-data.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(REPO, 'baseline', 'dist', 'data', 'casualty_apportionment.json'), 'utf8'));
const MEN_PER_MARK = 10; const SIGMA = 8; const FRONT_M = 45; const M_PER_DEG_LAT = 111320; const M_PER_DEG_LNG = 111320 * Math.cos(39.81 * Math.PI / 180);
const dayOfTick = (t) => (t <= 225 ? 1 : t <= 450 ? 2 : 3);       // 675 ticks, 225 per battle day (the clock module's own split)

const periods = {}; for (const c of [...app.union_corps, ...app.confederate_corps]) periods[c.corps_id] = c.engagement_periods;
const nodes = new Map(ds.nodes.map((n) => [n.id, n])); const RE = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I|CAV)(?:-|$)/;
function corpsOf(u) {
  let id = u.parent; let g = 0; while (id && g++ < 12) { const m = RE.exec(id); if (m) return (u.side === 'confederate' ? 'C-' : 'U-') + m[1]; const n = nodes.get(id); id = n && n.parent; }
  const m = RE.exec(u.id); return m ? (u.side === 'confederate' ? 'C-' : 'U-') + m[1] : null;
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const CLAMP_TICKS = 25;      // a tick up to 25 ticks (about 25 minutes of the candidate clock) outside the unit's own keyframes uses the nearest keyframe's position; beyond that the unit is not placed there and leaves no mark
function positionAt(kf, t) {
  if (!kf.length) return null; const lo = kf[0][0]; const hi = kf[kf.length - 1][0];
  if (t < lo) return t >= lo - CLAMP_TICKS ? [kf[0][1], kf[0][2]] : null; if (t > hi) return t <= hi + CLAMP_TICKS ? [kf[kf.length - 1][1], kf[kf.length - 1][2]] : null;
  let i = 0; while (i + 1 < kf.length && kf[i + 1][0] <= t) i++; const a = kf[i]; const b = kf[Math.min(i + 1, kf.length - 1)]; if (b[0] === a[0]) return [a[1], a[2]];
  const k = (t - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

const marks = []; const units = []; const skipped = { noFigure: 0, noDays: 0, noCorps: 0, noPeriod: 0, notPlaced: 0 }; let menTotal = 0; let menDrawn = 0;
for (const u of ds.units) {
  if (['brigade', 'division', 'corps', 'army'].includes(u.kind)) continue;      // a formation's figure is the sum of its units: never drawn twice
  const o = pop.oob[u.id]; if (!o || !(o.cas > 0)) { skipped.noFigure++; continue; }
  const days = Array.isArray(o.days) ? o.days.filter((d) => d >= 1 && d <= 3) : []; if (!days.length) { skipped.noDays++; continue; }
  const corps = corpsOf(u); if (!corps || !periods[corps]) { skipped.noCorps++; continue; }
  const kf = (u.kf || []).filter((k) => k[1] != null).map((k) => [k[0], k[1], k[2]]).sort((a, b) => a[0] - b[0]); if (!kf.length) { skipped.notPlaced++; continue; }
  const share = o.cas / days.length; let ui = -1; const rng = rnd(hash(u.id));
  for (const d of days) {
    const p = periods[corps].find((q) => q.day === d); if (!p) { skipped.noPeriod++; continue; }
    const [t0, t1] = p.tick_range; const peak = p.peak_tick; const ticks = []; for (let t = t0; t <= t1; t += 2) ticks.push(t);
    const w = ticks.map((t) => Math.exp(-0.5 * ((t - peak) / SIGMA) ** 2)); const ws = w.reduce((a, b) => a + b, 0); let acc = 0; let made = 0;
    ticks.forEach((t, i) => {
      acc += share * w[i] / ws; const want = Math.floor(acc / MEN_PER_MARK + 1e-9); const pos = positionAt(kf, t);
      while (made < want) { made++; if (!pos) { skipped.notPlaced++; continue; } if (ui < 0) { ui = units.length; units.push(u.id); }
        const ang = rng() * Math.PI * 2; const r = Math.sqrt(rng()) * FRONT_M; const lat = pos[0] + Math.sin(ang) * r / M_PER_DEG_LAT; const lng = pos[1] + Math.cos(ang) * r / M_PER_DEG_LNG;
        marks.push([t, +lat.toFixed(5), +lng.toFixed(5), u.side === 'confederate' ? 1 : 0, Math.floor(rng() * 256), ui]); menDrawn += MEN_PER_MARK; }
    });
    menTotal += share;
  }
}
marks.sort((a, b) => a[0] - b[0]);
const out = {
  format: 'battle-studio-memory/1', menPerMark: MEN_PER_MARK, sigmaTicks: SIGMA, frontM: FRONT_M,
  note: 'Ground marks of the casualty-memory device. The totals are Documented (secondary: the registry figure killed + wounded + missing); the days a unit fought are Documented (secondary); WHEN inside a day (a bell curve over the corps period of casualty_apportionment.json) and WHERE (the unit\'s own interpolated position, scattered along a 45 m front) are MODELLED. One mark = 10 men. A unit with no figure, no engaged day or no corps period leaves no mark.',
  sources: ['docs/pitch/anim2/release-look/data/popup-data.json (oob.cas, oob.days: from data-src/build/unit_registry.json)', 'baseline/dist/data/casualty_apportionment.json (per-corps fighting periods, tick ranges and peaks)', 'docs/pitch/anim2/release-look/data/dataset.json (keyframes, order-of-battle chain)'],
  counts: { units: units.length, marks: marks.length, menModelledToMarks: menDrawn, menInShares: Math.round(menTotal), skipped }, units, marks,
};
fs.writeFileSync(path.join(HERE, 'memory.json'), JSON.stringify(out));
console.log(JSON.stringify(out.counts), (JSON.stringify(out).length / 1024).toFixed(0) + ' KB');
